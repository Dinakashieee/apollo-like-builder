import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

async function extractPptxText(bytes: Uint8Array): Promise<string> {
  const zip = await JSZip.loadAsync(bytes);
  const texts: string[] = [];
  const files = Object.keys(zip.files).filter(
    (n) => /^ppt\/(slides|notesSlides)\/.*\.xml$/.test(n),
  ).sort();
  for (const name of files) {
    const xml = await zip.files[name].async("string");
    const matches = xml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) ?? [];
    const slideText = matches.map((m) => m.replace(/<[^>]+>/g, "")).join(" ");
    if (slideText.trim()) texts.push(`--- ${name} ---\n${slideText}`);
  }
  return texts.join("\n\n");
}

async function extractDocxText(bytes: Uint8Array): Promise<string> {
  const zip = await JSZip.loadAsync(bytes);
  const doc = zip.file("word/document.xml");
  if (!doc) return "";
  const xml = await doc.async("string");
  const matches = xml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) ?? [];
  return matches.map((m) => m.replace(/<[^>]+>/g, "")).join(" ");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { fileBase64, mimeType, fileName } = await req.json();
    if (!fileBase64 || !mimeType) {
      return new Response(JSON.stringify({ error: "fileBase64 and mimeType required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const bytes = b64ToBytes(fileBase64);
    const lname = (fileName ?? "").toLowerCase();

    let extractedText = "";
    let sendAsFile = false;

    if (mimeType.includes("presentationml") || lname.endsWith(".pptx")) {
      extractedText = await extractPptxText(bytes);
    } else if (mimeType.includes("wordprocessingml") || lname.endsWith(".docx")) {
      extractedText = await extractDocxText(bytes);
    } else if (mimeType.startsWith("text/")) {
      extractedText = new TextDecoder().decode(bytes);
    } else if (mimeType === "application/pdf" || mimeType.startsWith("image/")) {
      sendAsFile = true;
    } else {
      return new Response(JSON.stringify({
        error: "Unsupported file type. Use PPTX, DOCX, PDF, image, or text.",
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!sendAsFile && !extractedText.trim()) {
      return new Response(JSON.stringify({ error: "Could not extract any text from file." }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are an analyst extracting a B2B company profile from a deck or document.
Return ONLY facts present in the source. Do not invent. If a field is missing, return empty string or empty array.
Be concise and factual.`;

    const userContent: any[] = [{
      type: "text",
      text: `Extract the company profile from the attached ${lname || mimeType}. Map to these fields:
- company_name: official company name
- description: 2-3 sentence "what we do" summary
- industries: array of target industries served
- products_summary: short paragraph listing main products/services/brands they sell or implement
- target_systems: array of named systems/platforms/tools they replace, integrate with, or implement (e.g. SAP, Oracle, IFS, Salesforce)
- solved_pain_points: array of customer pain points they solve (short phrases)
- positioning: ONE factual social-proof line (e.g. "IFS Premier Partner — #1 for customer satisfaction 2023, 2024")

${extractedText ? `Source text:\n${extractedText.slice(0, 60000)}` : "See attached file."}`,
    }];

    if (sendAsFile) {
      userContent.push({
        type: "image_url",
        image_url: { url: `data:${mimeType};base64,${fileBase64}` },
      });
    }

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        tools: [{
          type: "function",
          function: {
            name: "save_company_profile",
            description: "Return the extracted company profile.",
            parameters: {
              type: "object",
              properties: {
                company_name: { type: "string" },
                description: { type: "string" },
                industries: { type: "array", items: { type: "string" } },
                products_summary: { type: "string" },
                target_systems: { type: "array", items: { type: "string" } },
                solved_pain_points: { type: "array", items: { type: "string" } },
                positioning: { type: "string" },
              },
              required: [
                "company_name", "description", "industries", "products_summary",
                "target_systems", "solved_pain_points", "positioning",
              ],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "save_company_profile" } },
      }),
    });

    if (aiResp.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit hit. Try again in a minute." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiResp.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI error", aiResp.status, t);
      throw new Error("AI gateway error");
    }

    const json = await aiResp.json();
    const tc = json.choices?.[0]?.message?.tool_calls?.[0];
    if (!tc) throw new Error("No structured response");
    const args = JSON.parse(tc.function.arguments);

    return new Response(JSON.stringify({ profile: args }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e?.message ?? "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
