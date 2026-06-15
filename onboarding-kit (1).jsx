// onboarding-kit.jsx — shared primitives + content data for the Dialed
// first-run onboarding flow. Pulls tokens (C, FONT, Icon, hexA) from dialed-kit.
// Note: React hooks (useState/useEffect/etc.) are already destructured globally
// by dialed-kit.jsx, which loads first — do not redeclare them here.

// ── shared layout scaffold: header / scrolling body / footer ──────────────
function StepScaffold({ header, children, footer, bg, scroll = false }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: bg || C.bg, paddingTop: 58, display: 'flex', flexDirection: 'column' }}>
      {header}
      <div style={{ flex: 1, minHeight: 0, overflowY: scroll ? 'auto' : 'hidden', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
      {footer && <div style={{ padding: '12px 22px calc(env(safe-area-inset-bottom) + 20px)', flexShrink: 0 }}>{footer}</div>}
    </div>
  );
}

// ── header: optional back chevron + progress bar ──────────────────────────
function OnbHeader({ onBack, canBack = true, progress = 0, showProgress = true, accent = C.accent, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '6px 22px 2px', flexShrink: 0 }}>
      <button onClick={onBack} disabled={!canBack} style={{
        width: 38, height: 38, borderRadius: '50%', border: 'none', flexShrink: 0,
        background: canBack ? hexA(C.ink, 0.05) : 'transparent', cursor: canBack ? 'pointer' : 'default',
        display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: canBack ? 1 : 0,
      }}>
        <svg width="11" height="18" viewBox="0 0 11 18" fill="none">
          <path d="M9 2 2 9l7 7" stroke={C.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {showProgress ? (
        <div style={{ flex: 1, height: 5, borderRadius: 99, background: hexA(C.ink, 0.08), overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.max(0, Math.min(1, progress)) * 100}%`, background: accent, borderRadius: 99, transition: 'width .5s cubic-bezier(.2,.8,.2,1)' }} />
        </div>
      ) : <div style={{ flex: 1 }} />}
      {right || null}
    </div>
  );
}

// ── primary CTA (matches permission flow button) ──────────────────────────
function OnbPrimary({ label, onClick, accent = C.accent, disabled = false, style }) {
  const [press, setPress] = useState(false);
  return (
    <button onClick={disabled ? undefined : onClick}
      onMouseDown={() => setPress(true)} onMouseUp={() => setPress(false)} onMouseLeave={() => setPress(false)}
      style={{
        width: '100%', height: 56, borderRadius: 18, border: 'none',
        background: disabled ? hexA(C.ink, 0.12) : accent, color: disabled ? C.ink3 : '#fff',
        cursor: disabled ? 'default' : 'pointer', fontFamily: FONT, fontWeight: 600, fontSize: 17, letterSpacing: 0.1,
        transition: 'transform .12s ease, opacity .12s ease, background .2s ease',
        transform: press && !disabled ? 'scale(0.985)' : 'scale(1)',
        boxShadow: disabled ? 'none' : `0 10px 24px ${hexA(accent, 0.32)}`,
        ...style,
      }}>{label}</button>
  );
}

function OnbGhost({ label, onClick, color = C.ink3, style }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', height: 44, border: 'none', background: 'transparent', cursor: 'pointer',
      fontFamily: FONT, fontSize: 15, fontWeight: 500, color, ...style,
    }}>{label}</button>
  );
}

// ── text helpers ──────────────────────────────────────────────────────────
function Eyebrow({ children, color = C.accent, style }) {
  return <div style={{ fontFamily: FONT, fontSize: 11.5, fontWeight: 700, letterSpacing: 1.6, textTransform: 'uppercase', color, ...style }}>{children}</div>;
}
function Title({ children, style }) {
  return <h1 style={{ margin: 0, fontFamily: FONT, fontWeight: 700, fontSize: 28, lineHeight: 1.12, letterSpacing: -0.6, color: C.ink, textWrap: 'pretty', ...style }}>{children}</h1>;
}
function Subtitle({ children, style }) {
  return <p style={{ margin: '12px 0 0', fontFamily: FONT, fontSize: 15.5, lineHeight: 1.5, color: C.ink2, textWrap: 'pretty', ...style }}>{children}</p>;
}

// ── selectable option row (single or multi) ───────────────────────────────
function OptionRow({ label, sub, icon, selected, onClick, accent = C.accent, multi = false }) {
  const [press, setPress] = useState(false);
  return (
    <button onClick={onClick}
      onMouseDown={() => setPress(true)} onMouseUp={() => setPress(false)} onMouseLeave={() => setPress(false)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 13, textAlign: 'left',
        padding: '12px 14px', borderRadius: 15, cursor: 'pointer',
        background: selected ? hexA(accent, 0.08) : C.surface,
        border: `1.5px solid ${selected ? accent : C.border}`,
        boxShadow: selected ? `0 6px 18px ${hexA(accent, 0.14)}` : '0 2px 10px rgba(13,21,38,0.04)',
        transition: 'all .15s ease', transform: press ? 'scale(0.99)' : 'scale(1)',
        fontFamily: FONT,
      }}>
      {icon && (
        <div style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, background: selected ? accent : hexA(C.ink, 0.05), display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .15s' }}>
          <Icon name={icon} size={20} color={selected ? '#fff' : C.ink2} sw={1.9} />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: C.ink, lineHeight: 1.25 }}>{label}</div>
        {sub && <div style={{ fontSize: 12.5, color: C.ink2, marginTop: 2, lineHeight: 1.3 }}>{sub}</div>}
      </div>
      {multi ? (
        <div style={{
          width: 24, height: 24, borderRadius: 7, flexShrink: 0,
          border: `2px solid ${selected ? accent : C.border}`, background: selected ? accent : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .18s',
        }}>
          {selected && <span key="on" style={{ display: 'flex', animation: 'onb-checkpop .32s cubic-bezier(.3,1.4,.5,1)' }}><Icon name="check" size={15} color="#fff" sw={2.6} /></span>}
        </div>
      ) : (
        <div style={{
          width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
          border: `2px solid ${selected ? accent : C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .18s',
        }}>
          {selected && <span key="on" style={{ width: 11, height: 11, borderRadius: '50%', background: accent, animation: 'onb-checkpop .32s cubic-bezier(.3,1.4,.5,1)' }} />}
        </div>
      )}
    </button>
  );
}

