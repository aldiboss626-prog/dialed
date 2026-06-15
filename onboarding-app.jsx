// onboarding-app.jsx — streamlined 6-step first-run flow.
// Steps: welcome → name → goal → pains → save (account creation) → paywall

const ACCENT = '#2563EB';

// ordered flow — 6 steps, no fluff
const STEPS = ['welcome', 'name', 'goal', 'pains', 'save', 'paywall'];
const NO_BACK = ['welcome'];

// ── Inline account-creation screen ──────────────────────────────────────────
function SaveProgressScreen({ accent, header, name, onName, email, onEmail, onNext }) {
  const ok = name.trim().length > 0 && email.trim().includes('@');
  return (
    <StepScaffold header={header} footer={
      <Reveal delay={200}><OnbPrimary label="Create my account" accent={accent} disabled={!ok} onClick={onNext} /></Reveal>
    }>
      <div style={{ padding: '26px 24px 0' }}>
        <Reveal><Eyebrow color={accent}>Almost there</Eyebrow></Reveal>
        <Reveal delay={80}><Title style={{ marginTop: 14 }}>Save your progress{name ? `, ${name.split(' ')[0]}` : ''}.</Title></Reveal>
        <Reveal delay={150}><Subtitle>Create your free account to keep everything you've set up here.</Subtitle></Reveal>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 26 }}>
          <Reveal delay={210}><OnbField value={name} onChange={onName} placeholder="Your name" icon="person" /></Reveal>
          <Reveal delay={270}><OnbField value={email} onChange={onEmail} placeholder="Email address" type="email" icon="mail" onEnter={() => ok && onNext()} /></Reveal>
        </div>
      </div>
    </StepScaffold>
  );
}

function OnbApp() {
  const accent = ACCENT;

  const [step, setStep] = useState(() => {
    const s = localStorage.getItem('dialed_onb_step');
    const i = STEPS.indexOf(s);
    return i >= 0 ? i : 0;
  });
  const [profile, setProfile] = useState(() => {
    try { return JSON.parse(localStorage.getItem('dialed_onb_profile') || '{}'); } catch { return {}; }
  });
  const [dir, setDir] = useState(1);

  useEffect(() => { localStorage.setItem('dialed_onb_step', STEPS[step]); }, [step]);
  useEffect(() => { localStorage.setItem('dialed_onb_profile', JSON.stringify(profile)); }, [profile]);

  const set = (patch) => setProfile(p => ({ ...p, ...patch }));
  const go = (i) => { setDir(i > step ? 1 : -1); setStep(Math.max(0, Math.min(STEPS.length - 1, i))); };
  const next = () => go(step + 1);
  const back = () => go(step - 1);
  const jumpTo = (id) => { const i = STEPS.indexOf(id); if (i >= 0) go(i); };

  const finish = () => {
    localStorage.setItem('dialed2_onboarded', '1');
    window.location.href = 'Dialed.html';
  };
  const restart = () => { setProfile({}); localStorage.removeItem('dialed_onb_profile'); go(0); };

  const single = (key) => (label) => set({ [key]: label });
  const arrOf = (key) => Array.isArray(profile[key]) ? profile[key] : (profile[key] ? [profile[key]] : []);

  const id = STEPS[step];
  const progress = step / (STEPS.length - 1);
  const header = (
    <OnbHeader onBack={back} canBack={!NO_BACK.includes(id) && step > 0}
      progress={progress} accent={accent} showProgress={id !== 'welcome'} />
  );

  let screen = null;
  if (id === 'welcome') screen = <WelcomeScreen accent={accent} onStart={next} />;
  else if (id === 'name') screen = <NameScreen accent={accent} header={header} value={profile.name || ''} onChange={(v) => set({ name: v })} onNext={next} />;
  else if (id === 'goal') screen = <ChoiceScreen accent={accent} header={header} eyebrow="Your focus" title="What's your main goal with Dialed?" options={GOAL_OPTS} values={arrOf('goal')} onToggle={single('goal')} onNext={next} />;
  else if (id === 'pains') screen = <PainScreen accent={accent} header={header} selected={profile.pains || []} onToggle={(pid) => setProfile(p => { const cur = p.pains || []; return { ...p, pains: cur.includes(pid) ? cur.filter(x => x !== pid) : [...cur, pid] }; })} onNext={next} />;
  else if (id === 'save') screen = <SaveProgressScreen accent={accent} header={header} name={profile.name || ''} onName={(v) => set({ name: v })} email={profile.email || ''} onEmail={(v) => set({ email: v })} onNext={next} />;
  else if (id === 'paywall') screen = <PaywallScreen accent={accent} header={header} name={profile.name} onComplete={finish} />;

  useEffect(() => { window._onb = { go, jumpTo, restart, steps: STEPS }; });

  return (
    <div style={{ minHeight: '100vh', background: '#F0EBE3', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '28px 0', fontFamily: FONT }}>
      <IOSDevice width={390} height={820}>
        <StepEnter key={id} dir={dir}>
          {screen}
        </StepEnter>
      </IOSDevice>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<OnbApp />);
