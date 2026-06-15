// dialed2-network.jsx — Network pane: warm, personal health hero + reminder cards.

function useCount(target, ms = 900) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let i = 0; const steps = 26; const ease = (x) => 1 - Math.pow(1 - x, 3);
    const id = setInterval(() => {
      i++; const p = Math.min(1, i / steps); setV(Math.round(ease(p) * target));
      if (p >= 1) clearInterval(id);
    }, ms / steps);
    return () => clearInterval(id);
  }, [target]);
  return v;
}

function SectionLabel({ children, inline }) {
  return <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11.5, letterSpacing: 0.9, textTransform: 'uppercase', color: C.ink3, padding: inline ? 0 : '2px 2px 10px' }}>{children}</div>;
}

// ── Health hero — warm dark card, big number, personal narrative ─────────────
function HealthHero({ contacts, waiting, onGoInbox }) {
  const score = healthScore(contacts);
  const v = useCount(score);
  const need = contacts.filter((c) => c.status !== 'good').length;
  const cold = contacts.filter((c) => c.status === 'overdue').length;
  const col = score >= 85 ? C.success : score >= 65 ? C.accent : score >= 40 ? C.warning : C.overdue;

  const headline = need === 0
    ? "Everyone's warm — nice work."
    : cold > 0
    ? `${cold} ${cold === 1 ? 'person is' : 'people are'} going cold`
    : `${need} ${need === 1 ? 'person' : 'people'} need a touch`;

  const sub = need === 0
    ? 'Everyone in your circle is feeling the love right now.'
    : cold > 0
    ? "Don't let them slip — a quick message goes a long way."
    : 'A check-in now keeps the relationship warm.';

  return (
    <div style={{ background: 'linear-gradient(155deg, #1E1810, #14100A)', borderRadius: 22, padding: '20px 20px 18px', color: '#fff', position: 'relative', overflow: 'hidden', flexShrink: 0, boxShadow: '0 12px 32px rgba(28,17,8,0.22)' }}>
      {/* warm ambient glow */}
      <div style={{ position: 'absolute', top: -36, right: -28, width: 160, height: 160, borderRadius: '50%', background: hexA(col, 0.3), filter: 'blur(40px)', pointerEvents: 'none' }} />
      <div style={{ position: 'relative' }}>
        <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: hexA('#fff', 0.5), marginBottom: 12 }}>Network health</div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          {/* big animated score */}
          <div style={{ flexShrink: 0 }}>
            <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 66, lineHeight: 1, color: '#fff', letterSpacing: -2 }}>{v}</div>
            <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 10.5, letterSpacing: 1.4, textTransform: 'uppercase', color: col, marginTop: 3 }}>{scoreLabel(score)}</div>
          </div>
          <div style={{ flex: 1, minWidth: 0, paddingTop: 8 }}>
            <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 18, lineHeight: 1.25, color: '#fff' }}>{headline}</div>
            <div style={{ fontFamily: FONT, fontSize: 13, lineHeight: 1.5, color: hexA('#fff', 0.6), marginTop: 6 }}>{sub}</div>
          </div>
        </div>
        {/* progress bar */}
        <div style={{ marginTop: 16, height: 4, borderRadius: 99, background: hexA('#fff', 0.1), overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 99, background: `linear-gradient(90deg, ${col}, ${hexA(col, 0.65)})`, width: `${score}%`, transition: 'width 1.1s cubic-bezier(.2,.8,.2,1)' }} />
        </div>
        {waiting > 0 &&
          <button onClick={onGoInbox} style={{ marginTop: 14, width: '100%', height: 44, borderRadius: 12, border: 'none', cursor: 'pointer', background: hexA('#fff', 0.1), color: '#fff', fontFamily: FONT, fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
            <Icon name="mail" size={16} color="#fff" />{waiting} waiting on your reply<Icon name="chevR" size={15} color={hexA('#fff', 0.6)} />
          </button>
        }
      </div>
    </div>
  );
}