// ── text field ────────────────────────────────────────────────────────────
function OnbField({ value, onChange, placeholder, type = 'text', autoFocus = false, icon, onEnter }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 56, padding: '0 16px', borderRadius: 16, background: C.surface, border: `1.5px solid ${C.border}` }}>
      {icon && <Icon name={icon} size={20} color={C.ink3} sw={1.9} />}
      <input
        value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} type={type} autoFocus={autoFocus}
        onKeyDown={(e) => { if (e.key === 'Enter' && onEnter) onEnter(); }}
        style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontFamily: FONT, fontSize: 17, fontWeight: 500, color: C.ink, minWidth: 0 }}
      />
    </div>
  );
}

// ── motion: capture-safe staggered reveal (CSS-driven, settles visible) ────
function Reveal({ children, delay = 0, y = 16, style }) {
  return (
    <div style={{
      animation: `onb-reveal .55s cubic-bezier(.2,.85,.25,1) ${delay}ms both`,
      ...style,
    }}>{children}</div>
  );
}

// ── motion: directional step transition. Plays once on mount, then clears the
// animation (via a timer, so it's robust even when the frame isn't painting)
// so static captures render the settled rest state. ───────────────────────────
function StepEnter({ children, dir = 1 }) {
  const [on, setOn] = useState(true);
  useEffect(() => { const t = setTimeout(() => setOn(false), 540); return () => clearTimeout(t); }, []);
  return (
    <div
      onAnimationEnd={() => setOn(false)}
      style={{
        position: 'relative', width: '100%', height: '100%',
        animation: on ? `onb-enter-${dir >= 0 ? 'fwd' : 'back'} .44s cubic-bezier(.22,.9,.3,1) both` : 'none',
      }}>{children}</div>
  );
}

