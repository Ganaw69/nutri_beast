import React, { useEffect, useState } from "react";
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
  const stock = product?.stock;
  return stock === null || stock === undefined || Number(stock) > 0;
};

const normalizeProduct = (product) => ({
  id: product.id,
  name: product.name,
  category: product.category?.name || "",
  brand: product.brand?.name || "",
  price: Number(product.price || 0),
  originalPrice: product.isOnSale && product.salePrice ? Number(product.price) : null,
  image: resolveProductImage(product, null),
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
        ) || null)
        .catch(() => null),
      productService.getAllPages({ isActive: true, "brand.id": selectedBrandId }, true),
    ]).then(([brandData, productData]) => {
      if (!current) return;

      const availableProducts = collectionItems(productData).filter((product) =>
        String(idFromReference(product.brand ?? product.brandId)) === String(selectedBrandId)
        && isAvailable(product)
      );

      setBrand(brandData || availableProducts[0]?.brand || null);
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
            <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#181818] shadow-2xl shadow-black/20">
              <div className="flex flex-col gap-7 p-6 sm:p-8 md:flex-row md:items-center md:p-10">
                <div className="flex h-28 w-full shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[#101010] p-5 sm:h-36 md:w-52">
                  {logoUrl ? <img src={logoUrl} alt={brandName} className="h-full w-full object-contain" /> : <span className="text-xl font-black uppercase text-white">{brandName}</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#ff526d]">Marque partenaire</p>
                  <h1 className="mt-2 text-3xl font-black uppercase tracking-tight text-white sm:text-5xl">{brandName}</h1>
                  {brand.description && <p className="mt-4 max-w-3xl text-sm leading-6 text-gray-300 sm:text-base">{brand.description}</p>}
                </div>
                {brand.website && (
                  <a href={brand.website} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-white/20 px-5 py-3 text-xs font-black uppercase tracking-wider text-white transition-colors hover:border-[#d90429] hover:bg-[#d90429]">
                    Site officiel <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
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
