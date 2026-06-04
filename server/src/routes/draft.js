const router = require('express').Router();
const db = require('../db/database');
const authenticate = require('../middleware/auth');
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

router.post('/draft', authenticate, async (req, res) => {
  const { contactId, pendingResponseId } = req.body;
  if (!contactId) return res.status(400).json({ message: 'contactId required' });

  const contact = db.prepare('SELECT * FROM contacts WHERE id = ? AND user_id = ?').get(contactId, req.userId);
  if (!contact) return res.status(404).json({ message: 'Contact not found' });

  const user = db.prepare('SELECT name FROM users WHERE id = ?').get(req.userId);
  const interactions = db.prepare(
    'SELECT * FROM interactions WHERE contact_id = ? ORDER BY date DESC LIMIT 5'
  ).all(contactId);
  const emails = db.prepare(
    'SELECT * FROM email_threads WHERE contact_id = ? ORDER BY date DESC LIMIT 4'
  ).all(contactId);
  const opps = db.prepare(
    "SELECT * FROM opportunities WHERE contact_id = ? AND status IN ('Active','Waiting') ORDER BY deadline ASC LIMIT 2"
  ).all(contactId);

  const today = new Date();
  const last = new Date(contact.last_contact_date);
  const daysSince = Math.floor((today - last) / 86400000);

  const context = `
Contact: ${contact.name}
Role: ${contact.role || 'N/A'}
Relationship: ${contact.relationship_type || 'N/A'}
Stars: ${contact.stars}/5
Days since last contact: ${daysSince}
Cadence: every ${contact.cadence_days} days
Notes: ${contact.notes || 'None'}

Recent interactions:
${interactions.map(i => `- ${i.date}: ${i.note} (${i.type})`).join('\n') || 'None'}

Recent emails:
${emails.map(e => `- [${e.is_from_user ? 'Sent' : 'Received'}] ${e.date}: "${e.subject}" — ${e.preview || ''}`).join('\n') || 'None'}

Active opportunities linked to this contact:
${opps.map(o => `- ${o.title} (${o.status}, deadline: ${o.deadline || 'TBD'})`).join('\n') || 'None'}
`.trim();

  // If this is a reply to a specific inbound email, use the reply prompt
  let systemPrompt, userContent;
  if (pendingResponseId) {
    const pr = db.prepare(`
      SELECT pr.*, et.subject, et.body AS email_body, et.preview
      FROM pending_responses pr
      JOIN email_threads et ON et.id = pr.email_thread_id
      WHERE pr.id = ? AND pr.user_id = ?
    `).get(pendingResponseId, req.userId);

    if (pr) {
      systemPrompt = `You are helping ${user.name} reply to an email they received from ${contact.name}${contact.role ? ', ' + contact.role : ''}. The email was about: "${pr.subject}". Write a warm, professional reply in first person as ${user.name}. 3-5 sentences. Reference the specific topic they raised. Sound like a real person responding promptly, not a template. Output only the message body — no greeting prefix, no sign-off.`;
      userContent = `Draft a reply to this email:\n\nFrom: ${contact.name}\nSubject: ${pr.subject}\nMessage: ${pr.email_body || pr.preview}\n\nContext:\n${context}`;
    }
  }

  if (!systemPrompt) {
    systemPrompt = `You are helping ${user.name}, an ambitious finance student at the University of Miami, draft a professional follow-up message to a contact in their network. Write in first person as ${user.name}. Keep it warm but professional, 3-5 sentences. Reference something specific from their recent interaction history. Never sound generic. Output only the message body — no subject line, no greeting prefix like "Hi [name]," or sign-off. Just the body paragraph.`;
    userContent = `Draft a follow-up message for this contact:\n\n${context}`;
  }

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    });

    const draft = message.content[0].text.trim();
    res.json({ draft });
  } catch (err) {
    console.error('Anthropic error:', err.message);
    res.status(500).json({ message: 'Failed to generate draft', error: err.message });
  }
});

module.exports = router;
