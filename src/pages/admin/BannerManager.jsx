import React, { useState, useEffect, useCallback } from 'react';
import { bannerService } from '../../services/api';
import { Plus, Trash2, Edit2, X, Loader2, Check, Upload, Image } from 'lucide-react';

const DESKTOP_BASE = 'https://127.0.0.1:8000/uploads/banners/desktop/';
const MOBILE_BASE  = 'https://127.0.0.1:8000/uploads/banners/mobile/';

const LINK_TYPES = ['PRODUCT', 'CATEGORY', 'CMS', 'EXTERNAL_URL'];
const EMPTY = { title: '', subtitle: '', description: '', buttonLabel: '', buttonLink: '', linkType: 'EXTERNAL_URL', position: 0, isActive: true, startDate: '', endDate: '' };

export const BannerManager = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | {mode:'add'|'edit', id?}
  const [form, setForm] = useState(EMPTY);
  const [desktopFile, setDesktopFile] = useState(null);
  const [mobileFile, setMobileFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchBanners = useCallback(async () => {
    setLoading(true);
    try {
      const data = await bannerService.getAll();
      setBanners(data['hydra:member'] || []);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchBanners(); }, [fetchBanners]);

  const openAdd = () => { setForm(EMPTY); setDesktopFile(null); setMobileFile(null); setModal({ mode: 'add' }); setError(''); };
  const openEdit = (b) => {
    setForm({
      title: b.title || '', subtitle: b.subtitle || '', description: b.description || '',
      buttonLabel: b.buttonLabel || '', buttonLink: b.buttonLink || '',
      linkType: b.linkType || 'EXTERNAL_URL', position: b.position || 0,
      isActive: b.isActive ?? true,
      startDate: b.startDate ? b.startDate.slice(0, 16) : '',
      endDate: b.endDate ? b.endDate.slice(0, 16) : '',
    });
    setDesktopFile(null); setMobileFile(null);
    setModal({ mode: 'edit', id: b.id });
    setError('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v !== '' && v !== null) fd.append(k, String(v)); });
      if (desktopFile) fd.append('imageDesktop', desktopFile);
      if (mobileFile) fd.append('imageMobile', mobileFile);

      if (modal.mode === 'add') await bannerService.create(fd);
      else await bannerService.update(modal.id, fd);
      setModal(null);
      fetchBanners();
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette bannière ?')) return;
    try { await bannerService.delete(id); fetchBanners(); } catch (e) { alert(e.message); }
  };

  const inputCls = "w-full bg-[#222] border border-[#333] text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#d90429]";
  const labelCls = "block text-xs font-bold text-gray-400 uppercase mb-1.5";

  const FileInput = ({ label, file, setFile, preview }) => (
    <div>
      <label className={labelCls}>{label}</label>
      {preview && <img src={preview} alt="" className="w-full h-24 object-cover rounded-lg mb-2 opacity-60" />}
      <label className="border-2 border-dashed border-[#333] rounded-lg p-3 text-center hover:bg-[#222] transition-colors cursor-pointer block">
        <Upload size={16} className="mx-auto text-gray-500 mb-1" />
        <span className="text-xs text-gray-500">{file ? file.name : 'Choisir un fichier'}</span>
        <input type="file" accept="image/*" className="hidden" onChange={e => setFile(e.target.files[0])} />
      </label>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Gestion Bannières</h1>
          <p className="text-gray-400 text-sm">Bannières hero avec images desktop et mobile.</p>
        </div>
        <button onClick={openAdd} className="bg-[#d90429] hover:bg-[#ff1a3c] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-lg shadow-[#d90429]/20">
          <Plus size={16} /> Nouvelle Bannière
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-[#d90429] animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {banners.map(b => (
            <div key={b.id} className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden group">
              <div className="aspect-video bg-[#111] relative">
                {b.imageDesktop ? (
                  <img src={`${DESKTOP_BASE}${b.imageDesktop}`} alt={b.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600"><Image size={40} /></div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-4">
                  <div>
                    <h3 className="font-black text-white text-sm">{b.title}</h3>
                    {b.subtitle && <p className="text-gray-300 text-xs">{b.subtitle}</p>}
                  </div>
                </div>
                <div className="absolute top-3 right-3 flex gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${b.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'}`}>
                    {b.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <div className="p-4 flex items-center justify-between">
                <div className="text-xs text-gray-400">
                  <span className="font-bold text-white mr-2">Position {b.position}</span>
                  {b.linkType && <span className="bg-[#333] px-2 py-0.5 rounded">{b.linkType}</span>}
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(b)} className="p-1.5 text-gray-400 hover:text-white hover:bg-[#333] rounded-lg"><Edit2 size={14} /></button>
                  <button onClick={() => handleDelete(b.id)} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
          {banners.length === 0 && <div className="col-span-2 text-center py-10 text-gray-500">Aucune bannière.</div>}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl w-full max-w-lg shadow-2xl flex flex-col max-h-[92vh]">
            <div className="flex justify-between items-center p-5 border-b border-[#2a2a2a]">
              <h2 className="text-lg font-bold text-white">{modal.mode === 'add' ? 'Nouvelle Bannière' : 'Modifier la Bannière'}</h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} className="p-5 overflow-y-auto flex-1 space-y-4">
              {error && <div className="text-red-400 text-xs bg-red-900/20 border border-red-500/30 rounded-lg p-3">{error}</div>}
              <div><label className={labelCls}>Titre *</label><input required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className={inputCls} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>Sous-titre</label><input value={form.subtitle} onChange={e => setForm(p => ({ ...p, subtitle: e.target.value }))} className={inputCls} /></div>
                <div><label className={labelCls}>Position</label><input type="number" value={form.position} onChange={e => setForm(p => ({ ...p, position: e.target.value }))} className={inputCls} /></div>
              </div>
              <div><label className={labelCls}>Description</label><textarea rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className={`${inputCls} resize-none`} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>Label bouton</label><input value={form.buttonLabel} onChange={e => setForm(p => ({ ...p, buttonLabel: e.target.value }))} className={inputCls} /></div>
                <div><label className={labelCls}>Lien bouton</label><input value={form.buttonLink} onChange={e => setForm(p => ({ ...p, buttonLink: e.target.value }))} className={inputCls} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>Type de lien</label>
                  <select value={form.linkType} onChange={e => setForm(p => ({ ...p, linkType: e.target.value }))} className={inputCls}>
                    {LINK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <label className="flex items-center gap-2 cursor-pointer mt-6">
                  <input type="checkbox" checked={form.isActive} onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))} className="accent-[#d90429]" />
                  <span className="text-sm text-gray-300">Active</span>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>Début</label><input type="datetime-local" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} className={inputCls} /></div>
                <div><label className={labelCls}>Fin</label><input type="datetime-local" value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} className={inputCls} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FileInput label="Image Desktop" file={desktopFile} setFile={setDesktopFile} />
                <FileInput label="Image Mobile" file={mobileFile} setFile={setMobileFile} />
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
