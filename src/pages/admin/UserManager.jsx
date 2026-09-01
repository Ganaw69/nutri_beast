import React, { useState, useEffect, useCallback } from 'react';
import { userService } from '../../services/api';
import { Plus, Edit2, Trash2, Search, X, Loader2, Check, User } from 'lucide-react';
import { AdminActionButton } from '../../components/admin/AdminActionButton';

const EMPTY = { email: '', firstName: '', lastName: '', phone: '', roles: ['ROLE_USER'], plainPassword: '' };

export const UserManager = () => {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await userService.getAll({ itemsPerPage: 50 });
      setUsers(data['hydra:member'] || []);
      setTotal(data['hydra:totalItems'] || 0);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const openAdd = () => { setForm(EMPTY); setModal({ mode: 'add' }); setError(''); };
  const openEdit = (u) => {
    setForm({ email: u.email || '', firstName: u.firstName || '', lastName: u.lastName || '', phone: u.phone || '', roles: u.roles || ['ROLE_USER'], plainPassword: '' });
    setModal({ mode: 'edit', id: u.id });
    setError('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { ...form };
      if (!payload.plainPassword) delete payload.plainPassword;
      if (modal.mode === 'add') await userService.create(payload);
      else await userService.update(modal.id, payload);
      setModal(null);
      fetchUsers();
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cet utilisateur ?')) return;
    try { await userService.delete(id); fetchUsers(); } catch (e) { alert(e.message); }
  };

  const toggleRole = (role) => setForm(p => ({
    ...p, roles: p.roles.includes(role) ? p.roles.filter(r => r !== role) : [...p.roles, role]
  }));

  const filtered = users.filter(u => !search || `${u.email} ${u.firstName} ${u.lastName}`.toLowerCase().includes(search.toLowerCase()));
  const inputCls = "w-full bg-[#222] border border-[#333] text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#d90429]";
  const labelCls = "block text-xs font-bold text-gray-400 uppercase mb-1.5";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Utilisateurs</h1>
          <p className="text-gray-400 text-sm">{total} utilisateur{total !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openAdd} className="bg-[#d90429] hover:bg-[#ff1a3c] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-lg shadow-[#d90429]/20">
          <Plus size={16} /> Nouvel Utilisateur
        </button>
      </div>

      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[#2a2a2a] bg-[#1a1a1a]">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
            <input type="text" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full bg-[#222] border border-[#333] text-sm text-white rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:border-[#d90429]"
            />
          </div>
        </div>
        <div className="divide-y divide-[#2a2a2a]">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-[#d90429] animate-spin" /></div>
          ) : filtered.map(u => (
            <div key={u.id} className="p-5 hover:bg-[#1a1a1a] flex items-center justify-between group transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#d90429]/20 flex items-center justify-center shrink-0">
                  <User size={16} className="text-[#d90429]" />
                </div>
                <div>
                  <div className="font-bold text-white text-sm">{u.firstName} {u.lastName}</div>
                  <div className="text-xs text-gray-400">{u.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  {(u.roles || []).filter(r => r !== 'ROLE_USER').map(r => (
                    <span key={r} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#d90429]/10 text-[#d90429] border border-[#d90429]/20">{r.replace('ROLE_', '')}</span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <AdminActionButton label="Edit" onClick={() => openEdit(u)} className="p-1.5 text-gray-300 hover:text-white hover:bg-[#333]">
                    <Edit2 size={14} />
                  </AdminActionButton>
                  <AdminActionButton label="Delete" onClick={() => handleDelete(u.id)} className="p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-400/10">
                    <Trash2 size={14} />
                  </AdminActionButton>
                </div>
              </div>
            </div>
          ))}
          {!loading && filtered.length === 0 && <div className="text-center py-8 text-gray-500">Aucun utilisateur.</div>}
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center p-5 border-b border-[#2a2a2a]">
              <h2 className="text-lg font-bold text-white">{modal.mode === 'add' ? 'Nouvel Utilisateur' : 'Modifier l\'Utilisateur'}</h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              {error && <div className="text-red-400 text-xs bg-red-900/20 border border-red-500/30 rounded-lg p-3">{error}</div>}
              <div><label className={labelCls}>Email *</label><input type="email" required value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className={inputCls} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>Prénom</label><input value={form.firstName} onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))} className={inputCls} /></div>
                <div><label className={labelCls}>Nom</label><input value={form.lastName} onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))} className={inputCls} /></div>
              </div>
              <div><label className={labelCls}>Mot de passe {modal.mode === 'edit' ? '(laisser vide pour ne pas changer)' : '*'}</label>
                <input type="password" required={modal.mode === 'add'} value={form.plainPassword} onChange={e => setForm(p => ({ ...p, plainPassword: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Rôles</label>
                <div className="flex flex-wrap gap-2">
                  {['ROLE_USER','ROLE_ADMIN','ROLE_SUPER_ADMIN'].map(r => (
                    <button type="button" key={r} onClick={() => toggleRole(r)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${form.roles.includes(r) ? 'bg-[#d90429]/10 border-[#d90429] text-[#d90429]' : 'bg-[#111] border-[#333] text-gray-400'}`}
                    >{r.replace('ROLE_', '')}</button>
                  ))}
                </div>
              </div>
            </form>
            <div className="p-5 border-t border-[#2a2a2a] flex gap-3 justify-end bg-[#1a1a1a] rounded-b-xl">
              <button onClick={() => setModal(null)} className="px-5 py-2.5 text-sm font-bold text-gray-300 hover:text-white">Annuler</button>
              <button onClick={handleSave} disabled={saving} className="bg-[#d90429] hover:bg-[#ff1a3c] text-white px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 disabled:opacity-60">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
