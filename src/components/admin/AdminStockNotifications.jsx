import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Bell, BellRing, X } from 'lucide-react';
import { iriToId, productService, productVariantService } from '../../services/api';

const collectionItems = (data) => data?.['hydra:member'] || data?.member || [];
const entityId = (value) => {
  if (value && typeof value === 'object') return value.id ?? iriToId(value['@id'] || value.iri);
  return iriToId(value) ?? value;
};
const isEnabled = (record) => ![false, 0, '0', 'false', 'no'].includes(
  typeof record?.isActive === 'string' ? record.isActive.toLowerCase() : record?.isActive
) && ![false, 0, '0', 'false', 'no'].includes(
  typeof record?.active === 'string' ? record.active.toLowerCase() : record?.active
);
const variantLabel = (variant) => [
  typeof variant.flavor === 'object' ? variant.flavor?.name : variant.flavor,
  typeof variant.size === 'object' ? variant.size?.name : variant.size,
  variant.name,
  variant.sku,
].filter(Boolean).join(' · ');

const getLowStockProducts = (products, variants) => {
  const variantsByProduct = new Map();
  variants.filter(isEnabled).forEach((variant) => {
    const productId = entityId(variant.product ?? variant.productId ?? variant.productIri);
    if (productId == null) return;
    const key = String(productId);
    variantsByProduct.set(key, [...(variantsByProduct.get(key) || []), variant]);
  });

  return products.filter(isEnabled).flatMap((product) => {
    const productId = entityId(product);
    const productVariants = variantsByProduct.get(String(productId)) || [];
    if (productVariants.length > 0) {
      return productVariants.flatMap((variant, index) => {
        const stock = Number(variant.stock);
        const minimumStock = Number(variant.minimumStock ?? product.minimumStock ?? 3);
        if (!Number.isFinite(stock) || !Number.isFinite(minimumStock) || stock > minimumStock) return [];
        const variantId = entityId(variant);
        const label = variantLabel(variant);
        return [{
          id: `variant:${variantId ?? `${productId}:${index}`}`,
          name: `${product.name}${label ? ` · ${label}` : ''}`,
          stock,
          minimumStock,
        }];
      });
    }

    const stock = Number(product.stock);
    const minimumStock = Number(product.minimumStock ?? 3);
    if (!Number.isFinite(stock) || !Number.isFinite(minimumStock) || stock > minimumStock) return [];
    return [{
      id: `product:${productId}`,
      name: product.name || 'Produit sans nom',
      stock,
      minimumStock,
    }];
  });
};

