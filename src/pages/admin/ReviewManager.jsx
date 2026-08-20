import React, { useState, useEffect, useCallback } from 'react';
import { reviewService } from '../../services/api';
import { Search, Check, X, Trash2, Loader2, Star, RefreshCw } from 'lucide-react';

export const ReviewManager = () => {
  const [reviews, setReviews] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending'); // pending | approved | rejected
  const [search, setSearch] = useState('');

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const params = { itemsPerPage: 50 };
      if (filter === 'approved') params.approved = true;
      else if (filter === 'rejected') params.rejected = true;
      else { params.approved = false; params.rejected = false; }
      const data = await reviewService.getAll(params);
      setReviews(data['hydra:member'] || []);
      setTotal(data['hydra:totalItems'] || 0);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const handleAction = async (id, action) => {
    try {
      if (action === 'approve') await reviewService.approve(id);
      else if (action === 'reject') await reviewService.reject(id);
      else await reviewService.delete(id);
      fetchReviews();
    } catch (e) { alert(e.message); }
  };

  const filtered = reviews.filter(r => !search || r.customerName?.toLowerCase().includes(search.toLowerCase()) || r.comment?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Avis Clients</h1>
          <p className="text-gray-400 text-sm">{total} avis</p>
        </div>
        <button onClick={fetchReviews} className="p-2 text-gray-400 hover:text-white bg-[#222] border border-[#333] rounded-lg"><RefreshCw size={16} /></button>
      </div>

      <div className="flex gap-2">
        {[['pending','En attente'],['approved','Approuvés'],['rejected','Rejetés']].map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filter === k ? 'bg-[#d90429] text-white' : 'bg-[#1a1a1a] border border-[#333] text-gray-400 hover:text-white'}`}
          >{l}</button>
        ))}
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
          ) : filtered.map(r => (
            <div key={r.id} className="p-5 hover:bg-[#1a1a1a] flex items-start justify-between gap-4 group transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <span className="font-bold text-white text-sm">{r.customerName}</span>
                  <div className="flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`w-3 h-3 ${i < r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} />)}</div>
                </div>
                <p className="text-xs text-gray-300 line-clamp-2">{r.comment}</p>
                <p className="text-xs text-gray-500 mt-1">{r.product?.name || '—'}</p>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                {filter === 'pending' && <>
                  <button onClick={() => handleAction(r.id, 'approve')} className="p-1.5 text-gray-400 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg" title="Approuver"><Check size={14} /></button>
                  <button onClick={() => handleAction(r.id, 'reject')} className="p-1.5 text-gray-400 hover:text-yellow-400 hover:bg-yellow-400/10 rounded-lg" title="Rejeter"><X size={14} /></button>
                </>}
                <button onClick={() => handleAction(r.id, 'delete')} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg" title="Supprimer"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
          {!loading && filtered.length === 0 && <div className="text-center py-8 text-gray-500">Aucun avis.</div>}
        </div>
      </div>
    </div>
  );
};
