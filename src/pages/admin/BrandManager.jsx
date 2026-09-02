import React, { useState, useEffect, useCallback } from 'react';
import { brandService } from '../../services/api';
import { Plus, Edit2, Trash2, Search, X, Loader2, Check, Globe } from 'lucide-react';
import { AdminActionButton } from '../../components/admin/AdminActionButton';

const EMPTY = { name: '', description: '', website: '', isActive: true };

export const BrandManager = () => {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchBrands = useCallback(async () => {
    setLoading(true);
    try {
      const data = await brandService.getAll({ itemsPerPage: 100 });
      setBrands(data['hydra:member'] || []);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchBrands(); }, [fetchBrands]);

  const openAdd = () => { setForm(EMPTY); setModal({ mode: 'add' }); setError(''); };
  const openEdit = (b) => {
    setForm({ name: b.name || '', description: b.description || '', website: b.website || '', isActive: b.isActive ?? true });
    setModal({ mode: 'edit', id: b.id });
    setError('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (modal.mode === 'add') await brandService.create(form);
      else await brandService.update(modal.id, form);
      setModal(null);
      fetchBrands();
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette marque ?')) return;
    try { await brandService.delete(id); fetchBrands(); } catch (e) { alert(e.message); }
  };

  const inputCls = "w-full bg-[#222] border border-[#333] text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#d90429]";
  const labelCls = "block text-xs font-bold text-gray-400 uppercase mb-1.5";

  const filtered = brands.filter(b => !search || b.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Gestion Marques</h1>
          <p className="text-gray-400 text-sm">{brands.length} marque{brands.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openAdd} className="bg-[#d90429] hover:bg-[#ff1a3c] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-lg shadow-[#d90429]/20">
          <Plus size={16} /> Nouvelle Marque
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
          ) : filtered.map(b => (
            <div key={b.id} className="p-5 hover:bg-[#1a1a1a] flex items-center justify-between group transition-colors">
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-white">{b.name}</span>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${b.isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
                    {b.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {b.website && <div className="flex items-center gap-1 text-xs text-gray-500 mt-1"><Globe size={10} />{b.website}</div>}
                {b.description && <p className="text-xs text-gray-400 mt-1 line-clamp-1">{b.description}</p>}
              </div>
              <div className="flex gap-2">
                <AdminActionButton label="Edit" onClick={() => openEdit(b)} className="p-1.5 text-gray-300 hover:text-white hover:bg-[#333]">
                  <Edit2 size={14} />
                </AdminActionButton>
                <AdminActionButton label="Delete" onClick={() => handleDelete(b.id)} className="p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-400/10">
                  <Trash2 size={14} />
                </AdminActionButton>
              </div>
            </div>
          ))}
          {!loading && filtered.length === 0 && <div className="text-center py-8 text-gray-500">Aucune marque trouvée.</div>}
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center p-5 border-b border-[#2a2a2a]">
              <h2 className="text-lg font-bold text-white">{modal.mode === 'add' ? 'Nouvelle Marque' : 'Modifier la Marque'}</h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              {error && <div className="text-red-400 text-xs bg-red-900/20 border border-red-500/30 rounded-lg p-3">{error}</div>}
              <div><label className={labelCls}>Nom *</label><input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inputCls} /></div>
              <div><label className={labelCls}>Description</label><textarea rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className={`${inputCls} resize-none`} /></div>
              <div><label className={labelCls}>Site web</label><input type="url" value={form.website} onChange={e => setForm(p => ({ ...p, website: e.target.value }))} className={inputCls} placeholder="https://..." /></div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))} className="accent-[#d90429]" />
                <span className="text-sm text-gray-300">Active</span>
              </label>
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
