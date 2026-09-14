import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useCart } from "../context/CartContext";
import { productService, categoryService, goalService, resolveProductImage, hydrateProductsWithImages, iriToId } from "../services/api";
import { ProductCard } from "../components/ProductCard";
import { SlidersHorizontal, ChevronLeft, ChevronRight, Check, Loader2 } from "lucide-react";
import { buildCategoryTree, collectExpandedCategoryIds, extractCategoryItems } from "../utils/categoryTree";

const ITEMS_PER_PAGE = 20;

const sameId = (first, second) => String(first) === String(second);

const getProductCategoryId = (product) => {
  const category = product?.category;
  return typeof category === 'object'
    ? category?.id ?? iriToId(category?.['@id'] || category?.iri)
    : iriToId(category);
};

export const ShopPage = () => {
  const { searchQuery, selectedShopCategoryIds, setSelectedShopCategoryIds } = useCart();

  // API data
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [goals, setGoals] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [selectedBrandIds, setSelectedBrandIds] = useState([]);
  const [selectedGoalIds, setSelectedGoalIds] = useState([]);
  const [priceMax, setPriceMax] = useState(500);
  const [sortBy, setSortBy] = useState("recent");
  const [currentPage, setCurrentPage] = useState(1);
  const categoryTree = buildCategoryTree(categories.filter(cat => cat.isActive !== false));
  const brands = useMemo(() => {
    const seen = new Set();
    return products
      .map((product) => product.brand)
      .filter((brand) => brand && brand.id != null)
      .filter((brand) => {
        if (seen.has(brand.id)) return false;
        seen.add(brand.id);
        return true;
      });
  }, [products]);

  // Load filter options once
  useEffect(() => {
    Promise.all([
      categoryService.getAll({ isActive: true, itemsPerPage: 100 }, true).catch(() => ({ 'hydra:member': [] })),
      goalService.getAll({ isActive: true, itemsPerPage: 100 }, true).catch(() => ({ 'hydra:member': [] })),
    ]).then(([catData, goalData]) => {
      setCategories(extractCategoryItems(catData));
      setGoals(goalData['hydra:member'] || []);
    });
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { isActive: true };

      if (searchQuery) params.name = searchQuery;
      // A navbar click can arrive before the complete category list is loaded.
      // In that case still send the clicked category id instead of fetching the
      // whole catalogue. Once the list is available, roots can be expanded to
      // include their descendants for the sidebar filter.
      const expandedCategoryIds = collectExpandedCategoryIds(selectedShopCategoryIds, categories);
      const categoryFilterIds = expandedCategoryIds.length > 0
        ? expandedCategoryIds
        : selectedShopCategoryIds.filter((id) => id !== null && id !== undefined && id !== '');
      if (selectedBrandIds.length > 0) params['brand.id'] = selectedBrandIds;
      if (selectedGoalIds.length > 0) params['goals.id'] = selectedGoalIds;
      if (priceMax < 500) params['price[lte]'] = priceMax;

      // Sorting
      if (sortBy === 'price-low') params['order[price]'] = 'asc';
      else if (sortBy === 'price-high') params['order[price]'] = 'desc';
      else if (sortBy === 'recent') params['order[createdAt]'] = 'desc';
      else if (sortBy === 'featured') params['order[position]'] = 'asc';

      // The API can cap a response below itemsPerPage. Fetch the complete
      // collection first, apply relation filters, then paginate it at 20.
      const data = await productService.getAllPages(params, true);
      const allProducts = data['hydra:member'] || [];
      const allowedCategoryIds = new Set(categoryFilterIds.map(String));
      const filteredProducts = categoryFilterIds.length === 0
        ? allProducts
        : allProducts.filter((product) => {
            const categoryId = getProductCategoryId(product);
            return allowedCategoryIds.has(String(categoryId));
          });

      const start = (currentPage - 1) * ITEMS_PER_PAGE;
      const currentProducts = await Promise.all(
        filteredProducts.slice(start, start + ITEMS_PER_PAGE).map((product) =>
          productService.getOne(product.id, true).catch(() => product)
        )
      );
      setProducts(await hydrateProductsWithImages(currentProducts));
      setTotalCount(filteredProducts.length);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery, selectedShopCategoryIds, selectedBrandIds, selectedGoalIds, priceMax, sortBy, categories]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedShopCategoryIds, selectedBrandIds, selectedGoalIds, priceMax, sortBy]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const toggleId = (list, setList, id) => {
    setList(prev => prev.some((item) => sameId(item, id))
      ? prev.filter((item) => !sameId(item, id))
      : [...prev, id]);
  };

  const renderCategoryTree = (items, depth = 0) => (
    <div className="space-y-2">
      {items.map((cat) => {
        const isChecked = selectedShopCategoryIds.some((id) => sameId(id, cat.id));
        return (
          <div key={cat.id} className={depth > 0 ? "pl-4 border-l border-white/10" : ""}>
            <button
              type="button"
              className="w-full flex items-start gap-3 text-left cursor-pointer hover:text-white transition-colors"
              onClick={() =>
                setSelectedShopCategoryIds(prev =>
                  prev.some((id) => sameId(id, cat.id))
                    ? prev.filter((id) => !sameId(id, cat.id))
                    : [...prev, cat.id]
                )
              }
            >
              <div className={`mt-0.5 w-4 h-4 rounded-xs border flex items-center justify-center transition-colors flex-shrink-0 ${isChecked ? "bg-[#d90429] border-[#d90429] text-white" : "border-white/30 bg-[#1c1b1b]"}`}>
                {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
              <span className={`min-w-0 text-xs font-semibold ${isChecked ? "text-white" : "text-gray-300"}`}>{cat.name}</span>
            </button>
            {cat.children?.length > 0 && (
              <div className="mt-2 space-y-2">
                {renderCategoryTree(cat.children, depth + 1)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // Map API product to format ProductCard expects
  const normalizeProduct = (p) => ({
    id: p.id,
    name: p.name,
    category: p.category?.name || '',
    brand: p.brand?.name || '',
    price: parseFloat(p.price || 0),
    originalPrice: p.salePrice ? parseFloat(p.price) : null,
    image: resolveProductImage(p, null),
    badge: p.isFeatured ? 'TOP SELLER' : p.isNew ? 'NOUVEAU' : p.isOnSale ? 'PROMO' : null,
    inStock: p.stock > 0,
    flavors: p.flavors?.map(f => f.name) || [],
    sizes: [],
    sku: p.sku,
    slug: p.slug,
  });

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <div className="bg-[#131313] min-h-screen text-[#e5e2e1] font-heading py-10 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* ================= LEFT SIDEBAR ================= */}
          <aside className="lg:col-span-3 space-y-8 pr-0 lg:pr-4">
            <div className="flex items-center gap-2 border-b border-white/10 pb-4 text-white">
              <SlidersHorizontal className="w-4 h-4 text-[#d90429]" />
              <h2 className="font-black text-xs uppercase tracking-widest text-white">FILTRER PAR</h2>
            </div>

            {/* CATÉGORIE */}
            {categoryTree.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-bold text-[11px] text-gray-400 uppercase tracking-widest">CATÉGORIE</h3>
                {renderCategoryTree(categoryTree)}
                {selectedShopCategoryIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedShopCategoryIds([])}
                    className="text-[11px] font-bold uppercase tracking-widest text-[#d90429] hover:text-[#ff4d6d]"
                  >
                    Réinitialiser la catégorie
                  </button>
                )}
              </div>
            )}

            {/* PRIX */}
            <div className="space-y-3 pt-2">
              <h3 className="font-bold text-[11px] text-gray-400 uppercase tracking-widest">PRIX (TND)</h3>
              <input type="range" min="0" max="500" value={priceMax}
                onChange={(e) => setPriceMax(Number(e.target.value))}
                className="w-full accent-[#d90429] bg-[#2a2a2a] h-1.5 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[11px] font-bold text-gray-400">
                <span>0 TND</span>
                <span>{priceMax} TND</span>
              </div>
            </div>

            {/* OBJECTIF */}
            {goals.length > 0 && (
              <div className="space-y-3 pt-2">
                <h3 className="font-bold text-[11px] text-gray-400 uppercase tracking-widest">OBJECTIF</h3>
                <div className="flex flex-wrap gap-2">
                  {goals.map((goal) => {
                    const isActive = selectedGoalIds.includes(goal.id);
                    return (
                      <button key={goal.id} onClick={() => toggleId(selectedGoalIds, setSelectedGoalIds, goal.id)}
                        className={`px-3 py-1.5 rounded-xs text-[11px] font-bold uppercase transition-all ${isActive ? "bg-transparent border border-[#d90429] text-white" : "bg-[#1c1b1b] border border-white/10 text-gray-400 hover:text-white"}`}
                      >
                        {goal.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* MARQUE */}
            {brands.length > 0 && (
              <div className="space-y-3 pt-2">
                <h3 className="font-bold text-[11px] text-gray-400 uppercase tracking-widest">MARQUE</h3>
                <div className="space-y-2 text-xs font-semibold text-gray-300">
                  {brands.map((brand) => {
                    const isChecked = selectedBrandIds.includes(brand.id);
                    return (
                      <label key={brand.id} className="flex items-center gap-3 cursor-pointer hover:text-white transition-colors"
                        onClick={() => toggleId(selectedBrandIds, setSelectedBrandIds, brand.id)}
                      >
                        <div className={`w-4 h-4 rounded-xs border flex items-center justify-center transition-colors ${isChecked ? "bg-[#d90429] border-[#d90429] text-white" : "border-white/30 bg-[#1c1b1b]"}`}>
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span>{brand.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </aside>

          {/* ================= RIGHT PRODUCT GRID ================= */}
          <main className="lg:col-span-9 space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                {loading ? 'Chargement...' : <><strong className="text-white">{totalCount}</strong> produit{totalCount !== 1 ? 's' : ''}</>}
              </span>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                className="bg-[#1c1b1b] border border-white/10 text-white text-xs font-bold px-4 py-2 rounded-xs focus:outline-none focus:border-[#d90429] cursor-pointer"
              >
                <option value="recent">PLUS RÉCENTS</option>
                <option value="price-low">PRIX : CROISSANT</option>
                <option value="price-high">PRIX : DÉCROISSANT</option>
                <option value="featured">EN VEDETTE</option>
              </select>
            </div>

            {error && (
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">
                ⚠️ {error}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-[#d90429] animate-spin" />
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-20 text-gray-500">Aucun produit trouvé.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((p) => <ProductCard key={p.id} product={normalizeProduct(p)} />)}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-10">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                  className="w-9 h-9 bg-[#1c1b1b] hover:bg-white/10 border border-white/10 text-gray-300 rounded-xs flex items-center justify-center transition-colors disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const page = Math.min(Math.max(1, currentPage - 2), Math.max(1, totalPages - 4)) + i;
                  return (
                    <button key={page} onClick={() => setCurrentPage(page)}
                      className={`w-9 h-9 rounded-xs font-bold text-xs flex items-center justify-center transition-colors ${currentPage === page ? "bg-[#d90429] text-white shadow-md" : "bg-[#1c1b1b] text-gray-300 hover:bg-white/10 border border-white/10"}`}
                    >
                      {page}
                    </button>
                  );
                })}

                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                  className="w-9 h-9 bg-[#1c1b1b] hover:bg-white/10 border border-white/10 text-gray-300 rounded-xs flex items-center justify-center transition-colors disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};
