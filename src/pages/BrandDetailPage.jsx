import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, ExternalLink, Loader2, PackageOpen } from "lucide-react";
import { useCart } from "../context/CartContext";
import { brandService, hydrateProductsWithImages, productService, resolveBrandLogo, resolveProductImage } from "../services/api";
import { ProductCard } from "../components/ProductCard";

const collectionItems = (data) => data?.["hydra:member"] || data?.member || (Array.isArray(data) ? data : []);

const idFromReference = (value) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "object") return idFromReference(value.id ?? value["@id"] ?? value.iri);
  const match = String(value).match(/\/(?:api\/)?brands\/([^/?#]+)\/?$/);
  return match ? match[1] : String(value);
};

const displayBrandName = (brand) => {
  const name = brand?.name ?? brand?.label ?? brand?.title;
  if (name) return name;

  return String(brand?.slug || "")
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const isActive = (record) => record?.isActive !== false && record?.active !== false;
const isAvailable = (product) => {
  if (!isActive(product)) return false;
  if (product?.brand?.isActive === false || product?.brand?.active === false) return false;
  const stock = product?.stock;
  return stock === null || stock === undefined || Number(stock) > 0;
};

const BrandDescription = ({ description }) => {
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);
  const descriptionRef = useRef(null);
  const paragraphs = String(description || "").split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean);

  useLayoutEffect(() => {
    const element = descriptionRef.current;
    if (!element) return undefined;
    const measure = () => {
      if (!expanded) setCanExpand(element.scrollHeight > element.clientHeight + 2);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [description, expanded]);

  return (
    <div className="mt-7 border-t border-white/10 pt-6 sm:mt-8 sm:pt-7">
      <div className="mb-3 flex items-center gap-3">
        <span className="h-px w-8 bg-[#d90429]" />
        <h2 className="text-xs font-black uppercase tracking-[0.22em] text-[#ff7186]">À propos de la marque</h2>
      </div>
      <div ref={descriptionRef} className={`max-w-5xl text-base leading-7 text-gray-200 sm:text-lg sm:leading-8 ${expanded ? "" : "max-h-[12rem] overflow-hidden"}`}>
        <div className="space-y-4">
          {paragraphs.map((paragraph, index) => <p key={index} className="whitespace-pre-line">{paragraph}</p>)}
        </div>
      </div>
      {canExpand && <button type="button" onClick={() => setExpanded((value) => !value)} className="mt-4 inline-flex items-center gap-2 text-sm font-black text-white underline decoration-[#d90429] decoration-2 underline-offset-4 transition-colors hover:text-[#ff7186]">{expanded ? "Réduire" : "Lire la suite"}</button>}
    </div>
  );
};

const normalizeProduct = (product) => ({
  id: product.id,
  name: product.name,
  category: product.category?.name || "",
  brand: product.brand?.name || "",
  price: Number(product.price || 0),
  originalPrice: product.isOnSale && product.salePrice ? Number(product.price) : null,
  image: resolveProductImage(product, null),
  isNew: product.isNew,
  isOnSale: product.isOnSale,
  salePrice: product.salePrice,
  badge: product.isFeatured ? "TOP SELLER" : product.isNew ? "NOUVEAU" : product.isOnSale ? "PROMO" : null,
  inStock: Number(product.stock ?? 1) > 0,
  flavors: product.flavors?.map((flavor) => flavor.name) || [],
  sizes: [],
  sku: product.sku,
  slug: product.slug,
});

export const BrandDetailPage = () => {
  const { selectedBrandId, navigateTo } = useCart();
  const [brand, setBrand] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setBrand(null);
    setProducts([]);
    if (!selectedBrandId) {
      setLoading(false);
      return undefined;
    }

    let current = true;
    setLoading(true);
    setError("");

    Promise.all([
      // Individual brand routes require an admin token on the current API,
      // whereas the public collection exposes the logo used by customers.
      brandService.getAllPages({}, true)
        .then((data) => collectionItems(data).find((item) =>
          String(idFromReference(item.id ?? item["@id"] ?? item.iri)) === String(selectedBrandId)
          && isActive(item)
        ) || null)
        .catch(() => null),
      productService.getAllPages({ isActive: true, "brand.id": selectedBrandId }, true),
    ]).then(([brandData, productData]) => {
      if (!current) return;

      const availableProducts = brandData && !isActive(brandData) ? [] : collectionItems(productData).filter((product) =>
        String(idFromReference(product.brand ?? product.brandId)) === String(selectedBrandId)
        && isAvailable(product)
      );

      setBrand((brandData && isActive(brandData) ? brandData : null) || availableProducts[0]?.brand || null);
      setProducts(availableProducts.map(normalizeProduct));
      setLoading(false);

      void hydrateProductsWithImages(availableProducts, true).then((productsWithImages) => {
        if (current) setProducts(productsWithImages.map(normalizeProduct));
      }).catch(() => {
        // The product list remains usable when optional image hydration fails.
      });
    }).catch((requestError) => {
      if (!current) return;
      setError(requestError?.message || "Impossible de charger cette marque.");
      setLoading(false);
    });

    return () => { current = false; };
  }, [selectedBrandId]);

  const logoUrl = resolveBrandLogo(brand);
  const brandName = displayBrandName(brand) || "Marque";

  return (
    <div className="min-h-screen bg-[#131313] py-8 pb-20 text-[#e5e2e1] sm:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => navigateTo("shop")}
          className="mb-6 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Retour au shop
        </button>

        {loading ? (
          <div className="flex min-h-72 items-center justify-center" role="status" aria-label="Chargement de la marque">
            <Loader2 className="h-8 w-8 animate-spin text-[#d90429]" />
          </div>
        ) : error ? (
          <div role="alert" className="rounded-xl border border-red-500/30 bg-red-950/20 p-6 text-sm text-red-200">{error}</div>
        ) : !brand ? (
          <div className="rounded-xl border border-white/10 bg-[#181818] p-8 text-center text-sm text-gray-400">Cette marque n’est plus disponible.</div>
        ) : (
          <>
            <section className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1b1b1b] via-[#151515] to-[#101010] p-6 shadow-2xl shadow-black/20 sm:p-9 md:p-11">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-[#0d0d0d] p-4 shadow-[0_12px_36px_rgba(0,0,0,0.35)] sm:h-28 sm:w-28">
                  {logoUrl ? <img src={logoUrl} alt={brandName} className="h-full w-full object-contain" /> : <span className="text-center text-sm font-black uppercase leading-tight text-white">{brandName}</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-[#ff526d]">Découvrir la marque</p>
                  <h1 className="mt-2 text-3xl font-black uppercase leading-tight tracking-tight text-white sm:text-5xl">{brandName}</h1>
                  {brand.website && <a href={brand.website} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-gray-200 transition-colors hover:border-[#d90429] hover:bg-[#d90429]/10 hover:text-white">Site officiel <ExternalLink className="h-4 w-4" /></a>}
                </div>
              </div>
              {brand.description && <BrandDescription key={selectedBrandId} description={brand.description} />}
            </section>

            <section className="mt-10">
              <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#ff526d]">Catalogue</p>
                  <h2 className="mt-1 text-2xl font-black uppercase text-white sm:text-3xl">Produits disponibles</h2>
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">{products.length} produit{products.length !== 1 ? "s" : ""}</span>
              </div>

              {products.length > 0 ? (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {products.map((product) => <ProductCard key={product.id} product={product} />)}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-white/15 bg-[#181818] px-5 py-14 text-center text-sm text-gray-400">
                  <PackageOpen className="mx-auto h-8 w-8 text-gray-600" />
                  <p className="mt-3">Aucun produit disponible pour cette marque pour le moment.</p>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default BrandDetailPage;
