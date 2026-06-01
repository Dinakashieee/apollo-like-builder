// Shared chooser: prefer user's OpenAI key (ChatGPT) when present for
// research-style calls (targets, competitors, deal intelligence, ICPs).
// Falls back to Lovable AI Gateway otherwise.
export function getResearchAiEndpoint(fallbackModel = "google/gemini-2.5-flash") {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (openaiKey) {
    return {
      url: "https://api.openai.com/v1/chat/completions",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      model: "gpt-4o-mini",
      provider: "openai" as const,
    };
  }
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableKey) throw new Error("No AI key configured (OPENAI_API_KEY or LOVABLE_API_KEY)");
  return {
    url: "https://ai.gateway.lovable.dev/v1/chat/completions",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "Content-Type": "application/json",
    },
    model: fallbackModel,
    provider: "lovable" as const,
  };
}
