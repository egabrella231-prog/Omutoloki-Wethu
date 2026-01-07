
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Mail, Lock, Loader2, AlertCircle, Eye, EyeOff, CheckCircle2, ArrowRight, ShieldCheck, HelpCircle, ExternalLink, Copy } from 'lucide-react';

interface AuthProps {
  onGuestMode?: () => void;
}

const Auth: React.FC<AuthProps> = ({ onGuestMode }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<{ message: string; code?: string; type?: 'config' | 'auth' } | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    // Google OAuth is blocked in iframes. Check if we are inside one.
    setIsInIframe(window.self !== window.top);
  }, []);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (isLogin) {
        const { error: authError } = await supabase.auth.signInWithPassword({ 
          email: email.trim(), 
          password: password.trim() 
        });
        if (authError) throw authError;
      } else {
        const { error: authError } = await supabase.auth.signUp({ 
          email: email.trim(), 
          password: password.trim() 
        });
        if (authError) throw authError;
        setSuccessMsg('Neural link initialized. Check email for verification.');
      }
    } catch (err: any) {
      setError({ 
        message: err.message || 'Authentication sequence failed',
        type: 'auth'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (isInIframe) {
      alert("Google Login is blocked inside preview windows. Please click 'Open in New Window' first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { 
          redirectTo: window.location.origin 
        }
      });
      
      if (authError) throw authError;
    } catch (err: any) {
      setError({ 
        message: err.message || 'Google Sign-In sequence failure',
        type: 'auth'
      });
    } finally {
      setLoading(false);
    }
  };

  const openInNewWindow = () => {
    window.open(window.location.href, '_blank');
  };

  return (
    <div className="glass-panel p-10 rounded-[2.5rem] shadow-2xl w-full border border-white/10 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent"></div>
      
      <div className="text-center mb-10 relative z-10">
        <div className="inline-flex p-4 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 mb-6 shadow-[0_0_20px_rgba(79,70,229,0.15)]">
          <ShieldCheck className="w-8 h-8 text-indigo-400" />
        </div>
        <h2 className="text-3xl font-black text-white mb-2 tracking-tight">
          Neural Gateway
        </h2>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">
          Secure access to Omtoloki core services
        </p>
      </div>

      <div className="space-y-6 relative z-10">
        {/* Iframe Warning */}
        {isInIframe && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] space-y-3">
            <div className="flex items-center gap-2 font-black uppercase tracking-widest">
              <AlertCircle className="w-4 h-4" /> Iframe Detected
            </div>
            <p className="opacity-80 leading-relaxed font-bold">Google blocks OAuth logins inside preview frames. Open in a dedicated window to establish link.</p>
            <button 
              onClick={openInNewWindow}
              className="w-full flex items-center justify-center gap-2 py-2 bg-amber-500 text-slate-950 rounded-xl font-black uppercase tracking-widest hover:bg-amber-400 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Open in New Window
            </button>
          </div>
        )}

        {/* Primary OAuth Action */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-white text-slate-900 font-black text-xs uppercase tracking-widest py-4.5 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl hover:bg-slate-100 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Sign in with Google
        </button>

        <div className="flex flex-col gap-2">
          <button 
            onClick={() => setShowHelp(!showHelp)}
            className="text-[9px] font-black text-slate-500 hover:text-indigo-400 flex items-center justify-center gap-1.5 uppercase tracking-widest transition-colors"
          >
            <HelpCircle className="w-3 h-3" /> Troubleshooting Google 403 Errors
          </button>

          {showHelp && (
            <div className="p-5 rounded-3xl bg-indigo-500/5 border border-indigo-500/10 text-indigo-300 text-[10px] space-y-3 leading-relaxed animate-in fade-in zoom-in-95 duration-200">
              <p className="font-black uppercase text-indigo-400 border-b border-indigo-500/20 pb-2">Critical Resolution Steps:</p>
              <div className="space-y-3">
                <div className="flex flex-col gap-1">
                  <p className="font-bold">1. Authorized Redirect URI:</p>
                  <p className="opacity-70">Add this URL to both Supabase and Google Console:</p>
                  <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-lg border border-white/5">
                    <code className="text-emerald-400 truncate flex-1">{window.location.origin}</code>
                    <button onClick={() => {navigator.clipboard.writeText(window.location.origin); alert("Copied!");}} className="p-1 hover:text-white transition-colors"><Copy className="w-3 h-3" /></button>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <p className="font-bold">2. Test Users:</p>
                  <p className="opacity-70 italic">Google Console &gt; OAuth Consent &gt; Test users &gt; Add your email.</p>
                </div>
                <div className="flex flex-col gap-1">
                  <p className="font-bold">3. Publish App:</p>
                  <p className="opacity-70 italic">Change Status from "Testing" to "In Production" to allow any user to log in.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 py-2">
          <div className="h-px bg-white/5 flex-1"></div>
          <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">Alternate Login</span>
          <div className="h-px bg-white/5 flex-1"></div>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {error && (
            <div className="p-4 rounded-2xl border bg-red-500/5 border-red-500/20 text-red-400 text-xs animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1">
                  <span className="font-black uppercase tracking-widest">Protocol Failure</span>
                  <span className="font-medium opacity-80">{error.message}</span>
                </div>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="p-4 rounded-2xl border bg-emerald-500/5 border-emerald-500/20 text-emerald-400 text-xs animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1">
                  <span className="font-black uppercase tracking-widest">Protocol Success</span>
                  <span className="font-medium opacity-80">{successMsg}</span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600 group-focus-within:text-indigo-500 transition-all" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950/40 border border-white/5 rounded-2xl py-4 pl-12 pr-4 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none transition-all text-white placeholder-slate-700 font-medium"
                placeholder="Email Address"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600 group-focus-within:text-indigo-500 transition-all" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950/40 border border-white/5 rounded-2xl py-4 pl-12 pr-12 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none transition-all text-white placeholder-slate-700 font-medium"
                placeholder="Secure Password"
                required
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-xl hover:bg-white/5 text-slate-600 hover:text-slate-300 transition-all"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs tracking-[0.3em] py-5 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-2xl shadow-indigo-600/20 disabled:opacity-50 mt-2 active:scale-[0.98] uppercase"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <span>{isLogin ? 'Establish Link' : 'Register Signature'}</span>
            )}
          </button>
        </form>
      </div>

      <div className="mt-10 pt-8 border-t border-white/5 text-center space-y-6 relative z-10">
        <button
          onClick={() => setIsLogin(!isLogin)}
          className="text-[10px] font-black text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-[0.2em]"
        >
          {isLogin ? "Generate New Signature" : 'Existing User? Return to Gate'}
        </button>

        <div className="flex items-center gap-4">
            <div className="h-px bg-white/5 flex-1"></div>
            <span className="text-[9px] text-slate-700 font-black uppercase tracking-[0.4em]">Sandbox Access</span>
            <div className="h-px bg-white/5 flex-1"></div>
        </div>

        <button
          onClick={onGuestMode}
          className="w-full flex items-center justify-center gap-3 py-4.5 rounded-2xl bg-gradient-to-br from-slate-900/50 to-slate-950/80 hover:from-slate-800/60 hover:to-slate-900/80 border border-white/5 text-slate-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-[0.15em] group"
        >
          Instant Preview Mode
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform text-indigo-500" />
        </button>
      </div>
    </div>
  );
};

export default Auth;
