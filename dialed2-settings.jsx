// dialed2-settings.jsx — the account / settings page for the focused Dialed.
// Opens when you tap your own profile avatar in the header. Matches the blue /
// DM Sans language: slide-in overlay, Card sections, interactive toggles.

function Switch({ on, onToggle }) {
  return (
    <button onClick={onToggle} aria-pressed={on} style={{
      width: 50, height: 30, borderRadius: 99, border: 'none', cursor: 'pointer', flexShrink: 0,
      background: on ? C.accent : C.border, position: 'relative', transition: 'background .2s', padding: 0,
    }}>
      <span style={{ position: 'absolute', top: 3, left: on ? 23 : 3, width: 24, height: 24, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(13,21,38,0.25)', transition: 'left .2s cubic-bezier(.4,0,.2,1)' }} />
    </button>
  );
}

function SettingsLabel({ children }) {
  return <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 12, letterSpacing: 0.9, textTransform: 'uppercase', color: C.ink2, padding: '0 4px 9px' }}>{children}</div>;
}

// a single row inside a Card group
function Row({ icon, iconColor, title, sub, right, onClick, last, danger }) {
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 15px', cursor: onClick ? 'pointer' : 'default', borderTop: last ? 'none' : `1px solid ${C.border}` }}>
      {icon &&
        <div style={{ width: 36, height: 36, borderRadius: 11, flexShrink: 0, background: hexA(iconColor || C.accent, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={20} color={iconColor || C.accent} sw={1.9} />
        </div>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: FONT, fontWeight: 600, fontSize: 15, color: danger ? C.overdue : C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
        {sub && <div style={{ fontFamily: FONT, fontSize: 12.5, color: C.ink2, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</div>}
      </div>
      {right}
    </div>
  );
}

function Chevron() {
  return <Icon name="chevR" size={18} color={C.ink3} sw={2} />;
}

function SettingsScreen({ name = 'Alex Kim', email = 'alex.kim@gmail.com', onClose }) {
  const [prefs, setPrefs] = useState(() => {
    try { const s = JSON.parse(localStorage.getItem('dialed2_settings') || 'null'); if (s) return s; } catch {}
    return { push: true, replyReminders: true, digest: true, quietHours: false };
  });
  useEffect(() => { localStorage.setItem('dialed2_settings', JSON.stringify(prefs)); }, [prefs]);
  const toggle = (k) => setPrefs((p) => ({ ...p, [k]: !p[k] }));

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 80, background: C.bg, display: 'flex', flexDirection: 'column', animation: 'dl-slide-in .3s cubic-bezier(.25,.9,.25,1)' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px 6px', flexShrink: 0 }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', lineHeight: 0 }}><Icon name="chevL" size={24} color={C.ink} sw={2.2} /></button>
        <h1 style={{ margin: 0, fontFamily: FONT, fontWeight: 700, fontSize: 24, color: C.ink, letterSpacing: -0.4 }}>Settings</h1>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 18px 32px' }}>
        {/* profile card */}
        <Card style={{ padding: 18, marginBottom: 22, display: 'flex', alignItems: 'center', gap: 15 }}>
          <div style={{ width: 62, height: 62, borderRadius: '50%', background: hexA(C.accent, 0.14), display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontWeight: 700, fontSize: 22, color: C.accent, flexShrink: 0 }}>{initialsOf(name)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 19, color: C.ink, letterSpacing: -0.3 }}>{name}</div>
            <div style={{ fontFamily: FONT, fontSize: 13.5, color: C.ink2, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{email}</div>
          </div>
          <button style={{ height: 36, padding: '0 15px', borderRadius: 11, border: `1px solid ${C.border}`, background: C.surface, cursor: 'pointer', fontFamily: FONT, fontWeight: 600, fontSize: 13.5, color: C.accent, flexShrink: 0 }}>Edit</button>
        </Card>

        {/* reminders */}
        <SettingsLabel>Reminders</SettingsLabel>
        <Card style={{ padding: '2px 0', marginBottom: 22 }}>
          <Row icon="bell" iconColor={C.accent} title="Push notifications" sub="Nudges when someone’s going cold" last right={<Switch on={prefs.push} onToggle={() => toggle('push')} />} />
          <Row icon="mail" iconColor={C.success} title="Email reply reminders" sub="Resurface emails waiting on you" right={<Switch on={prefs.replyReminders} onToggle={() => toggle('replyReminders')} />} />
          <Row icon="clock" iconColor={C.warning} title="Daily reach-out digest" sub={prefs.digest ? 'Every morning · 8:00 AM' : 'Off'} right={<Switch on={prefs.digest} onToggle={() => toggle('digest')} />} />
        </Card>

        {/* defaults */}
        <SettingsLabel>Cadence defaults</SettingsLabel>
        <Card style={{ padding: '2px 0', marginBottom: 22 }}>
          <Row icon="people" iconColor={C.accent} title="Default reach-out cadence" sub="Used for new contacts" last right={<span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 14, color: C.ink2 }}>14 days</span>} onClick={() => {}} />
          <Row icon="moon" iconColor="#8B5CF6" title="Quiet hours" sub={prefs.quietHours ? 'No nudges 9 PM – 8 AM' : 'Off'} right={<Switch on={prefs.quietHours} onToggle={() => toggle('quietHours')} />} />
        </Card>

        {/* connected accounts */}
        <SettingsLabel>Connected</SettingsLabel>
        <Card style={{ padding: '2px 0', marginBottom: 22 }}>
          <Row icon="mail" iconColor={C.success} title="Gmail" sub={email} last right={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: FONT, fontWeight: 600, fontSize: 12.5, color: C.success }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: C.success }} />Connected</span>} />
          <Row icon="clock" iconColor={C.ink3} title="Calendar" sub="Sync your meetings" onClick={() => {}} right={<span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 13, color: C.accent }}>Connect</span>} />
        </Card>

        {/* about */}
        <SettingsLabel>About</SettingsLabel>
        <Card style={{ padding: '2px 0', marginBottom: 22 }}>
          <Row title="Help &amp; support" last onClick={() => {}} right={<Chevron />} />
          <Row title="Privacy policy" onClick={() => {}} right={<Chevron />} />
          <Row title="Version" right={<span style={{ fontFamily: FONT, fontSize: 13.5, color: C.ink3 }}>2.0.1</span>} />
        </Card>

        <button onClick={onClose} style={{ width: '100%', height: 50, borderRadius: 14, border: `1px solid ${hexA(C.overdue, 0.3)}`, background: hexA(C.overdue, 0.06), cursor: 'pointer', fontFamily: FONT, fontWeight: 700, fontSize: 15, color: C.overdue }}>Sign out</button>
      </div>
    </div>
  );
}

Object.assign(window, { SettingsScreen, Switch });
