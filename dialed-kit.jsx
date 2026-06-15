// dialed-kit.jsx — shared tokens, helpers, icons, and reusable components
// for the Dialed Network redesign. Warm cream palette + DM Sans.

const { useState, useRef, useEffect, useCallback } = React;

// ── tokens ────────────────────────────────────────────────────
const C = {
  bg: '#F7F4EF', surface: '#FFFFFF', elevated: '#F0EBE3', border: '#E5DDD0',
  hair: 'rgba(0,0,0,0.05)', ink: '#1C1108', ink2: '#6B5C48', ink3: '#A89880',
  accent: '#2563EB', overdue: '#E05252', warning: '#D4852A', success: '#16A34A',
  inkCard: '#1C1108',
};
// relationship-type colors (CAT_COLORS)
const CAT = { Mentor: '#3B6FE8', Friend: '#22C55E', Recruiter: '#EF4444', Professor: '#F59E0B' };
const FONT = "'DM Sans', system-ui, sans-serif";

// ── cadence + status logic (mirrors DESIGN_PRINCIPLES) ─────────
const CADENCE_BY_STARS = { 5: 5, 4: 10, 3: 14, 2: 21, 1: 30 };
const defaultCadence = (stars) => CADENCE_BY_STARS[stars] || 14;
function computeStatus(daysSince, cadence) {
  if (daysSince > cadence) return 'overdue';
  if (daysSince > cadence - 3) return 'due-soon';
  return 'good';
}
const bandColor = (s) => s === 'overdue' ? C.overdue : s === 'due-soon' ? C.warning : C.success;
const bandLabel = (s) => s === 'overdue' ? 'Overdue' : s === 'due-soon' ? 'Due soon' : 'On track';

