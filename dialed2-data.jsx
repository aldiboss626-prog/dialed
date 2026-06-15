// dialed2-data.jsx — email/thread sample data + AI-draft helpers for the
// refocused two-pane Dialed (Network + Inbox). Emails tie to SAMPLE contacts
// (dialed-kit.jsx) by contactId, so replying resets that contact's cadence.

const EMAIL_SAMPLE = [
  { id: 'e1', contactId: 1, subject: 'Seed intro — can you send the deck?',
    snippet: 'The partner has bandwidth this month. If you get me the updated deck I’ll loop them in…',
    body: "Hey — great catching up last week. The partner I mentioned has bandwidth to look at new things this month. If you can get me the updated deck before Friday, I'll loop them in and push for a first call.",
    days: 3 },
  { id: 'e2', contactId: 2, subject: 'Portfolio review this month?',
    snippet: 'Happy to do a proper review — send me the latest work and a few times that suit you…',
    body: "I finally have a lighter couple of weeks and would love to do the portfolio review I promised. Send me your latest work and a few times that suit you, and we'll get it on the calendar.",
    days: 5 },
  { id: 'e3', contactId: 3, subject: 'PM role opens in two weeks',
    snippet: 'Wanted you to have a head start before this goes live on the careers page…',
    body: "The Growth PM role I mentioned is going live in about two weeks. Wanted to give you a head start — if you're interested I can flag your name to the hiring manager before it hits the careers page.",
    days: 2 },
  { id: 'e4', contactId: 4, subject: 'Re: recommendation letter',
    snippet: 'I’ve started a draft — could you send me a short brag sheet to work from?',
    body: "Happy to write the recommendation. I've started a draft, but it would help to have a short brag sheet — a few bullet points on what you'd like me to emphasize. No rush, but sooner is better for the deadlines.",
    days: 6 },
  { id: 'e5', contactId: 5, subject: 'Coffee when you’re in SF?',
    snippet: 'Heard you might be in the city the week of the 14th — would be great to catch up…',
    body: "Heard you might be in the city the week of the 14th. Would be great to actually catch up in person for once — coffee or a quick lunch? Let me know what your days look like.",
    days: 1 },
  { id: 'e6', contactId: 6, subject: 'Fundraising playbook + an intro',
    snippet: 'Sent the playbook over. Also — want an intro to my old partner who’s active in your space?',
    body: "Sent the fundraising playbook to your inbox. One more thing: my old partner is actively looking at companies in your space. Want me to make an intro? Just say the word and I'll send a note.",
    days: 4 },
];

// priority from the contact's importance + how long it's been waiting
function emailPriority(contact, email) {
  const s = (contact ? contact.stars : 3) * 5 + email.days * 2 + (contact && contact.status === 'overdue' ? 8 : 0);
  if (s >= 30) return { key: 'high', label: 'High', color: C.overdue };
  if (s >= 20) return { key: 'med', label: 'Medium', color: C.warning };
  return { key: 'low', label: 'Low', color: C.ink3 };
}

const TONES = [
  { key: 'warm', label: 'Warm' },
  { key: 'brief', label: 'Brief' },
  { key: 'call', label: 'Suggest a call' },
];

// canned but tailored drafts — interpolates first name; swaps on tone chip
function draftReply(contact, email, tone) {
  const first = contact ? contact.name.split(' ')[0] : 'there';
  if (tone === 'brief')
    return `Hi ${first} — thanks for this, and sorry for the slow reply. Yes, let's do it. I'll send what you need by the end of the week.`;
  if (tone === 'call')
    return `Hi ${first} — really appreciate you reaching out. I'd love to talk this through properly rather than over email. Are you free for a quick call Tuesday or Wednesday afternoon?`;
  return `Hi ${first},\n\nSo good to hear from you — and thank you for thinking of me. This is exactly the kind of thing I'd love to move on. Let me pull together what you need and I'll follow up in the next day or two.\n\nTalk soon,\nAlex`;
}

// outbound reach-out (no incoming email) — used from the Network pane
function draftReachOut(contact, tone) {
  const first = contact ? contact.name.split(' ')[0] : 'there';
  if (tone === 'brief')
    return `Hi ${first} — it's been a minute! Just wanted to check in. How have you been?`;
  if (tone === 'call')
    return `Hi ${first} — it's been too long. Free for a quick catch-up call sometime next week? Would love to hear what you're working on.`;
  return `Hi ${first},\n\nIt's been a while and you've been on my mind — I didn't want our thread to go cold. How are things on your end? Would love to properly catch up soon.\n\nWarmly,\nAlex`;
}

// ── gist-based co-writer ──────────────────────────────────────────────────
// Dialed can't read the email body (no inbox API) — it only has the subject.
// So instead of faking a reply, the user gives the GIST and we shape it into a
// polished message. Quick-start intents seed the gist box to cut friction.
const REPLY_INTENTS = [
  { label: 'Say yes', text: 'Yes, I’d be glad to — happy to help with this.' },
  { label: 'Politely decline', text: 'Unfortunately I won’t be able to this time, but thank you for thinking of me.' },
  { label: 'Need more time', text: 'I need a little more time on this — can I follow up with you next week?' },
  { label: 'Suggest a meet', text: 'Would love to find time to talk this through properly.' },
  { label: 'Just thank them', text: 'Thank you so much — I really appreciate you reaching out.' },
];
const REACHOUT_INTENTS = [
  { label: 'Check in', text: 'Just wanted to check in and see how you’ve been lately.' },
  { label: 'Share news', text: 'Wanted to share some news with you —' },
  { label: 'Grab time', text: 'Would love to find time to catch up in person soon.' },
  { label: 'Congratulate', text: 'Congratulations — I saw the news and had to reach out!' },
];

function tidyGist(gist) {
  const lines = (gist || '').split(/\n+/).map((s) => s.replace(/^[-•*]\s*/, '').trim()).filter(Boolean);
  return lines.map((s) => {
    const t = s.charAt(0).toUpperCase() + s.slice(1);
    return /[.!?]$/.test(t) ? t : t + '.';
  }).join(' ');
}

// turn the user's gist + tone into a finished email
function composeFromGist(contact, gist, tone, isReply) {
  const first = contact ? contact.name.split(' ')[0] : 'there';
  const body = tidyGist(gist) || (isReply ? 'Thanks for reaching out.' : 'Just wanted to check in.');
  if (tone === 'brief') {
    return `Hi ${first},\n\n${body}\n\nThanks,\nAlex`;
  }
  if (tone === 'call') {
    const open = isReply ? 'Thanks for the note. ' : 'It’s been a while! ';
    return `Hi ${first},\n\n${open}${body}\n\nHonestly, it might be easier to talk this through — are you free for a quick call this week?\n\nBest,\nAlex`;
  }
  const open = isReply ? 'Thank you so much for reaching out — it’s really good to hear from you.' : 'It’s been too long, and you’ve been on my mind.';
  const close = isReply ? 'Let me know if there’s anything else you need from me. Talk soon!' : 'Would love to properly catch up soon.';
  return `Hi ${first},\n\n${open}\n\n${body}\n\n${close}\n\nWarmly,\nAlex`;
}

Object.assign(window, { EMAIL_SAMPLE, emailPriority, TONES, draftReply, draftReachOut, REPLY_INTENTS, REACHOUT_INTENTS, composeFromGist, tidyGist });
