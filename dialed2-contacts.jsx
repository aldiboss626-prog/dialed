// dialed2-contacts.jsx — All Contacts full-screen page + the shared IconBtn
// and ContactRow (ported from the original Network screen so the list and the
// reused ContactDetailScreen look exactly like the other app).

function IconBtn({ children, onClick, badge, square }) {
  return (
    <button onClick={onClick} style={{
      width: 44, height: 44, borderRadius: square ? 14 : '50%', border: `1px solid ${C.border}`, background: C.surface,
      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative',
    }}>
      {children}
      {badge > 0 &&
      <span style={{
        position: 'absolute', top: -3, right: -3, minWidth: 18, height: 18, padding: '0 5px', borderRadius: 99,
        background: C.overdue, color: '#fff', fontFamily: FONT, fontWeight: 700, fontSize: 11,
        display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${C.bg}`,
      }}>{badge}</span>}
    </button>
  );
}

// unified contact row — identical to the original Network list row
function ContactRow({ c, onOpen }) {
  const col = bandColor(c.status);
  return (
    <div onClick={() => onOpen(c.id)} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 16px', cursor: 'pointer', position: 'relative' }}>
      <div style={{ position: 'absolute', left: 0, top: 10, bottom: 10, width: 3.5, borderRadius: 99, background: col, opacity: c.status === 'good' ? 0.35 : 1 }} />
      <Avatar name={c.name} type={c.type} size={46} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 15.5, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
          {c.fav && <Icon name="heart" size={13} color={C.accent} fill sw={1.5} />}
        </div>
        <div style={{ fontFamily: FONT, fontSize: 13, color: C.ink2, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {c.title} · {c.company}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}>
          <StatusDot status={c.status} size={7} />
          <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 14, color: col }}>{c.daysSince}d</span>
        </div>
        <div style={{ fontFamily: FONT, fontSize: 11.5, color: C.ink3, marginTop: 2 }}>{c.cadence}d cadence</div>
      </div>
    </div>
  );
}

// ── All Contacts full-screen page ─────────────────────────────
function AllContactsScreen({ contacts, onClose, onOpen, onAdd }) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('urgency'); // urgency | name
  const ql = q.trim().toLowerCase();
  let list = contacts.filter((c) =>
    !ql || c.name.toLowerCase().includes(ql) || (c.company || '').toLowerCase().includes(ql) || (c.title || '').toLowerCase().includes(ql));
  if (sort === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name));
  // contacts arrive pre-sorted by urgency from enrich(); keep that for 'urgency'

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 60, background: C.bg, display: 'flex', flexDirection: 'column', animation: 'dl-slide-in .3s cubic-bezier(.25,.9,.25,1)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', lineHeight: 0 }}><Icon name="chevL" size={24} color={C.ink} sw={2.2} /></button>
          <h1 style={{ margin: 0, fontFamily: FONT, fontWeight: 700, fontSize: 24, color: C.ink, letterSpacing: -0.4 }}>All contacts</h1>
        </div>
        <IconBtn onClick={onAdd}><Icon name="plus" size={22} color={C.ink} sw={2.2} /></IconBtn>
      </div>

      <div style={{ padding: '10px 18px 4px', display: 'flex', gap: 10 }}>
        <div style={{ flex: 1, height: 44, borderRadius: 14, border: `1px solid ${C.border}`, background: C.surface, display: 'flex', alignItems: 'center', gap: 9, padding: '0 14px' }}>
          <Icon name="search" size={18} color={C.ink3} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search contacts" style={{ flex: 1, border: 'none', outline: 'none', background: 'none', fontFamily: FONT, fontSize: 15, color: C.ink }} />
        </div>
        <button onClick={() => setSort((s) => s === 'urgency' ? 'name' : 'urgency')} style={{ height: 44, padding: '0 14px', borderRadius: 14, border: `1px solid ${C.border}`, background: C.surface, cursor: 'pointer', fontFamily: FONT, fontWeight: 600, fontSize: 13.5, color: C.ink2, whiteSpace: 'nowrap' }}>
          {sort === 'urgency' ? 'Urgency' : 'A–Z'}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 18px 28px' }}>
        <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 12.5, letterSpacing: 0.8, textTransform: 'uppercase', color: C.ink2, padding: '2px 2px 10px' }}>{list.length} {list.length === 1 ? 'person' : 'people'}</div>
        {list.length === 0 ?
        <Card style={{ padding: '40px 24px', textAlign: 'center' }}>
            <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 16, color: C.ink }}>No matches</div>
            <div style={{ fontFamily: FONT, fontSize: 13.5, color: C.ink2, marginTop: 4 }}>Try a different search.</div>
          </Card> :
        <Card style={{ padding: '2px 0' }}>
            {list.map((c, i) =>
          <div key={c.id} style={{ borderTop: i === 0 ? 'none' : `1px solid ${C.border}` }}>
                <ContactRow c={c} onOpen={onOpen} />
              </div>
          )}
          </Card>
        }
      </div>
    </div>
  );
}

Object.assign(window, { IconBtn, ContactRow, AllContactsScreen });
