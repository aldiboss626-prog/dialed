// tweaks-panel.jsx — minimal stub so onboarding-app loads without the dev panel
function useTweaks(defaults) {
  const [t, setT] = useState(defaults);
  const setTweak = (k, v) => setT(prev => ({ ...prev, [k]: v }));
  return [t, setTweak];
}
function TweaksPanel() { return null; }
function TweakSection() { return null; }
function TweakColor() { return null; }
function TweakToggle() { return null; }
function TweakSelect() { return null; }
function TweakButton() { return null; }
Object.assign(window, { useTweaks, TweaksPanel, TweakSection, TweakColor, TweakToggle, TweakSelect, TweakButton });