// ── DIALED wordmark (matches the dialed2 app) ─────────────────────────────
function Wordmark({ size = 22, accent = C.accent, light = false }) {
  const ink = light ? '#fff' : C.ink;
  return (
    <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: size, letterSpacing: size * 0.05 }}>
      <span style={{ color: ink }}>DI</span><span style={{ color: accent }}>AL</span><span style={{ color: ink }}>ED</span>
    </div>
  );
}

// ── animated count-up (named to avoid colliding with dialed2's useCount) ──
function useCountUp(target, ms = 900) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let i = 0; const steps = 28; const ease = (x) => 1 - Math.pow(1 - x, 3);
    const id = setInterval(() => {
      i++; const p = Math.min(1, i / steps); setV(Math.round(ease(p) * target));
      if (p >= 1) clearInterval(id);
    }, ms / steps);
    return () => clearInterval(id);
  }, [target]);
  return v;
}

// ── ambient aurora layer (slow, subtle; killed under reduced-motion) ──────
function Aurora({ accent = C.accent, dark = false }) {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', top: '-18%', left: '-12%', width: 280, height: 280, borderRadius: '50%', background: `radial-gradient(circle, ${hexA(accent, dark ? 0.5 : 0.22)}, transparent 68%)`, filter: 'blur(8px)', animation: 'onb-drift 16s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', bottom: '-14%', right: '-16%', width: 300, height: 300, borderRadius: '50%', background: `radial-gradient(circle, ${hexA('#7C3AED', dark ? 0.34 : 0.14)}, transparent 68%)`, filter: 'blur(8px)', animation: 'onb-drift 19s ease-in-out infinite reverse' }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// CONTENT DATA
// ─────────────────────────────────────────────────────────────────────────
const AGE_OPTS = ['18–24', '25–34', '35–44', '45–54', '55+'];

const JOURNEY_OPTS = [
  { label: 'Student', sub: 'Studying, interning, figuring it out', icon: 'star' },
  { label: 'Early career', sub: 'First few roles, building momentum', icon: 'flame' },
  { label: 'Mid-career', sub: 'Established, looking to level up', icon: 'briefcase' },
  { label: 'Founder / building', sub: 'Running my own thing', icon: 'sparkle' },
  { label: 'Senior leader', sub: 'Leading teams or a function', icon: 'crown' },
  { label: 'Exploring what’s next', sub: 'Between chapters', icon: 'rotate' },
];

const GOAL_OPTS = [
  { label: 'Land a job or opportunity', icon: 'briefcase' },
  { label: 'Grow my professional network', icon: 'people' },
  { label: 'Stay close to people I care about', icon: 'heart' },
  { label: 'Find mentors and advisors', icon: 'star' },
  { label: 'Build my own company', icon: 'sparkle' },
  { label: 'Stop letting opportunities slip', icon: 'clock' },
];

const PROBLEM_OPTS = [
  { label: 'I forget to follow up', icon: 'bell' },
  { label: 'I lose touch after the first meeting', icon: 'clock' },
  { label: 'I don’t know who to prioritize', icon: 'sliders' },
  { label: 'I go quiet when I get busy', icon: 'moon' },
  { label: 'I never ask for what I need', icon: 'message' },
  { label: 'Conversations just fizzle out', icon: 'flame' },
];

// pains — each maps to how Dialed solves it (revealed when selected)
const PAINS = [
  { id: 'p1', label: 'Forgot to reply to someone important', fix: 'Dialed nudges you the moment a reply is overdue — before it gets awkward.' },
  { id: 'p2', label: 'Lost a job lead because you went quiet', fix: 'Every opportunity is tracked with its own deadline, so nothing slips through.' },
  { id: 'p3', label: 'Watched a mentor slowly drift away', fix: 'Cadence reminders keep your key people warm — automatically.' },
  { id: 'p4', label: 'Scrambled to remember how you know someone', fix: 'Each contact holds your notes, history, and context in one tap.' },
  { id: 'p5', label: 'Let a warm intro go cold', fix: 'Dialed flags intros before the window closes — so you actually follow through.' },
  { id: 'p6', label: 'Realized months passed since a good friend', fix: 'Gentle check-ins make sure no one quietly falls off your radar.' },
];

// cost-of-silence consequences
const COST_ITEMS = [
  { who: 'The recruiter', what: 'fills the role with someone who stayed in touch.' },
  { who: 'The mentor', what: 'stops thinking of you when the good rooms open up.' },
  { who: 'The intro', what: 'never happens — the moment just passes.' },
  { who: 'The friendship', what: 'fades, one unanswered text at a time.' },
];

// premium feature list
const PREMIUM_FEATURES = [
  { icon: 'people', title: 'Unlimited contacts & opportunities', sub: 'Track your whole world, not just a sample.' },
  { icon: 'bell', title: 'Smart overdue reminders', sub: 'Louder as deadlines near, quiet when all is well.' },
  { icon: 'mail', title: 'Gmail reply detection', sub: 'Surfaces conversations waiting on you.' },
  { icon: 'bars', title: 'Network health & analytics', sub: 'See exactly where your circle needs you.' },
  { icon: 'image', title: 'AI photo tools', sub: 'Outfit check and contact faces, on device.' },
  { icon: 'briefcase', title: 'Priority opportunity tracking', sub: 'Never miss a deadline that matters.' },
];

// permissions (shared with the standalone permission flow)
const ONB_PERMISSIONS = [
  { key: 'contacts', glyph: 'contacts', accent: '#2563EB', eyebrow: 'Access · 1 of 4', title: 'Bring in your people', body: 'Dialed reads your contacts so you can add the people who matter in seconds — no typing every name by hand.', sysTitle: '“Dialed” Would Like to Access Your Contacts', sysMsg: 'Used to help you add the people who matter, faster. Contacts stay on your device.' },
  { key: 'notifications', glyph: 'notifications', accent: '#F59E0B', eyebrow: 'Access · 2 of 4', title: 'Never let one go cold', body: 'We’ll nudge you the moment a key relationship is overdue — louder as deadlines near, quiet when all is well.', sysTitle: '“Dialed” Would Like to Send You Notifications', sysMsg: 'Notifications may include alerts, sounds, and badges. These can be configured in Settings.' },
  { key: 'calendar', glyph: 'calendar', accent: '#EF4444', eyebrow: 'Access · 3 of 4', title: 'Time your reach-outs', body: 'See deadlines and meetings alongside your contacts, so you reconnect before it actually counts.', sysTitle: '“Dialed” Would Like to Access Your Calendar', sysMsg: 'Used to surface deadlines and meetings next to the right contacts.' },
  { key: 'photos', glyph: 'photos', accent: '#16A34A', eyebrow: 'Access · 4 of 4', title: 'Make it personal', body: 'Add faces to your contacts and use AI tools like outfit check. Photos stay on your device until you choose to use them.', sysTitle: '“Dialed” Would Like to Access Your Photos', sysMsg: 'Allow access so you can add photos to contacts and use AI tools.' },
];

Object.assign(window, {
  StepScaffold, OnbHeader, OnbPrimary, OnbGhost, Eyebrow, Title, Subtitle, OptionRow, OnbField,
  Reveal, Wordmark, useCountUp, Aurora, StepEnter,
  AGE_OPTS, JOURNEY_OPTS, GOAL_OPTS, PROBLEM_OPTS, PAINS, COST_ITEMS, PREMIUM_FEATURES, ONB_PERMISSIONS,
});
