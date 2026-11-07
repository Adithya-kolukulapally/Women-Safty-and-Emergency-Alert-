import { useEffect, useRef, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { Activity, ArrowDownLeft, ArrowLeft, ArrowRight, Bell, Check, ChevronDown, Clock3, Heart, HelpCircle, House, LockKeyhole, LogOut, MapPin, Menu, MessageCircle, Plus, Shield, ShieldCheck, Siren, Trash2, Users, X } from 'lucide-react';
import { request } from './api.js';

function readSession() {
  try { return JSON.parse(localStorage.getItem('safeher-session') || 'null'); } catch { return null; }
}

export default function App() {
  const [session, setSession] = useState(readSession);
  const [contacts, setContacts] = useState([]);
  const [page, setPage] = useState('home');
  const [notice, setNotice] = useState('');
  const [noticeType, setNoticeType] = useState('success');
  const [alertActive, setAlertActive] = useState(false);
  const [location, setLocation] = useState(null);
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const watchId = useRef(null);
  const timer = useRef(null);
  const navigate = useNavigate();

  const announce = (message, type = 'success') => { setNotice(message); setNoticeType(type); window.setTimeout(() => setNotice(''), 4200); };
  const loadContacts = async current => {
    const result = await request('/contacts', { token: current.token });
    setContacts(result.contacts);
  };
  useEffect(() => {
    if (!session?.token) return;
    request('/auth/me', { token: session.token }).then(({ user }) => {
      const next = { ...session, user }; setSession(next); localStorage.setItem('safeher-session', JSON.stringify(next));
      return loadContacts(next);
    }).catch(() => { localStorage.removeItem('safeher-session'); setSession(null); });
  // Validate the persisted session once on app load.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => {
    if (watchId.current !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchId.current);
    window.clearInterval(timer.current);
  }, []);

  const signOut = () => {
    stopAlert(false);
    if (session?.token) request('/auth/logout', { token: session.token, method: 'POST' }).catch(() => {});
    localStorage.removeItem('safeher-session'); setSession(null); setContacts([]); setPage('home'); navigate('/');
  };

  async function stopAlert(showMessage = true) {
    if (watchId.current !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null; window.clearInterval(timer.current); setAlertActive(false); setBusy(false);
    if (session?.token) request('/alerts/stop', { token: session.token, method: 'POST' }).catch(() => {});
    if (showMessage) announce('Live location sharing stopped.');
  }

  async function startAlert() {
    if (busy || alertActive) return;
    if (!contacts.length) { setPage('contacts'); announce('Add a trusted contact before starting an alert.', 'error'); return; }
    if (!navigator.geolocation) { announce('This browser does not support location sharing.', 'error'); return; }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(async position => {
      const point = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      setLocation(point);
      const maps = `https://maps.google.com/?q=${point.latitude},${point.longitude}`;
      const message = encodeURIComponent(`I need help. This is my current location: ${maps}`);
      try {
        await request('/alerts', { token: session.token, method: 'POST', body: JSON.stringify(point) });
        setAlertActive(true); setBusy(false);
        announce('Alert ready. Review and send the messages in your SMS app.');
        const recipients = contacts.map(contact => contact.phone.replace(/[\s().-]/g, '')).join(',');
        window.location.href = `sms:${recipients}?body=${message}`;
        watchId.current = navigator.geolocation.watchPosition(next => {
          const updated = { latitude: next.coords.latitude, longitude: next.coords.longitude };
          setLocation(updated);
        }, () => {}, { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 });
        timer.current = window.setInterval(() => {
          navigator.geolocation.getCurrentPosition(next => {
            const updated = { latitude: next.coords.latitude, longitude: next.coords.longitude };
            setLocation(updated);
            request('/alerts/location', { token: session.token, method: 'POST', body: JSON.stringify(updated) }).catch(() => {});
          }, () => {}, { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 });
        }, 15000);
      } catch (error) { setBusy(false); announce(error.message, 'error'); }
    }, error => {
      setBusy(false);
      announce(error.code === 1 ? 'Location permission is needed to start an alert.' : 'Could not get your location. Please try again.', 'error');
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  }

  const saveSession = async credentials => {
    const result = await request(`/auth/${credentials.mode}`, { method: 'POST', body: JSON.stringify(credentials) });
    setSession(result); localStorage.setItem('safeher-session', JSON.stringify(result));
    await loadContacts(result); navigate('/');
  };

  async function addContact(contact) {
    const result = await request('/contacts', { token: session.token, method: 'POST', body: JSON.stringify(contact) });
    setContacts(current => [...current, result.contact]);
    announce(`${result.contact.name} added to your safety network.`);
  }

  async function removeContact(id) {
    try {
      await request(`/contacts/${id}`, { token: session.token, method: 'DELETE' });
      setContacts(current => current.filter(contact => contact._id !== id)); announce('Contact removed.');
    } catch (error) { announce(error.message, 'error'); }
  }

  return <Routes>
    <Route path="/login" element={session ? <Navigate to="/" replace /> : <AuthPage mode="login" onSubmit={saveSession} />} />
    <Route path="/register" element={session ? <Navigate to="/" replace /> : <AuthPage mode="register" onSubmit={saveSession} />} />
    <Route path="*" element={session ? <main className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <a href="/" className="brand" onClick={e => { e.preventDefault(); setPage('home'); }}><span className="brand-mark"><ShieldCheck size={19} /></span><span>safe<span>her</span></span></a>
        <div className="workspace-label">YOUR SPACE</div>
        <button className={`nav-item ${page === 'home' ? 'selected' : ''}`} onClick={() => { setPage('home'); setMenuOpen(false); }}><House size={18} /><span>Overview</span></button>
        <button className={`nav-item ${page === 'contacts' ? 'selected' : ''}`} onClick={() => { setPage('contacts'); setMenuOpen(false); }}><Users size={18} /><span>Trusted contacts</span><span className="nav-count">{contacts.length}</span></button>
        <div className="sidebar-bottom">
          <div className="privacy-note"><span className="privacy-icon"><LockKeyhole size={16} /></span><div><strong>Your location, your choice</strong><p>Location sharing only starts when you ask it to.</p></div></div>
          <div className="profile"><span className="avatar">{session.user?.name?.slice(0, 1).toUpperCase() || 'S'}</span><span className="profile-copy"><strong>{session.user?.name || 'Your account'}</strong><small>Personal account</small></span><button aria-label="Sign out" className="signout" onClick={signOut}><LogOut size={17} /></button></div>
        </div>
      </aside>
      {menuOpen && <button aria-label="Close menu" className="mobile-scrim" onClick={() => setMenuOpen(false)} />}
      <section className="main-column">
        <header className="topbar"><button aria-label="Open menu" className="mobile-menu" onClick={() => setMenuOpen(true)}><Menu /></button><div className="crumb"><span>SafeHer</span><span className="crumb-slash">/</span><strong>{page === 'home' ? 'Overview' : 'Trusted contacts'}</strong></div><div className="top-actions"><div className="secure-pill"><span /> Private & secure</div><button className="help-button" title="Help"><HelpCircle size={19} /></button></div></header>
        <div className="content">
          {alertActive && <div className="sharing-ribbon"><span className="sharing-dot" /><span><strong>Location sharing is on</strong><small>Your location is being updated every 15 seconds.</small></span><button onClick={() => stopAlert()}>Stop sharing <X size={14} /></button></div>}
          {notice && <div className={`toast ${noticeType}`} role="status"><span>{noticeType === 'error' ? <X size={16} /> : <Check size={16} />}</span>{notice}<button onClick={() => setNotice('')} aria-label="Dismiss"><X size={16} /></button></div>}
          {page === 'home' ? <Dashboard user={session.user} contacts={contacts} active={alertActive} busy={busy} location={location} onStart={startAlert} onStop={() => stopAlert()} onContacts={() => setPage('contacts')} /> : <ContactsPage contacts={contacts} onAdd={addContact} onRemove={removeContact} />}
        </div>
        <footer className="footer"><span>Made for peace of mind <Heart size={13} fill="currentColor" /></span><span>SafeHer is not a substitute for emergency services.</span></footer>
      </section>
      <nav className="mobile-bottom-nav" aria-label="Main navigation">
        <button className={page === 'home' ? 'active' : ''} onClick={() => setPage('home')}><House size={18} /><span>Overview</span></button>
        <button className={page === 'contacts' ? 'active' : ''} onClick={() => setPage('contacts')}><Users size={18} /><span>Contacts</span><small>{contacts.length}</small></button>
      </nav>
    </main> : <Navigate to="/login" replace />} />
  </Routes>;
}

function AuthPage({ mode, onSubmit }) {
  const [register, setRegister] = useState(mode === 'register');
  const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  useEffect(() => setRegister(mode === 'register'), [mode]);
  async function submit(event) {
    event.preventDefault(); setError(''); setLoading(true);
    const form = new FormData(event.currentTarget); const data = Object.fromEntries(form.entries()); data.mode = register ? 'register' : 'login';
    try { await onSubmit(data); } catch (err) { setError(err.message); } finally { setLoading(false); }
  }
  return <div className="auth-page"><div className="auth-visual"><a className="brand auth-brand" href="/"><span className="brand-mark"><ShieldCheck size={19} /></span><span>safe<span>her</span></span></a><div className="visual-copy"><div className="visual-chip"><span /> HERE WHEN YOU NEED IT</div><h1>Safety feels<br />better <em>together.</em></h1><p>Keep your trusted people close. A little more prepared, wherever life takes you.</p><div className="visual-orbit"><div className="orbit-ring ring-one" /><div className="orbit-ring ring-two" /><div className="orbit-center"><ShieldCheck size={32} /></div><span className="orbit-dot dot-a"><Heart size={14} fill="currentColor" /></span><span className="orbit-dot dot-b"><MapPin size={15} /></span><span className="orbit-dot dot-c"><Users size={15} /></span></div></div><div className="visual-footer"><span>YOUR PEOPLE. ALWAYS WITHIN REACH.</span><span>01 — 03</span></div></div><div className="auth-panel"><div className="auth-topline"><span>PERSONAL SAFETY NETWORK</span><span><Shield size={15} /> Secure sign in</span></div><form className="auth-form" onSubmit={submit}><div className="eyebrow">{register ? 'LET’S GET YOU SET UP' : 'WELCOME BACK'}</div><h2>{register ? 'Create your account' : 'Good to have you back.'}</h2><p className="auth-subtitle">{register ? 'Start building your personal safety network.' : 'Sign in to check in with your safety network.'}</p>{register && <label className="field"><span>Your name</span><input name="name" autoComplete="name" placeholder="e.g. Ananya Sharma" required maxLength="80" /></label>}<label className="field"><span>Email address</span><input name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></label><label className="field"><span>Password</span><input name="password" type="password" autoComplete={register ? 'new-password' : 'current-password'} placeholder={register ? 'At least 8 characters' : 'Enter your password'} required minLength={register ? 8 : 1} /></label>{error && <div className="form-error"><X size={16} />{error}</div>}<button className="primary auth-submit" disabled={loading}>{loading ? 'One moment…' : register ? 'Create account' : 'Sign in'}<ArrowRight size={17} /></button><div className="auth-switch">{register ? 'Already have an account?' : 'New to SafeHer?'} <button type="button" onClick={() => setRegister(!register)}>{register ? 'Sign in' : 'Create an account'}</button></div><div className="auth-footnote"><LockKeyhole size={14} /> Your details stay private and protected.</div></form><div className="auth-legal">By continuing, you agree to use SafeHer responsibly and only share location with people you trust.</div></div></div>;
}

function Dashboard({ user, contacts, active, busy, location, onStart, onStop, onContacts }) {
  const date = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
  return <><div className="welcome-row"><div><div className="eyebrow">{date.toUpperCase()}</div><h1>Good to see you, {user?.name?.split(' ')[0] || 'friend'} <span className="wave">✳</span></h1><p className="intro">Your safety network is right here, whenever you need it.</p></div><button className="text-link" onClick={onContacts}>Manage network <ArrowRight size={16} /></button></div><div className="status-banner"><div className="status-icon"><ShieldCheck size={19} /></div><div><strong>You're all set for today</strong><span>Your network is ready. Location is off until you start an alert.</span></div><span className="status-badge"><span /> ALL CLEAR</span></div><div className="dashboard-grid"><section className={`alert-card ${active ? 'alert-card-active' : ''}`}><div className="alert-card-top"><div><div className="eyebrow">{active ? 'LIVE SAFETY SESSION' : 'QUICK ACTION'}</div><h2>{active ? 'Sharing is on' : 'Need a hand?'}</h2></div><span className={`live-indicator ${active ? 'live' : ''}`}><span />{active ? 'LIVE' : 'READY'}</span></div><p>{active ? 'Your location is being checked in the background. You can stop sharing whenever you want.' : 'Send your location to your trusted contacts in just a few taps.'}</p><div className={`panic-wrap ${active ? 'panic-wrap-live' : ''}`}><div className="pulse pulse-one" /><div className="pulse pulse-two" /><button className={`panic-button ${active ? 'panic-button-live' : ''}`} onClick={active ? onStop : onStart} disabled={busy}><span className="panic-icon">{active ? <X size={28} /> : busy ? <Activity size={26} className="spin" /> : <Siren size={28} />}</span><strong>{busy ? 'LOCATING' : active ? 'STOP ALERT' : 'SEND ALERT'}</strong><small>{busy ? 'Finding your location' : active ? 'Tap to end sharing' : 'Tap to alert your people'}</small></button></div><div className="alert-footnote"><LockKeyhole size={14} /><span>{active ? 'Only your trusted contacts can see the SMS you send.' : 'Your location is only requested when you tap the button.'}</span></div>{location && <a className="location-link" href={`https://maps.google.com/?q=${location.latitude},${location.longitude}`} target="_blank" rel="noreferrer"><MapPin size={14} /> View current location <ArrowRight size={13} /></a>}</section><div className="right-stack"><section className="contacts-card"><div className="section-head"><div><div className="eyebrow">YOUR PEOPLE</div><h3>Trusted contacts</h3></div><button aria-label="Manage contacts" className="round-link" onClick={onContacts}><ArrowRight size={16} /></button></div>{contacts.length ? <div className="mini-contacts">{contacts.slice(0, 3).map((contact, i) => <ContactMini key={contact._id} contact={contact} index={i} />)}{contacts.length > 3 && <div className="more-contacts">+{contacts.length - 3} more in your network</div>}</div> : <div className="empty-contacts"><span><Users size={19} /></span><strong>Your people go here</strong><p>Add someone you trust so they’re ready if you need them.</p><button onClick={onContacts}>Add your first contact <ArrowRight size={14} /></button></div>}<button className="manage-contacts" onClick={onContacts}>{contacts.length ? 'Manage trusted contacts' : 'Set up your network'} <ArrowRight size={15} /></button></section><section className="how-card"><div className="how-icon"><MapPin size={18} /></div><div><div className="eyebrow">HOW IT WORKS</div><strong>A little backup, when you need it.</strong><p>Tap Send alert to open a text message with your location. You choose what to send.</p></div><ArrowDownLeft className="how-arrow" size={17} /></section></div></div><section className="privacy-strip"><div className="privacy-strip-icon"><LockKeyhole size={17} /></div><div><strong>Privacy is built in</strong><span>Your location isn’t stored. Live sharing stops when you end your alert or leave this page.</span></div><div className="privacy-points"><span><Check size={14} /> Always your choice</span><span><Check size={14} /> No background tracking</span></div></section></>;
}

function ContactMini({ contact, index }) {
  const colors = ['lilac', 'peach', 'mint'];
  return <div className="mini-contact"><span className={`contact-avatar ${colors[index % 3]}`}>{contact.name.slice(0, 1).toUpperCase()}</span><span className="mini-contact-copy"><strong>{contact.name}</strong><small>{contact.phone}</small></span><span className="contact-ready"><span /> READY</span></div>;
}

function ContactsPage({ contacts, onAdd, onRemove }) {
  const [modal, setModal] = useState(false); const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  async function submit(event) {
    event.preventDefault(); setError(''); setSaving(true); const form = new FormData(event.currentTarget);
    try { await onAdd({ name: form.get('name'), phone: form.get('phone') }); setModal(false); }
    catch (err) { setError(err.message); } finally { setSaving(false); }
  }
  return <><div className="welcome-row contacts-title"><div><div className="eyebrow">YOUR SAFETY NETWORK</div><h1>People in your corner <span className="wave">✳</span></h1><p className="intro">Choose the people you’d want to hear from you if you need help.</p></div><button className="primary add-contact-button" onClick={() => { setError(''); setModal(true); }}><Plus size={17} /> Add a contact</button></div><div className="contact-guidance"><div className="guidance-icon"><Heart size={18} /></div><div><strong>Make it a two-way conversation.</strong><p>Let your trusted people know they’re on your list, and agree on what to do if they get an alert.</p></div></div><section className="contacts-list-card"><div className="list-card-head"><div><div className="eyebrow">YOUR PEOPLE</div><h2>Trusted contacts <span className="count-pill">{contacts.length} / 10</span></h2></div><span className="list-secure"><LockKeyhole size={14} /> PRIVATE TO YOU</span></div>{contacts.length ? <div className="contacts-table">{contacts.map((contact, i) => <div className="contact-row" key={contact._id}><ContactMini contact={contact} index={i} /><a className="contact-call" href={`tel:${contact.phone}`}><MessageCircle size={15} /> Contact</a><button className="delete-contact" aria-label={`Remove ${contact.name}`} title="Remove contact" onClick={() => onRemove(contact._id)}><Trash2 size={16} /></button></div>)}</div> : <div className="empty-network"><span className="empty-network-icon"><Users size={23} /></span><h3>Your trusted people will show up here.</h3><p>Add a friend, family member, or someone you trust to be there when you need them.</p><button className="primary" onClick={() => setModal(true)}><Plus size={17} /> Add your first contact</button></div>}<div className="list-foot"><span><ShieldCheck size={15} /> Your contacts are encrypted in transit and visible only to your account.</span><span>Up to 10 people</span></div></section><div className="contact-tip"><span><Bell size={17} /></span><p><strong>A quick heads-up goes a long way.</strong> Tell your contacts that you’ve added them so they recognize your message if it arrives.</p></div>{modal && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setModal(false); }}><form className="modal" onSubmit={submit}><div className="modal-top"><span className="modal-icon"><Users size={19} /></span><button type="button" aria-label="Close" onClick={() => setModal(false)}><X size={18} /></button></div><div className="eyebrow">GROW YOUR SAFETY NETWORK</div><h2>Add a trusted person</h2><p>Choose someone you’d want to reach in an emergency.</p><label className="field"><span>Their name</span><input name="name" placeholder="e.g. Maya Patel" autoFocus maxLength="80" required /></label><label className="field"><span>Phone number</span><input name="phone" type="tel" placeholder="+1 (555) 000-0000" maxLength="24" required /><small>Include country code so your message can reach them.</small></label>{error && <div className="form-error"><X size={16} />{error}</div>}<button className="primary modal-submit" disabled={saving || contacts.length >= 10}>{saving ? 'Saving…' : 'Add to my network'}<ArrowRight size={16} /></button><div className="modal-assurance"><LockKeyhole size={13} /> Only you can see your saved contacts.</div></form></div>}</>;
}
