import { Logo } from "@/components/Logo";

export default function Refund() {
  return (
    <div className="min-h-screen bg-background">
      <header className="container mx-auto px-6 py-6 border-b">
        <Logo />
      </header>
      <main className="container mx-auto px-6 py-12 max-w-3xl">
        <h1 className="text-3xl font-display font-bold text-primary-deep">Refund Policy</h1>
        <p className="text-muted-foreground">Last updated: May 2026</p>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-8">14 working day refund window</h2>
        <p><strong>EngageIQ</strong> offers a refund window of <strong>14 working days</strong> from your initial order date. If you are not satisfied with your purchase, you may request a full refund within <strong>14 working days</strong> of placing your order.</p>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-6">How to request a refund</h2>
        <p>Payments for EngageIQ are processed securely through <strong>PayPal</strong>. To request a refund:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Contact EngageIQ through in-app support or email <a href="mailto:support@engageiqlk.com" className="underline">support@engageiqlk.com</a> with your PayPal transaction ID and the email address used at checkout.</li>
          <li>Once approved, we will issue the refund through PayPal back to your original payment method.</li>
        </ul>
        <p>Refunds typically appear within 3–5 business days for PayPal balance refunds, or 5–10 business days when returned to a linked card or bank account, depending on your bank or card issuer.</p>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-6">Cancellations</h2>
        <p>You can cancel your subscription at any time from <strong>Settings → Billing</strong>. Cancellation takes effect at the end of your current billing period — you will keep access until then and will not be charged again.</p>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-6">Renewals after the refund window</h2>
        <p>After the 14 working day refund window has passed, charges (including subscription renewals) are not automatically refundable. If a renewal was charged and you intended to cancel, contact us through in-app support — we review these requests on a case-by-case basis and aim to be fair.</p>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-6">PayPal Buyer Protection</h2>
        <p>As payments are processed via PayPal, eligible transactions are also covered by <strong>PayPal Buyer Protection</strong>. You may open a dispute directly in your PayPal account if needed, though we encourage you to contact us first so we can resolve the issue quickly.</p>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-6">Questions</h2>
        <p>If you have questions about this policy or a specific charge, email support@engageiqlk.com.</p>
        <address className="not-italic mt-4 leading-relaxed text-sm">
          <strong>EngageIQ</strong><br />
          HQ: 275 New North Road, Islington #1772, London, N1 7AA, United Kingdom<br />
          R&amp;D: Colombo 10350, Sri Lanka
        </address>
      </main>
    </div>
  );
}
