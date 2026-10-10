import React, { useEffect, useMemo, useState } from "react";
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

const idOf = (value) => {
  if (value == null) return null;
  if (typeof value === "object") return value.id ?? iriToId(value["@id"] || value.iri);
  return iriToId(value) ?? value;
};
const priceOf = (product) => Number(product.currentPrice ?? product.promotionalPrice ?? product.salePrice ?? product.price ?? 0);
const currency = (price) => `${Number(price || 0).toFixed(2)} TND`;
const packImageUrl = (pack) => {
  const value = pack?.imageUrl || pack?.image;
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  const filename = String(value).replace(/^\/?uploads\/pack\//, "").replace(/^\/+/, "");
  return mediaUrl(`pack/${filename}`);
};
const activeValue = (record) => record.isActive ?? record.active ?? record.enabled ?? true;
const packIsCurrent = (pack) => {
  const now = Date.now();
  return activeValue(pack) !== false
    && (!pack.startDate || new Date(pack.startDate).getTime() <= now)
    && (!pack.endDate || new Date(pack.endDate).getTime() >= now);
};
const readError = (error) => /\b(401|403)\b|jwt token/i.test(error?.message || "")
  ? "L’API bloque encore la lecture publique de cette ressource. Vérifiez les permissions GET des packs et des produits."
  : error?.message || "Une erreur est survenue pendant le chargement.";

const collectionItems = (response) => Array.isArray(response)
  ? response
  : response?.["hydra:member"] || response?.member || response?.items || [];

export const PackBuilderPage = () => {
  const {
    customPackDraft, setCustomPackDraft, selectedCustomPackId, setSelectedCustomPackId,
    customPackQuote, setCustomPackQuote, addCustomPackToCart, addProductBundleToCart, navigateTo, showToast,
  } = useCart();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customPacks, setCustomPacks] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [loading, setLoading] = useState(true);
  const [productsError, setProductsError] = useState("");
  const [packsError, setPacksError] = useState("");
  const [categoriesError, setCategoriesError] = useState("");
  const [quoting, setQuoting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let current = true;
    Promise.allSettled([
      productService.getAllPages({ isActive: true }, true),
      categoryService.getAll({ isActive: true, itemsPerPage: 100 }, true),
      packService.getAll({ type: "CUSTOM", isActive: true, itemsPerPage: 100, "order[position]": "asc" }, true),
    ]).then(async ([productResult, categoryResult, packResult]) => {
      const productData = productResult.status === "fulfilled" ? productResult.value : null;
      const categoryData = categoryResult.status === "fulfilled" ? categoryResult.value : null;
      const packData = packResult.status === "fulfilled" ? packResult.value : null;
      const sourceProducts = collectionItems(productData).filter((product) => activeValue(product) !== false);
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
        String(pack.type || "").toUpperCase() === "CUSTOM"
        && (pack.isCustomizable === true || pack.customizable === true) && packIsCurrent(pack)
      );
      if (current) {
        setProducts(readyProducts);
        setCategories(collectionItems(categoryData)
          .filter((category) => activeValue(category) !== false)
          .map((category) => ({ ...category, id: idOf(category) }))
          .filter((category) => category.id != null));
        setCustomPacks(readyPacks);
        setProductsError(productResult.status === "rejected" ? readError(productResult.reason) : "");
        setCategoriesError(categoryResult.status === "rejected" ? readError(categoryResult.reason) : "");
        setPacksError(packResult.status === "rejected" ? readError(packResult.reason) : "");
        if (!readyPacks.some((pack) => String(pack.id) === String(selectedCustomPackId))) {
          setSelectedCustomPackId(readyPacks[0]?.id ?? null);
          setCustomPackDraft([]);
          setCustomPackQuote(null);
        }
      }
    }).catch((err) => { if (current) setError(readError(err)); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, []);

  const selectedPack = customPacks.find((pack) => String(pack.id) === String(selectedCustomPackId)) || null;
  const productById = useMemo(() => new Map(products.map((product) => [String(product.id ?? iriToId(product["@id"])), product])), [products]);
  const selectedCount = customPackDraft.length;
  const totalUnits = customPackDraft.reduce((total, line) => total + Number(line.quantity || 0), 0);
  const minProducts = Number(selectedPack?.minProducts ?? 1);
  const maxProducts = selectedPack?.maxProducts == null ? Infinity : Number(selectedPack.maxProducts);
  const estimatedTotal = customPackDraft.reduce((total, line) => {
    const product = productById.get(String(line.productId));
    return total + (product ? priceOf(product) * Number(line.quantity || 0) : 0);
  }, 0);
  const bundleHasValidSkus = customPackDraft.every((line) => Boolean(productById.get(String(line.productId))?.sku));
  const filteredProducts = useMemo(() => products.filter((product) => {
    const matchesText = `${product.name || ""} ${product.brand?.name || ""} ${product.category?.name || ""}`.toLocaleLowerCase("fr").includes(search.trim().toLocaleLowerCase("fr"));
    const matchesCategory = !categoryId || String(idOf(product.category ?? product.categoryId)) === String(categoryId);
    return matchesText && matchesCategory;
  }), [products, search, categoryId]);

  const updateSelection = (productId, quantity) => {
    const product = productById.get(String(productId));
    const nextQuantity = Number(quantity);
    if (!product || nextQuantity < 0 || nextQuantity > Number(product.stock ?? 0)) return;
    setCustomPackQuote(null);
    setCustomPackDraft((current) => {
      const existing = current.find((line) => String(line.productId) === String(productId));
      if (nextQuantity === 0) return current.filter((line) => String(line.productId) !== String(productId));
      if (existing) return current.map((line) => String(line.productId) === String(productId) ? { ...line, quantity: nextQuantity } : line);
      if (current.length >= maxProducts) {
        showToast(`Ce pack accepte au maximum ${maxProducts} produits distincts.`);
        return current;
      }
      return [...current, { productId, quantity: nextQuantity }];
    });
  };

  const getSelectedQuantity = (productId) => Number(customPackDraft.find((line) => String(line.productId) === String(productId))?.quantity || 0);

  const clearSelection = () => {
    if (customPackDraft.length && !window.confirm("Vider toute la composition du pack ?")) return;
    setCustomPackDraft([]);
    setCustomPackQuote(null);
  };

  const requestQuote = async () => {
    if (!selectedPack || selectedCount < minProducts || selectedCount > maxProducts || quoting) return;
    setQuoting(true);
    setError("");
    setCustomPackQuote(null);
    try {
      const quote = await customPackService.quote(selectedPack.id, customPackDraft.map(({ productId, quantity }) => ({ productId, quantity })));
      setCustomPackQuote(quote);
    } catch (err) {
      setError(readError(err));
    } finally {
      setQuoting(false);
    }
  };

  const addQuotedPack = () => {
    if (!customPackQuote || !selectedPack) return;
    const added = addCustomPackToCart({ ...selectedPack, imageUrl: packImageUrl(selectedPack) }, customPackQuote);
    if (added) navigateTo("cart");
  };

  const addSelectionToCart = () => {
    if (selectedPack) {
      addQuotedPack();
      return;
    }
    const items = customPackDraft.map((line) => {
      const product = productById.get(String(line.productId));
      return {
        productId: line.productId,
        sku: product?.sku,
        name: product?.name,
        image: resolveProductImage(product, null),
        quantity: line.quantity,
        unitPrice: priceOf(product || {}),
      };
    });
    if (addProductBundleToCart(items)) navigateTo("cart");
  };

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
        {!loading && !customPacks.length && <div className="mb-6 rounded-xl border border-amber-400/30 bg-amber-400/5 p-5 text-sm leading-6 text-gray-200"><h2 className="font-black text-amber-200">Compose freely from the catalog</h2><p className="mt-1">No CUSTOM pack template is configured. Select products and add them together to your cart; checkout sends them as regular product lines and the server rechecks their prices and stock.</p></div>}
        {!loading && packsError && <div className="mb-6 rounded-xl border border-white/10 bg-[#181818] p-5 text-sm text-gray-300">The pack template could not be loaded. You can still build a selection from the available products.</div>}
        {loading ? <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]"><div className="min-h-64 animate-pulse rounded-xl border border-white/10 bg-[#181818]" /><div className="min-h-64 animate-pulse rounded-xl border border-white/10 bg-[#181818]" /></div> : (
          <>
            {customPacks.length > 1 && <label className="mb-5 flex flex-col gap-2 text-xs font-bold uppercase tracking-wider text-gray-400 sm:max-w-sm">Modèle de composition<select value={selectedCustomPackId || ""} onChange={(event) => { setSelectedCustomPackId(event.target.value); setCustomPackDraft([]); setCustomPackQuote(null); }} className="rounded-lg border border-white/10 bg-[#181818] px-3 py-3 text-sm normal-case tracking-normal text-white"><option value="">Choisir un modèle</option>{customPacks.map((pack) => <option key={pack.id} value={pack.id}>{pack.name}</option>)}</select></label>}
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
              <section>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row">
                  <label className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un produit ou une marque" className="w-full rounded-lg border border-white/10 bg-[#181818] py-3 pl-10 pr-3 text-sm text-white placeholder:text-gray-500 focus:border-[#d90429] focus:outline-none" /></label>
                  <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} aria-label="Filtrer par catégorie" className="rounded-lg border border-white/10 bg-[#181818] px-3 py-3 text-sm text-white focus:border-[#d90429] focus:outline-none"><option value="">Toutes les catégories</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
                </div>
                {productsError ? <div className="rounded-xl border border-white/10 bg-[#181818] p-8 text-center text-sm text-gray-300">Le catalogue des produits n’a pas pu être chargé. Consultez le message d’erreur ci-dessus.</div> : !products.length ? <div className="rounded-xl border border-white/10 bg-[#181818] p-8 text-center text-sm text-gray-300">Aucun produit disponible pour le moment.</div> : filteredProducts.length ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{filteredProducts.map((product) => {
                  const productId = product.id ?? iriToId(product["@id"]);
                  const selectedQuantity = getSelectedQuantity(productId);
                  const stock = Math.max(0, Number(product.stock || 0));
                  const available = activeValue(product) !== false && stock > 0;
                  const productPrice = priceOf(product);
                  const image = resolveProductImage(product, null);
                  const reachedLimit = selectedQuantity === 0 && selectedCount >= maxProducts;
                  return <article key={productId} className="flex flex-col overflow-hidden rounded-[14px] border border-white/10 bg-[#111]">
                    <div className="relative flex aspect-square items-center justify-center bg-[#f0f0f0] p-5">{image ? <img src={image} alt={product.name} loading="lazy" className="h-full w-full object-contain" /> : <ShoppingBag className="h-12 w-12 text-gray-400" />}{!available && <span className="absolute right-3 top-3 rounded bg-black/80 px-2 py-1 text-[9px] font-black uppercase text-white">Indisponible</span>}</div>
                    <div className="flex flex-1 flex-col gap-3 p-4 text-white">
                      <div className="flex-1"><p className="text-[9px] font-bold uppercase tracking-widest text-gray-500">{product.category?.name || "Nutrition sportive"}{product.brand?.name ? ` · ${product.brand.name}` : ""}</p><h2 className="mt-1 line-clamp-2 min-h-10 text-sm font-black uppercase leading-5">{product.name}</h2><p className="mt-2 text-base font-black">{currency(productPrice)}{product.salePrice && Number(product.salePrice) < Number(product.price) && <span className="ml-2 text-xs font-semibold text-gray-500 line-through">{currency(product.price)}</span>}</p><p className="mt-1 text-[10px] text-gray-500">{available ? `${stock} en stock` : "Rupture de stock"}</p></div>
                      {selectedQuantity > 0 ? <div className="flex items-center justify-between gap-2 rounded-lg border border-[#d90429]/50 bg-[#d90429]/10 p-2"><span className="text-[10px] font-black uppercase text-[#ff7186]">Dans votre pack</span><div className="flex items-center gap-3"><button type="button" onClick={() => updateSelection(productId, selectedQuantity - 1)} aria-label={`Retirer une unité de ${product.name}`} className="rounded bg-[#252525] p-1.5 text-white hover:bg-[#d90429]"><Minus className="h-3.5 w-3.5" /></button><span className="min-w-4 text-center text-xs font-black">{selectedQuantity}</span><button type="button" disabled={selectedQuantity >= stock} onClick={() => updateSelection(productId, selectedQuantity + 1)} aria-label={`Ajouter une unité de ${product.name}`} className="rounded bg-[#252525] p-1.5 text-white hover:bg-[#d90429] disabled:cursor-not-allowed disabled:opacity-40"><Plus className="h-3.5 w-3.5" /></button></div></div> : <button type="button" disabled={!available || reachedLimit} onClick={() => updateSelection(productId, 1)} className="inline-flex items-center justify-center gap-2 rounded bg-[#d90429] px-3 py-2.5 text-[10px] font-black uppercase text-white hover:bg-[#b0021f] disabled:cursor-not-allowed disabled:bg-[#333] disabled:text-gray-500"><PackagePlus className="h-4 w-4" /> Ajouter au pack</button>}
                    </div>
                  </article>;
                })}</div> : <div className="rounded-xl border border-white/10 bg-[#181818] p-8 text-center text-sm text-gray-400">Aucun produit ne correspond à votre recherche.</div>}
              </section>

              <aside className="rounded-xl border border-white/10 bg-[#181818] p-5 lg:sticky lg:top-6">
                <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4"><div><h2 className="font-black uppercase text-white">Votre composition</h2><p className="mt-1 text-[11px] text-gray-400">{selectedCount} produit{selectedCount === 1 ? " distinct" : "s distincts"} · {totalUnits} unité{totalUnits === 1 ? "" : "s"}</p></div>{selectedCount > 0 && <button type="button" onClick={clearSelection} title="Vider la sélection" className="rounded p-2 text-gray-500 hover:bg-white/5 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>}</div>
                <div className="mt-4 max-h-[42vh] space-y-3 overflow-y-auto pr-1">{customPackDraft.length === 0 ? <div className="rounded-lg border border-dashed border-white/15 px-4 py-8 text-center"><ShoppingBag className="mx-auto h-7 w-7 text-gray-600" /><p className="mt-3 text-xs leading-5 text-gray-400">Votre pack est vide. Ajoutez les produits qui vous intéressent.</p></div> : customPackDraft.map((line) => {
                  const product = productById.get(String(line.productId));
                  if (!product) return null;
                  return <div key={line.productId} className="flex items-center gap-3 rounded-lg bg-[#111] p-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-[#f0f0f0] p-1">{resolveProductImage(product, null) ? <img src={resolveProductImage(product, null)} alt="" className="h-full w-full object-contain" /> : <ShoppingBag className="h-4 w-4 text-gray-400" />}</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-white">{product.name}</p><p className="mt-1 text-[10px] text-gray-400">{currency(priceOf(product))} × {line.quantity}</p></div><button type="button" onClick={() => updateSelection(line.productId, 0)} aria-label={`Retirer ${product.name}`} className="p-1.5 text-gray-500 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button></div>;
                })}</div>
                <div className="mt-4 space-y-2 border-t border-white/10 pt-4 text-xs">                   {selectedPack ? <><div className="flex justify-between text-gray-400"><span>Model limits</span><span>{minProducts}–{Number.isFinite(maxProducts) ? maxProducts : "∞"} distinct products</span></div>{customPackQuote ? <><div className="flex justify-between text-gray-300"><span>Base price (server)</span><span>{currency(customPackQuote.basePrice)}</span></div><div className="flex justify-between text-emerald-400"><span>Discount confirmed ({customPackQuote.discountPercentage}%)</span><span>−{currency(customPackQuote.discountAmount)}</span></div><div className="flex justify-between border-t border-white/10 pt-3 text-base font-black text-white"><span>Pack total</span><span>{currency(customPackQuote.finalPrice)}</span></div></> : <p className="pt-1 text-[10px] leading-5 text-gray-500">The server will calculate the template price.</p>}</> : <><div className="flex justify-between text-gray-300"><span>Estimated product total</span><span className="font-black text-white">{currency(estimatedTotal)}</span></div><p className="pt-1 text-[10px] leading-5 text-gray-500">Estimate only, with no pack discount. Products are billed separately at prices rechecked by the server.</p></>}                 </div>                 {selectedPack && selectedCount < minProducts && <p className="mt-3 text-[11px] text-amber-300">Add {minProducts - selectedCount} more distinct product{minProducts - selectedCount === 1 ? "" : "s"} to request a quote.</p>}                 {selectedPack && selectedCount >= minProducts && <button type="button" onClick={requestQuote} disabled={quoting || selectedCount > maxProducts} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-[#252525] px-4 py-3 text-xs font-black uppercase text-white hover:border-[#d90429] disabled:cursor-not-allowed disabled:opacity-50">{quoting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-[#ff526d]" />}{quoting ? "Getting quote..." : "Calculate pack price"}</button>}                 {selectedPack && customPackQuote && <button type="button" onClick={addSelectionToCart} className="mt-3 w-full rounded-lg bg-[#d90429] px-4 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-[#d90429]/15 hover:bg-[#b0021f]">Add pack to cart</button>}                 {!selectedPack && selectedCount > 0 && <button type="button" onClick={addSelectionToCart} disabled={!bundleHasValidSkus} className="mt-3 w-full rounded-lg bg-[#d90429] px-4 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-[#d90429]/15 hover:bg-[#b0021f] disabled:cursor-not-allowed disabled:opacity-50">Add composition to cart</button>}
                {selectedCount < minProducts && <p className="mt-3 text-[11px] text-amber-300">Ajoutez encore {minProducts - selectedCount} produit{minProducts - selectedCount === 1 ? " distinct" : "s distincts"} pour obtenir un devis.</p>}
                {selectedCount >= minProducts && <button type="button" onClick={requestQuote} disabled={quoting || selectedCount > maxProducts} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-[#252525] px-4 py-3 text-xs font-black uppercase text-white hover:border-[#d90429] disabled:cursor-not-allowed disabled:opacity-50">{quoting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-[#ff526d]" />}{quoting ? "Calcul du devis…" : "Calculer le prix du pack"}</button>}
                {customPackQuote && <button type="button" onClick={addQuotedPack} className="mt-3 w-full rounded-lg bg-[#d90429] px-4 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-[#d90429]/15 hover:bg-[#b0021f]">Ajouter le pack au panier</button>}
                <p className="mt-3 text-[10px] leading-4 text-gray-500">Le devis ne réserve pas le stock. Celui-ci sera revérifié lors de l’enregistrement de la commande.</p>
              </aside>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PackBuilderPage;
