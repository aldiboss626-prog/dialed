// onboarding-questions.jsx — name + single/multi-select profile questions.
// (The Welcome screen now lives in onboarding-welcome.jsx.)

// ── Name ──────────────────────────────────────────────────────────────────
function NameScreen({ accent, header, value, onChange, onNext }) {
  const ok = value.trim().length > 0;
  return (
    <StepScaffold header={header} footer={<Reveal delay={260}><OnbPrimary label="Continue" accent={accent} disabled={!ok} onClick={onNext} /></Reveal>}>
      <div style={{ padding: '26px 24px 0' }}>
        <Reveal><Eyebrow color={accent}>Let’s get acquainted</Eyebrow></Reveal>
        <Reveal delay={80}><Title style={{ marginTop: 14 }}>First — what should we call you?</Title></Reveal>
        <Reveal delay={150}><Subtitle>It’s just for you. Every reminder and draft Dialed writes will sound like it came from you.</Subtitle></Reveal>
        <Reveal delay={230}>
          <div style={{ marginTop: 26 }}>
            <OnbField value={value} onChange={onChange} placeholder="Your first name" icon="person" autoFocus onEnter={() => ok && onNext()} />
          </div>
        </Reveal>
      </div>
    </StepScaffold>
  );
}

// ── single / multi-select question ────────────────────────────────────────
function ChoiceScreen({ accent, header, eyebrow, title, subtitle, options, values, multi = false, onToggle, onNext }) {
  const norm = options.map(o => typeof o === 'string' ? { label: o } : o);
  const count = values.length;
  return (
    <StepScaffold header={header} footer={
      <Reveal delay={120}><OnbPrimary label={multi && count ? `Continue · ${count} selected` : 'Continue'} accent={accent} disabled={count === 0} onClick={onNext} /></Reveal>
    }>
      <div style={{ padding: '18px 22px 4px' }}>
        <Reveal><Eyebrow color={accent}>{eyebrow}</Eyebrow></Reveal>
        <Reveal delay={70}><Title style={{ marginTop: 12, fontSize: 24 }}>{title}</Title></Reveal>
        {(subtitle || multi) && <Reveal delay={130}><Subtitle style={{ marginTop: 8, fontSize: 14.5 }}>{subtitle || 'Pick all that apply — most people have a few.'}</Subtitle></Reveal>}
      </div>
      <div style={{ padding: '12px 22px 6px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {norm.map((o, i) => (
          <Reveal key={o.label} delay={160 + i * 50} y={12}>
            <OptionRow label={o.label} sub={o.sub} icon={o.icon} multi={multi}
              selected={values.includes(o.label)} accent={accent} onClick={() => onToggle(o.label)} />
          </Reveal>
        ))}
      </div>
    </StepScaffold>
  );
}

Object.assign(window, { NameScreen, ChoiceScreen });
