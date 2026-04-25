import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <header className="container mx-auto px-6 py-6 border-b">
        <Link to="/"><Logo /></Link>
      </header>
      <main className="container mx-auto px-6 py-12 max-w-3xl prose prose-slate">
        <h1 className="text-3xl font-display font-bold text-primary-deep">Privacy Policy</h1>
        <p className="text-muted-foreground">Last updated: April 2026</p>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-8">1. Your data is yours</h2>
        <p>You own all data you upload to EngageIQ — leads, company profiles, AI-generated insights. You can export it or delete it at any time from Settings.</p>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-6">2. We do not sell personal data</h2>
        <p>We never sell, rent, or share your data with third parties for advertising or marketing purposes.</p>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-6">3. What we collect</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Account info: email, full name, optional avatar.</li>
          <li>Workspace data: company profile, leads, opportunities, activities you create.</li>
          <li>Auth metadata required to sign you in (managed by our backend provider).</li>
        </ul>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-6">4. How AI works</h2>
        <p>When you click "Generate with AI", we send your company profile and products to an AI model to produce insights. We do not store your data with the AI provider beyond the request itself.</p>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-6">5. BYOK integrations</h2>
        <p>If you connect your own API keys (e.g. Apollo), data is fetched via your account only. We do not redistribute it.</p>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-6">6. Data isolation</h2>
        <p>Your workspace is private. Other users cannot read your data. We enforce this with row-level security in the database.</p>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-6">7. Deletion</h2>
        <p>Settings → Your data: delete all workspace data, or delete your account. Auth records are removed within 24h on request.</p>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-6">8. Contact</h2>
        <p>Questions? Open a support ticket inside the app.</p>
      </main>
    </div>
  );
}
