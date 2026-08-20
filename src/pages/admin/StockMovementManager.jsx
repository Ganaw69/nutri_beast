import React, { useState, useEffect, useCallback } from 'react';
import { stockMovementService } from '../../services/api';
import { Search, Loader2, RefreshCw, TrendingUp, TrendingDown, RotateCcw } from 'lucide-react';

const TYPE_CONFIG = {
  add: { label: 'Entrée', color: 'text-emerald-400', bg: 'bg-emerald-400/10', Icon: TrendingUp },
  remove: { label: 'Sortie', color: 'text-red-400', bg: 'bg-red-400/10', Icon: TrendingDown },
  adjust: { label: 'Ajustement', color: 'text-blue-400', bg: 'bg-blue-400/10', Icon: RotateCcw },
  return: { label: 'Retour', color: 'text-yellow-400', bg: 'bg-yellow-400/10', Icon: RotateCcw },
};

export const StockMovementManager = () => {
  const [movements, setMovements] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchMovements = useCallback(async () => {
    setLoading(true);
    try {
      const data = await stockMovementService.getAll({ page, itemsPerPage: 30 });
      setMovements(data['hydra:member'] || []);
      setTotal(data['hydra:totalItems'] || 0);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [page]);

  useEffect(() => { fetchMovements(); }, [fetchMovements]);

  const filtered = movements.filter(m =>
    !search || (m.product?.name || '').toLowerCase().includes(search.toLowerCase()) || (m.reason || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Mouvements de Stock</h1>
          <p className="text-gray-400 text-sm">{total} mouvement{total !== 1 ? 's' : ''} enregistré{total !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={fetchMovements} className="p-2 text-gray-400 hover:text-white bg-[#222] border border-[#333] rounded-lg"><RefreshCw size={16} /></button>
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

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#222] text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-[#2a2a2a]">
                <th className="px-5 py-4">Type</th>
                <th className="px-5 py-4">Produit</th>
                <th className="px-5 py-4">Quantité</th>
                <th className="px-5 py-4">Raison</th>
                <th className="px-5 py-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2a2a]">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-10"><Loader2 className="w-6 h-6 text-[#d90429] animate-spin mx-auto" /></td></tr>
              ) : filtered.map(m => {
                const cfg = TYPE_CONFIG[m.type] || { label: m.type, color: 'text-gray-400', bg: 'bg-gray-400/10', Icon: RotateCcw };
                return (
                  <tr key={m.id} className="hover:bg-[#1a1a1a] transition-colors">
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${cfg.bg} ${cfg.color}`}>
                        <cfg.Icon size={10} /> {cfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-white font-medium">{m.product?.name || '—'}</td>
                    <td className="px-5 py-4">
                      <span className={`font-bold text-sm ${m.type === 'add' || m.type === 'return' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {m.type === 'add' || m.type === 'return' ? '+' : '-'}{m.quantity}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-400">{m.reason || '—'}</td>
                    <td className="px-5 py-4 text-xs text-gray-500">{m.createdAt ? new Date(m.createdAt).toLocaleString('fr-FR') : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-4 border-t border-[#2a2a2a] flex items-center justify-between text-sm text-gray-400">
          <span>Page {page} — {total} entrées</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 rounded bg-[#222] hover:bg-[#333] border border-[#333] disabled:opacity-30">Précédent</button>
            <button onClick={() => setPage(p => p + 1)} disabled={movements.length < 30} className="px-3 py-1 rounded bg-[#222] hover:bg-[#333] border border-[#333] disabled:opacity-30">Suivant</button>
          </div>
        </div>
      </div>
    </div>
  );
};
