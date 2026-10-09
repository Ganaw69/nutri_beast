import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { productService, categoryService, brandService, goalService, flavorService, productImageUrl, resolveProductImage, iriToId, isPrimaryProductImage } from '../../services/api';
import { buildCategoryTree, extractCategoryItems, getCategoryParentId } from '../../utils/categoryTree';
import { Search, Plus, Edit2, Trash2, X, Loader2, Check, Package, RefreshCw, ToggleLeft, Copy, Upload, Eye } from 'lucide-react';
import { AdminActionButton } from '../../components/admin/AdminActionButton';

const EMPTY_FORM = {
  name: '', sku: '', barcode: '', shortDescription: '', description: '',
  price: '', salePrice: '', stock: '', minimumStock: '3', weight: '', expirationDate: '', dateProduit: '',
  isActive: true, isFeatured: false, isNew: false, isBestSeller: false, isOnSale: false,
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
const normalizeComparableName = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .replace(/\s+/g, ' ')
  .toLocaleLowerCase('fr');
const displayRelationNames = (items = []) => (Array.isArray(items) ? items : [])
  .map((item) => typeof item === 'string' ? item.split('/').pop() : displayName(item))
  .filter(Boolean)
  .join(', ') || '—';
const entityId = (item) => item?.id ?? iriToId(item?.['@id'] || item?.iri);
const dateInputValue = (value) => (value ? String(value).slice(0, 10) : '');

const normalizeProductImages = (images = []) =>
  [...images].sort((a, b) => Number(isPrimaryProductImage(b)) - Number(isPrimaryProductImage(a)) || Number(a?.position ?? 0) - Number(b?.position ?? 0));

const getProductImageId = (img) => {
  if (!img) return null;
  if (typeof img === 'string') return iriToId(img);
  return (
    img.id ??
    iriToId(img['@id']) ??
    iriToId(img.iri) ??
    img.imageId ??
    img.productImageId ??
    null
  );
};

const fileKey = (file) => `${file.name}-${file.size}-${file.lastModified}`;

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
      if (typeof img === 'string') return fetched;
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
  const [selectedParentCategoryId, setSelectedParentCategoryId] = useState('');
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState('');
  const [modal, setModal] = useState(null); // null | { mode: 'add'|'edit', data? }
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedFormParentCategoryId, setSelectedFormParentCategoryId] = useState('');
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [primaryImageIndex, setPrimaryImageIndex] = useState(0);
  const [productImages, setProductImages] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [detailsModal, setDetailsModal] = useState(null);

  // Select options
  const [categories, setCategories] = useState([]);
  const [mainCategories, setMainCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [goals, setGoals] = useState([]);
  const [flavors, setFlavors] = useState([]);
  const [flavorSearch, setFlavorSearch] = useState('');
  const [brandSearch, setBrandSearch] = useState('');
  const [newFlavorName, setNewFlavorName] = useState('');
  const [creatingFlavor, setCreatingFlavor] = useState(false);
  const [flavorError, setFlavorError] = useState('');

  // Stock modal
  const [stockModal, setStockModal] = useState(null);
  const [stockForm, setStockForm] = useState({ operation: 'add', quantity: 1, reason: '' });

  useEffect(() => {
    Promise.all([
      categoryService.getAll({ itemsPerPage: 100 }).catch(() => ({ 'hydra:member': [] })),
      categoryService.getMain(true).catch(() => ({ member: [] })),
      brandService.getAll({ itemsPerPage: 100 }).catch(() => ({ 'hydra:member': [] })),
      goalService.getAll({ itemsPerPage: 100 }).catch(() => ({ 'hydra:member': [] })),
      // The flavor list is a public endpoint and must not send the admin JWT.
      flavorService.getAll({ itemsPerPage: 100 }, true).catch(() => ({ 'hydra:member': [] })),
    ]).then(([c, main, b, g, f]) => {
      setCategories(collectionItems(c));
      setMainCategories(collectionItems(main));
      setBrands(collectionItems(b));
      setGoals(collectionItems(g));
      setFlavors(collectionItems(f));
    });
  }, []);

  const parentCategories = useMemo(
    () => [...mainCategories].sort((a, b) => Number(a.position ?? 0) - Number(b.position ?? 0)),
    [mainCategories]
  );

  const subCategories = useMemo(() => {
    const parent = parentCategories.find((category) => String(entityId(category)) === String(selectedParentCategoryId));
    return [...(parent?.children || [])].sort((a, b) => Number(a.position ?? 0) - Number(b.position ?? 0));
  }, [parentCategories, selectedParentCategoryId]);

  // The product relation must point to the most specific category. Keeping the
  // parent selection separate lets the form reveal only its own children.
  const categoryItems = useMemo(() => extractCategoryItems(categories), [categories]);
  const productCategoryTree = useMemo(() => {
    // `/categories/main` carries the hierarchy (root categories and their
    // children). The generic endpoint can return the same records flat.
    const mainTree = extractCategoryItems(mainCategories);
    return mainTree.length > 0 ? mainTree : buildCategoryTree(categoryItems);
  }, [mainCategories, categoryItems]);
  const formSubCategories = useMemo(() => {
    const parent = productCategoryTree.find((category) => String(entityId(category)) === String(selectedFormParentCategoryId));
    return [...(parent?.children || [])].sort((a, b) => Number(a.position ?? 0) - Number(b.position ?? 0));
  }, [productCategoryTree, selectedFormParentCategoryId]);

  // Hide legacy duplicates and make search insensitive to case, accents, and spaces.
  const visibleFlavors = useMemo(() => {
    const seenNames = new Set();
    const search = normalizeComparableName(flavorSearch);

    return [...flavors]
      .sort((a, b) => displayName(a).localeCompare(displayName(b), 'fr'))
      .filter((flavor) => {
        const normalizedName = normalizeComparableName(displayName(flavor));
        if (!normalizedName || seenNames.has(normalizedName)) return false;
        seenNames.add(normalizedName);
        return !search || normalizedName.includes(search);
      });
  }, [flavors, flavorSearch]);

  const getFormParentCategoryId = useCallback((category) => {
    const categoryId = typeof category === 'object' ? entityId(category) : iriToId(category);
    const parentFromMainTree = mainCategories.find((parent) =>
      (parent.children || []).some((child) => String(entityId(child)) === String(categoryId))
    );
    if (parentFromMainTree) return String(entityId(parentFromMainTree));

    const selectedCategory = categoryItems.find((item) => String(item.id) === String(categoryId));
    return String(getCategoryParentId(selectedCategory) ?? categoryId ?? '');
  }, [mainCategories, categoryItems]);

  // The category list can finish loading after an edit modal is opened.
  // Reconcile the selected parent once its child record is available.
  useEffect(() => {
    if (!form.category || categoryItems.length === 0) return;
    const parentId = getFormParentCategoryId(form.category);
    if (parentId && parentId !== String(selectedFormParentCategoryId)) {
      setSelectedFormParentCategoryId(parentId);
    }
  }, [categoryItems, form.category, getFormParentCategoryId, selectedFormParentCategoryId]);

  const selectedFilterCategoryIds = useMemo(() => {
    if (selectedSubCategoryId) return [selectedSubCategoryId];
    if (!selectedParentCategoryId) return [];

    // Products are generally linked to a child category. Selecting a parent
    // therefore includes its own id and every direct child id.
    return [...new Set([
      selectedParentCategoryId,
      ...subCategories.map(entityId).filter((id) => id !== null && id !== undefined),
    ].map(String))];
  }, [selectedParentCategoryId, selectedSubCategoryId, subCategories]);

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
      // The backoffice API filters images with the product id directly:
      // GET /api/product_images?product=<productId>
      const imageData = await productService.getImages({ product: productId, itemsPerPage: 100 });
      return mergeProductImages(embeddedImages, collectionItems(imageData));
    } catch (_) {
      return mergeProductImages(embeddedImages, []);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchTerm) params.name = searchTerm;
      // Apply the category relation locally before slicing pages. This keeps
      // parent-category filters reliable across API Platform query syntaxes.
      const data = await productService.getAllPages(params);
      const allowedCategoryIds = new Set(selectedFilterCategoryIds.map(String));
      const matchingProducts = (data['hydra:member'] || []).filter((product) => {
        const category = product.category;
        const productCategoryId = typeof category === 'object'
          ? entityId(category)
          : iriToId(category);
        const matchesCategory = allowedCategoryIds.size === 0 || allowedCategoryIds.has(String(productCategoryId));
        const matchesSearch = !searchTerm || String(product.name || '').toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
      });
      const pageProducts = matchingProducts.slice((page - 1) * 20, page * 20);
      const productsWithDetails = await Promise.all(
        pageProducts.map(async (product) => {
          const detailedProduct = await productService.getOne(product.id).catch(() => product);
          const productId = detailedProduct.id || product.id;
          const productImages = await hydrateProductImages(productId, detailedProduct.productImages || product.productImages || []);
          return { ...detailedProduct, productImages };
        })
      );
      setProducts(productsWithDetails);
      setTotal(matchingProducts.length);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, [page, searchTerm, selectedFilterCategoryIds, hydrateProductImages]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedParentCategoryId, selectedSubCategoryId]);

  const openAdd = () => { setError(''); setFlavorError(''); setNewFlavorName(''); setFlavorSearch(''); setForm(EMPTY_FORM); setSelectedFormParentCategoryId(''); setImageFiles([]); setImagePreviews([]); setPrimaryImageIndex(0); setProductImages([]); setBrandSearch(''); setModal({ mode: 'add' }); };
  const openEdit = async (p) => {
    setError('');
    setFlavorError('');
    setNewFlavorName('');
    setFlavorSearch('');
    setImageFiles([]);
    setImagePreviews([]);
    setPrimaryImageIndex(0);
    setBrandSearch('');
    setModal({ mode: 'edit', id: p.id });
    setSelectedFormParentCategoryId(getFormParentCategoryId(p.category));
    setForm({
      name: p.name || '', sku: p.sku || '', barcode: p.barcode || '',
      shortDescription: p.shortDescription || '', description: p.description || '',
      price: p.price || '', salePrice: p.salePrice || '', stock: p.stock || '',
      minimumStock: p.minimumStock || '3', weight: p.weight != null ? String(p.weight) : '',
      expirationDate: dateInputValue(p.expirationDate || p.expiryDate),
      dateProduit: dateInputValue(p.dateProduit),
      isActive: p.isActive ?? true, isFeatured: p.isFeatured ?? false,
      isNew: p.isNew ?? false, isBestSeller: p.isBestSeller ?? false, isOnSale: p.isOnSale ?? false,
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
        dateProduit: dateInputValue(fullProduct.dateProduit),
        isActive: fullProduct.isActive ?? true, isFeatured: fullProduct.isFeatured ?? false,
        isNew: fullProduct.isNew ?? false, isBestSeller: fullProduct.isBestSeller ?? false, isOnSale: fullProduct.isOnSale ?? false,
        category: relationToIri(fullProduct.category, 'categories'),
        brand: relationToIri(fullProduct.brand, 'brands'),
        goals: (fullProduct.goals || []).map((g) => relationToIri(g, 'goals')).filter(Boolean),
        flavors: (fullProduct.flavors || []).map((f) => relationToIri(f, 'flavors')).filter(Boolean),
        metaTitle: fullProduct.metaTitle || '', metaDescription: fullProduct.metaDescription || '',
      });
      setSelectedFormParentCategoryId(getFormParentCategoryId(fullProduct.category));
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
        dateProduit: form.dateProduit ? `${form.dateProduit}T00:00:00+00:00` : null,
        category: form.category || undefined,
        brand: form.brand || undefined,
      };

      const saved = modal.mode === 'add'
        ? await productService.create(payload)
        : await productService.update(modal.id, payload);

      // API Platform may return the identifier only through the resource IRI.
      // Never upload images without the id of the product just saved.
      const savedId = saved?.id ?? iriToId(saved?.['@id']) ?? modal.id;
      if (savedId && imageFiles.length > 0) {
        const selectedPrimaryIndex = Math.max(0, Math.min(primaryImageIndex, imageFiles.length - 1));
        let selectedPrimaryImage = null;
        for (let i = 0; i < imageFiles.length; i += 1) {
          const uploadedImage = await productService.uploadImage(
            savedId,
            imageFiles[i],
            productImages.length + i,
            i === selectedPrimaryIndex
          );
          if (i === selectedPrimaryIndex) selectedPrimaryImage = uploadedImage;
        }

        // The API may treat multipart boolean fields differently depending on
        // its serializer. Confirm the chosen image through the dedicated
        // endpoint after every upload so exactly that image becomes primary.
        const selectedPrimaryId = getProductImageId(selectedPrimaryImage);
        if (selectedPrimaryId != null) {
          await productService.setImagePrimary(selectedPrimaryId);
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

  const handleCreateFlavor = async () => {
    const name = newFlavorName.trim();
    if (!name || creatingFlavor) return;

    const existingFlavor = flavors.find((flavor) =>
      normalizeComparableName(displayName(flavor)) === normalizeComparableName(name)
    );
    if (existingFlavor) {
      const iri = relationToIri(existingFlavor, 'flavors');
      if (iri) {
        setForm((current) => ({
          ...current,
          flavors: current.flavors.includes(iri) ? current.flavors : [...current.flavors, iri],
        }));
      }
      setFlavorError('Cette saveur existe déjà et a été sélectionnée.');
      return;
    }

    setCreatingFlavor(true);
    setFlavorError('');
    try {
      // flavorService uses the authenticated API client, so this POST includes the admin JWT.
      const createdFlavor = await flavorService.create({ name });
      const iri = relationToIri(createdFlavor, 'flavors');
      setFlavors((current) => [...current, createdFlavor].sort((a, b) => displayName(a).localeCompare(displayName(b), 'fr')));
      if (iri) {
        setForm((current) => ({
          ...current,
          flavors: current.flavors.includes(iri) ? current.flavors : [...current.flavors, iri],
        }));
      }
      setNewFlavorName('');
    } catch (e) {
      setFlavorError(e.message || "Impossible d'ajouter cette saveur.");
    } finally {
      setCreatingFlavor(false);
    }
  };

  const openDetails = async (product) => {
    setDetailsModal({ product, images: [], loading: true, error: '' });
    try {
      const fullProduct = await productService.getOne(product.id).catch(() => product);
      const images = await hydrateProductImages(fullProduct.id || product.id, fullProduct.productImages || product.productImages || []);
      setDetailsModal({ product: fullProduct, images, loading: false, error: '' });
    } catch (e) {
      setDetailsModal({ product, images: [], loading: false, error: e.message || 'Impossible de charger les détails.' });
    }
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
          <select
            value={selectedParentCategoryId}
            onChange={(e) => {
              setSelectedParentCategoryId(e.target.value);
              setSelectedSubCategoryId('');
            }}
            aria-label="Filtrer par catégorie principale"
            className="min-w-48 bg-[#222] border border-[#333] text-sm text-white rounded-lg px-3 py-2 focus:outline-none focus:border-[#d90429]"
          >
            <option value="">Toutes les catégories</option>
            {parentCategories.map((category, index) => (
              <option key={`parent-category-${entityId(category) ?? 'unknown'}-${index}`} value={entityId(category) ?? ''}>
                {displayName(category)}
              </option>
            ))}
          </select>
          <select
            value={selectedSubCategoryId}
            onChange={(e) => setSelectedSubCategoryId(e.target.value)}
            disabled={!selectedParentCategoryId}
            aria-label="Filtrer par sous-catégorie"
            className="min-w-48 bg-[#222] border border-[#333] text-sm text-white rounded-lg px-3 py-2 focus:outline-none focus:border-[#d90429] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">Toutes les sous-catégories</option>
            {subCategories.map((category, index) => (
              <option key={`sub-category-${entityId(category) ?? 'unknown'}-${index}`} value={entityId(category) ?? ''}>
                {displayName(category)}
              </option>
            ))}
          </select>
          <button onClick={fetchProducts} className="p-2 text-gray-400 hover:text-white bg-[#222] border border-[#333] rounded-lg"><RefreshCw size={16} /></button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#222] text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-[#2a2a2a]">
                <th className="px-5 py-4">Image principale / Produit</th>
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
                      <div className="w-12 h-12 rounded-lg bg-[#222] border border-[#333] flex items-center justify-center overflow-hidden shrink-0">
                        {(() => {
                          const primarySrc = resolveProductImage(p, null);
                          return primarySrc
                            ? <img src={primarySrc} alt={`Image principale de ${p.name}`} className="w-full h-full object-cover" />
                            : <Package size={18} className="text-gray-500" />;
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
                      <AdminActionButton label="Voir les détails" onClick={() => openDetails(p)} className="p-1.5 text-gray-300 hover:text-sky-400 hover:bg-sky-400/10">
                        <Eye size={14} />
                      </AdminActionButton>
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
              <div><label className={labelCls}>Date du produit</label><input type="date" value={form.dateProduit} onChange={e => setForm(p => ({ ...p, dateProduit: e.target.value }))} className={inputCls} /></div>
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
                      if (nextFiles.length === 0) return;

                      // Keep images chosen in earlier picker openings. This
                      // lets an admin add several batches without silently
                      // losing the first batch or its primary-image choice.
                      setImageFiles((currentFiles) => {
                        const knownFiles = new Set(currentFiles.map(fileKey));
                        const filesToAdd = nextFiles.filter((file) => !knownFiles.has(fileKey(file)));
                        if (currentFiles.length === 0 && filesToAdd.length > 0) setPrimaryImageIndex(0);
                        return [...currentFiles, ...filesToAdd];
                      });
                      // Allow selecting the same file again after removing it
                      // or reopening the file picker.
                      e.target.value = '';
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
                  <select
                    value={selectedFormParentCategoryId}
                    onChange={(e) => {
                      const parentId = e.target.value;
                      const selectedParent = productCategoryTree.find(
                        (category) => String(entityId(category)) === String(parentId)
                      );
                      const children = selectedParent?.children || [];
                      setSelectedFormParentCategoryId(parentId);
                      // A root category without children is itself the product
                      // category. Previously this cleared `category`, causing
                      // the API to receive null for the last root categories.
                      setForm((p) => ({
                        ...p,
                        category: children.length > 0
                          ? ''
                          : relationToIri(selectedParent, 'categories'),
                      }));
                    }}
                    className={inputCls}
                  >
                    <option value="">— Choisir —</option>
                    {productCategoryTree.map((category, index) => (
                      <option key={`parent-category-form-${entityId(category) ?? category.slug ?? 'unknown'}-${index}`} value={entityId(category) ?? ''}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div><label className={labelCls}>Sous-catégorie</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                    className={inputCls}
                    disabled={!selectedFormParentCategoryId || formSubCategories.length === 0}
                    required={formSubCategories.length > 0}
                  >
                    <option value="">
                      {!selectedFormParentCategoryId
                        ? '— Choisir d’abord une catégorie —'
                        : formSubCategories.length === 0
                          ? 'Aucune sous-catégorie disponible'
                          : '— Choisir —'}
                    </option>
                    {formSubCategories.map((category, index) => (
                      <option key={`sub-category-form-${entityId(category) ?? category.slug ?? 'unknown'}-${index}`} value={relationToIri(category, 'categories')}>
                        {category.name}
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
              <div>
                <label className={labelCls}>Saveurs</label>
                <div className="flex gap-2 mb-3">
                  <input
                    value={newFlavorName}
                    onChange={(e) => setNewFlavorName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateFlavor(); } }}
                    className={inputCls}
                    placeholder="Ajouter une nouvelle saveur"
                  />
                  <button type="button" onClick={handleCreateFlavor} disabled={!newFlavorName.trim() || creatingFlavor} className="shrink-0 bg-[#222] hover:bg-[#333] border border-[#444] text-white px-4 rounded-lg text-xs font-bold disabled:opacity-50">
                    {creatingFlavor ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                  </button>
                </div>
                {flavorError && <p className="mb-3 text-xs text-red-400">{flavorError}</p>}
                {flavors.length > 0 && <div className="relative mb-3">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                  <input
                    type="search"
                    value={flavorSearch}
                    onChange={(e) => setFlavorSearch(e.target.value)}
                    className={`${inputCls} pl-10`}
                    placeholder="Rechercher une saveur..."
                    aria-label="Rechercher une saveur"
                  />
                </div>}
                <div className="flex flex-wrap gap-2">
                  {visibleFlavors.map((f) => {
                    const iri = relationToIri(f, 'flavors');
                    return <button type="button" key={f['@id'] ?? f.id} onClick={() => toggleMulti('flavors', iri)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${form.flavors.includes(iri) ? 'bg-[#d90429]/10 border-[#d90429] text-[#d90429]' : 'bg-[#111] border-[#333] text-gray-400'}`}
                    >{f.name}</button>;
                  })}
                </div>
                {flavors.length > 0 && visibleFlavors.length === 0 && <p className="text-xs text-gray-500">Aucune saveur trouvée.</p>}
                {flavors.length === 0 && <p className="text-xs text-gray-500">Aucune saveur. Ajoutez la première ci-dessus.</p>}
              </div>

              {/* Booleans */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[['isActive','Actif'],['isFeatured','En Vedette'],['isNew','Nouveau'],['isBestSeller','Best seller'],['isOnSale','En Promo']].map(([key, label]) => (
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

      {/* Product details modal */}
      {detailsModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between p-6 border-b border-[#2a2a2a]">
              <div>
                <p className="text-[10px] font-bold tracking-widest text-[#d90429] uppercase">Détails du produit</p>
                <h2 className="mt-1 text-xl font-bold text-white">{detailsModal.product.name}</h2>
              </div>
              <button onClick={() => setDetailsModal(null)} className="text-gray-400 hover:text-white p-1" aria-label="Fermer"><X size={20} /></button>
            </div>
            <div className="overflow-y-auto p-6">
              {detailsModal.loading ? (
                <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 text-[#d90429] animate-spin" /></div>
              ) : (
                <div className="space-y-6">
                  {detailsModal.error && <div className="text-red-400 text-sm bg-red-900/20 border border-red-500/30 rounded-lg p-3">{detailsModal.error}</div>}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {detailsModal.images.length > 0 ? detailsModal.images.map((image, index) => {
                      const imageSrc = productImageUrl(image);
                      return (
                        <div key={getProductImageId(image) ?? index} className="relative aspect-square overflow-hidden rounded-lg border border-[#333] bg-[#111]">
                          {imageSrc ? <img src={imageSrc} alt={`${detailsModal.product.name} ${index + 1}`} className="w-full h-full object-cover" /> : <Package className="absolute inset-0 m-auto text-gray-600" />}
                          {isPrimaryProductImage(image) && <span className="absolute left-2 top-2 rounded bg-[#d90429] px-2 py-1 text-[10px] font-bold uppercase text-white">Principale</span>}
                        </div>
                      );
                    }) : (
                      <div className="col-span-full flex min-h-40 items-center justify-center rounded-lg border border-dashed border-[#333] text-sm text-gray-500">Aucune image disponible</div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 rounded-xl border border-[#2a2a2a] bg-[#111] p-5">
                    {[
                      ['SKU', detailsModal.product.sku || '—'],
                      ['Code-barres', detailsModal.product.barcode || '—'],
                      ['Prix', `${parseFloat(detailsModal.product.price || 0).toFixed(2)} TND`],
                      ['Prix promo', detailsModal.product.salePrice ? `${parseFloat(detailsModal.product.salePrice).toFixed(2)} TND` : '—'],
                      ['Stock', `${detailsModal.product.stock ?? 0} (minimum : ${detailsModal.product.minimumStock ?? 0})`],
                      ['Poids', detailsModal.product.weight ? `${detailsModal.product.weight} kg` : '—'],
                      ['Catégorie', displayName(detailsModal.product.category) || '—'],
                      ['Marque', displayName(detailsModal.product.brand) || '—'],
                      ['Objectifs', displayRelationNames(detailsModal.product.goals)],
                      ['Saveurs', displayRelationNames(detailsModal.product.flavors)],
                      ['Date du produit', dateInputValue(detailsModal.product.dateProduit) || '—'],
                      ['Expiration', dateInputValue(detailsModal.product.expirationDate || detailsModal.product.expiryDate) || '—'],
                      ['Statut', detailsModal.product.isActive ? 'Actif' : 'Inactif'],
                      ['Best seller', detailsModal.product.isBestSeller ? 'Oui' : 'Non'],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{label}</p>
                        <p className="mt-1 text-sm text-white break-words">{value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div><p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Description courte</p><p className="mt-1 text-sm leading-relaxed text-gray-300">{detailsModal.product.shortDescription || '—'}</p></div>
                    <div><p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Description</p><p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-gray-300">{detailsModal.product.description || '—'}</p></div>
                    <div><p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">SEO</p><p className="mt-1 text-sm text-gray-300">{detailsModal.product.metaTitle || '—'}</p><p className="mt-1 text-xs leading-relaxed text-gray-500">{detailsModal.product.metaDescription || ''}</p></div>
                  </div>
                </div>
              )}
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
