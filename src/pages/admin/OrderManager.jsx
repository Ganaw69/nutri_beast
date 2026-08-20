import React, { useState, useEffect, useCallback } from 'react';
import { orderService } from '../../services/api';
import { Search, Eye, X, Loader2, Package, Truck, Check, XCircle, RefreshCw } from 'lucide-react';

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

const TRANSITION_LABELS = { confirm: 'Confirmer', prepare: 'Préparer', ship: 'Expédier', deliver: 'Livrer', cancel: 'Annuler' };

export const OrderManager = () => {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [detail, setDetail] = useState(null);
  const [transitioning, setTransitioning] = useState(false);

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

  const filtered = orders.filter(o =>
    !searchTerm ||
    (o.reference || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (`${o.firstName} ${o.lastName}`).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Gestion Commandes</h1>
          <p className="text-gray-400 text-sm">{total} commande{total !== 1 ? 's' : ''} au total</p>
        </div>
        <button onClick={fetchOrders} className="p-2 text-gray-400 hover:text-white bg-[#222] border border-[#333] rounded-lg"><RefreshCw size={16} /></button>
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
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${STATUS_COLORS[o.status] || 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
                      {STATUS_LABELS[o.status] || o.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button onClick={() => orderService.getOne(o.id).then(setDetail)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-white hover:bg-[#333] rounded-lg transition-opacity"
                    ><Eye size={14} /></button>
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
            {(TRANSITIONS[detail.status] || []).length > 0 && (
              <div className="p-5 border-t border-[#2a2a2a] flex flex-wrap gap-2">
                {TRANSITIONS[detail.status].map(action => (
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
