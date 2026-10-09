import React, { useCallback, useEffect, useState } from 'react';
import { Check, Edit2, Image, Loader2, Plus, Trash2, Upload, X } from 'lucide-react';
import { AdminActionButton } from '../../components/admin/AdminActionButton';
import { couvertureService, mediaUrl } from '../../services/api';

const NAVIGATION_TYPES = ['category', 'product', 'page', 'url'];
const EMPTY_FORM = {
  name: '',
  title: '',
  subtitle: '',
  buttonText: '',
  navigationType: 'url',
  navigation: '',
  index: 0,
  active: true,
  startDate: '',
  endDate: '',
};
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const toDateTimeLocal = (value) => (value ? String(value).slice(0, 16) : '');
const imagePath = (filename) => (filename ? mediaUrl(`couvertures/${filename}`) : null);

export const CouvertureManager = () => {
  const [couvertures, setCouvertures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [desktopFile, setDesktopFile] = useState(null);
  const [mobileFile, setMobileFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchCouvertures = useCallback(async () => {
    setLoading(true);
    try {
      const data = await couvertureService.getAll();
      setCouvertures(data?.['hydra:member'] || data?.member || (Array.isArray(data) ? data : []));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCouvertures(); }, [fetchCouvertures]);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setDesktopFile(null);
    setMobileFile(null);
    setError('');
    setModal({ mode: 'add' });
  };

  const openEdit = (couverture) => {
    setForm({
      name: couverture.name || '',
      title: couverture.title || '',
      subtitle: couverture.subtitle || '',
      buttonText: couverture.buttonText || '',
      navigationType: NAVIGATION_TYPES.includes(couverture.navigationType) ? couverture.navigationType : 'url',
      navigation: couverture.navigation || '',
      index: couverture.index ?? 0,
      active: couverture.active ?? true,
      startDate: toDateTimeLocal(couverture.startDate),
      endDate: toDateTimeLocal(couverture.endDate),
    });
    setDesktopFile(null);
    setMobileFile(null);
    setError('');
    setModal({ mode: 'edit', couverture });
  };

  const validateFile = (file, label) => {
    if (!file) return '';
    if (!IMAGE_TYPES.includes(file.type)) return `${label} doit être au format JPEG, PNG ou WebP.`;
    if (file.size > MAX_FILE_SIZE) return `${label} ne doit pas dépasser 5 Mo.`;
    return '';
  };

  const selectFile = (event, setFile, label) => {
    const file = event.target.files?.[0] || null;
    const fileError = validateFile(file, label);
    setError(fileError);
    setFile(fileError ? null : file);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    const desktopError = validateFile(desktopFile, 'L’image desktop');
    const mobileError = validateFile(mobileFile, 'L’image mobile');
    if (desktopError || mobileError) {
      setError(desktopError || mobileError);
      return;
    }
    if (modal.mode === 'add' && !desktopFile) {
      setError('L’image desktop est obligatoire à la création.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const data = new FormData();
      data.append('name', form.name);
      data.append('title', form.title);
      data.append('subtitle', form.subtitle);
      data.append('buttonText', form.buttonText);
      data.append('navigationType', form.navigationType);
      data.append('navigation', form.navigation);
      data.append('index', String(Math.max(0, Number(form.index) || 0)));
      data.append('active', form.active ? 'true' : 'false');
      data.append('startDate', form.startDate);
      data.append('endDate', form.endDate);
      if (desktopFile) data.append('image', desktopFile);
      if (mobileFile) data.append('imageMobile', mobileFile);

      if (modal.mode === 'add') await couvertureService.create(data);
      else await couvertureService.update(modal.couverture.id, data);
      setModal(null);
      await fetchCouvertures();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette couverture ?')) return;
    try {
      await couvertureService.delete(id);
      await fetchCouvertures();
    } catch (requestError) {
      window.alert(requestError.message);
    }
  };

  const inputClass = 'w-full bg-[#222] border border-[#333] text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#d90429]';
  const labelClass = 'block text-xs font-bold text-gray-400 uppercase mb-1.5';
  const current = modal?.couverture;

  const FileInput = ({ label, file, onChange, preview, required = false }) => (
    <div>
      <label className={labelClass}>{label}{required ? ' *' : ''}</label>
      {preview && <img src={preview} alt="" className="w-full h-24 object-cover rounded-lg mb-2 opacity-70" />}
      <label className="border-2 border-dashed border-[#333] rounded-lg p-3 text-center hover:bg-[#222] transition-colors cursor-pointer block">
        <Upload size={16} className="mx-auto text-gray-500 mb-1" />
        <span className="text-xs text-gray-500">{file ? file.name : 'JPEG, PNG ou WebP · 5 Mo max.'}</span>
        <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onChange} />
      </label>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Gestion des couvertures</h1>
          <p className="text-gray-400 text-sm">Images desktop et mobile affichées sur le site.</p>
        </div>
        <button onClick={openAdd} className="bg-[#d90429] hover:bg-[#ff1a3c] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-lg shadow-[#d90429]/20">
          <Plus size={16} /> Nouvelle couverture
        </button>
      </div>

      {error && !modal && <div className="text-red-400 text-sm bg-red-900/20 border border-red-500/30 rounded-lg p-3">{error}</div>}
      {loading ? <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-[#d90429] animate-spin" /></div> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {couvertures.map((couverture) => (
            <article key={couverture.id} className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
              <div className="aspect-video bg-[#111] relative">
                {couverture.image ? <img src={imagePath(couverture.image)} alt={couverture.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-600"><Image size={40} /></div>}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent flex items-end p-4">
                  <div><h2 className="font-black text-white text-base">{couverture.name}</h2>{couverture.title && <p className="text-gray-300 text-xs mt-0.5">{couverture.title}</p>}</div>
                </div>
                <span className={`absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full ${couverture.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-300'}`}>{couverture.active ? 'Active' : 'Inactive'}</span>
              </div>
              <div className="p-4 flex items-center justify-between gap-3">
                <div className="text-xs text-gray-400"><span className="font-bold text-white mr-2">Index {couverture.index ?? 0}</span><span className="bg-[#333] px-2 py-0.5 rounded">{couverture.navigationType || 'url'}</span></div>
                <div className="flex gap-2">
                  <AdminActionButton label="Modifier" onClick={() => openEdit(couverture)} className="p-1.5 text-gray-300 hover:text-white hover:bg-[#333]"><Edit2 size={14} /></AdminActionButton>
                  <AdminActionButton label="Supprimer" onClick={() => handleDelete(couverture.id)} className="p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-400/10"><Trash2 size={14} /></AdminActionButton>
                </div>
              </div>
            </article>
          ))}
          {couvertures.length === 0 && <div className="col-span-2 text-center py-12 text-gray-500">Aucune couverture.</div>}
        </div>
      )}

      {modal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh]">
          <div className="flex justify-between items-center p-5 border-b border-[#2a2a2a]"><h2 className="text-lg font-bold text-white">{modal.mode === 'add' ? 'Nouvelle couverture' : 'Modifier la couverture'}</h2><button onClick={() => setModal(null)} className="text-gray-400 hover:text-white" aria-label="Fermer"><X size={18} /></button></div>
          <form onSubmit={handleSave} className="p-5 overflow-y-auto flex-1 space-y-4">
            {error && <div className="text-red-400 text-xs bg-red-900/20 border border-red-500/30 rounded-lg p-3">{error}</div>}
            <div><label className={labelClass}>Nom *</label><input required value={form.name} onChange={(event) => setForm((previous) => ({ ...previous, name: event.target.value }))} className={inputClass} /></div>
            <div className="grid sm:grid-cols-2 gap-4"><div><label className={labelClass}>Titre</label><input value={form.title} onChange={(event) => setForm((previous) => ({ ...previous, title: event.target.value }))} className={inputClass} /></div><div><label className={labelClass}>Sous-titre</label><input value={form.subtitle} onChange={(event) => setForm((previous) => ({ ...previous, subtitle: event.target.value }))} className={inputClass} /></div></div>
            <div className="grid sm:grid-cols-2 gap-4"><div><label className={labelClass}>Texte du bouton</label><input value={form.buttonText} onChange={(event) => setForm((previous) => ({ ...previous, buttonText: event.target.value }))} className={inputClass} /></div><div><label className={labelClass}>Index</label><input type="number" min="0" step="1" value={form.index} onChange={(event) => setForm((previous) => ({ ...previous, index: event.target.value }))} className={inputClass} /></div></div>
            <div className="grid sm:grid-cols-2 gap-4"><div><label className={labelClass}>Type de navigation</label><select value={form.navigationType} onChange={(event) => setForm((previous) => ({ ...previous, navigationType: event.target.value }))} className={inputClass}>{NAVIGATION_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select></div><div><label className={labelClass}>Navigation</label><input value={form.navigation} onChange={(event) => setForm((previous) => ({ ...previous, navigation: event.target.value }))} className={inputClass} placeholder="URL, identifiant ou chemin" /></div></div>
            <div className="grid sm:grid-cols-2 gap-4"><div><label className={labelClass}>Date de début</label><input type="datetime-local" value={form.startDate} onChange={(event) => setForm((previous) => ({ ...previous, startDate: event.target.value }))} className={inputClass} /></div><div><label className={labelClass}>Date de fin</label><input type="datetime-local" value={form.endDate} onChange={(event) => setForm((previous) => ({ ...previous, endDate: event.target.value }))} className={inputClass} /></div></div>
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.active} onChange={(event) => setForm((previous) => ({ ...previous, active: event.target.checked }))} className="accent-[#d90429]" /><span className="text-sm text-gray-300">Couverture active</span></label>
            <div className="grid sm:grid-cols-2 gap-4"><FileInput label="Image desktop" required={modal.mode === 'add'} file={desktopFile} preview={imagePath(current?.image)} onChange={(event) => selectFile(event, setDesktopFile, 'L’image desktop')} /><FileInput label="Image mobile" file={mobileFile} preview={imagePath(current?.imageMobile)} onChange={(event) => selectFile(event, setMobileFile, 'L’image mobile')} /></div>
          </form>
          <div className="p-5 border-t border-[#2a2a2a] flex gap-3 justify-end bg-[#1a1a1a] rounded-b-xl"><button onClick={() => setModal(null)} className="px-5 py-2.5 text-sm font-bold text-gray-300 hover:text-white">Annuler</button><button onClick={handleSave} disabled={saving} className="bg-[#d90429] hover:bg-[#ff1a3c] text-white px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 disabled:opacity-60">{saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Enregistrer</button></div>
        </div>
      </div>}
    </div>
  );
};
