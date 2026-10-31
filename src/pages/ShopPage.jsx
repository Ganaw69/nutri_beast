import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useCart } from "../context/CartContext";
import { productService, categoryService, goalService, resolveProductImage, hydrateProductsWithImages } from "../services/api";
import { ProductCard } from "../components/ProductCard";
import { SlidersHorizontal, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronDown, Check, Loader2 } from "lucide-react";
import { buildCategoryTree, collectExpandedCategoryIds, extractCategoryItems } from "../utils/categoryTree";

const sameId = (first, second) => String(first) === String(second);

const normaliseText = (value) => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("fr");

const getRelatedId = (value) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "object") {
    return getRelatedId(value.id ?? value['@id'] ?? value.iri);
  }
  const iriMatch = String(value).match(/\/(\d+)\/?$/);
  return iriMatch ? iriMatch[1] : String(value);
};

export const ShopPage = () => {
  const { searchQuery, selectedShopCategoryIds, setSelectedShopCategoryIds } = useCart();

  // API data
  const [catalogueProducts, setCatalogueProducts] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [goals, setGoals] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [catalogueComplete, setCatalogueComplete] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [selectedBrandIds, setSelectedBrandIds] = useState([]);
  const [selectedGoalIds, setSelectedGoalIds] = useState([]);
  const [priceMax, setPriceMax] = useState(500);
  const [sortBy, setSortBy] = useState("recent");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(9);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [mobileExpandedCategoryIds, setMobileExpandedCategoryIds] = useState([]);
  const productRequestVersionRef = useRef(0);
  const imageRequestVersionRef = useRef(0);
  const productGridRef = useRef(null);
  const categoryTree = buildCategoryTree(categories.filter(cat => cat.isActive !== false));
  const brands = useMemo(() => {
    const seen = new Set();
    return catalogueProducts
      .map((product) => product.brand)
      .filter((brand) => brand && brand.id != null)
      .filter((brand) => {
        if (seen.has(brand.id)) return false;
        seen.add(brand.id);
        return true;
      });
  }, [catalogueProducts]);

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
    const requestVersion = ++productRequestVersionRef.current;
    setLoading(true);
    setCatalogueComplete(false);
    setError(null);
    try {
      if (requestVersion !== productRequestVersionRef.current) return;
      const data = await productService.getAll({ isActive: true }, true);
      if (requestVersion !== productRequestVersionRef.current) return;
      const firstPage = data['hydra:member'] || [];
      const total = Number(data['hydra:totalItems'] ?? firstPage.length);
      setCatalogueProducts(firstPage);
      setTotalCount(total);
      setLoading(false);

      const pageSize = firstPage.length;
      const pageCount = pageSize > 0 ? Math.ceil(total / pageSize) : 0;
      if (pageCount <= 1) {
        setCatalogueComplete(true);
        return;
      }

      const remainingPages = await Promise.allSettled(
        Array.from({ length: pageCount - 1 }, (_, index) =>
          productService.getAll(
            { isActive: true, page: index + 2 },
            true
          )
        )
      );
      if (requestVersion !== productRequestVersionRef.current) return;

      const remainingProducts = remainingPages
        .filter((result) => result.status === "fulfilled")
        .flatMap((result) => result.value["hydra:member"] || []);
      if (remainingProducts.length > 0) {
        setCatalogueProducts((currentProducts) => [...currentProducts, ...remainingProducts]);
      }
      setCatalogueComplete(true);
    } catch (err) {
      if (requestVersion === productRequestVersionRef.current) setError(err.message);
    } finally {
      if (requestVersion === productRequestVersionRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedShopCategoryIds, selectedBrandIds, selectedGoalIds, priceMax, sortBy, itemsPerPage]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const filteredProducts = useMemo(() => {
    const expandedCategoryIds = collectExpandedCategoryIds(selectedShopCategoryIds, categories);
    const categoryFilterIds = expandedCategoryIds.length > 0
      ? expandedCategoryIds
      : selectedShopCategoryIds.filter((id) => id !== null && id !== undefined && id !== '');
    const allowedCategoryIds = new Set(categoryFilterIds.map(String));
    const allowedCategoryNames = new Set(
      categories
        .filter((category) => allowedCategoryIds.has(String(category.id)))
        .map((category) => normaliseText(category.name))
        .filter(Boolean)
    );
    const allowedBrandIds = new Set(selectedBrandIds.map(String));
    const allowedGoalIds = new Set(selectedGoalIds.map(String));
    const searchNeedle = normaliseText(searchQuery.trim());

    return catalogueProducts
      .filter((product) => {
        const categoryId = getRelatedId(product.category ?? product.categoryId);
        const categoryName = normaliseText(
          typeof product.category === "object" ? product.category.name : product.categoryName
        );
        const brandId = getRelatedId(product.brand ?? product.brandId);
        const productGoalIds = Array.isArray(product.goals)
          ? product.goals.map((goal) => getRelatedId(goal)).filter(Boolean).map(String)
          : [];
        const matchesSearch = !searchNeedle || [product.name, product.brand?.name, product.category?.name]
          .some((value) => normaliseText(value).includes(searchNeedle));

        return matchesSearch
          && (allowedCategoryIds.size === 0
            || (categoryId !== null && allowedCategoryIds.has(String(categoryId)))
            || (categoryName && allowedCategoryNames.has(categoryName)))
          && (allowedBrandIds.size === 0 || (brandId !== null && allowedBrandIds.has(String(brandId))))
          && (allowedGoalIds.size === 0 || productGoalIds.some((goalId) => allowedGoalIds.has(goalId)))
          && Number(product.price || 0) <= priceMax;
      })
      .sort((first, second) => {
        if (sortBy === "price-low") return Number(first.price || 0) - Number(second.price || 0);
        if (sortBy === "price-high") return Number(second.price || 0) - Number(first.price || 0);
        if (sortBy === "featured") return Number(first.position ?? 0) - Number(second.position ?? 0);
        return new Date(second.createdAt || 0) - new Date(first.createdAt || 0);
      });
  }, [catalogueProducts, categories, searchQuery, selectedShopCategoryIds, selectedBrandIds, selectedGoalIds, priceMax, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage));
  const pagedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [currentPage, filteredProducts, itemsPerPage]);

  useEffect(() => {
    setTotalCount(filteredProducts.length);
  }, [filteredProducts.length]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const goToPage = (page) => {
    setCurrentPage(page);
    window.requestAnimationFrame(() => {
      productGridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  useEffect(() => {
    const requestVersion = ++imageRequestVersionRef.current;
    setProducts(pagedProducts);
    void hydrateProductsWithImages(pagedProducts).then((productsWithImages) => {
      if (requestVersion === imageRequestVersionRef.current) setProducts(productsWithImages);
    });
  }, [pagedProducts]);

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

  const renderMobileCategoryTree = (items, depth = 0) => (
    <div className={depth > 0 ? "mt-2 space-y-2 border-l border-white/10 pl-3" : "space-y-2"}>
      {items.map((cat) => {
        const isChecked = selectedShopCategoryIds.some((id) => sameId(id, cat.id));
        const hasChildren = cat.children?.length > 0;
        const isExpanded = mobileExpandedCategoryIds.some((id) => sameId(id, cat.id));
        return (
          <div key={cat.id}>
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#1c1b1b] p-2">
              <button
                type="button"
                onClick={() => setSelectedShopCategoryIds((previous) => previous.some((id) => sameId(id, cat.id))
                  ? previous.filter((id) => !sameId(id, cat.id))
                  : [...previous, cat.id])}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
                aria-pressed={isChecked}
              >
                <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-xs border ${isChecked ? "border-[#d90429] bg-[#d90429] text-white" : "border-white/30"}`}>
                  {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                </span>
                <span className={`truncate text-xs font-semibold ${isChecked ? "text-white" : "text-gray-300"}`}>{cat.name}</span>
              </button>
              {hasChildren && (
                <button
                  type="button"
                  onClick={() => setMobileExpandedCategoryIds((previous) => previous.some((id) => sameId(id, cat.id))
                    ? previous.filter((id) => !sameId(id, cat.id))
                    : [...previous, cat.id])}
                  className="rounded p-1.5 text-gray-300 transition hover:bg-white/10 hover:text-white"
                  aria-label={`${isExpanded ? "Réduire" : "Développer"} ${cat.name}`}
                  aria-expanded={isExpanded}
                >
                  <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                </button>
              )}
            </div>
            {hasChildren && isExpanded && renderMobileCategoryTree(cat.children, depth + 1)}
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
    isNew: p.isNew,
    isOnSale: p.isOnSale,
    salePrice: p.salePrice,
    badge: p.isFeatured ? 'TOP SELLER' : p.isNew ? 'NOUVEAU' : p.isOnSale ? 'PROMO' : null,
    inStock: p.stock > 0,
    flavors: p.flavors?.map(f => f.name) || [],
    sizes: [],
    sku: p.sku,
    slug: p.slug,
  });

  return (
    <div className="bg-[#131313] min-h-screen text-[#e5e2e1] font-heading py-10 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* ================= LEFT SIDEBAR ================= */}
          <aside className="lg:col-span-3 pr-0 lg:pr-4">
            <button
              type="button"
              onClick={() => setMobileFiltersOpen((open) => !open)}
              className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-[#1c1b1b] px-4 py-3 text-left lg:hidden"
              aria-expanded={mobileFiltersOpen}
            >
              <span className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white"><SlidersHorizontal className="h-4 w-4 text-[#d90429]" /> Filtrer par</span>
              <ChevronDown className={`h-4 w-4 text-gray-300 transition-transform ${mobileFiltersOpen ? "rotate-180" : ""}`} />
            </button>
            <div className={`${mobileFiltersOpen ? "mt-4 block" : "hidden"} space-y-8 lg:mt-0 lg:block`}>
            <div className="flex items-center gap-2 border-b border-white/10 pb-4 text-white">
              <SlidersHorizontal className="w-4 h-4 text-[#d90429]" />
              <h2 className="font-black text-xs uppercase tracking-widest text-white">FILTRER PAR</h2>
            </div>

            {/* CATÉGORIE */}
            {categoryTree.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-bold text-[11px] text-gray-400 uppercase tracking-widest">CATÉGORIE</h3>
                <div className="hidden lg:block">{renderCategoryTree(categoryTree)}</div>
                <div className="lg:hidden">{renderMobileCategoryTree(categoryTree)}</div>
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
                    const isActive = selectedGoalIds.some((id) => sameId(id, goal.id));
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
                    const isChecked = selectedBrandIds.some((id) => sameId(id, brand.id));
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
            </div>
          </aside>

          {/* ================= RIGHT PRODUCT GRID ================= */}
          <main className="lg:col-span-9 space-y-6">
            <div className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                {loading ? 'Chargement...' : <><strong className="text-white">{totalCount}</strong> produit{totalCount !== 1 ? 's' : ''}</>}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wide text-gray-400">9 produits par page</span>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                  className="bg-[#1c1b1b] border border-white/10 text-white text-xs font-bold px-4 py-2 rounded-xs focus:outline-none focus:border-[#d90429] cursor-pointer"
                >
                  <option value="recent">PLUS RÉCENTS</option>
                  <option value="price-low">PRIX : CROISSANT</option>
                  <option value="price-high">PRIX : DÉCROISSANT</option>
                  <option value="featured">EN VEDETTE</option>
                </select>
              </div>
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
            ) : products.length === 0 && !catalogueComplete ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-[#d90429]" />
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-20 text-gray-500">Aucun produit trouvé.</div>
            ) : (
              <div ref={productGridRef} className="scroll-mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((p) => <ProductCard key={p.id} product={normalizeProduct(p)} />)}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-10">
                <button onClick={() => goToPage(1)} disabled={currentPage === 1}
                  className="w-9 h-9 bg-[#1c1b1b] hover:bg-white/10 border border-white/10 text-gray-300 rounded-xs flex items-center justify-center transition-colors disabled:opacity-30"
                  aria-label="Première page" title="Première page"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button onClick={() => goToPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}
                  className="w-9 h-9 bg-[#1c1b1b] hover:bg-white/10 border border-white/10 text-gray-300 rounded-xs flex items-center justify-center transition-colors disabled:opacity-30"
                  aria-label="Page précédente" title="Page précédente"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const page = Math.min(Math.max(1, currentPage - 2), Math.max(1, totalPages - 4)) + i;
                  return (
                    <button key={page} onClick={() => goToPage(page)}
                      className={`w-9 h-9 rounded-xs font-bold text-xs flex items-center justify-center transition-colors ${currentPage === page ? "bg-[#d90429] text-white shadow-md" : "bg-[#1c1b1b] text-gray-300 hover:bg-white/10 border border-white/10"}`}
                    >
                      {page}
                    </button>
                  );
                })}

                <button onClick={() => goToPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}
                  className="w-9 h-9 bg-[#1c1b1b] hover:bg-white/10 border border-white/10 text-gray-300 rounded-xs flex items-center justify-center transition-colors disabled:opacity-30"
                  aria-label="Page suivante" title="Page suivante"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages}
                  className="w-9 h-9 bg-[#1c1b1b] hover:bg-white/10 border border-white/10 text-gray-300 rounded-xs flex items-center justify-center transition-colors disabled:opacity-30"
                  aria-label="Dernière page" title="Dernière page"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};
