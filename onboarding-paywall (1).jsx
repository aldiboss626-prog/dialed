// onboarding-paywall.jsx — trial paywall ($10/mo vs yearly @ $6.67/mo) with a
// "maybe later" downsell that drops the yearly plan to $5/mo.

function PlanCard({ tag, title, price, per, sub, strike, selected, accent, onClick, best }) {
  return (
    <button onClick={onClick} style={{
      position: 'relative', width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: FONT,
      padding: '16px 16px', borderRadius: 18,
      background: selected ? hexA(accent, 0.07) : C.surface,
      border: `2px solid ${selected ? accent : C.border}`,
      boxShadow: selected ? `0 8px 22px ${hexA(accent, 0.16)}` : '0 2px 10px rgba(13,21,38,0.04)',
      transition: 'all .15s ease', display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, border: `2px solid ${selected ? accent : C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {selected && <div style={{ width: 11, height: 11, borderRadius: '50%', background: accent }} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: C.ink }}>{title}</span>
          {best && <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.4, color: '#fff', background: accent, padding: '3px 8px', borderRadius: 99 }}>{tag}</span>}
        </div>
        <div style={{ fontSize: 13, color: C.ink2, marginTop: 3 }}>{sub}</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, justifyContent: 'flex-end' }}>
          {strike && <span style={{ fontSize: 13, color: C.ink3, textDecoration: 'line-through' }}>{strike}</span>}
          <span style={{ fontSize: 22, fontWeight: 700, color: C.ink }}>{price}</span>
        </div>
        <div style={{ fontSize: 12, color: C.ink2, marginTop: 1 }}>{per}</div>
      </div>
    </button>
  );
}

function PaywallScreen({ accent, header, name, onComplete }) {
  const [plan, setPlan] = useState('yearly');     // 'yearly' | 'monthly'
  const [discounted, setDiscounted] = useState(false); // downsell claimed
  const [showDownsell, setShowDownsell] = useState(false);
  const [seenDownsell, setSeenDownsell] = useState(false);

  const yearlyTotal = discounted ? 60 : 80;
  const yearlyPerMo = discounted ? '$5.00' : '$6.67';

  const maybeLater = () => {
    if (!seenDownsell) { setSeenDownsell(true); setShowDownsell(true); }
    else onComplete();
  };
  const claim = () => { setDiscounted(true); setPlan('yearly'); setShowDownsell(false); };

  return (
    <StepScaffold header={header} footer={
      <div>
        <OnbPrimary label="Start my 7-day free trial" accent={accent} onClick={onComplete} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 12 }}>
          {['Cancel anytime', 'No charge today'].map((t, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Icon name="check" size={13} color={C.success} sw={2.6} />
              <span style={{ fontFamily: FONT, fontSize: 12, color: C.ink2, fontWeight: 500 }}>{t}</span>
            </div>
          ))}
        </div>
        <OnbGhost label="Maybe later" onClick={maybeLater} style={{ marginTop: 6 }} />
      </div>
    }>
      <div style={{ padding: '16px 24px 2px' }}>
        <Reveal>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 12px', borderRadius: 99, background: hexA(accent, 0.12), marginBottom: 12 }}>
            <Icon name="sparkle" size={15} color={accent} sw={1.9} fill />
            <span style={{ fontFamily: FONT, fontSize: 12.5, fontWeight: 700, color: accent, letterSpacing: 0.3 }}>7 DAYS FREE</span>
          </div>
        </Reveal>
        <Reveal delay={80}><Title style={{ fontSize: 24 }}>Your plan is ready{name ? `, ${name}` : ''}.</Title></Reveal>
        <Reveal delay={150}><Subtitle style={{ marginTop: 8, fontSize: 14.5 }}>Try every Premium feature free for a week. Pick the plan that fits — switch or cancel whenever.</Subtitle></Reveal>
      </div>

      <div style={{ padding: '16px 24px 8px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Reveal delay={230}>
          <PlanCard title="Yearly" tag={discounted ? 'SAVE 50%' : 'SAVE 33%'} best
            price={yearlyPerMo} per="per month" sub={`Billed $${yearlyTotal}/year`}
            strike={discounted ? '$10' : null}
            selected={plan === 'yearly'} accent={accent} onClick={() => setPlan('yearly')} />
        </Reveal>
        <Reveal delay={300}>
          <PlanCard title="Monthly" price="$10" per="per month" sub="Billed monthly"
            selected={plan === 'monthly'} accent={accent} onClick={() => setPlan('monthly')} />
        </Reveal>
      </div>

      <div style={{ padding: '4px 24px 0' }}>
        <Reveal delay={360}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 14, background: hexA(C.ink, 0.04) }}>
            <Icon name="bell" size={18} color={C.ink2} sw={1.9} />
            <span style={{ fontFamily: FONT, fontSize: 13, color: C.ink2, lineHeight: 1.4 }}>We’ll remind you 2 days before your trial ends. No surprise charges.</span>
          </div>
        </Reveal>
      </div>

      {showDownsell && <DownsellScreen accent={accent} name={name} onClaim={claim} onDecline={onComplete} />}
    </StepScaffold>
  );
}

// ── downsell — full-page takeover ("okay… here's $5/mo") ───────────────────
function DownsellScreen({ accent, name, onClaim, onDecline }) {
  const included = ['Unlimited contacts', 'Smart reminders', 'Gmail replies', 'Analytics'];
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 8, paddingTop: 58, background: 'linear-gradient(180deg, #EEF2FF 0%, #E1E8FB 100%)', display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'onb-page-up .42s cubic-bezier(.2,.85,.28,1)' }}>
      <Aurora accent={accent} />

      <div style={{ position: 'relative', zIndex: 1, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '10px 28px 0', textAlign: 'center', alignItems: 'center' }}>
        {/* medallion */}
        <div style={{ position: 'relative', width: 116, height: 116, marginTop: 6, marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: `radial-gradient(circle, ${hexA(accent, 0.22)}, transparent 70%)`, animation: 'onb-haloexpand 2.6s ease-out infinite' }} />
          <div style={{ width: 96, height: 96, borderRadius: '50%', background: accent, color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: `0 16px 40px ${hexA(accent, 0.5)}`, transform: 'rotate(-7deg)', animation: 'onb-seal 3s ease-in-out infinite' }}>
            <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: 30, lineHeight: 1 }}>50%</span>
            <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 13, letterSpacing: 2, marginTop: 2 }}>OFF</span>
          </div>
        </div>

        <div style={{ fontFamily: FONT, fontSize: 11.5, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: accent, marginBottom: 12, animation: 'onb-twinkle 1.8s ease-in-out infinite' }}>Hold on — wait!</div>
        <h1 style={{ margin: 0, fontFamily: FONT, fontWeight: 800, fontSize: 30, lineHeight: 1.1, letterSpacing: -0.8, color: C.ink, textWrap: 'balance' }}>Okay… how about <span style={{ color: accent }}>$5</span> a month?</h1>
        <p style={{ margin: '12px 0 0', maxWidth: 320, fontFamily: FONT, fontSize: 15, lineHeight: 1.5, color: C.ink2, textWrap: 'pretty' }}>
          We really don’t want you to miss this{name ? `, ${name}` : ''}. This is the lowest price we’ve <em>ever</em> offered — yours if you stay.
        </p>

        {/* big price */}
        <div style={{ marginTop: 20, width: '100%', maxWidth: 320, background: C.surface, borderRadius: 22, border: `2px solid ${accent}`, boxShadow: `0 14px 36px ${hexA(accent, 0.2)}`, padding: '18px 20px', animation: 'onb-checkpop .45s cubic-bezier(.3,1.3,.5,1)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 8 }}>
            <span style={{ fontFamily: FONT, fontSize: 18, color: C.ink3, textDecoration: 'line-through' }}>$6.67</span>
            <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: 52, lineHeight: 1, letterSpacing: -1, color: C.ink }}>$5</span>
            <span style={{ fontFamily: FONT, fontSize: 17, fontWeight: 600, color: C.ink2 }}>/mo</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 }}>
            <span style={{ fontFamily: FONT, fontSize: 12.5, fontWeight: 700, color: '#fff', background: accent, padding: '4px 10px', borderRadius: 99 }}>SAVE 50%</span>
            <span style={{ fontFamily: FONT, fontSize: 13, color: C.ink2 }}>Billed $60/year</span>
          </div>
        </div>

        {/* still included */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 7, marginTop: 16, maxWidth: 320 }}>
          {included.map((t, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 99, background: hexA(C.ink, 0.04), border: `1px solid ${C.border}` }}>
              <Icon name="check" size={13} color={C.success} sw={2.6} />
              <span style={{ fontFamily: FONT, fontSize: 12.5, fontWeight: 600, color: C.ink2 }}>{t}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 1, padding: '14px 24px calc(env(safe-area-inset-bottom) + 22px)', flexShrink: 0 }}>
        <div style={{ animation: 'onb-ctaglow 2.2s ease-in-out infinite', borderRadius: 18 }}>
          <OnbPrimary label="Claim my $5/month" accent={accent} onClick={onClaim} />
        </div>
        <OnbGhost label="No thanks, I’ll pay full price" onClick={onDecline} style={{ marginTop: 4 }} />
      </div>
    </div>
  );
}

Object.assign(window, { PaywallScreen });
