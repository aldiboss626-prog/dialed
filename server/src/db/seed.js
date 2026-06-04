const bcrypt = require('bcryptjs');
const db = require('./database');

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function daysAgoFull(n, hour = 10) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString().replace('T', ' ').replace(/\.\d+Z$/, '');
}

function weeksAgo(n, hour = 10) {
  return daysAgoFull(n * 7, hour);
}

function monthsAgo(n, hour = 10) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString().replace('T', ' ').replace(/\.\d+Z$/, '');
}

function hoursAgoFull(h) {
  const d = new Date(Date.now() - h * 3600000);
  return d.toISOString().replace('T', ' ').replace(/\.\d+Z$/, '');
}

module.exports = function seed() {
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get('alex@miami.edu');
  if (existing) return;

  const hash = bcrypt.hashSync('dialed123', 10);
  const today = new Date().toISOString().split('T')[0];
  const userId = db.prepare(
    'INSERT INTO users (email, password_hash, name, streak_count, last_activity_date) VALUES (?, ?, ?, 3, ?)'
  ).run('alex@miami.edu', hash, 'Alex Lawrence', today).lastInsertRowid;

  // ── Contacts ──────────────────────────────────────────────────────────────

  const insertContact = db.prepare(`
    INSERT INTO contacts (user_id, name, role, relationship_type, email, stars, cadence_days, last_contact_date, notes, gmail_connected)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const marcus = insertContact.run(
    userId, 'Marcus Crandon', 'Senior Credit Analyst', 'Mentor',
    'marcus.crandon@goldmansachs.com', 5, 5, daysAgo(12),
    'Met at UM job fair. Discussing HVAC roll-up research and credit markets.', 1
  ).lastInsertRowid;

  const sarah = insertContact.run(
    userId, 'Dr. Sarah Chen', 'FIN427 Professor', 'Professor',
    'sarah.chen@miami.edu', 4, 10, daysAgo(5),
    'Need rec letter by end of semester. Office hours Tuesdays 2-4pm.', 1
  ).lastInsertRowid;

  const james = insertContact.run(
    userId, 'James Whitfield', 'VP at Goldman Sachs', 'Recruiter',
    'james.whitfield@gs.com', 5, 5, daysAgo(3),
    'Connected at finance networking event. Interested in summer analyst role.', 1
  ).lastInsertRowid;

  const priya = insertContact.run(
    userId, 'Priya Mehta', 'Founder at TechVentures', 'Mentor',
    'priya@techventures.co', 3, 14, daysAgo(21),
    'Intro through UM entrepreneurship program.', 0
  ).lastInsertRowid;

  const tyler = insertContact.run(
    userId, 'Tyler Brooks', 'Senior Analyst at JP Morgan', 'Recruiter',
    'tyler.brooks@jpmorgan.com', 4, 10, daysAgo(1),
    'JP Morgan contact. Spring insight program.', 1
  ).lastInsertRowid;

  // ── Email Threads ──────────────────────────────────────────────────────────

  const insertEmail = db.prepare(`
    INSERT INTO email_threads (contact_id, user_id, subject, sender, recipient, date, preview, body, is_from_user)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Marcus Crandon emails
  insertEmail.run(marcus, userId,
    'HVAC Real Estate — Research Questions from UM Job Fair',
    'Alex Lawrence', 'marcus.crandon@goldmansachs.com',
    monthsAgo(3, 9),
    'Hi Marcus, It was great meeting you at the University of Miami job fair…',
    `Hi Marcus,

It was great meeting you at the University of Miami job fair last Thursday. I've been diving into the HVAC services roll-up thesis you mentioned and had a few questions about how you think about credit risk in fragmented service industries. Would you be open to a quick 15-minute call this week?

Best,
Alex`, 1);

  insertEmail.run(marcus, userId,
    'Re: HVAC Real Estate — Research Questions from UM Job Fair',
    'marcus.crandon@goldmansachs.com', 'alex@miami.edu',
    monthsAgo(3, 14),
    'Alex — glad you reached out. The HVAC thesis is one of my favorite areas right now…',
    `Alex —

Glad you reached out. The HVAC thesis is one of my favorite areas right now. Happy to connect Friday afternoon around 2pm EST if that works. Come prepared with your thoughts on why this sector specifically, and we can dig into the credit side.

Marcus`, 0);

  insertEmail.run(marcus, userId,
    'Credit Market Outlook Q2 2026',
    'marcus.crandon@goldmansachs.com', 'alex@miami.edu',
    weeksAgo(6, 8),
    "Alex — thought you'd find this Goldman research note on CMBS spreads useful…",
    `Alex —

Thought you'd find this Goldman research note on CMBS spreads useful given where we left off. The middle-market credit story is getting interesting with rates where they are. Let me know your take.

Marcus`, 0);

  insertEmail.run(marcus, userId,
    'Re: Credit Market Outlook Q2 2026',
    'Alex Lawrence', 'marcus.crandon@goldmansachs.com',
    weeksAgo(6, 11),
    'Marcus, Thanks for sharing — the section on regional bank pullback really stood out…',
    `Marcus,

Thanks for sharing — the section on regional bank pullback from construction lending really stood out to me. I'm curious whether you think that creates opportunity in the B-note market or if the risk-adjusted returns don't support it yet. Your perspective on credit selection in this environment would be invaluable.

Alex`, 1);

  insertEmail.run(marcus, userId,
    'Goldman Sachs Summer Analyst Application — Guidance Request',
    'Alex Lawrence', 'marcus.crandon@goldmansachs.com',
    daysAgoFull(13, 9),
    "Hi Marcus, I wanted to reach out as I'm moving into the final stages of the GS application…",
    `Hi Marcus,

I wanted to reach out as I'm moving into the final stages of the Goldman Sachs Summer Analyst application process. I'd really value any insight you can share about what the credit team looks for in candidates, particularly around technical preparation and how to frame my research experience.

Any guidance would be incredibly helpful.

Alex`, 1);

  insertEmail.run(marcus, userId,
    'Re: Goldman Sachs Summer Analyst Application — Guidance Request',
    'marcus.crandon@goldmansachs.com', 'alex@miami.edu',
    daysAgoFull(12, 14),
    'Alex — timing is good. The process is rigorous but your background puts you in a strong position…',
    `Alex —

Timing is good. The process is rigorous but your background in credit research puts you in a strong position. Focus on being able to walk through a credit memo from start to finish, and know your LBO mechanics cold. I'll keep an eye out for your application. Reach out if you need a mock interview.

Marcus`, 0);

  // Dr. Sarah Chen emails
  insertEmail.run(sarah, userId,
    'Recommendation Letter Request — Investment Banking Programs',
    'Alex Lawrence', 'sarah.chen@miami.edu',
    weeksAgo(3, 10),
    "Dear Dr. Chen, I hope the end of semester is going smoothly. I'm writing to ask…",
    `Dear Dr. Chen,

I hope the end of semester is going smoothly. I'm writing to ask if you would be willing to write a recommendation letter on my behalf for several investment banking programs. Your FIN427 class significantly shaped how I think about credit analysis and I believe a letter from you would carry real weight. The earliest deadline is June 21st.

Best,
Alex`, 1);

  insertEmail.run(sarah, userId,
    'Re: Recommendation Letter Request — Investment Banking Programs',
    'sarah.chen@miami.edu', 'alex@miami.edu',
    weeksAgo(3, 15),
    "Alex, I'd be happy to write on your behalf. You consistently demonstrated strong analytical thinking…",
    `Alex,

I'd be happy to write on your behalf. You consistently demonstrated strong analytical thinking in my course and your final project was one of the best I've seen in years. Please send me your updated resume, a brief personal statement, and the names of the programs by end of week.

Dr. Chen`, 0);

  insertEmail.run(sarah, userId,
    'Office Hours — Questions on IB Career Path',
    'Alex Lawrence', 'sarah.chen@miami.edu',
    weeksAgo(5, 9),
    "Dr. Chen, I wanted to follow up on our conversation after Tuesday's lecture…",
    `Dr. Chen,

I wanted to follow up on our conversation after Tuesday's lecture about breaking into investment banking from a credit research background. Would it be possible to stop by office hours this Thursday to discuss further? I have some questions about how to position my research experience in interviews.

Alex`, 1);

  insertEmail.run(sarah, userId,
    'Re: Office Hours — Questions on IB Career Path',
    'sarah.chen@miami.edu', 'alex@miami.edu',
    weeksAgo(5, 16),
    "Alex, absolutely — Thursday works perfectly. Bring any application materials you're working on…",
    `Alex,

Absolutely — Thursday works perfectly. I'll have some time after 2:30pm. Bring any application materials you're working on; it helps to have something concrete to discuss. I also have a contact at JP Morgan I can introduce you to if your skills are a match.

Dr. Chen`, 0);

  // James Whitfield emails
  insertEmail.run(james, userId,
    'Follow-Up from UM Finance Networking Event',
    'Alex Lawrence', 'james.whitfield@gs.com',
    monthsAgo(3, 9),
    'Hi James, It was a genuine pleasure speaking with you at the University of Miami networking event…',
    `Hi James,

It was a genuine pleasure speaking with you at the University of Miami networking event last Thursday. I was particularly struck by your perspective on the current deal environment and would love to continue the conversation. Would you be open to a brief coffee chat sometime in the next few weeks?

Best,
Alex`, 1);

  insertEmail.run(james, userId,
    'Re: Follow-Up from UM Finance Networking Event',
    'james.whitfield@gs.com', 'alex@miami.edu',
    monthsAgo(3, 14),
    'Alex — good to hear from you. You impressed me at the event with your question about deal flow…',
    `Alex —

Good to hear from you. You impressed me at the event with your question about deal flow in the current rate environment. Let's do a coffee chat the week of March 25th — my assistant can coordinate. For context, we do have summer analyst openings this year on the TMT side, if that's of interest.

James`, 0);

  insertEmail.run(james, userId,
    'Coffee Chat Recap — Thank You',
    'Alex Lawrence', 'james.whitfield@gs.com',
    weeksAgo(8, 10),
    'James, Thank you so much for the time last week. The conversation about deal structuring…',
    `James,

Thank you so much for the time last week. The conversation about deal structuring in today's macro environment was genuinely eye-opening. Per your suggestion, I've started working through the Goldman modeling prep materials and have been applying a credit lens to everything. Looking forward to staying in touch as the summer analyst application process opens up.

Alex`, 1);

  insertEmail.run(james, userId,
    'Re: Coffee Chat Recap — Thank You',
    'james.whitfield@gs.com', 'alex@miami.edu',
    weeksAgo(8, 15),
    "Alex — you're exactly the kind of candidate we want. Keep that intellectual curiosity sharp…",
    `Alex —

You're exactly the kind of candidate we want. Keep that intellectual curiosity sharp and stay on top of the credit markets coverage. The SA process opens in late May; I'd flag your profile to recruiting if you apply through the official channel. Talk soon.

James`, 0);

  insertEmail.run(james, userId,
    'Summer Analyst Application — Update',
    'Alex Lawrence', 'james.whitfield@gs.com',
    daysAgoFull(13, 9),
    'Hi James, I wanted to let you know I submitted my application for the GS Summer Analyst program…',
    `Hi James,

I wanted to let you know I submitted my application for the Goldman Sachs Summer Analyst program earlier this week. I tried to capture everything we discussed about credit research and the HVAC roll-up work in the application. Any updates from your end?

Alex`, 1);

  insertEmail.run(james, userId,
    'Re: Summer Analyst Application — Update',
    'james.whitfield@gs.com', 'alex@miami.edu',
    daysAgoFull(12, 14),
    'Alex — good timing. I flagged your name to the recruiting team last week…',
    `Alex —

Good timing. I flagged your name to the recruiting team last week. You should expect to hear something in the next 7-10 days. The June deadline is real, so keep your phone on. Strong candidates don't wait for follow-up — reach out to recruiting directly by end of the week if you haven't heard.

James`, 0);

  // Tyler Brooks emails
  insertEmail.run(tyler, userId,
    'JP Morgan Spring Insight Program — Questions',
    'Alex Lawrence', 'tyler.brooks@jpmorgan.com',
    weeksAgo(8, 10),
    'Hi Tyler, I received your contact information through Dr. Chen at the University of Miami…',
    `Hi Tyler,

I received your contact information through Dr. Chen at the University of Miami. I'm a junior finance student with a strong interest in corporate banking and credit, and I'm very interested in learning more about the JP Morgan Spring Insight Program. Would you be willing to share your perspective on what differentiates competitive candidates?

Best,
Alex`, 1);

  insertEmail.run(tyler, userId,
    'Re: JP Morgan Spring Insight Program — Questions',
    'tyler.brooks@jpmorgan.com', 'alex@miami.edu',
    weeksAgo(8, 16),
    "Alex — Dr. Chen speaks highly of her students, so you're starting in a good position…",
    `Alex —

Dr. Chen speaks highly of her students, so you're starting in a good position. The Spring Insight Program is highly selective but very much open to students who can demonstrate both technical rigor and genuine curiosity about banking. Strong candidates know their way around a model and have a point of view on the current credit environment. Happy to help.

Tyler`, 0);

  insertEmail.run(tyler, userId,
    'Spring Insight Application — Progress Update',
    'Alex Lawrence', 'tyler.brooks@jpmorgan.com',
    weeksAgo(3, 10),
    'Tyler, I wanted to keep you in the loop — I submitted my Spring Insight application last week…',
    `Tyler,

I wanted to keep you in the loop — I submitted my Spring Insight application last week and received confirmation it was received. I've been spending significant time preparing for the technical portions based on your guidance. Is there anything specific the team weighs heavily at the interview stage?

Alex`, 1);

  insertEmail.run(tyler, userId,
    'Re: Spring Insight Application — Progress Update',
    'tyler.brooks@jpmorgan.com', 'alex@miami.edu',
    weeksAgo(3, 15),
    'Alex, great to hear the application is in. At the interview stage, the team pays close attention…',
    `Alex,

Great to hear the application is in. At the interview stage, the team pays close attention to how you structure a problem under pressure more than raw technical recall. Practice walking through a credit situation without all the information — that's very JP Morgan. You're well-positioned. I'll put in a good word when the review starts.

Tyler`, 0);

  // ── Interactions ───────────────────────────────────────────────────────────

  const insertInteraction = db.prepare(`
    INSERT INTO interactions (contact_id, user_id, date, note, type) VALUES (?, ?, ?, ?, ?)
  `);

  insertInteraction.run(marcus, userId, daysAgo(12), 'Email exchange about GS application guidance and credit mechanics prep.', 'email');
  insertInteraction.run(marcus, userId, weeksAgo(6, 0), 'Marcus shared credit market research note. Replied with B-note market question.', 'email');
  insertInteraction.run(marcus, userId, monthsAgo(3, 0), 'Initial reach-out after UM job fair. Set up call on HVAC roll-up thesis.', 'email');

  insertInteraction.run(sarah, userId, daysAgo(5), 'Sent resume and personal statement for rec letter request.', 'email');
  insertInteraction.run(sarah, userId, weeksAgo(3, 0), 'Asked for recommendation letter. Dr. Chen agreed.', 'email');
  insertInteraction.run(sarah, userId, weeksAgo(5, 0), 'Office hours — discussed IB career path and application positioning.', 'meeting');

  insertInteraction.run(james, userId, daysAgo(3), 'Email update on GS application. James flagged name to recruiting.', 'email');
  insertInteraction.run(james, userId, weeksAgo(8, 0), 'Sent thank-you email after coffee chat.', 'email');
  insertInteraction.run(james, userId, monthsAgo(3, 0), 'Initial follow-up email after UM networking event.', 'email');

  insertInteraction.run(priya, userId, daysAgo(21), 'Brief catch-up on UM entrepreneurship program. Discussed startup landscape.', 'message');

  insertInteraction.run(tyler, userId, daysAgo(1), 'Tyler confirmed application is in strong position. Will advocate at review.', 'email');
  insertInteraction.run(tyler, userId, weeksAgo(3, 0), 'Sent application progress update. Asked about interview stage priorities.', 'email');

  // ── Opportunities ──────────────────────────────────────────────────────────

  const insertOpp = db.prepare(`
    INSERT INTO opportunities (user_id, contact_id, title, status, deadline, notes) VALUES (?, ?, ?, ?, ?, ?)
  `);

  const gsOpp = insertOpp.run(
    userId, james,
    'Goldman Sachs Summer Analyst',
    'Active', daysFromNow(3),
    'Final round application in review. James flagged name to recruiting.'
  ).lastInsertRowid;

  const jpmOpp = insertOpp.run(
    userId, tyler,
    'JP Morgan Spring Insight',
    'Waiting', daysFromNow(14),
    'Application submitted. Tyler will advocate during review process.'
  ).lastInsertRowid;

  insertOpp.run(
    userId, sarah,
    'Professor Chen Rec Letter',
    'Active', daysFromNow(18),
    'Rec letter for IB programs. Resume and personal statement sent.'
  );

  insertOpp.run(
    userId, null,
    'Blackstone Networking Event',
    'Missed', daysAgo(5),
    'Annual networking event. Missed the registration window.'
  );

  // ── Notifications ──────────────────────────────────────────────────────────

  const insertNotif = db.prepare(`
    INSERT INTO notifications (user_id, contact_id, opportunity_id, type, title, body, is_read)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertNotif.run(
    userId, marcus, gsOpp, 'urgent',
    'Marcus Crandon is 12 days overdue',
    'Goldman Sachs deadline in 3 days. Marcus is your strongest GS connection. Reach out now.',
    0
  );

  insertNotif.run(
    userId, james, gsOpp, 'deadline',
    'Goldman Sachs deadline in 3 days',
    'Follow up with James Whitfield today. He flagged your profile to recruiting — confirm next steps.',
    0
  );

  insertNotif.run(
    userId, sarah, null, 'cadence',
    'Dr. Chen is due for a check-in',
    'Rec letter deadline in 18 days. Confirm she has everything she needs to submit on time.',
    0
  );

  insertNotif.run(
    userId, tyler, jpmOpp, 'positive',
    'You talked to Tyler Brooks yesterday',
    'JP Morgan application on track. Tyler will advocate during the review process starting next week.',
    0
  );

  // ── 30-day historical interactions (for Tracker heatmap + top relationships) ──
  // Spread across 13 additional active days; existing seeded days: 1,3,5,12,21
  const histBatch = [
    [4,  marcus, 'Reviewed HVAC industry comps and valuation multiples', 'email'],
    [7,  sarah,  'Discussed IB recruiting timeline and target firms', 'meeting'],
    [7,  marcus, 'Called — credit spread analysis follow-up', 'call'],
    [8,  tyler,  'Shared JP Morgan structured finance research note', 'email'],
    [10, marcus, 'Sent updated HVAC credit model draft', 'email'],
    [10, james,  'Email: confirmed coffee chat logistics', 'email'],
    [14, james,  'Pre-meeting research — GS deals in TMT', 'email'],
    [14, marcus, 'Model review session (virtual)', 'meeting'],
    [16, sarah,  'Sent transcript and GPA for rec letter packet', 'email'],
    [17, marcus, 'Macro discussion — impact of Fed policy on credit', 'call'],
    [19, james,  'LinkedIn message: networking event follow-through', 'message'],
    [22, tyler,  'Spring Insight program details email exchange', 'email'],
    [24, sarah,  'Office hours check-in: project scope alignment', 'meeting'],
    [26, marcus, 'Sent article on CMBS market outlook', 'email'],
    [27, james,  'Research: GS analyst program first-year structure', 'email'],
    [28, tyler,  'Brief message about spring recruiting timeline', 'message'],
    [28, sarah,  'Shared career fair contact sheet', 'email'],
  ];

  const insertHistorical = db.prepare(
    'INSERT INTO interactions (contact_id, user_id, date, note, type) VALUES (?, ?, ?, ?, ?)'
  );

  const contactMap = { marcus, sarah, james, priya, tyler };
  for (const [daysAgoN, contactId, note, type] of histBatch) {
    insertHistorical.run(contactId, userId, daysAgo(daysAgoN), note, type);
  }

  // ── Awaiting Response mock data ────────────────────────────────────────────
  // Marcus replied 14 hours ago — Alex hasn't responded yet

  const marcusReplyId = insertEmail.run(marcus, userId,
    'Re: Goldman Sachs Summer Analyst — Interview Prep Resources',
    'marcus.crandon@goldmansachs.com', 'alex@miami.edu',
    hoursAgoFull(14),
    "Alex — I flagged your profile internally and the feedback was positive. Can you send over your HVAC credit analysis before end of week?",
    `Alex —

Quick update: I flagged your profile internally and the feedback was positive. One of the senior analysts mentioned they'd like to see your HVAC credit analysis if you have it polished. Can you send it over before end of week? Also happy to share a few technical prep resources that helped candidates in past cycles — just let me know.

Marcus`,
    0
  ).lastInsertRowid;

  // Mark that email as requiring response
  db.prepare('UPDATE email_threads SET requires_response = 1 WHERE id = ?').run(marcusReplyId);

  // Create the pending_responses record — 14h ago, 2 notifications already sent
  db.prepare(`
    INSERT INTO pending_responses
      (user_id, contact_id, email_thread_id, detected_at, stars_at_detection, last_notified_at, notification_count, status)
    VALUES (?, ?, ?, ?, 5, ?, 2, 'pending')
  `).run(userId, marcus, marcusReplyId, hoursAgoFull(14), hoursAgoFull(6));

  // awaiting_reply notification
  insertNotif.run(
    userId, marcus, null, 'awaiting_reply',
    'Marcus Crandon is waiting for your reply',
    "Replied to 'Goldman Sachs Summer Analyst — Interview Prep Resources' 14 hours ago. Don't let this one slip.",
    0
  );

  console.log('Seed data inserted for alex@miami.edu');
};