function hexA(hex, a) {
  let h = hex.replace('#', ''); if (h.length === 3) h = h.split('').map(x => x + x).join('');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
const initialsOf = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();

// color-hash a string to a stable hue (for company / letter circles)
const HASH_COLORS = ['#3B6FE8', '#22C55E', '#F59E0B', '#7C3AED', '#EF4444', '#0EA5E9', '#EC4899', '#14B8A6'];
function hashColor(str = '') {
  let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return HASH_COLORS[h % HASH_COLORS.length];
}

// ── opportunity model ─────────────────────────────────────────
// status: not-started | applied | interview | active | waiting | completed | missed
const OPP_STATUS = {
  'not-started': { label: 'Not Started', color: '#95A2BC' },
  applied: { label: 'Applied', color: '#2563EB' },
  interview: { label: 'Interview', color: '#7C3AED' },
  active: { label: 'Active', color: '#16A34A' },
  waiting: { label: 'Waiting', color: '#F59E0B' },
  completed: { label: 'Completed', color: '#16A34A' },
  missed: { label: 'Missed', color: '#EF4444' },
};
const OPP_PRIORITY = { low: { label: 'Low', color: '#95A2BC' }, medium: { label: 'Medium', color: '#F59E0B' }, high: { label: 'High', color: '#EF4444' } };
const OPP_CATEGORIES = ['Career Opportunity', 'Job Application', 'Intro / Referral', 'Mentorship', 'Funding', 'Partnership'];

function oppState(o) {
  // derived bucket: completed | missed | overdue | upcoming | active
  if (o.status === 'completed') return 'completed';
  if (o.status === 'missed') return 'missed';
  if (o.deadline != null && o.deadline < 0) return 'overdue';
  if (o.deadline != null && o.deadline <= 7) return 'upcoming';
  return 'active';
}
function opportunityScore(opps) {
  const live = opps.filter(o => o.status !== 'completed' && o.status !== 'missed');
  const overdue = live.filter(o => o.deadline != null && o.deadline < 0).length;
  const missed = opps.filter(o => o.status === 'missed').length;
  const upcoming = live.filter(o => o.deadline != null && o.deadline >= 0 && o.deadline <= 7).length;
  return Math.max(0, Math.min(100, 100 - overdue * 20 - missed * 15 - upcoming * 5));
}
const oppScoreLabel = (s) => s >= 85 ? 'Excellent' : s >= 65 ? 'Great' : s >= 40 ? 'Fair' : 'Needs Work';
function deadlineColor(d) {
  if (d == null) return C.ink3;
  if (d < 0) return C.overdue;
  if (d <= 3) return C.overdue;
  if (d <= 7) return C.warning;
  return C.success;
}
function deadlineLabel(d) {
  if (d == null) return 'No deadline';
  if (d < 0) return `${Math.abs(d)}d late`;
  if (d === 0) return 'Due today';
  return `${d}d left`;
}

const SAMPLE_OPPS = [
  { id: 'o1', title: 'Product Manager, Growth', category: 'Job Application', contactId: 3, deadline: 3, status: 'interview', priority: 'high', notes: 'Final round next week — prep growth case study.' },
  { id: 'o2', title: 'Seed round intro', category: 'Funding', contactId: 1, deadline: -2, status: 'waiting', priority: 'high', notes: 'Send updated deck before Priya loops in the partner.' },
  { id: 'o3', title: 'Design mentorship', category: 'Mentorship', contactId: 2, deadline: 6, status: 'active', priority: 'medium', notes: 'Maya offered monthly portfolio reviews.' },
  { id: 'o4', title: 'Referral — Stripe', category: 'Intro / Referral', contactId: 6, deadline: 12, status: 'applied', priority: 'medium', notes: 'Aisha can refer to the platform team.' },
  { id: 'o5', title: 'Guest lecture slot', category: 'Career Opportunity', contactId: 4, deadline: 20, status: 'not-started', priority: 'low', notes: 'Prof. Ortiz mentioned a spring guest session.' },
  { id: 'o6', title: 'Conference speaking', category: 'Career Opportunity', contactId: 5, deadline: null, status: 'completed', priority: 'medium', notes: 'Lined up via Sam — done.' },
];

// ── sample data (only shown when the "populated" tweak is on) ──
const SAMPLE = [
  { id: 1, name: 'Priya Nair', title: 'Partner', company: 'Sequoia', type: 'Recruiter', stars: 5, cadence: 5, daysSince: 14, fav: true, pending: true, opp: { title: 'Seed intro', days: 3 }, note: 'Wants intro deck before Q3 close.' },
  { id: 2, name: 'Maya Patel', title: 'Product Designer', company: 'Linear', type: 'Mentor', stars: 5, cadence: 5, daysSince: 9, fav: true, pending: true, note: 'Offered to review portfolio.' },
  { id: 3, name: 'Daniel Cho', title: 'Tech Recruiter', company: 'Stripe', type: 'Recruiter', stars: 4, cadence: 10, daysSince: 12, fav: false, opp: { title: 'PM role', days: 6 }, note: 'Role opens in two weeks.' },
  { id: 4, name: 'Prof. Lena Ortiz', title: 'Faculty', company: 'NYU', type: 'Professor', stars: 4, cadence: 10, daysSince: 11, fav: false, note: 'Rec letter draft pending.' },
  { id: 5, name: 'Sam Rivera', title: 'PM', company: 'Notion', type: 'Friend', stars: 3, cadence: 14, daysSince: 12, fav: false, note: 'Coffee next time in SF.' },
  { id: 6, name: 'Aisha Khan', title: 'Founder', company: 'Atlas', type: 'Mentor', stars: 4, cadence: 10, daysSince: 4, fav: true, note: 'Shared fundraising playbook.' },
  { id: 7, name: 'Marcus Lee', title: 'Engineer', company: 'Figma', type: 'Friend', stars: 2, cadence: 21, daysSince: 8, fav: false, note: 'Hack weekend in May.' },
];
function withStatus(c) {
  const status = computeStatus(c.daysSince, c.cadence);
  const overdueBy = c.daysSince - c.cadence;
  const urgency = (status === 'overdue' ? 100 : status === 'due-soon' ? 50 : 0) + c.stars * 5 + Math.max(0, overdueBy);
  return { ...c, status, overdueBy, urgency };
}
const enrich = (list) => list.map(withStatus).sort((a, b) => b.urgency - a.urgency);

function healthScore(list) {
  if (!list.length) return 100;
  const overdue = list.filter(c => c.status === 'overdue').length;
  const due = list.filter(c => c.status === 'due-soon').length;
  return Math.max(8, Math.min(100, Math.round(100 - overdue * 12 - due * 5)));
}
const scoreLabel = (s) => s >= 85 ? 'Strong' : s >= 65 ? 'Good' : s >= 40 ? 'Needs work' : 'At risk';

// ── icons (minimal line set, 24 viewBox) ──────────────────────
function Icon({ name, size = 22, color = C.ink, sw = 1.8, fill = false, style }) {
  const p = { fill: 'none', stroke: color, strokeWidth: sw, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const paths = {
    bell: <><path d="M6 16c1-1 1.4-2.3 1.4-4v-1.7a4.6 4.6 0 0 1 9.2 0V12c0 1.7.4 3 1.4 4H6Z" {...p} /><path d="M10.2 18.8a2 2 0 0 0 3.6 0" {...p} /></>,
    search: <><circle cx="11" cy="11" r="6.5" {...p} /><path d="M16 16l4 4" {...p} /></>,
    sliders: <><path d="M4 7h11M19 7h1M4 12h3M11 12h9M4 17h8M16 17h4" {...p} /><circle cx="17" cy="7" r="2" {...p} /><circle cx="9" cy="12" r="2" {...p} /><circle cx="14" cy="17" r="2" {...p} /></>,
    plus: <path d="M12 5v14M5 12h14" {...p} />,
    close: <path d="M6 6l12 12M18 6L6 18" {...p} />,
    chevL: <path d="M14 6l-6 6 6 6" {...p} />,
    chevR: <path d="M9 6l6 6-6 6" {...p} />,
    chevD: <path d="M6 9l6 6 6-6" {...p} />,
    check: <path d="M5 12.5 9.5 17 19 6.5" {...p} />,
    star: <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9L12 3.5Z" fill={fill ? color : 'none'} stroke={color} strokeWidth={sw} strokeLinejoin="round" />,
    sparkle: <><path d="M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6L12 4Z" fill={fill ? color : 'none'} stroke={color} strokeWidth={sw} strokeLinejoin="round" /><path d="M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8Z" fill={color} stroke="none" /></>,
    message: <path d="M5 5h14v10H9l-4 3.5V5Z" {...p} />,
    mail: <><rect x="3.5" y="5.5" width="17" height="13" rx="2.4" {...p} /><path d="M4.5 7.5 12 13l7.5-5.5" {...p} /></>,
    calendar: <><rect x="4" y="5.5" width="16" height="14" rx="2.6" {...p} /><path d="M4 9.5h16M8 4v3M16 4v3" {...p} /></>,
    heart: <path d="M12 19.5C6 15.5 4 12.5 4 9.6 4 7.3 5.9 5.5 8.1 5.5c1.5 0 2.9.8 3.9 2.1 1-1.3 2.4-2.1 3.9-2.1C18.1 5.5 20 7.3 20 9.6c0 2.9-2 5.9-8 9.9Z" fill={fill ? color : 'none'} stroke={color} strokeWidth={sw} strokeLinejoin="round" />,
    clock: <><circle cx="12" cy="12" r="7.5" {...p} /><path d="M12 8v4.2l2.6 1.6" {...p} /></>,
    minus: <path d="M5 12h14" {...p} />,
    archive: <><rect x="4" y="6" width="16" height="4" rx="1.4" {...p} /><path d="M5.5 10v8.5h13V10M10 14h4" {...p} /></>,
    // tabs
    home: <path d="M4 11l8-6 8 6v8.5h-5V14h-6v5.5H4V11Z" {...p} />,
    people: <><circle cx="9" cy="9" r="3" {...p} /><path d="M3.5 19c0-3 2.5-4.8 5.5-4.8s5.5 1.8 5.5 4.8" {...p} /><path d="M16 7.2a3 3 0 0 1 0 5.6M16.8 14.4c2.3.3 3.9 1.9 3.9 4.1" {...p} /></>,
    briefcase: <><rect x="3.5" y="8" width="17" height="11" rx="2.2" {...p} /><path d="M8.5 8V6.5A1.5 1.5 0 0 1 10 5h4a1.5 1.5 0 0 1 1.5 1.5V8" {...p} /></>,
    bars: <path d="M5 19V11M12 19V5M19 19v-5" {...p} />,
    gear: <><circle cx="12" cy="12" r="2.8" {...p} /><path d="M12 3.5v2.2M12 18.3v2.2M5.5 5.5l1.6 1.6M16.9 16.9l1.6 1.6M3.5 12h2.2M18.3 12h2.2M5.5 18.5l1.6-1.6M16.9 7.1l1.6-1.6" {...p} /></>,
    person: <><circle cx="12" cy="8.5" r="3.6" {...p} /><path d="M5 19.5c0-3.6 3.1-6 7-6s7 2.4 7 6" {...p} /></>,
    flame: <path d="M12 3.5c.5 2.5-1.5 3.7-1.5 6 0 1.1.7 2 1.5 2 1.2 0 1.8-1 1.8-1 1.4 1.2 2.2 2.8 2.2 4.3A6 6 0 0 1 6 15c0-3 2.5-4.7 3-7.5.3-1.8 1.5-3 3-4Z" {...p} />,
    send: <path d="M20 4 9.5 14.5M20 4l-6.5 16-3.5-7.5L3 9l17-5Z" {...p} />,
    dots: <><circle cx="5" cy="12" r="1.6" fill={color} stroke="none" /><circle cx="12" cy="12" r="1.6" fill={color} stroke="none" /><circle cx="19" cy="12" r="1.6" fill={color} stroke="none" /></>,
    pencil: <path d="M4 20h4L18.5 9.5a2 2 0 0 0 0-2.8l-1.2-1.2a2 2 0 0 0-2.8 0L4 16v4Z" {...p} />,
    trash: <path d="M5 7h14M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M6.5 7l.8 11.2a1.6 1.6 0 0 0 1.6 1.5h6.2a1.6 1.6 0 0 0 1.6-1.5L17.5 7" {...p} />,
    tag: <><path d="M4 11.5V5.5A1.5 1.5 0 0 1 5.5 4h6l8 8a1.5 1.5 0 0 1 0 2.1l-5.4 5.4a1.5 1.5 0 0 1-2.1 0l-8-8Z" {...p} /><circle cx="8.5" cy="8.5" r="1.4" fill={color} stroke="none" /></>,
    rotate: <path d="M19 12a7 7 0 1 1-2-4.9M19 4v3.5h-3.5" {...p} />,
    lock: <><rect x="5" y="11" width="14" height="9" rx="2.2" {...p} /><path d="M8 11V8.5a4 4 0 0 1 8 0V11" {...p} /></>,
    arrowUpRight: <path d="M7 17 17 7M8.5 7H17v8.5" {...p} />,
    image: <><rect x="4" y="5" width="16" height="14" rx="2.4" {...p} /><circle cx="9" cy="10" r="1.6" {...p} /><path d="M5 17l4.5-4 3 2.5L16 12l3 3" {...p} /></>,
    moon: <path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a6 6 0 1 0 9.5 9.5Z" {...p} />,
    sun: <><circle cx="12" cy="12" r="4" {...p} /><path d="M12 3v2M12 19v2M5 5l1.5 1.5M17.5 17.5 19 19M3 12h2M19 12h2M5 19l1.5-1.5M17.5 6.5 19 5" {...p} /></>,
    phone: <path d="M6 4h3l1.5 4.5L8.5 10a11 11 0 0 0 5 5l1.5-2 4.5 1.5V18a2 2 0 0 1-2 2A14 14 0 0 1 4 6a2 2 0 0 1 2-2Z" {...p} />,
    download: <path d="M12 4v10m0 0 4-4m-4 4-4-4M5 19h14" {...p} />,
    refresh: <path d="M19 12a7 7 0 1 1-2-4.9M19 4v3.5h-3.5" {...p} />,
    crown: <path d="M4 8l3.5 3L12 5l4.5 6L20 8l-1.5 10h-13L4 8Z" {...p} />,
    logout: <path d="M9 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3M16 8l4 4-4 4M20 12H9" {...p} />,
    user: <><circle cx="12" cy="8.5" r="3.6" {...p} /><path d="M5 19.5c0-3.6 3.1-6 7-6s7 2.4 7 6" {...p} /></>,
    palette: <><path d="M12 3.5a8.5 8.5 0 0 0 0 17c1.4 0 2-1 2-2 0-1.4 1-2 2-2h1.5a2.5 2.5 0 0 0 2.5-2.5C20 7 16.4 3.5 12 3.5Z" {...p} /><circle cx="8" cy="11" r="1.2" fill={color} stroke="none" /><circle cx="12" cy="8" r="1.2" fill={color} stroke="none" /><circle cx="16" cy="11" r="1.2" fill={color} stroke="none" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block', flexShrink: 0, ...style }}>{paths[name]}</svg>;
}

// ── Avatar with relationship-type ring ────────────────────────
function Avatar({ name, type, size = 46, ring = true }) {
  const col = CAT[type] || C.accent;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      padding: ring ? 2.5 : 0, background: ring ? `conic-gradient(${col}, ${hexA(col, 0.45)}, ${col})` : 'transparent',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: '100%', height: '100%', borderRadius: '50%', background: hexA(col, 0.12),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: col, fontFamily: FONT, fontWeight: 700, fontSize: size * 0.34, letterSpacing: 0.2,
        border: ring ? `2px solid ${C.surface}` : 'none',
      }}>{initialsOf(name)}</div>
    </div>
  );
}

