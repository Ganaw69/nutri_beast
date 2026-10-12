import React, { useState, useEffect, useCallback } from 'react';
import { stockMovementService } from '../../services/api';
import { Search, Loader2, RefreshCw, TrendingUp, TrendingDown, RotateCcw } from 'lucide-react';

const TYPE_CONFIG = {
  IN: { label: 'Entrée', color: 'text-emerald-400', bg: 'bg-emerald-400/10', Icon: TrendingUp },
  OUT: { label: 'Sortie', color: 'text-red-400', bg: 'bg-red-400/10', Icon: TrendingDown },
  ADJUSTMENT: { label: 'Ajustement', color: 'text-blue-400', bg: 'bg-blue-400/10', Icon: RotateCcw },
  RETURN: { label: 'Retour', color: 'text-yellow-400', bg: 'bg-yellow-400/10', Icon: RotateCcw },
  add: { label: 'Entrée', color: 'text-emerald-400', bg: 'bg-emerald-400/10', Icon: TrendingUp },
  remove: { label: 'Sortie', color: 'text-red-400', bg: 'bg-red-400/10', Icon: TrendingDown },
  adjust: { label: 'Ajustement', color: 'text-blue-400', bg: 'bg-blue-400/10', Icon: RotateCcw },
  return: { label: 'Retour', color: 'text-yellow-400', bg: 'bg-yellow-400/10', Icon: RotateCcw },
};
const relationName = (value) => typeof value === 'object' ? value?.name || value?.email || value?.username || '—' : value || '—';

export const StockMovementManager = () => {
  const [movements, setMovements] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const fetchMovements = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await stockMovementService.getAll({ page, itemsPerPage: 30 });
      const rows = data?.['hydra:member'] || data?.member || [];
      setMovements(rows);
      setTotal(data?.['hydra:totalItems'] ?? data?.totalItems ?? rows.length);
    } catch (e) {
      setMovements([]);
      setError(e.message || 'Impossible de charger les mouvements de stock.');
    } finally { setLoading(false); }
  }, [page]);

  useEffect(() => { fetchMovements(); }, [fetchMovements]);

  const filtered = movements.filter((m) => {
    const term = search.trim().toLocaleLowerCase('fr');
    if (!term) return true;
    return [relationName(m.product), relationName(m.variant), m.reason, relationName(m.user), m.type]
      .some((value) => String(value || '').toLocaleLowerCase('fr').includes(term));
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Mouvements de Stock</h1>
          <p className="text-gray-400 text-sm">{total} mouvement{total !== 1 ? 's' : ''} enregistré{total !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={fetchMovements} disabled={loading} aria-label="Actualiser" className="p-2 text-gray-400 hover:text-white bg-[#222] border border-[#333] rounded-lg disabled:opacity-50"><RefreshCw size={16} /></button>
      </div>

      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[#2a2a2a] bg-[#1a1a1a]">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
            <input type="search" placeholder="Rechercher produit, type, motif, utilisateur…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-[#222] border border-[#333] text-sm text-white rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:border-[#d90429]" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[1100px]">
            <thead><tr className="bg-[#222] text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-[#2a2a2a]">
              <th className="px-4 py-4">Date et heure</th><th className="px-4 py-4">Produit</th><th className="px-4 py-4">Variante</th><th className="px-4 py-4">Type</th><th className="px-4 py-4">Quantité</th><th className="px-4 py-4">Avant</th><th className="px-4 py-4">Après</th><th className="px-4 py-4">Motif</th><th className="px-4 py-4">Utilisateur</th>
            </tr></thead>
            <tbody className="divide-y divide-[#2a2a2a]">
              {loading ? <tr><td colSpan={9} className="text-center py-10"><Loader2 className="w-6 h-6 text-[#d90429] animate-spin mx-auto" /></td></tr>
                : error ? <tr><td colSpan={9} role="alert" className="text-center py-10 text-red-300">{error}</td></tr>
                  : filtered.length === 0 ? <tr><td colSpan={9} className="text-center py-10 text-sm text-gray-500">{search ? 'Aucun mouvement ne correspond à la recherche.' : 'Aucun mouvement de stock.'}</td></tr>
                    : filtered.map((m) => {
                      const cfg = TYPE_CONFIG[m.type] || { label: m.type || '—', color: 'text-gray-400', bg: 'bg-gray-400/10', Icon: RotateCcw };
                      return <tr key={m.id ?? m['@id']} className="hover:bg-[#1a1a1a] transition-colors">
                        <td className="px-4 py-4 text-xs text-gray-400">{m.createdAt || m.date ? new Date(m.createdAt || m.date).toLocaleString('fr-FR') : '—'}</td>
                        <td className="px-4 py-4 text-sm text-white font-medium">{relationName(m.product)}</td>
                        <td className="px-4 py-4 text-sm text-gray-300">{relationName(m.variant || m.productVariant)}</td>
                        <td className="px-4 py-4"><span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase ${cfg.bg} ${cfg.color}`}><cfg.Icon size={10} />{cfg.label}</span></td>
                        <td className="px-4 py-4 text-sm text-white">{m.quantity ?? '—'}</td><td className="px-4 py-4 text-sm text-gray-300">{m.previousStock ?? m.stockBefore ?? '—'}</td><td className="px-4 py-4 text-sm text-gray-300">{m.newStock ?? m.stockAfter ?? '—'}</td>
                        <td className="px-4 py-4 text-xs text-gray-400">{m.reason || '—'}</td><td className="px-4 py-4 text-xs text-gray-400">{relationName(m.user || m.createdBy)}</td>
                      </tr>;
                    })}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-4 border-t border-[#2a2a2a] flex items-center justify-between text-sm text-gray-400">
          <span>Page {page} — {total} entrées</span>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1 || loading} className="px-3 py-1 rounded bg-[#222] hover:bg-[#333] border border-[#333] disabled:opacity-30">Précédent</button>
            <button onClick={() => setPage((p) => p + 1)} disabled={loading || movements.length < 30 || page * 30 >= total} className="px-3 py-1 rounded bg-[#222] hover:bg-[#333] border border-[#333] disabled:opacity-30">Suivant</button>
          </div>
        </div>
      </div>
    </div>
  );
};
