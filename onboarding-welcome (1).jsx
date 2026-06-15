// onboarding-welcome.jsx — Cal-AI-style intro: a phone mockup "playing" the
// dialed2 app (auto-cycling Network ↔ Inbox), with a big quoted "dialed"
// wordmark headline. Light, on the cool colorway.

// ── mini Network pane (inside the phone) ──────────────────────────────────
function NetMini({ accent }) {
  const rows = [
    { name: 'Maya Patel', type: 'Mentor', days: 9, status: 'due-soon' },
    { name: 'Daniel Cho', type: 'Recruiter', days: 12, status: 'overdue' },
    { name: 'Aisha Khan', type: 'Mentor', days: 4, status: 'good' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '2px 10px 10px' }}>
      {/* health hero */}
      <div style={{ background: 'linear-gradient(155deg, #18233C, #0D1526)', borderRadius: 14, padding: '11px 12px', color: '#fff', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -22, right: -16, width: 70, height: 70, borderRadius: '50%', background: hexA(C.success, 0.22) }} />
        <div style={{ position: 'relative' }}>
          <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 8, letterSpacing: 1, textTransform: 'uppercase', color: hexA('#fff', 0.6) }}>Network health</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 3 }}>
            <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: 30, lineHeight: 1 }}>86</span>
            <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 10, color: C.success }}>Strong</span>
          </div>
          <div style={{ height: 5, borderRadius: 99, background: hexA('#fff', 0.16), marginTop: 7, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: '86%', borderRadius: 99, background: `linear-gradient(90deg, ${accent}, ${C.success})` }} />
          </div>
        </div>
      </div>
      {/* reminders */}
      {rows.map((r, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, background: C.surface, borderRadius: 12, border: `1px solid ${C.hair}`, padding: '8px 9px', boxShadow: '0 2px 8px rgba(13,21,38,0.04)' }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: hexA(CAT[r.type] || accent, 0.14), display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontWeight: 700, fontSize: 10, color: CAT[r.type] || accent }}>{initialsOf(r.name)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: FONT, fontWeight: 600, fontSize: 11.5, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</div>
            <div style={{ fontFamily: FONT, fontSize: 9.5, color: C.ink2, marginTop: 1 }}>{r.days}d ago · every {r.status === 'overdue' ? 10 : 14}d</div>
          </div>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: bandColor(r.status), flexShrink: 0 }} />
        </div>
      ))}
    </div>
  );
}

// ── mini Inbox pane (inside the phone) ────────────────────────────────────
function InboxMini({ accent }) {
  const mails = [
    { name: 'Priya Nair', subject: 'Seed intro — send the deck?', pri: C.overdue },
    { name: 'Maya Patel', subject: 'Portfolio review this month?', pri: C.warning },
    { name: 'Aisha Khan', subject: 'Fundraising playbook + intro', pri: C.ink3 },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '2px 10px 10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 2px 0' }}>
        <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: C.ink }}>Waiting on you</span>
        <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 9, color: '#fff', background: C.overdue, padding: '2px 7px', borderRadius: 99 }}>3 new</span>
      </div>
      {mails.map((m, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, background: C.surface, borderRadius: 12, border: `1px solid ${C.hair}`, padding: '9px 9px', boxShadow: '0 2px 8px rgba(13,21,38,0.04)' }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: hexA(hashColor(m.name), 0.16), display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontWeight: 700, fontSize: 10, color: hashColor(m.name) }}>{initialsOf(m.name)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: FONT, fontWeight: 600, fontSize: 11.5, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</div>
            <div style={{ fontFamily: FONT, fontSize: 9.5, color: C.ink2, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.subject}</div>
          </div>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: m.pri, flexShrink: 0 }} />
        </div>
      ))}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 30, borderRadius: 10, background: hexA(accent, 0.1), marginTop: 1 }}>
        <Icon name="sparkle" size={13} color={accent} sw={1.9} fill />
        <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 10.5, color: accent }}>Draft replies with AI</span>
      </div>
    </div>
  );
}