// ── status dot ────────────────────────────────────────────────
function StatusDot({ status, size = 8 }) {
  const col = bandColor(status);
  return <span style={{ width: size, height: size, borderRadius: '50%', background: col, flexShrink: 0, boxShadow: status === 'overdue' ? `0 0 0 3px ${hexA(col, 0.16)}` : 'none' }} />;
}

// ── stars (interactive) ───────────────────────────────────────
function StarRating({ value, onChange, size = 26, readOnly = false }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} disabled={readOnly} onClick={() => onChange && onChange(n)} style={{
          background: 'none', border: 'none', padding: 0, cursor: readOnly ? 'default' : 'pointer',
          lineHeight: 0, transition: 'transform .1s', transform: 'scale(1)',
        }}>
          <Icon name="star" size={size} color={n <= value ? C.accent : C.ink3} fill={n <= value} sw={1.6} />
        </button>
      ))}
    </div>
  );
}

// ── custom slider ─────────────────────────────────────────────
function Slider({ value, min, max, onChange, color = C.accent }) {
  const ref = useRef(null);
  const pct = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const set = useCallback((clientX) => {
    const r = ref.current.getBoundingClientRect();
    let p = (clientX - r.left) / r.width; p = Math.max(0, Math.min(1, p));
    onChange(Math.round(min + p * (max - min)));
  }, [min, max, onChange]);
  const onDown = (e) => {
    e.preventDefault();
    const move = (ev) => set((ev.touches ? ev.touches[0] : ev).clientX);
    move(e.nativeEvent);
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  };
  return (
    <div ref={ref} onPointerDown={onDown} style={{ position: 'relative', height: 28, display: 'flex', alignItems: 'center', cursor: 'pointer', touchAction: 'none' }}>
      <div style={{ height: 6, borderRadius: 99, background: C.border, width: '100%' }} />
      <div style={{ position: 'absolute', left: 0, height: 6, borderRadius: 99, background: color, width: `${pct * 100}%` }} />
      <div style={{
        position: 'absolute', left: `calc(${pct * 100}% - 11px)`, width: 22, height: 22, borderRadius: '50%',
        background: '#fff', boxShadow: '0 2px 8px rgba(13,21,38,0.22)', border: `2px solid ${color}`,
      }} />
    </div>
  );
}

