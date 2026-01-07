
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { getAutonomousTranslation, speakText } from '../geminiService';
import { Language, DictionaryEntry, UserRole } from '../types';
import { 
  Mic, 
  Volume2, 
  ArrowRightLeft, 
  Copy, 
  Check, 
  Sparkles, 
  Zap,
  History,
  Trash2,
  Clock,
  ChevronRight,
  Wifi,
  WifiOff,
  Database,
  ShieldAlert,
  Edit2,
  AlertTriangle,
  RotateCcw,
  Power,
  Info
} from 'lucide-react';
import AdminPanel from './AdminPanel';

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
  const [forceOffline, setForceOffline] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (!forceOffline) setErrorStatus(null);
      fetchVault();
    };
    const handleOffline = () => {
      setIsOnline(false);
      setErrorStatus("System Offline. Fallback active.");
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    fetchVault();
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [forceOffline]);

  const fetchVault = async () => {
    const cached = localStorage.getItem('omtoloki_vault');
    if (cached) {
      setVaultData(JSON.parse(cached));
    }

    if (navigator.onLine && !forceOffline) {
      try {
        const { data } = await supabase.from('knowledge_vault').select('*').order('created_at', { ascending: false });
        if (data) {
          setVaultData(data);
          localStorage.setItem('omtoloki_vault', JSON.stringify(data));
        }
      } catch (e) {
        console.warn("Supabase fetch failed, using local vault.");
      }
    }
  };

  const handleTranslate = async () => {
    if (!sourceText.trim()) return;
    setIsTranslating(true);
    setErrorStatus(null);
    const text = sourceText.trim().toLowerCase();
    
    // 1. Vault Check (Check local first)
    const sourceCol = sourceLang === Language.ENGLISH ? 'english_word' : 'oshikwanyama_word';
    const cached = vaultData.find(e => e[sourceCol].toLowerCase() === text);

    if (cached) {
      setTargetEntry(cached);
      setLastSource('vault');
      setIsTranslating(false);
      return;
    }

    // 2. AI Synthesis with Dialect Detection
    if (isOnline && !forceOffline) {
      try {
        const learnedEntry = await getAutonomousTranslation(text, sourceLang);
        
        if (learnedEntry) {
          setTargetEntry(learnedEntry);
          setLastSource('ai');

          // Persist if not guest
          if (!user.id.startsWith('guest_')) {
            const { data } = await supabase.from('knowledge_vault').upsert(learnedEntry, { onConflict: 'english_word' }).select();
            if (data) {
              const updatedVault = [data[0], ...vaultData].slice(0, 100);
              setVaultData(updatedVault);
              localStorage.setItem('omtoloki_vault', JSON.stringify(updatedVault));
            }
          }
        } else {
          throw new Error("AI synthesis returned empty.");
        }
      } catch (err: any) {
        setErrorStatus("Neural path blocked. Searching Vault...");
        fallbackSearch(text, sourceCol);
      }
    } else {
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
      setErrorStatus(forceOffline ? "Vault yielded no matches." : "No local records found.");
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

  const isActuallyLinked = isOnline && !forceOffline;

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {showAdmin && <AdminPanel currentUser={user} onClose={() => setShowAdmin(false)} />}
      
      <div className="lg:col-span-8 space-y-6">
        {/* Network Status & Dialect Warning Hub */}
        <div className={`flex flex-col md:flex-row items-center justify-between p-4 rounded-[2rem] border transition-all duration-500 ${isActuallyLinked ? 'bg-slate-900/40 border-white/5' : forceOffline ? 'bg-indigo-600/10 border-indigo-500/20' : 'bg-amber-500/10 border-amber-500/30'}`}>
          <div className="flex items-center gap-4 px-2">
            <div className={`w-3 h-3 rounded-full ${isActuallyLinked ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]' : forceOffline ? 'bg-indigo-500 shadow-[0_0_12px_rgba(79,70,229,0.5)]' : 'bg-amber-500 animate-pulse'}`}></div>
            <div className="flex flex-col">
              <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isActuallyLinked ? 'text-slate-300' : forceOffline ? 'text-indigo-400' : 'text-amber-400'}`}>
                {isActuallyLinked ? 'Dialect Guard Active' : forceOffline ? 'Isolated Archive' : 'Connection Lost'}
              </span>
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                System: Oshikwanyama ↔ English Core
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-3 mt-4 md:mt-0">
            {targetEntry?.detected_dialect === 'oshidonga' && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/20 border border-orange-500/40 text-[8px] font-black text-orange-400 uppercase tracking-widest animate-pulse">
                <AlertTriangle className="w-3 h-3" />
                Oshidonga Detected
              </div>
            )}
            
            <div className="flex items-center gap-3 bg-slate-950/40 p-1.5 pl-4 rounded-2xl border border-white/5">
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                {forceOffline ? 'Vault' : 'AI'}
               </span>
               <button 
                onClick={() => setForceOffline(!forceOffline)}
                className={`relative w-10 h-5 rounded-full transition-all duration-300 ${forceOffline ? 'bg-indigo-600' : 'bg-slate-800'}`}
               >
                 <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-300 shadow-sm ${forceOffline ? 'left-5.5' : 'left-0.5'}`}></div>
               </button>
            </div>
          </div>
        </div>

        {/* Dialect Explanation Alert */}
        {targetEntry?.dialect_correction_note && (
          <div className="p-5 rounded-[2rem] bg-orange-500/5 border border-orange-500/10 flex gap-4 items-start animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="p-2 bg-orange-500/20 rounded-xl text-orange-400">
              <Info className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <p className="text-[9px] font-black text-orange-400 uppercase tracking-widest">Linguistic Intelligence Note</p>
              <p className="text-xs text-slate-400 leading-relaxed font-medium italic">
                {targetEntry.dialect_correction_note}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
          {/* Source Input */}
          <div className="glass-panel p-8 rounded-[2.5rem] relative group border-white/5 focus-within:border-blue-500/30 transition-all">
            <div className="flex justify-between items-center mb-6">
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-400">
                {sourceLang === Language.ENGLISH ? 'English' : 'Oshikwanyama'}
              </span>
              <button 
                onClick={startListening}
                className={`p-3 rounded-2xl transition-all ${isListening ? 'bg-red-500 text-white animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'bg-slate-800 text-slate-500 hover:text-white'}`}
              >
                <Mic className="w-4 h-4" />
              </button>
            </div>
            <textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              className="w-full bg-transparent text-3xl font-bold text-white placeholder-slate-800 resize-none outline-none min-h-[140px] custom-scrollbar"
              placeholder="Signal Input..."
            />
            {sourceText && (
               <button onClick={() => setSourceText('')} className="absolute bottom-6 right-8 text-slate-600 hover:text-white transition-colors">
                 <RotateCcw className="w-4 h-4" />
               </button>
            )}
          </div>

          {/* Target Output */}
          <div className="glass-panel p-8 rounded-[2.5rem] border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl"></div>
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-400">
                  {sourceLang === Language.ENGLISH ? 'Oshikwanyama' : 'English'}
                </span>
                {lastSource && (
                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${lastSource === 'ai' ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                    {lastSource}
                  </span>
                )}
              </div>
              <button 
                onClick={() => speakText(sourceLang === Language.ENGLISH ? targetEntry?.oshikwanyama_word || '' : targetEntry?.english_word || '')} 
                disabled={!targetEntry}
                className="p-3 bg-slate-800 text-slate-500 rounded-2xl hover:text-indigo-400 disabled:opacity-30 transition-all"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>
            
            <div className="min-h-[140px] flex flex-col justify-between">
              {isTranslating ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-[9px] font-black text-indigo-400 uppercase animate-pulse tracking-[0.3em]">Dialect Discrimination Mapping</span>
                </div>
              ) : (
                <>
                  <p className={`text-3xl font-bold ${targetEntry ? 'text-white' : 'text-slate-800 italic'}`}>
                    {(sourceLang === Language.ENGLISH ? targetEntry?.oshikwanyama_word : targetEntry?.english_word) || 'Await Signal...'}
                  </p>
                  
                  {targetEntry && (
                    <div className="mt-6 pt-6 border-t border-white/5 space-y-3 animate-in fade-in slide-in-from-bottom-2">
                      <div className="flex gap-2 items-center">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-[8px] font-black text-indigo-400 uppercase">{targetEntry.word_types}</span>
                        <span className="text-[10px] text-slate-500 font-bold uppercase">{targetEntry.omaludi_oitja}</span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed italic">"{targetEntry.oshitya_metumbulo}"</p>
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
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 p-4 bg-slate-950 border border-slate-800 text-indigo-400 rounded-2xl shadow-2xl hover:scale-110 active:scale-95 transition-all z-10"
          >
            <ArrowRightLeft className="w-5 h-5" />
          </button>
        </div>

        <button
          onClick={handleTranslate}
          disabled={isTranslating || !sourceText.trim()}
          className={`w-full py-6 text-white font-black text-sm uppercase tracking-[0.4em] rounded-[2rem] shadow-2xl transition-all active:scale-[0.99] disabled:opacity-50 ${isActuallyLinked ? 'bg-gradient-to-r from-indigo-600 to-blue-600 shadow-indigo-600/30' : 'bg-gradient-to-r from-slate-800 to-slate-900 border border-white/5'}`}
        >
          {isTranslating ? 'Analyzing Dialects...' : isActuallyLinked ? 'Synthesize Signal' : 'Search Local Archive'}
        </button>
      </div>

      <div className="lg:col-span-4 space-y-8">
        <div className="glass-panel p-8 rounded-[2.5rem] border-white/5 flex flex-col h-[600px]">
          <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-6">
            <div className="flex items-center gap-3">
              <History className="w-5 h-5 text-indigo-500" />
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-300">Sync History</h3>
            </div>
            <div className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${forceOffline ? 'bg-indigo-500/10 text-indigo-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
              {forceOffline ? 'Isolated' : 'Cloud Sync'}
            </div>
          </div>
          
          <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
            {vaultData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-30">
                <Database className="w-10 h-10" />
                <p className="text-[10px] font-black uppercase tracking-widest">Archive Empty</p>
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
                  className="w-full text-left p-4 rounded-2xl bg-slate-900/40 border border-white/5 hover:border-indigo-500/30 hover:bg-slate-900 transition-all group"
                >
                  <div className="flex justify-between items-center">
                     <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{e.english_word}</p>
                     <ChevronRight className="w-3 h-3 text-slate-700 group-hover:text-indigo-400 transition-colors" />
                  </div>
                  <p className="text-sm font-bold text-white mt-1">{e.oshikwanyama_word}</p>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="p-6 rounded-[2rem] bg-indigo-600/5 border border-indigo-500/10 text-center space-y-3">
          <Zap className="w-5 h-5 text-indigo-400 mx-auto" />
          <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">Dialect Filter Active</p>
          <p className="text-[10px] text-slate-500 leading-relaxed uppercase font-black">System now automatically corrects for Oshidonga drift to maintain Oshikwanyama purity.</p>
        </div>
      </div>
    </div>
  );
};

export default Translator;
