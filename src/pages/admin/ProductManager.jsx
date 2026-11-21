import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { productService, productVariantService, categoryService, brandService, goalService, flavorService, productImageUrl, resolveProductImage, iriToId, isPrimaryProductImage } from '../../services/api';
import { buildCategoryTree, extractCategoryItems, getCategoryParentId } from '../../utils/categoryTree';
import { getVariantOptionLabels } from '../../utils/productVariantOptions';
import { Search, Plus, Edit2, Trash2, X, Loader2, Check, Package, RefreshCw, ToggleLeft, Copy, Upload, Eye, Pencil, Barcode, Tag, Weight, Layers, Target, CalendarDays, Star, Sparkles, Warehouse, BadgeCheck, Image as ImageIcon } from 'lucide-react';
import { AdminActionButton } from '../../components/admin/AdminActionButton';

const EMPTY_FORM = {
  name: '', barcode: '', shortDescription: '', description: '',
  price: '', salePrice: '', stock: '', minimumStock: '3', weight: '', dateProduit: '',
  isActive: true, isFeatured: false, isNew: false, isBestSeller: false, isOnSale: false,
  packing: false, montantRemise: '',
  category: '', brand: '', goals: [], flavors: [], hasFlavors: false, hasContenance: false,
  productOptions: { type: '', sizes: [], colors: [], styles: [], capacityLiters: '' },
  metaTitle: '', metaDescription: '',
};
const EMPTY_VARIANT_DRAFT = {
  flavor: '', design: '', color: '', size: '', capacityLiters: '', capacity: '', stock: '0',
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
const displayName = (item) => item?.name || item?.brandName || item?.brand_name || item?.nom || item?.title || item?.label || '';
const isTruthyFlag = (...values) => values.some((value) => (
  value === true
  || value === 1
  || value === '1'
  || (typeof value === 'string' && value.toLowerCase() === 'true')
));
const displayBrandName = (brand) => {
  if (typeof brand === 'string') {
    const reference = brand.split('/').filter(Boolean).pop();
    return reference ? reference.replace(/[-_]+/g, ' ') : '';
  }
  const name = displayName(brand);
  if (name) return name;
  const identifier = brand?.slug || brand?.['@id'] || brand?.iri || brand?.id;
  return identifier ? String(identifier).split('/').filter(Boolean).pop().replace(/[-_]+/g, ' ') : '';
};
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
const relationId = (value) => typeof value === 'object' && value !== null ? entityId(value) : iriToId(value);
const variantProductId = (variant) => relationId(variant?.product ?? variant?.productId ?? variant?.productIri);
const variantSku = (variant) => variant?.sku ?? variant?.SKU ?? '';
const variantLabel = (variant) => {
  const flavor = typeof variant?.flavor === 'object' ? displayName(variant.flavor) : variant?.flavorName ?? variant?.flavor_name;
  return [variant?.name ?? variant?.label ?? variant?.title, flavor, ...getVariantOptionLabels(variant)]
    .filter(Boolean)
    .map((value) => typeof value === 'number' ? `${value} kg` : value)
    .join(' · ') || variantSku(variant) || 'Variante';
};
const variantPrice = (variant) => {
  const price = Number(variant?.price ?? 0);
  const salePrice = Number(variant?.salePrice ?? variant?.sale_price ?? 0);
  const effectivePrice = Number(variant?.effectivePrice);
  return Number.isFinite(effectivePrice) && effectivePrice > 0
    ? effectivePrice
    : salePrice > 0 && salePrice < price ? salePrice : price;
};
const skuToken = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toUpperCase()
  .replace(/[^A-Z0-9]+/g, '-')
  .replace(/^-|-$/g, '');
const generateVariantSku = (productId, productName, flavorName, size, existingSkus = []) => {
  const parts = [
    `P${productId}`,
    skuToken(productName).slice(0, 24),
    skuToken(flavorName || 'STANDARD').slice(0, 16),
    skuToken(size).slice(0, 12),
  ].filter(Boolean);
  const baseSku = parts.join('-').slice(0, 60);
  const knownSkus = new Set(existingSkus.map((sku) => String(sku).toLowerCase()));
  let sku = baseSku;
  let suffix = 2;
  while (knownSkus.has(sku.toLowerCase())) {
    const tail = `-${suffix}`;
    sku = `${baseSku.slice(0, 64 - tail.length)}${tail}`;
    suffix += 1;
  }
  return sku;
};
const dateInputValue = (value) => (value ? String(value).slice(0, 10) : '');
const safeDescriptionHtml = (html) => {
  if (typeof DOMParser === 'undefined') return '';
  const allowedTags = new Set(['P', 'BR', 'UL', 'OL', 'LI', 'STRONG', 'B', 'EM', 'I', 'U', 'H2', 'H3', 'H4', 'BLOCKQUOTE', 'A']);
  const blockedTags = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'MATH']);
  const document = new DOMParser().parseFromString(String(html), 'text/html');
  const cleanNode = (node) => {
    if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.textContent || '');
    if (node.nodeType !== Node.ELEMENT_NODE) return document.createDocumentFragment();
    if (blockedTags.has(node.tagName)) return document.createDocumentFragment();
    const children = [...node.childNodes].map(cleanNode);
    if (!allowedTags.has(node.tagName)) {
      const fragment = document.createDocumentFragment();
      children.forEach((child) => fragment.append(child));
      return fragment;
    }
    const element = document.createElement(node.tagName.toLowerCase());
    children.forEach((child) => element.append(child));
    if (node.tagName === 'A') {
      const href = node.getAttribute('href') || '';
      if (/^(https?:|mailto:)/i.test(href)) {
        element.setAttribute('href', href);
        element.setAttribute('target', '_blank');
        element.setAttribute('rel', 'noopener noreferrer');
      }
    }
    return element;
  };
  const output = document.createElement('div');
  [...document.body.childNodes].map(cleanNode).forEach((node) => output.append(node));
  return output.innerHTML;
};
const descriptionIsHtml = (value) => /<\/?[a-z][^>]*>/i.test(String(value || ''));
const formatAdminDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('fr-TN', { dateStyle: 'medium', timeStyle: 'short' });
};
const normalizeProductOptions = (options = {}) => ({
  type: options?.type || '',
  sizes: Array.isArray(options?.sizes) ? options.sizes : [],
  colors: Array.isArray(options?.colors) ? options.colors : [],
  styles: Array.isArray(options?.styles) ? options.styles : [],
  capacityLiters: options?.capacityLiters ?? '',
});
const splitOptionValues = (value) => String(value || '').split(',').map((item) => item.trim()).filter(Boolean);

const normalizeProductImages = (images = []) =>
  [...images].sort((a, b) => Number(isPrimaryProductImage(b)) - Number(isPrimaryProductImage(a)) || Number(a?.position ?? 0) - Number(b?.position ?? 0));

const getProductImageId = (img) => {
  if (!img) return null;
  if (typeof img === 'string') return iriToId(img);
  const resourceIri = img['@id'] || img.iri;
  return (
    img.id ??
    iriToId(resourceIri) ??
    resourceIri ??
    img.imageId ??
    img.productImageId ??
    null
  );
};

const fileKey = (file) => `${file.name}-${file.size}-${file.lastModified}`;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const validateImageFiles = (files) => {
  const invalid = files.find((file) => !ALLOWED_IMAGE_TYPES.has(file.type) || file.size > MAX_IMAGE_SIZE);
  return invalid ? 'Choisissez des images JPG, PNG ou WEBP de 5 Mo maximum.' : '';
};