// ── Cadence control (stars + always-visible day slider) ───────
function CadenceControl({ stars, cadence, onStars, onCadence, dark = false }) {
  const def = defaultCadence(stars);
  const isCustom = cadence !== def;
  const ink = dark ? '#fff' : C.ink;
  const ink2 = dark ? hexA('#FFFFFF', 0.6) : C.ink2;
  return (
    <div style={{ fontFamily: FONT }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: 0.2, color: ink2, textTransform: 'uppercase' }}>Priority</span>
        <StarRating value={stars} onChange={(n) => { onStars(n); onCadence(defaultCadence(n)); }} size={24} />
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: 0.2, color: ink2, textTransform: 'uppercase' }}>Reach out every</span>
        <span style={{
          fontSize: 12, fontWeight: 600, color: isCustom ? C.accent : ink2,
          background: isCustom ? hexA(C.accent, dark ? 0.22 : 0.1) : 'transparent', padding: isCustom ? '3px 9px' : 0, borderRadius: 99,
        }}>{isCustom ? 'Custom' : `Default · ${stars}★`}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Stepper value={cadence} onChange={onCadence} min={1} max={60} dark={dark} />
        <div style={{ flex: 1 }}>
          <Slider value={cadence} min={1} max={60} onChange={onCadence} />
        </div>
      </div>
      <div style={{ textAlign: 'center', marginTop: 12 }}>
        <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 26, color: ink }}>{cadence}</span>
        <span style={{ fontSize: 15, color: ink2, marginLeft: 6 }}>day{cadence === 1 ? '' : 's'}</span>
      </div>
    </div>
  );
}

