// dialed2-inbox.jsx — Inbox pane (emails waiting on you) + the Compose / reply
// overlay with AI-draft tone chips. Sending an email logs the reply and resets
// the contact's reminder — the loop that ties Inbox back to Network.

function EmailRow({ e, c, onOpen }) {
  const p = emailPriority(c, e);
  return (
    <Card onClick={() => onOpen(e)} style={{ padding: 14, cursor: 'pointer', flexShrink: 0 }}>
      <div style={{ display: 'flex', gap: 12 }}>
        <Avatar name={c ? c.name : '?'} type={c ? c.type : 'Friend'} size={46} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ flex: 1, fontFamily: FONT, fontWeight: 700, fontSize: 15, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c ? c.name : 'Unknown'}</span>
            <span style={{ fontFamily: FONT, fontSize: 12, color: C.ink3, flexShrink: 0 }}>{e.days}d</span>
          </div>
          <div style={{ fontFamily: FONT, fontWeight: 600, fontSize: 14, color: C.ink, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.subject}</div>
          <div style={{ fontFamily: FONT, fontSize: 13, color: C.ink2, marginTop: 2, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{e.snippet}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 9 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: FONT, fontWeight: 600, fontSize: 11.5, color: p.color }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: p.color }} />{p.label} priority
            </span>
            {c && <span style={{ fontFamily: FONT, fontSize: 11.5, color: C.ink3 }}>· {c.type}</span>}
          </div>
        </div>
      </div>
    </Card>
  );
}

function InboxPane({ contacts, emails, handledToday, onOpen }) {
  const byId = (id) => contacts.find(c => c.id === id);
  const rank = { high: 0, med: 1, low: 2 };
  const list = [...emails].sort((a, b) => {
    const pa = emailPriority(byId(a.contactId), a), pb = emailPriority(byId(b.contactId), b);
    return rank[pa.key] - rank[pb.key] || b.days - a.days;
  });
  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '4px 18px 28px', display: 'flex', flexDirection: 'column', gap: 13 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 2px 0', flexShrink: 0 }}>
        <SectionLabel inline>Waiting on you</SectionLabel>
        {handledToday > 0 && <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 12, color: C.success, background: hexA(C.success, 0.12), padding: '4px 10px', borderRadius: 99 }}>{handledToday} done today</span>}
      </div>
      {list.length === 0 ? (
        <Card style={{ padding: '48px 24px', textAlign: 'center', marginTop: 6, flexShrink: 0 }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: hexA(C.success, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}><Icon name="check" size={30} color={C.success} sw={2.4} /></div>
          <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 18, color: C.ink }}>Inbox zero</div>
          <div style={{ fontFamily: FONT, fontSize: 14, color: C.ink2, marginTop: 5, lineHeight: 1.5, maxWidth: 240, marginInline: 'auto' }}>You’ve replied to everyone who needs you. Your network thanks you.</div>
        </Card>
      ) : list.map(e => <EmailRow key={e.id} e={e} c={byId(e.contactId)} onOpen={onOpen} />)}
    </div>
  );
}

