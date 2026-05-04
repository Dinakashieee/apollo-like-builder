import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <header className="container mx-auto px-6 py-6 border-b">
        <Logo />
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

        <h2 className="text-xl font-display font-bold text-primary-deep mt-6">4. Acceptable Use Policy</h2>
        <p>EngageIQ is a B2B revenue-intelligence and sales-enablement tool intended for legitimate, permission-based business outreach. It is <strong>not</strong> a bulk email, marketing-automation, or cold-mailing platform, and it must not be used to send spam.</p>
        <p><strong>Permitted use.</strong> You may use EngageIQ to:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Manage and qualify business leads you have lawfully obtained.</li>
          <li>Draft and personalise <em>individual, one-to-one</em> business emails to recipients with whom you have a legitimate business relationship, prior consent, or a clear lawful basis under applicable law.</li>
          <li>Generate insights and analysis on your own pipeline and account data.</li>
        </ul>
        <p className="mt-3"><strong>You must:</strong></p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Comply with all applicable anti-spam and data protection laws, including the EU/UK GDPR, the US CAN-SPAM Act, Canada's CASL, and any equivalent local laws.</li>
          <li>Send only to recipients with a valid lawful basis (consent, legitimate interest with proper balancing, or an existing business relationship).</li>
          <li>Identify yourself accurately, never use deceptive subject lines or sender identities, and honour opt-out / unsubscribe requests promptly.</li>
          <li>Use accurate, up-to-date contact data that you have the right to process.</li>
          <li>Use EngageIQ's email features for one-to-one human review and sending — not for automated mass blasts.</li>
        </ul>
        <p className="mt-3"><strong>You must NOT use EngageIQ to:</strong></p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Send spam, unsolicited bulk email, chain mail, or unsolicited commercial messages of any kind.</li>
          <li>Send phishing, malware, fraudulent, deceptive, or impersonation messages.</li>
          <li>Harass, threaten, defame, harm, or discriminate against any individual or group.</li>
          <li>Send messages to consumers (B2C) without the legal basis required in their jurisdiction; EngageIQ is intended for B2B outreach only.</li>
          <li>Scrape, crawl, harvest, or otherwise collect personal data without a lawful basis or in violation of any third party's terms.</li>
          <li>Promote illegal goods or services, sexually explicit content involving minors, weapons, controlled substances, gambling where prohibited, hate speech, or content that infringes intellectual property rights.</li>
          <li>Use the Service for any unlawful purpose or in violation of any applicable law.</li>
          <li>Probe, scan, or test the vulnerability of the Service; introduce malware; or attempt to gain unauthorised access.</li>
          <li>Reverse-engineer, decompile, or attempt to extract the source code of the Service, except as permitted by law.</li>
          <li>Resell or redistribute the Service or circumvent any technical limits or quotas.</li>
        </ul>
        <p className="mt-3"><strong>Enforcement.</strong> You are solely responsible for the content and recipients of any communications you create or send using EngageIQ. We may investigate suspected violations, remove content, throttle or disable AI-generation features, suspend or terminate accounts without notice, and report unlawful activity to the relevant authorities. Repeated or serious violations will result in permanent termination.</p>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-6">5. Your legal responsibility & compliance with law</h2>
        <p><strong>You are the data controller.</strong> When you upload, import, enrich, or process information about leads, prospects, or contacts in EngageIQ, <strong>you</strong> determine the purposes and means of that processing. You are therefore the "data controller" (under GDPR / UK GDPR) or the equivalent legally responsible party (under CCPA, PIPEDA, LGPD, and other applicable laws). EngageIQ acts only as a data <em>processor</em> on your behalf and processes data solely on your documented instructions, as set out in our <Link className="underline" to="/privacy">Privacy Notice</Link>.</p>
        <p className="mt-3"><strong>You represent and warrant that you will, at all times:</strong></p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Comply with all laws applicable to your use of the Service, including but not limited to the <strong>EU GDPR, UK GDPR, US CAN-SPAM Act, Canada's CASL, Australia's Spam Act, the ePrivacy Directive (PECR), CCPA/CPRA, PIPEDA, LGPD,</strong> and any other applicable data-protection, anti-spam, marketing, consumer-protection, export-control, and sanctions laws.</li>
          <li>Have a valid <strong>lawful basis</strong> (consent, legitimate interest with a documented balancing test, or an existing business relationship) for every contact you process or message through the Service.</li>
          <li>Provide your own <strong>privacy notice</strong> to the individuals you contact, telling them how you process their data and how to exercise their rights.</li>
          <li>Honour <strong>opt-out, unsubscribe, erasure, access, and objection</strong> requests from your contacts promptly and at your own cost — these requests are your responsibility, not EngageIQ's.</li>
          <li>Identify yourself accurately in every message, never use deceptive sender names or subject lines, and include a valid postal address and unsubscribe mechanism where required by law.</li>
          <li>Maintain any <strong>licences, registrations, or regulatory permissions</strong> required in your jurisdiction to conduct outreach or process the categories of data you handle.</li>
          <li>Keep records sufficient to <strong>demonstrate your compliance</strong> (e.g. source of consent, lawful-basis assessments) if challenged by a regulator or recipient.</li>
          <li>Not transfer EngageIQ's compliance obligations onto EngageIQ — we provide a tool; <strong>responsibility for how you use it rests with you</strong>.</li>
        </ul>
        <p className="mt-3"><strong>Indemnity for compliance failures.</strong> You agree to indemnify, defend, and hold EngageIQ harmless from any claim, fine, penalty, regulatory action, complaint, chargeback, or loss arising from (a) your breach of any law listed above, (b) the content or recipients of messages you send, (c) the data you upload or process, or (d) your failure to honour data-subject or unsubscribe requests.</p>
        <p className="mt-3"><strong>Cooperation with authorities.</strong> If we receive a credible complaint, regulator inquiry, or legal request relating to your activity, we may suspend the affected account, preserve relevant data, and disclose information to the extent required by law.</p>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-6">6. Account responsibility</h2>
        <p>You must provide accurate registration information and keep it up to date. You are responsible for maintaining the confidentiality of your credentials and API keys, and for all activity that occurs under your account.</p>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-6">7. Intellectual property</h2>
        <p>EngageIQ retains all right, title, and interest in and to the Service, including all software, documentation, branding, designs, and underlying technology. We grant you a limited, non-exclusive, non-transferable, revocable right to access and use the Service in accordance with these Terms and your subscription plan.</p>
        <p>You retain ownership of the content you upload ("Your Content"). You grant EngageIQ a limited, worldwide, royalty-free license to host, store, transmit, and process Your Content solely as necessary to provide the Service to you.</p>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-6">8. AI-generated content</h2>
        <p>AI-generated suggestions are starting points — not guarantees. You are responsible for reviewing, editing, and verifying any AI output before relying on it, sending emails, or making business decisions. You must have the rights necessary for any content you submit as input to AI features. EngageIQ may apply content filters and may refuse, restrict, or remove outputs that violate these Terms or applicable law.</p>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-6">9. Payments, subscriptions, and Merchant of Record</h2>
        <p><strong>Our order process is conducted by our online reseller Lemon Squeezy. Lemon Squeezy is the Merchant of Record for all our orders. Lemon Squeezy provides all customer service inquiries and handles returns.</strong></p>
        <p>Subscriptions renew automatically at the end of each billing period (monthly or yearly, depending on the plan you choose) until cancelled. Plan changes take effect immediately and are prorated. Cancellations take effect at the end of the current billing period. Prices are exclusive of applicable taxes, which Lemon Squeezy will calculate and collect where required.</p>
        <p>For payment, billing, tax, cancellation, and refund mechanics, please refer to Lemon Squeezy's Buyer Terms. Refund requests are handled per our Refund Policy.</p>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-6">10. Service availability</h2>
        <p>We aim to provide a reliable Service but do not guarantee that it will be uninterrupted, error-free, or available at all times. Plans, prices, and features may change; we will give reasonable notice of material changes.</p>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-6">11. Suspension and termination</h2>
        <p>You may cancel your subscription and delete your account at any time. We may suspend or terminate your access to the Service, with or without notice, for: (a) material breach of these Terms; (b) non-payment; (c) suspected fraud or security risk; or (d) repeated or serious policy violations.</p>
        <p>On termination, your right to use the Service ends immediately. We will retain or delete Your Content in accordance with our <Link className="underline" to="/privacy">Privacy Notice</Link>.</p>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-6">12. Warranties and disclaimers</h2>
        <p>The Service is provided "as is" and "as available". To the fullest extent permitted by law, EngageIQ disclaims all implied warranties, including merchantability, fitness for a particular purpose, and non-infringement.</p>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-6">13. Limitation of liability</h2>
        <p>To the fullest extent permitted by law, EngageIQ's aggregate liability arising out of or in connection with these Terms is capped at the fees you paid to EngageIQ in the 12 months preceding the event giving rise to the claim. EngageIQ is not liable for indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, goodwill, or business opportunity. Nothing in these Terms excludes liability that cannot be excluded by law (such as fraud or death/personal injury caused by negligence).</p>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-6">14. Indemnification</h2>
        <p>You agree to indemnify and hold EngageIQ harmless from any claim, loss, or expense arising out of Your Content, your use of the Service, or your breach of these Terms.</p>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-6">15. Changes to the Terms</h2>
        <p>We may update these Terms from time to time. Material changes will be communicated through the app or by email and take effect on the date stated.</p>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-6">16. Governing law</h2>
        <p>These Terms are governed by the laws of the jurisdiction in which EngageIQ is established, without regard to conflict-of-laws principles. Disputes will be resolved by the competent courts of that jurisdiction, unless mandatory consumer law provides otherwise.</p>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-6">17. Contact</h2>
        <p>Questions about these Terms? Contact EngageIQ at <a className="underline" href="mailto:support@engageiqlk.com">support@engageiqlk.com</a> or by post:</p>
        <address className="not-italic mt-2 leading-relaxed">
          <strong>EngageIQ</strong><br />
          HQ: 275 New North Road, Islington #1772, London, N1 7AA, United Kingdom<br />
          R&amp;D: Colombo 10350, Sri Lanka
        </address>
      </main>
    </div>
  );
}
