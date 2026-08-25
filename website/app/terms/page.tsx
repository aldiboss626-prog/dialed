import type { Metadata } from "next";
import { LegalShell } from "@/components/LegalShell";

export const metadata: Metadata = {
  title: "Terms of Service - Dialed",
  description: "The terms that govern your use of Dialed.",
};

// Draft terms. Review with counsel before public launch.
export default function Terms() {
  return (
    <LegalShell title="Terms of Service" updated="July 1, 2026">
      <section>
        <h2>The service</h2>
        <p>
          Dialed is a mobile app that helps you maintain professional relationships:
          it reminds you when to reach out, detects emails waiting on your reply, and
          drafts messages with AI assistance. By creating an account you agree to
          these terms.
        </p>
      </section>

      <section>
        <h2>Your account</h2>
        <p>
          You are responsible for your account credentials and for the accuracy of the
          information you save. You must be at least 13 years old to use Dialed.
        </p>
      </section>

      <section>
        <h2>Subscriptions and trials</h2>
        <p>
          Dialed is a paid subscription with a 7-day free trial. Payment is processed
          by the App Store or Google Play, and the subscription renews automatically
          unless cancelled in your store account settings before the end of the
          current period. Store refund policies apply.
        </p>
      </section>

      <section>
        <h2>Acceptable use</h2>
        <p>
          Don&rsquo;t use Dialed to send spam, harass anyone, or violate the law. AI drafts
          are suggestions: you are responsible for every message you send.
        </p>
      </section>

      <section>
        <h2>Your content</h2>
        <p>
          The contacts, notes, and messages you save belong to you. You give Dialed the
          limited license needed to store and process them to run the service,
          including sending relevant content to our AI provider to generate drafts, as
          described in the Privacy Policy.
        </p>
      </section>

      <section>
        <h2>Termination</h2>
        <p>
          You can delete your account at any time in Settings. We may suspend accounts
          that violate these terms.
        </p>
      </section>

      <section>
        <h2>Disclaimers</h2>
        <p>
          Dialed is provided as-is. We work hard to keep it reliable, but we cannot
          guarantee it will always be available or error-free, and we are not liable
          for missed reminders or the content of AI-generated drafts.
        </p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>
          We may update these terms; material changes will be announced in the app.
          Continued use after changes means you accept them. Questions:
          support@dialed.app.
        </p>
      </section>
    </LegalShell>
  );
}
