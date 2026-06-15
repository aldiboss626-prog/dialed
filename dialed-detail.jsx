// dialed-detail.jsx — ContactDetailScreen + AddConnectionScreen

function ContactDetailScreen({ contact, onBack, onTalked, onUpdate }) {
  if (!contact) return null;
  const col = bandColor(contact.status);
  const [note, setNote] = useState(contact.note || '');
  const [editing, setEditing] = useState(false);

  const saveNote = () => { onUpdate && onUpdate({ ...contact, note }); setEditing(false); };

  return (
    <div style={{ position: 'absolute', inset: 0, background: C.bg, display: 'flex', flexDirection: 'column', paddingTop: 58, animation: 'dl-slide-in .3s cubic-bezier(.25,.9,.25,1)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px 6px' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', lineHeight: 0 }}>
          <Icon name="chevL" size={24} color={C.ink} sw={2.2} />
        </button>
        <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 18, color: C.ink, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contact.name}</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 18px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* profile card */}
        <Card style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Avatar name={contact.name} type={contact.type} size={58} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 20, color: C.ink, letterSpacing: -0.3 }}>{contact.name}</div>
              {(contact.title || contact.company) && (
                <div style={{ fontFamily: FONT, fontSize: 13.5, color: C.ink2, marginTop: 3 }}>
                  {[contact.title, contact.company].filter(Boolean).join(' · ')}
                </div>
              )}
            </div>
          </div>
          <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 12, background: hexA(col, 0.08), display: 'flex', alignItems: 'center', gap: 8 }}>
            <StatusDot status={contact.status} size={8} />
            <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 13, color: col }}>
              {contact.daysSince === 0 ? 'Just talked' : `Last contact ${contact.daysSince}d ago`} · every {contact.cadence}d
            </span>
          </div>
        </Card>

        {/* we talked */}
        <button onClick={() => onTalked(contact.id)} style={{ width: '100%', height: 52, borderRadius: 16, border: 'none', background: C.ink, color: '#fff', fontFamily: FONT, fontWeight: 700, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Icon name="check" size={18} color="#fff" sw={2.6} />We talked
        </button>

        {/* notes */}
        <Card style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 13, letterSpacing: 0.5, textTransform: 'uppercase', color: C.ink3 }}>Notes</div>
            <button onClick={() => editing ? saveNote() : setEditing(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: FONT, fontWeight: 600, fontSize: 13, color: C.accent, padding: 0 }}>{editing ? 'Save' : 'Edit'}</button>
          </div>
          {editing
            ? <textarea value={note} onChange={e => setNote(e.target.value)} rows={4} style={{ width: '100%', border: `1.5px solid ${C.border}`, borderRadius: 10, padding: '10px 12px', fontFamily: FONT, fontSize: 14, color: C.ink, background: C.elevated, resize: 'none', outline: 'none' }} />
            : <div style={{ fontFamily: FONT, fontSize: 14, color: note ? C.ink : C.ink3, lineHeight: 1.5 }}>{note || 'No notes yet — tap Edit to add one.'}</div>
          }
        </Card>

        {/* cadence */}
        <Card style={{ padding: 16 }}>
          <CadenceControl stars={contact.stars} cadence={contact.cadence}
            onStars={n => onUpdate && onUpdate({ ...contact, stars: n, cadence: defaultCadence(n) })}
            onCadence={n => onUpdate && onUpdate({ ...contact, cadence: n })} />
        </Card>
      </div>
    </div>
  );
}

function AddConnectionScreen({ onClose, onSave }) {
  const [form, setForm] = useState({ name: '', type: 'Friend', stars: 3, cadence: 14, title: '', company: '' });
  const ok = form.name.trim().length > 0;
  const types = ['Friend', 'Mentor', 'Recruiter', 'Professor'];

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 65, background: C.bg, display: 'flex', flexDirection: 'column', paddingTop: 58, animation: 'dl-sheet-up .3s cubic-bezier(.25,.9,.25,1)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px 6px' }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', lineHeight: 0 }}><Icon name="close" size={24} color={C.ink} /></button>
        <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 18, color: C.ink }}>Add contact</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 18px 8px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Card style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[['name', 'Full name', 'text'], ['title', 'Title (optional)', 'text'], ['company', 'Company (optional)', 'text']].map(([key, ph, type]) => (
            <input key={key} value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} placeholder={ph} type={type}
              style={{ height: 48, padding: '0 14px', border: `1.5px solid ${C.border}`, borderRadius: 12, fontFamily: FONT, fontSize: 15, color: C.ink, outline: 'none', background: C.elevated, width: '100%' }} />
          ))}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {types.map(t => (
              <button key={t} onClick={() => setForm(p => ({ ...p, type: t }))} style={{ height: 34, padding: '0 14px', borderRadius: 99, border: `1.5px solid ${form.type === t ? C.accent : C.border}`, background: form.type === t ? hexA(C.accent, 0.08) : 'transparent', fontFamily: FONT, fontWeight: 600, fontSize: 13, color: form.type === t ? C.accent : C.ink2, cursor: 'pointer' }}>{t}</button>
            ))}
          </div>
        </Card>
        <Card style={{ padding: 16 }}>
          <CadenceControl stars={form.stars} cadence={form.cadence}
            onStars={n => setForm(p => ({ ...p, stars: n, cadence: defaultCadence(n) }))}
            onCadence={n => setForm(p => ({ ...p, cadence: n }))} />
        </Card>
      </div>
      <div style={{ padding: '12px 18px 28px' }}>
        <button disabled={!ok} onClick={() => onSave(form)} style={{ width: '100%', height: 52, borderRadius: 16, border: 'none', background: ok ? C.accent : C.border, color: ok ? '#fff' : C.ink3, fontFamily: FONT, fontWeight: 700, fontSize: 16, cursor: ok ? 'pointer' : 'default', transition: 'background .15s' }}>
          Add to network
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { ContactDetailScreen, AddConnectionScreen });
