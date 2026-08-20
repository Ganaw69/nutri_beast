import React, { useState, useEffect, useCallback } from 'react';
import { couponService } from '../../services/api';
import { Plus, Edit2, Trash2, X, Loader2, Check, Tag } from 'lucide-react';

const EMPTY = { code: '', type: 'percentage', value: '', minimumAmount: '', usageLimit: '', startDate: '', endDate: '', isActive: true };

export const CouponManager = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const data = await couponService.getAll({ itemsPerPage: 100 });
      setCoupons(data['hydra:member'] || []);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchCoupons(); }, [fetchCoupons]);

  const openAdd = () => { setForm(EMPTY); setModal({ mode: 'add' }); setError(''); };
  const openEdit = (c) => {
    setForm({
      code: c.code || '', type: c.type || 'percentage', value: c.value || '',
      minimumAmount: c.minimumAmount || '', usageLimit: c.usageLimit || '',
      startDate: c.startDate ? c.startDate.slice(0, 10) : '',
      endDate: c.endDate ? c.endDate.slice(0, 10) : '',
      isActive: c.isActive ?? true,
    });
    setModal({ mode: 'edit', id: c.id });
    setError('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { ...form, value: String(parseFloat(form.value).toFixed(2)) };
      if (modal.mode === 'add') await couponService.create(payload);
      else await couponService.update(modal.id, payload);
      setModal(null);
      fetchCoupons();
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce coupon ?')) return;
    try { await couponService.delete(id); fetchCoupons(); } catch (e) { alert(e.message); }
  };

  const inputCls = "w-full bg-[#222] border border-[#333] text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#d90429]";
  const labelCls = "block text-xs font-bold text-gray-400 uppercase mb-1.5";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Codes Promo</h1>
          <p className="text-gray-400 text-sm">{coupons.length} coupon{coupons.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openAdd} className="bg-[#d90429] hover:bg-[#ff1a3c] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-lg shadow-[#d90429]/20">
          <Plus size={16} /> Nouveau Coupon
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 flex justify-center py-10"><Loader2 className="w-6 h-6 text-[#d90429] animate-spin" /></div>
        ) : coupons.map(c => (
          <div key={c.id} className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5 group hover:border-[#444] transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Tag size={14} className="text-[#d90429]" />
                  <span className="font-black text-white font-mono text-sm tracking-widest">{c.code}</span>
                </div>
                <span className={`inline-flex mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${c.isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
                  {c.isActive ? 'Actif' : 'Inactif'}
                </span>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(c)} className="p-1.5 text-gray-400 hover:text-white hover:bg-[#333] rounded-lg"><Edit2 size={14} /></button>
                <button onClick={() => handleDelete(c.id)} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg"><Trash2 size={14} /></button>
              </div>
            </div>
            <div className="text-2xl font-black text-[#d90429]">
              {c.type === 'percentage' ? `${parseFloat(c.value || 0).toFixed(0)}%` : `${parseFloat(c.value || 0).toFixed(2)} TND`}
              <span className="text-xs text-gray-500 font-normal ml-2">{c.type === 'percentage' ? 'de réduction' : 'de remise'}</span>
            </div>
            <div className="text-xs text-gray-500 mt-2 space-y-0.5">
              {c.minimumAmount && <div>Min: {c.minimumAmount} TND</div>}
              {c.usageLimit && <div>Limite: {c.usageLimit} utilisations</div>}
              {c.endDate && <div>Expire le: {new Date(c.endDate).toLocaleDateString('fr-FR')}</div>}
            </div>
          </div>
        ))}
        {!loading && coupons.length === 0 && <div className="col-span-3 text-center py-10 text-gray-500">Aucun coupon.</div>}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center p-5 border-b border-[#2a2a2a]">
              <h2 className="text-lg font-bold text-white">{modal.mode === 'add' ? 'Nouveau Coupon' : 'Modifier le Coupon'}</h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              {error && <div className="text-red-400 text-xs bg-red-900/20 border border-red-500/30 rounded-lg p-3">{error}</div>}
              <div><label className={labelCls}>Code *</label><input required value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} className={`${inputCls} uppercase tracking-widest`} placeholder="SUMMER20" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>Type</label>
                  <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} className={inputCls}>
                    <option value="percentage">Pourcentage (%)</option>
                    <option value="fixed">Montant fixe (TND)</option>
                  </select>
                </div>
                <div><label className={labelCls}>Valeur *</label><input type="number" step="0.01" required value={form.value} onChange={e => setForm(p => ({ ...p, value: e.target.value }))} className={inputCls} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>Montant min (TND)</label><input type="number" value={form.minimumAmount} onChange={e => setForm(p => ({ ...p, minimumAmount: e.target.value }))} className={inputCls} /></div>
                <div><label className={labelCls}>Limite utilisation</label><input type="number" value={form.usageLimit} onChange={e => setForm(p => ({ ...p, usageLimit: e.target.value }))} className={inputCls} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>Début</label><input type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} className={inputCls} /></div>
                <div><label className={labelCls}>Fin</label><input type="date" value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} className={inputCls} /></div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))} className="accent-[#d90429]" />
                <span className="text-sm text-gray-300">Actif</span>
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
