import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { orderService, productService, hydrateProductsWithImages, resolveProductImage, iriToId } from '../../services/api';
import {
  Search, Eye, X, Loader2, RefreshCw, ChevronLeft, ChevronRight,
  Package, Truck, Check, XCircle,
} from 'lucide-react';

const PAGE_SIZE = 20;

const STATUS_META = {
  pending: { label: 'En attente', className: 'border-amber-500/20 bg-amber-500/10 text-amber-300' },
  confirmed: { label: 'Confirmée', className: 'border-blue-500/20 bg-blue-500/10 text-blue-300' },
  preparing: { label: 'En préparation', className: 'border-orange-500/20 bg-orange-500/10 text-orange-300' },
  shipping: { label: 'Expédiée', className: 'border-violet-500/20 bg-violet-500/10 text-violet-300' },
  delivered: { label: 'Livrée', className: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' },
  cancelled: { label: 'Annulée', className: 'border-red-500/20 bg-red-500/10 text-red-300' },
};

const TRANSITIONS = {
  pending: ['confirm', 'cancel'],
  confirmed: ['prepare', 'cancel'],
  preparing: ['ship', 'cancel'],
  shipping: ['deliver'],
  delivered: [],
  cancelled: [],
};

const TRANSITION_META = {
  confirm: { label: 'Confirmer', icon: Check },
  prepare: { label: 'Préparer', icon: Package },
  ship: { label: 'Marquer expédiée', icon: Truck },
  deliver: { label: 'Marquer livrée', icon: Check },
  cancel: { label: 'Annuler la commande', icon: XCircle },
};

const text = (value) => value === null || value === undefined || value === '' ? '—' : String(value);
const number = (value) => Number(value ?? 0) || 0;
const statusKey = (value) => String(value || '').toLowerCase();
const paymentValue = (order) => order.paymentStatus ?? order.payment_state ?? order.payment?.status ?? '';
const getItems = (order) => {
  const items = order.items ?? order.orderItems ?? order.order_items ?? [];
  return Array.isArray(items) ? items : [];
};
const itemQuantity = (item) => number(item.quantity ?? item.qty);
const itemName = (item) => item.productName ?? item.product?.name ?? item.name ?? 'Produit';
const itemSku = (item) => item.sku ?? item.product?.sku ?? item.productSku;
const itemProductKey = (item, index) => String(item.id ?? item.product?.id ?? item.product?.['@id'] ?? item.productId ?? index);
const productIdFromOrderItem = (item) => {
  const relation = item.product ?? item.productId ?? item.productIri;
  const value = typeof relation === 'object' ? relation.id ?? relation['@id'] ?? relation.iri : relation;
  if (value === null || value === undefined || value === '') return null;
  const id = iriToId(String(value));
  return Number.isNaN(id) ? (Number.isNaN(Number(value)) ? null : Number(value)) : id;
};
const money = (value) => `${number(value).toFixed(2)} TND`;
const dateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('fr-FR');
};
const errorMessage = (error) => error?.message || 'Une erreur est survenue lors de la requête.';

