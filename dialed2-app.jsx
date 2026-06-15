// dialed2-app.jsx — refocused Dialed: two swipeable panes (Network · Inbox),
// no bottom tab bar. Segmented control where the old Maintain/Learn toggle was.
// Shared contacts + email state; replying resets a contact's cadence.

function Wordmark2() {
  return (
    <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 24, letterSpacing: 1.2 }}>
      <span style={{ color: C.ink }}>DI</span><span style={{ color: C.accent }}>AL</span><span style={{ color: C.ink }}>ED</span>
    </div>);

}

function Segmented({ active, setActive, waiting }) {
  const tabs = [['Network', 0], ['Inbox', 1]];
  return (
    <div style={{ padding: '8px 18px 10px' }}>
      <div style={{ position: 'relative', display: 'flex', background: C.elevated, borderRadius: 14, padding: 4 }}>
        <div style={{ position: 'absolute', top: 4, bottom: 4, width: 'calc(50% - 8px)', left: active === 0 ? 4 : 'calc(50% + 4px)', background: C.surface, borderRadius: 11, boxShadow: '0 1px 4px rgba(13,21,38,0.12)', transition: 'left .28s cubic-bezier(.5,1.2,.5,1)' }} />
        {tabs.map(([label, i]) =>
        <button key={label} onClick={() => setActive(i)} style={{ position: 'relative', zIndex: 1, flex: 1, height: 40, border: 'none', background: 'none', cursor: 'pointer', fontFamily: FONT, fontWeight: 600, fontSize: 15, color: active === i ? C.ink : C.ink2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, transition: 'color .2s' }}>
            {label}
            {label === 'Inbox' && waiting > 0 &&
          <span style={{ minWidth: 19, height: 19, padding: '0 5px', borderRadius: 99, background: C.overdue, color: '#fff', fontFamily: FONT, fontWeight: 700, fontSize: 11, lineHeight: '19px', textAlign: 'center' }}>{waiting}</span>
          }
          </button>
        )}
      </div>
    </div>);

}

