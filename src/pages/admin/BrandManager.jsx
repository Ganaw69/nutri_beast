import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { brandService, mediaUrl } from '../../services/api';
import { Check, Edit2, Globe, Image as ImageIcon, Loader2, Plus, Search, Trash2, Upload, X } from 'lucide-react';
import { AdminActionButton } from '../../components/admin/AdminActionButton';

const EMPTY_FORM = { name: '', slug: '', description: '', website: '', isActive: true };
const getBrandId = (brand) => brand?.id ?? String(brand?.['@id'] || '').split('/').pop();
const getLogoUrl = (brand) => {
  const logo = brand?.logo ?? brand?.logoFile ?? brand?.logoPath ?? brand?.image;
  if (!logo) return null;
  if (typeof logo === 'object') return getLogoUrl({ logo: logo.url ?? logo.path ?? logo.contentUrl ?? logo.name });
  if (String(logo).startsWith('http') || String(logo).startsWith('/')) return logo;
  return mediaUrl(`brands/${logo}`);
};

export const BrandManager = () => {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [logoFile, setLogoFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchBrands = useCallback(async () => {
    setLoading(true);
    try {
      const data = await brandService.getAll({ itemsPerPage: 100 });
      setBrands(data['hydra:member'] || []);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBrands(); }, [fetchBrands]);

  const filteredBrands = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return brands;
    return brands.filter((brand) => [brand.name, brand.slug, brand.website]
      .filter(Boolean).some((value) => String(value).toLowerCase().includes(term)));
  }, [brands, search]);

  const openAdd = () => {
    setError(''); setForm(EMPTY_FORM); setLogoFile(null); setModal({ mode: 'add' });
  };
  const openEdit = (brand) => {
    setError('');
    setForm({ name: brand.name || '', slug: brand.slug || '', description: brand.description || '', website: brand.website || '', isActive: brand.isActive ?? brand.active ?? true });
    setLogoFile(null); setModal({ mode: 'edit', id: getBrandId(brand), brand });
  };

  const handleSave = async (event) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const payload = new FormData();
      payload.append('name', form.name.trim());
      payload.append('slug', form.slug.trim());
      payload.append('description', form.description.trim());
      payload.append('website', form.website.trim());
      payload.append('isActive', String(form.isActive));
      if (logoFile) payload.append('logoFile', logoFile);
      if (modal.mode === 'add') await brandService.create(payload);
      else await brandService.update(modal.id, payload);
      setModal(null); fetchBrands();
    } catch (requestError) {
      setError(requestError.message);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette marque ?')) return;
    try { await brandService.delete(id); fetchBrands(); } catch (requestError) { window.alert(requestError.message); }
  };

  const inputClass = 'w-full bg-[#111] border border-[#333] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#d90429] transition-colors';
  const labelClass = 'block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5';

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><h1 className="text-2xl font-bold text-white mb-1">Gestion des marques</h1><p className="text-gray-400 text-sm">{brands.length} marque{brands.length !== 1 ? 's' : ''} au total</p></div>
      <button onClick={openAdd} className="bg-[#d90429] hover:bg-[#ff1a3c] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-[#d90429]/20"><Plus size={16} /> Nouvelle marque</button>
    </div>
    {error && !modal && <div className="text-red-400 text-sm bg-red-900/20 border border-red-500/30 rounded-lg p-3">{error}</div>}
    <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
      <div className="p-4 border-b border-[#2a2a2a] bg-[#1a1a1a]"><div className="relative max-w-xs"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher une marque..." className="w-full bg-[#222] border border-[#333] text-sm text-white rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:border-[#d90429]" /></div></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="bg-[#1a1a1a] border-b border-[#2a2a2a] text-[11px] uppercase tracking-wide text-gray-500"><tr><th className="px-5 py-3 font-bold">Logo</th><th className="px-5 py-3 font-bold">Marque</th><th className="px-5 py-3 font-bold">Description</th><th className="px-5 py-3 font-bold">Site web</th><th className="px-5 py-3 font-bold">Statut</th><th className="px-5 py-3 font-bold text-right">Actions</th></tr></thead><tbody className="divide-y divide-[#2a2a2a]">
        {loading ? <tr><td colSpan="6" className="py-12 text-center"><Loader2 className="inline w-6 h-6 text-[#d90429] animate-spin" /></td></tr> : filteredBrands.map((brand) => {
          const logoUrl = getLogoUrl(brand); const isActive = brand.isActive ?? brand.active ?? true;
          return <tr key={getBrandId(brand)} className="hover:bg-[#1a1a1a] transition-colors"><td className="px-5 py-3"><div className="w-11 h-11 rounded-lg bg-[#111] border border-[#333] overflow-hidden flex items-center justify-center">{logoUrl ? <img src={logoUrl} alt="" className="w-full h-full object-contain" /> : <ImageIcon size={18} className="text-gray-600" />}</div></td><td className="px-5 py-3"><p className="font-bold text-white text-sm">{brand.name}</p><p className="text-xs text-gray-500 mt-0.5">/{brand.slug || '—'}</p></td><td className="px-5 py-3 max-w-xs"><p className="text-xs text-gray-400 line-clamp-2">{brand.description || '—'}</p></td><td className="px-5 py-3">{brand.website ? <a href={brand.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-gray-300 hover:text-white"><Globe size={12} /><span className="max-w-40 truncate">{brand.website}</span></a> : <span className="text-xs text-gray-600">—</span>}</td><td className="px-5 py-3"><span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ${isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>{isActive ? 'Active' : 'Inactive'}</span></td><td className="px-5 py-3"><div className="flex justify-end gap-2"><AdminActionButton label="Modifier" onClick={() => openEdit(brand)} className="p-1.5 text-gray-300 hover:text-white hover:bg-[#333]"><Edit2 size={14} /></AdminActionButton><AdminActionButton label="Supprimer" onClick={() => handleDelete(getBrandId(brand))} className="p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-400/10"><Trash2 size={14} /></AdminActionButton></div></td></tr>;
        })}
        {!loading && filteredBrands.length === 0 && <tr><td colSpan="6" className="text-center py-10 text-sm text-gray-500">Aucune marque trouvée.</td></tr>}
      </tbody></table></div>
    </div>
    {modal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"><div className="bg-[#161616] border border-[#2a2a2a] rounded-xl w-full max-w-lg shadow-2xl"><div className="flex justify-between items-center p-5 border-b border-[#2a2a2a]"><h2 className="text-lg font-bold text-white">{modal.mode === 'add' ? 'Nouvelle marque' : 'Modifier la marque'}</h2><button onClick={() => setModal(null)} className="text-gray-400 hover:text-white" aria-label="Fermer"><X size={18} /></button></div><form onSubmit={handleSave} className="p-5 space-y-4">{error && <div className="text-red-400 text-xs bg-red-900/20 border border-red-500/30 rounded-lg p-3">{error}</div>}<div className="grid sm:grid-cols-2 gap-4"><div><label className={labelClass}>Nom *</label><input required value={form.name} onChange={(event) => setForm((previous) => ({ ...previous, name: event.target.value }))} className={inputClass} /></div><div><label className={labelClass}>Slug *</label><input required value={form.slug} onChange={(event) => setForm((previous) => ({ ...previous, slug: event.target.value }))} className={inputClass} placeholder="ex: optimum-nutrition" /></div></div><div><label className={labelClass}>Description</label><textarea rows="3" value={form.description} onChange={(event) => setForm((previous) => ({ ...previous, description: event.target.value }))} className={`${inputClass} resize-none`} /></div><div><label className={labelClass}>Site web</label><input type="url" value={form.website} onChange={(event) => setForm((previous) => ({ ...previous, website: event.target.value }))} className={inputClass} placeholder="https://..." /></div><div><label className={labelClass}>Logo</label>{modal.brand && getLogoUrl(modal.brand) && <img src={getLogoUrl(modal.brand)} alt="Logo actuel" className="w-16 h-16 object-contain rounded-lg bg-[#111] border border-[#333] mb-2" />}<label className="border-2 border-dashed border-[#333] rounded-lg p-3 text-center hover:bg-[#222] transition-colors cursor-pointer block"><Upload size={16} className="mx-auto text-gray-500 mb-1" /><span className="text-xs text-gray-500">{logoFile ? logoFile.name : 'Choisir un fichier image'}</span><input type="file" accept="image/*" className="hidden" onChange={(event) => setLogoFile(event.target.files?.[0] || null)} /></label></div><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm((previous) => ({ ...previous, isActive: event.target.checked }))} className="accent-[#d90429]" /><span className="text-sm text-gray-300">Marque active</span></label></form><div className="p-5 border-t border-[#2a2a2a] flex gap-3 justify-end bg-[#1a1a1a] rounded-b-xl"><button onClick={() => setModal(null)} className="px-5 py-2.5 text-sm font-bold text-gray-300 hover:text-white">Annuler</button><button onClick={handleSave} disabled={saving} className="bg-[#d90429] hover:bg-[#ff1a3c] text-white px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 disabled:opacity-60">{saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Enregistrer</button></div></div></div>}
  </div>;
};
