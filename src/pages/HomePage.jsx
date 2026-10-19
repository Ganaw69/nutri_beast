import React, { useEffect, useState } from "react";
import { useCart } from "../context/CartContext";
import { productService, couvertureService, brandService, resolveProductImage, mediaUrl, resolveBrandLogo, hydrateProductsWithImages } from "../services/api";
import { ProductCard } from "../components/ProductCard";
import { ArrowRight, Truck, FlaskConical, ShieldCheck, ChevronLeft, ChevronRight, Loader2, Target, Dumbbell, Flame, HeartPulse } from "lucide-react";
import logo from "../assets/logo.png";
import collagenBiotinImage from "../assets/pack-collagene-biotine-peau-cheveux-ongles.png";

const normalizeProduct = (p) => ({
  id: p.id,
  name: p.name,
  category: p.category?.name || '',
  brand: p.brand?.name || '',
  price: parseFloat(p.price || 0),
  originalPrice: p.isOnSale && p.salePrice ? parseFloat(p.price) : null,
  image: resolveProductImage(p, null),
  isNew: p.isNew,
  isOnSale: p.isOnSale,
  salePrice: p.salePrice,
  badge: p.isFeatured ? 'TOP SELLER' : p.isNew ? 'NOUVEAU' : null,
  inStock: p.stock > 0,
  flavors: p.flavors?.map(f => f.name) || [],
  sizes: [],
  sku: p.sku,
});

const collectionItems = (data) => data?.['hydra:member'] || data?.member || (Array.isArray(data) ? data : []);

