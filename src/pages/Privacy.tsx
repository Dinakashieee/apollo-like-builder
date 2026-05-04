import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <header className="container mx-auto px-6 py-6 border-b">
        <Logo />
      </header>
      <main className="container mx-auto px-6 py-12 max-w-3xl">
        <h1 className="text-3xl font-display font-bold text-primary-deep">Privacy Notice</h1>
        <p className="text-muted-foreground">Last updated: April 2026</p>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-8">1. Who we are</h2>
        <p>This service ("EngageIQ", "we", "us") is operated by <strong>EngageIQ</strong>, the legal entity providing the EngageIQ platform. EngageIQ acts as the <strong>data controller</strong> for personal data processed through the service. For privacy questions, contact us through in-app support.</p>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-6">2. Personal data we collect</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Account data:</strong> email address, full name, optional avatar, hashed password or OAuth identifiers.</li>
          <li><strong>Workspace data:</strong> company profile, leads, opportunities, activities, AI-generated content you create.</li>
          <li><strong>Support messages:</strong> content of messages you send to support or our in-app assistant.</li>
          <li><strong>Usage and telemetry:</strong> pages visited, features used, errors encountered.</li>
          <li><strong>Device and connection data:</strong> IP address, browser type, device identifiers, approximate location.</li>
          <li><strong>Cookies and similar technologies:</strong> session cookies for authentication and essential site functionality.</li>
        </ul>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-6">3. Purposes and legal bases</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Provide the service</strong> (account creation, authentication, delivering features) — legal basis: performance of a contract.</li>
          <li><strong>Process payments and manage subscriptions</strong> — legal basis: performance of a contract; carried out by our Merchant of Record (see Section 4).</li>
          <li><strong>Security and fraud prevention</strong> (abuse detection, rate limiting, audit logs) — legal basis: legitimate interests.</li>
          <li><strong>Product improvement</strong> (aggregated usage analytics, debugging) — legal basis: legitimate interests.</li>
          <li><strong>Customer support</strong> (responding to requests) — legal basis: legitimate interests / contract performance.</li>
          <li><strong>Legal compliance</strong> (tax, accounting, lawful requests) — legal basis: legal obligation.</li>
        </ul>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-6">4. Who we share data with</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Lemon Squeezy</strong> — our Merchant of Record. Lemon Squeezy processes all orders, payments, subscription billing, tax compliance, invoicing, and refund handling. When you make a purchase, Lemon Squeezy collects and processes your billing data under its own privacy policy.</li>
          <li><strong>Hosting and infrastructure providers</strong> — for application hosting, database storage, file storage, and edge compute.</li>
          <li><strong>AI model providers</strong> — when you use AI features, the relevant prompt content (e.g. company profile, lead notes) is sent to the model provider to generate a response. We do not allow providers to train on your data.</li>
          <li><strong>Email delivery providers</strong> — to deliver transactional and authentication emails.</li>
          <li><strong>Professional advisers</strong> — accountants and lawyers, where strictly necessary.</li>
          <li><strong>Authorities</strong> — where required to comply with applicable law or a valid legal request.</li>
        </ul>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-6">5. Data retention</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Account and workspace data: retained while your account is active and deleted within 30 days of account closure (unless we must retain it longer for legal, tax, or fraud-prevention reasons).</li>
          <li>Billing records held by Lemon Squeezy: retained according to Lemon Squeezy's policy, typically 7 years for tax purposes.</li>
          <li>Logs and telemetry: typically retained for up to 12 months.</li>
          <li>Backups: rotated within 35 days of deletion from production.</li>
        </ul>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-6">6. Your rights</h2>
        <p>Depending on where you live, you have the right to:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Access the personal data we hold about you.</li>
          <li>Request correction of inaccurate data.</li>
          <li>Request erasure ("right to be forgotten").</li>
          <li>Restrict or object to certain processing.</li>
          <li>Data portability — receive your data in a machine-readable format.</li>
          <li>Withdraw consent at any time, where processing is based on consent.</li>
          <li>Lodge a complaint with your local data protection authority.</li>
        </ul>
        <p>To exercise any of these rights, contact us through in-app support. We respond within one month.</p>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-6">7. International transfers</h2>
        <p>Your data may be processed outside your country of residence, including in the United States and the European Economic Area, by our service providers. Where required, we rely on appropriate safeguards such as the European Commission's Standard Contractual Clauses or adequacy decisions.</p>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-6">8. Security</h2>
        <p>We apply appropriate technical and organisational measures to protect personal data, including encryption in transit (TLS), encryption at rest, role-based access controls, row-level security in our database, audit logging, and least-privilege access for staff. No method of transmission or storage is 100% secure, but we work to follow industry best practice.</p>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-6">9. Cookies</h2>
        <p>We use strictly necessary cookies for authentication and session management. We do not use advertising or third-party tracking cookies. Limited first-party analytics may be used to understand aggregate usage. You can manage cookies through your browser settings.</p>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-6">10. AI features</h2>
        <p>When you use AI-powered features, your prompt content is sent to a third-party model provider to generate a response. We do not store your data with the AI provider beyond the request itself, and providers are contractually prohibited from training on your data.</p>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-6">11. Changes to this notice</h2>
        <p>We may update this notice from time to time. Material changes will be communicated through the app or by email.</p>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-6">12. Contact</h2>
        <p>For privacy questions or to exercise your rights, contact EngageIQ at <a className="underline" href="mailto:support@engageiqlk.com">support@engageiqlk.com</a> or by post:</p>
        <address className="not-italic mt-2 leading-relaxed">
          <strong>EngageIQ</strong><br />
          HQ: 275 New North Road, Islington #1772, London, N1 7AA, United Kingdom<br />
          R&amp;D: Colombo 10350, Sri Lanka<br />
          Phone: <a className="underline" href="tel:+94777263673">+94 77 726 3673</a>
        </address>
      </main>
    </div>
  );
}