const StatusBadge = ({ status, payment = false }) => {
  const key = statusKey(status);
  const meta = payment
    ? ({ paid: { label: 'Payé', className: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' }, pending: { label: 'En attente', className: 'border-amber-500/20 bg-amber-500/10 text-amber-300' }, failed: { label: 'Échoué', className: 'border-red-500/20 bg-red-500/10 text-red-300' }, refunded: { label: 'Remboursé', className: 'border-violet-500/20 bg-violet-500/10 text-violet-300' } })[key]
    : STATUS_META[key];
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${meta?.className || 'border-white/10 bg-white/5 text-gray-300'}`}>{meta?.label || text(status)}</span>;
};

const Field = ({ label, children }) => (
  <div className="rounded-lg bg-[#111] p-3">
    <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-500">{label}</span>
    <span className="break-words text-sm text-white">{children}</span>
  </div>
);

export const OrderManager = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [detailProductImages, setDetailProductImages] = useState({});
  const [transitioning, setTransitioning] = useState(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const collected = [];
      let currentPage = 1;
      let totalItems = Infinity;
      // Follow API Platform pages so search and filters apply to the full list.
      while (collected.length < totalItems && currentPage <= 100) {
        const response = await orderService.getAll({ page: currentPage, itemsPerPage: 100 });
        const members = response?.['hydra:member'] || response?.member || response?.items || [];
        totalItems = Number(response?.['hydra:totalItems'] ?? response?.totalItems ?? members.length);
        collected.push(...members);
        if (members.length === 0 || collected.length >= totalItems) break;
        currentPage += 1;
      }
      setOrders(collected);
    } catch (fetchError) {
      setError(errorMessage(fetchError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const filteredOrders = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase('fr');
    return orders.filter((order) => {
      const customer = `${order.firstName || ''} ${order.lastName || ''}`.toLocaleLowerCase('fr');
      const searchable = [order.reference, customer, order.phone, order.email]
        .filter(Boolean).join(' ').toLocaleLowerCase('fr');
      const matchesSearch = !query || searchable.includes(query);
      const matchesStatus = statusFilter === 'all' || statusKey(order.status) === statusFilter;
      const matchesPayment = paymentFilter === 'all' || statusKey(paymentValue(order)) === paymentFilter;
      return matchesSearch && matchesStatus && matchesPayment;
    }).sort((first, second) => {
      if (sortBy === 'date-asc' || sortBy === 'date-desc') {
        const direction = sortBy === 'date-asc' ? 1 : -1;
        return direction * (new Date(first.createdAt || 0) - new Date(second.createdAt || 0));
      }
      return sortBy === 'total-asc'
        ? number(first.total) - number(second.total)
        : number(second.total) - number(first.total);
    });
  }, [orders, searchTerm, statusFilter, paymentFilter, sortBy]);

  useEffect(() => { setPage(1); }, [searchTerm, statusFilter, paymentFilter, sortBy]);

  const pageCount = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const visibleOrders = filteredOrders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openDetails = async (order) => {
    setDetail(order);
    setDetailLoading(true);
    setDetailError('');
    try {
      const fullOrder = await orderService.getOne(order.id);
      setDetail(fullOrder);
    } catch (detailFetchError) {
      setDetailError(errorMessage(detailFetchError));
    } finally {
      setDetailLoading(false);
    }
  };

  const handleTransition = async (order, action) => {
    if (transitioning) return;
    if (action === 'cancel' && !window.confirm(`Annuler la commande ${order.reference || `#${order.id}`} ?`)) return;

    setTransitioning(`${order.id}:${action}`);
    setNotice('');
    setDetailError('');
    try {
      await orderService.transition(order.id, action);
      const [updated] = await Promise.all([orderService.getOne(order.id), fetchOrders()]);
      setDetail(updated);
      setNotice(`Commande ${updated.reference || `#${updated.id}`} mise à jour.`);
    } catch (transitionError) {
      setDetailError(errorMessage(transitionError));
      setError(errorMessage(transitionError));
    } finally {
      setTransitioning(null);
    }
  };

  const detailStatus = statusKey(detail?.status);
  const detailItems = detail ? getItems(detail) : [];
  const historyValue = detail?.statusHistories ?? detail?.statusHistory ?? [];
  const history = Array.isArray(historyValue) ? historyValue : [];

  useEffect(() => {
    if (!detail) {
      setDetailProductImages({});
      return undefined;
    }

    let active = true;
    setDetailProductImages({});
    const loadImages = async () => {
      const entries = await Promise.all(detailItems.map(async (item, index) => {
        try {
          let product = item.product && typeof item.product === 'object' ? item.product : null;
          const productId = productIdFromOrderItem(item);
          if (!product && productId !== null) product = await productService.getOne(productId);
          if (!product) return [itemProductKey(item, index), null];
          const [hydratedProduct] = await hydrateProductsWithImages([product]);
          return [itemProductKey(item, index), resolveProductImage(hydratedProduct, null)];
        } catch {
          return [itemProductKey(item, index), null];
        }
      }));
      if (active) setDetailProductImages(Object.fromEntries(entries));
    };

    void loadImages();
    return () => { active = false; };
  }, [detail]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="mb-1 text-2xl font-bold text-white">Gestion des commandes</h1>
          <p className="text-sm text-gray-400">{filteredOrders.length} commande{filteredOrders.length !== 1 ? 's' : ''}</p>
        </div>
        <button type="button" onClick={fetchOrders} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-[#333] bg-[#222] px-3 py-2 text-sm font-bold text-white hover:bg-[#2b2b2b] disabled:opacity-50">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Actualiser
        </button>
      </div>

      {notice && <div role="status" className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{notice}</div>}
      {error && <div role="alert" className="flex items-start justify-between gap-3 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"><span>{error}</span><button type="button" onClick={() => setError('')} aria-label="Fermer"><X size={16} /></button></div>}

      <section className="overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#161616]">
        <div className="grid gap-3 border-b border-[#2a2a2a] bg-[#1a1a1a] p-4 sm:grid-cols-2 xl:grid-cols-4">
          <label className="relative sm:col-span-2 xl:col-span-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Référence, client, téléphone, email" className="w-full rounded-lg border border-[#333] bg-[#222] py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-[#d90429]" />
          </label>
          <select aria-label="Filtrer par statut de commande" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-lg border border-[#333] bg-[#222] px-3 py-2 text-sm text-white outline-none focus:border-[#d90429]">
            <option value="all">Tous les statuts</option>
            {Object.entries(STATUS_META).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
          </select>
          <select aria-label="Filtrer par statut de paiement" value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value)} className="rounded-lg border border-[#333] bg-[#222] px-3 py-2 text-sm text-white outline-none focus:border-[#d90429]">
            <option value="all">Tous les paiements</option><option value="paid">Payé</option><option value="pending">En attente</option><option value="failed">Échoué</option><option value="refunded">Remboursé</option>
          </select>
          <select aria-label="Trier les commandes" value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="rounded-lg border border-[#333] bg-[#222] px-3 py-2 text-sm text-white outline-none focus:border-[#d90429]">
            <option value="date-desc">Date : plus récente</option><option value="date-asc">Date : plus ancienne</option><option value="total-desc">Montant : décroissant</option><option value="total-asc">Montant : croissant</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left">
            <thead><tr className="border-b border-[#2a2a2a] bg-[#222] text-[10px] font-bold uppercase tracking-wide text-gray-400">
              <th className="px-4 py-3">Référence</th><th className="px-4 py-3">Client</th><th className="px-4 py-3">Téléphone</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Articles</th><th className="px-4 py-3">Sous-total</th><th className="px-4 py-3">Réduction</th><th className="px-4 py-3">Livraison</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Commande / paiement</th><th className="px-4 py-3">Paiement</th><th className="px-4 py-3 text-right">Détails</th>
            </tr></thead>
            <tbody className="divide-y divide-[#2a2a2a]">
              {loading ? <tr><td colSpan={12} className="py-14 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-[#d90429]" /></td></tr>
                : visibleOrders.map((order) => {
                  const orderItems = getItems(order);
                  const itemCount = orderItems.reduce((sum, item) => sum + itemQuantity(item), 0);
                  return <tr key={order.id} className="text-sm hover:bg-[#1b1b1b]">
                    <td className="px-4 py-3 font-mono font-bold text-white">{text(order.reference || `#${order.id}`)}</td>
                    <td className="px-4 py-3 text-gray-200">{text(`${order.firstName || ''} ${order.lastName || ''}`.trim())}<span className="block text-xs text-gray-500">{text(order.email)}</span></td>
                    <td className="px-4 py-3 text-gray-300">{text(order.phone)}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{dateTime(order.createdAt)}</td>
                    <td className="px-4 py-3 text-gray-300">{itemCount}</td>
                    <td className="px-4 py-3 text-gray-300">{money(order.subtotal)}</td>
                    <td className="px-4 py-3 text-gray-300">{money(order.discountAmount ?? order.discount)}</td>
                    <td className="px-4 py-3 text-gray-300">{money(order.shippingFee ?? order.shippingCost)}</td>
                    <td className="px-4 py-3 font-bold text-white">{money(order.total)}</td>
                    <td className="px-4 py-3"><div className="flex flex-col items-start gap-1"><StatusBadge status={order.status} /><StatusBadge payment status={paymentValue(order)} /></div></td>
                    <td className="px-4 py-3 text-xs text-gray-300">{text(order.paymentMethod ?? order.payment_method)}</td>
                    <td className="px-4 py-3 text-right"><button type="button" onClick={() => openDetails(order)} aria-label={`Voir la commande ${order.reference || order.id}`} className="rounded-lg p-2 text-gray-300 hover:bg-[#333] hover:text-white"><Eye size={16} /></button></td>
                  </tr>;
                })}
              {!loading && visibleOrders.length === 0 && <tr><td colSpan={12} className="py-14 text-center text-sm text-gray-500">{orders.length ? 'Aucune commande ne correspond à ces filtres.' : 'Aucune commande pour le moment.'}</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#2a2a2a] px-4 py-3 text-sm text-gray-400">
          <span>{filteredOrders.length === 0 ? '0 résultat' : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filteredOrders.length)} sur ${filteredOrders.length}`}</span>
          <div className="flex items-center gap-2"><button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1 || loading} className="rounded border border-[#333] bg-[#222] p-2 disabled:opacity-30" aria-label="Page précédente"><ChevronLeft size={16} /></button><span>Page {page} / {pageCount}</span><button type="button" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={page >= pageCount || loading} className="rounded border border-[#333] bg-[#222] p-2 disabled:opacity-30" aria-label="Page suivante"><ChevronRight size={16} /></button></div>
        </div>
      </section>

      {detail && <div className="fixed inset-0 z-[70] overflow-y-auto bg-black/75 p-3 backdrop-blur-sm sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) setDetail(null); }}>
        <section role="dialog" aria-modal="true" aria-label="Détails de la commande" className="mx-auto my-4 flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-[#333] bg-[#161616] shadow-2xl">
          <header className="flex items-center justify-between border-b border-[#2a2a2a] p-5"><div><h2 className="font-bold text-white">Commande {text(detail.reference || `#${detail.id}`)}</h2><p className="mt-1 text-xs text-gray-500">Créée le {dateTime(detail.createdAt)}</p></div><button type="button" onClick={() => setDetail(null)} aria-label="Fermer" className="rounded p-2 text-gray-400 hover:bg-[#2a2a2a] hover:text-white"><X size={18} /></button></header>
          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            {detailError && <div role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">{detailError}</div>}
            {detailLoading ? <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-[#d90429]" /></div> : <>
              <div className="flex flex-wrap items-center gap-2"><StatusBadge status={detail.status} /><StatusBadge payment status={paymentValue(detail)} /><span className="text-xs text-gray-400">Paiement : {text(detail.paymentMethod ?? detail.payment_method)}</span></div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Prénom et nom">{text(`${detail.firstName || ''} ${detail.lastName || ''}`.trim())}</Field><Field label="Téléphone">{text(detail.phone)}</Field><Field label="Email">{text(detail.email)}</Field>
                <Field label="Adresse">{text(detail.address)}</Field><Field label="Ville / code postal">{text([detail.city, detail.postalCode].filter(Boolean).join(' '))}</Field><Field label="Dernière mise à jour">{dateTime(detail.updatedAt)}</Field>
              </div>
              {detail.notes && <Field label="Notes">{detail.notes}</Field>}
              <section><h3 className="mb-2 text-sm font-bold text-white">Articles ({detailItems.length})</h3><div className="overflow-hidden rounded-lg border border-[#2a2a2a]">{detailItems.length ? detailItems.map((item, index) => { const image = detailProductImages[itemProductKey(item, index)]; return <div key={item.id ?? index} className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2a2a2a] p-3 last:border-0"><div className="flex min-w-0 items-center gap-3"><div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#222]">{image ? <img src={image} alt={itemName(item)} loading="lazy" className="h-full w-full object-contain" /> : <Package size={20} className="text-gray-600" />}</div><div className="min-w-0"><p className="text-sm font-semibold text-white">{itemName(item)}</p><p className="text-xs text-gray-500">{itemSku(item) ? `SKU ${itemSku(item)} · ` : ''}Quantité : {itemQuantity(item)} · Unité : {money(item.unitPrice ?? item.price)}</p></div></div><span className="text-sm font-bold text-white">{money(item.subtotal ?? item.lineSubtotal)}</span></div>; }) : <p className="p-4 text-sm text-gray-500">Aucun détail d’article fourni par l’API.</p>}</div></section>
              <section><h3 className="mb-2 text-sm font-bold text-white">Récapitulatif</h3><div className="space-y-2 rounded-lg bg-[#111] p-4 text-sm"><div className="flex justify-between text-gray-300"><span>Sous-total</span><span>{money(detail.subtotal)}</span></div><div className="flex justify-between text-gray-300"><span>Coupon</span><span>{text(detail.couponCode ?? detail.coupon?.code)}</span></div><div className="flex justify-between text-gray-300"><span>Réduction</span><span>−{money(detail.discountAmount ?? detail.discount)}</span></div><div className="flex justify-between text-gray-300"><span>Livraison</span><span>{money(detail.shippingFee ?? detail.shippingCost)}</span></div><div className="flex justify-between border-t border-white/10 pt-2 font-black text-white"><span>Total</span><span>{money(detail.total)}</span></div></div></section>
              {history.length > 0 && <section><h3 className="mb-2 text-sm font-bold text-white">Historique des statuts</h3><ol className="space-y-2 border-l border-[#444] pl-4">{[...history].sort((a, b) => new Date(a.createdAt || a.changedAt || 0) - new Date(b.createdAt || b.changedAt || 0)).map((entry, index) => <li key={entry.id ?? index} className="relative text-sm text-gray-300"><span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-[#d90429]" />{text(entry.status)} <span className="text-xs text-gray-500">{dateTime(entry.createdAt ?? entry.changedAt)}</span></li>)}</ol></section>}
            </>}
          </div>
          {!detailLoading && (TRANSITIONS[detailStatus] || []).length > 0 && <footer className="flex flex-wrap gap-2 border-t border-[#2a2a2a] p-4">{TRANSITIONS[detailStatus].map((action) => { const ActionIcon = TRANSITION_META[action].icon; const busy = transitioning === `${detail.id}:${action}`; return <button key={action} type="button" disabled={Boolean(transitioning)} onClick={() => handleTransition(detail, action)} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50 ${action === 'cancel' ? 'border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20' : 'bg-[#d90429] text-white hover:bg-[#b90322]'}`}>{busy ? <Loader2 size={14} className="animate-spin" /> : <ActionIcon size={14} />}{busy ? 'Mise à jour…' : TRANSITION_META[action].label}</button>; })}</footer>}
        </section>
      </div>}
    </div>
  );
};
