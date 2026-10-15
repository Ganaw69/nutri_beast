import React, { useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "../context/CartContext";
import {
  categoryService,
  customPackService,
  hydrateProductsWithImages,
  iriToId,
  mediaUrl,
  packService,
  productService,
  resolveProductImage,
} from "../services/api";
import { Check, Loader2, Minus, PackagePlus, Plus, Search, ShoppingBag, Trash2 } from "lucide-react";
import { buildCategoryTree, mergeCategorySources } from "../utils/categoryTree";

const idOf = (value) => {
  if (value == null) return null;
  if (typeof value === "object") return value.id ?? iriToId(value["@id"] || value.iri);
  return iriToId(value) ?? value;
};
const currency = (price) => `${Number(price || 0).toFixed(2)} TND`;
const packImageUrl = (pack) => {
  const value = pack?.imageUrl || pack?.image;
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  const filename = String(value).replace(/^\/?uploads\/pack\//, "").replace(/^\/+/, "");
  return mediaUrl(`pack/${filename}`);
};
const booleanValue = (value, fallback = false) => {
  if (value === true || value === 1 || value === "1" || String(value).toLowerCase() === "true") return true;
  if (value === false || value === 0 || value === "0" || String(value).toLowerCase() === "false") return false;
  return fallback;
};
const activeValue = (record) => booleanValue(record.isActive ?? record.is_active ?? record.active ?? record.enabled, true);
const isCustomizable = (pack) => booleanValue(pack.isCustomizable ?? pack.is_customizable ?? pack.customizable);
const packIsCurrent = (pack) => {
  const now = Date.now();
  const startDate = pack.startDate ?? pack.start_date;
  const endDate = pack.endDate ?? pack.end_date;
  return activeValue(pack)
    && (!startDate || new Date(startDate).getTime() <= now)
    && (!endDate || new Date(endDate).getTime() >= now);
};
const readError = (error) => /\b(401|403)\b|jwt token/i.test(error?.message || "")
  ? "L’API bloque encore la lecture publique de cette ressource. Vérifiez les permissions GET des packs et des produits."
  : error?.message || "Une erreur est survenue pendant le chargement.";

const collectionItems = (response) => Array.isArray(response)
  ? response
  : response?.["hydra:member"] || response?.member || response?.items || [];
const variantsOf = (product) => {
  const variants = product?.variants || product?.productVariants || product?.product_variants || [];
  if (Array.isArray(variants)) return variants;
  return variants?.['hydra:member'] || variants?.member || variants?.items || [];
};
const variantSkuOf = (variant) => variant?.sku || variant?.SKU || "";
const variantLabel = (variant) => variant?.name || variant?.label || variant?.title || variantSkuOf(variant);

// These are the seven product families displayed in the primary navbar. Keep
// this explicit list so auxiliary roots (packs, snacks, accessories, etc.)
// can never enter the pack-building flow.
const PACK_BUILDER_ROOT_CATEGORY_NAMES = [
  "Santé & Bien-être",
  "Protéines",
  "Prise de Masse & Glucides",
  "Créatine",
  "Acides Aminés & BCAA",
  "Pré-Workout & Boosters",
  "Perte de Poids",
];

const normaliseCategoryName = (value) => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("fr")
  .replace(/[^a-z0-9]+/g, "");

export const PackBuilderPage = () => {
  const {
    customPackDraft, setCustomPackDraft, selectedCustomPackId, setSelectedCustomPackId,
    customPackQuote, setCustomPackQuote, addCustomPackToCart, navigateTo, showToast,
  } = useCart();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customPacks, setCustomPacks] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [productsError, setProductsError] = useState("");
  const [packsError, setPacksError] = useState("");
  const [categoriesError, setCategoriesError] = useState("");
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const [quoteSignature, setQuoteSignature] = useState("");
  const [variantSelections, setVariantSelections] = useState({});
  const [error, setError] = useState("");
  const quoteRequestId = useRef(0);

  useEffect(() => {
    let current = true;
    Promise.allSettled([
      productService.getAllPages({ isActive: true, packing: true }, true),
      categoryService.getMain(),
      packService.getAllPages({ itemsPerPage: 100, "order[position]": "asc" }, true),
    ]).then(async ([productResult, mainCategoryResult, packResult]) => {
      const productData = productResult.status === "fulfilled" ? productResult.value : null;
      const mainCategoryData = mainCategoryResult.status === "fulfilled" ? mainCategoryResult.value : null;
      const packData = packResult.status === "fulfilled" ? packResult.value : null;
      const sourceProducts = collectionItems(productData).filter((product) => activeValue(product) !== false && product.packing === true);
      let readyProducts = sourceProducts.map((product) => ({
        ...product,
        mainImage: product.mainImage ?? product.mainImageUrl ?? product.main_image_url,
      }));
      try {
        readyProducts = await hydrateProductsWithImages(readyProducts, true);
      } catch {
        // Keep product cards visible if optional image metadata cannot load.
      }
      const readyPacks = collectionItems(packData).filter((pack) =>
        String(pack.type || pack.packType || "").toUpperCase() === "CUSTOM"
        && idOf(pack) != null
        && isCustomizable(pack) && packIsCurrent(pack)
      );
      if (current) {
        setProducts(readyProducts);
        // Build the complete hierarchy before selecting roots. Slicing the
        // flattened API response can otherwise retain one root and several of
        // its children, rather than the seven navbar categories.
        const categoryTree = buildCategoryTree(mergeCategorySources(null, mainCategoryData));
        const categoriesByName = new Map(categoryTree.map((category) => [
          normaliseCategoryName(category.name),
          category,
        ]));
        setCategories(PACK_BUILDER_ROOT_CATEGORY_NAMES
          .map((name) => categoriesByName.get(normaliseCategoryName(name)))
          .filter(Boolean));
        setCustomPacks(readyPacks);
        setProductsError(productResult.status === "rejected" ? readError(productResult.reason) : "");
        setCategoriesError(mainCategoryResult.status === "rejected" ? readError(mainCategoryResult.reason) : "");
        setPacksError(packResult.status === "rejected" ? readError(packResult.reason) : "");
        if (!readyPacks.some((pack) => String(idOf(pack)) === String(selectedCustomPackId))) {
          setSelectedCustomPackId(idOf(readyPacks[0]) ?? null);
          setCustomPackDraft([]);
          setCustomPackQuote(null);
        }
      }
    }).catch((err) => { if (current) setError(readError(err)); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, []);

  const selectedPack = customPacks.find((pack) => String(idOf(pack)) === String(selectedCustomPackId)) || null;
  const subcategories = categories.find((category) => String(category.id) === String(categoryId))?.children || [];
  const productById = useMemo(() => new Map(products.map((product) => [String(product.id ?? iriToId(product["@id"])), product])), [products]);
  const selectedCount = customPackDraft.length;
  const totalUnits = customPackDraft.reduce((total, line) => total + Number(line.quantity || 0), 0);
  const minProducts = 2;
  const maxProducts = 5;
  const filteredProducts = useMemo(() => products.filter((product) => {
    if (product.packing !== true || !subcategoryId) return false;
    const matchesText = `${product.name || ""} ${product.brand?.name || ""} ${product.category?.name || ""}`.toLocaleLowerCase("fr").includes(search.trim().toLocaleLowerCase("fr"));
    const matchesCategory = String(idOf(product.category ?? product.categoryId)) === String(subcategoryId);
    return matchesText && matchesCategory;
  }), [products, search, subcategoryId]);

  const chooseCategory = (id) => { setCategoryId(String(id)); setSubcategoryId(""); setSearch(""); setStep(2); };
  const chooseSubcategory = (id) => { setSubcategoryId(String(id)); setSearch(""); setStep(3); };

  const quoteItems = customPackDraft.map(({ productId, quantity, variantSku }) => ({ productId, quantity, ...(variantSku ? { variantSku } : {}) }));
  const currentQuoteSignature = selectedPack ? JSON.stringify({ packId: idOf(selectedPack), items: [...quoteItems].sort((a, b) => Number(a.productId) - Number(b.productId)) }) : "";
  const variantsAreSelected = customPackDraft.every((line) => variantsOf(productById.get(String(line.productId))).length === 0 || Boolean(line.variantSku));
  const canQuote = Boolean(selectedPack && idOf(selectedPack) != null && selectedCount >= minProducts && selectedCount <= maxProducts && variantsAreSelected && customPackDraft.every((line) => Number.isInteger(Number(line.quantity)) && Number(line.quantity) > 0));
  const quoteIsCurrent = Boolean(canQuote && customPackQuote && quoteSignature === currentQuoteSignature);

  const updateSelection = (productId, quantity, variantSku) => {
    const product = productById.get(String(productId));
    const nextQuantity = Number(quantity);
    const variant = variantsOf(product).find((entry) => variantSkuOf(entry) === variantSku);
    const availableStock = Number(variant?.stock ?? product?.stock ?? 0);
    if (!product || nextQuantity < 0 || nextQuantity > availableStock) return;
    setCustomPackQuote(null);
    setCustomPackDraft((current) => {
      const existing = current.find((line) => String(line.productId) === String(productId));
      if (nextQuantity === 0) return current.filter((line) => String(line.productId) !== String(productId));
      if (existing) return current.map((line) => String(line.productId) === String(productId) ? { ...line, quantity: nextQuantity, variantSku: variantSku || "" } : line);
      if (current.length >= maxProducts) {
        showToast(`Ce pack accepte au maximum ${maxProducts} produits distincts.`);
        return current;
      }
      return [...current, { productId, quantity: nextQuantity, variantSku: variantSku || "" }];
    });
  };

  const getSelectedQuantity = (productId) => Number(customPackDraft.find((line) => String(line.productId) === String(productId))?.quantity || 0);

  useEffect(() => {
    const requestId = ++quoteRequestId.current;
    setQuoteSignature("");
    setCustomPackQuote(null);
    setQuoteError("");
    if (!canQuote) { setQuoting(false); return undefined; }

    const timer = window.setTimeout(async () => {
      setQuoting(true);
      try {
        const quote = await customPackService.quote(idOf(selectedPack), quoteItems);
        if (quoteRequestId.current !== requestId) return;
        setCustomPackQuote(quote);
        setQuoteSignature(currentQuoteSignature);
      } catch (err) {
        if (quoteRequestId.current === requestId) setQuoteError(readError(err));
      } finally {
        if (quoteRequestId.current === requestId) setQuoting(false);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [canQuote, currentQuoteSignature, selectedPack]);

  const clearSelection = () => {
    if (customPackDraft.length && !window.confirm("Vider toute la composition du pack ?")) return;
    setCustomPackDraft([]);
    setCustomPackQuote(null);
  };

  const addQuotedPack = () => {
    if (!quoteIsCurrent || !selectedPack) return;
    const quoteWithVariants = {
      ...customPackQuote,
      items: (customPackQuote.items || []).map((item) => {
        const draftLine = customPackDraft.find((line) => String(idOf(line.productId)) === String(idOf(item.productId)));
        return { ...item, variantSku: item.variantSku || draftLine?.variantSku };
      }),
    };
    const added = addCustomPackToCart({ ...selectedPack, id: idOf(selectedPack), imageUrl: packImageUrl(selectedPack) }, quoteWithVariants);
    if (added) navigateTo("cart");
  };

  const addSelectionToCart = addQuotedPack;

  return (
    <div className="min-h-screen bg-[#131313] px-4 py-8 pb-20 text-[#e5e2e1] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-7 border-b border-white/10 pb-5">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#ff526d]">Composez votre sélection</p>
          <h1 className="mt-2 text-3xl font-black uppercase text-white sm:text-5xl">Votre pack personnalisé</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-400">Choisissez des produits de notre catalogue. Le prix et la remise affichés dans le récapitulatif sont calculés par le serveur.</p>
          <button type="button" onClick={() => navigateTo("packs")} className="mt-3 text-xs font-bold text-gray-400 underline decoration-[#d90429] underline-offset-4 hover:text-white">Voir aussi les packs prédéfinis</button>
        </header>

        {loading && <div className="mb-6 flex items-center gap-3 rounded-lg border border-white/10 bg-[#181818] p-4 text-sm text-gray-300" role="status"><Loader2 className="h-5 w-5 animate-spin text-[#d90429]" />Chargement du catalogue…</div>}
        {(error || productsError || packsError || categoriesError) && <div role="alert" className="mb-6 space-y-1 rounded-lg border border-[#d90429]/40 bg-[#d90429]/10 p-4 text-sm text-red-100">{[productsError && `Produits : ${productsError}`, categoriesError && `Catégories : ${categoriesError}`, packsError && `Packs : ${packsError}`, error].filter(Boolean).map((message) => <p key={message}>{message}</p>)}</div>}
        {loading ? <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]"><div className="min-h-64 animate-pulse rounded-xl border border-white/10 bg-[#181818]" /><div className="min-h-64 animate-pulse rounded-xl border border-white/10 bg-[#181818]" /></div> : (
          <>
            {customPacks.length > 1 && <label className="mb-5 flex flex-col gap-2 text-xs font-bold uppercase tracking-wider text-gray-400 sm:max-w-sm">Modèle de composition<select value={selectedCustomPackId || ""} onChange={(event) => { setSelectedCustomPackId(event.target.value); setCustomPackDraft([]); setCustomPackQuote(null); }} className="rounded-lg border border-white/10 bg-[#181818] px-3 py-3 text-sm normal-case tracking-normal text-white"><option value="">Choisir un modèle</option>{customPacks.map((pack) => <option key={idOf(pack)} value={idOf(pack)}>{pack.name}</option>)}</select></label>}
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
              <section>
                <div className="mb-5 flex flex-wrap gap-2">{["Choisissez la catégorie", "Choisissez la sous-catégorie", "Choisissez vos produits"].map((label, index) => <button key={label} type="button" onClick={() => { if (index === 0) { setStep(1); setCategoryId(""); setSubcategoryId(""); } else if (index === 1 && categoryId) { setStep(2); setSubcategoryId(""); } }} className={`rounded-full border px-3 py-2 text-xs font-bold ${step === index + 1 ? "border-[#d90429] bg-[#d90429]/15 text-white" : "border-white/10 text-gray-500"}`}>{index + 1}. {label}</button>)}</div>
                {step === 1 ? <div><h2 className="mb-4 text-xl font-black text-white">1. Choisissez la catégorie</h2><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{categories.map((category) => <button type="button" key={category.id} onClick={() => chooseCategory(category.id)} className="rounded-xl border border-white/10 bg-[#181818] p-6 text-left text-lg font-black text-white hover:border-[#d90429]">{category.name}<span className="mt-2 block text-xs font-medium text-gray-500">{category.children?.length || 0} sous-catégorie(s)</span></button>)}</div>{!categories.length && <p className="rounded-xl bg-[#181818] p-6 text-sm text-gray-400">Aucune catégorie disponible.</p>}</div> : step === 2 ? <div><h2 className="mb-4 text-xl font-black text-white">2. Choisissez la sous-catégorie</h2><p className="mb-4 text-sm text-gray-400">{categories.find((category) => String(category.id) === String(categoryId))?.name}</p><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{subcategories.map((subcategory) => <button type="button" key={subcategory.id} onClick={() => chooseSubcategory(subcategory.id)} className="rounded-xl border border-white/10 bg-[#181818] p-6 text-left text-lg font-black text-white hover:border-[#d90429]">{subcategory.name}</button>)}</div>{!subcategories.length && <p className="rounded-xl bg-[#181818] p-6 text-sm text-gray-400">Aucune sous-catégorie disponible.</p>}</div> : <>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row">
                  <label className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un produit ou une marque" className="w-full rounded-lg border border-white/10 bg-[#181818] py-3 pl-10 pr-3 text-sm text-white placeholder:text-gray-500 focus:border-[#d90429] focus:outline-none" /></label>
                  <p className="self-center text-sm text-gray-400">{categories.find((category) => String(category.id) === String(categoryId))?.name} / {subcategories.find((subcategory) => String(subcategory.id) === String(subcategoryId))?.name}</p>
                </div>
                {productsError ? <div className="rounded-xl border border-white/10 bg-[#181818] p-8 text-center text-sm text-gray-300">Le catalogue des produits n’a pas pu être chargé. Consultez le message d’erreur ci-dessus.</div> : filteredProducts.length ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{filteredProducts.map((product) => {
                  const productId = product.id ?? iriToId(product["@id"]);
                  const selectedQuantity = getSelectedQuantity(productId);
                  const variants = variantsOf(product);
                  const selectedLine = customPackDraft.find((line) => String(line.productId) === String(productId));
                  const selectedSku = variantSelections[productId] ?? selectedLine?.variantSku ?? "";
                  const selectedVariant = variants.find((variant) => variantSkuOf(variant) === selectedSku);
                  const stock = Math.max(0, Number(selectedVariant?.stock ?? product.stock ?? 0));
                  const available = activeValue(product) !== false && stock > 0;
                  const requiresVariant = variants.length > 0;
                  const image = resolveProductImage(product, null);
                  const reachedLimit = selectedQuantity === 0 && selectedCount >= maxProducts;
                  return <article key={productId} className="flex flex-col overflow-hidden rounded-[14px] border border-white/10 bg-[#111]">
                    <div className="relative flex aspect-square items-center justify-center bg-[#f0f0f0] p-5">{image ? <img src={image} alt={product.name} loading="lazy" className="h-full w-full object-contain" /> : <ShoppingBag className="h-12 w-12 text-gray-400" />}{!available && <span className="absolute right-3 top-3 rounded bg-black/80 px-2 py-1 text-[9px] font-black uppercase text-white">Indisponible</span>}</div>
                    <div className="flex flex-1 flex-col gap-3 p-4 text-white">
                      <div className="flex-1"><p className="text-[9px] font-bold uppercase tracking-widest text-gray-500">{product.category?.name || "Nutrition sportive"}{product.brand?.name ? ` · ${product.brand.name}` : ""}</p><h2 className="mt-1 line-clamp-2 min-h-10 text-sm font-black uppercase leading-5">{product.name}</h2><p className="mt-1 text-[10px] text-gray-500">{available ? `${stock} en stock` : "Rupture de stock"}</p></div>
                      {requiresVariant && <label className="text-[10px] font-bold text-gray-400">Variante<select value={selectedSku} onChange={(event) => { const sku = event.target.value; setVariantSelections((current) => ({ ...current, [productId]: sku })); if (selectedQuantity > 0) updateSelection(productId, selectedQuantity, sku); }} className="mt-1 w-full rounded-lg border border-white/10 bg-[#181818] px-3 py-2 text-xs text-white"><option value="">Choisir une variante</option>{variants.map((variant, index) => <option key={variantSkuOf(variant) || index} value={variantSkuOf(variant)} disabled={!variantSkuOf(variant)}>{variantLabel(variant)}{variant.stock != null ? ` - ${variant.stock} en stock` : ""}</option>)}</select></label>}
                      {selectedQuantity > 0 ? <div className="flex items-center justify-between gap-2 rounded-lg border border-[#d90429]/50 bg-[#d90429]/10 p-2"><span className="text-[10px] font-black uppercase text-[#ff7186]">Dans votre pack</span><div className="flex items-center gap-3"><button type="button" onClick={() => updateSelection(productId, selectedQuantity - 1, selectedSku)} aria-label={`Retirer une unité de ${product.name}`} className="rounded bg-[#252525] p-1.5 text-white hover:bg-[#d90429]"><Minus className="h-3.5 w-3.5" /></button><span className="min-w-4 text-center text-xs font-black">{selectedQuantity}</span><button type="button" disabled={selectedQuantity >= stock} onClick={() => updateSelection(productId, selectedQuantity + 1, selectedSku)} aria-label={`Ajouter une unité de ${product.name}`} className="rounded bg-[#252525] p-1.5 text-white hover:bg-[#d90429] disabled:cursor-not-allowed disabled:opacity-40"><Plus className="h-3.5 w-3.5" /></button></div></div> : <button type="button" disabled={!available || reachedLimit || (requiresVariant && !selectedSku)} onClick={() => updateSelection(productId, 1, selectedSku)} className="inline-flex items-center justify-center gap-2 rounded bg-[#d90429] px-3 py-2.5 text-[10px] font-black uppercase text-white hover:bg-[#b0021f] disabled:cursor-not-allowed disabled:bg-[#333] disabled:text-gray-500"><PackagePlus className="h-4 w-4" /> Ajouter au pack</button>}
                    </div>
                  </article>;
                })}</div> : <div className="rounded-xl border border-white/10 bg-[#181818] p-8 text-center text-sm text-gray-400">Aucun produit activé pour la composition dans cette sous-catégorie.</div>}
                </>}
              </section>

              <aside className="rounded-xl border border-white/10 bg-[#181818] p-5 lg:sticky lg:top-6">
                <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
                  <div><h2 className="font-black uppercase text-white">Votre composition</h2><p className="mt-1 text-[11px] text-gray-400">{selectedCount} produits distincts - {totalUnits} unites</p></div>
                  {selectedCount > 0 && <button type="button" onClick={clearSelection} title="Vider la selection" className="rounded p-2 text-gray-500 hover:bg-white/5 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>}
                </div>
                <div className="mt-4 max-h-[42vh] space-y-3 overflow-y-auto pr-1">
                  {!customPackDraft.length ? <div className="rounded-lg border border-dashed border-white/15 px-4 py-8 text-center"><ShoppingBag className="mx-auto h-7 w-7 text-gray-600" /><p className="mt-3 text-xs leading-5 text-gray-400">Votre pack est vide. Ajoutez entre 2 et 5 produits distincts.</p></div> : customPackDraft.map((line) => {
                    const product = productById.get(String(line.productId));
                    if (!product) return null;
                    const variant = variantsOf(product).find((entry) => variantSkuOf(entry) === line.variantSku);
                    return <div key={line.productId} className="flex items-center gap-3 rounded-lg bg-[#111] p-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-[#f0f0f0] p-1">{resolveProductImage(product, null) ? <img src={resolveProductImage(product, null)} alt="" className="h-full w-full object-contain" /> : <ShoppingBag className="h-4 w-4 text-gray-400" />}</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-white">{product.name}</p><p className="mt-1 text-[10px] text-gray-400">{variant ? variantLabel(variant) : line.variantSku || ""} x {line.quantity}</p></div><button type="button" onClick={() => updateSelection(line.productId, 0)} aria-label={`Retirer ${product.name}`} className="p-1.5 text-gray-500 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button></div>;
                  })}
                </div>
                <div className="mt-4 space-y-2 border-t border-white/10 pt-4 text-xs">
                  {!selectedPack ? <p className="text-amber-300">Aucune configuration CUSTOM active et personnalisable n'est disponible.</p> : <p className="text-gray-400">Configuration du pack : <span className="text-white">{selectedPack.name}</span></p>}
                  {selectedCount < minProducts && <p className="text-amber-300">Ajoutez encore {minProducts - selectedCount} produit(s) distinct(s).</p>}
                  {selectedCount > maxProducts && <p className="text-red-300">Un pack accepte au maximum 5 produits distincts.</p>}
                  {!variantsAreSelected && <p className="text-amber-300">Choisissez une variante pour chaque produit concerne.</p>}
                  {quoting && <p className="flex items-center gap-2 text-gray-300"><Loader2 className="h-4 w-4 animate-spin" />Calcul du devis par le serveur...</p>}
                  {quoteError && <p role="alert" className="text-red-300">{quoteError}</p>}
                  {quoteIsCurrent && <>
                    <p className="text-gray-400">Produits distincts confirmes : <span className="text-white">{customPackQuote.distinctProductCount ?? "indisponible"}</span></p>
                    <div className="flex justify-between text-gray-300"><span>Prix de base</span><span>{currency(customPackQuote.basePrice)}</span></div>
                    <div className="flex justify-between text-emerald-400"><span>Remise ({customPackQuote.discountPercentage}%)</span><span>-{currency(customPackQuote.discountAmount)}</span></div>
                    <div className="flex justify-between border-t border-white/10 pt-3 text-base font-black text-white"><span>Prix du pack</span><span>{currency(customPackQuote.finalPrice)}</span></div>
                    <div className="space-y-2 pt-2">{(customPackQuote.items || []).map((item, index) => <div key={`${item.productId}-${item.variantSku || ""}-${index}`} className="flex justify-between gap-3 text-[10px] text-gray-400"><span>{item.productName || item.name || `Produit ${item.productId}`} {item.variantSku ? `(${item.variantSku})` : ""} x {item.quantity}</span><span>{item.totalPrice != null ? currency(item.totalPrice) : item.unitPrice != null ? currency(item.unitPrice) : ""}</span></div>)}</div>
                  </>}
                </div>
                <button type="button" onClick={addSelectionToCart} disabled={!quoteIsCurrent || quoting} className="mt-4 w-full rounded-lg bg-[#d90429] px-4 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-[#d90429]/15 hover:bg-[#b0021f] disabled:cursor-not-allowed disabled:opacity-50">Ajouter le pack au panier</button>
              </aside>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PackBuilderPage;
