// onboarding-app.jsx — flow controller, state, tweaks, mount.
// Renders the full first-run sequence inside the iOS device frame, then hands
// off to the main app (Network Redesign.html).

const ONB_TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accentColor": "#2563EB",
  "systemDialog": true
}/*EDITMODE-END*/;

// ordered flow
const STEPS = ['welcome', 'name', 'age', 'journey', 'goal', 'problem', 'pains', 'cost', 'perm', 'building', 'thanks', 'save', 'features', 'paywall'];
const NO_BACK = ['welcome', 'building', 'thanks'];

function OnbApp() {
  const [t, setTweak] = useTweaks(ONB_TWEAK_DEFAULTS);
  const accent = t.accentColor;

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

  // unified select helpers for ChoiceScreen (single replaces, multi toggles)
  const single = (key) => (label) => set({ [key]: label });
  const arrOf = (key) => Array.isArray(profile[key]) ? profile[key] : (profile[key] ? [profile[key]] : []);
  const toggleMulti = (key) => (label) => {
    setProfile(p => {
      const cur = Array.isArray(p[key]) ? p[key] : (p[key] ? [p[key]] : []);
      return { ...p, [key]: cur.includes(label) ? cur.filter(x => x !== label) : [...cur, label] };
    });
  };

  const id = STEPS[step];
  const progress = step / (STEPS.length - 1);
  const header = (
    <OnbHeader onBack={back} canBack={!NO_BACK.includes(id) && step > 0}
      progress={progress} accent={accent} showProgress={!['welcome', 'building', 'thanks'].includes(id)} />
  );

  let screen = null;
  if (id === 'welcome') screen = <WelcomeScreen accent={accent} onStart={next} />;
  else if (id === 'name') screen = <NameScreen accent={accent} header={header} value={profile.name || ''} onChange={(v) => set({ name: v })} onNext={next} />;
  else if (id === 'age') screen = <ChoiceScreen accent={accent} header={header} eyebrow="About you" title="How old are you?" subtitle="Helps us tune the tone of your reminders." options={AGE_OPTS} values={arrOf('age')} onToggle={single('age')} onNext={next} />;
  else if (id === 'journey') screen = <ChoiceScreen accent={accent} header={header} eyebrow="About you" title="Where are you in your journey?" options={JOURNEY_OPTS} values={arrOf('journey')} onToggle={single('journey')} onNext={next} />;
  else if (id === 'goal') screen = <ChoiceScreen accent={accent} header={header} eyebrow="Your focus" title="What’s your main goal with Dialed?" options={GOAL_OPTS} values={arrOf('goal')} onToggle={single('goal')} onNext={next} />;
  else if (id === 'problem') screen = <ChoiceScreen accent={accent} header={header} multi eyebrow="Your focus" title="Where do your relationships break down?" subtitle="Pick all that apply — most people have more than one." options={PROBLEM_OPTS} values={arrOf('problems')} onToggle={toggleMulti('problems')} onNext={next} />;
  else if (id === 'pains') screen = <PainScreen accent={accent} header={header} selected={profile.pains || []} onToggle={(pid) => setProfile(p => { const cur = p.pains || []; return { ...p, pains: cur.includes(pid) ? cur.filter(x => x !== pid) : [...cur, pid] }; })} onNext={next} />;
  else if (id === 'cost') screen = <CostScreen accent={accent} header={header} name={profile.name} onNext={next} />;
  else if (id === 'perm') screen = <PermissionsScreen accent={accent} systemDialog={t.systemDialog} progressStart={(STEPS.indexOf('perm')) / (STEPS.length - 1)} progressEnd={(STEPS.indexOf('perm') + 1) / (STEPS.length - 1)} onBack={back} onDone={next} />;
  else if (id === 'building') screen = <BuildingScreen accent={accent} name={profile.name} onDone={next} />;
  else if (id === 'thanks') screen = <ThankYouScreen accent={accent} name={profile.name} onNext={next} />;
  else if (id === 'save') screen = <SaveProgressScreen accent={accent} header={header} name={profile.name || ''} onName={(v) => set({ name: v })} email={profile.email || ''} onEmail={(v) => set({ email: v })} onNext={next} />;
  else if (id === 'features') screen = <FeaturesScreen accent={accent} header={header} onNext={next} />;
  else if (id === 'paywall') screen = <PaywallScreen accent={accent} header={header} name={profile.name} onComplete={finish} />;

  // expose nav for review/screenshots
  useEffect(() => { window._onb = { go, jumpTo, restart, steps: STEPS }; });

  return (
    <div style={{ minHeight: '100vh', background: '#DDE3F0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '28px 0', fontFamily: FONT }}>
      <IOSDevice width={390} height={820}>
        <StepEnter key={id} dir={dir}>
          {screen}
        </StepEnter>
      </IOSDevice>

      <TweaksPanel>
        <TweakSection label="Brand" />
        <TweakColor label="Accent" value={t.accentColor} options={['#2563EB', '#0D1526', '#16A34A', '#7C3AED']} onChange={(v) => setTweak('accentColor', v)} />
        <TweakSection label="Permissions" />
        <TweakToggle label="iOS permission dialog" value={t.systemDialog} onChange={(v) => setTweak('systemDialog', v)} />
        <TweakSection label="Flow" />
        <TweakSelect label="Jump to" value={STEPS[step]} options={STEPS} onChange={jumpTo} />
        <TweakButton label="Restart onboarding" onClick={restart} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<OnbApp />);
