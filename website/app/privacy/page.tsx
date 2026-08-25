import type { Metadata } from "next";
import { LegalShell } from "@/components/LegalShell";

export const metadata: Metadata = {
  title: "Privacy Policy - Dialed",
  description: "How Dialed collects, uses, and protects your data.",
};

// Draft policy per WEBSITE_SPEC.md §11.3. Review with counsel before public launch.
export default function Privacy() {
  return (
    <LegalShell title="Privacy Policy" updated="July 1, 2026">
      <section>
        <h2>What we collect</h2>
        <ul>
          <li><strong>Account:</strong> your email address and name, used to sign you in.</li>
          <li><strong>Your network data:</strong> the contacts, notes, interactions, and opportunities you save in Dialed.</li>
          <li><strong>Email content:</strong> only when you ask for an AI draft or connect Gmail (see below).</li>
          <li><strong>Business-card images:</strong> only when you scan a card to add a contact.</li>
          <li><strong>Device push token:</strong> so we can send you follow-up reminders.</li>
        </ul>
      </section>

      <section>
        <h2>How we use it</h2>
        <p>
          To run the app: spotting replies you owe, drafting messages in your voice,
          extracting contact details from a scanned card, and sending you reminders.
          We do not sell your data. We do not use it for advertising.
        </p>
      </section>

      <section>
        <h2>AI processing</h2>
        <p>
          When you request an AI draft, the relevant email text or screenshot is sent to
          <strong> Anthropic</strong> (our AI provider) to generate the reply. When you scan a
          business card, the photo is sent to Anthropic once to read the name, title,
          company, email, and phone. These are processed per request, are not used to
          train models on a retained basis, and are not stored by Dialed after the
          request completes. A scanned card image is never stored; only the fields you
          review and save are kept.
        </p>
      </section>

      <section>
        <h2>Who we share data with</h2>
        <ul>
          <li><strong>Anthropic:</strong> email text or screenshots and business-card photos, to generate drafts and read cards.</li>
          <li><strong>Supabase:</strong> account and saved network data (our database and authentication).</li>
          <li><strong>Google:</strong> if you connect Gmail, the OAuth token and mailbox metadata that power the inbox features.</li>
          <li><strong>Expo:</strong> your device push token, to deliver reminders.</li>
          <li><strong>Hosting and analytics</strong> (Vercel, Railway): standard request metadata to serve the app.</li>
        </ul>
        <p>Your data is not sold to anyone.</p>
      </section>

      <section>
        <h2>Gmail and Google user data (Limited Use)</h2>
        <p>
          If you choose to connect Gmail, Dialed requests read access to message
          metadata (subject, sender, recipient, date) to detect conversations waiting on
          your reply, and read access to your Google Contacts to import people you
          choose. Dialed&rsquo;s use and transfer of information received from Google APIs
          adheres to the{" "}
          <a
            className="underline"
            href="https://developers.google.com/terms/api-services-user-data-policy"
          >
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements.
        </p>
      </section>

      <section>
        <h2>Retention and deletion</h2>
        <p>
          Your data is kept while your account is active. You can delete your account
          and all of its data at any time in the app under Settings, Delete Account.
          Deletion is immediate and permanent: contacts, notes, email records,
          reminders, and the account itself are all removed. You can also request
          deletion by email at support@dialed.app.
        </p>
      </section>

      <section>
        <h2>Security</h2>
        <p>
          Data is encrypted in transit. Google account tokens are encrypted at rest.
          Per-user data is isolated with row-level security in our database.
        </p>
      </section>

      <section>
        <h2>Children</h2>
        <p>Dialed is not directed at children under 13 and may not be used by them.</p>
      </section>

      <section>
        <h2>Your rights</h2>
        <p>
          You can access, export, or delete your data at any time. Email
          support@dialed.app to exercise any of these rights.
        </p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>
          If this policy changes, we will update this page and note the new effective
          date above. Material changes will be announced in the app.
        </p>
      </section>
    </LegalShell>
  );
}