const getProductImageSource = (img) => {
  if (!img) return null;
  if (typeof img === 'string') return img;
  return (
    img.imageUrl ??
    img.image_url ??
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
const getProductImageFlavorId = (img) => {
  if (!img || typeof img === 'string') return null;
  const flavor = img.flavor ?? img.flavour ?? img.flavorId ?? img.flavor_id;
  if (typeof flavor === 'number') return flavor;
  if (typeof flavor === 'string') return iriToId(flavor) ?? flavor;
  return flavor?.id ?? iriToId(flavor?.['@id'] || flavor?.iri) ?? null;
};
const getProductImageVariantId = (img) => {
  if (!img || typeof img === 'string') return null;
  const variant = img.variant ?? img.variantId ?? img.variant_id;
  if (typeof variant === 'number') return variant;
  if (typeof variant === 'string') return iriToId(variant) ?? variant;
  return variant?.id ?? iriToId(variant?.['@id'] || variant?.iri) ?? null;
};
const withPrimaryImageState = (image, isPrimary) => {
  const updated = { ...image, isPrimary };
  ['is_primary', 'primary', 'isMain', 'is_main', 'main'].forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(image, key)) updated[key] = isPrimary;
  });
  return updated;
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
  const [stockFilter, setStockFilter] = useState('');
  const [modal, setModal] = useState(null); // null | { mode: 'add'|'edit', data? }
  const [isProductCreationFlow, setIsProductCreationFlow] = useState(false);
  const [productCreationStep, setProductCreationStep] = useState(1);
  const [editingProductHasVariants, setEditingProductHasVariants] = useState(false);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [variantsLoadFailed, setVariantsLoadFailed] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedFormParentCategoryId, setSelectedFormParentCategoryId] = useState('');
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [primaryImageIndex, setPrimaryImageIndex] = useState(0);
  const [productImages, setProductImages] = useState([]);
  const [productVariants, setProductVariants] = useState([]);
  const [variantDraft, setVariantDraft] = useState(EMPTY_VARIANT_DRAFT);
  const [variantImageFiles, setVariantImageFiles] = useState({});
  const [variantSaving, setVariantSaving] = useState(false);
  const [variantError, setVariantError] = useState('');
  const [variantNotice, setVariantNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [detailsModal, setDetailsModal] = useState(null);
  const [selectedDetailImage, setSelectedDetailImage] = useState(0);

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
  const [stockSaving, setStockSaving] = useState(false);
  const [stockError, setStockError] = useState('');

  useEffect(() => {
    Promise.all([
      categoryService.getAll({ itemsPerPage: 100 }).catch(() => ({ 'hydra:member': [] })),
      categoryService.getMain(true).catch(() => ({ member: [] })),
      brandService.getAllPages().catch(() => ({ 'hydra:member': [] })),
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

  const selectedAccessoryContext = useMemo(() => {
    const selectedId = String(iriToId(form.category) || selectedFormParentCategoryId || '');
    const parent = productCategoryTree.find((category) => String(entityId(category)) === String(selectedFormParentCategoryId));
    const child = (parent?.children || []).find((category) => String(entityId(category)) === selectedId)
      || productCategoryTree.find((category) => String(entityId(category)) === selectedId);
    const categoryText = normalizeComparableName(`${parent?.name || ''} ${child?.name || ''}`);
    let inferredType = '';
    if (/chauss|shoe|sneaker|basket/.test(categoryText)) inferredType = 'shoes';
    else if (/vetement|clothing|textile|t-shirt|tshirt|pantalon|legging|short/.test(categoryText)) inferredType = 'clothes';
    else if (/gourde|shaker|bouteille|bidon|cup|tumbler/.test(categoryText)) inferredType = 'cup';
    const isAccessory = /accessoir|accessor/.test(categoryText) || Boolean(inferredType);
    return { isAccessory, type: inferredType || form.productOptions?.type || '' };
  }, [form.category, form.productOptions?.type, productCategoryTree, selectedFormParentCategoryId]);

  const filteredBrands = useMemo(() => {
    const term = brandSearch.trim().toLowerCase();
    const sorted = [...brands].sort((a, b) => displayBrandName(a).localeCompare(displayBrandName(b), 'fr'));
    if (!term) return sorted;
    return sorted.filter((brand) => displayBrandName(brand).toLocaleLowerCase('fr').includes(term));
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
      const imageData = await productService.getImages({ product: `/api/products/${productId}`, itemsPerPage: 100 });
      return mergeProductImages(embeddedImages, collectionItems(imageData));
    } catch (_) {
      return mergeProductImages(embeddedImages, []);
    }
  }, []);

  const hydrateProductsImages = useCallback(async (items) => {
    if (items.length === 0) return items;
    const productsWithoutImages = items.filter((product) => {
      const images = Array.isArray(product.productImages) ? product.productImages : [];
      return images.length === 0 || images.some((image) => !getProductImageSource(image));
    });
    if (productsWithoutImages.length === 0) return items;

    try {
      const imageData = await productService.getImages({ itemsPerPage: 100 });
      const imagesByProduct = new Map();
      collectionItems(imageData).forEach((image) => {
        const productId = getProductImageProductId(image);
        if (productId == null) return;
        const key = String(productId);
        imagesByProduct.set(key, [...(imagesByProduct.get(key) || []), image]);
      });
      return items.map((product) => ({
        ...product,
        productImages: mergeProductImages(
          product.productImages || [],
          imagesByProduct.get(String(product.id)) || []
        ),
      }));
    } catch (_) {
      return items;
    }
  }, []);

  const fetchProducts = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const params = {};
      if (searchTerm) params.name = searchTerm;
      // Apply the category relation locally before slicing pages. This keeps
      // parent-category filters reliable across API Platform query syntaxes.
      const [data, variantsData] = await Promise.all([
        productService.getAllPages(params),
        productVariantService.getAllPages({}, true),
      ]);
      const variantsByProduct = new Map();
      variantsData['hydra:member'].forEach((variant) => {
        const productId = variantProductId(variant);
        if (productId == null) return;
        const key = String(productId);
        variantsByProduct.set(key, [...(variantsByProduct.get(key) || []), variant]);
      });
      const productsWithVariants = (data['hydra:member'] || []).map((product) => ({
        ...product,
        variants: variantsByProduct.get(String(product.id)) || [],
      }));
      const allowedCategoryIds = new Set(selectedFilterCategoryIds.map(String));
      const matchingProducts = productsWithVariants.filter((product) => {
        const category = product.category;
        const productCategoryId = typeof category === 'object'
          ? entityId(category)
          : iriToId(category);
        const matchesCategory = allowedCategoryIds.size === 0 || allowedCategoryIds.has(String(productCategoryId));
        const matchesSearch = !searchTerm || String(product.name || '').toLowerCase().includes(searchTerm.toLowerCase());
        const stocks = product.variants.length > 0
          ? product.variants.map((variant) => Number(variant.stock || 0))
          : [Number(product.stock || 0)];
        const matchesStock = !stockFilter
          || (stockFilter === 'out' ? stocks.every((stock) => stock <= 0) : stocks.some((stock) => stock > 0));
        return matchesCategory && matchesSearch && matchesStock;
      });
      const pageProducts = matchingProducts.slice((page - 1) * 20, page * 20);
      setProducts(await hydrateProductsImages(pageProducts));
      setTotal(matchingProducts.length);
    } catch (e) { setError(e.message); }
    if (!silent) setLoading(false);
  }, [page, searchTerm, selectedFilterCategoryIds, stockFilter, hydrateProductsImages]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedParentCategoryId, selectedSubCategoryId]);

  const closeProductModal = () => {
    setModal(null);
    setIsProductCreationFlow(false);
    setProductCreationStep(1);
  };
  const openAdd = () => { setError(''); setNotice(''); setFlavorError(''); setNewFlavorName(''); setFlavorSearch(''); setForm(EMPTY_FORM); setIsProductCreationFlow(true); setProductCreationStep(1); setEditingProductHasVariants(false); setVariantsLoading(false); setVariantsLoadFailed(false); setSelectedFormParentCategoryId(''); setImageFiles([]); setImagePreviews([]); setPrimaryImageIndex(0); setProductImages([]); setProductVariants([]); setVariantImageFiles({}); setVariantDraft(EMPTY_VARIANT_DRAFT); setVariantError(''); setVariantNotice(''); setBrandSearch(''); setModal({ mode: 'add' }); };
  const openEdit = async (p) => {
    setError('');
    setNotice('');
    setFlavorError('');
    setNewFlavorName('');
    setFlavorSearch('');
    setIsProductCreationFlow(false);
    setProductCreationStep(1);
    setImageFiles([]);
    setImagePreviews([]);
    setProductVariants([]);
    setVariantImageFiles({});
    setVariantDraft(EMPTY_VARIANT_DRAFT);
    setVariantError('');
    setVariantNotice('');
    setEditingProductHasVariants((p.variants || []).length > 0);
    setVariantsLoading(true);
    setVariantsLoadFailed(false);
    setPrimaryImageIndex(0);
    setBrandSearch(displayBrandName(p.brand));
    setModal({ mode: 'edit', id: p.id });
    setSelectedFormParentCategoryId(getFormParentCategoryId(p.category));
    setForm({
      name: p.name || '', barcode: p.barcode || '',
      shortDescription: p.shortDescription || '', description: p.description || '',
      price: p.price || '', salePrice: p.salePrice || '', stock: p.stock || '',
      minimumStock: p.minimumStock || '3', weight: p.weight != null ? String(p.weight) : '',
      dateProduit: dateInputValue(p.dateProduit),
      isActive: p.isActive ?? true, isFeatured: p.isFeatured ?? false,
      isNew: isTruthyFlag(p.isNew, p.is_new, p.new), isBestSeller: isTruthyFlag(p.isBestSeller, p.is_best_seller, p.bestSeller, p.best_seller), isOnSale: p.isOnSale ?? false,
      packing: p.packing ?? false, montantRemise: p.montantRemise ?? p.montant_remise ?? '',
      category: relationToIri(p.category, 'categories'),
      brand: relationToIri(p.brand, 'brands'),
      goals: (p.goals || []).map((g) => relationToIri(g, 'goals')).filter(Boolean),
      flavors: (p.flavors || []).map((f) => relationToIri(f, 'flavors')).filter(Boolean),
      hasFlavors: isTruthyFlag(p.hasFlavors, p.has_flavors) || (!Object.prototype.hasOwnProperty.call(p, 'hasFlavors') && !Object.prototype.hasOwnProperty.call(p, 'has_flavors') && (p.flavors || []).length > 0),
      productOptions: normalizeProductOptions(p.productOptions || p.options),
      metaTitle: p.metaTitle || '', metaDescription: p.metaDescription || '',
    });

    try {
      const fullProduct = await productService.getOne(p.id, true, true).catch(() => p);
      setForm({
        name: fullProduct.name || '', barcode: fullProduct.barcode || '',
        shortDescription: fullProduct.shortDescription || '', description: fullProduct.description || '',
        price: fullProduct.price || '', salePrice: fullProduct.salePrice || '', stock: fullProduct.stock || '',
      minimumStock: fullProduct.minimumStock || '3', weight: fullProduct.weight != null ? String(fullProduct.weight) : '',
        dateProduit: dateInputValue(fullProduct.dateProduit),
        isActive: fullProduct.isActive ?? true, isFeatured: fullProduct.isFeatured ?? false,
        isNew: isTruthyFlag(fullProduct.isNew, fullProduct.is_new, fullProduct.new), isBestSeller: isTruthyFlag(fullProduct.isBestSeller, fullProduct.is_best_seller, fullProduct.bestSeller, fullProduct.best_seller), isOnSale: fullProduct.isOnSale ?? false,
        packing: fullProduct.packing ?? false, montantRemise: fullProduct.montantRemise ?? fullProduct.montant_remise ?? '',
        category: relationToIri(fullProduct.category, 'categories'),
        brand: relationToIri(fullProduct.brand, 'brands'),
        goals: (fullProduct.goals || []).map((g) => relationToIri(g, 'goals')).filter(Boolean),
        flavors: (fullProduct.flavors || []).map((f) => relationToIri(f, 'flavors')).filter(Boolean),
        hasFlavors: isTruthyFlag(fullProduct.hasFlavors, fullProduct.has_flavors) || (!Object.prototype.hasOwnProperty.call(fullProduct, 'hasFlavors') && !Object.prototype.hasOwnProperty.call(fullProduct, 'has_flavors') && (fullProduct.flavors || []).length > 0),
        productOptions: normalizeProductOptions(fullProduct.productOptions || fullProduct.options),
        metaTitle: fullProduct.metaTitle || '', metaDescription: fullProduct.metaDescription || '',
      });
      setSelectedFormParentCategoryId(getFormParentCategoryId(fullProduct.category));
      const [hydratedImages, variantsResponse] = await Promise.all([
        hydrateProductImages(fullProduct.id || p.id, fullProduct.productImages || p.productImages || []),
        productVariantService.getAll({ 'product.id': fullProduct.id || p.id }, true, true),
      ]);
      const variants = variantsResponse['hydra:member'];
      setProductImages(hydratedImages);
      setProductVariants(variants);
      setEditingProductHasVariants(variants.length > 0);
      setForm((current) => ({
        ...current,
        hasContenance: variants.some((variant) => {
          const options = variant?.options && typeof variant.options === 'object' ? variant.options : {};
          return [options.capacity, options.capacityLiters, options.capacity_liters, options.liters, options.volume, variant?.capacity]
            .some((value) => value != null && String(value).trim() !== '');
        }),
      }));
      setVariantsLoading(false);
      const fullBrand = fullProduct.brand || p.brand;
      const matchedBrand = brands.find((brand) => relationToIri(brand, 'brands') === relationToIri(fullBrand, 'brands'));
      setBrandSearch(displayBrandName(matchedBrand || fullBrand));
    } catch (e) {
      setVariantsLoading(false);
      setVariantsLoadFailed(true);
      setError(e.message);
    }
  };

  const productOnlyImages = productImages.filter((image) => getProductImageFlavorId(image) == null && getProductImageVariantId(image) == null);
  const imagesForVariant = (variant) => {
    const variantId = variant?.id ?? iriToId(variant?.['@id']);
    return productImages.filter((image) => String(getProductImageVariantId(image)) === String(variantId));
  };
  const legacyImagesForFlavor = (flavorIri) => {
    const flavorId = iriToId(flavorIri) ?? flavorIri;
    return productImages.filter((image) => (
      String(getProductImageFlavorId(image)) === String(flavorId)
      && getProductImageVariantId(image) == null
    ));
  };
  const productVariantLabel = (variant) => {
    const flavorId = relationId(variant?.flavor);
    const flavor = flavors.find((item) => String(entityId(item)) === String(flavorId));
    return variantLabel(flavor ? { ...variant, flavor } : variant);
  };
  const syncVariantValues = async (variants, price, salePrice, weight, preserveVariantSize = false) => {
    const size = weight === '' || weight == null ? null : `${Number(weight)} kg`;
    for (const variant of variants) {
      const variantId = variant.id ?? iriToId(variant['@id']);
      if (variantId == null) throw new Error(`Impossible de synchroniser la variante ${productVariantLabel(variant)} : identifiant manquant.`);
      const options = { ...(variant.options || {}) };
      if (!preserveVariantSize) {
        if (size) options.size = size;
        else delete options.size;
      }
      try {
        await productVariantService.update(variantId, { price, salePrice, options });
      } catch (syncError) {
        throw new Error(`La variante ${productVariantLabel(variant)} n’a pas pu être synchronisée : ${syncError.message}`);
      }
    }
  };
  const draftVariantFlavor = flavors.find((item) => relationToIri(item, 'flavors') === variantDraft.flavor);
  const draftVariantOptions = selectedAccessoryContext.isAccessory ? {
    accessoryType: selectedAccessoryContext.type || 'accessory',
    ...(variantDraft.design.trim() ? { design: variantDraft.design.trim() } : {}),
    ...(variantDraft.color.trim() ? { color: variantDraft.color.trim() } : {}),
    ...(variantDraft.size.trim() ? { size: variantDraft.size.trim() } : {}),
    ...(variantDraft.capacityLiters.trim() ? { capacityLiters: variantDraft.capacityLiters.trim() } : {}),
  } : {
    ...(variantDraft.capacity.trim() ? { capacity: variantDraft.capacity.trim() } : {}),
  };
  const draftAccessoryHasOptions = Object.keys(draftVariantOptions).some((key) => key !== 'accessoryType');
  const draftVariantSize = selectedAccessoryContext.isAccessory
    ? variantDraft.size.trim()
    : form.weight === '' ? '' : `${Number(form.weight)} kg`;
  const draftVariantDescriptor = selectedAccessoryContext.isAccessory
    ? [variantDraft.design, variantDraft.color, variantDraft.capacityLiters && `${variantDraft.capacityLiters} L`].filter(Boolean).join(' ')
    : [displayName(draftVariantFlavor), variantDraft.capacity.trim()].filter(Boolean).join(' ');
  const draftVariantSku = modal?.id
    && (!form.hasFlavors || variantDraft.flavor)
    && (!selectedAccessoryContext.isAccessory || draftAccessoryHasOptions)
    && (!form.hasContenance || selectedAccessoryContext.isAccessory || variantDraft.capacity.trim())
    ? generateVariantSku(
      modal.id,
      form.name,
      draftVariantDescriptor,
      draftVariantSize,
      productVariants.map(variantSku)
    )
    : '';
  const setHasFlavors = (nextValue) => {
    if (!nextValue && form.hasFlavors) {
      const hasFlavorData = form.flavors.length > 0 || productImages.some((image) => getProductImageFlavorId(image) != null);
      if (hasFlavorData && !window.confirm('Passer à « Non » retirera les saveurs associées à ce produit lors de l’enregistrement. Les fichiers déjà téléversés ne seront pas supprimés. Continuer ?')) return;
    }
    setForm((current) => ({ ...current, hasFlavors: nextValue, ...(nextValue ? {} : { flavors: [] }) }));
  };
  const addProductImages = (nextFiles) => {
    const validationError = validateImageFiles(nextFiles);
    if (validationError) return setError(validationError);
    setImageFiles((currentFiles) => {
      const knownFiles = new Set(currentFiles.map(fileKey));
      const filesToAdd = nextFiles.filter((file) => !knownFiles.has(fileKey(file)));
      if (currentFiles.length === 0 && filesToAdd.length > 0) setPrimaryImageIndex(0);
      return [...currentFiles, ...filesToAdd];
    });
  };
  const removeProductImageFile = (indexToRemove) => {
    const nextFiles = imageFiles.filter((_, index) => index !== indexToRemove);
    setImageFiles(nextFiles);
    setPrimaryImageIndex((currentPrimaryIndex) => {
      if (nextFiles.length === 0) return 0;
      if (currentPrimaryIndex === indexToRemove) return Math.min(indexToRemove, nextFiles.length - 1);
      return currentPrimaryIndex > indexToRemove ? currentPrimaryIndex - 1 : currentPrimaryIndex;
    });
  };
  const handleSave = async (e) => {
    e.preventDefault();
    if (saving) return;
    const creatingProduct = modal.mode === 'add';
    if (variantsLoading || variantsLoadFailed) {
      setError(variantsLoadFailed
        ? 'Impossible de vérifier les variantes. Fermez puis rouvrez le produit avant de modifier le prix ou le stock.'
        : 'Patientez pendant le chargement des variantes.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      if (form.hasFlavors && form.flavors.length === 0) throw new Error('Sélectionnez au moins une saveur ou choisissez « Non ».');
      const parentPrice = Number(form.price);
      const parentSalePrice = form.salePrice === '' ? null : Number(form.salePrice);
      if (!Number.isFinite(parentPrice) || parentPrice <= 0) {
        throw new Error('Saisissez un prix produit valide.');
      }
      if (parentSalePrice !== null
        && (!Number.isFinite(parentSalePrice) || parentSalePrice < 0 || parentSalePrice >= parentPrice)) {
        throw new Error('Le prix promo doit être inférieur au prix produit.');
      }
      if (form.weight !== '' && (!Number.isFinite(Number(form.weight)) || Number(form.weight) < 0)) {
        throw new Error('Saisissez un poids produit valide.');
      }
      const payload = {
        ...form,
        barcode: String(form.barcode || '').trim() || (creatingProduct ? undefined : null),
        // The API serializes these fields as `new` and `bestSeller`, while
        // writes use the entity property names mapped to the database columns.
        new: undefined,
        isNew: form.isNew,
        bestSeller: undefined,
        isBestSeller: form.isBestSeller,
        sku: undefined,
        expirationDate: undefined,
        price: parentPrice.toFixed(2),
        salePrice: parentSalePrice === null || parentSalePrice === 0 ? null : parentSalePrice.toFixed(2),
        stock: creatingProduct && (form.hasFlavors || form.hasContenance || selectedAccessoryContext.isAccessory)
          ? 0
          : editingProductHasVariants
            || form.hasFlavors
            || form.hasContenance
            || (selectedAccessoryContext.isAccessory && productVariants.length > 0)
            ? undefined
            : form.stock !== ''
              ? parseInt(form.stock)
              : undefined,
        minimumStock: form.minimumStock !== '' ? parseInt(form.minimumStock) : undefined,
        weight: form.weight === '' ? null : String(form.weight).trim(),
        dateProduit: form.dateProduit ? `${form.dateProduit}T00:00:00+00:00` : null,
        montantRemise: String(
          Number(form.packing && form.montantRemise !== '' ? form.montantRemise : 0).toFixed(2)
        ),
        category: form.category || undefined,
        brand: form.brand || undefined,
        hasFlavors: form.hasFlavors,
        flavors: form.hasFlavors ? form.flavors : [],
        productOptions: undefined,
        hasContenance: undefined,
      };

      const saved = modal.mode === 'add'
        ? await productService.create(payload)
        : await productService.update(modal.id, payload);

      // API Platform may return the identifier only through the resource IRI.
      // Never upload images without the id of the product just saved.
      const savedId = saved?.id ?? iriToId(saved?.['@id']) ?? modal.id;
      if (!savedId) {
        throw new Error("Le serveur n’a pas renvoyé l’identifiant du produit. Vérifiez la liste des produits avant de réessayer.");
      }
      if (modal.mode === 'add') setModal({ mode: 'edit', id: savedId });
      if (editingProductHasVariants) {
        try {
          await syncVariantValues(
            productVariants,
            parentPrice.toFixed(2),
            parentSalePrice === null || parentSalePrice === 0 ? null : parentSalePrice.toFixed(2),
            form.weight,
            selectedAccessoryContext.isAccessory
          );
        } catch (syncError) {
          throw new Error(`Le produit est enregistré, mais ${syncError.message}`);
        }
      }
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
      setImageFiles([]);
      setImagePreviews([]);
      setPrimaryImageIndex(0);
      setProductImages([]);
      const savedProduct = {
        ...(products.find((product) => String(product.id) === String(savedId)) || {}),
        ...(saved && typeof saved === 'object' ? saved : {}),
        ...form,
        id: savedId,
        isNew: form.isNew,
        isBestSeller: form.isBestSeller,
        isFeatured: form.isFeatured,
        isOnSale: form.isOnSale,
        variants: products.find((product) => String(product.id) === String(savedId))?.variants || [],
        productImages: saved?.productImages || [],
      };
      setProducts((current) => {
        const exists = current.some((product) => String(product.id) === String(savedId));
        if (exists) return current.map((product) => String(product.id) === String(savedId) ? savedProduct : product);
        return page === 1 ? [savedProduct, ...current].slice(0, 20) : current;
      });
      setTotal((current) => products.some((product) => String(product.id) === String(savedId)) ? current : current + 1);
      setNotice(creatingProduct ? 'Produit créé avec succès.' : 'Modifications enregistrées avec succès.');
      setVariantNotice(
        creatingProduct
          ? 'Produit créé. Ajoutez maintenant les variantes et leur stock.'
          : 'Modifications enregistrées. Vous pouvez continuer à gérer les variantes, leurs images et leur stock ici.'
      );
      if (isProductCreationFlow) {
        if (form.hasFlavors || form.hasContenance || selectedAccessoryContext.isAccessory) {
          setProductCreationStep(2);
          setVariantError('');
        } else {
          closeProductModal();
        }
      }
      void fetchProducts({ silent: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue pendant l’enregistrement.');
    } finally {
      setSaving(false);
    }
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

  const handleDeleteImage = async (image) => {
    const imageRecord = image && typeof image === 'object'
      ? image
      : productImages.find((item) => String(getProductImageId(item)) === String(image));
    const imageId = imageRecord ? getProductImageId(imageRecord) : image;
    if (!imageId) return;
    if (!confirm('Supprimer cette image ?')) return;
    try {
      const replacementImage = isPrimaryProductImage(imageRecord)
        ? productOnlyImages.find((item) => String(getProductImageId(item)) !== String(imageId))
        : null;
      const replacementImageId = getProductImageId(replacementImage);
      if (replacementImageId != null) {
        await productService.setImagePrimary(replacementImageId);
      }
      await productService.deleteImage(imageRecord?.['@id'] || imageRecord?.iri || imageId);
      const deletedImageKey = getProductImageKey(
        productImages.find((image) => String(getProductImageId(image)) === String(imageId))
      );
      const isDeletedImage = (image) => (
        String(getProductImageId(image)) === String(imageId)
        || Boolean(deletedImageKey && getProductImageKey(image) === deletedImageKey)
      );
      const updateImageList = (images = []) => images
        .filter((image) => !isDeletedImage(image))
        .map((image) => {
          if (replacementImageId == null
            || !image
            || typeof image !== 'object'
            || getProductImageFlavorId(image) != null
            || getProductImageVariantId(image) != null) return image;
          return withPrimaryImageState(
            image,
            String(getProductImageId(image)) === String(replacementImageId)
          );
        });
      setProductImages(updateImageList);
      if (modal?.id) {
        setProducts((current) => current.map((product) => {
          if (String(product.id) !== String(modal.id)) return product;
          const directImage = product.image ?? product.imagePath ?? product.mainImage
            ?? product.mainImageUrl ?? product.main_image_url ?? product.mainImagePath
            ?? product.thumbnail ?? product.thumbnailPath;
          const directImageKey = getProductImageKey({ image: directImage });
          const deletedDirectImage = deletedImageKey && directImageKey === deletedImageKey;
          return {
            ...product,
            productImages: updateImageList(product.productImages || []),
            ...(Array.isArray(product.images) ? { images: updateImageList(product.images) } : {}),
            ...(Array.isArray(product.media) ? { media: updateImageList(product.media) } : {}),
            ...(deletedDirectImage ? {
              image: null,
              imagePath: null,
              mainImage: null,
              mainImageUrl: null,
              main_image_url: null,
              mainImagePath: null,
              thumbnail: null,
              thumbnailPath: null,
            } : {}),
          };
        }));
      }
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de supprimer cette image.");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce produit ?')) return;
    setError('');
    setNotice('');
    try {
      await productService.delete(id);
      setNotice('Produit supprimé avec succès.');
      await fetchProducts({ silent: true });
    } catch (e) {
      alert(e.message);
    }
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

  const openStockManager = async (product) => {
    setStockError('');
    setStockForm({ operation: 'add', quantity: 1, reason: '', variantId: '' });
    setStockModal({ id: product.id, name: product.name, loadingVariants: true });
    try {
      const response = await productVariantService.getAll(
        { 'product.id': product.id },
        true,
        true
      );
      const variants = response['hydra:member'];
      if (variants.length > 0) {
        const selected = variants[0];
        setStockModal({ id: product.id, name: product.name, variants });
        setStockForm({
          operation: 'adjust',
          quantity: Number(selected.stock ?? 0),
          reason: '',
          variantId: String(selected.id ?? iriToId(selected['@id']) ?? ''),
        });
        return;
      }
      setStockModal({ id: product.id, name: product.name, variants: [] });
    } catch (e) {
      setStockError(e.message || 'Impossible de vérifier les variantes du produit.');
      setStockModal({ id: product.id, name: product.name, loadingVariants: false, variantLoadFailed: true });
    }
  };

  const handleStockSave = async () => {
    const quantity = Number(stockForm.quantity);
    if (stockSaving) return;
    if (stockModal?.loadingVariants) return;
    if (stockModal?.variantLoadFailed) {
      setStockError('Le stock ne peut pas être modifié tant que les variantes ne sont pas chargées.');
      return;
    }
    if (stockModal?.variants?.length > 0) {
      const variant = stockModal.variants.find((item) => String(item.id ?? iriToId(item['@id'])) === stockForm.variantId);
      if (!variant) {
        setStockError('Sélectionnez une variante valide.');
        return;
      }
      if (!Number.isInteger(quantity) || (stockForm.operation === 'adjust' ? quantity < 0 : quantity < 1)) {
        setStockError(stockForm.operation === 'adjust'
          ? 'Saisissez un stock entier positif ou nul.'
          : 'Saisissez une quantité entière supérieure à zéro.');
        return;
      }
      if (stockForm.operation !== 'add' && !stockForm.reason.trim()) {
        setStockError('Le motif est obligatoire pour cette opération.');
        return;
      }
      setStockSaving(true);
      setStockError('');
      try {
        await productVariantService.adjustStock(
          variant.id ?? iriToId(variant['@id']),
          stockForm.operation,
          quantity,
          stockForm.reason
        );
      } catch (e) {
        setStockError(e.message || 'Échec de la mise à jour du stock de la variante.');
        return;
      } finally {
        setStockSaving(false);
      }

      setStockModal(null);
      void fetchProducts();
      try {
        const updatedVariants = await productVariantService.getAll(
          { 'product.id': stockModal.id },
          true,
          true
        );
        setProductVariants(updatedVariants['hydra:member']);
      } catch (e) {
        setError(`Stock enregistré, mais impossible d’actualiser les variantes : ${e.message}`);
      }
      return;
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      setStockError('Saisissez une quantité entière supérieure à zéro.');
      return;
    }
    if (stockForm.operation !== 'add' && !stockForm.reason.trim()) {
      setStockError('Le motif est obligatoire pour cette opération.');
      return;
    }
    setStockSaving(true);
    setStockError('');
    try {
      await productService.adjustStock(stockModal.id, stockForm.operation, quantity, stockForm.reason);
      setStockModal(null);
      await fetchProducts();
    } catch (e) { setStockError(e.message || 'Échec de la mise à jour du stock.'); }
    finally { setStockSaving(false); }
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
    setSelectedDetailImage(0);
    setDetailsModal({ product, images: [], loading: true, error: '' });
    try {
      const fullProduct = await productService.getOne(product.id).catch(() => product);
      const [images, variantsResponse] = await Promise.all([
        hydrateProductImages(fullProduct.id || product.id, fullProduct.productImages || product.productImages || []),
        productVariantService.getAll({ 'product.id': product.id }, true, true),
      ]);
      const primaryIndex = images.findIndex(isPrimaryProductImage);
      setSelectedDetailImage(primaryIndex >= 0 ? primaryIndex : 0);
      setDetailsModal({
        product: { ...fullProduct, variants: variantsResponse['hydra:member'] },
        images,
        loading: false,
        error: '',
      });
    } catch (e) {
      setDetailsModal({ product, images: [], loading: false, error: e.message || 'Impossible de charger les détails.' });
    }
  };

  const createVariant = async () => {
    if (variantSaving || !modal?.id) return;
    const size = draftVariantSize;
    const sku = draftVariantSku;
    const price = Number(form.price);
    const salePrice = form.salePrice === '' ? null : Number(form.salePrice);
    const stock = Number(variantDraft.stock);
    if (!Number.isFinite(price) || price <= 0
      || (salePrice !== null && (!Number.isFinite(salePrice) || salePrice < 0 || salePrice >= price))) {
      setVariantError('Enregistrez d’abord un prix produit valide dans la partie supérieure.');
      return;
    }
    if (!Number.isInteger(stock) || stock < 0) {
      setVariantError('Le stock doit être un nombre entier positif ou nul.');
      return;
    }
    if (selectedAccessoryContext.isAccessory && !draftAccessoryHasOptions) {
      setVariantError('Renseignez au moins une option : design, couleur, taille ou contenance.');
      return;
    }
    if (variantDraft.capacityLiters.trim()
      && (!Number.isFinite(Number(variantDraft.capacityLiters)) || Number(variantDraft.capacityLiters) <= 0)) {
      setVariantError('La contenance doit être un nombre supérieur à zéro.');
      return;
    }
    if (form.hasContenance && !variantDraft.capacity.trim() && !selectedAccessoryContext.isAccessory) {
      setVariantError('Renseignez la contenance de cette variante.');
      return;
    }
    if (form.hasFlavors && !selectedAccessoryContext.isAccessory && !variantDraft.flavor) {
      setVariantError('Sélectionnez la saveur de cette variante.');
      return;
    }
    const normalizeOption = (value, key) => {
      const normalized = String(value ?? '').trim().toLowerCase();
      if (key === 'capacityLiters' && normalized && Number.isFinite(Number(normalized))) {
        return String(Number(normalized));
      }
      return normalized;
    };
    const optionKeys = selectedAccessoryContext.isAccessory
      ? ['design', 'color', 'size', 'capacityLiters']
      : ['capacity'];
    const duplicateVariant = productVariants.some((variant) => {
      if (selectedAccessoryContext.isAccessory) {
        return optionKeys.every((key) => (
          normalizeOption(variant.options?.[key] ?? variant[key], key) === normalizeOption(draftVariantOptions[key], key)
        ));
      }
      const flavorId = relationId(variantDraft.flavor);
      return String(relationId(variant.flavor)) === String(flavorId)
        && normalizeOption(variant.options?.size ?? variant.size, 'size') === normalizeOption(size, 'size')
        && normalizeOption(variant.options?.capacity ?? variant.options?.capacityLiters ?? variant.options?.capacity_liters, 'capacity')
          === normalizeOption(draftVariantOptions.capacity, 'capacity');
    });
    if (duplicateVariant) {
      setVariantError('Cette variante existe déjà. Utilisez son action « Ajuster le stock ».');
      return;
    }

    setVariantSaving(true);
    setVariantError('');
    setVariantNotice('');
    try {
      await productService.update(modal.id, {
        price: price.toFixed(2),
        salePrice: salePrice === null || salePrice === 0 ? null : salePrice.toFixed(2),
        weight: form.weight === '' ? null : String(form.weight).trim(),
        stock: selectedAccessoryContext.isAccessory ? 0 : undefined,
        hasFlavors: form.hasFlavors,
        flavors: form.hasFlavors ? form.flavors : [],
      });
      await syncVariantValues(
        productVariants,
        price.toFixed(2),
        salePrice === null || salePrice === 0 ? null : salePrice.toFixed(2),
        form.weight,
        selectedAccessoryContext.isAccessory
      );
      const created = await productVariantService.create({
        product: `/api/products/${modal.id}`,
        flavor: variantDraft.flavor || null,
        sku,
        barcode: null,
        price: price.toFixed(2),
        salePrice: salePrice === null || salePrice === 0 ? null : salePrice.toFixed(2),
        stock,
        options: selectedAccessoryContext.isAccessory
          ? draftVariantOptions
          : { ...(size ? { size } : {}), ...draftVariantOptions },
        isActive: form.isActive,
      });
      let variants = productVariants;
      if (created?.id != null || created?.['@id']) {
        variants = [...productVariants, {
          ...created,
          id: created.id ?? iriToId(created['@id']),
          product: `/api/products/${modal.id}`,
          flavor: variantDraft.flavor || null,
          sku,
          barcode: null,
          price: price.toFixed(2),
          salePrice: salePrice === null || salePrice === 0 ? null : salePrice.toFixed(2),
          stock,
          options: selectedAccessoryContext.isAccessory
            ? draftVariantOptions
            : { ...(size ? { size } : {}), ...draftVariantOptions },
          isActive: form.isActive,
        }];
      } else {
        const response = await productVariantService.getAll(
          { 'product.id': modal.id },
          true,
          true
        );
        variants = response['hydra:member'];
      }
      setProductVariants(variants);
      setEditingProductHasVariants(variants.length > 0);
      setVariantDraft(EMPTY_VARIANT_DRAFT);
      setVariantNotice(selectedAccessoryContext.isAccessory
        ? `Variante créée avec le SKU ${sku}. Son stock est indépendant.`
        : `Variante créée avec le SKU ${sku}. Le prix et le poids proviennent du produit ; son stock reste indépendant.`);
      await fetchProducts({ silent: true });
    } catch (e) {
      setVariantError(e.message || 'Impossible de créer cette variante.');
    } finally {
      setVariantSaving(false);
    }
  };

  const uploadVariantImages = async (variant) => {
    const variantId = variant?.id ?? iriToId(variant?.['@id']);
    const files = variantImageFiles[String(variantId)] || [];
    if (!variantId || files.length === 0) return;
    const validationError = validateImageFiles(files);
    if (validationError) {
      setVariantError(validationError);
      return;
    }

    setVariantSaving(true);
    setVariantError('');
    setVariantNotice('');
    let uploadedCount = 0;
    try {
      const currentImages = imagesForVariant(variant);
      for (let index = 0; index < files.length; index += 1) {
        await productService.uploadImage(modal.id, files[index], currentImages.length + index, false, variantId);
        uploadedCount += 1;
      }
      setVariantImageFiles((current) => ({ ...current, [String(variantId)]: [] }));
      setVariantNotice(`Images ajoutées à la variante ${productVariantLabel(variant)}.`);
      try {
        const imageData = await productService.getImages({ 'variant.id': variantId, itemsPerPage: 100 }, true);
        setProductImages((current) => mergeProductImages(current, collectionItems(imageData)));
      } catch (e) {
        setVariantError(`Images téléversées, mais galerie non actualisée : ${e.message}`);
      }
    } catch (e) {
      let refreshError = '';
      if (uploadedCount > 0) {
        setVariantImageFiles((current) => ({
          ...current,
          [String(variantId)]: (current[String(variantId)] || []).slice(uploadedCount),
        }));
        try {
          const imageData = await productService.getImages({ 'variant.id': variantId, itemsPerPage: 100 }, true);
          setProductImages((current) => mergeProductImages(current, collectionItems(imageData)));
        } catch (galleryError) {
          refreshError = ` La galerie n’a pas pu être actualisée : ${galleryError.message}`;
        }
      }
      setVariantError(`${e.message || "Impossible d'ajouter les images à cette variante."}${refreshError}`);
    } finally {
      setVariantSaving(false);
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
  const isCreationVariantStep = isProductCreationFlow && productCreationStep === 2;

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

      {notice && <div role="status" aria-live="polite" className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{notice}</div>}

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
            value={stockFilter}
            onChange={(e) => { setStockFilter(e.target.value); setPage(1); }}
            aria-label="Filtrer par disponibilité"
            className="min-w-40 bg-[#222] border border-[#333] text-sm text-white rounded-lg px-3 py-2 focus:outline-none focus:border-[#d90429]"
          >
            <option value="">Tous les stocks</option>
            <option value="in">En stock</option>
            <option value="out">Rupture de stock</option>
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
                      <div className="h-20 w-20 rounded-xl bg-[#111] border border-[#333] p-1.5 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                        {(() => {
                          const primarySrc = resolveProductImage(p, null);
                          return primarySrc
                            ? <img src={primarySrc} alt={`Image principale de ${p.name}`} className="w-full h-full object-contain" />
                            : <Package size={18} className="text-gray-500" />;
                        })()}
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm">{p.name}</div>
                        <div className="text-xs text-gray-500">{p.category?.name || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-xs font-mono text-gray-400">
                    {p.variants.length > 0
                      ? <div className="space-y-1">{p.variants.map((variant, index) => <div key={variant.id ?? index}>{variantSku(variant) || 'SKU manquant'}</div>)}</div>
                      : p.sku || '—'}
                  </td>
                  <td className="px-5 py-4 font-bold text-white">
                    {p.variants.length > 0
                      ? <div className="space-y-1 text-xs">{p.variants.map((variant, index) => <div key={variant.id ?? index}>{productVariantLabel(variant)} · {variantPrice(variant).toFixed(2)} TND</div>)}</div>
                      : `${parseFloat(p.price || 0).toFixed(2)} TND`}
                  </td>
                  <td className="px-5 py-4">
                    {p.variants.length > 0
                      ? <div className="space-y-1 text-xs">{p.variants.map((variant, index) => {
                        const stock = Number(variant.stock || 0);
                        return <div key={variant.id ?? index} className={stock > 0 ? 'text-gray-300' : 'text-red-400'}>
                          {productVariantLabel(variant)} · {stock} en stock
                        </div>;
                      })}</div>
                      : <>
                        <span className={`text-sm font-bold ${(p.stock || 0) <= 0 ? 'text-red-400' : (p.stock || 0) < (p.minimumStock || 5) ? 'text-yellow-400' : 'text-gray-300'}`}>
                          {p.stock ?? 0}
                        </span>
                        {Number(p.stock || 0) <= 0 && <span className="ml-2 inline-flex rounded-full bg-[#d90429]/15 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-[#ff526d]">Rupture de stock</span>}
                      </>}
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
                      <AdminActionButton label={p.variants.length > 0 ? 'Stock des variantes' : 'Stock'} onClick={() => { void openStockManager(p); }} className="p-1.5 text-gray-300 hover:text-blue-400 hover:bg-blue-400/10">
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
              <div>
                <h2 className="text-xl font-bold text-white">
                  {isCreationVariantStep ? 'Ajouter les variantes' : isProductCreationFlow ? 'Nouveau Produit' : modal.mode === 'add' ? 'Nouveau Produit' : 'Modifier le Produit'}
                </h2>
                {isProductCreationFlow && (
                  <ol className="mt-3 flex items-center gap-3 text-xs font-bold">
                    <li className={productCreationStep === 1 ? 'text-white' : 'text-emerald-400'}>
                      {productCreationStep === 1 ? '1. Produit' : '✓ Produit'}
                    </li>
                    <li aria-hidden="true" className="text-gray-600">→</li>
                    <li className={productCreationStep === 2 ? 'text-white' : 'text-gray-500'}>2. Variantes et stock</li>
                  </ol>
                )}
              </div>
              <button type="button" onClick={closeProductModal} className="text-gray-400 hover:text-white p-1"><X size={20} /></button>
            </div>
            <form id="product-edit-form" onSubmit={handleSave} className="p-6 overflow-y-auto flex-1 space-y-5">
              {!isCreationVariantStep && <>
              
              <div>
                <label className={labelCls}>Nom *</label>
                <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inputCls} />
              </div>
              <div><label className={labelCls}>Code-barres</label><input value={form.barcode} onChange={e => setForm(p => ({ ...p, barcode: e.target.value }))} className={inputCls} /></div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className={labelCls}>Prix (TND) *</label><input type="number" min="0.01" step="0.01" required disabled={variantsLoading || variantsLoadFailed} value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} className={`${inputCls} disabled:cursor-not-allowed disabled:opacity-50`} /></div>
                <div><label className={labelCls}>Prix promo</label><input type="number" min="0" step="0.01" disabled={variantsLoading || variantsLoadFailed} value={form.salePrice} onChange={e => setForm(p => ({ ...p, salePrice: e.target.value }))} className={`${inputCls} disabled:cursor-not-allowed disabled:opacity-50`} /></div>
                <div><label className={labelCls}>Stock{editingProductHasVariants || form.hasFlavors || form.hasContenance ? ' parent · non utilisé' : ''}</label><input type="number" min="0" disabled={editingProductHasVariants || form.hasFlavors || form.hasContenance || variantsLoading || variantsLoadFailed} value={form.stock} onChange={e => setForm(p => ({ ...p, stock: e.target.value }))} className={`${inputCls} disabled:cursor-not-allowed disabled:opacity-50`} /></div>
              </div>
              {(editingProductHasVariants || form.hasFlavors || form.hasContenance) && <p className="-mt-3 text-xs text-gray-500">Le prix et le poids sont repris du produit pour chaque variante. Le stock, lui, se gère séparément par variante.</p>}
              {variantsLoading && <p role="status" className="-mt-3 text-xs text-gray-500">Chargement des variantes avant l’édition du stock…</p>}
              <div><label className={labelCls}>Poids (kg)</label><input type="number" step="0.01" min="0" value={form.weight} onChange={e => setForm(p => ({ ...p, weight: e.target.value }))} className={inputCls} placeholder="0.00" /></div>
              <div><label className={labelCls}>Date du produit</label><input type="date" value={form.dateProduit} onChange={e => setForm(p => ({ ...p, dateProduit: e.target.value }))} className={inputCls} /></div>
              <fieldset className="rounded-lg border border-[#333] bg-[#111] p-4">
                <legend className={labelCls}>Ce produit a-t-il des saveurs ?</legend>
                <div className="flex gap-5 text-sm text-gray-200"><label className="cursor-pointer"><input type="radio" name="has-flavors" checked={form.hasFlavors} onChange={() => setHasFlavors(true)} className="mr-2 accent-[#d90429]" />Oui</label><label className="cursor-pointer"><input type="radio" name="has-flavors" checked={!form.hasFlavors} onChange={() => setHasFlavors(false)} className="mr-2 accent-[#d90429]" />Non</label></div>
                <p className="mt-2 text-xs text-gray-500">Les saveurs décrivent le catalogue. Créez des variantes pour définir séparément chaque SKU, prix et stock ; aucune variante n’est créée automatiquement.</p>
              </fieldset>
              <fieldset className="rounded-lg border border-[#333] bg-[#111] p-4">
                <legend className={labelCls}>Ce produit a-t-il plusieurs contenances ?</legend>
                <div className="flex gap-5 text-sm text-gray-200">
                  <label className="cursor-pointer"><input type="radio" name="has-contenance" checked={form.hasContenance} onChange={() => setForm((current) => ({ ...current, hasContenance: true }))} className="mr-2 accent-[#d90429]" />Oui</label>
                  <label className="cursor-pointer"><input type="radio" name="has-contenance" checked={!form.hasContenance} onChange={() => setForm((current) => ({ ...current, hasContenance: false }))} className="mr-2 accent-[#d90429]" />Non</label>
                </div>
                <p className="mt-2 text-xs text-gray-500">Chaque contenance est créée comme une variante avec son propre SKU et son stock.</p>
              </fieldset>
              <div>
                <label className={labelCls}>Image produit</label>
                <label className="border-2 border-dashed border-[#333] rounded-lg p-4 text-center hover:bg-[#222] transition-colors cursor-pointer block">
                  <Upload size={18} className="mx-auto text-gray-500 mb-1" />
                  <span className="text-xs text-gray-500">{imageFiles.length > 0 ? `${imageFiles.length} image(s) sélectionnée(s). Cliquez une vignette pour choisir la principale.` : 'Choisir une ou plusieurs images'}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="hidden"
                    onChange={e => {
                      const nextFiles = Array.from(e.target.files || []);
                      if (nextFiles.length > 0) addProductImages(nextFiles);
                      e.target.value = '';
                    }}
                  />
                </label>
                {imagePreviews.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {imagePreviews.map((preview, index) => {
                      const isPrimary = index === primaryImageIndex;
                      return (
                        <div key={`${preview.file.name}-${preview.file.size}-${index}`} className={`relative overflow-hidden rounded-lg border transition-all ${
                          isPrimary ? 'border-[#d90429] ring-2 ring-[#d90429]/40' : 'border-[#333]'
                        }`}>
                          <button
                            type="button"
                            onClick={() => setPrimaryImageIndex(index)}
                            className="block w-full text-left"
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
                          <button
                            type="button"
                            onClick={() => removeProductImageFile(index)}
                            aria-label={`Retirer ${preview.file.name}`}
                            title="Retirer cette image"
                            className="absolute right-2 top-2 rounded bg-black/80 p-1.5 text-white hover:bg-red-700"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              {modal.mode === 'edit' && productOnlyImages.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <label className={labelCls}>Images existantes</label>
                    <span className="text-[11px] text-gray-500">Use the button on any card to switch the main image</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {productOnlyImages.map((img, index) => {
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
                              onClick={() => handleDeleteImage(img)}
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
                {selectedAccessoryContext.isAccessory && (
                  <div className="sm:col-span-2 rounded-xl border border-[#333] bg-[#111] p-4 space-y-4">
                    <div>
                      <p className="text-sm font-bold text-white">Options de l’accessoire</p>
                      <p className="mt-1 text-xs text-gray-500">Ajoutez les choix disponibles, séparés par des virgules.</p>
                    </div>
                    {!selectedAccessoryContext.type && (
                      <div>
                        <label className={labelCls}>Type d’accessoire</label>
                        <select
                          value={form.productOptions.type}
                          onChange={(event) => setForm((current) => ({ ...current, productOptions: { ...current.productOptions, type: event.target.value } }))}
                          className={inputCls}
                        >
                          <option value="">Choisir un type</option>
                          <option value="shoes">Chaussures</option>
                          <option value="clothes">Vêtements</option>
                          <option value="cup">Gourde / shaker / tasse</option>
                        </select>
                      </div>
                    )}
                    {(selectedAccessoryContext.type === 'shoes' || selectedAccessoryContext.type === 'clothes') && (
                      <div>
                        <label className={labelCls}>{selectedAccessoryContext.type === 'shoes' ? 'Pointures' : 'Tailles'}</label>
                        <input
                          value={form.productOptions.sizes.join(', ')}
                          onChange={(event) => setForm((current) => ({ ...current, productOptions: { ...current.productOptions, sizes: splitOptionValues(event.target.value) } }))}
                          className={inputCls}
                          placeholder={selectedAccessoryContext.type === 'shoes' ? '38, 39, 40, 41' : 'S, M, L, XL'}
                        />
                      </div>
                    )}
                    {selectedAccessoryContext.type && (
                      <div>
                        <label className={labelCls}>Couleurs</label>
                        <input
                          value={form.productOptions.colors.join(', ')}
                          onChange={(event) => setForm((current) => ({ ...current, productOptions: { ...current.productOptions, colors: splitOptionValues(event.target.value) } }))}
                          className={inputCls}
                          placeholder="Noir, rouge, bleu"
                        />
                      </div>
                    )}
                    {selectedAccessoryContext.type === 'cup' && (
                      <>
                        <div>
                          <label className={labelCls}>Styles / modèles</label>
                          <input
                            value={form.productOptions.styles.join(', ')}
                            onChange={(event) => setForm((current) => ({ ...current, productOptions: { ...current.productOptions, styles: splitOptionValues(event.target.value) } }))}
                            className={inputCls}
                            placeholder="Avec paille, sport, classique"
                          />
                        </div>
                        <div>
                          <label className={labelCls}>Contenance (litres)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={form.productOptions.capacityLiters}
                            onChange={(event) => setForm((current) => ({ ...current, productOptions: { ...current.productOptions, capacityLiters: event.target.value } }))}
                            className={inputCls}
                            placeholder="1.0"
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}
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
                    {!form.brand && (
                      <button
                        type="button"
                        onClick={() => {
                          setForm((p) => ({ ...p, brand: '' }));
                          setBrandSearch('');
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm border-b border-[#222] bg-[#d90429]/10 text-white"
                      >
                        Aucune marque
                      </button>
                    )}
                    {filteredBrands.map((b, index) => {
                      const iri = relationToIri(b, 'brands');
                      const active = form.brand === iri;
                      const brandIsActive = b.isActive ?? b.active ?? true;
                      return (
                        <button
                          type="button"
                          key={b['@id'] ?? b.id ?? `brand-${index}`}
                          onClick={() => {
                            setForm((p) => ({ ...p, brand: iri }));
                            setBrandSearch(displayBrandName(b));
                          }}
                          className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between gap-3 border-b border-[#222] last:border-b-0 ${
                            active ? 'bg-[#d90429]/10 text-white' : 'text-gray-300 hover:bg-[#1a1a1a] hover:text-white'
                          }`}
                        >
                          <span className="truncate">{displayBrandName(b) || 'Marque sans nom'}</span>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${brandIsActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-500/10 text-gray-400'}`}>
                            {brandIsActive ? 'Active' : 'Inactive'}
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
              {form.hasFlavors && <div>
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
                {form.flavors.some((flavorIri) => legacyImagesForFlavor(flavorIri).length > 0) && (
                  <div className="mt-4 space-y-3 border-t border-[#333] pt-4">
                    <p className="text-xs font-bold uppercase text-gray-400">Images existantes par saveur</p>
                    <p className="text-[11px] text-gray-500">Les images historiques restent affichées ici. Les nouvelles images de variantes doivent être téléversées depuis la galerie SKU ci-dessous.</p>
                    {form.flavors.map((flavorIri) => {
                      const flavor = flavors.find((item) => relationToIri(item, 'flavors') === flavorIri);
                      const legacyImages = legacyImagesForFlavor(flavorIri);
                      if (legacyImages.length === 0) return null;
                      return <div key={flavorIri} className="rounded-lg border border-[#333] bg-[#0b0b0b] p-3">
                        <p className="mb-2 text-xs font-bold text-white">{displayName(flavor) || flavorIri.split('/').pop()}</p>
                        <div className="flex flex-wrap gap-2">
                          {legacyImages.map((image, index) => {
                            const imageId = getProductImageId(image);
                            return <div key={imageId ?? index} className="relative h-16 w-16 overflow-hidden rounded border border-[#333] bg-black/20">
                              {productImageUrl(image)
                                ? <img src={productImageUrl(image)} alt={`Image ${displayName(flavor) || 'de saveur'}`} className="h-full w-full object-cover" />
                                : <div className="flex h-full items-center justify-center text-[10px] text-gray-500">Image</div>}
                              <button type="button" disabled={!imageId} onClick={() => handleDeleteImage(image)} aria-label="Supprimer l’image historique" className="absolute right-0 top-0 rounded-bl bg-black/80 p-1 text-white hover:bg-red-700 disabled:opacity-40"><X size={12} /></button>
                            </div>;
                          })}
                        </div>
                      </div>;
                    })}
                  </div>
                )}
                {flavors.length > 0 && visibleFlavors.length === 0 && <p className="text-xs text-gray-500">Aucune saveur trouvée.</p>}
                {flavors.length === 0 && <p className="text-xs text-gray-500">Aucune saveur. Ajoutez la première ci-dessus.</p>}
              </div>}
              </>}

              {(!isProductCreationFlow || isCreationVariantStep) && <section className="space-y-4 rounded-lg border border-[#333] bg-[#111] p-4">
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {selectedAccessoryContext.isAccessory ? 'Variantes · stock par option' : form.hasContenance ? 'Variantes · saveur et contenance' : 'Variantes · stock par saveur'}
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">
                    {selectedAccessoryContext.isAccessory
                      ? 'Créez un SKU pour chaque combinaison souhaitée. Le prix vient du produit ; le stock est saisi par variante.'
                      : 'Le poids et le prix viennent du produit ci-dessus. Définissez la saveur et, si nécessaire, la contenance de chaque SKU ; le stock est saisi par variante.'}
                  </p>
                </div>
                {modal.mode !== 'edit' ? (
                  <p className="rounded border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200">
                    Enregistrez d’abord le produit, puis rouvrez-le pour ajouter ses variantes. Aucune variante n’est créée automatiquement.
                  </p>
                ) : <>
                  {productVariants.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[700px] text-left text-xs">
                        <thead className="text-[10px] uppercase tracking-wide text-gray-500">
                          <tr><th className="pb-2 pr-3">Variante</th><th className="pb-2 pr-3">SKU / code-barres</th><th className="pb-2 pr-3">Prix normal / promo</th><th className="pb-2 pr-3">Stock</th><th className="pb-2 pr-3">État</th><th className="pb-2">Galerie / stock</th></tr>
                        </thead>
                        <tbody className="divide-y divide-[#29313D]">
                          {productVariants.map((variant, index) => {
                            const variantId = variant.id ?? iriToId(variant['@id']);
                            const images = imagesForVariant(variant);
                            const files = variantImageFiles[String(variantId)] || [];
                            return <tr key={variantId ?? index} className="align-top">
                              <td className="py-3 pr-3 text-gray-200">{productVariantLabel(variant)}</td>
                              <td className="py-3 pr-3">
                                <span className="font-mono text-gray-300">{variantSku(variant) || '—'}</span>
                                {variant.barcode && <span className="mt-1 block text-gray-500">{variant.barcode}</span>}
                              </td>
                              <td className="py-3 pr-3 text-gray-200">
                                {Number(variant.price ?? 0).toFixed(2)} TND
                                {Number(variant.salePrice ?? variant.sale_price) > 0 && Number(variant.salePrice ?? variant.sale_price) < Number(variant.price)
                                  ? <span className="ml-1 text-emerald-400">→ {Number(variant.salePrice ?? variant.sale_price).toFixed(2)}</span>
                                  : null}
                              </td>
                              <td className={`py-3 pr-3 font-bold ${Number(variant.stock || 0) > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {Number(variant.stock || 0)}
                              </td>
                              <td className="py-3 pr-3 text-gray-400">{variant.isActive === false ? 'Inactive' : 'Active'}</td>
                              <td className="py-3">
                                <div className="flex min-w-[210px] flex-col gap-2">
                                  <div className="flex flex-wrap gap-1">
                                    {images.map((image, imageIndex) => {
                                      const imageId = getProductImageId(image);
                                      return <div key={imageId ?? imageIndex} className="relative h-10 w-10 overflow-hidden rounded border border-[#333]">
                                        {productImageUrl(image) && <img src={productImageUrl(image)} alt="" className="h-full w-full object-cover" />}
                                        <button type="button" disabled={!imageId} onClick={() => handleDeleteImage(image)} aria-label="Supprimer l’image de la variante" className="absolute right-0 top-0 rounded-bl bg-black/80 p-0.5 text-white disabled:opacity-40"><X size={11} /></button>
                                      </div>;
                                    })}
                                  </div>
                                  <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    multiple
                                    aria-label={`Choisir des images pour ${productVariantLabel(variant)}`}
                                    onChange={(event) => {
                                      const filesToAdd = Array.from(event.target.files || []);
                                      const validationError = validateImageFiles(filesToAdd);
                                      if (validationError) setVariantError(validationError);
                                      else {
                                        setVariantError('');
                                        setVariantImageFiles((current) => ({ ...current, [String(variantId)]: filesToAdd }));
                                      }
                                      event.target.value = '';
                                    }}
                                    className="max-w-[210px] text-[10px] text-gray-400 file:mr-2 file:rounded file:border-0 file:bg-[#222] file:px-2 file:py-1 file:text-[10px] file:font-bold file:text-gray-200"
                                  />
                                  {files.length > 0 && <button type="button" disabled={variantSaving} onClick={() => { void uploadVariantImages(variant); }} className="rounded bg-[#222] px-2 py-1 text-[10px] font-bold text-white disabled:opacity-50">
                                    Téléverser {files.length} image(s)
                                  </button>}
                                  <button type="button" onClick={() => { void openStockManager({ id: modal.id, name: `${form.name} · ${productVariantLabel(variant)}` }); }} className="w-fit rounded bg-[#222] px-2 py-1 text-[10px] font-bold text-gray-200 hover:text-white">
                                    Ajuster le stock
                                  </button>
                                </div>
                              </td>
                            </tr>;
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : <p className="rounded border border-dashed border-[#444] p-3 text-xs text-gray-500">
                    {selectedAccessoryContext.isAccessory
                      ? 'Aucune variante : ajoutez ici chaque design, taille, couleur ou contenance à suivre en stock.'
                      : 'Aucune variante : le produit utilise encore son stock parent. Créez ici une variante par saveur et/ou contenance ; son prix et son poids seront repris du produit.'}
                  </p>}

                  <div className="grid gap-3 rounded-lg border border-[#333] bg-[#0b0b0b] p-3 sm:grid-cols-2">
                    {selectedAccessoryContext.isAccessory ? <>
                      <div>
                        <label className={labelCls}>Design / modèle</label>
                        {form.productOptions.styles.length > 0
                          ? <select value={variantDraft.design} onChange={(event) => setVariantDraft((current) => ({ ...current, design: event.target.value }))} className={inputCls}>
                            <option value="">Choisir un design (facultatif)</option>
                            {form.productOptions.styles.map((style) => <option key={style} value={style}>{style}</option>)}
                          </select>
                          : <input value={variantDraft.design} onChange={(event) => setVariantDraft((current) => ({ ...current, design: event.target.value }))} className={inputCls} placeholder="Classique, sport..." />}
                      </div>
                      <div>
                        <label className={labelCls}>Couleur</label>
                        {form.productOptions.colors.length > 0
                          ? <select value={variantDraft.color} onChange={(event) => setVariantDraft((current) => ({ ...current, color: event.target.value }))} className={inputCls}>
                            <option value="">Choisir une couleur (facultatif)</option>
                            {form.productOptions.colors.map((color) => <option key={color} value={color}>{color}</option>)}
                          </select>
                          : <input value={variantDraft.color} onChange={(event) => setVariantDraft((current) => ({ ...current, color: event.target.value }))} className={inputCls} placeholder="Noir, rouge..." />}
                      </div>
                      <div>
                        <label className={labelCls}>Taille</label>
                        {form.productOptions.sizes.length > 0
                          ? <select value={variantDraft.size} onChange={(event) => setVariantDraft((current) => ({ ...current, size: event.target.value }))} className={inputCls}>
                            <option value="">Choisir une taille (facultatif)</option>
                            {form.productOptions.sizes.map((optionSize) => <option key={optionSize} value={optionSize}>{optionSize}</option>)}
                          </select>
                          : <input value={variantDraft.size} onChange={(event) => setVariantDraft((current) => ({ ...current, size: event.target.value }))} className={inputCls} placeholder="S, M, L, 39..." />}
                      </div>
                      <div>
                        <label className={labelCls}>Contenance (litres)</label>
                        <input type="number" min="0.1" step="0.1" value={variantDraft.capacityLiters} onChange={(event) => setVariantDraft((current) => ({ ...current, capacityLiters: event.target.value }))} className={inputCls} placeholder="0.5, 1..." />
                      </div>
                    </> : <>
                      <div>
                        <label className={labelCls}>Saveur{form.hasFlavors ? ' *' : ''}</label>
                        <select value={variantDraft.flavor} onChange={(event) => setVariantDraft((current) => ({ ...current, flavor: event.target.value }))} className={inputCls} disabled={!form.hasFlavors}>
                          <option value="">{form.hasFlavors ? 'Choisir une saveur' : 'Sans saveur'}</option>
                          {form.flavors.map((flavorIri) => {
                            const flavor = flavors.find((item) => relationToIri(item, 'flavors') === flavorIri);
                            return <option key={flavorIri} value={flavorIri}>{displayName(flavor) || flavorIri.split('/').pop()}</option>;
                          })}
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Contenance{form.hasContenance ? ' *' : ''}</label>
                        <input value={variantDraft.capacity} onChange={(event) => setVariantDraft((current) => ({ ...current, capacity: event.target.value }))} className={inputCls} placeholder="500 ml, 1 L..." />
                      </div>
                    </>}
                    <div><label className={labelCls}>Stock initial *</label><input type="number" min="0" step="1" value={variantDraft.stock} onChange={(event) => setVariantDraft((current) => ({ ...current, stock: event.target.value }))} className={inputCls} /></div>
                    <div className="sm:col-span-2">
                      <p className="mb-3 text-xs text-gray-500">
                        SKU généré : <code className="font-mono text-gray-300">{draftVariantSku || (selectedAccessoryContext.isAccessory ? 'renseignez au moins une option' : form.hasFlavors && !variantDraft.flavor ? 'choisissez une saveur' : form.hasContenance && !variantDraft.capacity.trim() ? 'renseignez une contenance' : 'complétez les options')}</code>
                        {' · '}{selectedAccessoryContext.isAccessory ? 'Option' : 'Poids'} : {selectedAccessoryContext.isAccessory ? draftVariantDescriptor || variantDraft.size || 'non définie' : draftVariantSize || 'non défini'}
                        {' · '}Prix : {form.price ? `${Number(form.salePrice || form.price).toFixed(2)} TND` : 'non défini'}
                      </p>
                      {variantError && <p role="alert" className="mb-2 text-xs text-red-300">{variantError}</p>}
                      {variantNotice && <p role="status" className="mb-2 text-xs text-emerald-300">{variantNotice}</p>}
                      <button type="button" disabled={variantSaving} onClick={() => { void createVariant(); }} className="inline-flex items-center gap-2 rounded-lg bg-[#d90429] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
                        {variantSaving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Créer la variante
                      </button>
                    </div>
                  </div>
                </>}
              </section>}

              {!isCreationVariantStep && <>
              {/* Booleans */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[['isActive','Actif'],['isFeatured','En Vedette'],['isNew','Nouveau'],['isBestSeller','Best seller'],['isOnSale','En Promo'],['packing','Disponible dans « Composer votre pack »']].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.checked }))} className="accent-[#d90429]" />
                    <span className="text-xs text-gray-300 font-bold">{label}</span>
                  </label>
                ))}
              </div>
              {form.packing && <div className="mt-4 max-w-xs"><label className={labelCls}>Montant de remise pack (DT)</label><input type="number" min="0" step="0.01" value={form.montantRemise} onChange={e => setForm(p => ({ ...p, montantRemise: e.target.value }))} className={inputCls} placeholder="0.00" /><p className="mt-1 text-[11px] text-gray-500">Remise fixe appliquée par le backend lors de la composition d’un pack.</p></div>}
              </>}
            </form>
            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[#2a2a2a] bg-[#1a1a1a] p-5">
              {error && <p role="alert" className="mr-auto w-full text-sm text-red-300 sm:w-auto">{error}</p>}
              <div className="ml-auto flex items-center gap-3">
                {isCreationVariantStep ? (
                  <>
                    <button type="button" disabled={variantSaving} onClick={() => { setError(''); setProductCreationStep(1); }} className="inline-flex h-11 items-center justify-center whitespace-nowrap px-5 text-sm font-bold text-gray-300 hover:text-white disabled:opacity-50">Retour</button>
                    <button type="button" disabled={variantSaving} onClick={closeProductModal} className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-lg bg-[#d90429] px-6 text-sm font-bold text-white hover:bg-[#ff1a3c] disabled:opacity-60">Terminer</button>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={closeProductModal} className="inline-flex h-11 items-center justify-center whitespace-nowrap px-5 text-sm font-bold text-gray-300 hover:text-white">{modal.mode === 'edit' ? 'Fermer' : 'Annuler'}</button>
                    <button type="submit" form="product-edit-form" disabled={saving || variantsLoading || variantsLoadFailed} className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[#d90429] px-6 text-sm font-bold text-white hover:bg-[#ff1a3c] disabled:opacity-60">
                      {saving ? <><Loader2 size={14} className="animate-spin" /> Enregistrement...</> : <><Check size={14} /> Enregistrer</>}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product details modal */}
      {detailsModal && (() => {
        const product = detailsModal.product;
        const gallery = detailsModal.images || [];
        const activeImage = gallery[selectedDetailImage] || gallery[0];
        const fallbackImage = !activeImage ? resolveProductImage(product, null) : null;
        const stock = Math.max(0, Number(product.stock || 0));
        const minimumStock = Math.max(0, Number(product.minimumStock || 0));
        const stockPercent = Math.min(100, stock / Math.max(minimumStock * 2, stock, 1) * 100);
        const lowStock = stock <= minimumStock;
        const price = Number(product.price || 0);
        const salePrice = Number(product.salePrice || 0);
        const hasPromotion = salePrice > 0 && salePrice < price;
        const finalPrice = hasPromotion ? salePrice : price;
        const brand = displayBrandName(product.brand) || product.brandName || product.brand_name || '?';
        const amount = product.montantRemise ?? product.montant_remise;
        const headerFormat = [product.weight ? `${product.weight} kg` : '', product.productOptions?.type].filter(Boolean).join(' ? ');
        const details = [
          ...(product.variants?.length > 0 ? [] : [[Barcode, 'SKU', product.sku || '?']]),
          [Barcode, 'Code-barres', product.barcode || '?'],
          [Layers, 'Cat?gorie', displayName(product.category) || '?'],
          [BadgeCheck, 'Marque', brand],
          [Weight, 'Poids', product.weight ? `${product.weight} kg` : '?'],
          [Target, 'Objectifs', displayRelationNames(product.goals)],
          [Sparkles, 'A des saveurs', product.hasFlavors ?? product.has_flavors ? 'Oui' : 'Non'],
          [Sparkles, 'Saveurs', displayRelationNames(product.flavors)],
          [CalendarDays, 'Date du produit', dateInputValue(product.dateProduit) || '?'],
          [CalendarDays, 'Cr?? le', formatAdminDate(product.createdAt ?? product.created_at)],
          [CalendarDays, 'Mis ? jour le', formatAdminDate(product.updatedAt ?? product.updated_at)],
          [Star, 'Produit vedette', product.isFeatured ? 'Oui' : 'Non'],
          [Star, 'Meilleure vente', product.isBestSeller ? 'Oui' : 'Non'],
          [Sparkles, 'Nouveaut?', product.isNew ? 'Oui' : 'Non'],
          [Package, 'Disponible dans un pack', product.packing ? 'Oui' : 'Non'],
          [Tag, 'Remise pack', product.packing && amount != null ? `${Number(amount).toFixed(2)} DT` : '?'],
          [CalendarDays, 'Expiration', dateInputValue(product.expirationDate || product.expiryDate) || '?'],
        ];
        const descriptionBlock = (title, value) => <section className="rounded-xl border border-[#29313D] bg-[#11151C] p-5">
          <h3 className="border-l-2 border-[#FF382F] pl-3 text-sm font-bold uppercase tracking-wide text-[#FF665F]">{title}</h3>
          {!value ? <p className="mt-3 text-sm text-gray-500">?</p> : descriptionIsHtml(value)
            ? <div className="admin-product-description mt-4 text-sm leading-7 text-gray-300 [&_p]:mb-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_a]:text-[#FF665F] [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-[#29313D] [&_blockquote]:pl-4 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_h3]:mb-2 [&_h3]:font-bold" dangerouslySetInnerHTML={{ __html: safeDescriptionHtml(value) }} />
            : <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-gray-300">{value}</p>}
        </section>;
        return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-6">
          <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-[#29313D] bg-[#0B0D11] shadow-2xl shadow-black/60">
            <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[#29313D] bg-[#11151C] px-5 py-4 sm:px-7">
              <div className="min-w-0"><p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#FF5148]">D?tails du produit</p><h2 className="mt-1 truncate text-lg font-black text-white sm:text-2xl">{product.name}</h2><p className="mt-1 truncate text-sm text-gray-400">{brand}{headerFormat ? ` ? ${headerFormat}` : ''}</p></div>
              <button onClick={() => setDetailsModal(null)} className="rounded-lg p-2 text-gray-400 transition hover:bg-white/5 hover:text-white" aria-label="Fermer"><X size={20} /></button>
            </header>
            <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7">
              {detailsModal.loading ? <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#FF382F]" /></div> : <div className="space-y-6">
                {detailsModal.error && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-950/30 p-4 text-sm text-red-200">{detailsModal.error}</div>}
                <section className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(220px,.75fr)]">
                  <div className="relative flex min-h-[260px] items-center justify-center overflow-hidden rounded-xl border border-[#29313D] bg-[#11151C] p-5 sm:min-h-[360px]">
                    {activeImage && productImageUrl(activeImage) ? <img src={productImageUrl(activeImage)} alt={product.name} className="max-h-[460px] w-full object-contain" /> : fallbackImage ? <img src={fallbackImage} alt={product.name} className="max-h-[460px] w-full object-contain" /> : <div className="flex flex-col items-center gap-3 text-gray-500"><ImageIcon size={42} /><span className="text-sm">Aucune image disponible</span></div>}
                    {(activeImage ? isPrimaryProductImage(activeImage) : Boolean(fallbackImage)) && <span className="absolute left-4 top-4 rounded-md bg-[#FF382F] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">Principale</span>}
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-1 lg:max-h-[360px] lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden">
                    {gallery.map((image, index) => <button type="button" key={getProductImageId(image) ?? index} onClick={() => setSelectedDetailImage(index)} aria-label={`Afficher l?image ${index + 1}`} aria-pressed={selectedDetailImage === index} className={`relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border-2 bg-[#11151C] p-2 transition sm:h-28 sm:w-28 lg:h-24 lg:w-full ${selectedDetailImage === index ? 'border-[#FF382F]' : 'border-[#29313D] hover:border-gray-500'}`}><img src={productImageUrl(image)} alt={`${product.name} ${index + 1}`} className="h-full w-full object-contain" />{isPrimaryProductImage(image) && <span className="absolute bottom-1 left-1 rounded bg-black/80 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">Principale</span>}</button>)}
                    {!gallery.length && <div className="flex h-24 min-w-24 items-center justify-center rounded-lg border border-dashed border-[#29313D] text-gray-600 lg:w-full"><ImageIcon /></div>}
                  </div>
                </section>
                <section className="overflow-hidden rounded-xl border border-[#29313D] bg-[#11151C]">
                  <div className="flex items-center justify-between border-b border-[#29313D] px-5 py-4"><h3 className="text-sm font-black uppercase tracking-wider text-[#FF665F]">Informations produit</h3><span className={`rounded-full px-3 py-1 text-xs font-bold ${product.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-500/10 text-gray-400'}`}>{product.isActive ? 'Actif' : 'Inactif'}</span></div>
                  <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
                    <div className="rounded-lg border border-[#29313D] bg-[#0B0D11] p-4 sm:col-span-2"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{product.variants?.length > 0 ? 'Prix produit · repris par les variantes' : 'Prix actuel'}</p><p className="mt-1 text-2xl font-black text-white">{finalPrice.toFixed(2)} TND</p></div>{hasPromotion && <div className="text-right"><p className="text-xs text-gray-500">Prix initial</p><p className="text-sm text-gray-500 line-through">{price.toFixed(2)} TND</p><p className="mt-1 text-xs font-bold text-emerald-400">Promotion active</p></div>}{product.packing && Number(amount) > 0 && <div className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm font-bold text-emerald-400">Remise pack : {Number(amount).toFixed(2)} DT</div>}</div></div>
                    {details.map(([Icon, label, value]) => <div key={label} className="flex min-w-0 gap-3 rounded-lg border border-[#29313D] bg-[#0B0D11] p-3.5"><Icon size={17} className="mt-0.5 shrink-0 text-[#FF5148]" /><div className="min-w-0"><p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">{label}</p><p className="mt-1 break-words text-sm font-medium text-gray-200">{value}</p></div></div>)}
                    {product.variants?.length > 0
                      ? <div className="rounded-lg border border-[#29313D] bg-[#0B0D11] p-4 sm:col-span-2">
                        <div className="mb-3 flex items-center gap-2"><Warehouse size={17} className="text-[#FF5148]" /><span className="text-xs font-bold uppercase tracking-wide text-gray-400">Variantes · stock par SKU</span></div>
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[520px] text-left text-xs">
                            <thead className="text-[10px] uppercase tracking-wide text-gray-500"><tr><th className="pb-2 pr-3">Variante</th><th className="pb-2 pr-3">SKU</th><th className="pb-2 pr-3">Prix</th><th className="pb-2 pr-3">Stock</th><th className="pb-2">Action</th></tr></thead>
                            <tbody className="divide-y divide-[#29313D]">
                              {product.variants.map((variant, index) => <tr key={variant.id ?? index}>
                                <td className="py-2 pr-3 text-gray-200">{productVariantLabel(variant)}</td>
                                <td className="py-2 pr-3 font-mono text-gray-400">{variantSku(variant) || '—'}</td>
                                <td className="py-2 pr-3 text-gray-200">{variantPrice(variant).toFixed(2)} TND</td>
                                <td className={`py-2 ${Number(variant.stock || 0) > 0 ? 'text-emerald-400' : 'text-red-400'}`}>{Number(variant.stock || 0)}</td>
                                <td className="py-2"><button type="button" onClick={() => { void openStockManager({ id: product.id, name: `${product.name} · ${productVariantLabel(variant)}` }); }} className="rounded bg-white/5 px-2 py-1 text-[10px] font-bold text-gray-300 hover:text-white">Ajuster</button></td>
                              </tr>)}
                            </tbody>
                          </table>
                        </div>
                        <p className="mt-3 text-xs text-gray-500">Les prix et le poids sont repris du produit. Le stock est ajusté séparément pour chaque variante.</p>
                      </div>
                      : <div className="rounded-lg border border-[#29313D] bg-[#0B0D11] p-4 sm:col-span-2"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Warehouse size={17} className="text-[#FF5148]" /><span className="text-xs font-bold uppercase tracking-wide text-gray-400">Stock disponible</span></div><span className={`text-sm font-bold ${lowStock ? 'text-amber-300' : 'text-emerald-400'}`}>{stock} en stock {lowStock ? '? Stock faible' : ''}</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-[#29313D]"><div className={`h-full rounded-full transition-all ${lowStock ? 'bg-amber-400' : 'bg-emerald-500'}`} style={{ width: `${stockPercent}%` }} /></div><p className="mt-2 text-xs text-gray-500">Seuil minimum : {minimumStock}</p></div>}
                  </div>
                </section>
                <div className="grid gap-4 lg:grid-cols-2">{descriptionBlock('Description courte', product.shortDescription)}{descriptionBlock('Description d?taill?e', product.description)}</div>
                <section className="rounded-xl border border-[#29313D] bg-[#11151C] p-5"><h3 className="border-l-2 border-[#FF382F] pl-3 text-sm font-bold uppercase tracking-wide text-[#FF665F]">Informations SEO</h3><p className="mt-4 text-sm font-semibold text-gray-200">{product.metaTitle || '?'}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-400">{product.metaDescription || '?'}</p></section>
              </div>}
            </main>
            <footer className="flex shrink-0 flex-col-reverse gap-3 border-t border-[#29313D] bg-[#11151C] px-4 py-4 sm:flex-row sm:justify-end sm:px-7">
              <button type="button" onClick={() => setDetailsModal(null)} className="rounded-lg border border-[#29313D] px-5 py-2.5 text-sm font-bold text-gray-300 transition hover:border-gray-500 hover:text-white">Fermer</button>
              <button type="button" disabled={detailsModal.loading} onClick={() => { const selectedProduct = detailsModal.product; setDetailsModal(null); openEdit(selectedProduct); }} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#FF382F] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#e52f28] disabled:cursor-not-allowed disabled:opacity-50"><Pencil size={16} /> Modifier le produit</button>
            </footer>
          </div>
        </div>;
      })()}

      {/* Stock Modal */}
      {stockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl w-full max-w-sm shadow-2xl">
            <div className="flex justify-between items-center p-5 border-b border-[#2a2a2a]">
              <h3 className="font-bold text-white">Ajuster le Stock — {stockModal.name}</h3>
              <button disabled={stockSaving} onClick={() => setStockModal(null)} className="text-gray-400 hover:text-white disabled:opacity-40"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              {stockError && <div role="alert" className="text-sm text-red-300 bg-red-900/20 border border-red-500/30 rounded-lg p-3">{stockError}</div>}
              {stockModal.loadingVariants ? <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-[#d90429]" /></div> : stockModal.variants?.length > 0 ? <>
                <div>
                  <label className={labelCls}>Variante</label>
                  <select
                    value={stockForm.variantId}
                    onChange={(event) => {
                      const variant = stockModal.variants.find((item) => String(item.id ?? iriToId(item['@id'])) === event.target.value);
                      setStockForm((current) => ({
                        ...current,
                        variantId: event.target.value,
                        quantity: current.operation === 'adjust' ? Number(variant?.stock ?? 0) : 1,
                      }));
                    }}
                    className={inputCls}
                  >
                    {stockModal.variants.map((variant, index) => <option key={variant.id ?? index} value={String(variant.id ?? iriToId(variant['@id']) ?? '')}>
                      {productVariantLabel(variant)} · {variantSku(variant) || 'SKU manquant'}
                    </option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Opération</label>
                  <select value={stockForm.operation} onChange={(event) => {
                    const selected = stockModal.variants.find((variant) => String(variant.id ?? iriToId(variant['@id'])) === stockForm.variantId);
                    setStockForm((current) => ({
                      ...current,
                      operation: event.target.value,
                      quantity: event.target.value === 'adjust' ? Number(selected?.stock ?? 0) : 1,
                    }));
                  }} className={inputCls}>
                    <option value="add">Ajouter</option>
                    <option value="remove">Retirer</option>
                    <option value="adjust">Ajuster (stock réel constaté)</option>
                    <option value="return">Retour</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>{stockForm.operation === 'adjust' ? 'Stock réel' : 'Quantité'}</label>
                  <input type="number" min={stockForm.operation === 'adjust' ? '0' : '1'} step="1" value={stockForm.quantity} onChange={e => setStockForm(p => ({ ...p, quantity: e.target.value }))} className={inputCls} />
                  <p className="mt-1 text-[11px] text-gray-500">Le stock de la variante est modifié, jamais celui du produit parent.</p>
                </div>
                <div>
                  <label className={labelCls}>Motif {stockForm.operation === 'add' ? '(facultatif)' : '*'}</label>
                  <input value={stockForm.reason} onChange={e => setStockForm(p => ({ ...p, reason: e.target.value }))} className={inputCls} placeholder="ex: Réception fournisseur" />
                </div>
              </> : <>
                <div>
                  <label className={labelCls}>Opération</label>
                  <select value={stockForm.operation} onChange={e => setStockForm(p => ({ ...p, operation: e.target.value }))} className={inputCls}>
                    <option value="add">Ajouter</option>
                    <option value="remove">Retirer</option>
                    <option value="adjust">Ajuster (stock réel constaté)</option>
                    <option value="return">Retour</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Quantité</label>
                  <input type="number" min="1" step="1" value={stockForm.quantity} onChange={e => setStockForm(p => ({ ...p, quantity: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Motif {stockForm.operation === 'add' ? '(facultatif)' : '*'}</label>
                  <input value={stockForm.reason} onChange={e => setStockForm(p => ({ ...p, reason: e.target.value }))} className={inputCls} placeholder="ex: Réception fournisseur" />
                </div>
              </>}
            </div>
            <div className="p-5 border-t border-[#2a2a2a] flex gap-3 justify-end">
              <button disabled={stockSaving} onClick={() => setStockModal(null)} className="px-4 py-2 text-sm text-gray-300 hover:text-white disabled:opacity-40">Annuler</button>
              <button disabled={stockSaving || stockModal.loadingVariants || stockModal.variantLoadFailed} onClick={handleStockSave} className="inline-flex items-center gap-2 bg-[#d90429] hover:bg-[#ff1a3c] text-white px-5 py-2 rounded-lg text-sm font-bold disabled:opacity-60">
                {stockSaving && <Loader2 size={14} className="animate-spin" />}{stockSaving ? 'Enregistrement…' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
