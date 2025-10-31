import React from 'react';

export default function EmailPolicy() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-4">Email Policy</h1>
        <p className="text-slate-700 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

        <section className="space-y-4 text-slate-800">
          <p>
            ChillBoard sends only transactional emails directly related to your account activity on
            our platform. We do not send newsletters, promotions, or third‑party marketing emails.
          </p>

          <h2 className="text-xl font-semibold mt-6">Types of emails we send</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Account sign‑up confirmations and verification</li>
            <li>Password reset codes and security alerts</li>
            <li>Critical account notifications (e.g., login from a new device)</li>
            <li>Product or system notices strictly required to operate your account</li>
          </ul>

          <h2 className="text-xl font-semibold mt-6">Frequency and controls</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Emails are triggered by specific user actions or essential account events.</li>
            <li>You may adjust non‑essential notification preferences in Settings.</li>
            <li>Security and legal notices may be sent regardless of preferences where required.</li>
          </ul>

          <h2 className="text-xl font-semibold mt-6">Sender domain and authentication</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Emails are sent from our verified domain (e.g., no-reply@chillboard.in).</li>
            <li>We use industry best practices including SPF, DKIM, and DMARC.</li>
          </ul>

          <h2 className="text-xl font-semibold mt-6">Bounce and complaint handling</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>We monitor bounces and complaints and may suppress delivery to affected addresses.</li>
            <li>If you believe your address was suppressed in error, contact support.</li>
          </ul>

          <h2 className="text-xl font-semibold mt-6">Data privacy</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>We only process data necessary to deliver emails related to your account.</li>
            <li>Please review our Privacy Policy for details on data handling and retention.</li>
          </ul>

          <h2 className="text-xl font-semibold mt-6">Contact</h2>
          <p>
            Questions about this policy? Contact us at
            {" "}
            <a href="mailto:support@chillboard.in" className="text-blue-600 hover:underline">support@chillboard.in</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
