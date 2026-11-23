import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useCart } from "../context/CartContext";
import { productService, productVariantService, reviewService, flavorService, brandService, categoryService, hydrateProductsWithImages, iriToId, productImageUrl, resolveProductFlavors, resolveProductImage } from "../services/api";
import { ProductCard } from "../components/ProductCard";
import { FREE_SHIPPING_THRESHOLD } from "../config/store";
import { getVariantOptionLabels, getVariantOptionValues } from "../utils/productVariantOptions";
import {
  Star, ShoppingCart, ShieldCheck, Truck, ChevronLeft, ChevronRight,
  Zap, Loader2, Send, Headphones, BadgeCheck, ArrowRight, PackageOpen, Search, X
} from "lucide-react";

const formatMonthYear = (value) => {
  const match = String(value || '').match(/^(\d{4})-(\d{2})/);
  return match ? `${match[2]}/${match[1]}` : '';
};

const getRelationId = (relation) => {
  const value = relation && typeof relation === 'object'
    ? relation.id ?? relation['@id'] ?? relation.iri
    : relation;
  return iriToId(value) ?? (typeof value === 'string' ? value : null);
};

const displayBrandName = (brand) => {
  const name = brand?.name || brand?.brandName || brand?.brand_name || brand?.label || brand?.title;
  if (name) return name;
  return String(brand?.slug || '')
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const isEnabledFlag = (value) => value === true || value === 1 || ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
const isAvailableProduct = (product) => product?.isActive !== false
  && product?.brand?.isActive !== false
  && product?.brand?.active !== false;
const variantKey = (variant) => String(variant?.id ?? variant?.["@id"] ?? variant?.sku ?? variant?.SKU ?? "");
const variantSku = (variant) => variant?.sku ?? variant?.SKU ?? "";
const variantCapacity = (variant) => {
  const options = variant?.options && typeof variant.options === "object" ? variant.options : {};
  const genericCapacity = options.capacity ?? variant?.capacity;
  const value = genericCapacity
    ?? options.capacityLiters
    ?? options.capacity_liters
    ?? options.liters
    ?? options.volume;
  if (value == null || String(value).trim() === "") return "";
  const label = String(value).trim();
  return genericCapacity != null || /(?:ml|milliliters?|millilitres?|l|liters?|litres?)$/i.test(label)
    ? label
    : `${label} L`;
};
const variantLabel = (variant, flavors = []) => {
  const flavorRelationId = getRelationId(variant?.flavor);
  const flavorRecord = flavors.find((item) => String(getRelationId(item)) === String(flavorRelationId));
  const flavor = typeof variant?.flavor === "object"
    ? variant.flavor.name
    : variant?.flavorName ?? variant?.flavor_name ?? flavorRecord?.name;
  const name = variant?.name ?? variant?.label ?? variant?.title;
  const descriptiveName = name && String(name) !== String(variantSku(variant)) ? name : "";
  return [descriptiveName, flavor, ...getVariantOptionLabels(variant)]
    .filter(Boolean)
    .map((value) => typeof value === "number" ? `${value} kg` : value)
    .join(" · ") || "Variante";
};
const variantFlavorOption = (variant, flavors = []) => {
  const relation = variant?.flavor ?? variant?.flavour;
  const id = getRelationId(relation);
  const flavorRecord = flavors.find((item) => id != null && String(getRelationId(item)) === String(id));
  const name = (typeof relation === "object" && relation?.name)
    || variant?.flavorName
    || variant?.flavor_name
    || variant?.flavourName
    || flavorRecord?.name
    || (typeof relation === "string" && !relation.startsWith("/api/") ? relation : "");
  return name ? { id: id ?? flavorRecord?.id, name: String(name) } : null;
};
const buildVariantFlavorOptions = (variants, flavors) => {
  const options = (flavors || [])
    .filter((flavor) => flavor?.name)
    .map((flavor) => ({ ...flavor, variants: [] }));

  variants.forEach((variant) => {
    const flavor = variantFlavorOption(variant, flavors);
    if (!flavor) return;
    let option = options.find((item) => (
      (flavor.id != null && item.id != null && String(item.id) === String(flavor.id))
      || item.name.trim().toLowerCase() === flavor.name.trim().toLowerCase()
    ));
    if (!option) {
      option = { ...flavor, variants: [] };
      options.push(option);
    }
    option.variants.push(variant);
  });

  return options;
};
const buildVariantChoiceGroup = (variants) => {
  const optionRows = variants.map((variant) => getVariantOptionValues(variant));
  const dimensions = optionRows[0] || [];
  const sharedDimensions = dimensions.filter((dimension) => {
    const values = optionRows.map((options) => options.find((option) => option.key === dimension.key)?.value);
    return values.every(Boolean) && new Set(values.map((value) => value.trim().toLocaleLowerCase())).size === 1;
  });

  const choiceDimensions = dimensions.filter((dimension) => {
    const values = optionRows.map((options) => options.find((option) => option.key === dimension.key)?.value);
    return values.every(Boolean) && new Set(values.map((value) => value.trim().toLocaleLowerCase())).size > 1;
  });
  const sharedDimension = sharedDimensions[0];
  const choiceDimension = choiceDimensions.find((dimension) => dimension.key !== sharedDimension?.key)
    || (sharedDimension ? null : choiceDimensions.length === 1 ? choiceDimensions[0] : null);
  if (!choiceDimension) return null;

  const choices = [];
  variants.forEach((variant, index) => {
    const value = optionRows[index].find((option) => option.key === choiceDimension.key)?.value;
    if (!value || choices.some((choice) => choice.value.toLocaleLowerCase() === value.toLocaleLowerCase())) return;
    choices.push({ value, variants: [] });
  });
  choices.forEach((choice) => {
    choice.variants = variants.filter((variant, index) => (
      optionRows[index].find((option) => option.key === choiceDimension.key)?.value.toLocaleLowerCase()
      === choice.value.toLocaleLowerCase()
    ));
  });

  return {
    title: sharedDimension
      ? `${sharedDimension.label} : ${sharedDimension.value}`
      : choiceDimension.label,
    choiceLabel: choiceDimension.label,
    choices,
  };
};
const variantUnitPrice = (variant) => {
  const price = Number(variant?.price ?? 0);
  const salePrice = Number(variant?.salePrice ?? variant?.sale_price ?? 0);
  const effectivePrice = Number(variant?.effectivePrice);
  return Number.isFinite(effectivePrice) && effectivePrice > 0
    ? effectivePrice
    : salePrice > 0 && salePrice < price ? salePrice : price;
};

const getProductImageFlavorId = (image) => getRelationId(
  image?.flavor ?? image?.flavour ?? image?.flavorId ?? image?.flavor_id
);

const getProductImageVariantId = (image) => getRelationId(
  image?.variant ?? image?.variantId ?? image?.variant_id
);

const getProductImageProductId = (image) => getRelationId(
  image?.product ?? image?.productId ?? image?.product_id
);

const compareGalleryImages = (first, second) => (
  Number(first?.position ?? 0) - Number(second?.position ?? 0)
  || Number(first?.id ?? 0) - Number(second?.id ?? 0)
);

const resolveFlavorImage = (images, flavorId) => {
  if (flavorId == null) return null;
  const image = [...(images || [])]
    .filter((item) => String(getProductImageFlavorId(item)) === String(flavorId))
    .sort(compareGalleryImages)[0];
  return image ? productImageUrl(image) : null;
};

const resolveVariantImage = (images, variantId) => {
  if (variantId == null) return null;
  const image = [...(images || [])]
    .filter((item) => String(getProductImageVariantId(item)) === String(variantId))
    .sort(compareGalleryImages)[0];
  return image ? productImageUrl(image) : null;
};

const mergeGalleryImages = (currentImages = [], nextImages = []) => {
  const seen = new Set();
  return [...currentImages, ...nextImages].filter((image, index) => {
    const key = image?.id
      ?? image?.['@id']
      ?? image?.imageUrl
      ?? image?.image
      ?? image?.path
      ?? index;
    if (seen.has(String(key))) return false;
    seen.add(String(key));
    return true;
  });
};

const resolveFlavorOptions = (product, flavorCatalog = []) => {
  const seen = new Set();
  return (product?.flavors || []).map((flavor) => {
    const id = getRelationId(flavor);
    const catalogFlavor = flavorCatalog.find((item) => String(getRelationId(item)) === String(id));
    const name = resolveProductFlavors({ flavors: [flavor] }, flavorCatalog)[0]
      || catalogFlavor?.name
      || '';
    const key = String(id ?? name);
    if (!name || seen.has(key)) return null;
    seen.add(key);
    return { id, name };
  }).filter(Boolean);
};

const normalizeProduct = (p, flavorCatalog = []) => {
  const flavorOptions = resolveFlavorOptions(p, flavorCatalog);
  return {
  id: p.id,
  name: p.name,
  category: p.category?.name || '',
  categoryId: getRelationId(p.category),
  brand: displayBrandName(p.brand),
  brandId: getRelationId(p.brand),
  brandSlug: p.brand?.slug || p.brandSlug || '',
  price: parseFloat(p.price || 0),
  originalPrice: (isEnabledFlag(p.isOnSale) || (Number(p.salePrice) > 0 && Number(p.salePrice) < Number(p.price))) && p.salePrice ? parseFloat(p.price) : null,
  image: resolveProductImage(p, null),
  isNew: isEnabledFlag(p.isNew ?? p.is_new),
  isOnSale: isEnabledFlag(p.isOnSale) || (Number(p.salePrice) > 0 && Number(p.salePrice) < Number(p.price)),
  salePrice: p.salePrice,
  badge: isEnabledFlag(p.isFeatured) ? 'TOP SELLER' : null,
  inStock: (p.stock || 0) > 0,
  flavors: flavorOptions.map((flavor) => flavor.name),
  flavorOptions,
  sizes: [],
  sku: p.sku,
  shortDescription: p.shortDescription || '',
  longDescription: p.longDescription || p.description || p.shortDescription || '',
  dateProduit: p.dateProduit || '',
  nutritionFact: p.nutritionFact || null,
  productOptions: p.productOptions || p.options || null,
  productImages: p.productImages || [],
  '@id': p['@id'],
};
};

export const ProductDetailPage = () => {
  const {
    selectedProductId,
    addToCart,
    navigateTo,
    viewBrandDetails,
    productOriginBrandId,
    showToast,
    selectedShopCategoryIds,
    setSelectedShopCategoryIds,
    setSearchQuery,
    shopRouteFilters,
  } = useCart();

  const [product, setProduct] = useState(null);
  const [selectedBreadcrumbCategories, setSelectedBreadcrumbCategories] = useState([]);
  const [related, setRelated] = useState([]);
  const [relatedIndex, setRelatedIndex] = useState(0);
  const [variants, setVariants] = useState([]);
  const [selectedVariantKey, setSelectedVariantKey] = useState("");
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [variantsLoading, setVariantsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [activeImage, setActiveImage] = useState('');
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [descriptionHasMore, setDescriptionHasMore] = useState(false);
  const descriptionRef = useRef(null);
  const relatedViewportRef = useRef(null);
  const flavorImageRequestRef = useRef(0);

  const [selectedFlavor, setSelectedFlavor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);

  // Review form
  const [reviewForm, setReviewForm] = useState({ customerName: '', email: '', rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    let active = true;
    if (selectedShopCategoryIds.length === 0) {
      setSelectedBreadcrumbCategories([]);
      return () => { active = false; };
    }

    const categoryRequests = new Map();
    const getCategory = (id) => {
      const key = String(id);
      if (!categoryRequests.has(key)) {
        categoryRequests.set(key, categoryService.getOne(id, true).catch(() => null));
      }
      return categoryRequests.get(key);
    };
    const loadCategoryPath = async (id, visited = new Set()) => {
      const category = await getCategory(id);
      if (!category) return [];

      const categoryId = getRelationId(category) ?? id;
      const key = String(categoryId);
      if (visited.has(key)) return [];
      visited.add(key);

      const parentId = getRelationId(category.parent ?? category.parent_id ?? category.parentId);
      const parentPath = parentId == null ? [] : await loadCategoryPath(parentId, visited);
      const name = category.name ?? category.label;
      return name ? [...parentPath, { id: categoryId, name }] : parentPath;
    };

    Promise.all(selectedShopCategoryIds.map((id) => loadCategoryPath(id)))
      .then((paths) => {
        if (!active) return;
        const seen = new Set();
        setSelectedBreadcrumbCategories(paths.flat().filter((category) => {
          const key = String(category.id);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        }));
      });

    return () => { active = false; };
  }, [selectedShopCategoryIds]);

  useEffect(() => {
    if (!selectedProductId) return;
    let active = true;
    flavorImageRequestRef.current += 1;
    setLoading(true);
    setVariantsLoading(true);
    setLoadError("");
    setProduct(null);
    setVariants([]);
    setSelectedVariantKey("");
    setRelated([]);
    setReviews([]);
    setDescriptionExpanded(false);

    const loadProduct = async () => {
      try {
        const prod = await productService.getOne(selectedProductId, true);
        if (!active) return;
        if (!isAvailableProduct(prod)) {
          setProduct(null);
          setLoading(false);
          setVariantsLoading(false);
          return;
        }

        const immediateProduct = normalizeProduct(prod);
        setProduct(immediateProduct);
        setActiveImage(resolveProductImage(prod, null) || productImageUrl(prod.productImages?.[0]));
        setLoading(false);

        const productCategoryId = getRelationId(prod.category);
        const categoryPromise = prod.category?.name || productCategoryId == null
          ? Promise.resolve(null)
          : categoryService.getOne(productCategoryId, true).catch(() => null);
        const relatedParams = { isActive: true, itemsPerPage: 8 };
        if (productCategoryId) relatedParams['category.id'] = productCategoryId;

        const productFlavorIds = (prod.flavors || []).map(getRelationId).filter((id) => id != null);
        const imageRequest = productService.getImages({ product: `/api/products/${selectedProductId}`, itemsPerPage: 100 }, true)
          .catch(() => ({ 'hydra:member': [] }));
        const relatedRequest = productService.getAll(relatedParams, true)
          .catch(() => ({ 'hydra:member': [] }));
        const reviewRequest = reviewService.getAll({ 'product.id': selectedProductId, approved: true }, true)
          .catch(() => ({ 'hydra:member': [] }));
        const flavorRequest = flavorService.getAll({ itemsPerPage: 100 }, true)
          .catch(() => ({ 'hydra:member': [] }));
        const flavorDetailsRequest = Promise.all(productFlavorIds.map((id) => flavorService.getOne(id, true).catch(() => null)));
        const brandRequest = immediateProduct.brand || immediateProduct.brandId == null
          ? Promise.resolve(null)
          : brandService.getOne(immediateProduct.brandId, true).catch(() => null);
        const variantRequest = productVariantService.getAll({ "product.id": selectedProductId, isActive: true }, true, true);
        const [variantData] = await Promise.all([variantRequest]);
        if (!active) return;

        const activeVariants = variantData["hydra:member"].filter((variant) => variant.isActive !== false);
        const firstAvailableVariant = activeVariants.find((variant) => variantSku(variant) && Number(variant.stock) > 0)
          || activeVariants[0];
        setVariants(activeVariants);
        setSelectedVariantKey(firstAvailableVariant ? variantKey(firstAvailableVariant) : "");
        setVariantsLoading(false);

        const [imageData, relData, revData, flavorData, flavorDetails, brandData, categoryData] = await Promise.all([
          imageRequest,
          relatedRequest,
          reviewRequest,
          flavorRequest,
          flavorDetailsRequest,
          brandRequest,
          categoryPromise,
        ]);
        if (!active) return;

        const fetchedImages = imageData['hydra:member'] || imageData.member || imageData.items || [];
        const imagesById = new Map(fetchedImages.map((image) => [String(image.id), image]));
        const embeddedImages = (prod.productImages || [])
          .map((image) => {
            if (typeof image !== 'string') return image;
            const imageId = image.split('/').pop();
            return imagesById.get(String(imageId)) || image;
          })
          .filter((image) => typeof image !== 'string');

        const seenImageKeys = new Set();
        const productImages = [...embeddedImages, ...fetchedImages].filter((image, index) => {
          const key = image?.id ?? image?.['@id'] ?? image?.image ?? image?.path ?? image?.url ?? index;
          if (seenImageKeys.has(String(key))) return false;
          seenImageKeys.add(String(key));
          return true;
        });
        const productWithImages = {
          ...prod,
          category: prod.category?.name ? prod.category : categoryData || prod.category,
          productImages,
        };
        const flavorCatalog = [
          ...(flavorData['hydra:member'] || flavorData.member || flavorData.items || []),
          ...flavorDetails.filter(Boolean),
        ];
        const brandItems = brandData?.['hydra:member'] || brandData?.member || brandData?.items || [];
        const brandRecord = brandItems.length > 0
          ? brandItems.find((item) => String(getRelationId(item)) === String(immediateProduct.brandId))
          : brandData;
        const norm = normalizeProduct(productWithImages, flavorCatalog);
        if (!norm.brand && brandRecord) norm.brand = displayBrandName(brandRecord);
        setProduct(norm);
        const hydratedInitialFlavor = norm.flavorOptions[0];
        const initialVariantFlavor = variantFlavorOption(firstAvailableVariant, norm.flavorOptions);
        setActiveImage(
          resolveVariantImage(productImages, firstAvailableVariant?.id ?? getRelationId(firstAvailableVariant?.['@id']))
          || (activeVariants.length === 0 ? resolveFlavorImage(productImages, hydratedInitialFlavor?.id) : null)
          || resolveProductImage(productWithImages, norm.image)
          || productImageUrl(productImages[0])
        );
        setSelectedFlavor(initialVariantFlavor?.name || (activeVariants.length === 0 ? hydratedInitialFlavor?.name || "" : ""));

        const relatedWithImages = await hydrateProductsWithImages(
          (relData['hydra:member'] || []).filter((item) => isAvailableProduct(item) && String(item.id) !== String(prod.id) && (!productCategoryId || String(getRelationId(item.category)) === String(productCategoryId))).slice(0, 8),
          true,
          true
        );
        if (!active) return;
        const relProds = relatedWithImages.map((item) => normalizeProduct(item, flavorCatalog));
        setRelatedIndex(0);
        setRelated(relProds);
        setReviews(revData['hydra:member'] || []);
        setLoading(false);
      } catch {
        if (active) {
          setLoadError("Impossible de charger les variantes du produit. Réessayez avant de l’ajouter au panier.");
          setLoading(false);
          setVariantsLoading(false);
        }
      }
    };

    void loadProduct();
    return () => { active = false; };
  }, [selectedProductId]);

  const handleFlavorSelect = async (flavor) => {
    setSelectedFlavor(flavor.name);
    const requestId = flavorImageRequestRef.current + 1;
    flavorImageRequestRef.current = requestId;

    const alreadyLoadedImage = resolveFlavorImage(product?.productImages, flavor.id);
    if (alreadyLoadedImage) setActiveImage(alreadyLoadedImage);
    if (flavor.id == null || !product?.id) return;

    try {
      const imageData = await productService.getImages({ 'flavor.id': flavor.id, itemsPerPage: 100 }, true);
      if (flavorImageRequestRef.current !== requestId) return;

      const flavorImages = (imageData['hydra:member'] || imageData.member || imageData.items || [])
        .filter((image) => String(getProductImageProductId(image)) === String(product.id));
      const flavorImage = resolveFlavorImage(flavorImages, flavor.id) || productImageUrl(flavorImages[0]);
      if (flavorImage) setActiveImage(flavorImage);
      if (flavorImages.length > 0) {
        setProduct((current) => current ? {
          ...current,
          productImages: mergeGalleryImages(current.productImages, flavorImages),
        } : current);
      }
    } catch {
      // Keep the already-visible product image if this flavor gallery cannot load.
    }
  };

  const scrollRelated = (direction) => {
    const viewport = relatedViewportRef.current;
    if (!viewport) return;
    viewport.scrollBy({ left: direction * viewport.clientWidth, behavior: "smooth" });
  };

  const handleVariantSelect = async (variant) => {
    const requestId = flavorImageRequestRef.current + 1;
    flavorImageRequestRef.current = requestId;
    setSelectedVariantKey(variant ? variantKey(variant) : '');
    setSelectedFlavor(variantFlavorOption(variant, product?.flavorOptions)?.name || '');
    if (!variant) return;

    const variantId = variant.id ?? getRelationId(variant['@id']);
    const alreadyLoadedImage = resolveVariantImage(product?.productImages, variantId);
    if (alreadyLoadedImage) setActiveImage(alreadyLoadedImage);
    else {
      const baseImage = (product?.productImages || []).find((image) => (
        getProductImageVariantId(image) == null && getProductImageFlavorId(image) == null
      ));
      setActiveImage(productImageUrl(baseImage) || resolveProductImage(product, product?.image));
    }
    if (variantId == null || !product?.id) return;

    try {
      const imageData = await productService.getImages({ 'variant.id': variantId, itemsPerPage: 100 }, true);
      if (flavorImageRequestRef.current !== requestId) return;
      const variantImages = (imageData['hydra:member'] || imageData.member || imageData.items || [])
        .filter((image) => {
          const imageVariantId = getProductImageVariantId(image);
          const imageProductId = getProductImageProductId(image);
          return (imageVariantId == null || String(imageVariantId) === String(variantId))
            && (imageProductId == null || String(imageProductId) === String(product.id));
        });
      const variantImage = resolveVariantImage(variantImages, variantId) || productImageUrl(variantImages[0]);
      if (variantImage) setActiveImage(variantImage);
      if (variantImages.length > 0) {
        setProduct((current) => current ? {
          ...current,
          productImages: mergeGalleryImages(current.productImages, variantImages),
        } : current);
      }
    } catch (error) {
      showToast(`Impossible de charger la galerie de cette variante : ${error.message}`);
    }
  };

  useLayoutEffect(() => {
    const description = descriptionRef.current;
    if (!description) return undefined;

    const measure = () => {
      if (!descriptionExpanded) setDescriptionHasMore(description.scrollHeight > description.clientHeight + 2);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(description);
    return () => observer.disconnect();
  }, [product?.longDescription, descriptionExpanded]);

  useEffect(() => {
    if (!imagePreviewOpen) return undefined;

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setImagePreviewOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    const appRoot = document.getElementById('root');
    const rootWasInert = appRoot?.hasAttribute('inert');
    const previousAriaHidden = appRoot?.getAttribute('aria-hidden');

    document.body.style.overflow = 'hidden';
    appRoot?.setAttribute('inert', '');
    appRoot?.setAttribute('aria-hidden', 'true');
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      document.body.style.overflow = previousOverflow;
      if (!rootWasInert) appRoot?.removeAttribute('inert');
      if (previousAriaHidden === null) appRoot?.removeAttribute('aria-hidden');
      else appRoot?.setAttribute('aria-hidden', previousAriaHidden);
    };
  }, [imagePreviewOpen]);

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!product) return;
    setSubmittingReview(true);
    try {
      await reviewService.create({
        product: `/api/products/${product.id || selectedProductId}`,
        customerName: reviewForm.customerName,
        email: reviewForm.email,
        rating: reviewForm.rating,
        comment: reviewForm.comment,
      });
      showToast('✅ Avis envoyé ! Il sera visible après approbation.');
      setReviewForm({ customerName: '', email: '', rating: 5, comment: '' });
    } catch (err) {
      showToast(`❌ ${err.message}`);
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-3 text-sm font-semibold text-white" role="status" aria-label="Chargement de la fiche produit">
        <Loader2 className="h-8 w-8 animate-spin text-[#d90429]" />
        <span>Chargement de la fiche produit…</span>
      </div>
    );
  }

  if (!product) {
    return <div role={loadError ? "alert" : undefined} className="text-center py-20 text-gray-400">{loadError || "Produit introuvable."}</div>;
  }

  const selectedVariant = variants.find((variant) => variantKey(variant) === selectedVariantKey);
  const selectedVariantId = selectedVariant?.id ?? getRelationId(selectedVariant?.["@id"]);
  const hasVariants = variants.length > 0;
  const variantFlavorChoices = buildVariantFlavorOptions(variants, product.flavorOptions);
  const hasVariantFlavors = variantFlavorChoices.some((choice) => choice.variants.length > 0);
  const selectedFlavorVariants = hasVariantFlavors
    ? variants.filter((variant) => (
      variantFlavorOption(variant, product.flavorOptions)?.name.trim().toLowerCase()
      === selectedFlavor.trim().toLowerCase()
    ))
    : variants;
  const capacityVariants = selectedFlavorVariants.filter((variant) => variantCapacity(variant));
  const hasVariantCapacities = variants.some((variant) => variantCapacity(variant));
  const variantChoiceGroup = buildVariantChoiceGroup(variants);
  const uniqueCapacityVariants = capacityVariants.reduce((choices, variant) => {
    const capacity = variantCapacity(variant);
    const existingIndex = choices.findIndex((choice) => variantCapacity(choice).toLowerCase() === capacity.toLowerCase());
    if (existingIndex < 0) choices.push(variant);
    else if (Number(variant.stock ?? 0) > 0 && Number(choices[existingIndex].stock ?? 0) <= 0) choices[existingIndex] = variant;
    return choices;
  }, []);
  const selectedVariantPrice = selectedVariant ? variantUnitPrice(selectedVariant) : null;
  const selectedVariantOriginalPrice = selectedVariant
    && selectedVariantPrice < Number(selectedVariant.price)
    ? Number(selectedVariant.price)
    : null;
  const selectedVariantLabel = selectedVariant
    ? [
      variantFlavorOption(selectedVariant, product.flavorOptions)?.name,
      variantCapacity(selectedVariant),
    ].filter(Boolean).join(" · ") || variantLabel(selectedVariant, product.flavorOptions)
    : '';
  const selectedVariantInStock = Boolean(selectedVariant && variantSku(selectedVariant) && Number(selectedVariant.stock ?? 0) > 0);
  const newShopFilter = ["new", "nouveaute", "nouveautes"].includes(
    String(shopRouteFilters?.filter || "").trim().toLocaleLowerCase("fr")
  );
  const categoryIsSelected = selectedShopCategoryIds.length > 0 || Boolean(shopRouteFilters?.category);
  const brandIsSelected = Boolean(product.brand && productOriginBrandId != null && [
    product.brandId,
    product.brandSlug,
  ].some((id) => id != null && String(id).toLowerCase() === String(productOriginBrandId).toLowerCase()));
  const breadcrumbCategories = brandIsSelected
    ? [{ id: product.brandId ?? productOriginBrandId, name: product.brand, slug: product.brandSlug, isBrand: true }]
    : selectedBreadcrumbCategories.length > 0
      ? selectedBreadcrumbCategories
      : categoryIsSelected && product.category
        ? [{ id: product.categoryId, name: product.category }]
        : [{ id: null, name: "Toutes les offres" }];
  const showNewBreadcrumb = product.isNew || newShopFilter;

  const selectedFlavorOption = product.flavorOptions.find((flavor) => flavor.name === selectedFlavor);
  const variantGalleryImages = selectedVariant
    ? product.productImages.filter((image) => (
      String(getProductImageVariantId(image)) === String(selectedVariantId)
    ))
    : [];
  const flavorGalleryImages = selectedFlavorOption?.id != null
    ? product.productImages.filter((image) => String(getProductImageFlavorId(image)) === String(selectedFlavorOption.id))
    : [];
  // Most products use one shared gallery and do not set `flavor` on image
  // records. Only narrow the gallery when the API actually supplied images for
  // the selected flavor; otherwise the valid product images would disappear.
  const visibleGalleryImages = variantGalleryImages.length > 0
    ? variantGalleryImages
    : flavorGalleryImages.length > 0 ? flavorGalleryImages : product.productImages;

  return (
    <div className="mx-auto w-full px-4 py-10 sm:px-6 lg:px-10 2xl:px-14 space-y-16">
      <nav aria-label="Fil d’Ariane" className="-mb-10 text-sm text-gray-400">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <li>
            <button type="button" onClick={() => navigateTo("home")} className="transition-colors hover:text-white">
              Accueil
            </button>
          </li>
          {breadcrumbCategories.map((category) => (
            <React.Fragment key={category.id ?? category.name}>
              <li aria-hidden="true" className="text-gray-600">›</li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    if (category.isBrand) {
                      viewBrandDetails({
                        id: category.id,
                        slug: category.slug,
                        name: category.name,
                      });
                      return;
                    }
                    setSearchQuery("");
                    if (category.id != null) {
                      setSelectedShopCategoryIds([category.id]);
                      navigateTo("shop");
                    } else {
                      navigateTo("shop", {
                        shopFilters: selectedShopCategoryIds.length === 0 && shopRouteFilters?.category
                          ? { category: shopRouteFilters.category }
                          : {},
                      });
                    }
                  }}
                  className="transition-colors hover:text-white"
                >
                  {category.name}
                </button>
              </li>
            </React.Fragment>
          ))}
          {showNewBreadcrumb && (
            <>
              <li aria-hidden="true" className="text-gray-600">›</li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedShopCategoryIds([]);
                    navigateTo("shop", { shopFilters: { filter: "new" } });
                  }}
                  className="transition-colors hover:text-white"
                >
                  Nouveautés
                </button>
              </li>
            </>
          )}
          <li aria-hidden="true" className="text-gray-600">›</li>
          <li aria-current="page" className="font-semibold text-white">{product.name}</li>
        </ol>
      </nav>

      {/* Main Product Hero Section (2-Column Layout) */}
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12 xl:gap-8">
        {/* Left Column: Vertical Thumbnails + Main Image */}
        <div className="relative flex w-full flex-col-reverse items-start gap-4 rounded-2xl border border-white/10 bg-[#1a1a1a] p-3 sm:p-8 lg:col-span-7 xl:col-span-6 lg:flex-row">
          {(product.badge || product.isNew || product.isOnSale) && (
            <div className="absolute left-6 top-6 z-10 flex flex-wrap gap-2">
              {product.badge && <span className="rounded-full bg-[#1c1b1b] px-3 py-1 text-xs font-black uppercase text-white shadow-lg">{product.badge}</span>}
              {product.isNew && <span className="rounded-full bg-[#f0143c] px-3 py-1 text-xs font-black uppercase text-white shadow-lg">NOUVEAU</span>}
              {product.isOnSale && <span className="rounded-full bg-[#f0143c] px-3 py-1 text-xs font-black uppercase text-white shadow-lg">REMISE</span>}
            </div>
          )}

          {/* Vertical Thumbnail Column on the Left of Main Image */}
          {visibleGalleryImages.length > 0 && (
            <div className="flex w-full flex-row gap-3 overflow-x-auto pt-0 lg:w-24 lg:flex-col lg:overflow-visible lg:pt-10">
              {visibleGalleryImages.map((img, index) => {
                const imageSrc = productImageUrl(img) || product.image;
                return (
                  <button
                    key={img.id ?? img['@id'] ?? `${img.image || 'img'}-${index}`}
                    type="button"
                    onClick={() => setActiveImage(imageSrc)}
                    className={`h-20 w-20 shrink-0 overflow-hidden rounded-lg border bg-[#111] p-1.5 transition-colors sm:h-24 sm:w-24 ${activeImage === imageSrc ? 'border-[#d90429]' : 'border-white/10 hover:border-white/30'}`}
                  >
                    {imageSrc ? (
                      <img src={imageSrc} alt="" className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">Image</div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Main Product Image Container */}
          <div className="relative min-w-0 w-full flex-1 self-start lg:w-auto">
            {activeImage || product.image ? (
              <div className="relative aspect-square w-full max-w-[1080px] overflow-hidden">
                <img
                  src={activeImage || product.image}
                  alt={product.name}
                  width={1080}
                  height={1080}
                  className="absolute inset-0 h-full w-full transform object-contain transition-transform duration-500 hover:scale-105"
                />
                <button
                  type="button"
                  onClick={() => setImagePreviewOpen(true)}
                  className="absolute bottom-4 right-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/65 text-white shadow-lg backdrop-blur-sm transition-colors hover:bg-[#d90429] focus:outline-none focus:ring-2 focus:ring-white/80"
                  aria-label="Agrandir l'image du produit"
                  title="Agrandir l'image"
                >
                  <Search className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center rounded-xl border border-white/10 bg-[#111] text-gray-500 text-sm font-bold uppercase tracking-widest">
                No picture
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Product Info & Cart Actions */}
        <div className="space-y-6 lg:col-span-5 xl:col-span-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center gap-1 text-yellow-400 text-xs font-bold">
                <Star className="w-4 h-4 fill-yellow-400" />
                <span>{reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '—'}</span>
                <span className="text-gray-400 font-normal">({reviews.length} avis)</span>
              </div>
            </div>
            <h1 className="font-heading font-black text-3xl sm:text-4xl text-white leading-tight uppercase">{product.name}</h1>
            <div className="flex items-baseline gap-3 mt-4">
              <span className="font-black text-3xl text-white">
                {hasVariants
                  ? selectedVariantPrice == null ? hasVariantFlavors ? "Choisissez une saveur" : "Choisissez une variante" : selectedVariantPrice.toFixed(2)
                  : product.price.toFixed(2)}
                {(!hasVariants || selectedVariantPrice != null) && <span className="text-sm font-bold text-[#d90429]"> TND</span>}
              </span>
              {(hasVariants ? selectedVariantOriginalPrice : product.originalPrice) && (
                <span className="text-sm text-gray-500 line-through">
                  {(hasVariants ? selectedVariantOriginalPrice : product.originalPrice).toFixed(2)} TND
                </span>
              )}
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded ${variantsLoading ? 'border border-amber-500/30 bg-amber-500/10 text-amber-300' : (hasVariants ? selectedVariantInStock : product.inStock) ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
                {variantsLoading
                  ? "Vérification du stock…"
                  : hasVariants
                  ? selectedVariant ? selectedVariantInStock ? "En stock" : "Rupture de stock" : hasVariantFlavors ? "Choisissez une saveur" : "Choisissez une variante"
                  : product.inStock ? 'En stock' : 'Rupture de stock'}
              </span>
            </div>
            {product.brand && <div className="mt-4 flex items-center gap-2 border-y border-[#303030] py-3.5 text-sm">
              <span className="h-5 w-1 shrink-0 rounded-sm bg-[#d90429]" aria-hidden="true" />
              <span className="font-medium text-gray-400">Brand:</span>
              {product.brandId ? (
                <button type="button" onClick={() => viewBrandDetails({ id: product.brandId, slug: product.brandSlug, name: product.brand })} className="ml-2 font-bold text-white transition-colors hover:text-[#ff7186]">
                  {product.brand}
                </button>
              ) : (
                <span className="ml-2 font-bold text-white">{product.brand}</span>
              )}
            </div>}
          </div>

          {product.shortDescription && (
            <div className="border-t border-b border-white/10 py-3">
              <p className="text-sm text-gray-300 leading-6">{product.shortDescription}</p>
            </div>
          )}

          {(formatMonthYear(product.dateProduit) || product.flavors.length > 0 || hasVariants) && (
            <div className="space-y-2">
              {formatMonthYear(product.dateProduit) && (
                <div className="inline-flex items-center rounded-md border border-[#d90429] bg-[#d90429]/10 px-3 py-2">
                  <span className="text-sm font-bold text-white">{formatMonthYear(product.dateProduit)}</span>
                </div>
              )}
              {hasVariants ? (
                hasVariantFlavors ? (
                  <div>
                    <span className="block text-xs font-heading font-bold text-gray-300 uppercase">Saveur</span>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {variantFlavorChoices.map((choice, index) => {
                        const choiceVariant = choice.variants.find((variant) => (
                          variantSku(variant) && Number(variant.stock ?? 0) > 0
                        )) || choice.variants[0];
                        const available = choice.variants.some((variant) => (
                          variantSku(variant) && Number(variant.stock ?? 0) > 0
                        ));
                        const isSelected = choice.variants.some((variant) => variantKey(variant) === selectedVariantKey);
                        return (
                          <button
                            key={`${choice.id ?? choice.name}-${index}`}
                            type="button"
                            disabled={!available}
                            aria-pressed={Boolean(isSelected)}
                            title={available ? choice.name : `${choice.name} — Indisponible`}
                            onClick={() => { if (choiceVariant) void handleVariantSelect(choiceVariant); }}
                            className={`rounded-lg border px-4 py-2 text-sm font-bold transition-all ${isSelected ? 'border-[#d90429] bg-[#d90429] text-white' : 'border-white/10 bg-[#1a1a1a] text-gray-300 hover:border-white/30'} disabled:cursor-not-allowed disabled:opacity-50`}
                          >
                            {choice.name}
                          </button>
                        );
                      })}
                    </div>
                    {hasVariantCapacities && uniqueCapacityVariants.length > 0 && (
                      <fieldset className="mt-3">
                        <legend className="text-xs font-heading font-bold uppercase text-gray-300">Contenance</legend>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {uniqueCapacityVariants.map((variant, index) => {
                            const available = Boolean(variantSku(variant)) && Number(variant.stock ?? 0) > 0;
                            const isSelected = variantKey(variant) === selectedVariantKey;
                            return (
                              <button
                                key={`${variantKey(variant)}-${index}`}
                                type="button"
                                disabled={!available}
                                aria-pressed={isSelected}
                                onClick={() => { void handleVariantSelect(variant); }}
                                className={`rounded-lg border px-3 py-2 text-sm font-bold transition-colors ${isSelected ? "border-[#d90429] bg-[#d90429] text-white" : "border-white/10 bg-[#1a1a1a] text-gray-300 hover:border-white/30"} disabled:cursor-not-allowed disabled:opacity-45`}
                              >
                                {variantCapacity(variant)}
                              </button>
                            );
                          })}
                        </div>
                      </fieldset>
                    )}
                  </div>
                ) : (
                  <fieldset>
                    <legend className="block text-xs font-heading font-bold uppercase text-gray-300">
                      {hasVariantCapacities ? "Contenance" : variantChoiceGroup?.title || "Options"}
                    </legend>
                    <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={variantChoiceGroup?.choiceLabel || "Options"}>
                      {variantChoiceGroup && !hasVariantCapacities
                        ? variantChoiceGroup.choices.map((choice, index) => {
                          const choiceVariant = choice.variants.find((variant) => (
                            variantSku(variant) && Number(variant.stock ?? 0) > 0
                          )) || choice.variants[0];
                          const available = choice.variants.some((variant) => (
                            variantSku(variant) && Number(variant.stock ?? 0) > 0
                          ));
                          const isSelected = choice.variants.some((variant) => variantKey(variant) === selectedVariantKey);
                          return (
                            <button
                              key={`${choice.value}-${index}`}
                              type="button"
                              disabled={!available}
                              aria-pressed={isSelected}
                              title={available ? `${variantChoiceGroup.choiceLabel} : ${choice.value}` : `${choice.value} — Rupture de stock`}
                              onClick={() => { if (choiceVariant) void handleVariantSelect(choiceVariant); }}
                              className={`rounded-lg border px-4 py-2 text-sm font-bold transition-all ${isSelected ? "border-[#d90429] bg-[#d90429] text-white" : "border-white/10 bg-[#1a1a1a] text-gray-300 hover:border-white/30"} disabled:cursor-not-allowed disabled:opacity-45`}
                            >
                              {choice.value}
                            </button>
                          );
                        })
                        : (hasVariantCapacities ? uniqueCapacityVariants : variants).map((variant, index) => {
                          const available = Boolean(variantSku(variant)) && Number(variant.stock ?? 0) > 0;
                          const isSelected = variantKey(variant) === selectedVariantKey;
                          return (
                            <button
                              key={variantKey(variant) || index}
                              type="button"
                              disabled={!available}
                              aria-pressed={isSelected}
                              title={available ? variantLabel(variant, product.flavorOptions) : `${variantLabel(variant, product.flavorOptions)} — Rupture de stock`}
                              onClick={() => { void handleVariantSelect(variant); }}
                              className={`max-w-full rounded-lg border px-3 py-2 text-left text-xs font-bold transition-colors sm:text-sm ${isSelected ? "border-[#d90429] bg-[#d90429] text-white" : "border-white/10 bg-[#1a1a1a] text-gray-300 hover:border-white/30"} disabled:cursor-not-allowed disabled:opacity-45`}
                            >
                              {hasVariantCapacities ? variantCapacity(variant) : variantLabel(variant, product.flavorOptions)}
                            </button>
                          );
                        })}
                    </div>
                  </fieldset>
                )
              ) : product.flavorOptions.length > 0 && (
                <>
                  <label className="text-xs font-heading font-bold text-gray-300 block uppercase">Saveur:</label>
                  <div className="flex flex-wrap gap-2">
                    {product.flavorOptions.map((flavor, index) => (
                      <button
                        key={`${flavor.id ?? flavor.name}-${index}`}
                        onClick={() => { void handleFlavorSelect(flavor); }}
                        className={`px-4 py-2 rounded-lg border text-sm font-bold transition-all ${selectedFlavor === flavor.name ? 'bg-[#d90429] text-white border-[#d90429]' : 'bg-[#1a1a1a] border-white/10 text-gray-300 hover:border-white/30'}`}
                      >{flavor.name}</button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Quantity Selector & Add to Cart on the SAME ROW */}
          <div className="flex flex-nowrap items-center gap-4 pt-4">
            <div className="flex shrink-0 items-center border border-white/10 rounded-xl bg-[#1a1a1a] px-3 h-[52px]">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="text-gray-400 hover:text-white px-2 font-bold">-</button>
              <span className="w-8 text-center font-bold text-white text-sm">{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)} className="text-gray-400 hover:text-white px-2 font-bold">+</button>
            </div>
            <button
              onClick={() => {
                if (variants.length > 0) {
                  if (!selectedVariant || !variantSku(selectedVariant)) {
                    showToast(`Sélectionnez ${hasVariantFlavors ? "une saveur" : "une variante"} avec un SKU valide.`);
                    return;
                  }
                  void addToCart({
                    ...product,
                    variantSku: variantSku(selectedVariant),
                    variantLabel: selectedVariantLabel,
                    price: variantUnitPrice(selectedVariant),
                    originalPrice: Number(selectedVariant.salePrice ?? selectedVariant.sale_price) > 0
                      && Number(selectedVariant.salePrice ?? selectedVariant.sale_price) < Number(selectedVariant.price)
                      ? Number(selectedVariant.price)
                      : null,
                    stock: Number(selectedVariant.stock ?? 0),
                    inStock: Number(selectedVariant.stock ?? 0) > 0,
                  }, selectedVariantLabel, "", quantity);
                } else {
                  void addToCart(product, selectedFlavor, selectedSize, quantity);
                }
              }}
              disabled={variantsLoading || (variants.length > 0
                ? !selectedVariant || !variantSku(selectedVariant) || Number(selectedVariant.stock ?? 0) <= 0
                : !product.inStock || Boolean(loadError))}
              className="min-w-0 flex-1 bg-[#d90429] hover:bg-[#b0021f] disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-heading font-black text-xs uppercase tracking-wider h-[52px] px-6 rounded-xl shadow-xl shadow-[#d90429]/30 flex items-center justify-center gap-3 transition-all"
            >
              <ShoppingCart className="w-5 h-5" /> {variantsLoading ? 'VÉRIFICATION DU STOCK' : (hasVariants ? selectedVariantInStock : product.inStock) ? 'AJOUTER AU PANIER' : 'INDISPONIBLE'}
            </button>
          </div>

        </div>

        <aside className="space-y-4 lg:col-span-12 xl:col-span-2" aria-label="Services et offres Protein Store Tunisia">
        <div className="overflow-hidden rounded-2xl border border-white/15 bg-[#0d1013] shadow-xl shadow-black/30">
          {[
            { Icon: Truck, title: "Livraison offerte", detail: `dès ${FREE_SHIPPING_THRESHOLD} TND` },
            { Icon: ShieldCheck, title: "Paiement", detail: "à la livraison" },
            { Icon: Headphones, title: "Service client", detail: "à votre écoute" },
            { Icon: BadgeCheck, title: "Produits", detail: "100% originaux" },
          ].map(({ Icon, title, detail }, index) => (
            <div key={title} className={`flex min-h-[82px] items-center gap-4 px-5 py-4 ${index > 0 ? 'border-t border-white/10' : ''}`}>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#f0143c]/30 bg-[#d90429]/10"><Icon className="h-6 w-6 text-[#ff3457]" strokeWidth={1.9} /></span>
              <p className="text-sm leading-snug text-gray-200"><span className="font-extrabold">{title}</span><br /><span className="text-gray-400">{detail}</span></p>
            </div>
          ))}
        </div>

          {/* Pack Builder Promo Banner */}
          <button
        type="button"
        onClick={() => navigateTo("pack-builder")}
        className="group relative flex min-h-[205px] w-full items-center overflow-hidden rounded-2xl border border-[#ff2349]/80 bg-gradient-to-br from-[#4b0715] via-[#1c080e] to-[#080808] p-5 text-left shadow-xl shadow-[#d90429]/10 transition-all hover:-translate-y-1 hover:border-[#ff526d] hover:shadow-[#d90429]/20"
        aria-label="Découvrir les packs exclusifs"
      >
        <div className="relative z-10 max-w-[78%]">
          <p className="text-sm font-black uppercase leading-tight text-white">Composez<br />votre pack</p>
          <p className="mt-2 text-xs font-bold uppercase leading-tight text-gray-200">Découvrez nos packs exclusifs</p>
          <span className="mt-2 block text-3xl font-black leading-none text-[#ff3457]">JUSQU’À 20%</span>
        </div>
        <div className="absolute -right-3 top-4 text-[#ff2349]/25 transition-transform group-hover:scale-110"><PackageOpen size={132} strokeWidth={1.1} /></div>
        <span className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#f0143c] text-white shadow-lg shadow-[#f0143c]/30"><ArrowRight size={20} /></span>
          </button>
        </aside>
      </div>

      {/* Nutrition Facts */}
      {product.nutritionFact && (
        <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-8 space-y-6">
          <h2 className="font-heading font-black text-xl text-white uppercase flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#d90429]" /> VALEURS NUTRITIONNELLES
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: 'PROTÉINE', value: `${product.nutritionFact.protein}g`, bar: 90, color: 'bg-[#d90429]' },
              { label: 'GLUCIDES', value: `${product.nutritionFact.carbs}g`, bar: 20, color: 'bg-blue-400' },
              { label: 'LIPIDES', value: `${product.nutritionFact.fat}g`, bar: 10, color: 'bg-amber-400' },
              { label: 'CALORIES', value: `${product.nutritionFact.calories} kcal`, bar: 60, color: 'bg-emerald-400' },
            ].map(({ label, value, bar, color }) => (
              <div key={label} className="bg-[#111] border border-white/5 p-4 rounded-xl space-y-2">
                <span className="text-xs text-gray-400 uppercase font-heading font-bold">{label}</span>
                <div className="font-heading font-black text-2xl text-white">{value}</div>
                <div className="w-full bg-[#2a2a2a] h-1.5 rounded-full overflow-hidden">
                  <div className={`${color} h-full`} style={{ width: `${bar}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Long Description */}
      {product.longDescription && product.longDescription !== product.shortDescription && (
        <section className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-3">
          <h2 className="font-heading font-black text-xl text-white uppercase">Description du produit</h2>
          <p
            ref={descriptionRef}
            style={descriptionExpanded ? undefined : { display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 10, overflow: 'hidden' }}
            className="text-sm text-gray-300 leading-7 sm:leading-8 whitespace-normal"
          >
            {product.longDescription}
          </p>
          {descriptionHasMore && (
            <button type="button" onClick={() => setDescriptionExpanded((expanded) => !expanded)} className="text-sm font-bold text-[#ff526d] hover:text-white transition-colors">
              {descriptionExpanded ? 'Afficher moins' : 'Lire la suite / Afficher la suite'}
            </button>
          )}

          {product.productOptions && (
            <div className="space-y-2 pt-2">
              {[
                ['Pointures / tailles', product.productOptions.sizes],
                ['Couleurs', product.productOptions.colors],
                ['Styles', product.productOptions.styles],
              ].filter(([, values]) => Array.isArray(values) && values.length > 0).map(([label, values]) => (
                <p key={label} className="text-xs text-gray-300"><span className="font-bold text-white">{label} :</span> {values.join(', ')}</p>
              ))}
              {product.productOptions.capacityLiters !== '' && product.productOptions.capacityLiters != null && (
                <p className="text-xs text-gray-300"><span className="font-bold text-white">Contenance :</span> {product.productOptions.capacityLiters} L</p>
              )}
            </div>
          )}
        </section>
      )}

      {/* Reviews */}
      <div className="space-y-8">
        <h2 className="font-heading font-black text-xl text-white uppercase">AVIS CLIENTS ({reviews.length})</h2>
        {reviews.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reviews.map(r => (
              <div key={r.id} className="bg-[#1a1a1a] border border-white/10 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">{r.customerName}</span>
                  <div className="flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} />)}</div>
                </div>
                <p className="text-xs text-gray-300">{r.comment}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Aucun avis pour l'instant. Soyez le premier !</p>
        )}

        {/* Review Form */}
        <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 space-y-4">
          <h3 className="font-black text-white uppercase text-sm">LAISSER UN AVIS</h3>
          <form onSubmit={handleReviewSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input required placeholder="Votre nom *" value={reviewForm.customerName}
                onChange={e => setReviewForm(p => ({ ...p, customerName: e.target.value }))}
                className="bg-[#111] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#d90429]"
              />
              <input type="email" required placeholder="Email *" value={reviewForm.email}
                onChange={e => setReviewForm(p => ({ ...p, email: e.target.value }))}
                className="bg-[#111] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#d90429]"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 uppercase font-bold">Note:</span>
              {[1,2,3,4,5].map(n => (
                <button type="button" key={n} onClick={() => setReviewForm(p => ({ ...p, rating: n }))}>
                  <Star className={`w-5 h-5 transition-colors ${n <= reviewForm.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} />
                </button>
              ))}
            </div>
            <textarea required placeholder="Votre commentaire..." rows={3} value={reviewForm.comment}
              onChange={e => setReviewForm(p => ({ ...p, comment: e.target.value }))}
              className="w-full bg-[#111] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#d90429] resize-none"
            />
            <button type="submit" disabled={submittingReview}
              className="bg-[#d90429] hover:bg-[#b0021f] disabled:opacity-60 text-white font-black text-xs uppercase tracking-wider px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
            >
              {submittingReview ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Envoyer l'avis
            </button>
          </form>
        </div>
      </div>

      {/* Related Products */}
      {related.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-heading font-black text-xl text-white uppercase">MÊME CATÉGORIE</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-400" aria-live="polite">{relatedIndex + 1} / {related.length}</span>
              <button
                type="button"
                onClick={() => scrollRelated(-1)}
                disabled={relatedIndex === 0}
                aria-label="Produit recommandé précédent"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/70 text-white transition-colors hover:border-[#d90429] hover:bg-[#d90429] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => scrollRelated(1)}
                disabled={relatedIndex >= related.length - 1}
                aria-label="Produit recommandé suivant"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/70 text-white transition-colors hover:border-[#d90429] hover:bg-[#d90429] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div
            ref={relatedViewportRef}
            onScroll={(event) => {
              const { scrollLeft, clientWidth } = event.currentTarget;
              if (clientWidth > 0) setRelatedIndex(Math.min(related.length - 1, Math.round(scrollLeft / clientWidth)));
            }}
            className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth scrollbar-none"
            aria-label="Produits recommandés"
          >
            {related.map((item) => (
              <div key={item.id} className="w-full shrink-0 snap-center px-1 sm:px-2">
                <ProductCard product={item} />
              </div>
            ))}
          </div>
        </div>
      )}

      {imagePreviewOpen && (activeImage || product.image) && createPortal(
        <div
          role="presentation"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={() => setImagePreviewOpen(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label={`Aperçu de ${product.name}`}
            className="relative flex max-h-full w-full max-w-5xl items-center justify-center rounded-2xl border border-white/15 bg-[#111] p-4 shadow-2xl sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setImagePreviewOpen(false)}
              className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-white transition-colors hover:bg-[#d90429] focus:outline-none focus:ring-2 focus:ring-white/80"
              aria-label="Fermer l'aperçu"
              autoFocus
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
            <img
              src={activeImage || product.image}
              alt={product.name}
              className="max-h-[85vh] max-w-full object-contain"
            />
          </section>
        </div>,
        document.body
      )}
    </div>
  );
};
