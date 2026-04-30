// Seeds a workspace with realistic demo data so a brand-new free-trial
// account immediately shows the look-and-feel: leads at every stage,
// opportunities, sequences, an inbox with hot/warm/cold replies that
// already have AI analysis filled in, and an activity feed.
// All rows are tagged is_demo=true so the user can wipe them in one click.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return json({ error: "unauthenticated" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: ud, error: ue } = await userClient.auth.getUser();
    if (ue || !ud.user) return json({ error: "unauthenticated" }, 401);

    const { workspaceId, force } = await req.json().catch(() => ({}));
    if (!workspaceId) return json({ error: "workspaceId required" }, 400);

    const admin = createClient(supabaseUrl, serviceKey);

    // Verify caller is workspace member
    const { data: mem } = await admin
      .from("workspace_members")
      .select("user_id, role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", ud.user.id)
      .maybeSingle();
    if (!mem) return json({ error: "forbidden" }, 403);

    // Skip if already seeded (unless force)
    const { data: ws } = await admin
      .from("workspaces")
      .select("demo_seeded_at")
      .eq("id", workspaceId)
      .maybeSingle();
    if (ws?.demo_seeded_at && !force) {
      return json({ ok: true, skipped: true, reason: "already seeded" });
    }

    const userId = ud.user.id;
    const now = Date.now();
    const ago = (h: number) => new Date(now - h * 3600 * 1000).toISOString();

    // ---------- LEADS ----------
    const leads = [
      { company_name: "Northwind Co.", contact_name: "Sara Lin", email: "sara.lin@northwind.co", role: "VP Sales", industry: "SaaS", country: "USA", status: "qualified", score: 82, source: "LinkedIn", pain_points: ["manual lead routing", "low reply rate"], systems_in_use: ["Salesforce", "Outreach"] },
      { company_name: "Helix Health", contact_name: "James Okafor", email: "j.okafor@helixhealth.io", role: "Head of Growth", industry: "Healthcare", country: "UK", status: "qualified", score: 91, source: "Inbound", pain_points: ["HIPAA compliance", "long sales cycles"], systems_in_use: ["HubSpot"] },
      { company_name: "VectorPay", contact_name: "Ana Martins", email: "ana@vectorpay.com", role: "CRO", industry: "Fintech", country: "Brazil", status: "contacted", score: 68, source: "Referral", pain_points: ["payment fraud", "churn"], systems_in_use: ["Pipedrive"] },
      { company_name: "Bluebird Labs", contact_name: "Priya Shah", email: "priya@bluebirdlabs.com", role: "Founder", industry: "AI / ML", country: "India", status: "new", score: 54, source: "Cold outbound", pain_points: ["GTM hiring", "pipeline visibility"], systems_in_use: ["Notion", "Gmail"] },
      { company_name: "Acme Robotics", contact_name: "Marc Dubois", email: "marc@acmerobotics.io", role: "VP Marketing", industry: "Industrial", country: "France", status: "qualified", score: 76, source: "Webinar", pain_points: ["niche TAM", "long demo cycle"], systems_in_use: ["Salesforce"] },
      { company_name: "Quanta AI", contact_name: "Leah Chen", email: "leah@quanta.ai", role: "Head of Sales", industry: "AI / ML", country: "Singapore", status: "qualified", score: 88, source: "LinkedIn", pain_points: ["intent data quality"], systems_in_use: ["Apollo", "Salesforce"] },
      { company_name: "Orbit Logistics", contact_name: "Ken Tanaka", email: "ken@orbitlogistics.com", role: "Director Ops", industry: "Logistics", country: "Japan", status: "contacted", score: 61, source: "Trade show", pain_points: ["fragmented vendors"], systems_in_use: ["Zoho"] },
      { company_name: "Lumen Studios", contact_name: "Sofia Reyes", email: "sofia@lumenstudios.co", role: "COO", industry: "Creative agency", country: "Mexico", status: "won", score: 95, source: "Referral", pain_points: ["scoping creep"], systems_in_use: ["Monday"] },
      { company_name: "Pinecone Bank", contact_name: "Daniel Park", email: "d.park@pineconebank.com", role: "SVP Digital", industry: "Banking", country: "Canada", status: "lost", score: 33, source: "Cold outbound", pain_points: ["legacy core systems"], systems_in_use: ["Microsoft Dynamics"] },
      { company_name: "Solace IoT", contact_name: "Hana Müller", email: "hana@solaceiot.de", role: "CMO", industry: "IoT", country: "Germany", status: "qualified", score: 79, source: "Inbound", pain_points: ["device-side analytics"], systems_in_use: ["HubSpot"] },
    ];

    // Stagger lead created_at across the last 15 days so velocity chart isn't a single spike
    const leadRows = leads.map((l, i) => ({
      ...l,
      workspace_id: workspaceId,
      created_by: userId,
      is_demo: true,
      created_at: new Date(now - (14 - Math.floor(i * 1.4)) * 86400000 - Math.floor(Math.random() * 6 * 3600 * 1000)).toISOString(),
    }));
    const { data: insertedLeads, error: leadErr } = await admin
      .from("leads")
      .insert(leadRows)
      .select("id, company_name, contact_name, email, status");
    if (leadErr) return json({ error: "leads insert failed", detail: leadErr.message }, 500);

    const byName: Record<string, { id: string; email: string | null; contact_name: string | null }> = {};
    for (const l of insertedLeads ?? []) byName[l.company_name] = l as any;

    // ---------- OPPORTUNITIES ----------
    const opps = [
      { title: "Northwind Co. — sales-ops automation", problem: "Manual lead routing wastes 12h/week", level: "high", score: 88, industry: "SaaS", rationale: "Strong fit; reps currently use spreadsheets" },
      { title: "Helix Health — outbound for clinical SaaS", problem: "Need HIPAA-aware sequences", level: "high", score: 91, industry: "Healthcare", rationale: "Compliance + high deal sizes" },
      { title: "Quanta AI — intent-driven prospecting", problem: "Spray-and-pray outbound", level: "medium", score: 74, industry: "AI / ML", rationale: "Growth team open to new tools" },
      { title: "Acme Robotics — niche TAM expansion", problem: "Hard to reach plant managers", level: "medium", score: 68, industry: "Industrial", rationale: "Long cycle but premium ACV" },
      { title: "Solace IoT — analyst-led demand gen", problem: "Awareness in DACH region", level: "low", score: 52, industry: "IoT", rationale: "Brand play, not direct revenue" },
    ];
    await admin.from("opportunities").insert(opps.map((o) => ({ ...o, workspace_id: workspaceId, is_demo: true })));

    // ---------- SEQUENCES ----------
    const { data: seqRows, error: seqErr } = await admin
      .from("sequences")
      .insert([
        { workspace_id: workspaceId, name: "Cold outbound — SaaS founders", description: "3-touch nurture for early-stage SaaS", active: true, is_demo: true },
        { workspace_id: workspaceId, name: "Re-engagement — past trials", description: "Win back lapsed signups", active: true, is_demo: true },
      ])
      .select("id, name");
    if (seqErr) console.warn("seq err", seqErr);

    if (seqRows?.[0]) {
      await admin.from("sequence_steps").insert([
        { workspace_id: workspaceId, sequence_id: seqRows[0].id, step_order: 1, day_offset: 0, subject_template: "Quick question about {{company_name}}", body_template: "Hi {{contact_name}},\n\nNoticed {{company_name}} is scaling fast — worth a 15-min chat?", is_demo: true },
        { workspace_id: workspaceId, sequence_id: seqRows[0].id, step_order: 2, day_offset: 3, subject_template: "Bumping this up", body_template: "Following up — happy to send a one-pager if useful.", is_demo: true },
        { workspace_id: workspaceId, sequence_id: seqRows[0].id, step_order: 3, day_offset: 7, subject_template: "Last note", body_template: "Closing the loop — let me know if timing's off.", is_demo: true },
      ]);
    }

    // ---------- EMAIL ACCOUNT (placeholder mailbox) ----------
    const { data: acct } = await admin
      .from("email_accounts")
      .insert({
        workspace_id: workspaceId,
        user_id: userId,
        provider: "gmail",
        email_address: "demo@yourcompany.com",
        display_name: "Demo Mailbox",
        refresh_token: "demo-placeholder",
        status: "active",
        is_demo: true,
      })
      .select("id")
      .single();

    const acctId = acct?.id;
    if (acctId) {
      // 3 threads: hot / warm / cold replies
      const scenarios = [
        {
          lead: byName["Helix Health"],
          subject: "Re: Quick question about Helix Health",
          providerThread: `demo-thread-hot-${workspaceId}`,
          outBody: "Hi James — saw what you're shipping at Helix. Worth a 15-min chat next week?",
          inBody: "Yes, very interested! Can we jump on a call this Thursday at 3pm? Also please share pricing for a 25-seat team.",
          temp: "hot", intent: "meeting_request",
          summary: "Prospect ready to talk — explicitly asks for a Thursday 3pm meeting and pricing for 25 seats.",
          next: "Send a calendar invite for Thursday 3pm and attach the 25-seat pricing sheet.",
          conf: 0.94, hoursAgo: 2,
        },
        {
          lead: byName["Quanta AI"],
          subject: "Re: Following up on our intro",
          providerThread: `demo-thread-warm-${workspaceId}`,
          outBody: "Following up — happy to send a one-pager if useful.",
          inBody: "Thanks for following up — yes please send the one-pager. Also curious how you handle GDPR compliance.",
          temp: "warm", intent: "info_request",
          summary: "Curious prospect — wants the one-pager and asks about GDPR compliance.",
          next: "Reply with the one-pager + a short note on GDPR/data residency, then propose a 20-min intro call.",
          conf: 0.86, hoursAgo: 24,
        },
        {
          lead: byName["Pinecone Bank"],
          subject: "Re: Have you considered our platform?",
          providerThread: `demo-thread-cold-${workspaceId}`,
          outBody: "Reaching out cold — curious if our platform could save your team time.",
          inBody: "Thanks but we're happy with our current vendor. Maybe revisit in Q3.",
          temp: "cold", intent: "rejection",
          summary: "Polite rejection — happy with current vendor, suggests revisiting in Q3.",
          next: "Add a Q3 follow-up reminder and send a soft value-add (case study) closer to that date.",
          conf: 0.91, hoursAgo: 72,
        },
      ];

      for (const s of scenarios) {
        if (!s.lead) continue;
        const { data: th } = await admin
          .from("email_threads")
          .insert({
            workspace_id: workspaceId,
            account_id: acctId,
            lead_id: s.lead.id,
            provider_thread_id: s.providerThread,
            subject: s.subject.replace(/^Re: /, ""),
            participants: ["demo@yourcompany.com", s.lead.email!],
            last_message_at: ago(s.hoursAgo),
            unread_count: 1,
            is_demo: true,
          })
          .select("id")
          .single();
        if (!th) continue;

        await admin.from("email_messages").insert([
          {
            workspace_id: workspaceId, thread_id: th.id, account_id: acctId,
            provider_message_id: `${s.providerThread}-out`, direction: "outbound",
            from_email: "demo@yourcompany.com", from_name: "Demo Mailbox",
            to_emails: [s.lead.email!],
            subject: s.subject.replace(/^Re: /, ""),
            body_text: s.outBody, snippet: s.outBody.slice(0, 80),
            sent_at: ago(s.hoursAgo + 2), is_read: true, is_demo: true,
          },
          {
            workspace_id: workspaceId, thread_id: th.id, account_id: acctId,
            provider_message_id: `${s.providerThread}-in`, direction: "inbound",
            from_email: s.lead.email!, from_name: s.lead.contact_name,
            to_emails: ["demo@yourcompany.com"],
            subject: s.subject,
            body_text: s.inBody, snippet: s.inBody.slice(0, 80),
            sent_at: ago(s.hoursAgo), received_at: ago(s.hoursAgo), is_read: false,
            reply_temperature: s.temp, reply_intent: s.intent,
            reply_summary: s.summary, suggested_next_step: s.next,
            analysis_confidence: s.conf, analyzed_at: ago(s.hoursAgo - 0.1),
            is_demo: true,
          },
        ]);

        // Roll up on the lead
        await admin.from("leads").update({
          last_reply_at: ago(s.hoursAgo),
          last_reply_temperature: s.temp,
          reply_count: 1,
        }).eq("id", s.lead.id);
      }
    }

    // ---------- ACTIVITIES ----------
    const acts = [
      { type: "lead_created", description: "New lead Helix Health (James Okafor)", metadata: { source: "Inbound" } },
      { type: "email_sent", description: "Sent intro email to Northwind Co.", metadata: {} },
      { type: "reply_received", description: "🔥 Hot reply from Helix Health", metadata: { temperature: "hot" } },
      { type: "opportunity_created", description: "New opportunity: Quanta AI — intent-driven prospecting", metadata: {} },
      { type: "lead_won", description: "Lumen Studios marked as Won", metadata: {} },
    ];
    await admin.from("activities").insert(
      acts.map((a, i) => ({
        ...a, workspace_id: workspaceId, user_id: userId,
        created_at: ago(i * 6 + 1), is_demo: true,
      })),
    );

    // Mark workspace as seeded
    await admin
      .from("workspaces")
      .update({ demo_seeded_at: new Date().toISOString() })
      .eq("id", workspaceId);

    return json({ ok: true, leadCount: leadRows.length });
  } catch (e) {
    console.error("seed-demo-data error", e);
    return json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});
