// onboarding-plan.jsx — stub (building/thanks/features steps removed from flow)
function BuildingScreen({ onDone }) { useEffect(() => { if (onDone) onDone(); }, []); return null; }
function ThankYouScreen({ onNext }) { useEffect(() => { if (onNext) onNext(); }, []); return null; }
function FeaturesScreen({ onNext }) { useEffect(() => { if (onNext) onNext(); }, []); return null; }
Object.assign(window, { BuildingScreen, ThankYouScreen, FeaturesScreen });