// ── Reminder card — conversational, warm ─────────────────────────────────────
function ReminderCard({ c, onReachedOut, onCompose, onOpen }) {
  const col = bandColor(c.status);
  const daysMsg = c.daysSince === 0
    ? 'Just talked'
    : c.daysSince === 1
    ? 'Talked yesterday'
    : `Haven't talked in ${c.daysSince} days`;

  return (
    <Card style={{ padding: 16 }}>
      <div onClick={() => onOpen && onOpen(c.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
        <Avatar name={c.name} type={c.type} size={48} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 16, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
          <div style={{ fontFamily: FONT, fontSize: 13, color: C.ink2, marginTop: 2 }}>{daysMsg} · every {c.cadence}d</div>
        </div>
        <span style={{ flexShrink: 0, padding: '5px 11px', borderRadius: 99, background: hexA(col, 0.1), fontFamily: FONT, fontWeight: 700, fontSize: 11.5, color: col }}>{bandLabel(c.status)}</span>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button onClick={() => onCompose(c)} style={{ flex: 1, height: 42, borderRadius: 12, border: `1.5px solid ${C.border}`, background: 'transparent', cursor: 'pointer', fontFamily: FONT, fontWeight: 600, fontSize: 14, color: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Icon name="sparkle" size={15} color={C.accent} fill />Draft a note
        </button>
        <button onClick={() => onReachedOut(c.id)} style={{ flex: 1, height: 42, borderRadius: 12, border: 'none', background: C.ink, cursor: 'pointer', fontFamily: FONT, fontWeight: 700, fontSize: 14, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Icon name="check" size={15} color="#fff" sw={2.6} />We talked
        </button>
      </div>
    </Card>
  );
}

function NetworkPane({ contacts, waiting, onReachedOut, onCompose, onOpenContact, onGoInbox }) {
  const favs = contacts.filter((c) => c.fav);
  const need = contacts.filter((c) => c.status !== 'good');
  const onTrack = contacts.filter((c) => c.status === 'good');

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '4px 18px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* personal greeting */}
      <div style={{ flexShrink: 0, padding: '2px 2px 0' }}>
        <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 22, color: C.ink, letterSpacing: -0.3 }}>{greeting}, Alex.</div>
        <div style={{ fontFamily: FONT, fontSize: 13.5, color: C.ink2, marginTop: 2 }}>Here's who needs you today.</div>
      </div>

      <HealthHero contacts={contacts} waiting={waiting} onGoInbox={onGoInbox} />

      {/* starred */}
      {favs.length > 0 &&
        <div style={{ flexShrink: 0 }}>
          <SectionLabel>Starred</SectionLabel>
          <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 2 }}>
            {favs.map((c) =>
              <button key={c.id} onClick={() => onOpenContact(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0, width: 60 }}>
                <div style={{ position: 'relative' }}>
                  <Avatar name={c.name} type={c.type} size={54} />
                  {c.status !== 'good' && <span style={{ position: 'absolute', top: 0, right: 0, width: 14, height: 14, borderRadius: '50%', background: bandColor(c.status), border: `2px solid ${C.bg}` }} />}
                </div>
                <span style={{ fontFamily: FONT, fontSize: 11.5, fontWeight: 500, color: C.ink2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 60 }}>{c.name.split(' ')[0]}</span>
              </button>
            )}
          </div>
        </div>
      }

      {/* needs attention */}
      <div style={{ flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 2px 12px' }}>
          <SectionLabel inline>Needs attention</SectionLabel>
          {need.length > 0 && <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11.5, color: '#fff', background: C.overdue, padding: '2px 8px', borderRadius: 99 }}>{need.length}</span>}
        </div>
        {need.length === 0
          ? <Card style={{ padding: '24px 20px', display: 'flex', alignItems: 'center', gap: 13 }}>
              <div style={{ width: 42, height: 42, borderRadius: '50%', background: hexA(C.success, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name="check" size={22} color={C.success} sw={2.4} /></div>
              <div>
                <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 15.5, color: C.ink }}>Everyone's warm</div>
                <div style={{ fontFamily: FONT, fontSize: 13, color: C.ink2, marginTop: 1 }}>No one's going cold today.</div>
              </div>
            </Card>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {need.map((c) => <ReminderCard key={c.id} c={c} onReachedOut={onReachedOut} onCompose={onCompose} onOpen={onOpenContact} />)}
            </div>
        }
      </div>

      {/* in good shape */}
      {onTrack.length > 0 &&
        <div style={{ flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 2px 12px' }}>
            <SectionLabel inline>In good shape</SectionLabel>
            <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 12, color: C.ink3 }}>{onTrack.length}</span>
          </div>
          <Card style={{ padding: '4px 0' }}>
            {onTrack.map((c, i) =>
              <button key={c.id} onClick={() => onOpenContact(c.id)} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderTop: i === 0 ? 'none' : `1px solid ${C.border}`, textAlign: 'left' }}>
                <Avatar name={c.name} type={c.type} size={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: FONT, fontWeight: 600, fontSize: 14.5, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                  <div style={{ fontFamily: FONT, fontSize: 12.5, color: C.ink2, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.title ? `${c.title}${c.company ? ` · ${c.company}` : ''}` : c.type}</div>
                </div>
                <span style={{ fontFamily: FONT, fontSize: 12, color: C.ink3, flexShrink: 0 }}>{c.daysSince === 0 ? 'Just now' : `${c.daysSince}d`}</span>
              </button>
            )}
          </Card>
        </div>
      }
    </div>
  );
}

Object.assign(window, { NetworkPane, ReminderCard, HealthHero, SectionLabel, useCount });
