const router = require('express').Router();
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function parseJson(text) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  return JSON.parse(cleaned);
}

const TOPIC_PROMPTS = {
  'networking-101': 'networking fundamentals for college students — how to introduce yourself, start conversations, and follow up',
  'workplace-etiquette': 'professional workplace etiquette — emails, meetings, dress code, office politics, and first impressions',
  'coffee-dates': 'how to have a productive coffee chat — requesting one, what to say, how to follow up, and turning it into an opportunity',
  'career-exposure': 'getting career exposure — informational interviews, job shadowing, industry events, and building domain knowledge early',
  'dealing-with-authority': 'communicating effectively with professors, managers, and senior professionals — how to ask for things, handle feedback, and build mentor relationships',
  'linkedin-tips': 'LinkedIn strategy for students — optimizing a profile, reaching out to strangers, what to post, and how to grow a network',
};

// POST /api/content/challenge
router.post('/challenge', async (req, res) => {
  const { overdue = 0, dueSoon = 0, totalContacts = 0, topContactName } = req.body;

  const contextLine = totalContacts === 0
    ? 'This student has just started building their network.'
    : `They have ${totalContacts} people in their orbit, ${overdue} overdue contacts, and ${dueSoon} due for follow-up soon.${topContactName ? ` Their top contact is ${topContactName}.` : ''}`;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: 'You are a networking coach for college students. Always respond with valid JSON only — no markdown, no extra text.',
      messages: [{
        role: 'user',
        content: `Generate a short, actionable daily networking challenge. ${contextLine}

Return exactly this JSON shape:
{
  "challenge": "short bold title (max 8 words)",
  "description": "2-sentence explanation of why this matters",
  "action": "one specific concrete action to take today",
  "difficulty": "Easy" | "Medium" | "Hard"
}`,
      }],
    });

    const data = parseJson(response.content[0].text);
    res.json(data);
  } catch (err) {
    console.error('Content challenge error:', err);
    res.status(500).json({ error: 'Failed to generate challenge' });
  }
});

// POST /api/content/article
router.post('/article', async (req, res) => {
  const { topic, title } = req.body;
  const topicDesc = TOPIC_PROMPTS[topic] || 'professional networking for college students';

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 700,
      system: 'You are a career coach writing concise, practical articles for college students. Always respond with valid JSON only — no markdown, no extra text.',
      messages: [{
        role: 'user',
        content: `Write a short article about: ${topicDesc}.${title ? ` The article title is: "${title}"` : ''}

Return exactly this JSON shape:
{
  "title": "compelling article title",
  "intro": "1 engaging opening paragraph (2-3 sentences)",
  "body": "2 more paragraphs with practical advice",
  "practicalTip": "one concrete tip the reader can act on today (1-2 sentences)",
  "readMinutes": 2
}`,
      }],
    });

    const data = parseJson(response.content[0].text);
    res.json(data);
  } catch (err) {
    console.error('Content article error:', err);
    res.status(500).json({ error: 'Failed to generate article' });
  }
});

// POST /api/content/outfit-check — Claude vision dress code advisor
router.post('/outfit-check', async (req, res) => {
  const { imageBase64, industry = 'General' } = req.body;
  if (!imageBase64) return res.status(400).json({ error: 'imageBase64 required' });

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      system: 'You are a professional dress code advisor. Always respond with valid JSON only — no markdown, no extra text.',
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 },
          },
          {
            type: 'text',
            text: `Rate this outfit for the ${industry} industry. Return exactly this JSON:
{
  "rating": "Appropriate" | "Adjust" | "Inappropriate",
  "feedback": "2-3 sentences of specific, actionable feedback"
}`,
          },
        ],
      }],
    });

    const data = parseJson(response.content[0].text);
    res.json(data);
  } catch (err) {
    console.error('Outfit check error:', err);
    res.status(500).json({ error: 'Failed to check outfit' });
  }
});

