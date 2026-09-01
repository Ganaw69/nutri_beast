import React, { useState, useEffect, useCallback } from 'react';
import { orderService, productService } from '../../services/api';
import { Search, Eye, X, Loader2, Package, Truck, Check, XCircle, RefreshCw, Plus } from 'lucide-react';
import { AdminActionButton } from '../../components/admin/AdminActionButton';

const STATUS_COLORS = {
  pending:   'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  confirmed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  preparing: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  shipping:  'bg-purple-500/10 text-purple-400 border-purple-500/20',
  delivered: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
};

const STATUS_LABELS = {
  pending: 'En attente', confirmed: 'Confirmée', preparing: 'En préparation',
  shipping: 'En livraison', delivered: 'Livrée', cancelled: 'Annulée',
};

const TRANSITIONS = {
  pending:   ['confirm', 'cancel'],
  confirmed: ['prepare', 'cancel'],
  preparing: ['ship', 'cancel'],
  shipping:  ['deliver'],
  delivered: [],
  cancelled: [],
};

const EMPTY_ORDER_FORM = {
  firstName: '', lastName: '', phone: '', email: '', address: '', city: '', postalCode: '', notes: '', productId: '', quantity: 1,
};

const TRANSITION_LABELS = { confirm: 'Confirmer', prepare: 'Préparer', ship: 'Expédier', deliver: 'Livrer', cancel: 'Annuler' };

