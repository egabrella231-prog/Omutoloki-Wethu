
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
  BrainCircuit,
  Wifi,
  WifiOff
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
  // Manual toggle for isolated mode, even if connected
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
    const cached = localStorage.getItem('omtoloki_vault');
    if (cached) {
      setVaultData(JSON.parse(cached));
    }

    // Only fetch from cloud if not forced offline and we have a connection
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
        console.warn("Cloud sync failed, using localized cache.");
      }
    }
  };

  const handleTranslate = async () => {
    if (!sourceText.trim()) return;
    setIsTranslating(true);
    setErrorStatus(null);
    const text = sourceText.trim().toLowerCase();
    
    // 1. Zero-Latency Vault Search
    const sourceCol = sourceLang === Language.ENGLISH ? 'english_word' : 'oshikwanyama_word';
    const cached = vaultData.find(e => e[sourceCol as keyof DictionaryEntry]?.toString().toLowerCase() === text);

    if (cached) {
      setTargetEntry(cached);
      setLastSource('vault');
      setIsTranslating(false);
      return;
    }

    // 2. Autonomous AI Synthesis & Learning
    const effectivelyOnline = isOnline && !forceOffline;
    if (effectivelyOnline) {
      try {
        const learnedEntry = await getAutonomousTranslation(text, sourceLang);
        
        if (learnedEntry) {
          setTargetEntry(learnedEntry);
          setLastSource('ai');

          // Persistence Hook: Save to Vault (Autonomous Self-Learning)
          const newEntry = {
            ...learnedEntry,
            is_verified: false,
            created_at: new Date().toISOString()
          };

          // Update Local UI instantly
          const updatedVault = [newEntry, ...vaultData].slice(0, 100);
          setVaultData(updatedVault);
          localStorage.setItem('omtoloki_vault', JSON.stringify(updatedVault));

          // Save to Cloud if authenticated
          if (user && !user.id.startsWith('guest_')) {
            await supabase.from('knowledge_vault').upsert(newEntry, { onConflict: 'english_word' });
          }
        } else {
          throw new Error("Learning sequence aborted.");
        }
      } catch (err: any) {
        setErrorStatus("Cognitive Link Interrupted. Using Fallback...");
        fallbackSearch(text, sourceCol);
      }
    } else {
      // Direct Fallback if isolated or disconnected
      fallbackSearch(text, sourceCol);
    }
    setIsTranslating(false);
  };

  const fallbackSearch = (text: string, col: string) => {
    const fuzzy = vaultData.find(e => 
      e[col as keyof DictionaryEntry]?.toString().toLowerCase().includes(text) || 
      text.includes(e[col as keyof DictionaryEntry]?.toString().toLowerCase() || '')
    );
    
    if (fuzzy) {
      setTargetEntry(fuzzy);
      setLastSource('fallback');
    } else {
      setTargetEntry(null);
      setErrorStatus(forceOffline ? "Vault Isolated: No local record found." : "Disconnected: Unable to synthesize signal.");
    }
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice protocols not supported by this browser.");
      return;
    }
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.lang = sourceLang === Language.ENGLISH ? 'en-US' : 'pt-PT';
    recognitionRef.current.onstart = () => setIsListening(true);
    recognitionRef.current.onend = () => setIsListening(false);
    recognitionRef.current.onresult = (event: any) => setSourceText(event.results[0][0].transcript);
    recognitionRef.current.start();
  };

  const isLinkActive = isOnline && !forceOffline;

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {showAdmin && <AdminPanel currentUser={user} onClose={() => setShowAdmin(false)} />}
      
      <div className="lg:col-span-8 space-y-6">
        {/* Connection & Mode Interface */}
        <div className={`flex flex-col md:flex-row items-center justify-between p-6 rounded-[2.5rem] border transition-all duration-700 ${isLinkActive ? 'bg-slate-900/40 border-indigo-500/20' : 'bg-amber-500/5 border-amber-500/10'}`}>
          <div className="flex items-center gap-5">
            <div className={`relative flex items-center justify-center w-14 h-14 rounded-2xl transition-all duration-500 ${isLinkActive ? 'bg-indigo-600/20 text-indigo-400' : 'bg-amber-500/20 text-amber-500'}`}>
              {isLinkActive ? <Wifi className="w-7 h-7" /> : <WifiOff className="w-7 h-7" />}
              {isLinkActive && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
              )}
            </div>
            <div>
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-300">
                {isLinkActive ? 'Cloud Synthesis Active' : forceOffline ? 'Isolated Archive Mode' : 'Link Signal Lost'}
              </h3>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                {vaultData.length} indexed word fragments
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 mt-6 md:mt-0">
            {/* Explicit Offline Override */}
            <div className="flex items-center gap-3 bg-slate-950/60 p-2 pl-4 rounded-2xl border border-white/5">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                Force Offline
              </span>
              <button
                onClick={() => setForceOffline(!forceOffline)}
                className={`w-10 h-5 rounded-full transition-all relative ${forceOffline ? 'bg-indigo-600' : 'bg-slate-800'}`}
              >
                <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${forceOffline ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
            
            {(userProfile?.role === UserRole.ADMIN || userProfile?.role === UserRole.AUTHORIZED) && (
              <button 
                onClick={() => setShowAdmin(true)}
                className="p-3 bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all shadow-lg shadow-indigo-600/10"
              >
                <Database className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Translation Input/Output Area */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="glass-panel p-6 rounded-[2.5rem] border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <select 
                value={sourceLang} 
                onChange={(e) => setSourceLang(e.target.value as Language)}
                className="bg-transparent text-white font-black text-xs uppercase tracking-widest outline-none border-none"
              >
                <option value={Language.ENGLISH}>English</option>
                <option value={Language.OSHIKWANYAMA}>Oshikwanyama</option>
              </select>
              <button onClick={startListening} className={`p-2 rounded-xl transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
                <Mic className="w-4 h-4" />
              </button>
            </div>
            <textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="Enter text to translate..."
              className="w-full h-32 bg-transparent text-white text-xl font-bold placeholder-slate-700 resize-none outline-none border-none focus:ring-0"
            />
            <button
              onClick={handleTranslate}
              disabled={isTranslating || !sourceText.trim()}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-[0.3em] rounded-2xl transition-all shadow-xl shadow-indigo-600/20 disabled:opacity-50"
            >
              {isTranslating ? <Sparkles className="w-5 h-5 animate-spin mx-auto" /> : 'Synthesize Signal'}
            </button>
          </div>

          <div className="glass-panel p-6 rounded-[2.5rem] border-white/5 space-y-4 bg-indigo-600/5 min-h-[250px] flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white font-black text-[10px] uppercase tracking-widest opacity-60">
                Target Output ({sourceLang === Language.ENGLISH ? 'Oshikwanyama' : 'English'})
              </span>
              {targetEntry && (
                <button onClick={() => speakText(sourceLang === Language.ENGLISH ? targetEntry.oshikwanyama_word : targetEntry.english_word)} className="p-2 bg-slate-800 text-indigo-400 rounded-xl hover:text-white transition-all">
                  <Volume2 className="w-4 h-4" />
                </button>
              )}
            </div>
            
            <div className="flex-1">
              {targetEntry ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <p className="text-white text-3xl font-black">
                    {sourceLang === Language.ENGLISH ? targetEntry.oshikwanyama_word : targetEntry.english_word}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-indigo-500/20 text-indigo-400 text-[9px] font-black uppercase rounded-lg border border-indigo-500/20">
                      {targetEntry.word_types}
                    </span>
                    <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-[9px] font-black uppercase rounded-lg border border-blue-500/20">
                      {targetEntry.omaludi_oitja}
                    </span>
                  </div>
                  {targetEntry.dialect_correction_note && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-amber-200 leading-relaxed italic">{targetEntry.dialect_correction_note}</p>
                    </div>
                  )}
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Contextual Usage</p>
                    <p className="text-slate-300 text-xs italic">"{targetEntry.oshitya_metumbulo}"</p>
                    <p className="text-slate-500 text-[10px]">{targetEntry.word_in_phrase_sentence}</p>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-700 space-y-3 opacity-30 py-10">
                  <BrainCircuit className="w-12 h-12" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Awaiting Cognitive Input</p>
                </div>
              )}
            </div>
            
            {errorStatus && (
              <div className="flex items-center gap-2 text-red-400 text-[9px] font-bold uppercase mt-4 bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                <ShieldAlert className="w-3 h-3" /> {errorStatus}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Side Panel: Knowledge Vault Archive */}
      <div className="lg:col-span-4 space-y-6">
        <div className="glass-panel p-6 rounded-[2.5rem] border-white/5 bg-slate-900/40 flex flex-col h-[600px]">
          <div className="flex items-center justify-between mb-6 shrink-0">
            <div className="flex items-center gap-3">
              <History className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-black text-white uppercase tracking-widest">Local Vault</h3>
            </div>
            <button onClick={fetchVault} className="p-2 hover:bg-slate-800 rounded-xl transition-colors">
              <RotateCcw className="w-4 h-4 text-slate-500" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
            {vaultData.length > 0 ? (
              vaultData.map((entry, idx) => (
                <button 
                  key={entry.id || idx}
                  onClick={() => {
                    setTargetEntry(entry);
                    setSourceText(sourceLang === Language.ENGLISH ? entry.english_word : entry.oshikwanyama_word);
                  }}
                  className="w-full p-4 rounded-2xl bg-slate-950/40 border border-white/5 hover:border-indigo-500/30 transition-all text-left group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">{entry.word_types}</span>
                    <ChevronRight className="w-3 h-3 text-slate-700 group-hover:text-white transition-colors" />
                  </div>
                  <p className="text-sm font-bold text-white mb-0.5 truncate">{entry.oshikwanyama_word}</p>
                  <p className="text-[10px] text-slate-500 truncate">{entry.english_word}</p>
                </button>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full opacity-20 space-y-4">
                <Database className="w-10 h-10" />
                <p className="text-[9px] text-slate-300 font-black uppercase tracking-widest">Archive Empty</p>
              </div>
            )}
          </div>
          
          <div className="mt-4 pt-4 border-t border-white/5 shrink-0 text-center">
            <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">
              Secured Neural Repository v1.0
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Translator;
