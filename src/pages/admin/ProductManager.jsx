import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { productService, categoryService, brandService, goalService, flavorService, productImageUrl, resolveProductImage, iriToId, isPrimaryProductImage } from '../../services/api';
import { Search, Plus, Edit2, Trash2, X, Loader2, Check, Package, RefreshCw, ToggleLeft, Copy, Upload } from 'lucide-react';
import { AdminActionButton } from '../../components/admin/AdminActionButton';

const EMPTY_FORM = {
  name: '', sku: '', barcode: '', shortDescription: '', description: '',
  price: '', salePrice: '', stock: '', minimumStock: '3', weight: '', expirationDate: '',
  isActive: true, isFeatured: false, isNew: false, isOnSale: false,
  category: '', brand: '', goals: [], flavors: [],
  metaTitle: '', metaDescription: '',
};

const relationToIri = (value, resource) => {
  if (!value) return '';
  if (typeof value === 'string') {
    return value.startsWith('/api/') ? value : `/api/${resource}/${value}`;
  }
  if (typeof value === 'number') {
    return `/api/${resource}/${value}`;
  }
  return value['@id'] || value.iri || value['iri'] || (value.id ? `/api/${resource}/${value.id}` : '');
};

const collectionItems = (data) => data?.['hydra:member'] || data?.member || data?.items || [];
const displayName = (item) => item?.name || item?.title || item?.label || '';
const dateInputValue = (value) => (value ? String(value).slice(0, 10) : '');

const normalizeProductImages = (images = []) =>
  [...images].sort((a, b) => Number(isPrimaryProductImage(b)) - Number(isPrimaryProductImage(a)) || Number(a?.position ?? 0) - Number(b?.position ?? 0));

const getProductImageId = (img) => {
  if (!img) return null;
  return (
    img.id ??
    iriToId(img['@id']) ??
    iriToId(img.iri) ??
    img.imageId ??
    img.productImageId ??
    null
  );
};

const getProductImageSource = (img) => {
  if (!img) return null;
  if (typeof img === 'string') return img;
  return (
    img.image ??
    img.path ??
    img.url ??
    img.contentUrl ??
    img.file ??
    img.filename ??
    img.name ??
    null
  );
};

const getProductImageKey = (img) => {
  const source = getProductImageSource(img);
  if (!source) return null;
  const value = String(source).trim();
  if (!value) return null;
  return value.split('?')[0].split('/').pop();
};

const getProductImageProductId = (img) => {
  if (!img || typeof img === 'string') return null;
  const product = img.product;
  if (typeof product === 'number') return product;
  if (typeof product === 'string') return iriToId(product);
  if (product && typeof product === 'object') {
    return product.id ?? iriToId(product['@id']) ?? iriToId(product.iri);
  }
  return img.productId ?? iriToId(img.productIri) ?? null;
};

const mergeProductImages = (embeddedImages = [], fetchedImages = []) => {
  const byId = new Map();
  const byKey = new Map();

  fetchedImages.forEach((img) => {
    const id = getProductImageId(img);
    const key = getProductImageKey(img);
    if (id != null) byId.set(String(id), img);
    if (key) byKey.set(key, img);
  });

  const sourceImages = [...embeddedImages, ...fetchedImages];
  const seen = new Set();

  return normalizeProductImages(sourceImages.map((img, index) => {
    const id = getProductImageId(img);
    const key = getProductImageKey(img);
    const fetched = (id != null && byId.get(String(id))) || (key && byKey.get(key)) || null;
    const resolvedId = getProductImageId(fetched) ?? id;
    const uniqueKey = resolvedId != null ? `id:${resolvedId}` : key ? `file:${key}` : `index:${index}`;
    if (seen.has(uniqueKey)) return null;
    seen.add(uniqueKey);

    if (fetched) {
      return {
        ...fetched,
        ...img,
        id: resolvedId,
      };
    }

    if (typeof img === 'string') {
      return { image: img, __index: index };
    }

    return img;
  }).filter(Boolean));
};

