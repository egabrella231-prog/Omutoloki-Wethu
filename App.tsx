
import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient.ts';
import Auth from './components/Auth.tsx';
import Translator from './components/Translator.tsx';
import { User } from '@supabase/supabase-js';
import { LogOut, Languages, Sparkles, Activity, ShieldCheck, User as UserIcon } from 'lucide-react';
import { UserRole, UserProfile } from './types.ts';

const App: React.FC = () => {
  const [user, setUser] = useState<User | any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) {
      setProfile(data);
    } else {
      // Create profile if missing
      const newProfile: UserProfile = {
        id: userId,
        email: user?.email || '',
        role: UserRole.GUEST
      };
      await supabase.from('profiles').insert(newProfile);
      setProfile(newProfile);
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setUser(session.user);
          setIsGuest(false);
          await fetchProfile(session.user.id);
        } else {
          const guestData = localStorage.getItem('omtoloki_guest_session');
          if (guestData) {
            setUser(JSON.parse(guestData));
            setIsGuest(true);
            setProfile({ id: 'guest', email: 'guest', role: UserRole.GUEST });
          }
        }
      } catch (err) {
        console.warn("Supabase initialization issue...");
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        setUser(session.user);
        setIsGuest(false);
        await fetchProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
        setIsGuest(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    try { await supabase.auth.signOut(); } catch (e) {}
    setUser(null);
    setProfile(null);
    setIsGuest(false);
    localStorage.removeItem('omtoloki_guest_session');
  };

  const handleGuestMode = () => {
    const guestUser = {
      id: 'guest_' + Math.random().toString(36).substr(2, 9),
      email: 'guest@omtoloki.ai',
      user_metadata: { full_name: 'Guest Protocol' }
    };
    setUser(guestUser);
    setProfile({ id: guestUser.id, email: guestUser.email, role: UserRole.GUEST });
    setIsGuest(true);
    localStorage.setItem('omtoloki_guest_session', JSON.stringify(guestUser));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="relative">
          <div className="animate-spin rounded-full h-20 w-20 border-t-2 border-indigo-500"></div>
          <Languages className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-indigo-400" />
        </div>
      </div>
    );
  }

  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';

  return (
    <div className="min-h-screen flex flex-col items-center py-6 px-4 md:py-12">
      <header className="w-full max-w-6xl mb-12 flex justify-between items-center">
        <div className="flex items-center gap-4 group cursor-default">
          <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-3 rounded-2xl shadow-xl shadow-indigo-900/40">
            <Languages className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-blue-300 to-teal-400 tracking-tighter">
              OMTOLOKI
            </h1>
            <div className="flex items-center gap-2">
               <Activity className="w-3 h-3 text-emerald-500 animate-pulse" />
               <p className="text-[10px] text-slate-400 font-black tracking-widest uppercase">Autonomous Knowledge Engine</p>
               {profile?.role === UserRole.ADMIN && (
                 <ShieldCheck className="w-3 h-3 text-indigo-500 ml-1" />
               )}
            </div>
          </div>
        </div>

        {user && (
          <div className="flex items-center gap-6">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Operator Identity</span>
              <span className="text-sm font-bold text-white flex items-center gap-2">
                Welcome, {displayName}
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
              </span>
            </div>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-red-500/20 text-slate-400 hover:text-red-400 transition-all text-xs font-black uppercase tracking-widest group"
            >
              <LogOut className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              {isGuest ? 'Exit' : 'Sign Out'}
            </button>
          </div>
        )}
      </header>

      <main className="w-full max-w-6xl flex-1 flex flex-col items-center">
        {!user ? (
          <div className="w-full max-w-md">
            <Auth onGuestMode={handleGuestMode} />
          </div>
        ) : (
          <div className="w-full">
            <Translator user={user} userProfile={profile} />
          </div>
        )}
      </main>

      <footer className="w-full max-w-6xl mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-slate-500">
        <div className="flex items-center gap-3">
          <Sparkles className="w-4 h-4 text-indigo-500" />
          <p className="text-[10px] font-bold uppercase tracking-widest">© 2024 Neural Vault System. Verified Protocol.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