// POST /api/content/resume-copy — AI resume text generator
router.post('/resume-copy', async (req, res) => {
  const { role = '', level = 'Student', experiences = [], skills = [], style = 'Harvard Clean' } = req.body;

  const expLines = experiences.map((e, i) => `${i + 1}. ${e.title} at ${e.org}: ${e.impact}`).join('\n');
  const skillList = skills.join(', ');

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      system: 'You are a professional resume writer. Always respond with valid JSON only — no markdown, no extra text.',
      messages: [{
        role: 'user',
        content: `Write a resume for a ${level} targeting the role: ${role}.
Experiences:
${expLines}
Skills: ${skillList}
Style: ${style}

Return exactly this JSON:
{
  "resumeText": "complete formatted resume text with clear sections, ready to paste"
}`,
      }],
    });

    const data = parseJson(response.content[0].text);
    res.json(data);
  } catch (err) {
    console.error('Resume copy error:', err);
    res.status(500).json({ error: 'Failed to generate resume' });
  }
});

// POST /api/content/company-plan — personalized company approach strategy
router.post('/company-plan', async (req, res) => {
  const { company, status = 'Researching', industry = '' } = req.body;
  if (!company) return res.status(400).json({ error: 'company required' });

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: 'You are a career coach. Always respond with valid JSON only — no markdown, no extra text.',
      messages: [{
        role: 'user',
        content: `Generate a 3-step approach plan for getting a job at ${company}${industry ? ` (${industry} industry)` : ''}. Current status: ${status}.

Return exactly this JSON:
{
  "plan": [
    { "step": 1, "title": "step title", "action": "specific action to take" },
    { "step": 2, "title": "step title", "action": "specific action to take" },
    { "step": 3, "title": "step title", "action": "specific action to take" }
  ]
}`,
      }],
    });

    const data = parseJson(response.content[0].text);
    res.json(data);
  } catch (err) {
    console.error('Company plan error:', err);
    res.status(500).json({ error: 'Failed to generate plan' });
  }
});

// POST /api/content/venue-suggestions — coffee spot venue types by city
router.post('/venue-suggestions', async (req, res) => {
  const { city, neighborhood = '' } = req.body;
  if (!city) return res.status(400).json({ error: 'city required' });

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: 'You are a networking coach. Always respond with valid JSON only — no markdown, no extra text.',
      messages: [{
        role: 'user',
        content: `Suggest 4 venue types for a professional coffee meeting in ${city}${neighborhood ? `, ${neighborhood}` : ''}. Focus on atmosphere and vibe, not specific place names.

Return exactly this JSON:
{
  "suggestions": [
    { "icon": "☕", "type": "venue type name", "description": "one line why it works for professional meetings", "vibe": "Quiet" | "Lively" | "Focused" | "Casual" },
    ...4 total
  ]
}`,
      }],
    });

    const data = parseJson(response.content[0].text);
    res.json(data);
  } catch (err) {
    console.error('Venue suggestions error:', err);
    res.status(500).json({ error: 'Failed to generate suggestions' });
  }
});

// POST /api/content/books — recommended books on authority and mentorship
router.post('/books', async (req, res) => {
  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: 'You are a career coach. Always respond with valid JSON only — no markdown, no extra text.',
      messages: [{
        role: 'user',
        content: `Recommend 6 books for college students on topics like: communicating with authority figures, intergenerational workplace dynamics, mentorship, and professional relationships.

Return exactly this JSON:
{
  "books": [
    { "emoji": "📘", "title": "book title", "author": "Author Name", "why": "one sentence on why this book matters for students" },
    ...6 total
  ]
}`,
      }],
    });

    const data = parseJson(response.content[0].text);
    res.json(data);
  } catch (err) {
    console.error('Books error:', err);
    res.status(500).json({ error: 'Failed to get book recommendations' });
  }
});

// POST /api/content/linkedin-audit — profile feedback and rewrite
router.post('/linkedin-audit', async (req, res) => {
  const { headline = '', summary = '' } = req.body;
  if (!headline && !summary) return res.status(400).json({ error: 'headline or summary required' });

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: 'You are a LinkedIn profile coach for college students. Always respond with valid JSON only — no markdown, no extra text.',
      messages: [{
        role: 'user',
        content: `Audit and improve this LinkedIn profile:
Headline: ${headline}
Summary: ${summary}

Return exactly this JSON:
{
  "feedback": "2-3 sentences of honest, specific feedback",
  "revisedHeadline": "improved headline (max 12 words, no buzzwords)",
  "revisedSummary": "improved 3-sentence about section that sounds human and confident"
}`,
      }],
    });

    const data = parseJson(response.content[0].text);
    res.json(data);
  } catch (err) {
    console.error('LinkedIn audit error:', err);
    res.status(500).json({ error: 'Failed to audit profile' });
  }
});