function Stepper({ value, onChange, min, max, dark }) {
  const bg = dark ? hexA('#FFFFFF', 0.12) : C.elevated;
  const bc = dark ? '#fff' : C.ink;
  const btn = (name, d) => (
    <button onClick={() => onChange(Math.max(min, Math.min(max, value + d)))} style={{
      width: 34, height: 34, borderRadius: 10, border: 'none', background: bg, cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}><Icon name={d < 0 ? 'minus' : 'plus'} size={18} color={bc} sw={2.2} /></button>
  );
  return <div style={{ display: 'flex', gap: 8 }}>{btn('minus', -1)}{btn('plus', 1)}</div>;
}

// ── small pill chip ───────────────────────────────────────────
function Chip({ label, active, onClick, count }) {
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 15px', borderRadius: 99,
      border: active ? 'none' : `1px solid ${C.border}`, background: active ? C.ink : C.surface, cursor: 'pointer',
      fontFamily: FONT, fontWeight: 600, fontSize: 14, color: active ? '#fff' : C.ink2, whiteSpace: 'nowrap',
      transition: 'all .15s',
    }}>
      {label}
      {count != null && <span style={{ fontSize: 12, fontWeight: 700, color: active ? hexA('#fff', 0.7) : C.ink3 }}>{count}</span>}
    </button>
  );
}

// ── reusable card ─────────────────────────────────────────────
function Card({ children, style, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: C.surface, borderRadius: 20, border: `1px solid ${C.hair}`,
      boxShadow: '0 2px 16px rgba(28,17,8,0.07)', ...style,
    }}>{children}</div>
  );
}

Object.assign(window, {
  C, CAT, FONT, CADENCE_BY_STARS, defaultCadence, computeStatus, bandColor, bandLabel,
  hexA, initialsOf, hashColor, SAMPLE, withStatus, enrich, healthScore, scoreLabel,
  OPP_STATUS, OPP_PRIORITY, OPP_CATEGORIES, oppState, opportunityScore, oppScoreLabel,
  deadlineColor, deadlineLabel, SAMPLE_OPPS,
  Icon, Avatar, StatusDot, StarRating, Slider, CadenceControl, Stepper, Chip, Card,
});
