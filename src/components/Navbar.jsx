import React, { useMemo, useState } from "react";
import { useCart } from "../context/CartContext";
import { CATEGORY_ARCHITECTURE } from "../data/categoryArchitecture";
import logo from "../assets/logo.png";
import {
  Search,
  ShoppingBag,
  Menu,
  X,
  Dumbbell,
  Sparkles,
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

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [openCategoryId, setOpenCategoryId] = useState(null);

  const promoMessage = "Livraison offerte dès 60€";

  const sectionTabs = useMemo(
    () => [
      { id: "shop", label: "Nutrition" },
      { id: "blog", label: "Blog" },
      { id: "calculator", label: "Calculateur" },
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

  const navigationCategories = useMemo(
    () => CATEGORY_ARCHITECTURE.map((category) => ({
      id: category.name,
      label: category.name,
      children: category.children,
    })),
    []
  );

  const secondaryDesktopLinks = useMemo(
    () => [
      ...quickAccessStrip,
      { id: "recipes", label: "Recettes" },
      { id: "blog", label: "Blog" },
      { id: "coach-ia", label: "Coach IA" },
      { id: "nutritionist-ai", label: "Nutrition IA" },
      { id: "calculator", label: "Calculateur" },
    ],
    [quickAccessStrip]
  );

  const navigateShop = (query = "") => {
    setSelectedShopCategoryIds([]);
    setSearchQuery(query);
    navigateTo("shop");
    setMobileMenuOpen(false);
    setShowSearchModal(false);
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

  const handleCategoryClick = (categoryId) => {
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
      case "snacks":
        navigateShop("snack");
        break;
      case "packs":
        navigateShop("pack");
        break;
      case "women":
        navigateShop("femme");
        break;
      case "accessories":
        navigateShop("accessoire");
        break;
      case "new":
        navigateShop("");
        setMobileMenuOpen(false);
        break;
      case "sale":
        navigateShop("");
        break;
      default:
        navigateShop("");
        break;
    }
  };

  const handleSubCategoryClick = (name) => {
    navigateShop(name);
    setOpenCategoryId(null);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigateShop(searchQuery.trim());
    }
  };

  return (
    <header className="relative z-40 w-full bg-[#050505]/98 backdrop-blur-xl border-b border-[#2e261b] font-heading overflow-visible">
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

      <div className="relative z-10 py-1.5 px-4 overflow-hidden text-[10px] font-black tracking-[0.28em] uppercase text-center bg-[#8f1025] text-white">
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

      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 pt-2 pb-2">
        <div className="flex items-center gap-4 xl:hidden">
          <button
            onClick={() => {
              setSelectedShopCategoryIds([]);
              navigateTo("home");
              setMobileMenuOpen(false);
            }}
            className="flex items-center focus:outline-none group shrink-0 py-1"
            title="Accueil"
          >
            <img 
              src={logo} 
              alt="Nutri Beast" 
              className="h-20 w-auto sm:h-24 object-contain drop-shadow-[0_0_18px_rgba(255,255,255,0.2)] group-hover:scale-105 transition-transform duration-200" 
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

          <div className="hidden xl:flex flex-1 justify-center">
            <div className="relative w-full max-w-xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#ff6a2b]" />
              <input
                type="text"
                placeholder="Rechercher"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSearchSubmit(e);
                  }
                }}
                className="w-full rounded-lg bg-[#11100e] text-white placeholder:text-white/60 border border-white/25 px-12 py-3 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-white/50 focus:border-white"
              />
            </div>
          </div>

          <div className="hidden xl:flex items-center gap-3 shrink-0">
            <button
              onClick={() => navigateTo("nutritionist-ai")}
              className="rounded-lg border border-white/40 bg-white/10 px-3 py-2.5 text-[10px] font-black tracking-[0.12em] uppercase text-white transition-colors hover:border-white hover:bg-white/15 flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-white" />
              Nutrition IA
            </button>
            <button
              onClick={() => navigateTo("coach-ia")}
              className="rounded-lg border border-white/25 bg-transparent px-3 py-2.5 text-[10px] font-black tracking-[0.12em] uppercase text-white/80 transition-colors hover:border-white hover:bg-white/10 hover:text-white flex items-center gap-2"
            >
              <Dumbbell className="w-4 h-4 text-white" />
              Coach IA
            </button>
            <button
              onClick={() => navigateTo("cart")}
              className="relative p-2.5 text-white hover:text-white/70 transition-colors"
              title="Panier"
            >
              <ShoppingBag className="w-6 h-6" />
              {totalItems > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-[#d90429] text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-lg">
                  {totalItems}
                </span>
              )}
            </button>
          </div>

          <div className="ml-auto flex items-center gap-3 xl:hidden">
            <button
              onClick={() => setShowSearchModal(!showSearchModal)}
              className="p-2 text-white hover:text-[#ff7f3f] transition-colors"
              title="Rechercher"
            >
              <Search className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigateTo("cart")}
              className="relative p-2.5 text-white hover:text-[#ff7f3f] transition-colors"
              title="Panier"
            >
              <ShoppingBag className="w-5 h-5" />
              {totalItems > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-[#d90429] text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-lg">
                  {totalItems}
                </span>
              )}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-white"
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
                  onClick={() => !item.children && handleCategoryClick(item.id)}
                  className={`whitespace-nowrap rounded-md px-1.5 py-2 text-[11px] 2xl:px-2.5 2xl:text-sm font-black uppercase tracking-wide transition-colors ${openCategoryId === item.id ? "bg-white/15 text-white" : "text-white hover:bg-white/10"}`}
                >
                  {item.label}{item.children && <span className="ml-1 text-[9px]">{openCategoryId === item.id ? "▲" : "▼"}</span>}
                </button>
                {item.children && openCategoryId === item.id && (
                  <div className="absolute right-0 top-full z-50 min-w-[250px] rounded-xl border border-white/25 bg-[#111] p-2 shadow-2xl">
                    {item.children.map((child) => (
                      <button key={child} type="button" onClick={() => handleSubCategoryClick(child)} className="block w-full rounded-lg px-3 py-2 text-left text-sm font-bold normal-case tracking-normal text-white transition-colors hover:bg-white/10">
                        {child}
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
              className="h-28 w-auto max-w-none 2xl:h-32 object-contain drop-shadow-[0_0_20px_rgba(255,255,255,0.24)] group-hover:scale-105 transition-transform duration-200" 
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
                  onClick={() => !item.children && handleCategoryClick(item.id)}
                  className={`whitespace-nowrap rounded-md px-1.5 py-2 text-[11px] 2xl:px-2.5 2xl:text-sm font-black uppercase tracking-wide transition-colors ${openCategoryId === item.id ? "bg-white/15 text-white" : "text-white hover:bg-white/10"}`}
                >
                  {item.label}{item.children && <span className="ml-1 text-[9px]">{openCategoryId === item.id ? "▲" : "▼"}</span>}
                </button>
                {item.children && openCategoryId === item.id && (
                  <div className="absolute left-0 top-full z-50 min-w-[250px] rounded-xl border border-white/25 bg-[#111] p-2 shadow-2xl">
                    {item.children.map((child) => (
                      <button key={child} type="button" onClick={() => handleSubCategoryClick(child)} className="block w-full rounded-lg px-3 py-2 text-left text-sm font-bold normal-case tracking-normal text-white transition-colors hover:bg-white/10">
                        {child}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          <div className="absolute right-4 sm:right-6 lg:right-8 flex items-center gap-2">
            <button onClick={() => setShowSearchModal(!showSearchModal)} className="p-2.5 text-white hover:bg-white/10 rounded-md transition-colors" title="Rechercher">
              <Search className="w-6 h-6" />
            </button>
            <button onClick={() => navigateTo("cart")} className="relative p-2.5 text-white hover:bg-white/10 rounded-md transition-colors" title="Panier">
              <ShoppingBag className="w-6 h-6" />
              {totalItems > 0 && <span className="absolute -top-0.5 -right-0.5 bg-white text-black text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">{totalItems}</span>}
            </button>
          </div>
        </div>

        <nav className="hidden xl:flex items-center justify-center gap-1 2xl:gap-2 border-t border-white/25 pt-3 mt-1" aria-label="Accès rapides">
          {secondaryDesktopLinks.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => quickAccessStrip.some((quickLink) => quickLink.id === item.id) ? handleCategoryClick(item.id) : handleSectionClick(item.id)}
              className="whitespace-nowrap rounded-md px-2 py-2 text-[11px] 2xl:px-3 2xl:text-sm font-black uppercase tracking-wide text-white transition-colors hover:bg-white/10"
            >
              {item.label}
            </button>
          ))}
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
                  onClick={() => setOpenCategoryId(item.id)}
                  className={`whitespace-nowrap rounded-md px-3 py-2 transition-all border ${openCategoryId === item.id ? "border-white bg-white/10 text-white" : "border-transparent text-white/80 hover:border-white/25 hover:bg-white/10 hover:text-white"}`}
                >
                  {item.label} <span className="ml-1 text-[10px]">{openCategoryId === item.id ? "▲" : "▼"}</span>
                </button>
                {openCategoryId === item.id && (
                  <div className="absolute left-0 top-full z-50 min-w-[250px] rounded-xl border border-[#3a3a3a] bg-[#111] p-2 shadow-2xl">
                    {item.children.map((child) => (
                      <button key={child} type="button" onClick={() => handleSubCategoryClick(child)} className="block w-full rounded-lg px-3 py-2 text-left text-xs font-semibold normal-case tracking-normal text-[#d0d0d0] transition-colors hover:bg-[#252525] hover:text-[#ff6a2b]">
                        {child}
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
        <div className="bg-black border-t border-b border-[#2b2b2b] p-4 animate-fadeIn relative z-10">
          <form onSubmit={handleSearchSubmit} className="max-w-xl mx-auto flex gap-2">
            <input
              type="text"
              placeholder="Rechercher un produit"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-[#171717] border border-[#3a3a3a] rounded-lg px-4 py-2.5 text-xs text-white placeholder-white/50 focus:outline-none focus:border-[#ff6a2b]"
            />
            <button
              type="submit"
              className="bg-[#ff6a2b] text-white text-xs font-bold px-5 py-2.5 rounded-lg uppercase"
            >
              Rechercher
            </button>
          </form>
        </div>
      )}

      {mobileMenuOpen && (
        <div className="lg:hidden bg-black border-t border-[#2b2b2b] p-4 sm:p-6 space-y-5 text-xs font-bold tracking-widest text-white uppercase relative z-10">
          <div className="grid grid-cols-2 gap-3">
            {sectionTabs.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSectionClick(item.id)}
                className="bg-[#171717] border border-[#3a3a3a] p-3 rounded-lg text-left"
              >
                {item.label}
              </button>
            ))}
            <button
              onClick={() => navigateTo("cart")}
              className="bg-[#171717] border border-[#3a3a3a] p-3 rounded-lg text-left text-[#d90429]"
            >
              Panier
            </button>
            
            <button
              onClick={() => navigateTo("calculator")}
              className="bg-white/10 border border-white/40 p-3 rounded-lg text-left text-white"
            >
              Calculateur
            </button>
            <button
              onClick={() => navigateTo("nutritionist-ai")}
              className="bg-white/10 border border-white/40 p-3 rounded-lg text-left text-white"
            >
              Nutrition IA
            </button>
            <button
              onClick={() => navigateTo("coach-ia")}
              className="bg-[#171717] border border-[#3a3a3a] p-3 rounded-lg text-left"
            >
              Coach IA
            </button>
          </div>

          <div className="border-t border-[#3a3a3a] pt-4">
            <div className="grid grid-cols-2 gap-3">
              {navigationCategories.map((item) => (
                <div key={item.id}>
                  <button onClick={() => setOpenCategoryId((current) => current === item.id ? null : item.id)} className="w-full bg-[#171717] border border-[#3a3a3a] p-3 rounded-lg text-left normal-case tracking-normal font-semibold">
                    {item.label} <span className="float-right text-[#ff6a2b]">{openCategoryId === item.id ? "▲" : "▼"}</span>
                  </button>
                  {openCategoryId === item.id && (
                    <div className="mt-1 space-y-1 border-l border-[#ff6a2b] pl-3">
                      {item.children.map((child) => (
                        <button key={child} onClick={() => handleSubCategoryClick(child)} className="block w-full rounded px-2 py-1.5 text-left text-[11px] font-semibold normal-case tracking-normal text-[#bdbdbd] hover:bg-[#1f1f1f] hover:text-[#ff6a2b]">
                          {child}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              {quickAccessStrip.map((item) => (
                <button key={item.id} onClick={() => handleCategoryClick(item.id)} className="bg-[#171717] border border-[#3a3a3a] p-3 rounded-lg text-left normal-case tracking-normal font-semibold">
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