// POST /api/content/draft-reply — read an email (pasted text OR screenshot) and write a reply
const REPLY_INTENTS = {
  professional: 'Write a warm, professional response that moves the conversation forward.',
  accept: 'Accept or agree to what they are proposing, and ask any clarifying question needed to take the next step.',
  decline: 'Politely and graciously decline or push back, while keeping the relationship warm and leaving the door open.',
  details: 'Respond positively but ask for the specific additional details or information needed before committing.',
};

router.post('/draft-reply', async (req, res) => {
  const {
    emailText = '',
    imageBase64 = '',
    contactName = 'them',
    contactRole = '',
    relationship = '',
    senderName = '',
    intent = 'professional',
    styleExamples = [],
  } = req.body;

  if (!emailText.trim() && !imageBase64) {
    return res.status(400).json({ error: 'Provide emailText or imageBase64' });
  }

  const intentLine = REPLY_INTENTS[intent] || REPLY_INTENTS.professional;
  const who = [contactName, contactRole && `(${contactRole})`, relationship && `— your ${relationship}`]
    .filter(Boolean).join(' ');

  // Personalization: feed the user's own past replies so drafts learn their voice over time.
  const samples = Array.isArray(styleExamples)
    ? styleExamples.filter(s => typeof s === 'string' && s.trim()).slice(0, 5)
    : [];
  const styleBlock = samples.length
    ? `\nHere are a few replies ${senderName || 'this person'} has written before. Match their voice, tone, greetings, and sign-offs — but do not copy their content:\n"""\n${samples.join('\n---\n')}\n"""\n`
    : '';

  const instructions = `You are helping ${senderName || 'a college student'} reply to an email from ${who}.

Goal for this reply: ${intentLine}
${styleBlock}
Rules:
- Match the tone and formality of the original email.
- Sound human and natural — write in the sender's own voice, not corporate boilerplate.
- Be concise (3-6 sentences). No placeholder brackets like [Name] unless truly unavoidable.
- Do not invent specific facts, dates, or commitments that weren't in the original email.
- Ready to send as-is.

Return exactly this JSON:
{
  "subject": "the reply subject line, prefixed with 'Re: ' if appropriate",
  "reply": "the full email body, including a greeting and sign-off"
}`;

  try {
    let response;
    if (imageBase64) {
      // Vision: read the email from a screenshot, then draft the reply
      response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 700,
        system: 'You read an email from a screenshot and draft a reply. Always respond with valid JSON only — no markdown, no extra text.',
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 } },
            { type: 'text', text: `The screenshot above is an email thread. Read it, then draft a reply.\n\n${instructions}` },
          ],
        }],
      });
    } else {
      response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 700,
        system: 'You draft email replies. Always respond with valid JSON only — no markdown, no extra text.',
        messages: [{
          role: 'user',
          content: `Here is the email to reply to:\n"""\n${String(emailText).slice(0, 8000)}\n"""\n\n${instructions}`,
        }],
      });
    }

    const data = parseJson(response.content[0].text);
    res.json(data);
  } catch (err) {
    console.error('Draft reply error:', err);
    res.status(500).json({ error: 'Failed to draft reply' });
  }
});

// POST /api/content/scan-card — read a business card photo and extract contact fields
router.post('/scan-card', async (req, res) => {
  const { imageBase64 = '' } = req.body;
  if (!imageBase64) return res.status(400).json({ error: 'imageBase64 required' });

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      system: 'You read a business card from a photo and extract the contact details. Always respond with valid JSON only — no markdown, no extra text.',
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 } },
          {
            type: 'text',
            text: `The image above is a business card. Extract the person's contact details.

Rules:
- Use an empty string "" for any field you cannot find on the card. Do not guess or invent values.
- "name" is the person's full name (not the company).
- "title" is their job title / role (e.g. "Product Designer", "VP of Sales").
- "company" is the organization name.
- For email and phone, copy them exactly as printed. Pick the primary one if several are listed.

Return exactly this JSON:
{
  "name": "",
  "title": "",
  "company": "",
  "email": "",
  "phone": ""
}`,
          },
        ],
      }],
    });

    const data = parseJson(response.content[0].text);
    res.json(data);
  } catch (err) {
    console.error('Scan card error:', err);
    res.status(500).json({ error: 'Failed to scan card' });
  }
});

module.exports = router;