export const ProductManager = () => {
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modal, setModal] = useState(null); // null | { mode: 'add'|'edit', data? }
  const [form, setForm] = useState(EMPTY_FORM);
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [primaryImageIndex, setPrimaryImageIndex] = useState(0);
  const [productImages, setProductImages] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Select options
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [goals, setGoals] = useState([]);
  const [flavors, setFlavors] = useState([]);
  const [brandSearch, setBrandSearch] = useState('');

  // Stock modal
  const [stockModal, setStockModal] = useState(null);
  const [stockForm, setStockForm] = useState({ operation: 'add', quantity: 1, reason: '' });

  useEffect(() => {
    Promise.all([
      categoryService.getAll({ itemsPerPage: 100 }).catch(() => ({ 'hydra:member': [] })),
      brandService.getAll({ itemsPerPage: 200 }).catch(() => ({ 'hydra:member': [] })),
      goalService.getAll({ itemsPerPage: 100 }).catch(() => ({ 'hydra:member': [] })),
      flavorService.getAll().catch(() => ({ 'hydra:member': [] })),
    ]).then(([c, b, g, f]) => {
      setCategories(collectionItems(c));
      setBrands(collectionItems(b));
      setGoals(collectionItems(g));
      setFlavors(collectionItems(f));
    });
  }, []);

  const selectedBrand = useMemo(
    () => brands.find((b) => relationToIri(b, 'brands') === form.brand) || null,
    [brands, form.brand]
  );

  const filteredBrands = useMemo(() => {
    const term = brandSearch.trim().toLowerCase();
    const sorted = [...brands].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'fr'));
    if (!term) return sorted;
    return sorted.filter((brand) => displayName(brand).toLowerCase().includes(term));
  }, [brands, brandSearch]);

  useEffect(() => {
    if (imageFiles.length === 0) {
      setImagePreviews([]);
      setPrimaryImageIndex(0);
      return undefined;
    }

    const nextPreviews = imageFiles.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));

    setImagePreviews(nextPreviews);
    setPrimaryImageIndex((current) => Math.min(current, nextPreviews.length - 1));

    return () => {
      nextPreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [imageFiles]);

  const hydrateProductImages = useCallback(async (productId, embeddedImages = []) => {
    try {
      const [fullProduct, imageData] = await Promise.all([
        productService.getOne(productId, true),
        productService.getImages({ 'product.id': productId, itemsPerPage: 100 }).catch(() => ({ 'hydra:member': [] })),
      ]);
      return mergeProductImages(
        embeddedImages.length > 0 ? embeddedImages : (fullProduct?.productImages || []),
        imageData?.['hydra:member'] || []
      );
    } catch (_) {
      return mergeProductImages(embeddedImages, []);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, itemsPerPage: 20 };
      if (searchTerm) params.name = searchTerm;
      const data = await productService.getAll(params);
      const productsWithDetails = await Promise.all(
        (data['hydra:member'] || []).map((product) =>
          productService.getOne(product.id).catch(() => product)
        )
      );
      setProducts(productsWithDetails);
      setTotal(data['hydra:totalItems'] || 0);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, [page, searchTerm]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const openAdd = () => { setError(''); setForm(EMPTY_FORM); setImageFiles([]); setImagePreviews([]); setPrimaryImageIndex(0); setProductImages([]); setBrandSearch(''); setModal({ mode: 'add' }); };
  const openEdit = async (p) => {
    setError('');
    setImageFiles([]);
    setImagePreviews([]);
    setPrimaryImageIndex(0);
    setBrandSearch('');
    setModal({ mode: 'edit', id: p.id });
    setForm({
      name: p.name || '', sku: p.sku || '', barcode: p.barcode || '',
      shortDescription: p.shortDescription || '', description: p.description || '',
      price: p.price || '', salePrice: p.salePrice || '', stock: p.stock || '',
      minimumStock: p.minimumStock || '3', weight: p.weight != null ? String(p.weight) : '',
      expirationDate: dateInputValue(p.expirationDate || p.expiryDate),
      isActive: p.isActive ?? true, isFeatured: p.isFeatured ?? false,
      isNew: p.isNew ?? false, isOnSale: p.isOnSale ?? false,
      category: relationToIri(p.category, 'categories'),
      brand: relationToIri(p.brand, 'brands'),
      goals: (p.goals || []).map((g) => relationToIri(g, 'goals')).filter(Boolean),
      flavors: (p.flavors || []).map((f) => relationToIri(f, 'flavors')).filter(Boolean),
      metaTitle: p.metaTitle || '', metaDescription: p.metaDescription || '',
    });

    try {
      const fullProduct = await productService.getOne(p.id).catch(() => p);
      setForm({
        name: fullProduct.name || '', sku: fullProduct.sku || '', barcode: fullProduct.barcode || '',
        shortDescription: fullProduct.shortDescription || '', description: fullProduct.description || '',
        price: fullProduct.price || '', salePrice: fullProduct.salePrice || '', stock: fullProduct.stock || '',
      minimumStock: fullProduct.minimumStock || '3', weight: fullProduct.weight != null ? String(fullProduct.weight) : '',
        expirationDate: dateInputValue(fullProduct.expirationDate || fullProduct.expiryDate),
        isActive: fullProduct.isActive ?? true, isFeatured: fullProduct.isFeatured ?? false,
        isNew: fullProduct.isNew ?? false, isOnSale: fullProduct.isOnSale ?? false,
        category: relationToIri(fullProduct.category, 'categories'),
        brand: relationToIri(fullProduct.brand, 'brands'),
        goals: (fullProduct.goals || []).map((g) => relationToIri(g, 'goals')).filter(Boolean),
        flavors: (fullProduct.flavors || []).map((f) => relationToIri(f, 'flavors')).filter(Boolean),
        metaTitle: fullProduct.metaTitle || '', metaDescription: fullProduct.metaDescription || '',
      });
      setProductImages(await hydrateProductImages(fullProduct.id || p.id, fullProduct.productImages || p.productImages || []));
      const fullBrand = fullProduct.brand || p.brand;
      const matchedBrand = brands.find((brand) => relationToIri(brand, 'brands') === relationToIri(fullBrand, 'brands'));
      setBrandSearch(matchedBrand?.name || '');
    } catch (e) {
      setError(e.message);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        price: form.price ? String(parseFloat(form.price).toFixed(2)) : undefined,
        salePrice: form.salePrice ? String(parseFloat(form.salePrice).toFixed(2)) : undefined,
        stock: form.stock !== '' ? parseInt(form.stock) : undefined,
        minimumStock: form.minimumStock !== '' ? parseInt(form.minimumStock) : undefined,
        weight: form.weight === '' ? null : String(form.weight).trim(),
        category: form.category || undefined,
        brand: form.brand || undefined,
      };

      const saved = modal.mode === 'add'
        ? await productService.create(payload)
        : await productService.update(modal.id, payload);

      const savedId = saved?.id || modal.id;
      if (savedId && imageFiles.length > 0) {
        const selectedPrimaryIndex = Math.max(0, Math.min(primaryImageIndex, imageFiles.length - 1));
        for (let i = 0; i < imageFiles.length; i += 1) {
          await productService.uploadImage(savedId, imageFiles[i], productImages.length + i, i === selectedPrimaryIndex);
        }
      }

      setModal(null);
      setImageFiles([]);
      setImagePreviews([]);
      setPrimaryImageIndex(0);
      setProductImages([]);
      fetchProducts();
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  const refreshProductImages = async (productId) => {
    const latest = await productService.getOne(productId);
    setProductImages(await hydrateProductImages(productId, latest.productImages || []));
    return latest;
  };

  const handleSetPrimaryImage = async (imageId) => {
    if (!imageId) return;
    try {
      await productService.setImagePrimary(imageId);
      if (modal?.id) await refreshProductImages(modal.id);
      fetchProducts();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleDeleteImage = async (imageId) => {
    if (!imageId) return;
    if (!confirm('Supprimer cette image ?')) return;
    try {
      await productService.deleteImage(imageId);
      if (modal?.id) await refreshProductImages(modal.id);
      fetchProducts();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce produit ?')) return;
    try { await productService.delete(id); fetchProducts(); } catch (e) { alert(e.message); }
  };

  const handleToggle = async (p) => {
    try {
      p.isActive ? await productService.deactivate(p.id) : await productService.activate(p.id);
      fetchProducts();
    } catch (e) { alert(e.message); }
  };

  const handleDuplicate = async (id) => {
    try { await productService.duplicate(id); fetchProducts(); } catch (e) { alert(e.message); }
  };

  const handleStockSave = async () => {
    try {
      await productService.adjustStock(stockModal.id, stockForm.operation, parseInt(stockForm.quantity), stockForm.reason);
      setStockModal(null);
      fetchProducts();
    } catch (e) { alert(e.message); }
  };

  const toggleMulti = (key, iri) => {
    setForm(prev => ({
      ...prev,
      [key]: prev[key].includes(iri) ? prev[key].filter(x => x !== iri) : [...prev[key], iri],
    }));
  };

  const inputCls = "w-full bg-[#111] border border-[#333] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#d90429] transition-colors";
  const labelCls = "block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Gestion Produits</h1>
          <p className="text-gray-400 text-sm">{total} produit{total !== 1 ? 's' : ''} au total</p>
        </div>
        <button onClick={openAdd} className="bg-[#d90429] hover:bg-[#ff1a3c] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-lg shadow-[#d90429]/20">
          <Plus size={16} /> Nouveau Produit
        </button>
      </div>

      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[#2a2a2a] flex gap-3 bg-[#1a1a1a]">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
            <input type="text" placeholder="Rechercher..." value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
              className="w-full bg-[#222] border border-[#333] text-sm text-white rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:border-[#d90429]"
            />
          </div>
          <button onClick={fetchProducts} className="p-2 text-gray-400 hover:text-white bg-[#222] border border-[#333] rounded-lg"><RefreshCw size={16} /></button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#222] text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-[#2a2a2a]">
                <th className="px-5 py-4">Produit</th>
                <th className="px-5 py-4">SKU</th>
                <th className="px-5 py-4">Prix</th>
                <th className="px-5 py-4">Stock</th>
                <th className="px-5 py-4">Statut</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2a2a]">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-10"><Loader2 className="w-6 h-6 text-[#d90429] animate-spin mx-auto" /></td></tr>
              ) : products.map(p => (
                <tr key={p.id} className="hover:bg-[#1a1a1a] transition-colors group">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#222] flex items-center justify-center overflow-hidden shrink-0">
                        {(() => {
                          const primarySrc = resolveProductImage(p, null);
                          return primarySrc
                            ? <img src={primarySrc} alt={p.name} className="w-full h-full object-cover" />
                            : <Package size={16} className="text-gray-500" />;
                        })()}
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm">{p.name}</div>
                        <div className="text-xs text-gray-500">{p.category?.name || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-xs font-mono text-gray-400">{p.sku || '—'}</td>
                  <td className="px-5 py-4 font-bold text-white">{parseFloat(p.price || 0).toFixed(2)} TND</td>
                  <td className="px-5 py-4">
                    <span className={`text-sm font-bold ${(p.stock || 0) < (p.minimumStock || 5) ? 'text-red-400' : 'text-gray-300'}`}>
                      {p.stock ?? 0}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${p.isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'}`}>
                      {p.isActive ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <AdminActionButton label="Stock" onClick={() => setStockModal({ id: p.id, name: p.name })} className="p-1.5 text-gray-300 hover:text-blue-400 hover:bg-blue-400/10">
                        <Package size={14} />
                      </AdminActionButton>
                      <AdminActionButton label="Duplicate" onClick={() => handleDuplicate(p.id)} className="p-1.5 text-gray-300 hover:text-yellow-400 hover:bg-yellow-400/10">
                        <Copy size={14} />
                      </AdminActionButton>
                      <AdminActionButton label={p.isActive ? 'Deactivate' : 'Activate'} onClick={() => handleToggle(p)} className="p-1.5 text-gray-300 hover:text-emerald-400 hover:bg-emerald-400/10">
                        <ToggleLeft size={14} />
                      </AdminActionButton>
                      <AdminActionButton label="Edit" onClick={() => openEdit(p)} className="p-1.5 text-gray-300 hover:text-white hover:bg-[#333]">
                        <Edit2 size={14} />
                      </AdminActionButton>
                      <AdminActionButton label="Delete" onClick={() => handleDelete(p.id)} className="p-1.5 text-gray-300 hover:text-[#d90429] hover:bg-[#d90429]/10">
                        <Trash2 size={14} />
                      </AdminActionButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-5 py-4 border-t border-[#2a2a2a] flex items-center justify-between text-sm text-gray-400">
          <span>Page {page} — {total} résultats</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 rounded bg-[#222] hover:bg-[#333] border border-[#333] disabled:opacity-30">Précédent</button>
            <button onClick={() => setPage(p => p + 1)} disabled={products.length < 20} className="px-3 py-1 rounded bg-[#222] hover:bg-[#333] border border-[#333] disabled:opacity-30">Suivant</button>
          </div>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh]">
            <div className="flex justify-between items-center p-6 border-b border-[#2a2a2a]">
              <h2 className="text-xl font-bold text-white">{modal.mode === 'add' ? 'Nouveau Produit' : 'Modifier le Produit'}</h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-white p-1"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 overflow-y-auto flex-1 space-y-5">
              {error && <div className="text-red-400 text-sm bg-red-900/20 border border-red-500/30 rounded-lg p-3">{error}</div>}
              
              <div>
                <label className={labelCls}>Nom *</label>
                <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>SKU</label><input value={form.sku} onChange={e => setForm(p => ({ ...p, sku: e.target.value }))} className={inputCls} /></div>
                <div><label className={labelCls}>Code-barres</label><input value={form.barcode} onChange={e => setForm(p => ({ ...p, barcode: e.target.value }))} className={inputCls} /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className={labelCls}>Prix (TND) *</label><input type="number" step="0.01" required value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} className={inputCls} /></div>
                <div><label className={labelCls}>Prix promo</label><input type="number" step="0.01" value={form.salePrice} onChange={e => setForm(p => ({ ...p, salePrice: e.target.value }))} className={inputCls} /></div>
                <div><label className={labelCls}>Stock</label><input type="number" min="0" value={form.stock} onChange={e => setForm(p => ({ ...p, stock: e.target.value }))} className={inputCls} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>Poids (kg)</label><input type="number" step="0.01" min="0" value={form.weight} onChange={e => setForm(p => ({ ...p, weight: e.target.value }))} className={inputCls} placeholder="0.00" /></div>
                <div><label className={labelCls}>Date d'expiration</label><input type="date" value={form.expirationDate} onChange={e => setForm(p => ({ ...p, expirationDate: e.target.value }))} className={inputCls} /></div>
              </div>
              <div>
                <label className={labelCls}>Image produit</label>
                <label className="border-2 border-dashed border-[#333] rounded-lg p-4 text-center hover:bg-[#222] transition-colors cursor-pointer block">
                  <Upload size={18} className="mx-auto text-gray-500 mb-1" />
                  <span className="text-xs text-gray-500">{imageFiles.length > 0 ? `${imageFiles.length} image(s) sélectionnée(s). Cliquez une vignette pour choisir la principale.` : 'Choisir une ou plusieurs images'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={e => {
                      const nextFiles = Array.from(e.target.files || []);
                      setImageFiles(nextFiles);
                      setPrimaryImageIndex(0);
                    }}
                  />
                </label>
                {imagePreviews.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {imagePreviews.map((preview, index) => {
                      const isPrimary = index === primaryImageIndex;
                      return (
                        <button
                          key={`${preview.file.name}-${preview.file.size}-${index}`}
                          type="button"
                          onClick={() => setPrimaryImageIndex(index)}
                          className={`relative rounded-lg overflow-hidden border text-left transition-all ${
                            isPrimary ? 'border-[#d90429] ring-2 ring-[#d90429]/40' : 'border-[#333] hover:border-[#666]'
                          }`}
                          title={isPrimary ? 'Image principale' : 'Définir comme principale'}
                        >
                          <div className="aspect-square bg-black/20">
                            <img src={preview.url} alt={preview.file.name} className="w-full h-full object-cover" />
                          </div>
                          <div className="absolute left-2 top-2">
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${isPrimary ? 'bg-[#d90429] text-white' : 'bg-black/70 text-white'}`}>
                              {isPrimary ? 'Principale' : 'Secondaire'}
                            </span>
                          </div>
                          <div className="px-2 py-2 bg-[#111]">
                            <div className="text-[11px] text-gray-300 truncate">{preview.file.name}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              {modal.mode === 'edit' && productImages.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <label className={labelCls}>Images existantes</label>
                    <span className="text-[11px] text-gray-500">Use the button on any card to switch the main image</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {productImages.map((img, index) => {
                      const imageId = getProductImageId(img);
                      const imageSrc = productImageUrl(img);
                      const isPrimary = isPrimaryProductImage(img);
                      return (
                      <div key={imageId ?? img['@id'] ?? `${img.image || 'img'}-${index}`} className={`border rounded-xl overflow-hidden bg-[#111] ${isPrimary ? 'border-[#d90429]/60' : 'border-[#333]'}`}>
                        <div className="aspect-square bg-black/20">
                          {imageSrc ? (
                            <img src={imageSrc} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">Image</div>
                          )}
                        </div>
                        <div className="p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${isPrimary ? 'bg-[#d90429] text-white' : 'bg-[#222] text-gray-300'}`}>
                              {isPrimary ? 'Principale' : 'Secondaire'}
                            </span>
                            <span className="text-[10px] text-gray-500 truncate">#{imageId ?? 'sans id'}</span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={!imageId}
                              onClick={() => handleSetPrimaryImage(imageId)}
                              className={`flex-1 px-3 py-2 text-[10px] font-bold rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                                isPrimary
                                  ? 'bg-[#d90429] border-[#d90429] text-white'
                                  : 'bg-[#222] border-[#333] text-gray-300 hover:text-white hover:border-[#d90429]/60'
                              }`}
                            >
                              {isPrimary ? 'Image principale' : 'Définir principale'}
                            </button>
                            <button
                              type="button"
                              disabled={!imageId}
                              onClick={() => handleDeleteImage(imageId)}
                              className="px-3 py-2 text-[10px] font-bold rounded-lg bg-[#3a1111] text-red-300 hover:text-red-100 border border-red-900/40 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              Supprimer
                            </button>
                          </div>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>Catégorie</label>
                  <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className={inputCls}>
                    <option value="">— Choisir —</option>
                    {categories.map((c, index) => (
                      <option key={c['@id'] ?? c.id ?? `category-${index}`} value={c['@id'] || relationToIri(c, 'categories')}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Marque</label>
                  <input
                    type="text"
                    value={brandSearch}
                    onChange={(e) => setBrandSearch(e.target.value)}
                    className={inputCls}
                    placeholder="Rechercher une marque..."
                  />
                  <div className="mt-2 max-h-44 overflow-y-auto rounded-lg border border-[#333] bg-[#111]">
                    <button
                      type="button"
                      onClick={() => {
                        setForm((p) => ({ ...p, brand: '' }));
                        setBrandSearch('');
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm border-b border-[#222] ${
                        !form.brand ? 'bg-[#d90429]/10 text-white' : 'text-gray-400 hover:bg-[#1a1a1a] hover:text-white'
                      }`}
                    >
                      Aucune marque
                    </button>
                    {filteredBrands.map((b, index) => {
                      const iri = relationToIri(b, 'brands');
                      const active = form.brand === iri;
                      return (
                        <button
                          type="button"
                          key={b['@id'] ?? b.id ?? `brand-${index}`}
                          onClick={() => {
                            setForm((p) => ({ ...p, brand: iri }));
                            setBrandSearch(displayName(b));
                          }}
                          className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between gap-3 border-b border-[#222] last:border-b-0 ${
                            active ? 'bg-[#d90429]/10 text-white' : 'text-gray-300 hover:bg-[#1a1a1a] hover:text-white'
                          }`}
                        >
                          <span className="truncate">{displayName(b)}</span>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${b.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-500/10 text-gray-400'}`}>
                            {b.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </button>
                      );
                    })}
                    {filteredBrands.length === 0 && (
                      <div className="px-4 py-3 text-xs text-gray-500">Aucune marque trouvée.</div>
                    )}
                  </div>
                  <div className="mt-1 text-[11px] text-gray-500">
                    Sélection actuelle: {selectedBrand?.name || 'Aucune'}
                  </div>
                </div>
              </div>
              <div><label className={labelCls}>Description courte</label><input value={form.shortDescription} onChange={e => setForm(p => ({ ...p, shortDescription: e.target.value }))} className={inputCls} /></div>
              <div><label className={labelCls}>Description longue</label><textarea rows={5} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className={`${inputCls} resize-none`} /></div>
              
              {/* Goals */}
              {goals.length > 0 && <div>
                <label className={labelCls}>Objectifs</label>
                <div className="flex flex-wrap gap-2">
                  {goals.map(g => <button type="button" key={g.id} onClick={() => toggleMulti('goals', g['@id'])}
                    className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${form.goals.includes(g['@id']) ? 'bg-[#d90429]/10 border-[#d90429] text-[#d90429]' : 'bg-[#111] border-[#333] text-gray-400'}`}
                  >{g.name}</button>)}
                </div>
              </div>}

              {/* Flavors */}
              {flavors.length > 0 && <div>
                <label className={labelCls}>Saveurs</label>
                <div className="flex flex-wrap gap-2">
                  {flavors.map(f => <button type="button" key={f.id} onClick={() => toggleMulti('flavors', f['@id'])}
                    className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${form.flavors.includes(f['@id']) ? 'bg-[#d90429]/10 border-[#d90429] text-[#d90429]' : 'bg-[#111] border-[#333] text-gray-400'}`}
                  >{f.name}</button>)}
                </div>
              </div>}

              {/* Booleans */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[['isActive','Actif'],['isFeatured','En Vedette'],['isNew','Nouveau'],['isOnSale','En Promo']].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.checked }))} className="accent-[#d90429]" />
                    <span className="text-xs text-gray-300 font-bold">{label}</span>
                  </label>
                ))}
              </div>
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

      {/* Stock Modal */}
      {stockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl w-full max-w-sm shadow-2xl">
            <div className="flex justify-between items-center p-5 border-b border-[#2a2a2a]">
              <h3 className="font-bold text-white">Ajuster le Stock — {stockModal.name}</h3>
              <button onClick={() => setStockModal(null)} className="text-gray-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className={labelCls}>Opération</label>
                <select value={stockForm.operation} onChange={e => setStockForm(p => ({ ...p, operation: e.target.value }))} className={inputCls}>
                  <option value="add">Ajouter</option>
                  <option value="remove">Retirer</option>
                  <option value="adjust">Ajuster (valeur absolue)</option>
                  <option value="return">Retour</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Quantité</label>
                <input type="number" min="1" value={stockForm.quantity} onChange={e => setStockForm(p => ({ ...p, quantity: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Raison</label>
                <input value={stockForm.reason} onChange={e => setStockForm(p => ({ ...p, reason: e.target.value }))} className={inputCls} placeholder="ex: Réception fournisseur" />
              </div>
            </div>
            <div className="p-5 border-t border-[#2a2a2a] flex gap-3 justify-end">
              <button onClick={() => setStockModal(null)} className="px-4 py-2 text-sm text-gray-300 hover:text-white">Annuler</button>
              <button onClick={handleStockSave} className="bg-[#d90429] hover:bg-[#ff1a3c] text-white px-5 py-2 rounded-lg text-sm font-bold">Confirmer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
