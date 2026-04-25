import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <header className="container mx-auto px-6 py-6 border-b">
        <Link to="/"><Logo /></Link>
      </header>
      <main className="container mx-auto px-6 py-12 max-w-3xl">
        <h1 className="text-3xl font-display font-bold text-primary-deep">Terms of Service</h1>
        <p className="text-muted-foreground">Last updated: April 2026</p>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-8">1. Acceptable use</h2>
        <p>You agree not to use EngageIQ to scrape personal data, send spam, or violate any law. You are responsible for how you use lead data — including compliance with GDPR, CAN-SPAM, and similar laws in your region.</p>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-6">2. Data ownership</h2>
        <p>You own all content you upload. You grant us a limited license to store and process it solely to provide the service.</p>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-6">3. AI-generated content</h2>
        <p>AI-generated suggestions are starting points — not guarantees. Always review AI output before sending emails or making business decisions.</p>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-6">4. Account responsibility</h2>
        <p>Keep your password and API keys safe. You are responsible for activity on your account.</p>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-6">5. Service availability</h2>
        <p>We aim for high availability but do not guarantee 100% uptime. Plans, prices, and features may change.</p>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-6">6. Termination</h2>
        <p>You can delete your account at any time. We reserve the right to suspend accounts that violate these terms.</p>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-6">7. Limitation of liability</h2>
        <p>EngageIQ is provided "as is". We are not liable for indirect or consequential damages arising from your use of the service.</p>
      </main>
    </div>
  );
}
