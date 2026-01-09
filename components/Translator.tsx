
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient.ts';
import { getAutonomousTranslation, speakText } from '../geminiService.ts';
import { Language, DictionaryEntry, UserRole } from '../types.ts';
import { 
  Mic, 
  Volume2, 
  ArrowRightLeft, 
  Sparkles, 
  Zap,
  History,
  ChevronRight,
  Database,
  ShieldAlert,
  AlertTriangle,
  RotateCcw,
  Info,
  Link,
  Link2Off,
  BrainCircuit
} from 'lucide-react';
import AdminPanel from './AdminPanel.tsx';

interface TranslatorProps {
  user: any;
  userProfile?: any;
}

const Translator: React.FC<TranslatorProps> = ({ user, userProfile }) => {
  const [sourceText, setSourceText] = useState('');
  const [targetEntry, setTargetEntry] = useState<DictionaryEntry | null>(null);
  const [sourceLang, setSourceLang] = useState<Language>(Language.ENGLISH);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [lastSource, setLastSource] = useState<'vault' | 'ai' | 'fallback' | null>(null);
  const [vaultData, setVaultData] = useState<DictionaryEntry[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [forceOffline, setForceOffline] = useState(() => {
    return localStorage.getItem('omtoloki_force_offline') === 'true';
  });
  const [showAdmin, setShowAdmin] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    fetchVault();
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('omtoloki_force_offline', forceOffline.toString());
  }, [forceOffline]);

  const fetchVault = async () => {
    // Priority 1: Load from LocalStorage Cache for instant UI
    const cached = localStorage.getItem('omtoloki_vault');
    if (cached) {
      setVaultData(JSON.parse(cached));
    }

    // Priority 2: Sync with Cloud Vault if online and not forced offline
    if (navigator.onLine && !forceOffline) {
      try {
        const { data, error } = await supabase
          .from('knowledge_vault')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (data && !error) {
          setVaultData(data);
          localStorage.setItem('omtoloki_vault', JSON.stringify(data));
        }
      } catch (e) {
        console.warn("Cloud sync failed, operating on local data.");
      }
    }
  };

  const handleTranslate = async () => {
    if (!sourceText.trim()) return;
    setIsTranslating(true);
    setErrorStatus(null);
    const text = sourceText.trim().toLowerCase();
    
    // 1. Local Vault Search (Zero Latency)
    const sourceCol = sourceLang === Language.ENGLISH ? 'english_word' : 'oshikwanyama_word';
    const cached = vaultData.find(e => e[sourceCol].toLowerCase() === text);

    if (cached) {
      setTargetEntry(cached);
      setLastSource('vault');
      setIsTranslating(false);
      return;
    }

    // 2. AI Synthesis (Autonomous Learning)
    // Only happens if physically online AND the manual "Force Offline" toggle is OFF
    if (isOnline && !forceOffline) {
      try {
        const learnedEntry = await getAutonomousTranslation(text, sourceLang);
        
        if (learnedEntry) {
          setTargetEntry(learnedEntry);
          setLastSource('ai');

          // Autonomous Persistence (Self-Learning)
          // Save to Supabase (if not guest) and update local cache
          const entryWithMetadata = {
            ...learnedEntry,
            is_verified: false,
            created_at: new Date().toISOString()
          };

          if (user && !user.id.startsWith('guest_')) {
            const { data, error } = await supabase
              .from('knowledge_vault')
              .upsert(entryWithMetadata, { onConflict: 'english_word' })
              .select();
            
            if (data && !error) {
              const updatedVault = [data[0], ...vaultData].slice(0, 100);
              setVaultData(updatedVault);
              localStorage.setItem('omtoloki_vault', JSON.stringify(updatedVault));
            }
          } else {
            // Guest mode: Save to local state only
            const guestVault = [entryWithMetadata, ...vaultData].slice(0, 100);
            setVaultData(guestVault);
            localStorage.setItem('omtoloki_vault', JSON.stringify(guestVault));
          }
        } else {
          throw new Error("Learning sequence failed.");
        }
      } catch (err: any) {
        setErrorStatus("Cloud logic failed. Engaging Fallback...");
        fallbackSearch(text, sourceCol);
      }
    } else {
      // Direct Fallback if offline or forced offline
      fallbackSearch(text, sourceCol);
    }
    setIsTranslating(false);
  };

  const fallbackSearch = (text: string, col: string) => {
    // Fuzzy search in local data
    const fuzzy = vaultData.find(e => 
      e[col as keyof DictionaryEntry]?.toString().toLowerCase().includes(text) || 
      text.includes(e[col as keyof DictionaryEntry]?.toString().toLowerCase() || '')
    );
    
    if (fuzzy) {
      setTargetEntry(fuzzy);
      setLastSource('fallback');
    } else {
      setTargetEntry(null);
      setErrorStatus(forceOffline ? "Isolated Mode: No local matches found." : "Offline: No knowledge records.");
    }
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice interface not supported.");
      return;
    }
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.lang = sourceLang === Language.ENGLISH ? 'en-US' : 'pt-PT';
    recognitionRef.current.onstart = () => setIsListening(true);
    recognitionRef.current.onend = () => setIsListening(false);
    recognitionRef.current.onresult = (event: any) => setSourceText(event.results[0][0].transcript);
    recognitionRef.current.start();
  };

  const isActiveLink = isOnline && !forceOffline;

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {showAdmin && <AdminPanel currentUser={user} onClose={() => setShowAdmin(false)} />}
      
      <div className="lg:col-span-8 space-y-6">
        {/* Status Hub & Manual Override */}
        <div className={`flex flex-col md:flex-row items-center justify-between p-5 rounded-[2.5rem] border transition-all duration-700 ${isActiveLink ? 'bg-slate-900/40 border-indigo-500/20 shadow-[0_0_30px_rgba(79,70,229,0.05)]' : 'bg-amber-500/5 border-amber-500/20'}`}>
          <div className="flex items-center gap-4">
            <div className={`relative flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-500 ${isActiveLink ? 'bg-indigo-600/20 text-indigo-400' : 'bg-amber-500/20 text-amber-500'}`}>
              {isActiveLink ? <Link className="w-6 h-6 animate-pulse" /> : <Link2Off className="w-6 h-6" />}
              {isActiveLink && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
              )}
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-300">
                {isActiveLink ? 'Cloud Intelligence Active' : forceOffline ? 'Isolated Archive Mode' : 'Network Link Lost'}
              </h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                {vaultData.length} records localized
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            {/* Manual Offline Toggle */}
            <div className="flex items-center gap-3 bg-slate-950/60 p-2 pl-4 rounded-2xl border border-white/5">
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                 {forceOffline ? 'Manual Offline' : 'Auto Sync'}
               </span>
               <button 
                onClick={() => setForceOffline(!forceOffline)}
                className={`relative w-12 h-6 rounded-full transition-all duration-500 ${forceOffline ? 'bg-amber-600 shadow-[0_0_15px_rgba(217,119,6,0.4)]' : 'bg-slate-800'}`}
                title={forceOffline ? "Click to Re-enable Cloud AI" : "Click to Force Vault-Only Mode"}
               >
                 <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-500 shadow-sm ${forceOffline ? 'left-7' : 'left-1'}`}></div>
               </button>
            </div>

            {(userProfile?.role === UserRole.ADMIN || userProfile?.role === UserRole.AUTHORIZED) && (
              <button 
                onClick={() => setShowAdmin(true)}
                className="p-3 rounded-2xl bg-slate-800/50 border border-white/5 text-slate-400 hover:text-indigo-400 transition-all"
                title="Vault Management"
              >
                <ShieldAlert className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Dialect Drift Alert */}
        {targetEntry?.dialect_correction_note && (
          <div className="p-6 rounded-[2.5rem] bg-amber-500/5 border border-amber-500/10 flex gap-5 items-center animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="p-3 bg-amber-500/20 rounded-2xl text-amber-500">
              <Info className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-amber-500 text-slate-950 text-[8px] font-black uppercase rounded tracking-widest">Correction</span>
                <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Dialect Deviation Detected</p>
              </div>
              <p className="text-xs text-slate-400 font-medium italic">
                {targetEntry.dialect_correction_note}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
          {/* Source Panel */}
          <div className="glass-panel p-8 rounded-[3rem] relative group border-white/5 focus-within:border-indigo-500/30 transition-all">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]"></div>
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-400">
                  {sourceLang === Language.ENGLISH ? 'English' : 'Oshikwanyama'}
                </span>
              </div>
              <button 
                onClick={startListening}
                className={`p-4 rounded-2xl transition-all ${isListening ? 'bg-red-500 text-white animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.4)]' : 'bg-slate-800 text-slate-500 hover:text-white'}`}
              >
                <Mic className="w-4 h-4" />
              </button>
            </div>
            <textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              className="w-full bg-transparent text-3xl font-bold text-white placeholder-slate-800 resize-none outline-none min-h-[160px] custom-scrollbar"
              placeholder="Enter Signal..."
            />
            {sourceText && (
               <button onClick={() => setSourceText('')} className="absolute bottom-8 right-8 text-slate-700 hover:text-white transition-colors">
                 <RotateCcw className="w-5 h-5" />
               </button>
            )}
          </div>

          {/* Target Panel */}
          <div className="glass-panel p-8 rounded-[3rem] border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 blur-[100px] rounded-full group-hover:bg-indigo-500/10 transition-colors"></div>
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-400">
                  {sourceLang === Language.ENGLISH ? 'Oshikwanyama' : 'English'}
                </span>
                {lastSource && (
                  <div className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 ${lastSource === 'ai' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                    {lastSource === 'ai' && <Sparkles className="w-3 h-3" />}
                    {lastSource}
                  </div>
                )}
              </div>
              <button 
                onClick={() => speakText(sourceLang === Language.ENGLISH ? targetEntry?.oshikwanyama_word || '' : targetEntry?.english_word || '')} 
                disabled={!targetEntry}
                className="p-4 bg-slate-800 text-slate-500 rounded-2xl hover:text-blue-400 disabled:opacity-30 transition-all hover:scale-110 active:scale-95"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>
            
            <div className="min-h-[160px] flex flex-col justify-between">
              {isTranslating ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  <div className="flex items-center gap-2">
                    <BrainCircuit className="w-3 h-3 text-indigo-400 animate-pulse" />
                    <span className="text-[9px] font-black text-indigo-400 uppercase animate-pulse tracking-[0.4em]">Autonomous Synthesis</span>
                  </div>
                </div>
              ) : (
                <>
                  <p className={`text-3xl font-bold leading-tight ${targetEntry ? 'text-white' : 'text-slate-800/50 italic tracking-tighter'}`}>
                    {(sourceLang === Language.ENGLISH ? targetEntry?.oshikwanyama_word : targetEntry?.english_word) || 'Await Signal...'}
                  </p>
                  
                  {targetEntry && (
                    <div className="mt-8 pt-8 border-t border-white/5 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="flex gap-2 items-center flex-wrap">
                        <span className="px-3 py-1 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[9px] font-black text-indigo-400 uppercase tracking-widest">
                          {targetEntry.word_types}
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                          {targetEntry.omaludi_oitja}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed italic border-l-2 border-indigo-500/30 pl-4 py-1">
                        "{targetEntry.oshitya_metumbulo}"
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <button 
            onClick={() => {
              setSourceLang(l => l === Language.ENGLISH ? Language.OSHIKWANYAMA : Language.ENGLISH);
              setSourceText('');
              setTargetEntry(null);
              setLastSource(null);
            }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 p-5 bg-slate-950 border border-slate-800 text-indigo-400 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] hover:scale-110 active:scale-95 transition-all z-20 group"
          >
            <ArrowRightLeft className="w-6 h-6 group-hover:rotate-180 transition-transform duration-500" />
          </button>
        </div>

        <button
          onClick={handleTranslate}
          disabled={isTranslating || !sourceText.trim()}
          className={`group w-full py-7 text-white font-black text-sm uppercase tracking-[0.5em] rounded-[3rem] shadow-2xl transition-all active:scale-[0.98] disabled:opacity-50 overflow-hidden relative ${isActiveLink ? 'bg-gradient-to-r from-indigo-600 to-blue-600 shadow-indigo-600/30' : 'bg-slate-800 border border-white/5 shadow-black/40'}`}
        >
          <div className="relative z-10 flex items-center justify-center gap-3">
            {isActiveLink && <Zap className="w-4 h-4 fill-white animate-pulse" />}
            {isTranslating ? 'Syncing Cognitive Core...' : isActiveLink ? 'Synthesize & Learn' : 'Search Local Vault'}
          </div>
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </button>
      </div>

      <div className="lg:col-span-4 space-y-8">
        {/* Knowledge Archive */}
        <div className="glass-panel p-8 rounded-[3rem] border-white/5 flex flex-col h-[640px] relative overflow-hidden">
          <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-6">
            <div className="flex items-center gap-3">
              <History className="w-5 h-5 text-indigo-500" />
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-300">Self-Learning Stream</h3>
            </div>
            <div className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${isActiveLink ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-500'}`}>
              {isActiveLink ? 'Live Sync' : 'Offline'}
            </div>
          </div>
          
          <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
            {vaultData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-20">
                <Database className="w-12 h-12" />
                <p className="text-[10px] font-black uppercase tracking-widest">Cognitive Core Empty</p>
              </div>
            ) : (
              vaultData.map((e, i) => (
                <button
                  key={e.id || i}
                  onClick={() => {
                    setSourceLang(Language.ENGLISH);
                    setSourceText(e.english_word);
                    setTargetEntry(e);
                    setLastSource('vault');
                  }}
                  className="w-full text-left p-5 rounded-[2rem] bg-slate-900/30 border border-white/5 hover:border-indigo-500/30 hover:bg-slate-900 transition-all group animate-in fade-in slide-in-from-right-4 duration-300"
                >
                  <div className="flex justify-between items-center mb-1">
                     <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">{e.english_word}</p>
                     <ChevronRight className="w-3 h-3 text-slate-700 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                  </div>
                  <p className="text-base font-bold text-white">{e.oshikwanyama_word}</p>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="p-8 rounded-[3rem] bg-gradient-to-br from-indigo-600/10 to-transparent border border-indigo-500/10 text-center space-y-4 relative overflow-hidden">
          <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-indigo-500/10 blur-2xl rounded-full"></div>
          <Zap className="w-6 h-6 text-indigo-400 mx-auto" />
          <div className="space-y-2">
            <p className="text-xs font-black text-indigo-300 uppercase tracking-widest">Autonomous Learning</p>
            <p className="text-[10px] text-slate-500 leading-relaxed uppercase font-black tracking-wider">
              Every newly synthesized word is automatically indexed into your personal knowledge vault.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Translator;
