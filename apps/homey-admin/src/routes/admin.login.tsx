import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { Logo, ModeNotice, Notice } from '@/components/StoreUI';
import { supabase, requireConnection } from '@/lib/supabase';
import { getCurrentAdmin } from '@/lib/admin';
import { explain } from '@/lib/commerce';
export const Route = createFileRoute('/admin/login')({ component: AdminLogin });

function AdminLogin() {
  const params = new URLSearchParams(window.location.search);
  return params.get('embedded') === '1' && window.parent !== window
    ? <EmbeddedLogin />
    : <Login />;
}

function EmbeddedLogin() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    let checkingSession = false;
    let timer: number | undefined;

    async function check() {
      if (!active || checkingSession) return;
      checkingSession = true;
      try {
        const admin = await getCurrentAdmin();
        if (active && admin) await navigate({ to: '/admin', replace: true });
      } catch {
        // An expired session can be activated again from the separate window.
      } finally {
        checkingSession = false;
        if (active) setChecking(false);
      }
    }

    function scheduleCheck() {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void check(), 0);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') scheduleCheck();
    });
    window.addEventListener('focus', scheduleCheck);
    void check();
    return () => {
      active = false;
      window.clearTimeout(timer);
      window.removeEventListener('focus', scheduleCheck);
      subscription.unsubscribe();
    };
  }, [attempt, navigate]);

  return <div className="login-page"><div className="login-panel">
    <Logo />
    <h1>إدارة متجر هومي</h1>
    {checking ? <p role="status">جاري التحقق من جلسة هومي…</p> : <>
      <p className="muted">فعّل حساب مدير هومي في نافذة منفصلة. بعد التفعيل، اللوحة بتفتح هنا تلقائيًا.</p>
      <a className="btn" href={import.meta.env.BASE_URL + 'index.html#/admin/login'}
        target="_blank" rel="noopener noreferrer">تفعيل جلسة هومي</a>
      <button className="text-button" type="button"
        onClick={() => { setChecking(true); setAttempt((value) => value + 1); }}>تحقق من الجلسة</button>
    </>}
  </div></div>;
}
function Login() { const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const navigate = useNavigate(); useEffect(() => { void getCurrentAdmin().then(a => { if (a)
    void navigate({ to: '/admin' }); }); }, [navigate]); return <div className="login-page"><ModeNotice /><div className="login-panel"><Logo /><h1>أهلًا بيك في إدارة هومي</h1><p className="muted">ادخل بحساب المدير المرتبط بـSupabase</p>{<form onSubmit={async (e) => { e.preventDefault(); setBusy(true); setError(''); try {
    requireConnection();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error)
        throw error;
    if (!await getCurrentAdmin()) {
        await supabase.auth.signOut();
        throw new Error('الحساب لا يملك صلاحية إدارة هومي، أو وظيفة التحقق تحتاج تهيئة SQL.');
    }
    void navigate({ to: '/admin' });
}
catch (e) {
    setError(explain(e));
}
finally {
    setBusy(false);
} }}><label>البريد الإلكتروني<input type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required/></label><label>كلمة المرور<input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required/></label><button className="btn" disabled={busy}>{busy ? 'جاري التحقق...' : 'تسجيل الدخول'}</button></form>}{error && <Notice>{error}</Notice>}<a href="https://www.homeyegypt.com/" target="_blank" rel="noopener noreferrer" className="text-button">العودة للمتجر</a></div></div>; }