// ── the phone mockup that "plays" the app ─────────────────────────────────
function PhoneDemo({ accent }) {
  const [view, setView] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setView(v => (v + 1) % 2), 3000);
    return () => clearInterval(id);
  }, []);
  const tabs = ['Network', 'Inbox'];
  return (
    <div style={{ position: 'relative', animation: 'onb-float 6s ease-in-out infinite' }}>
      {/* glow */}
      <div style={{ position: 'absolute', inset: -28, borderRadius: '50%', background: `radial-gradient(circle, ${hexA(accent, 0.28)}, transparent 68%)`, filter: 'blur(6px)' }} />
      {/* device */}
      <div style={{ position: 'relative', width: 192, height: 366, borderRadius: 34, background: '#0B1322', padding: 7, boxShadow: '0 30px 60px rgba(13,21,38,0.34), 0 0 0 1px rgba(13,21,38,0.4)' }}>
        <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 27, overflow: 'hidden', background: C.bg, display: 'flex', flexDirection: 'column' }}>
          {/* status + notch */}
          <div style={{ position: 'relative', height: 22, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px' }}>
            <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 9, color: C.ink }}>9:41</span>
            <div style={{ position: 'absolute', top: 5, left: '50%', transform: 'translateX(-50%)', width: 46, height: 14, borderRadius: 10, background: '#0B1322' }} />
            <div style={{ display: 'flex', gap: 3 }}>
              <span style={{ width: 13, height: 7, borderRadius: 2, background: C.ink, opacity: 0.85 }} />
            </div>
          </div>
          {/* app header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 11px 4px', flexShrink: 0 }}>
            <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 13, letterSpacing: 0.6 }}>
              <span style={{ color: C.ink }}>DI</span><span style={{ color: accent }}>AL</span><span style={{ color: C.ink }}>ED</span>
            </div>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: hexA(accent, 0.14), display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontWeight: 700, fontSize: 9, color: accent }}>AK</div>
          </div>
          {/* segmented */}
          <div style={{ padding: '0 11px 6px', flexShrink: 0 }}>
            <div style={{ position: 'relative', display: 'flex', background: C.elevated, borderRadius: 9, padding: 3 }}>
              <div style={{ position: 'absolute', top: 3, bottom: 3, width: 'calc(50% - 5px)', left: view === 0 ? 3 : 'calc(50% + 2px)', background: C.surface, borderRadius: 7, boxShadow: '0 1px 3px rgba(13,21,38,0.12)', transition: 'left .4s cubic-bezier(.5,1.2,.5,1)' }} />
              {tabs.map((t, i) => (
                <div key={t} style={{ position: 'relative', zIndex: 1, flex: 1, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontFamily: FONT, fontWeight: 600, fontSize: 10.5, color: view === i ? C.ink : C.ink2, transition: 'color .2s' }}>
                  {t}
                  {t === 'Inbox' && <span style={{ minWidth: 13, height: 13, padding: '0 3px', borderRadius: 99, background: C.overdue, color: '#fff', fontSize: 8, fontWeight: 700, lineHeight: '13px' }}>3</span>}
                </div>
              ))}
            </div>
          </div>
          {/* cycling content */}
          <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
            <div style={{ position: 'absolute', inset: 0, opacity: view === 0 ? 1 : 0, transition: 'opacity .5s ease', pointerEvents: 'none' }}><NetMini accent={accent} /></div>
            <div style={{ position: 'absolute', inset: 0, opacity: view === 1 ? 1 : 0, transition: 'opacity .5s ease', pointerEvents: 'none' }}><InboxMini accent={accent} /></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Welcome / Get started ─────────────────────────────────────────────────
function WelcomeScreen({ accent, onStart }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #F6F8FF 0%, #E6ECFA 100%)', paddingTop: 58, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Aurora accent={accent} />

      {/* phone demo */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0, position: 'relative', zIndex: 1, paddingTop: 6 }}>
        <PhoneDemo accent={accent} />
      </div>

      {/* big quoted wordmark + CTA */}
      <div style={{ position: 'relative', zIndex: 1, padding: '0 30px 28px', textAlign: 'center' }}>
        <Reveal delay={120}>
          <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, letterSpacing: 2.2, textTransform: 'uppercase', color: accent, marginBottom: 8 }}>Your relationships, on track</div>
        </Reveal>
        <Reveal delay={200}>
          <h1 style={{ margin: 0, fontFamily: FONT, fontWeight: 800, fontSize: 44, lineHeight: 1, letterSpacing: -1.5, color: C.ink }}>
            <span style={{ color: C.ink3, fontWeight: 700 }}>“</span><span style={{ color: C.ink }}>di</span><span style={{ color: accent }}>al</span><span style={{ color: C.ink }}>ed</span><span style={{ color: C.ink }}>.</span><span style={{ color: C.ink3, fontWeight: 700 }}>”</span>
          </h1>
        </Reveal>
        <Reveal delay={290}>
          <p style={{ margin: '12px auto 24px', maxWidth: 300, fontFamily: FONT, fontSize: 15, lineHeight: 1.45, color: C.ink2, textWrap: 'pretty' }}>
            The relationship app that actually keeps up — so no one who matters slips away.
          </p>
        </Reveal>
        <Reveal delay={380}>
          <OnbPrimary label="Get started" accent={accent} onClick={onStart} />
          <OnbGhost label="I already have an account" onClick={onStart} color={C.ink3} style={{ marginTop: 6 }} />
        </Reveal>
      </div>
    </div>
  );
}

Object.assign(window, { WelcomeScreen, PhoneDemo });
