import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";

export default function Refund() {
  return (
    <div className="min-h-screen bg-background">
      <header className="container mx-auto px-6 py-6 border-b">
        <Link to="/"><Logo /></Link>
      </header>
      <main className="container mx-auto px-6 py-12 max-w-3xl">
        <h1 className="text-3xl font-display font-bold text-primary-deep">Refund Policy</h1>
        <p className="text-muted-foreground">Last updated: April 2026</p>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-8">14 working day refund window</h2>
        <p><strong>EngageIQ</strong> offers a refund window of <strong>14 working days</strong> from your initial order date. If you are not satisfied with your purchase, you may request a full refund within <strong>14 working days</strong> of placing your order.</p>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-6">How to request a refund</h2>
        <p>Refunds for EngageIQ are processed by our payment provider and Merchant of Record, <strong>Paddle</strong>. To request a refund:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Visit <a className="underline" href="https://paddle.net" target="_blank" rel="noopener noreferrer">paddle.net</a> and look up your order using the email address used at checkout, or</li>
          <li>Contact EngageIQ through in-app support and we will help you initiate the refund with Paddle.</li>
        </ul>
        <p>Once approved, refunds are typically returned to your original payment method within 5–10 business days, depending on your bank or card issuer.</p>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-6">Cancellations</h2>
        <p>You can cancel your subscription at any time from <strong>Settings → Billing</strong>. Cancellation takes effect at the end of your current billing period — you will keep access until then and will not be charged again.</p>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-6">Renewals after the refund window</h2>
        <p>After the 14 working day refund window has passed, charges (including subscription renewals) are not automatically refundable. If a renewal was charged and you intended to cancel, contact us through in-app support — we review these requests on a case-by-case basis and aim to be fair.</p>

        <h2 className="text-xl font-display font-bold text-primary-deep mt-6">Questions</h2>
        <p>If you have questions about this policy or a specific charge, contact EngageIQ through in-app support, or refer to <a className="underline" href="https://www.paddle.com/legal/refund-policy" target="_blank" rel="noopener noreferrer">Paddle's Refund Policy</a>.</p>
      </main>
    </div>
  );
}
