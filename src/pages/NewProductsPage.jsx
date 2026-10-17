import React, { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { ProductCard } from "../components/ProductCard";
import { hydrateProductsWithImages, productService, resolveProductImage } from "../services/api";

const toCardProduct = (product) => ({
  id: product.id,
  name: product.name,
  category: product.category?.name || "",
  brand: product.brand?.name || "",
  price: Number.parseFloat(product.price || 0),
  originalPrice: product.salePrice ? Number.parseFloat(product.price) : null,
  image: resolveProductImage(product, null),
  isNew: product.isNew,
  isOnSale: product.isOnSale || (Number(product.salePrice) > 0 && Number(product.salePrice) < Number(product.price)),
  salePrice: product.salePrice,
  badge: product.isFeatured ? "TOP SELLER" : null,
  inStock: product.stock > 0,
  flavors: product.flavors?.map((flavor) => flavor.name) || [],
  sizes: [],
  sku: product.sku,
  slug: product.slug,
});

const ITEMS_PER_PAGE = 16;

export const NewProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(products.length / ITEMS_PER_PAGE);
  const visibleProducts = products.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => {
    let active = true;

    const loadNewProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await productService.getNewPages();
        if (!active) return;
        const newProducts = response["hydra:member"] || [];
        setProducts(newProducts);
        setLoading(false);

        void hydrateProductsWithImages(newProducts).then((hydratedProducts) => {
          if (active) setProducts(hydratedProducts);
        }).catch(() => {
          // Product data remains usable if optional image hydration fails.
        });
      } catch (requestError) {
        if (!active) return;
        setError(requestError?.message || "Impossible de charger les nouveautés.");
        setLoading(false);
      }
    };

    loadNewProducts();
    return () => { active = false; };
  }, []);

  return (
    <section className="min-h-screen bg-[#131313] py-10 pb-20 font-heading text-[#e5e2e1]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <header className="mb-8 border-b border-white/10 pb-5">
          <h1 className="text-2xl font-black uppercase tracking-wide text-white sm:text-3xl">Nouveautés</h1>
          <p className="mt-2 text-sm text-gray-400">Les derniers produits ajoutés au catalogue.</p>
        </header>

        {error && (
          <div role="alert" className="mb-6 rounded-lg border border-red-500/30 bg-red-900/20 p-4 text-sm text-red-300">
            Impossible de charger les nouveautés : {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20" role="status" aria-label="Chargement des nouveautés">
            <Loader2 className="h-8 w-8 animate-spin text-[#d90429]" />
          </div>
        ) : error ? null : products.length === 0 ? (
          <div className="py-20 text-center text-gray-500">Aucune nouveauté pour le moment.</div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {visibleProducts.map((product) => <ProductCard key={product.id} product={toCardProduct(product)} />)}
            </div>
            {totalPages > 1 && (
              <nav className="flex items-center justify-center gap-2 pt-10" aria-label="Pagination des nouveautés">
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                  aria-label="Page précédente"
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-[#1c1b1b] text-gray-300 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-3 text-sm font-bold text-gray-300" aria-live="polite">Page {currentPage} / {totalPages}</span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={currentPage === totalPages}
                  aria-label="Page suivante"
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-[#1c1b1b] text-gray-300 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </nav>
            )}
          </>
        )}
      </div>
    </section>
  );
};
