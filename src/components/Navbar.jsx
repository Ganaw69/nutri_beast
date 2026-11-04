import React, { useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "../context/CartContext";
import { useAdmin } from "../context/AdminContext";
import { categoryService, productService } from "../services/api";
import { extractCategoryItems, normalizeCategoryRecord } from "../utils/categoryTree";
import logo from "../assets/logo.png";
import {
  Search,
  ShoppingBag,
  Menu,
  X,
  Dumbbell,
  Bot,
  Calculator,
  PackagePlus,
  ArrowRight,
  ChevronDown,
  Mail,
  Phone,
} from "lucide-react";

const CONTACT_EMAIL = "contact@proteinstore.tn";
const CONTACT_PHONE = "+216 56 711 048";
const CONTACT_PHONE_LINK = "+21656711048";

const CategoryNavLabel = ({ label }) => {
  const words = String(label || "").trim().split(/\s+/).filter(Boolean);
  if (words.length <= 2) return label;

  return <span className="inline-flex flex-col leading-tight text-center">
    <span>{words.slice(0, 2).join(" ")}</span>
    <span>{words.slice(2).join(" ")}</span>
  </span>;
};

const normaliseSearchText = (value) => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("fr");

const ProductSearchSuggestions = ({ products, loading, onSelect, visible }) => {
  if (!visible) return null;

  return (
    <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-lg border border-[#3a3a3a] bg-[#121212] shadow-2xl">
      {loading ? (
        <p className="px-4 py-3 text-xs text-gray-400">Recherche des produits…</p>
      ) : products.length > 0 ? (
        <ul role="listbox" aria-label="Suggestions de produits" className="max-h-80 overflow-y-auto py-1">
          {products.map((product) => (
            <li key={product.id}>
              <button
                type="button"
                role="option"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onSelect(product)}
                className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-white/10 focus:bg-white/10 focus:outline-none"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-white">{product.name}</span>
                  {(product.brand?.name || product.category?.name) && (
                    <span className="block truncate text-[11px] text-gray-400">{[product.brand?.name, product.category?.name].filter(Boolean).join(" · ")}</span>
                  )}
                </span>
                {product.price !== undefined && product.price !== null && (
                  <span className="shrink-0 text-xs font-bold text-[#ff526d]">{Number(product.salePrice ?? product.price).toFixed(2)} €</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-4 py-3 text-xs text-gray-400">Aucun produit trouvé.</p>
      )}
    </div>
  );
};

export const Navbar = () => {
  const {
    activeTab,
    navigateTo,
    totalItems,
    searchQuery,
    setSearchQuery,
    setSelectedShopCategoryIds,
    viewProductDetails,
  } = useCart();
  const { categoryNavigation } = useAdmin();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [openCategoryId, setOpenCategoryId] = useState(null);
  const [categories, setCategories] = useState([]);
  const [shopCategories, setShopCategories] = useState([]);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchSurface, setSearchSurface] = useState(null);
  const [navbarHeight, setNavbarHeight] = useState(0);
  const navbarRef = useRef(null);
  const mobileSearchInputRef = useRef(null);

  const promoMessage = "Livraison offerte dès 300DT d'achat !";

  const openSearch = () => {
    setMobileMenuOpen(false);
    setShowSearchModal(true);
  };

  useEffect(() => {
    if (!showSearchModal) return undefined;
    const animationFrame = window.requestAnimationFrame(() => {
      mobileSearchInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      mobileSearchInputRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(animationFrame);
  }, [showSearchModal]);

  useEffect(() => {
    if (!mobileMenuOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    const updateNavbarHeight = () => {
      if (navbarRef.current) {
        setNavbarHeight(navbarRef.current.getBoundingClientRect().height);
      }
    };

    updateNavbarHeight();
    window.addEventListener("resize", updateNavbarHeight);
    const observer = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(updateNavbarHeight)
      : null;
    if (observer && navbarRef.current) observer.observe(navbarRef.current);

    return () => {
      window.removeEventListener("resize", updateNavbarHeight);
      if (observer) observer.disconnect();
    };
  }, []);

  const sectionTabs = useMemo(
    () => [
      { id: "shop", label: "Nutrition" },
      { id: "blog", label: "Blog" },
    ],
    []
  );

  const legacyCategoryStrip = useMemo(
    () => [
      { id: "shop", label: "Tendances" },
      { id: "protein", label: "Whey & Protéines" },
      { id: "supplements", label: "Prise de Masse" },
      { id: "creatine", label: "Créatine" },
      { id: "preworkout", label: "Pre-Workout" },
      { id: "vitamins", label: "Vitamines" },
      { id: "bars", label: "Barres & Snacks" },
      { id: "accessories", label: "Accessoires" },
      { id: "new", label: "Nouveautés" },
      { id: "sale", label: "Déstockage" },
      { id: "advice", label: "Conseils d'experts" },
    ],
    []
  );

  const categoryStrip = useMemo(
    () => [
      { id: "health", label: "Santé & Bien-être" },
      { id: "protein", label: "Protéines" },
      { id: "mass", label: "Prise de Masse & Glucides" },
      { id: "creatine", label: "Créatine" },
      { id: "amino", label: "Acides Aminés & BCAA" },
      { id: "preworkout", label: "Pré-Workout & Boosters" },
      { id: "weight-loss", label: "Perte de Poids" },
    ],
    []
  );

  const quickAccessStrip = useMemo(
    () => [
      { id: "snacks", label: "Snacks & Drinks" },
      { id: "packs", label: "Packs Exclusifs" },
      { id: "new", label: "Nouveautés" },
      { id: "women", label: "Santé de la Femme" },
      { id: "accessories", label: "Accessoires" },
    ],
    []
  );

  useEffect(() => {
    let mounted = true;

    categoryService.getAll({ isActive: true, itemsPerPage: 100 }, true)
      .then((data) => {
        if (mounted) setShopCategories(extractCategoryItems(data));
      })
      .catch(() => {
        if (mounted) setShopCategories([]);
      });

    categoryService.getMain(true)
      .then((data) => {
        if (!mounted) return;

        // `/categories/main` already contains exactly the seven root records.
        // Each root contains its direct children, matching parent_id in the DB.
        const roots = extractCategoryItems(data?.member || data?.['hydra:member'] || data)
          .map((category) => ({
            ...category,
            children: (category.children || [])
              .map(normalizeCategoryRecord)
              .filter((child) => child.id !== null && child.id !== undefined)
              .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name, 'fr')),
          }))
          .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name, 'fr'));

        setCategories(roots);
      })
      .catch(() => {
        if (mounted) setCategories([]);
      });

    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const enteredQuery = searchQuery.trim();
    const normalisedQuery = normaliseSearchText(enteredQuery);
    if (!normalisedQuery) {
      setSearchSuggestions([]);
      setSearchLoading(false);
      return undefined;
    }

    let current = true;
    const timer = window.setTimeout(async () => {
      setSearchLoading(true);
      try {
        // Suggestions need only a handful of matching records.  Fetching every
        // catalogue page here made the first keystroke wait for the complete
        // product catalogue to download.
        const data = await productService.getAll({
          isActive: true,
          name: enteredQuery,
          itemsPerPage: 7,
        }, true);
        const suggestions = (data["hydra:member"] || [])
          .filter((product) => product?.isActive !== false && product?.active !== false && product?.brand?.isActive !== false && product?.brand?.active !== false)
          .filter((product) => normaliseSearchText(product.name).includes(normalisedQuery))
          .slice(0, 7);
        if (current) setSearchSuggestions(suggestions);
      } catch {
        if (current) setSearchSuggestions([]);
      } finally {
        if (current) setSearchLoading(false);
      }
    }, 150);

    return () => {
      current = false;
      window.clearTimeout(timer);
    };
  }, [searchQuery]);

  const navigationCategories = useMemo(() => {
    const hiddenIds = new Set((categoryNavigation?.hiddenTopLevelCategoryIds || []).map(String));
    const orderedIds = (categoryNavigation?.topLevelOrder || []).map(String);
    const topLevel = categories.filter((category) => !hiddenIds.has(String(category.id)));
    const byId = new Map(topLevel.map((category) => [String(category.id), category]));
    const ordered = orderedIds.map((id) => byId.get(id)).filter(Boolean);
    const remaining = topLevel.filter((category) => !orderedIds.includes(String(category.id)));
    return [...ordered, ...remaining].map((category) => ({
      ...category,
      // The category entity exposes `name`; the original navbar expected `label`.
      label: category.name,
    }));
  }, [categories, categoryNavigation]);

  const mobileCategories = useMemo(
    () => navigationCategories.filter((category) => {
      const label = normaliseSearchText(category.label);
      const isExclusivePackCategory = /^packs?\s+exclusifs?$/.test(label)
        || String(category.slug || category.code || "").toLowerCase().replace(/[-_]/g, " ").includes("pack exclusif");
      return !isExclusivePackCategory;
    }),
    [navigationCategories]
  );

  const secondaryDesktopLinks = useMemo(
    () => [
      ...quickAccessStrip,
      { id: "recipes", label: "Recettes" },
      { id: "blog", label: "Blog" },
    ],
    [quickAccessStrip]
  );

  const mobileQuickLinks = useMemo(() => {
    const categoryNames = navigationCategories.map((category) => normaliseSearchText(category.label));
    const categoryAliases = {
      snacks: ["snack", "drink", "boisson"],
      packs: ["pack"],
      new: ["nouveaute"],
      women: ["femme"],
      accessories: ["accessoire"],
      recipes: ["recette"],
      blog: ["blog"],
    };

    return secondaryDesktopLinks.filter((link) => {
      // Packs Exclusifs is a dedicated catalogue page, not a product category.
      if (link.id === "packs") return true;
      const aliases = categoryAliases[link.id] || [normaliseSearchText(link.label)];
      return !categoryNames.some((categoryName) => aliases.some((alias) => categoryName.includes(alias)));
    });
  }, [navigationCategories, secondaryDesktopLinks]);

  const navigateShop = (query = "") => {
    setSelectedShopCategoryIds([]);
    setSearchQuery(query);
    navigateTo("shop");
    setMobileMenuOpen(false);
    setShowSearchModal(false);
  };

  const navigateToCategory = (categoryId) => {
    setSearchQuery("");
    setSelectedShopCategoryIds([categoryId]);
    navigateTo("shop");
    setMobileMenuOpen(false);
    setShowSearchModal(false);
  };

  const navigateToShopFilter = (shopFilters) => {
    setSearchQuery("");
    setSelectedShopCategoryIds([]);
    navigateTo("shop", { shopFilters });
    setMobileMenuOpen(false);
    setShowSearchModal(false);
  };

  // Parent categories filter the complete branch; the submenu still lets
  // visitors narrow the results to a child category.
  const handleRootCategoryClick = (category) => {
    navigateToCategory(category.id);
    if (category.children?.length > 0) {
      setOpenCategoryId((current) => current === category.id ? null : category.id);
    }
  };

  const handleMobileRootCategoryClick = (event, category) => {
    if (category.children?.length > 0) {
      event.preventDefault();
      setOpenCategoryId((current) => current === category.id ? null : category.id);
      return;
    }

    navigateToCategory(category.id);
  };

  const handleSectionClick = (sectionId) => {
    if (sectionId === "shop") {
      navigateShop("");
      return;
    }

    if (sectionId === "recipes") {
      navigateTo("recipes");
      setMobileMenuOpen(false);
      return;
    }

    if (sectionId === "calculator") {
      navigateTo("calculator");
      setMobileMenuOpen(false);
      return;
    }

    navigateTo(sectionId);
    setMobileMenuOpen(false);
  };

  const handleCategoryClick = async (categoryId) => {
    const shopFilters = {
      new: { filter: "new" },
      snacks: { category: "snacks-drinks" },
      women: { category: "sante-de-la-femme" },
      accessories: { category: "accessoires" },
    };
    if (shopFilters[categoryId]) {
      navigateToShopFilter(shopFilters[categoryId]);
      return;
    }

    if (categoryId === "packs") {
      navigateTo("packs");
      setMobileMenuOpen(false);
      return;
    }

    const quickLink = quickAccessStrip.find((item) => item.id === categoryId);
    if (quickLink) {
      let availableCategories = shopCategories;
      if (availableCategories.length === 0) {
        try {
          const data = await categoryService.getAll({ isActive: true, itemsPerPage: 100 }, true);
          availableCategories = extractCategoryItems(data);
          setShopCategories(availableCategories);
        } catch {
          return;
        }
      }

      const normaliseCategoryName = (value) => normaliseSearchText(value).replace(/[^a-z0-9]/g, "");
      const targetName = normaliseCategoryName(quickLink.label);
      const matchingCategory = availableCategories.find((category) =>
        normaliseCategoryName(category.name) === targetName
      );
      if (matchingCategory) navigateToCategory(matchingCategory.id);
      return;
    }

    switch (categoryId) {
      case "protein":
        navigateShop("whey");
        break;
      case "health":
        navigateShop("vitamin");
        break;
      case "mass":
        navigateShop("mass gainer");
        break;
      case "amino":
        navigateShop("BCAA");
        break;
      case "weight-loss":
        navigateShop("carnitine");
        break;
      case "supplements":
        navigateShop("mass gainer");
        break;
      case "creatine":
        navigateShop("creatine");
        break;
      case "preworkout":
        navigateShop("pre workout");
        break;
      case "vitamins":
        navigateShop("vitamin");
        break;
      case "bars":
        navigateShop("barre");
        break;
      case "packs":
        navigateShop("pack");
        break;
      case "sale":
        navigateShop("");
        break;
      default:
        navigateShop("");
        break;
    }
  };

  const handleSubCategoryClick = (category) => {
    navigateToCategory(category.id);
    setOpenCategoryId(null);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigateShop(searchQuery.trim());
    }
  };

  const handleSearchChange = (value) => {
    // Keep the visitor on the current page while they choose from suggestions.
    // Pressing Enter still opens the full filtered shop catalogue.
    setSelectedShopCategoryIds([]);
    setSearchQuery(value);
  };

  const selectSearchSuggestion = (product) => {
    setSearchQuery(product.name);
    setSearchSuggestions([]);
    setSearchSurface(null);
    setShowSearchModal(false);
    viewProductDetails(product.id);
  };

  return (
    <header ref={navbarRef} className="relative z-40 w-full bg-[#050505]/98 backdrop-blur-xl border-b border-[#2e261b] font-heading overflow-visible">
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
        <div className="absolute bottom-0 left-0 w-full h-[2.5px] navbar-bottom-laser" />
      </div>

      <div className="pointer-events-none relative z-10 isolate overflow-hidden bg-[#8f1025] px-4 py-1.5 text-center text-[9px] font-black uppercase tracking-[0.16em] text-white sm:text-[10px] sm:tracking-[0.28em]">
        <div className="banner-marquee">
          <div className="banner-marquee__track">
            <div className="banner-marquee__group">
              <span>{promoMessage}</span>
              <span aria-hidden="true">*</span>
              <span>{promoMessage}</span>
              <span aria-hidden="true">*</span>
              <span>{promoMessage}</span>
              <span aria-hidden="true">*</span>
              <span>{promoMessage}</span>
            </div>
            <div className="banner-marquee__group" aria-hidden="true">
              <span>{promoMessage}</span>
              <span>*</span>
              <span>{promoMessage}</span>
              <span>*</span>
              <span>{promoMessage}</span>
              <span>*</span>
              <span>{promoMessage}</span>
            </div>
            <div className="banner-marquee__group" aria-hidden="true">
              <span>{promoMessage}</span>
              <span>*</span>
              <span>{promoMessage}</span>
              <span>*</span>
              <span>{promoMessage}</span>
              <span>*</span>
              <span>{promoMessage}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 border-b border-white/10 bg-black/80 px-4 py-2.5 text-xs font-bold text-white/80 sm:px-6 sm:text-sm lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-6 gap-y-1.5 sm:justify-start">
          <a
            href={`tel:${CONTACT_PHONE_LINK}`}
            className="inline-flex items-center gap-1.5 transition-colors hover:text-white"
            aria-label={`Appeler le ${CONTACT_PHONE}`}
          >
            <Phone className="h-4 w-4 text-[#ff526d]" aria-hidden="true" />
            <span>{CONTACT_PHONE}</span>
          </a>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="inline-flex items-center gap-1.5 transition-colors hover:text-white"
          >
            <Mail className="h-4 w-4 text-[#ff526d]" aria-hidden="true" />
            <span>{CONTACT_EMAIL}</span>
          </a>
        </div>
      </div>

      <div className="relative z-10 w-full px-4 py-3 sm:px-6 sm:py-4 lg:px-8 lg:py-2">
        <div className="flex min-h-28 items-center gap-2 xl:hidden">
          <button
            onClick={() => {
              setSelectedShopCategoryIds([]);
              navigateTo("home");
              setMobileMenuOpen(false);
            }}
            className="group flex min-w-0 shrink-0 items-center rounded-full bg-black/20 p-1.5 ring-1 ring-[#ff003b]/35 focus:outline-none"
            title="Accueil"
          >
            <img 
              src={logo} 
              alt="Nutri Beast" 
              className="h-32 w-auto max-w-[46vw] object-contain drop-shadow-[0_0_20px_rgba(255,0,59,0.7)] transition-transform duration-200 group-hover:scale-105 sm:h-36"
            />
          </button>

          <div className="hidden lg:flex items-center gap-4 ml-2">
            {sectionTabs.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSectionClick(item.id)}
                  className={`min-w-[118px] rounded-lg border px-4 py-2.5 text-xs font-black tracking-[0.16em] uppercase transition-all duration-200 ${
                    isActive
                      ? "border-white bg-white/10 text-white shadow-[0_0_18px_rgba(255,255,255,0.12)]"
                      : "border-white/25 bg-transparent text-white/80 hover:border-white hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1 xl:hidden">
            <button
              onClick={() => showSearchModal ? setShowSearchModal(false) : openSearch()}
              className="p-2.5 text-white hover:text-[#ff7f3f] transition-colors"
              title="Rechercher"
              aria-label="Ouvrir la recherche"
            >
              <Search className="w-6 h-6" />
            </button>
            <button
              onClick={() => navigateTo("cart")}
              className="relative p-3 text-white hover:text-[#ff7f3f] transition-colors"
              title="Panier"
            >
              <ShoppingBag className="w-6 h-6" />
              {totalItems > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-[#d90429] text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-lg">
                  {totalItems}
                </span>
              )}
            </button>
            <button
              onClick={() => { setMobileMenuOpen((open) => !open); setShowSearchModal(false); }}
              className="p-2 text-white"
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        <div className="hidden xl:grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-6 min-h-[90px]">
          <nav className="flex min-w-0 items-center justify-end gap-1 2xl:gap-2 pr-2" aria-label="Catégories principales">
            {navigationCategories.slice(0, 4).map((item) => (
              <div
                key={item.id}
                className="relative"
                onMouseEnter={() => item.children && setOpenCategoryId(item.id)}
                onMouseLeave={() => item.children && setOpenCategoryId(null)}
              >
                <button
                  type="button"
                  aria-expanded={item.children ? openCategoryId === item.id : undefined}
                  onClick={() => handleRootCategoryClick(item)}
                  className={`whitespace-nowrap rounded-md px-1.5 py-2 text-sm 2xl:px-2.5 2xl:text-[17px] font-black uppercase tracking-wide transition-colors ${openCategoryId === item.id ? "bg-white/15 text-white" : "text-white hover:bg-white/10"}`}
                >
                  <CategoryNavLabel label={item.label} />{item.children && <span className="ml-1 text-[9px]">{openCategoryId === item.id ? "▲" : "▼"}</span>}
                </button>
                {item.children && openCategoryId === item.id && (
                  <div className="absolute right-0 top-full z-50 min-w-[250px] rounded-xl border border-white/25 bg-[#111] p-2 shadow-2xl">
                    {item.children.map((child) => (
                      <button key={child.id} type="button" onClick={() => handleSubCategoryClick(child)} className="block w-full rounded-lg px-3 py-2 text-left text-sm font-bold normal-case tracking-normal text-white transition-colors hover:bg-white/10">
                        {child.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          <button
            onClick={() => { setSelectedShopCategoryIds([]); navigateTo("home"); }}
            className="flex items-center justify-center focus:outline-none group px-4 py-1"
            title="Accueil"
          >
            <img 
              src={logo} 
              alt="Nutri Beast" 
              className="h-60 w-auto max-w-none 2xl:h-72 object-contain drop-shadow-[0_0_24px_rgba(255,255,255,0.3)] group-hover:scale-105 transition-transform duration-200" 
            />
          </button>

          <nav className="flex min-w-0 items-center justify-start gap-1 2xl:gap-2 pl-2 pr-52" aria-label="Catégories secondaires">
            {navigationCategories.slice(4, 7).map((item) => (
              <div
                key={item.id}
                className="relative"
                onMouseEnter={() => item.children && setOpenCategoryId(item.id)}
                onMouseLeave={() => item.children && setOpenCategoryId(null)}
              >
                <button
                  type="button"
                  aria-expanded={item.children ? openCategoryId === item.id : undefined}
                  onClick={() => handleRootCategoryClick(item)}
                  className={`whitespace-nowrap rounded-md px-1.5 py-2 text-sm 2xl:px-2.5 2xl:text-[17px] font-black uppercase tracking-wide transition-colors ${openCategoryId === item.id ? "bg-white/15 text-white" : "text-white hover:bg-white/10"}`}
                >
                  <CategoryNavLabel label={item.label} />{item.children && <span className="ml-1 text-[9px]">{openCategoryId === item.id ? "▲" : "▼"}</span>}
                </button>
                {item.children && openCategoryId === item.id && (
                  <div className="absolute left-0 top-full z-50 min-w-[250px] rounded-xl border border-white/25 bg-[#111] p-2 shadow-2xl">
                    {item.children.map((child) => (
                      <button key={child.id} type="button" onClick={() => handleSubCategoryClick(child)} className="block w-full rounded-lg px-3 py-2 text-left text-sm font-bold normal-case tracking-normal text-white transition-colors hover:bg-white/10">
                        {child.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          <div className="absolute right-6 2xl:right-8 flex items-center gap-2 border-l border-white/25 pl-3" aria-label="Actions rapides">
            <button onClick={() => showSearchModal ? setShowSearchModal(false) : openSearch()} className="p-2 text-white/85 hover:text-white hover:bg-white/10 rounded-md transition-colors" title="Rechercher" aria-label="Rechercher">
              <Search className="w-6 h-6" />
            </button>
            <button onClick={() => navigateTo("cart")} className="relative p-2 text-white/85 hover:text-white hover:bg-white/10 rounded-md transition-colors" title="Panier" aria-label="Panier">
              <ShoppingBag className="w-6 h-6" />
              {totalItems > 0 && <span className="absolute -top-1 -right-1 bg-white text-black text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center">{totalItems}</span>}
            </button>
          </div>
        </div>

        {showSearchModal && (
          <div className="hidden xl:block border-t border-white/20 pt-3">
            <form onSubmit={handleSearchSubmit} className="mx-auto flex max-w-3xl items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#ff526d]" aria-hidden="true" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Rechercher un produit"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() => setSearchSurface("desktop")}
                  onBlur={() => window.setTimeout(() => setSearchSurface(null), 150)}
                  className="w-full rounded-lg border border-[#d90429] bg-[#11100e] px-12 py-3 text-sm font-medium text-white placeholder:text-white/60 focus:border-[#ff526d] focus:outline-none focus:ring-1 focus:ring-[#ff526d]"
                  aria-label="Rechercher un produit"
                />
                <ProductSearchSuggestions
                  products={searchSuggestions}
                  loading={searchLoading}
                  visible={searchSurface === "desktop" && Boolean(searchQuery.trim())}
                  onSelect={selectSearchSuggestion}
                />
              </div>
              <button type="submit" className="rounded-lg bg-[#d90429] px-5 py-3 text-xs font-black uppercase tracking-wide text-white transition-colors hover:bg-[#b0021f]">
                Rechercher
              </button>
              <button
                type="button"
                onClick={() => { setShowSearchModal(false); setSearchSurface(null); }}
                className="rounded-lg p-3 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Fermer la recherche"
                title="Fermer la recherche"
              >
                <X className="h-5 w-5" />
              </button>
            </form>
          </div>
        )}

        <nav className="hidden xl:flex items-center justify-center gap-1 2xl:gap-2 border-t border-white/25 pt-3 mt-1" aria-label="Accès rapides">
          {secondaryDesktopLinks.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => quickAccessStrip.some((quickLink) => quickLink.id === item.id) ? handleCategoryClick(item.id) : handleSectionClick(item.id)}
              className="whitespace-nowrap rounded-md px-2 py-2 text-sm 2xl:px-3 2xl:text-[17px] font-black uppercase tracking-wide text-white transition-colors hover:bg-white/10"
            >
              {item.label}
            </button>
          ))}
        </nav>

        <nav className="mt-4 hidden rounded-2xl border border-[#f0143c]/70 bg-[#070809]/95 p-2 shadow-[0_0_24px_rgba(240,20,60,0.18)] lg:block" aria-label="Services et outils">
          <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden xl:grid xl:grid-cols-[1fr_1fr_1fr_1.15fr] xl:gap-1 xl:overflow-visible xl:pb-0">
            {[
              { id: "coach-ia", title: "Coach IA", subtitle: "Votre coach personnel", indication: "CHATBOT IA · 24/7", Icon: Bot, onClick: () => navigateTo("coach-ia") },
              { id: "nutritionist-ai", title: "Nutrition IA", subtitle: "Votre expert nutrition et régimes", indication: "CHATBOT IA · NUTRITION", Icon: Dumbbell, onClick: () => navigateTo("nutritionist-ai") },
              { id: "calculator", title: "Calculateur", subtitle: "Calculez vos calories et macros", indication: "OUTIL NUTRITIONNEL", Icon: Calculator, onClick: () => navigateTo("calculator") },
            ].map(({ id, title, subtitle, indication, Icon, onClick }) => (
              <button key={id} type="button" onClick={onClick} className="group flex min-h-[76px] min-w-[270px] snap-start items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-white/[0.06] sm:min-w-[300px] sm:px-4 xl:min-w-0 xl:border-r xl:border-[#f0143c]/35 xl:rounded-none">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#f0143c]/75 bg-[#10090b] text-[#ff2448] shadow-[0_0_14px_rgba(240,20,60,0.16)] transition group-hover:bg-[#f0143c]/15 group-hover:shadow-[0_0_20px_rgba(240,20,60,0.35)]"><Icon className="h-6 w-6" /></span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-black text-white">{title}</span><span className="mt-1 block text-[9px] font-black tracking-wide text-[#ff526d]">{indication}</span><span className="mt-0.5 block text-[11px] font-medium text-gray-400">{subtitle}</span></span>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#f0143c]/50 text-[#ff526d] transition group-hover:bg-[#f0143c] group-hover:text-white"><ArrowRight className="h-4 w-4" /></span>
              </button>
            ))}
            <button type="button" onClick={() => navigateTo("pack-builder")} className="group flex min-h-[76px] min-w-[290px] snap-start items-center gap-3 rounded-xl bg-gradient-to-r from-[#f0143c] to-[#c9002d] px-3 py-3 text-left shadow-[0_0_20px_rgba(240,20,60,0.24)] transition hover:brightness-110 sm:min-w-[320px] sm:px-4 xl:min-w-0">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/35 bg-white/10 text-white"><PackagePlus className="h-6 w-6" /></span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-black text-white">Vos packs — Composez votre pack</span><span className="mt-1 block text-[11px] font-medium text-white/80">Créez votre sélection personnalisée</span></span>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/90 text-[#d90429] transition group-hover:translate-x-0.5"><ArrowRight className="h-4 w-4" /></span>
            </button>
          </div>
        </nav>

        <div className="hidden lg:flex xl:hidden flex-col gap-3 mt-4 border-t border-white/25 pt-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] font-bold text-white">
            {navigationCategories.map((item) => (
                <div
                  key={item.id}
                  className="relative"
                  onMouseEnter={() => setOpenCategoryId(item.id)}
                  onMouseLeave={() => setOpenCategoryId(null)}
                >
                <button
                  type="button"
                  aria-expanded={openCategoryId === item.id}
                  onClick={() => handleRootCategoryClick(item)}
                  className={`whitespace-nowrap rounded-md px-3 py-2 transition-all border ${openCategoryId === item.id ? "border-white bg-white/10 text-white" : "border-transparent text-white/80 hover:border-white/25 hover:bg-white/10 hover:text-white"}`}
                >
                  {item.label} <span className="ml-1 text-[10px]">{openCategoryId === item.id ? "▲" : "▼"}</span>
                </button>
                {openCategoryId === item.id && (
                  <div className="absolute left-0 top-full z-50 min-w-[250px] rounded-xl border border-[#3a3a3a] bg-[#111] p-2 shadow-2xl">
                    {item.children.map((child) => (
                      <button key={child.id} type="button" onClick={() => handleSubCategoryClick(child)} className="block w-full rounded-lg px-3 py-2 text-left text-xs font-semibold normal-case tracking-normal text-[#d0d0d0] transition-colors hover:bg-[#252525] hover:text-[#ff6a2b]">
                        {child.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#8f887d]">
            {quickAccessStrip.map((item) => (
              <button key={item.id} type="button" onClick={() => handleCategoryClick(item.id)} className="whitespace-nowrap rounded-md px-3 py-1.5 transition-all border border-transparent hover:border-white/25 hover:bg-white/10 hover:text-white">
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {showSearchModal && (
        <div className="relative z-10 border-t border-b border-[#2b2b2b] bg-black p-4 animate-fadeIn xl:hidden">
          <div className="relative max-w-xl mx-auto">
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <input
                ref={mobileSearchInputRef}
                type="text"
                placeholder="Rechercher un produit"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => setSearchSurface("modal")}
                onBlur={() => window.setTimeout(() => setSearchSurface(null), 150)}
                className="flex-1 bg-[#171717] border border-[#d90429] rounded-lg px-4 py-2.5 text-xs text-white placeholder-white/50 focus:outline-none focus:border-[#d90429]"
              />
              <button
                type="submit"
                className="bg-[#d90429] hover:bg-[#b0021f] text-white text-xs font-bold px-5 py-2.5 rounded-lg uppercase"
              >
                Rechercher
              </button>
            </form>
            <ProductSearchSuggestions
              products={searchSuggestions}
              loading={searchLoading}
              visible={searchSurface === "modal" && Boolean(searchQuery.trim())}
              onSelect={selectSearchSuggestion}
            />
          </div>
        </div>
      )}

      {mobileMenuOpen && (
        <div
          className="mobile-menu-drawer absolute left-0 right-0 z-[60] flex min-h-0 w-full max-w-full flex-col overflow-x-hidden overflow-y-auto overscroll-contain border-t border-[#2b2b2b] bg-black p-4 text-xs font-medium tracking-normal text-white shadow-2xl shadow-black/60 xl:hidden sm:p-6"
          style={{ top: `${navbarHeight}px`, height: `calc(100vh - ${navbarHeight}px)` }}
        >
          <section className="shrink-0" aria-labelledby="mobile-tools-title">
            <h2 id="mobile-tools-title" className="mb-3 text-[10px] font-medium uppercase tracking-[0.16em] text-gray-500">Services et outils</h2>
            <div className="grid w-full grid-cols-2 gap-2">
              {[
              { id: "coach-ia", title: "Coach IA", indication: "CHATBOT IA · 24/7", subtitle: "Votre coach personnel", Icon: Bot, onClick: () => navigateTo("coach-ia") },
              { id: "nutritionist-ai", title: "Nutrition IA", indication: "CHATBOT IA · NUTRITION", subtitle: "Votre expert nutrition et régimes", Icon: Dumbbell, onClick: () => navigateTo("nutritionist-ai") },
              { id: "calculator", title: "Calculateur", indication: "OUTIL NUTRITIONNEL", subtitle: "Calculez vos calories et macros", Icon: Calculator, onClick: () => navigateTo("calculator") },
              { id: "pack-builder", title: "Vos packs", indication: "PACKS", subtitle: "Composez votre pack", Icon: PackagePlus, onClick: () => navigateTo("pack-builder") },
              ].map(({ id, title, subtitle, indication, Icon, onClick }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    onClick();
                    setMobileMenuOpen(false);
                  }}
                  className={`flex min-w-0 items-center gap-2 rounded-xl border p-2.5 text-left transition-all active:scale-[0.98] ${id === "pack-builder" ? "border-[#ff003b] bg-[#ff003b] text-white hover:bg-[#e00034]" : "border-neutral-800 bg-neutral-900/80 hover:border-[#d90429]/70 hover:bg-neutral-900"}`}
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${id === "pack-builder" ? "border-white/40 bg-white/10 text-white" : "border-[#d90429]/60 bg-[#16090c] text-[#ff526d]"}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-bold text-white">{title}</span>
                    <span className={`mt-0.5 block truncate text-[8px] leading-3 font-black tracking-wide ${id === "pack-builder" ? "text-white" : "text-[#ff526d]"}`}>{indication}</span>
                    <span className={`mt-1 block truncate text-[9px] leading-3 ${id === "pack-builder" ? "text-white/85" : "text-gray-400"}`}>{subtitle}</span>
                  </span>
                  <ArrowRight className={`h-4 w-4 shrink-0 ${id === "pack-builder" ? "text-white" : "text-[#ff526d]"}`} />
                </button>
              ))}
            </div>
          </section>

          <div className="mt-5 border-t border-neutral-800 pt-4">
            <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.16em] text-gray-500">Catégories</p>
            <div className="space-y-2">
              {mobileCategories.map((item) => (
                <div key={item.id} className="rounded-xl border border-neutral-800 bg-[#18181b]">
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={(event) => handleMobileRootCategoryClick(event, item)}
                      className="min-w-0 flex-1 p-3 text-left font-medium text-white"
                      aria-expanded={item.children?.length > 0 ? openCategoryId === item.id : undefined}
                    >
                      <span className="block truncate">{item.label}</span>
                    </button>
                    {item.children?.length > 0 && <button type="button" onClick={() => setOpenCategoryId((current) => current === item.id ? null : item.id)} className="p-3 text-red-500" aria-label={`${openCategoryId === item.id ? "Réduire" : "Développer"} ${item.label}`} aria-expanded={openCategoryId === item.id}><ChevronDown className={`h-4 w-4 transition-transform ${openCategoryId === item.id ? "rotate-180" : ""}`} /></button>}
                  </div>
                  {openCategoryId === item.id && item.children?.length > 0 && (
                    <div className="mx-3 mb-3 space-y-1 border-l border-red-500/70 pl-3">
                      {item.children.map((child) => (
                        <button key={child.id} onClick={() => handleSubCategoryClick(child)} className="block w-full rounded px-2 py-1.5 text-left text-[11px] font-normal text-gray-300 hover:bg-neutral-900 hover:text-white">
                          {child.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-5 border-t border-neutral-800 pt-4">
              <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.16em] text-gray-500">Liens rapides</p>
              <div className="grid grid-cols-2 gap-3">
                {mobileQuickLinks.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => quickAccessStrip.some((quickLink) => quickLink.id === item.id) ? handleCategoryClick(item.id) : handleSectionClick(item.id)}
                    className="rounded-xl border border-neutral-800 bg-neutral-900/80 p-3 text-left font-medium text-white transition-colors hover:border-[#d90429]/70"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
