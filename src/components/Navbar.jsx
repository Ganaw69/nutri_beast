import React, { useEffect, useMemo, useState } from "react";
import { useCart } from "../context/CartContext";
import { useAdmin } from "../context/AdminContext";
import { categoryService } from "../services/api";
import {
  buildCategoryTree,
  collectCategoryAndDescendantIds,
  extractCategoryItems,
} from "../utils/categoryTree";
import {
  Search,
  ShoppingBag,
  Menu,
  X,
  Shield,
  Dumbbell,
  ChevronDown,
} from "lucide-react";

export const Navbar = () => {
  const {
    activeTab,
    navigateTo,
    totalItems,
    searchQuery,
    setSearchQuery,
    setSelectedShopCategoryIds,
  } = useCart();
  const { navigation, banner, categoryNavigation } = useAdmin();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoadingCategories(true);

    categoryService
      .getAll({ isActive: true, pagination: false })
      .then((data) => {
        if (!alive) return;
        setCategories(extractCategoryItems(data));
      })
      .catch(() => {
        if (!alive) return;
        setCategories([]);
      })
      .finally(() => {
        if (!alive) return;
        setLoadingCategories(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const categoryTree = useMemo(
    () => buildCategoryTree(categories.filter((category) => category.isActive !== false)),
    [categories]
  );

  const utilityItems = useMemo(
    () => navigation.filter((item) => item.enabled && !["home", "shop"].includes(item.id)),
    [navigation]
  );

  const hiddenCategoryIds = new Set(categoryNavigation?.hiddenTopLevelCategoryIds || []);
  const configuredOrder = categoryNavigation?.topLevelOrder || [];
  const visibleCategoryTree = useMemo(() => {
    const visible = categoryTree.filter((category) => !hiddenCategoryIds.has(category.id));
    if (configuredOrder.length === 0) return visible;

    const byId = new Map(visible.map((category) => [category.id, category]));
    const ordered = configuredOrder.map((id) => byId.get(id)).filter(Boolean);
    const remaining = visible.filter((category) => !configuredOrder.includes(category.id));
    return [...ordered, ...remaining];
  }, [categoryTree, configuredOrder, hiddenCategoryIds]);

  const showCategoryMenu = !loadingCategories && visibleCategoryTree.length > 0;
  const midpoint = Math.ceil(visibleCategoryTree.length / 2);
  const leftCategoryItems = showCategoryMenu ? visibleCategoryTree.slice(0, midpoint) : [];
  const rightCategoryItems = showCategoryMenu ? visibleCategoryTree.slice(midpoint) : [];

  const bannerMessage = `${banner?.text || ""}${banner?.ctaText ? ` - ${banner.ctaText}` : ""}`;

  const openShopForCategory = (category) => {
    if (!category) return;
    const ids = collectCategoryAndDescendantIds(category.id, categories);
    setSelectedShopCategoryIds(ids);
    navigateTo("shop");
    setOpenDropdownId(null);
    setMobileMenuOpen(false);
    setShowSearchModal(false);
  };

  const openShopHome = () => {
    setSelectedShopCategoryIds([]);
    navigateTo("shop");
    setOpenDropdownId(null);
    setMobileMenuOpen(false);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSelectedShopCategoryIds([]);
      navigateTo("shop");
      setShowSearchModal(false);
      setMobileMenuOpen(false);
    }
  };

  const renderCategoryItem = (item, align = "left") => {
    const hasChildren = item.children && item.children.length > 0;
    const dropdownOpen = openDropdownId === `cat-${item.id}`;
    const dropdownClass = align === "right" ? "right-0" : "left-0";

    return (
      <div
        key={item.id}
        className="relative group/item"
        onMouseEnter={() => hasChildren && setOpenDropdownId(`cat-${item.id}`)}
        onMouseLeave={() => hasChildren && setOpenDropdownId(null)}
      >
        <button
          type="button"
          onClick={() => openShopForCategory(item)}
          className={`inline-flex items-center gap-1.5 py-1 uppercase transition-colors hover:text-[#d90429] ${
            activeTab === "shop" ? "text-white" : "text-white"
          }`}
        >
          <span>{item.name}</span>
          {hasChildren && <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {hasChildren && (
          <div
            className={`absolute top-full ${dropdownClass} mt-4 w-72 bg-[#161616] border border-[#2a2a2a] rounded-xl shadow-2xl py-3 z-50 transition-all duration-200 ${
              dropdownOpen
                ? "opacity-100 visible translate-y-0"
                : "opacity-0 invisible -translate-y-1 group-hover/item:opacity-100 group-hover/item:visible group-hover/item:translate-y-0"
            }`}
          >
            <button
              type="button"
              onClick={() => openShopForCategory(item)}
              className="block w-full text-left px-4 py-2 text-xs font-bold text-white hover:bg-[#222] hover:text-[#d90429]"
            >
              Voir toute la categorie
            </button>
            <div className="my-2 h-px bg-white/5" />
            {item.children.map((subItem) => (
              <button
                type="button"
                key={subItem.id}
                onClick={() => openShopForCategory(subItem)}
                className="block w-full text-left px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white hover:bg-[#222]"
              >
                {subItem.name}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderUtilityItem = (item) => (
    <button
      key={item.id}
      type="button"
      onClick={() => {
        navigateTo(item.id);
        setMobileMenuOpen(false);
      }}
      className={`uppercase py-1 transition-colors hover:text-[#d90429] ${
        activeTab === item.id ? "text-[#d90429] border-b-2 border-[#d90429]" : "text-white"
      }`}
    >
      {item.label}
    </button>
  );

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0e0e0e]/95 backdrop-blur-md border-b border-white/10 font-heading relative overflow-visible">
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="navbar-red-shine-beam absolute top-0 bottom-0 w-[45%] opacity-40 blur-xl bg-gradient-to-r from-transparent via-[#ff1a3c] to-transparent pointer-events-none" />
        <div className="absolute inset-0 flex items-center opacity-45">
          <div className="w-[200%] h-full flex animate-navbar-wave">
            <svg className="w-1/2 h-full" viewBox="0 0 1200 120" preserveAspectRatio="none">
              <defs>
                <linearGradient id="navWaveGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#d90429" stopOpacity="0" />
                  <stop offset="25%" stopColor="#ff2846" stopOpacity="0.75" />
                  <stop offset="50%" stopColor="#ff5e78" stopOpacity="1" />
                  <stop offset="75%" stopColor="#ff2846" stopOpacity="0.75" />
                  <stop offset="100%" stopColor="#d90429" stopOpacity="0" />
                </linearGradient>
                <filter id="glowRed" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <path
                d="M 0 60 Q 150 15 300 60 T 600 60 T 900 60 T 1200 60"
                fill="none"
                stroke="url(#navWaveGrad1)"
                strokeWidth="4"
                filter="url(#glowRed)"
              />
              <path
                d="M 0 75 Q 200 115 400 75 T 800 75 T 1200 75"
                fill="none"
                stroke="#ff0033"
                strokeWidth="2"
                strokeOpacity="0.65"
                filter="url(#glowRed)"
              />
            </svg>
            <svg className="w-1/2 h-full" viewBox="0 0 1200 120" preserveAspectRatio="none">
              <path
                d="M 0 60 Q 150 15 300 60 T 600 60 T 900 60 T 1200 60"
                fill="none"
                stroke="url(#navWaveGrad1)"
                strokeWidth="4"
                filter="url(#glowRed)"
              />
              <path
                d="M 0 75 Q 200 115 400 75 T 800 75 T 1200 75"
                fill="none"
                stroke="#ff0033"
                strokeWidth="2"
                strokeOpacity="0.65"
                filter="url(#glowRed)"
              />
            </svg>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-[2.5px] w-[60%] bg-gradient-to-r from-transparent via-[#ff1a3c] to-transparent navbar-bottom-laser" />
      </div>

      {banner?.enabled && (
        <div
          className="relative z-10 py-1.5 px-4 overflow-hidden text-[11px] font-black tracking-widest uppercase text-center"
          style={{ backgroundColor: banner.backgroundColor || "#d90429", color: banner.textColor || "#ffffff" }}
        >
          <div className="banner-marquee">
            <div className="banner-marquee__track">
              <div className="banner-marquee__group">
                <span>{bannerMessage}</span>
                <span aria-hidden="true">*</span>
                <span>{bannerMessage}</span>
                <span aria-hidden="true">*</span>
                <span>{bannerMessage}</span>
                <span aria-hidden="true">*</span>
                <span>{bannerMessage}</span>
              </div>
              <div className="banner-marquee__group" aria-hidden="true">
                <span>{bannerMessage}</span>
                <span>*</span>
                <span>{bannerMessage}</span>
                <span>*</span>
                <span>{bannerMessage}</span>
                <span>*</span>
                <span>{bannerMessage}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        <div className="hidden lg:flex items-center gap-7 text-xs font-black tracking-widest text-white">
          <button
            type="button"
            onClick={() => {
              setSelectedShopCategoryIds([]);
              navigateTo("home");
              setMobileMenuOpen(false);
            }}
            className={`uppercase py-1 transition-colors hover:text-[#d90429] ${
              activeTab === "home" ? "text-[#d90429] border-b-2 border-[#d90429]" : ""
            }`}
          >
            Accueil
          </button>

          {leftCategoryItems.map((item) => renderCategoryItem(item, "left"))}
        </div>

        <button
          onClick={() => {
            setSelectedShopCategoryIds([]);
            navigateTo("home");
          }}
          className="flex items-center gap-3 focus:outline-none group shrink-0"
          title="Accueil"
        >
          <div className="relative w-12 h-12 bg-[#d90429] rounded-lg flex items-center justify-center shadow-lg shadow-[#d90429]/40 border border-white/20 group-hover:scale-105 transition-transform">
            <Shield className="w-7 h-7 text-white fill-white/20" />
            <Dumbbell className="w-4 h-4 text-white absolute transform -rotate-45" />
          </div>
        </button>

        <div className="hidden lg:flex items-center gap-7 text-xs font-black tracking-widest text-white">
          {rightCategoryItems.map((item) => renderCategoryItem(item, "right"))}
          {utilityItems.map(renderUtilityItem)}
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <button
            onClick={() => setShowSearchModal(!showSearchModal)}
            className="p-2 text-gray-300 hover:text-[#d90429] transition-colors"
            title="Rechercher"
          >
            <Search className="w-5 h-5" />
          </button>

          <button
            onClick={() => navigateTo("cart")}
            className="relative p-2.5 bg-surface-high border border-white/10 hover:border-[#d90429] text-white rounded-lg transition-all"
            title="Acceder au panier"
          >
            <ShoppingBag className="w-5 h-5 text-white" />
            {totalItems > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-[#d90429] text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-lg">
                {totalItems}
              </span>
            )}
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-white"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {showSearchModal && (
        <div className="bg-[#131313] border-t border-b border-white/10 p-4 animate-fadeIn relative z-10">
          <form onSubmit={handleSearchSubmit} className="max-w-xl mx-auto flex gap-2">
            <input
              type="text"
              placeholder="Rechercher un produit (ex: Whey Isolate, Creatine...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-surface-dark border border-white/10 rounded-lg px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary"
            />
            <button
              type="submit"
              className="bg-primary text-white text-xs font-bold px-5 py-2.5 rounded-lg uppercase"
            >
              Rechercher
            </button>
          </form>
        </div>
      )}

      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#0e0e0e] border-t border-white/10 p-6 space-y-5 text-xs font-bold tracking-widest text-white uppercase relative z-10">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                setSelectedShopCategoryIds([]);
                navigateTo("home");
                setMobileMenuOpen(false);
              }}
              className="bg-surface p-3 rounded-lg text-left"
            >
              Accueil
            </button>
            <button
              onClick={() => {
                openShopHome();
              }}
              className="bg-surface p-3 rounded-lg text-left"
            >
              Boutique
            </button>
            <button
              onClick={() => {
                navigateTo("cart");
                setMobileMenuOpen(false);
              }}
              className="bg-surface p-3 rounded-lg text-left text-primary"
            >
              Panier
            </button>
          </div>

          {showCategoryMenu && (
            <div className="space-y-3">
              <div className="text-[11px] text-gray-500">Categories</div>
              <div className="space-y-2">
                {visibleCategoryTree.map((item) => (
                  <div key={item.id} className="bg-[#161616] border border-white/10 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => openShopForCategory(item)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left"
                    >
                      <span>{item.name}</span>
                      {item.children?.length > 0 && (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                    {item.children?.length > 0 && (
                      <div className="border-t border-white/5">
                        {item.children.map((child) => (
                          <button
                            key={child.id}
                            type="button"
                            onClick={() => openShopForCategory(child)}
                            className="block w-full text-left px-4 py-2 text-[11px] font-semibold text-gray-400 hover:text-white hover:bg-[#222]"
                          >
                            {child.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {utilityItems.length > 0 && (
            <div className="space-y-2">
              <div className="text-[11px] text-gray-500">More</div>
              <div className="grid grid-cols-2 gap-2">
                {utilityItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      navigateTo(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className="bg-[#161616] border border-white/10 p-3 rounded-lg text-left"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
