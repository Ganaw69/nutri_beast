import React, { useState, useEffect } from 'react';
import { settingsService } from '../../services/api';
import { Save, Loader2 } from 'lucide-react';

export const SettingsManager = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    settingsService.get(1).then(d => { setSettings(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(false);
    try {
      await settingsService.update(1, settings);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  const set = (key, val) => setSettings(p => ({ ...p, [key]: val }));

  const inputCls = "w-full bg-[#222] border border-[#333] text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#d90429]";
  const labelCls = "block text-xs font-bold text-gray-400 uppercase mb-1.5";

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-[#d90429] animate-spin" /></div>;
  if (!settings) return <div className="text-gray-400 p-8">Paramètres introuvables (id=1).</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Paramètres du Site</h1>
        <p className="text-gray-400 text-sm">Configuration générale de la boutique.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {error && <div className="text-red-400 text-sm bg-red-900/20 border border-red-500/30 rounded-lg p-3">{error}</div>}
        {success && <div className="text-emerald-400 text-sm bg-emerald-900/20 border border-emerald-500/30 rounded-lg p-3">✅ Paramètres sauvegardés.</div>}

        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-6 space-y-4">
          <h3 className="font-bold text-white text-sm uppercase">Informations Générales</h3>
          <div><label className={labelCls}>Nom du site</label><input value={settings.siteName || ''} onChange={e => set('siteName', e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Email de contact</label><input type="email" value={settings.contactEmail || ''} onChange={e => set('contactEmail', e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Téléphone</label><input value={settings.contactPhone || ''} onChange={e => set('contactPhone', e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Adresse</label><textarea rows={2} value={settings.address || ''} onChange={e => set('address', e.target.value)} className={`${inputCls} resize-none`} /></div>
        </div>

        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-6 space-y-4">
          <h3 className="font-bold text-white text-sm uppercase">Livraison & Commandes</h3>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelCls}>Frais de livraison (TND)</label><input type="number" step="0.01" value={settings.shippingFee || ''} onChange={e => set('shippingFee', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Livraison gratuite à partir de (TND)</label><input type="number" step="0.01" value={settings.freeShippingThreshold || ''} onChange={e => set('freeShippingThreshold', e.target.value)} className={inputCls} /></div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={settings.maintenanceMode ?? false} onChange={e => set('maintenanceMode', e.target.checked)} className="accent-[#d90429]" />
            <span className="text-sm text-gray-300">Mode maintenance</span>
          </label>
        </div>

        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-6 space-y-4">
          <h3 className="font-bold text-white text-sm uppercase">SEO</h3>
          <div><label className={labelCls}>Meta Titre par défaut</label><input value={settings.metaTitle || ''} onChange={e => set('metaTitle', e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Meta Description par défaut</label><textarea rows={2} value={settings.metaDescription || ''} onChange={e => set('metaDescription', e.target.value)} className={`${inputCls} resize-none`} /></div>
        </div>

        <button type="submit" disabled={saving}
          className="bg-[#d90429] hover:bg-[#ff1a3c] text-white px-6 py-3 rounded-lg font-bold text-sm flex items-center gap-2 disabled:opacity-60 transition-colors shadow-lg shadow-[#d90429]/20"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Enregistrer les paramètres
        </button>
      </form>
    </div>
  );
};