const idFromReference = (value) => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'object') return idFromReference(value.id ?? value['@id'] ?? value.iri);
  const match = String(value).match(/\/(?:api\/)?brands\/([^/?#]+)\/?$/);
  return match ? match[1] : String(value);
};

const brandId = (brand) => idFromReference(brand?.id ?? brand?.['@id'] ?? brand?.iri);

const normalizedNavigationType = (value) => {
  const type = String(value || '').trim().toLowerCase();
  if (['categorie', 'catégorie', 'categories', 'category'].includes(type)) return 'category';
  if (['marque', 'brands'].includes(type)) return 'brand';
  if (['produit', 'products'].includes(type)) return 'product';
  return type;
};

const PAGE_TABS = new Set([
  'home', 'shop', 'packs', 'pack-builder', 'calculator', 'nutritionist-ai',
  'coach-ia', 'cart', 'checkout', 'blog', 'recipes',
]);

const navigationId = (value, resource, routeNames) => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'object') return navigationId(value.id ?? value['@id'] ?? value.iri, resource, routeNames);

  const rawValue = String(value).trim();
  if (/^\d+$/.test(rawValue)) return rawValue;

  const resourceMatch = rawValue.match(new RegExp(`/(?:api/)?${resource}/(\\d+)/?$`, 'i'));
  if (resourceMatch) return resourceMatch[1];

  const routeMatch = rawValue.replace(/^#/, '').match(new RegExp(`^/?(?:${routeNames.join('|')})/(\\d+)/?$`, 'i'));
  return routeMatch ? routeMatch[1] : null;
};

const parseCouvertureDestination = (couverture) => {
  const navigationType = normalizedNavigationType(couverture?.navigationType || couverture?.navigation_type);
  const navigation = couverture?.navigation;
  if (navigation === null || navigation === undefined || navigation === '') return null;

  if (navigationType === 'brand') {
    const value = navigationId(navigation, 'brands?', ['brand', 'brand-detail']);
    return value ? { type: 'brand', value } : null;
  }
  if (navigationType === 'category') {
    const value = navigationId(navigation, 'categor(?:y|ies)', ['categor(?:y|ies)']);
    return value ? { type: 'category', value } : null;
  }
  if (navigationType === 'product') {
    const value = navigationId(navigation, 'products?', ['product', 'product-detail']);
    return value ? { type: 'product', value } : null;
  }
  if (navigationType === 'url') {
    const value = typeof navigation === 'string' ? navigation.trim() : '';
    return /^https?:\/\//i.test(value) ? { type: 'url', value } : null;
  }
  if (navigationType === 'page') {
    const route = String(navigation).trim().replace(/^#?\/?/, '').split(/[/?#]/)[0];
    return PAGE_TABS.has(route) ? { type: 'page', value: route } : null;
  }
  return null;
};

export const HomePage = () => {
  const { navigateTo, setSearchQuery, setSelectedShopCategoryIds, viewBrandDetails, viewProductDetails, viewPackDetails } = useCart();
  const [bestSellers, setBestSellers] = useState([]);
  const [bestSellerOffset, setBestSellerOffset] = useState(0);
  const [brands, setBrands] = useState([]);
  const [heroCouvertures, setHeroCouvertures] = useState([]);
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    Promise.all([
      productService.getAllPages({ isFeatured: true, isActive: true }, true).catch(() => ({ 'hydra:member': [] })),
      couvertureService.getAll().catch(() => ({ 'hydra:member': [] })),
      brandService.getAll({ itemsPerPage: 100 }, true).catch(() => ({ 'hydra:member': [] })),
    ]).then(([prodData, couvertureData, brandData]) => {
      if (!active) return;
      const prods = (prodData['hydra:member'] || []).filter((product) =>
        product.isActive !== false && product.brand?.isActive !== false
      );
      // The collection already includes everything a product card needs.
      // Render it immediately; image enrichment is non-blocking below.
      setBestSellers(prods.map(normalizeProduct));
      const couvertures = (couvertureData['hydra:member'] || couvertureData.member || [])
        .filter((couverture) => couverture.active !== false)
        .sort((first, second) => (first.index ?? 0) - (second.index ?? 0));
      setHeroCouvertures(couvertures);
      setBrands(collectionItems(brandData).filter((brand) => brand.active !== false && brand.isActive !== false));
      setLoading(false);

      void hydrateProductsWithImages(prods).then((productsWithImages) => {
        if (active) setBestSellers(productsWithImages.map(normalizeProduct));
      });
    });

    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (bestSellers.length <= 3) return undefined;
    const interval = window.setInterval(() => {
      setBestSellerOffset((current) => (current + 3) % bestSellers.length);
    }, 4500);
    return () => window.clearInterval(interval);
  }, [bestSellers.length]);

  useEffect(() => {
    setActiveHeroIndex(0);
    if (heroCouvertures.length < 2) return undefined;

    const interval = window.setInterval(() => {
      setActiveHeroIndex((current) => (current + 1) % heroCouvertures.length);
    }, 5000);
    return () => window.clearInterval(interval);
  }, [heroCouvertures.length]);

  const heroCouverture = heroCouvertures[activeHeroIndex] || null;
  const heroDestination = parseCouvertureDestination(heroCouverture);
  const activeHeroBrandId = heroDestination?.type === 'brand' ? heroDestination.value : null;
  const heroBgImage = heroCouverture?.image
    ? mediaUrl(`couvertures/${heroCouverture.image}`)
    : 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&q=80&w=1920';
  const heroMobileBgImage = heroCouverture?.imageMobile ? mediaUrl(`couvertures/${heroCouverture.imageMobile}`) : heroBgImage;
  const openCollagenPack = () => {
    viewPackDetails(22);
  };

  const showNextHeroCouverture = () => {
    if (heroCouvertures.length < 2) return;
    setActiveHeroIndex((current) => (current + 1) % heroCouvertures.length);
  };

  const showPreviousHeroCouverture = () => {
    if (heroCouvertures.length < 2) return;
    setActiveHeroIndex((current) => (current - 1 + heroCouvertures.length) % heroCouvertures.length);
  };

  const openHeroCouverture = () => {
    const destination = heroDestination;
    if (!destination) return;
    if (destination.type === 'product') {
      viewProductDetails(destination.value);
    } else if (destination.type === 'category') {
      setSearchQuery('');
      setSelectedShopCategoryIds([destination.value]);
      navigateTo('shop');
    } else if (destination.type === 'brand') {
      viewBrandDetails(destination.value);
    } else if (destination.type === 'url') {
      window.location.assign(destination.value);
    } else if (destination.type === 'page') {
      navigateTo(destination.value.split('/')[0] || 'shop');
    }
  };

  const heroHasDestination = Boolean(heroDestination);
  const logoBrands = brands.filter((brand) => resolveBrandLogo(brand));

  const visibleBestSellers = bestSellers.length <= 3
    ? bestSellers
    : Array.from({ length: 3 }, (_, index) => bestSellers[(bestSellerOffset + index) % bestSellers.length]);

  return (
    <div className="bg-[#131313] min-h-screen text-[#e5e2e1] font-heading pb-20 space-y-16">
      {/* ================= 1. HERO SECTION ================= */}
      <section className="relative isolate w-full overflow-hidden border-b border-white/10 bg-[#0c0c0c]">
        <button type="button" onClick={openHeroCouverture} aria-disabled={!heroHasDestination} className="group block w-full text-left" aria-label={activeHeroBrandId ? `Découvrir les produits ${heroCouverture?.name || 'de cette marque'}` : heroCouverture?.name || 'Couverture'}>
          <picture className="block w-full">
            <source media="(max-width: 639px)" srcSet={heroMobileBgImage} />
            <img key={heroCouverture?.id || 'fallback'} src={heroBgImage} alt={heroCouverture?.name || 'Couverture'} fetchpriority="high" decoding="async" className="block h-[clamp(13rem,60vw,24rem)] w-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.015] sm:h-[clamp(18rem,38vw,36rem)] lg:h-[clamp(22rem,34vw,40rem)]" />
          </picture>
        </button>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/10" />
        {heroCouvertures.length > 1 && <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 flex -translate-y-1/2 items-center justify-between px-3 sm:px-5">
          <button type="button" onClick={showPreviousHeroCouverture} className="pointer-events-auto grid h-10 w-10 place-items-center rounded-full border border-white/30 bg-black/45 text-white backdrop-blur-sm transition-colors hover:border-white hover:bg-black/70 focus:outline-none focus:ring-2 focus:ring-white sm:h-12 sm:w-12" aria-label="Couverture précédente"><ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" /></button>
          <button type="button" onClick={showNextHeroCouverture} className="pointer-events-auto grid h-10 w-10 place-items-center rounded-full border border-white/30 bg-black/45 text-white backdrop-blur-sm transition-colors hover:border-white hover:bg-black/70 focus:outline-none focus:ring-2 focus:ring-white sm:h-12 sm:w-12" aria-label="Couverture suivante"><ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" /></button>
        </div>}
        {heroCouvertures.length > 1 && <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 gap-2" aria-label="Navigation des couvertures">
          {heroCouvertures.map((couverture, index) => <button key={couverture.id} type="button" onClick={() => setActiveHeroIndex(index)} className={`h-1.5 rounded-full transition-all ${index === activeHeroIndex ? 'w-7 bg-white' : 'w-1.5 bg-white/60 hover:bg-white'}`} aria-label={`Afficher la couverture ${index + 1}`} />)}
        </div>}
      </section>

      {/* ================= 2. ADMIN-MANAGED PROMO BANNER ================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="collagen-promo-panel grid overflow-hidden rounded-2xl border border-[#d90429]/55 shadow-[0_0_10px_rgba(217,4,41,0.5),0_0_30px_rgba(217,4,41,0.25)] transition-shadow duration-300 hover:shadow-[0_0_13px_rgba(255,82,109,0.75),0_0_35px_rgba(217,4,41,0.35)] md:min-h-[340px] md:grid-cols-2">
          <div className="flex flex-col items-start justify-center px-7 py-9 text-white sm:px-10 md:px-12 md:py-12">
            <p className="text-3xl font-black uppercase leading-[1.08] tracking-tight text-white sm:text-4xl lg:text-5xl">
              Pack Collagène<br />+ Biotine
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5 text-[11px] font-black uppercase sm:text-xs">
              {['Peau', 'Cheveux', 'Ongles'].map((benefit) => (
                <span key={benefit} className="rounded-md border border-[#ff596e]/50 bg-[#9f1018]/90 px-4 py-2.5 text-white shadow-[0_0_12px_rgba(217,4,41,0.25)]">{benefit}</span>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap items-baseline gap-3">
              <span className="text-lg font-bold text-gray-400 line-through decoration-[#ff2948] decoration-2">200,000 TND</span>
              <span className="text-3xl font-black text-[#ff2948] drop-shadow-[0_0_12px_rgba(217,4,41,0.45)]">120,000 <span className="text-base">TND</span></span>
            </div>
            <button
              type="button"
              onClick={openCollagenPack}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#d90429] px-6 py-3 text-xs font-black uppercase tracking-wide text-white shadow-[0_0_18px_rgba(217,4,41,0.4)] transition-transform hover:scale-105 hover:bg-[#b0021f]"
            >
              Je découvre <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center justify-center px-7 pb-8 md:px-10 md:py-8">
            <button type="button" onClick={openCollagenPack} aria-label="Voir le détail du pack Collagène et Biotine" className="inline-flex max-w-full rotate-1 cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-transparent shadow-[0_0_24px_rgba(217,4,41,0.28)] transition-transform duration-500 hover:rotate-0 focus:outline-none focus:ring-2 focus:ring-white">
              <img
                src={collagenBiotinImage}
                alt="Pack collagène et biotine pour la peau, les cheveux et les ongles"
                className="block h-auto max-h-[360px] w-auto max-w-full object-contain"
                loading="lazy"
              />
            </button>
          </div>
        </div>
      </section>

      {/* ================= 3. NOS BEST SELLERS ================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-end justify-between border-b border-white/10 pb-4">
          <div>
            <h2 className="font-black text-2xl sm:text-3xl text-white uppercase tracking-tight">NOS BEST SELLERS</h2>
            <p className="text-xs text-gray-400 font-body mt-1">Le carburant préféré de nos athlètes d'élite.</p>
          </div>
          <button
            onClick={() => navigateTo("shop")}
            className="text-xs font-black text-white hover:text-[#d90429] flex items-center gap-1 transition-colors uppercase"
          >
            VOIR TOUT <ChevronRight className="w-4 h-4 text-[#d90429]" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-[#d90429] animate-spin" />
          </div>
        ) : bestSellers.length > 0 ? (
          <div key={bestSellerOffset} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-[bestSellerVertical_0.55s_ease-out]">
            {visibleBestSellers.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 text-sm">Aucun produit en vedette pour l'instant.</div>
        )}
      </section>

      {/* ================= 4. COACH IA / QUIZ ================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-[#0e0e0e] border border-white/10 rounded-xl p-6 sm:p-10">
          <div className="lg:col-span-5 relative rounded-lg overflow-hidden border border-white/10 min-h-[420px] flex items-end p-6">
            <img
              src="https://images.unsplash.com/photo-1546483875-ad9014c88eba?auto=format&fit=crop&q=80&w=800"
              alt="Monochrome Athlete"
              className="absolute inset-0 w-full h-full object-cover grayscale contrast-125 opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
            <div className="relative z-10 bg-black/85 border border-white/10 backdrop-blur-md p-4 rounded-lg w-full space-y-1">
              <p className="text-xs italic text-white font-body">"Precision is the only path to power."</p>
              <div className="text-[10px] font-black text-[#d90429] tracking-widest uppercase">COACH AMIN, HEAD TRAINER</div>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-6">
            <div>
              <h2 className="font-black text-2xl sm:text-3xl text-white uppercase tracking-tight">ALGORITHME DE PERFORMANCE</h2>
              <p className="text-xs text-gray-300 font-body leading-relaxed mt-2">
                Ne devinez plus. Notre algorithme exclusif analyse vos objectifs, votre niveau d'activitÃ© et votre morphologie pour vous recommander le stack de supplÃ©ments optimale.
              </p>
            </div>
            <div className="space-y-3">
              {["DÉFINISSEZ VOTRE OBJECTIF PRINCIPAL", "ANALYSEZ VOS HABITUDES D'ENTRAÎNEMENT", "OBTENEZ VOTRE STACK PERSONNALISÉE"].map((step, i) => (
                <div key={i} className="flex items-center gap-4 bg-[#181818] p-4 rounded-lg border border-white/5">
                  <div className="w-8 h-8 bg-[#d90429] text-white font-black text-sm rounded flex items-center justify-center shrink-0">{i + 1}</div>
                  <span className="font-bold text-xs text-white uppercase">{step}</span>
                </div>
              ))}
            </div>
            <div className="pt-2">
              <button
                onClick={() => navigateTo("coach-ia")}
                className="bg-white hover:bg-gray-200 text-black font-black text-xs uppercase tracking-wider px-8 py-4 rounded-xs shadow-lg transition-colors"
              >
                DÉMARRER LE QUIZ (2 MIN)
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 5. TRUST BADGES ================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-white/10">
          {[
            { icon: Truck, title: 'LIVRAISON RAPIDE', desc: 'Expédition sous 24/48h partout en Tunisie.' },
            { icon: FlaskConical, title: 'TESTÉ EN LABO', desc: 'Pureté garantie et sans substance interdite.' },
            { icon: ShieldCheck, title: 'EXPERTISE 25 ANS', desc: 'Formulation de niveau supérieur recommandée.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-center gap-4 p-5 bg-[#181818] border border-white/5 rounded-lg">
              <Icon className="w-8 h-8 text-white shrink-0" />
              <div>
                <h4 className="font-black text-xs text-white uppercase">{title}</h4>
                <p className="text-[11px] text-gray-400 font-body mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      {/* ================= 6. OBJECTIFS CLIENT ================= */}
      <section className="w-full px-4 sm:px-6 lg:px-8 pb-4">
        <div className="w-full bg-[#0e0e0e] border border-white/10 rounded-xl p-8 sm:p-12 lg:p-16 shadow-2xl shadow-black/20">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 text-[#d90429] font-black text-[10px] tracking-[0.28em] uppercase">
                <span className="w-1.5 h-4 bg-[#d90429] inline-block" /> OBJECTIFS CLIENT
              </div>
              <h2 className="font-black text-4xl sm:text-5xl text-white uppercase tracking-tight mt-3">
                Client goals
              </h2>
              <p className="text-sm text-gray-400 font-body mt-3 max-w-3xl leading-relaxed">
                Simple, direct recommendations to help each client find the products that match their goal.
              </p>
            </div>

            <button
              onClick={() => navigateTo("calculator")}
              className="inline-flex items-center gap-2 bg-white hover:bg-gray-200 text-black font-black text-xs uppercase tracking-wider px-6 py-3 rounded-xs transition-colors w-fit"
            >
              DEFINE MY GOAL <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {[
              {
                icon: Flame,
                title: "CUTTING / FAT LOSS",
                desc: "For clients who want to keep energy high while improving body composition.",
                image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&q=80&w=900",
              },
              {
                icon: Dumbbell,
                title: "MUSCLE GAIN",
                desc: "For those who want more strength, more size, and steady progress.",
                image: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&q=80&w=900",
              },
              {
                icon: Target,
                title: "PERFORMANCE",
                desc: "To improve training intensity, focus, and explosiveness.",
                image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=900",
              },
              {
                icon: HeartPulse,
                title: "RECOVERY",
                desc: "To recover better between sessions and support cleaner muscle regeneration.",
                image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=900",
              },
            ].map(({ icon: Icon, title, desc, image }) => (
              <div key={title} className="group relative min-h-[340px] overflow-hidden bg-[#181818] border border-white/10 hover:border-[#d90429]/70 rounded-xl transition-colors">
                <img src={image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-55 grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/65 to-black/10" />
                <div className="relative z-10 h-full min-h-[340px] flex flex-col justify-end p-7">
                  <div className="w-12 h-12 rounded-lg bg-[#d90429] border border-[#ff4961] flex items-center justify-center mb-5 shadow-lg shadow-black/30">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-black text-base text-white uppercase tracking-wider">{title}</h3>
                  <p className="text-sm text-gray-200 font-body leading-relaxed mt-2">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= 7. À PROPOS ================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 overflow-hidden rounded-xl border border-white/10 bg-[#0e0e0e] shadow-2xl shadow-black/20">
          <div className="min-h-[320px] bg-gradient-to-br from-[#242424] via-[#111] to-[#050505] flex items-center justify-center p-10 sm:p-14">
            <img src={logo} alt="Nutri Beast" className="w-full max-w-sm object-contain drop-shadow-[0_0_35px_rgba(217,4,41,0.28)]" />
          </div>
          <div className="flex flex-col justify-center p-8 sm:p-12 lg:p-16">
            <div className="inline-flex items-center gap-2 text-[#d90429] font-black text-[10px] tracking-[0.28em] uppercase">
              <span className="w-1.5 h-4 bg-[#d90429] inline-block" /> À PROPOS DE PROTEIN STORE TUNISIA
            </div>
            <h2 className="mt-4 font-black text-3xl sm:text-4xl text-white uppercase tracking-tight">Votre performance, notre mission.</h2>
            <p className="mt-5 text-sm sm:text-base leading-relaxed text-gray-300 font-body">
             <b>Protein Store Tunisia</b> sélectionne des compléments de qualité pour accompagner chaque athlète, du premier entraînement aux objectifs les plus ambitieux. Notre shop réunit des produits fiables, des conseils simples et les essentiels pour progresser avec confiance.
            </p>
            <button onClick={() => navigateTo("shop")} className="mt-8 inline-flex w-fit items-center gap-2 bg-[#d90429] hover:bg-[#b0021f] px-6 py-3.5 text-xs font-black uppercase tracking-wider text-white transition-colors">
              Découvrir le shop <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {logoBrands.length > 0 && (
        <section className="brand-logo-marquee-section border-y border-[#d90429]/30 bg-[#0b0b0b] py-6 overflow-hidden" aria-label="Marques partenaires">
          <div className="brand-logo-marquee-track">
            {[0, 1].map((group) => (
              <div key={group} className="brand-logo-marquee-group" aria-hidden={group === 1}>
                {logoBrands.map((brand) => {
                  const logoPath = resolveBrandLogo(brand);
                  return (
                    <button key={`${group}-${brand.id ?? brand.slug}`} type="button" onClick={() => viewBrandDetails(brandId(brand))} tabIndex={group === 1 ? -1 : 0} className="brand-logo-card" aria-label={`Découvrir ${brand.name}`}>
                      <img src={logoPath} alt={group === 0 ? brand.name : ''} className="brand-logo-image" />
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
