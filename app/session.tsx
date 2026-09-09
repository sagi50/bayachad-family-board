import { useEffect, useState } from 'react';
import { HeartHandshake, LockKeyhole, LoaderCircle } from 'lucide-react';
import Board from './board';
import QuickShopping from './quick-shopping';
import ShoppingBoardPanel from './shopping-board-panel';
import EventManager from './event-manager';
import { apiFetch, setCsrfToken } from '@/lib/api';
type AuthPayload = { csrf_token:string; user:string; slot:string; error?:string };

export default function SessionGate() {
  const [ready, setReady] = useState(false), [loggedIn, setLoggedIn] = useState(false);
  const [username, setUsername] = useState(''), [password, setPassword] = useState('');
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => {
    const expired = () => { setCsrfToken(''); setLoggedIn(false); };
    window.addEventListener('session-expired', expired);
    apiFetch('/api/auth/me').then(async response => { if (response.ok) { const data = await response.json() as AuthPayload; setCsrfToken(data.csrf_token); setLoggedIn(true); } else if(response.status !== 401) setError('השרת לא זמין כרגע. נסו שוב בעוד רגע.'); }).catch(() => setError('לא הצלחנו להתחבר לשרת.')).finally(() => setReady(true));
    return () => window.removeEventListener('session-expired', expired);
  }, []);
  async function login(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try { const response = await apiFetch('/api/auth/login', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})}); if(response.status === 429) throw new Error('בוצעו יותר מדי ניסיונות כניסה. נסו שוב בעוד כמה דקות.'); const data = await response.json() as AuthPayload; if(!response.ok) throw new Error(data.error || 'לא הצלחנו להיכנס. נסו שוב.'); setCsrfToken(data.csrf_token); setPassword(''); setLoggedIn(true); }
    catch(e) { setError(e instanceof Error ? e.message : 'לא הצלחנו להיכנס.'); } finally { setBusy(false); }
  }
  async function logout() {
    setBusy(true);
    try { const response = await apiFetch('/api/auth/logout',{method:'POST'}); if (!response.ok && response.status !== 401) throw new Error(); setCsrfToken(''); setLoggedIn(false); setError(''); }
    catch { setError('ההתנתקות לא הושלמה. נסו שוב.'); } finally { setBusy(false); }
  }
  if(!ready) return <div className="loading" role="status"><LoaderCircle className="spin"/> פותחים את הלוח…</div>;
  if(loggedIn) return <><Board/><QuickShopping/><ShoppingBoardPanel/><EventManager/><div className="account-controls"><a href="/api/docs" target="_blank" rel="noreferrer">תיעוד API</a><button className="text-button" onClick={logout} disabled={busy}>התנתקות</button>{error && <span role="alert">{error}</span>}</div></>;
  return <main className="login-shell"><section className="login-card"><div className="brand"><span className="brand-mark"><HeartHandshake size={25}/></span><strong>משפחת חלילי<span>.</span></strong></div><h1>ברוכים הבאים הביתה</h1><p>נכנסים ללוח המשותף שלנו</p><form onSubmit={login}><label htmlFor="username">שם משתמש</label><input id="username" name="username" autoComplete="username" dir="auto" required maxLength={80} value={username} onChange={e=>setUsername(e.target.value)}/><label htmlFor="password">סיסמה</label><input id="password" name="password" type="password" autoComplete="current-password" dir="ltr" required maxLength={128} value={password} onChange={e=>setPassword(e.target.value)}/>{error&&<p className="form-error" role="alert">{error}</p>}<button className="primary" type="submit" disabled={busy}>{busy?<LoaderCircle className="spin" size={18}/>:<LockKeyhole size={18}/>} {busy?'נכנסים…':'כניסה ללוח'}</button></form><p className="login-note">מרחב פרטי לשנינו</p></section></main>;
}
