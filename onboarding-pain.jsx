// onboarding-pain.jsx — pain-point multi-select (each reveals how Dialed
// solves it) + the "cost of silence" dramatization screen.

// ── one expandable pain row ───────────────────────────────────────────────
function PainRow({ data, selected, accent, onToggle }) {
  return (
    <div style={{
      borderRadius: 16, overflow: 'hidden', background: selected ? hexA(accent, 0.06) : C.surface,
      border: `1.5px solid ${selected ? accent : C.border}`,
      boxShadow: selected ? `0 6px 18px ${hexA(accent, 0.12)}` : '0 2px 10px rgba(13,21,38,0.04)',
      transition: 'all .18s ease',
    }}>
      <button onClick={onToggle} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 13, textAlign: 'left', padding: '14px 15px', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: FONT }}>
        <div style={{ flex: 1, fontSize: 15, fontWeight: 600, color: C.ink, lineHeight: 1.3 }}>{data.label}</div>
        <div style={{
          width: 24, height: 24, borderRadius: 7, flexShrink: 0,
          border: `2px solid ${selected ? accent : C.border}`, background: selected ? accent : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s',
        }}>
          {selected && <Icon name="check" size={15} color="#fff" sw={2.6} />}
        </div>
      </button>
      <div style={{ maxHeight: selected ? 120 : 0, opacity: selected ? 1 : 0, overflow: 'hidden', transition: 'max-height .3s ease, opacity .25s ease' }}>
        <div style={{ display: 'flex', gap: 10, padding: '0 15px 15px', alignItems: 'flex-start' }}>
          <div style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, background: C.success, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
            <Icon name="check" size={13} color="#fff" sw={2.6} />
          </div>
          <div style={{ fontFamily: FONT, fontSize: 13.5, lineHeight: 1.45, color: C.ink2, textWrap: 'pretty' }}>
            <span style={{ fontWeight: 700, color: C.success }}>Dialed fixes this. </span>{data.fix}
          </div>
        </div>
      </div>
    </div>
  );
}

function PainScreen({ accent, header, selected, onToggle, onNext }) {
  const count = selected.length;
  return (
    <StepScaffold scroll header={header} footer={
      <Reveal delay={120}><OnbPrimary label={count ? `Continue · ${count} selected` : 'Continue'} accent={accent} onClick={onNext} /></Reveal>
    }>
      <div style={{ padding: '18px 22px 4px' }}>
        <Reveal><Eyebrow color={accent}>No judgment</Eyebrow></Reveal>
        <Reveal delay={70}><Title style={{ marginTop: 12, fontSize: 24 }}>Be honest — have you ever…</Title></Reveal>
        <Reveal delay={130}><Subtitle style={{ marginTop: 8, fontSize: 14.5 }}>Tap the ones that hit home. We’ll show you exactly how Dialed handles each.</Subtitle></Reveal>
      </div>
      <div style={{ padding: '12px 22px 8px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {PAINS.map((p, i) => (
          <Reveal key={p.id} delay={160 + i * 50} y={12}>
            <PainRow data={p} accent={accent} selected={selected.includes(p.id)} onToggle={() => onToggle(p.id)} />
          </Reveal>
        ))}
      </div>
    </StepScaffold>
  );
}

// ── cost of silence ───────────────────────────────────────────────────────
function CostScreen({ accent, header, name, onNext }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(165deg, #16203A 0%, #0D1526 60%)', paddingTop: 58, display: 'flex', flexDirection: 'column' }}>
      <div style={{ flexShrink: 0 }}>{header}</div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 26px 0' }}>
        <Reveal><Eyebrow color={C.overdue}>The other path</Eyebrow></Reveal>
        <Reveal delay={70}>
          <h1 style={{ margin: '12px 0 0', fontFamily: FONT, fontWeight: 800, fontSize: 25, lineHeight: 1.14, letterSpacing: -0.5, color: '#fff', textWrap: 'pretty' }}>
            Here’s what silence quietly costs you.
          </h1>
        </Reveal>
        <Reveal delay={140}>
          <p style={{ margin: '8px 0 16px', fontFamily: FONT, fontSize: 14, lineHeight: 1.45, color: hexA('#fff', 0.6), textWrap: 'pretty' }}>
            Do nothing, and the people you meant to reach don’t wait around. Time decides for you.
          </p>
        </Reveal>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {COST_ITEMS.map((c, i) => (
            <Reveal key={i} delay={200 + i * 80} y={14}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 14px', borderRadius: 14, background: hexA('#fff', 0.05), border: `1px solid ${hexA('#fff', 0.08)}` }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: hexA(C.overdue, 0.18), display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke={C.overdue} strokeWidth="2.4" strokeLinecap="round" /></svg>
                </div>
                <div style={{ fontFamily: FONT, fontSize: 14, lineHeight: 1.4, color: hexA('#fff', 0.92), textWrap: 'pretty' }}>
                  <span style={{ fontWeight: 700, color: '#fff' }}>{c.who} </span>{c.what}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={200 + COST_ITEMS.length * 80}>
          <div style={{ margin: '14px 0 16px', padding: '14px 16px', borderRadius: 15, background: hexA(accent, 0.16), border: `1px solid ${hexA(accent, 0.3)}` }}>
            <div style={{ fontFamily: FONT, fontSize: 15, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>It doesn’t have to go this way, {name || 'friend'}.</div>
            <div style={{ fontFamily: FONT, fontSize: 13, color: hexA('#fff', 0.7), marginTop: 5, lineHeight: 1.4 }}>Dialed turns every one of these into a small, timely nudge — so the good outcome is the default.</div>
          </div>
        </Reveal>
      </div>
      <div style={{ padding: '14px 24px calc(env(safe-area-inset-bottom) + 20px)', flexShrink: 0 }}>
        <Reveal delay={250 + COST_ITEMS.length * 80}><OnbPrimary label="Show me the fix" accent={accent} onClick={onNext} /></Reveal>
      </div>
    </div>
  );
}

Object.assign(window, { PainScreen, CostScreen });
