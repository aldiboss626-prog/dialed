import type { Metadata } from "next";
import { LegalShell } from "@/components/LegalShell";

export const metadata: Metadata = {
  title: "Support - Dialed",
  description: "Get help with Dialed.",
};

export default function Support() {
  return (
    <LegalShell title="Support" updated="July 1, 2026">
      <section>
        <h2>Contact us</h2>
        <p>
          Email <a className="underline" href="mailto:support@dialed.app">support@dialed.app</a> and
          a human will get back to you, usually within one business day.
        </p>
      </section>

      <section>
        <h2>Common questions</h2>
        <ul>
          <li><strong>Billing:</strong> subscriptions are managed in your App Store or Google Play account settings, including cancellation and refunds.</li>
          <li><strong>Delete your account:</strong> in the app, go to Settings, then Delete Account. This permanently removes your account and all data. You can also request deletion by email.</li>
          <li><strong>Gmail connection:</strong> you can disconnect Gmail anytime in Settings; this revokes Dialed&rsquo;s access with Google immediately.</li>
        </ul>
      </section>
    </LegalShell>
  );
}