export const OrderManager = () => {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [detail, setDetail] = useState(null);
  const [transitioning, setTransitioning] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(EMPTY_ORDER_FORM);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, itemsPerPage: 20 };
      const data = await orderService.getAll(params);
      setOrders(data['hydra:member'] || []);
      setTotal(data['hydra:totalItems'] || 0);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [page]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useEffect(() => {
    if (!showCreate) return;
    productService.getAll({ isActive: true, itemsPerPage: 200 }, true)
      .then((data) => {
        const available = data['hydra:member'] || [];
        setProducts(available);
        setForm((current) => ({ ...current, productId: current.productId || String(available[0]?.id || '') }));
      })
      .catch((e) => setCreateError(e.message));
  }, [showCreate]);

  const handleTransition = async (id, action) => {
    setTransitioning(true);
    try {
      await orderService.transition(id, action);
      fetchOrders();
      if (detail?.id === id) {
        const updated = await orderService.getOne(id);
        setDetail(updated);
      }
    } catch (e) { alert(e.message); }
    setTransitioning(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const product = products.find((item) => String(item.id) === String(form.productId));
    if (!product?.sku) {
      setCreateError('Selectionnez un produit valide.');
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      await orderService.create({
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        email: form.email || null,
        address: form.address || null,
        city: form.city || null,
        postalCode: form.postalCode || null,
        notes: form.notes || null,
        items: [{ sku: product.sku, quantity: Number(form.quantity) }],
      });
      setShowCreate(false);
      setForm(EMPTY_ORDER_FORM);
      await fetchOrders();
    } catch (e) {
      setCreateError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const filtered = orders.filter(o =>
    !searchTerm ||
    (o.reference || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (`${o.firstName} ${o.lastName}`).toLowerCase().includes(searchTerm.toLowerCase())
  );
  const statusKey = String(detail?.status || '').toLowerCase();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Gestion Commandes</h1>
          <p className="text-gray-400 text-sm">{total} commande{total !== 1 ? 's' : ''} au total</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setShowCreate(true); setCreateError(''); }} className="px-4 py-2 rounded-lg bg-[#d90429] hover:bg-[#ff1a3c] text-white text-sm font-bold flex items-center gap-2">
            <Plus size={16} /> Nouvelle commande
          </button>
          <AdminActionButton label="Refresh" onClick={fetchOrders} className="p-2 text-gray-300 hover:text-white bg-[#222] border border-[#333]">
            <RefreshCw size={16} />
          </AdminActionButton>
        </div>
      </div>

      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[#2a2a2a] bg-[#1a1a1a]">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
            <input type="text" placeholder="Rechercher..." value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-[#222] border border-[#333] text-sm text-white rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:border-[#d90429]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#222] text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-[#2a2a2a]">
                <th className="px-5 py-4">Référence</th>
                <th className="px-5 py-4">Client</th>
                <th className="px-5 py-4">Date</th>
                <th className="px-5 py-4">Total</th>
                <th className="px-5 py-4">Statut</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2a2a]">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-10"><Loader2 className="w-6 h-6 text-[#d90429] animate-spin mx-auto" /></td></tr>
              ) : filtered.map(o => (
                <tr key={o.id} className="hover:bg-[#1a1a1a] transition-colors group">
                  <td className="px-5 py-4 font-bold text-white font-mono text-sm">{o.reference || `#${o.id}`}</td>
                  <td className="px-5 py-4 text-sm text-gray-300">{o.firstName} {o.lastName}</td>
                  <td className="px-5 py-4 text-sm text-gray-500">{o.createdAt ? new Date(o.createdAt).toLocaleDateString('fr-FR') : '—'}</td>
                  <td className="px-5 py-4 font-bold text-white">{parseFloat(o.total || 0).toFixed(2)} TND</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${STATUS_COLORS[String(o.status || '').toLowerCase()] || 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
                      {STATUS_LABELS[String(o.status || '').toLowerCase()] || o.status}
                    </span>
                    {String(o.paymentStatus || '').toLowerCase() === 'paid' && <span className="ml-1 inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Paid</span>}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <AdminActionButton
                      label="View"
                      onClick={() => orderService.getOne(o.id).then(setDetail)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-300 hover:text-white hover:bg-[#333] transition-opacity"
                    >
                      <Eye size={14} />
                    </AdminActionButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-4 border-t border-[#2a2a2a] flex items-center justify-between text-sm text-gray-400">
          <span>Page {page} — {total} résultats</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 rounded bg-[#222] hover:bg-[#333] border border-[#333] disabled:opacity-30">Précédent</button>
            <button onClick={() => setPage(p => p + 1)} disabled={orders.length < 20} className="px-3 py-1 rounded bg-[#222] hover:bg-[#333] border border-[#333] disabled:opacity-30">Suivant</button>
          </div>
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <form onSubmit={handleCreate} className="bg-[#161616] border border-[#2a2a2a] rounded-xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white text-lg">Nouvelle commande</h3>
              <button type="button" onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-white"><X size={18} /></button>
            </div>
            {createError && <div className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg p-3">{createError}</div>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {['firstName', 'lastName', 'phone', 'email', 'address', 'city', 'postalCode'].map((field) => (
                <input key={field} required={['firstName', 'lastName', 'phone'].includes(field)} placeholder={field} type={field === 'email' ? 'email' : 'text'} value={form[field]} onChange={(e) => setForm((current) => ({ ...current, [field]: e.target.value }))} className="bg-[#222] border border-[#333] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#d90429]" />
              ))}
              <select required value={form.productId} onChange={(e) => setForm((current) => ({ ...current, productId: e.target.value }))} className="bg-[#222] border border-[#333] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#d90429]">
                <option value="">Produit</option>
                {products.map((product) => <option key={product.id} value={product.id}>{product.name} {product.sku ? `(${product.sku})` : ''}</option>)}
              </select>
              <input required min="1" type="number" placeholder="Quantite" value={form.quantity} onChange={(e) => setForm((current) => ({ ...current, quantity: e.target.value }))} className="bg-[#222] border border-[#333] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#d90429]" />
            </div>
            <textarea placeholder="Notes" rows={3} value={form.notes} onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))} className="w-full bg-[#222] border border-[#333] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#d90429]" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg bg-[#333] text-white text-sm font-bold">Annuler</button>
              <button type="submit" disabled={creating} className="px-4 py-2 rounded-lg bg-[#d90429] text-white text-sm font-bold disabled:opacity-60">{creating ? 'Creation...' : 'Creer la commande'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Detail Modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-5 border-b border-[#2a2a2a]">
              <h3 className="font-bold text-white">Commande {detail.reference || `#${detail.id}`}</h3>
              <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-[#111] rounded-lg p-3"><span className="text-gray-500 block mb-1">Client</span><span className="font-bold text-white">{detail.firstName} {detail.lastName}</span></div>
                <div className="bg-[#111] rounded-lg p-3"><span className="text-gray-500 block mb-1">Téléphone</span><span className="font-bold text-white">{detail.phone || '—'}</span></div>
                <div className="bg-[#111] rounded-lg p-3 col-span-2"><span className="text-gray-500 block mb-1">Adresse</span><span className="font-bold text-white">{detail.address}, {detail.city} {detail.postalCode}</span></div>
              </div>
              <div className="space-y-2">
                {(detail.items || []).map((item, i) => (
                  <div key={i} className="flex justify-between text-sm bg-[#111] rounded-lg p-3">
                    <span className="text-gray-300">{item.productName} ×{item.quantity}</span>
                    <span className="font-bold text-white">{parseFloat(item.subtotal || 0).toFixed(2)} TND</span>
                  </div>
                ))}
              </div>
              <div className="text-right font-black text-white pt-2 border-t border-white/10">Total: {parseFloat(detail.total || 0).toFixed(2)} TND</div>
              {detail.notes && <p className="text-xs text-gray-400 italic">"{detail.notes}"</p>}
            </div>

            {/* Transition Actions */}
            {(TRANSITIONS[statusKey] || []).length > 0 && (
              <div className="p-5 border-t border-[#2a2a2a] flex flex-wrap gap-2">
                {TRANSITIONS[statusKey].map(action => (
                  <button key={action} disabled={transitioning}
                    onClick={() => handleTransition(detail.id, action)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors disabled:opacity-60 ${action === 'cancel' ? 'bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20' : 'bg-[#d90429] hover:bg-[#ff1a3c] text-white'}`}
                  >
                    {transitioning ? <Loader2 size={12} className="animate-spin" /> : TRANSITION_LABELS[action]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