// horizontally swipeable two-pane deck (vertical scroll preserved via pan-y)
function SwipeDeck({ active, setActive, children }) {
  const panes = React.Children.toArray(children);
  const ref = useRef(null);
  const drag = useRef(null);
  const [dx, setDx] = useState(0);

  const down = (e) => {const p = e.touches ? e.touches[0] : e;drag.current = { x0: p.clientX, y0: p.clientY, axis: null };};
  const move = (e) => {
    if (!drag.current) return;
    const p = e.touches ? e.touches[0] : e;
    const ddx = p.clientX - drag.current.x0,ddy = p.clientY - drag.current.y0;
    if (!drag.current.axis && (Math.abs(ddx) > 8 || Math.abs(ddy) > 8)) drag.current.axis = Math.abs(ddx) > Math.abs(ddy) ? 'x' : 'y';
    if (drag.current.axis === 'x') {
      let d = ddx;
      if (active === 0 && d > 0 || active === 1 && d < 0) d *= 0.3; // resist past the ends
      setDx(d);
    }
  };
  const up = () => {
    if (drag.current && drag.current.axis === 'x' && ref.current) {
      const w = ref.current.offsetWidth;
      if (dx < -w * 0.25 && active === 0) setActive(1);else
      if (dx > w * 0.25 && active === 1) setActive(0);
    }
    drag.current = null;setDx(0);
  };

  const base = -active * 50;
  const dragPct = ref.current ? dx / ref.current.offsetWidth * 50 : 0;
  const dragging = drag.current && drag.current.axis === 'x';
  return (
    <div ref={ref} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
    style={{ flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative', touchAction: 'pan-y' }}>
      <div style={{ display: 'flex', height: '100%', width: '200%', transform: `translateX(${base + dragPct}%)`, transition: dragging ? 'none' : 'transform .32s cubic-bezier(.4,0,.2,1)' }}>
        {panes.map((pane, i) => <div key={i} style={{ width: '50%', height: '100%' }}>{pane}</div>)}
      </div>
    </div>);

}

function LiteApp() {
  const [contacts, setContacts] = useState(() => {
    try {const s = JSON.parse(localStorage.getItem('dialed2_contacts') || 'null');if (s && s.length) return s;} catch {}
    return SAMPLE;
  });
  useEffect(() => {localStorage.setItem('dialed2_contacts', JSON.stringify(contacts));}, [contacts]);

  const [handled, setHandled] = useState(() => {
    try {return JSON.parse(localStorage.getItem('dialed2_handled') || '[]');} catch {return [];}
  });
  useEffect(() => {localStorage.setItem('dialed2_handled', JSON.stringify(handled));}, [handled]);

  const [active, setActive] = useState(0);
  const [compose, setCompose] = useState(null); // { contact, email }
  const [addOpen, setAddOpen] = useState(false);
  const [allOpen, setAllOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [detailId, setDetailId] = useState(null);

  const enriched = enrich(contacts);
  const byId = (id) => enriched.find((c) => c.id === id);
  const liveEmails = EMAIL_SAMPLE.filter((e) => !handled.includes(e.id));
  const waiting = liveEmails.length;

  const reachedOut = (id) => setContacts((prev) => prev.map((c) => c.id === id ? { ...c, daysSince: 0, pending: false } : c));
  const openEmail = (e) => setCompose({ contact: byId(e.contactId), email: e });
  const composeTo = (c) => setCompose({ contact: c, email: null });
  const sendCompose = () => {
    if (!compose) return;
    if (compose.email) setHandled((prev) => prev.includes(compose.email.id) ? prev : [...prev, compose.email.id]);
    if (compose.contact) reachedOut(compose.contact.id);
    setCompose(null);
  };

  const saveContact = (form) => {
    const id = Math.max(0, ...contacts.map((c) => c.id)) + 1;
    setContacts((prev) => [...prev, { ...form, id, daysSince: 0, fav: false, pending: false }]);
    setAddOpen(false);
  };

  const updateContact = (updated) => setContacts((prev) => prev.map((c) => c.id === updated.id ? { ...c, ...updated } : c));
  const openContact = (id) => setDetailId(id);
  const detailContact = detailId != null ? byId(detailId) : null;

  return (
    <div style={{ minHeight: '100vh', background: '#DDE3F0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '28px 0', fontFamily: FONT }}>
      <IOSDevice width={390} height={820}>
        <div style={{ position: 'absolute', inset: 0, paddingTop: 58 }}>
          <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', background: C.bg, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 18px 2px' }}>
              <Wordmark2 />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button onClick={() => setAllOpen(true)} aria-label="All contacts" style={{ width: 34, height: 34, borderRadius: '50%', border: `1px solid ${C.border}`, cursor: 'pointer', background: C.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 0 }}>
                  <Icon name="people" size={18} color={C.ink} />
                </button>
                <button onClick={() => setAddOpen(true)} aria-label="Add contact" style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', cursor: 'pointer', background: C.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 0 }}>
                  <Icon name="plus" size={19} color="#fff" sw={2.4} />
                </button>
                <button onClick={() => setSettingsOpen(true)} aria-label="Your account" style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', cursor: 'pointer', background: hexA(C.accent, 0.14), display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontWeight: 700, fontSize: 13, color: C.accent, padding: 0 }}>{initialsOf('Alex Kim')}</button>
              </div>
            </div>

            <Segmented active={active} setActive={setActive} waiting={waiting} />

            <SwipeDeck active={active} setActive={setActive}>
              <NetworkPane contacts={enriched} waiting={waiting} onReachedOut={reachedOut} onCompose={composeTo} onOpenContact={openContact} onGoInbox={() => setActive(1)} />
              <InboxPane contacts={enriched} emails={liveEmails} handledToday={handled.length} onOpen={openEmail} />
            </SwipeDeck>

            {compose && <ComposeView contact={compose.contact} email={compose.email} onClose={() => setCompose(null)} onSend={sendCompose} />}
            {addOpen && <AddConnectionScreen onClose={() => setAddOpen(false)} onSave={saveContact} />}
            {allOpen && <AllContactsScreen contacts={enriched} onClose={() => setAllOpen(false)} onOpen={(id) => {setAllOpen(false);openContact(id);}} onAdd={() => {setAllOpen(false);setAddOpen(true);}} />}
            {detailContact && <div style={{ position: 'absolute', inset: 0, zIndex: 70, background: C.bg, animation: 'dl-slide-in .3s cubic-bezier(.25,.9,.25,1)' }}><ContactDetailScreen contact={detailContact} onBack={() => setDetailId(null)} onTalked={reachedOut} onUpdate={updateContact} /></div>}
            {settingsOpen && <SettingsScreen onClose={() => setSettingsOpen(false)} />}
          </div>
        </div>
      </IOSDevice>
    </div>);

}

ReactDOM.createRoot(document.getElementById('root')).render(<LiteApp />);