export const AdminStockNotifications = ({ onOpenStock }) => {
  const [lowStockItems, setLowStockItems] = useState([]);
  const [inventoryError, setInventoryError] = useState('');
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [permission, setPermission] = useState(() => (
    typeof window !== 'undefined' && 'Notification' in window
      ? window.Notification.permission
      : 'unsupported'
  ));
  const [permissionMessage, setPermissionMessage] = useState('');
  const [toast, setToast] = useState(null);
  const previousAlertsRef = useRef(null);
  const requestInFlightRef = useRef(false);

  const fetchLowStock = useCallback(async () => {
    if (requestInFlightRef.current) return;
    requestInFlightRef.current = true;
    try {
      const [productData, variantData] = await Promise.all([
        productService.getAllPages({ itemsPerPage: 100 }, true, true),
        productVariantService.getAllPages({ itemsPerPage: 100 }, true, true),
      ]);
      const nextItems = getLowStockProducts(
        collectionItems(productData),
        collectionItems(variantData)
      );
      const previousIds = previousAlertsRef.current;
      if (previousIds === null && nextItems.length > 0) {
        setToast(`${nextItems.length} produit${nextItems.length === 1 ? '' : 's'} ou variante${nextItems.length === 1 ? '' : 's'} sous le seuil de stock.`);
      }
      const newlyLowItems = previousIds
        ? nextItems.filter((item) => !previousIds.has(item.id))
        : [];
      previousAlertsRef.current = new Set(nextItems.map((item) => item.id));
      setLowStockItems(nextItems);
      setInventoryError('');

      if (newlyLowItems.length > 0) {
        setToast(newlyLowItems.length === 1
          ? `${newlyLowItems[0].name} est en stock faible (${newlyLowItems[0].stock} restant).`
          : `${newlyLowItems.length} produits ou variantes viennent de passer sous leur seuil de stock.`);
        if (permission === 'granted') {
          newlyLowItems.slice(0, 3).forEach((item) => {
            new window.Notification('Alerte de stock faible', {
              body: `${item.name} — ${item.stock} en stock (seuil : ${item.minimumStock}).`,
              tag: item.id,
            });
          });
        }
      }
    } catch (error) {
      setInventoryError(error?.message || 'Impossible de vérifier le stock.');
    } finally {
      requestInFlightRef.current = false;
      setLoading(false);
    }
  }, [permission]);

  useEffect(() => {
    void fetchLowStock();
    const interval = window.setInterval(() => { void fetchLowStock(); }, 60000);
    const refreshOnFocus = () => {
      if (document.visibilityState === 'visible') void fetchLowStock();
    };
    document.addEventListener('visibilitychange', refreshOnFocus);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshOnFocus);
    };
  }, [fetchLowStock]);

  const enableBrowserNotifications = async () => {
    if (!('Notification' in window)) {
      setPermissionMessage('Les notifications navigateur ne sont pas prises en charge par ce navigateur.');
      return;
    }
    try {
      const result = await window.Notification.requestPermission();
      setPermission(result);
      setPermissionMessage(result === 'granted'
        ? 'Notifications navigateur activées.'
        : 'Autorisez les notifications dans les paramètres du navigateur.');
      if (result === 'granted' && lowStockItems.length > 0) {
        new window.Notification('Alertes de stock faible', {
          body: `${lowStockItems.length} produit${lowStockItems.length === 1 ? '' : 's'} ou variante${lowStockItems.length === 1 ? '' : 's'} sous leur seuil.`,
          tag: 'low-stock-summary',
        });
      }
    } catch (error) {
      setPermissionMessage(error?.message || 'Impossible d’activer les notifications navigateur.');
    }
  };

  return (
    <>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          className="relative rounded-lg p-2 text-gray-400 transition-colors hover:bg-[#222] hover:text-white"
          aria-label={`Notifications de stock${lowStockItems.length ? `, ${lowStockItems.length} alertes` : ''}`}
          aria-expanded={isOpen}
        >
          {lowStockItems.length ? <BellRing size={18} /> : <Bell size={18} />}
          {lowStockItems.length > 0 && <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-[#d90429] px-1 text-center text-[10px] font-black leading-4 text-white">{lowStockItems.length > 99 ? '99+' : lowStockItems.length}</span>}
        </button>
        {isOpen && (
          <div className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-[#333] bg-[#171717] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#2a2a2a] px-4 py-3">
              <h2 className="text-sm font-bold text-white">Alertes de stock</h2>
              <button type="button" onClick={() => setIsOpen(false)} className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white" aria-label="Fermer les alertes"><X size={16} /></button>
            </div>
            <div className="max-h-80 overflow-y-auto p-3">
              {inventoryError ? <p role="alert" className="p-2 text-xs text-red-300">{inventoryError}</p>
                : loading && lowStockItems.length === 0 ? <p className="p-2 text-xs text-gray-400">Vérification du stock…</p>
                  : lowStockItems.length === 0 ? <p className="p-2 text-xs text-gray-400">Aucune alerte de stock faible.</p>
                    : <ul className="space-y-2">{lowStockItems.map((item) => (
                      <li key={item.id} className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                        <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-400" />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-white">{item.name}</p>
                          <p className="mt-1 text-[11px] text-amber-200">{item.stock} en stock · seuil {item.minimumStock}</p>
                        </div>
                      </li>
                    ))}</ul>}
            </div>
            <div className="space-y-2 border-t border-[#2a2a2a] p-3">
              {permission !== 'granted' && (
                <button type="button" onClick={enableBrowserNotifications} disabled={permission === 'unsupported'} className="w-full rounded-lg border border-white/10 px-3 py-2 text-left text-xs font-semibold text-gray-200 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50">
                  Activer les notifications navigateur
                </button>
              )}
              {permissionMessage && <p role="status" className="text-[11px] text-gray-400">{permissionMessage}</p>}
              <button type="button" onClick={() => { setIsOpen(false); onOpenStock(); }} className="w-full rounded-lg bg-[#d90429] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#b0021f]">
                Ouvrir la gestion des produits
              </button>
            </div>
          </div>
        )}
      </div>
      {toast && (
        <div role="status" aria-live="polite" className="fixed right-4 top-20 z-[70] flex max-w-sm items-start gap-3 rounded-xl border border-amber-500/30 bg-[#211b10] p-4 text-sm text-amber-100 shadow-2xl">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-400" />
          <span className="flex-1">{toast}</span>
          <button type="button" onClick={() => setToast(null)} aria-label="Fermer l’alerte" className="text-amber-200/70 hover:text-white"><X size={16} /></button>
        </div>
      )}
    </>
  );
};
