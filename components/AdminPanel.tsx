
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient.ts';
import { UserRole, DictionaryEntry, UserProfile } from '../types.ts';
import { 
  Users, 
  Database, 
  Shield, 
  Edit3, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Search, 
  MoreVertical,
  Save,
  Lock,
  Unlock,
  Plus
} from 'lucide-react';

interface AdminPanelProps {
  currentUser: any;
  onClose: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ currentUser, onClose }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'vault'>('vault');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [vault, setVault] = useState<DictionaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<number | string | null>(null);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    if (activeTab === 'users') {
      const { data } = await supabase.from('profiles').select('*');
      if (data) setUsers(data);
    } else {
      const { data } = await supabase.from('knowledge_vault').select('*').order('created_at', { ascending: false });
      if (data) setVault(data);
    }
    setLoading(false);
  };

  const toggleRole = async (userId: string, currentRole: UserRole) => {
    const nextRole = currentRole === UserRole.AUTHORIZED ? UserRole.GUEST : UserRole.AUTHORIZED;
    await supabase.from('profiles').update({ role: nextRole }).eq('id', userId);
    fetchData();
  };

  const updateEntry = async (entry: DictionaryEntry) => {
    await supabase.from('knowledge_vault').upsert(entry);
    setEditingId(null);
    fetchData();
  };

  const deleteEntry = async (id: number) => {
    if (confirm('Erase this knowledge record?')) {
      await supabase.from('knowledge_vault').delete().eq('id', id);
      fetchData();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl" onClick={onClose}></div>
      
      <div className="glass-panel w-full max-w-6xl max-h-[90vh] rounded-[2.5rem] overflow-hidden flex flex-col relative z-10 border-white/10">
        <div className="p-8 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600/20 rounded-2xl border border-indigo-500/20">
              <Shield className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Command Center</h2>
              <p className="text-[10px] text-slate-500 font-black tracking-widest uppercase">Autonomous Management Hub</p>
            </div>
          </div>

          <div className="flex bg-slate-900/60 p-1.5 rounded-2xl border border-white/5">
            <button 
              onClick={() => setActiveTab('vault')}
              className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'vault' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:text-white'}`}
            >
              <Database className="w-3.5 h-3.5" /> Cognitive Vault
            </button>
            <button 
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:text-white'}`}
            >
              <Users className="w-3.5 h-3.5" /> Personnel
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-8 custom-scrollbar bg-slate-950/20">
          <div className="mb-6 flex gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-indigo-400 transition-colors" />
              <input 
                type="text" 
                placeholder={`Search ${activeTab}...`}
                className="w-full bg-slate-900/40 border border-white/5 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {activeTab === 'vault' && (
              <button className="bg-indigo-600 hover:bg-indigo-500 text-white p-3.5 rounded-2xl transition-all shadow-xl shadow-indigo-600/20">
                <Plus className="w-5 h-5" />
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : activeTab === 'vault' ? (
            <div className="space-y-4">
              {vault.filter(e => e.english_word.includes(search) || e.oshikwanyama_word.includes(search)).map((entry) => (
                <div key={entry.id} className="group relative glass-panel p-6 rounded-[1.5rem] border-white/5 hover:border-indigo-500/20 transition-all">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Words</p>
                      <p className="text-white font-bold">{entry.oshikwanyama_word} <span className="text-indigo-400">↔</span> {entry.english_word}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Type / Plurals</p>
                      <p className="text-slate-300 text-xs font-medium">{entry.word_types} • {entry.omaludi_oitja}</p>
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Context (Oshikwanyama / EN)</p>
                      <p className="text-slate-400 text-[11px] leading-relaxed italic">{entry.oshitya_metumbulo}</p>
                      <p className="text-slate-500 text-[10px] leading-relaxed">{entry.word_in_phrase_sentence}</p>
                    </div>
                  </div>
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 bg-slate-800 rounded-lg hover:text-indigo-400"><Edit3 className="w-4 h-4" /></button>
                    <button onClick={() => deleteEntry(entry.id!)} className="p-2 bg-slate-800 rounded-lg hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {users.map(u => (
                <div key={u.id} className="glass-panel p-6 rounded-[2rem] border-white/5 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-600 to-blue-700 flex items-center justify-center font-black text-white">
                      {u.email[0].toUpperCase()}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-sm font-bold text-white truncate">{u.email}</p>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{u.role}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => toggleRole(u.id, u.role)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${u.role === UserRole.AUTHORIZED ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20'}`}
                    >
                      {u.role === UserRole.AUTHORIZED ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                      {u.role === UserRole.AUTHORIZED ? 'Demote' : 'Authorize'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