// ── Compose / reply overlay — the gist-based co-writer ────────
// Honest about its limits: Dialed only knows the subject, so it asks YOU for
// the gist of your reply, then shapes it into a polished, editable email.
function ComposeView({ contact, email, onClose, onSend }) {
  const first = contact ? contact.name.split(' ')[0] : 'there';
  const isReply = !!email;
  const intents = isReply ? REPLY_INTENTS : REACHOUT_INTENTS;
  const [stage, setStage] = useState('write');   // 'write' | 'draft'
  const [gist, setGist] = useState('');
  const [tone, setTone] = useState('warm');
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);
  const gistRef = useRef(null);

  const seedIntent = (t) => {
    setGist((g) => g.trim() ? (g.trim() + ' ' + t) : t);
    if (gistRef.current) gistRef.current.focus();
  };
  const generate = (nextTone) => {
    const tn = nextTone || tone;
    setText(composeFromGist(contact, gist, tn, isReply));
    setStage('draft');
  };
  const reTone = (t) => { setTone(t); setText(composeFromGist(contact, gist, t, isReply)); };
  const send = () => { setSent(true); setTimeout(onSend, 900); };

  const toneRow = (onPick, current) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 12.5, color: C.ink2 }}>Tone</span>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {TONES.map((t) => (
          <button key={t.key} onClick={() => onPick(t.key)} style={{ height: 32, padding: '0 13px', borderRadius: 99, cursor: 'pointer', fontFamily: FONT, fontWeight: 600, fontSize: 12.5, border: current === t.key ? 'none' : `1px solid ${C.border}`, background: current === t.key ? C.ink : C.surface, color: current === t.key ? '#fff' : C.ink2, transition: 'all .15s' }}>{t.label}</button>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 60, background: C.bg, display: 'flex', flexDirection: 'column', animation: 'dl-slide-in .3s cubic-bezier(.25,.9,.25,1)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px 10px' }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', lineHeight: 0 }}><Icon name="close" size={24} color={C.ink} /></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: FONT, fontSize: 12, color: C.ink3 }}>{isReply ? 'Reply to' : 'New message to'}</div>
          <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 16, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{contact ? contact.name : 'Someone'}</div>
        </div>
        <Avatar name={contact ? contact.name : '?'} type={contact ? contact.type : 'Friend'} size={36} ring={false} />
      </div>

      {/* ── STAGE 1: tell Dialed the gist ── */}
      {stage === 'write' && (
        <React.Fragment>
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 18px 16px' }}>
            {/* what Dialed actually knows */}
            {isReply ? (
              <Card style={{ padding: 0, marginBottom: 18, overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', color: C.ink3, marginBottom: 6 }}>Subject</div>
                  <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 15.5, color: C.ink, lineHeight: 1.3 }}>{email.subject}</div>
                  <div style={{ fontFamily: FONT, fontSize: 12, color: C.ink3, marginTop: 3 }}>{contact ? contact.name : first} · {email.days}d ago</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '11px 16px', borderTop: `1px solid ${C.border}`, background: C.elevated }}>
                  <Icon name="lock" size={15} color={C.ink3} sw={1.8} />
                  <span style={{ flex: 1, fontFamily: FONT, fontSize: 12.5, color: C.ink2, lineHeight: 1.4 }}>Dialed only sees the subject — not the message itself.</span>
                  <button style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', fontFamily: FONT, fontWeight: 700, fontSize: 12.5, color: C.accent, padding: 0, whiteSpace: 'nowrap' }}>Open in Mail<Icon name="arrowUpRight" size={13} color={C.accent} sw={2.2} /></button>
                </div>
              </Card>
            ) : (
              <Card style={{ padding: '13px 16px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10, background: C.elevated }}>
                <Icon name="sparkle" size={17} color={C.accent} fill />
                <span style={{ fontFamily: FONT, fontSize: 13, color: C.ink2, lineHeight: 1.4 }}>Reaching back out to {first} before they go cold. What’s on your mind?</span>
              </Card>
            )}

            <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 17, color: C.ink, marginBottom: 4 }}>{isReply ? 'What do you want to say back?' : 'What do you want to say?'}</div>
            <div style={{ fontFamily: FONT, fontSize: 13, color: C.ink2, lineHeight: 1.45, marginBottom: 13 }}>Jot the gist in your own words — bullet points are fine. Dialed will shape it into a polished {isReply ? 'reply' : 'note'}.</div>

            {/* quick-start intents */}
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 12, marginInline: -2, paddingInline: 2 }}>
              {intents.map((it) => (
                <button key={it.label} onClick={() => seedIntent(it.text)} style={{ flexShrink: 0, height: 34, padding: '0 13px', borderRadius: 99, cursor: 'pointer', fontFamily: FONT, fontWeight: 600, fontSize: 13, border: `1px solid ${hexA(C.accent, 0.35)}`, background: hexA(C.accent, 0.07), color: C.accent, display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
                  <Icon name="plus" size={13} color={C.accent} sw={2.4} />{it.label}
                </button>
              ))}
            </div>

            <Card style={{ padding: 0, border: `1px solid ${C.border}` }}>
              <textarea ref={gistRef} value={gist} onChange={(e) => setGist(e.target.value)} rows={5}
                placeholder={isReply ? 'e.g. Yes, I’ll send the brag sheet by Friday. Thanks for offering to write it!' : 'e.g. Been thinking about you — want to grab coffee when you’re next in town.'}
                style={{ width: '100%', border: 'none', outline: 'none', background: 'none', resize: 'none', fontFamily: FONT, fontSize: 15, color: C.ink, lineHeight: 1.55, padding: 15 }} />
            </Card>

            <div style={{ marginTop: 16 }}>{toneRow(setTone, tone)}</div>
          </div>

          <div style={{ padding: '12px 18px 28px', borderTop: `1px solid ${C.border}`, background: C.bg }}>
            <button disabled={!gist.trim()} onClick={() => generate()} style={{ width: '100%', height: 54, borderRadius: 16, border: 'none', cursor: gist.trim() ? 'pointer' : 'default', background: gist.trim() ? C.accent : C.border, color: gist.trim() ? '#fff' : C.ink3, fontFamily: FONT, fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: gist.trim() ? '0 8px 22px rgba(37,99,235,0.28)' : 'none' }}>
              <Icon name="sparkle" size={18} color={gist.trim() ? '#fff' : C.ink3} fill={!!gist.trim()} />Draft my {isReply ? 'reply' : 'note'}
            </button>
          </div>
        </React.Fragment>
      )}

      {/* ── STAGE 2: edit the shaped draft ── */}
      {stage === 'draft' && (
        <React.Fragment>
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 18px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 }}>
              <button onClick={() => setStage('write')} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', fontFamily: FONT, fontWeight: 600, fontSize: 13.5, color: C.ink2, padding: 0 }}><Icon name="chevL" size={16} color={C.ink2} sw={2.2} />Edit the gist</button>
              <button onClick={() => generate()} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: hexA(C.accent, 0.08), border: 'none', borderRadius: 99, padding: '6px 12px', cursor: 'pointer', fontFamily: FONT, fontWeight: 700, fontSize: 12.5, color: C.accent }}><Icon name="rotate" size={14} color={C.accent} sw={2} />Redo</button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 9 }}>
              <Icon name="sparkle" size={16} color={C.accent} fill />
              <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 13, color: C.ink, letterSpacing: 0.2 }}>Your draft</span>
              <span style={{ fontFamily: FONT, fontSize: 12, color: C.ink3 }}>· shaped from your gist, edit freely</span>
            </div>

            <Card style={{ padding: 0, border: `1px solid ${hexA(C.accent, 0.32)}` }}>
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={11} style={{ width: '100%', border: 'none', outline: 'none', background: 'none', resize: 'none', fontFamily: FONT, fontSize: 15, color: C.ink, lineHeight: 1.6, padding: 16 }} />
            </Card>

            <div style={{ marginTop: 14 }}>{toneRow(reTone, tone)}</div>

            <div style={{ display: 'flex', gap: 7, alignItems: 'flex-start', fontFamily: FONT, fontSize: 12.5, color: C.ink3, padding: '14px 4px 0', lineHeight: 1.45 }}>
              <Icon name="rotate" size={14} color={C.ink3} sw={1.8} style={{ marginTop: 1, flexShrink: 0 }} />
              <span>Sending logs your reply and resets {first}’s reminder — keeping them from going cold.</span>
            </div>
          </div>

          <div style={{ padding: '12px 18px 28px', borderTop: `1px solid ${C.border}`, background: C.bg }}>
            <button disabled={!text.trim()} onClick={send} style={{ width: '100%', height: 54, borderRadius: 16, border: 'none', cursor: text.trim() ? 'pointer' : 'default', background: text.trim() ? C.accent : C.border, color: text.trim() ? '#fff' : C.ink3, fontFamily: FONT, fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: text.trim() ? '0 8px 22px rgba(37,99,235,0.28)' : 'none' }}>
              <Icon name="send" size={18} color={text.trim() ? '#fff' : C.ink3} />Send &amp; log
            </button>
          </div>
        </React.Fragment>
      )}

      {sent && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 5, background: hexA(C.bg, 0.94), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, animation: 'dl-fade .2s ease' }}>
          <div style={{ width: 74, height: 74, borderRadius: '50%', background: C.success, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'dl-checkpop .5s ease-out' }}><Icon name="check" size={38} color="#fff" sw={3} /></div>
          <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 18, color: C.ink }}>Sent &amp; logged</div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { InboxPane, EmailRow, ComposeView });
