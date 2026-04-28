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

        <h2 className="text-xl font-display font-bold text-primary-deep mt-8">1. Who you are contracting with</h2>
        <p>These Terms of Service ("Terms") form a binding agreement between you and <strong>EngageIQ</strong> ("EngageIQ", "we", "us"), the legal entity that operates the EngageIQ platform (the "Service"). By creating an account, signing in, or otherwise using the Service, you agree to these Terms.</p>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-6">2. Acceptance</h2>
        <p>By continuing to use the Service you confirm that you have read, understood, and agreed to these Terms. If you are using the Service on behalf of an organisation, you confirm that you have the authority to bind that organisation. If you are using the Service as an individual, you confirm that you are of legal age to enter into a binding contract.</p>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-6">3. The Service</h2>
        <p>EngageIQ provides a B2B revenue-intelligence platform, including lead and opportunity management, AI-generated insights, AI-assisted outbound email composition, and related tools. Specific features depend on the plan you subscribe to.</p>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-6">4. Acceptable use</h2>
        <p>You agree not to:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Use the Service for any unlawful purpose or in violation of any applicable law (including data protection, anti-spam, and consumer protection laws such as GDPR and CAN-SPAM).</li>
          <li>Send spam, phishing, or unsolicited bulk communications.</li>
          <li>Infringe the intellectual property rights of others.</li>
          <li>Probe, scan, or test the vulnerability of the Service; introduce malware; or attempt to gain unauthorised access.</li>
          <li>Scrape, crawl, or otherwise harvest data from the Service except as expressly permitted.</li>
          <li>Reverse-engineer, decompile, or attempt to extract the source code of the Service, except as permitted by law.</li>
          <li>Resell or redistribute the Service or circumvent any technical limits or quotas.</li>
        </ul>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-6">5. Account responsibility</h2>
        <p>You must provide accurate registration information and keep it up to date. You are responsible for maintaining the confidentiality of your credentials and API keys, and for all activity that occurs under your account.</p>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-6">6. Intellectual property</h2>
        <p>EngageIQ retains all right, title, and interest in and to the Service, including all software, documentation, branding, designs, and underlying technology. We grant you a limited, non-exclusive, non-transferable, revocable right to access and use the Service in accordance with these Terms and your subscription plan.</p>
        <p>You retain ownership of the content you upload ("Your Content"). You grant EngageIQ a limited, worldwide, royalty-free license to host, store, transmit, and process Your Content solely as necessary to provide the Service to you.</p>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-6">7. AI-generated content</h2>
        <p>AI-generated suggestions are starting points — not guarantees. You are responsible for reviewing, editing, and verifying any AI output before relying on it, sending emails, or making business decisions. You must have the rights necessary for any content you submit as input to AI features. EngageIQ may apply content filters and may refuse, restrict, or remove outputs that violate these Terms or applicable law.</p>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-6">8. Payments, subscriptions, and Merchant of Record</h2>
        <p><strong>Our order process is conducted by our online reseller Paddle.com. Paddle.com is the Merchant of Record for all our orders. Paddle provides all customer service inquiries and handles returns.</strong></p>
        <p>Subscriptions renew automatically at the end of each billing period (monthly or yearly, depending on the plan you choose) until cancelled. Plan changes take effect immediately and are prorated. Cancellations take effect at the end of the current billing period. Prices are exclusive of applicable taxes, which Paddle will calculate and collect where required.</p>
        <p>For payment, billing, tax, cancellation, and refund mechanics, please also refer to Paddle's Buyer Terms: <a className="underline" href="https://www.paddle.com/legal/checkout-buyer-terms" target="_blank" rel="noopener noreferrer">paddle.com/legal/checkout-buyer-terms</a>. Refund requests are handled per our <Link className="underline" to="/refund">Refund Policy</Link>.</p>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-6">9. Service availability</h2>
        <p>We aim to provide a reliable Service but do not guarantee that it will be uninterrupted, error-free, or available at all times. Plans, prices, and features may change; we will give reasonable notice of material changes.</p>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-6">10. Suspension and termination</h2>
        <p>You may cancel your subscription and delete your account at any time. We may suspend or terminate your access to the Service, with or without notice, for: (a) material breach of these Terms; (b) non-payment; (c) suspected fraud or security risk; or (d) repeated or serious policy violations.</p>
        <p>On termination, your right to use the Service ends immediately. We will retain or delete Your Content in accordance with our <Link className="underline" to="/privacy">Privacy Notice</Link>.</p>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-6">11. Warranties and disclaimers</h2>
        <p>The Service is provided "as is" and "as available". To the fullest extent permitted by law, EngageIQ disclaims all implied warranties, including merchantability, fitness for a particular purpose, and non-infringement.</p>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-6">12. Limitation of liability</h2>
        <p>To the fullest extent permitted by law, EngageIQ's aggregate liability arising out of or in connection with these Terms is capped at the fees you paid to EngageIQ in the 12 months preceding the event giving rise to the claim. EngageIQ is not liable for indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, goodwill, or business opportunity. Nothing in these Terms excludes liability that cannot be excluded by law (such as fraud or death/personal injury caused by negligence).</p>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-6">13. Indemnification</h2>
        <p>You agree to indemnify and hold EngageIQ harmless from any claim, loss, or expense arising out of Your Content, your use of the Service, or your breach of these Terms.</p>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-6">14. Changes to the Terms</h2>
        <p>We may update these Terms from time to time. Material changes will be communicated through the app or by email and take effect on the date stated.</p>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-6">15. Governing law</h2>
        <p>These Terms are governed by the laws of the jurisdiction in which EngageIQ is established, without regard to conflict-of-laws principles. Disputes will be resolved by the competent courts of that jurisdiction, unless mandatory consumer law provides otherwise.</p>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-6">16. Contact</h2>
        <p>Questions about these Terms? Contact EngageIQ through in-app support.</p>
      </main>
    </div>
  );
}
