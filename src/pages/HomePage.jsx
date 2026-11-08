import React, { useEffect, useState } from "react";
import { useCart } from "../context/CartContext";
import { productService, couvertureService, brandService, resolveProductImage, mediaUrl, resolveBrandLogo, hydrateProductsWithImages } from "../services/api";
import { ProductCard } from "../components/ProductCard";
import { ArrowRight, Truck, FlaskConical, ShieldCheck, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import logo from "../assets/logo.png";
import packHommeImage from "../assets/pack-homme.jpeg";
import packFemmeImage from "../assets/pack-femme.jpeg";
import packBuilderBanner from "../assets/objectif.jpeg";

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

const couvertureDesktopImage = (couverture) => (
  couverture?.image
  ?? couverture?.imageDesktop
  ?? couverture?.image_desktop
  ?? couverture?.desktopImage
  ?? couverture?.desktop_image
  ?? couverture?.imageUrl
  ?? couverture?.image_url
);

const couvertureMobileImage = (couverture) => (
  couverture?.image_mobile
  ?? couverture?.imageMobile
  ?? couverture?.mobileImage
  ?? couverture?.mobile_image
  ?? couverture?.imageMobileUrl
  ?? couverture?.image_mobile_url
);

const resolveCouvertureImage = (image) => {
  if (!image) return null;
  if (typeof image === 'object') {
    return resolveCouvertureImage(
      image.url ?? image.path ?? image.contentUrl ?? image.file ?? image.filename ?? image.name
    );
  }

  const value = String(image).trim();
  if (!value) return null;
  if (/^(https?:)?\/\//i.test(value) || value.startsWith('/')) return mediaUrl(value);
  return mediaUrl(`couvertures/${value.replace(/^\/?(?:uploads\/)?couvertures\//, '')}`);
};

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
  const { navigateTo, setSearchQuery, setSelectedShopCategoryIds, viewBrandDetails, viewProductDetails } = useCart();
  const [bestSellers, setBestSellers] = useState([]);
  const [bestSellerOffset, setBestSellerOffset] = useState(0);
  const [newProducts, setNewProducts] = useState([]);
  const [newProductsOffset, setNewProductsOffset] = useState(0);
  const [brands, setBrands] = useState([]);
  const [heroCouvertures, setHeroCouvertures] = useState([]);
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    Promise.all([
      productService.getBestSellers({ isActive: true }).catch(() => productService.getAllPages({ isActive: true }, true)),
      productService.getNew({ isActive: true }).catch(() => ({ 'hydra:member': [] })),
      couvertureService.getAll().catch(() => ({ 'hydra:member': [] })),
      brandService.getAll({ itemsPerPage: 100 }, true).catch(() => ({ 'hydra:member': [] })),
    ]).then(([bestSellersData, newProductsData, couvertureData, brandData]) => {
      if (!active) return;
      const availableProducts = collectionItems(bestSellersData).filter((product) =>
        product.isActive !== false && product.brand?.isActive !== false
      );
      const availableNewProducts = collectionItems(newProductsData).filter((product) =>
        product.isActive !== false && product.brand?.isActive !== false
      );
      // The collection already includes everything a product card needs.
      // Render it immediately; image enrichment is non-blocking below.
      setBestSellers(availableProducts.map(normalizeProduct));
      setNewProducts(availableNewProducts.map(normalizeProduct));
      const couvertures = (couvertureData['hydra:member'] || couvertureData.member || [])
        .filter((couverture) => (
          (couverture.active ?? couverture.isActive ?? couverture.is_active ?? couverture.enabled ?? true) !== false
          && resolveCouvertureImage(couvertureDesktopImage(couverture))
        ))
        .sort((first, second) => (first.index ?? 0) - (second.index ?? 0));
      setHeroCouvertures(couvertures);
      setBrands(collectionItems(brandData).filter((brand) => brand.active !== false && brand.isActive !== false));
      setLoading(false);

      void Promise.all([
        hydrateProductsWithImages(availableProducts),
        hydrateProductsWithImages(availableNewProducts),
      ]).then(([bestSellersWithImages, newProductsWithImages]) => {
        if (!active) return;
        setBestSellers(bestSellersWithImages.map(normalizeProduct));
        setNewProducts(newProductsWithImages.map(normalizeProduct));
      });
    });

    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (bestSellers.length <= 4) return undefined;
    const interval = window.setInterval(() => {
      setBestSellerOffset((current) => (current + 4) % bestSellers.length);
    }, 4500);
    return () => window.clearInterval(interval);
  }, [bestSellers.length]);

  useEffect(() => {
    if (newProducts.length <= 4) return undefined;
    const interval = window.setInterval(() => {
      setNewProductsOffset((current) => (current + 4) % newProducts.length);
    }, 4500);
    return () => window.clearInterval(interval);
  }, [newProducts.length]);

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
  const heroBgImage = resolveCouvertureImage(couvertureDesktopImage(heroCouverture));
  const heroMobileBgImage = resolveCouvertureImage(couvertureMobileImage(heroCouverture));
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

  const visibleNewProducts = newProducts.length <= 4
    ? newProducts
    : Array.from({ length: 4 }, (_, index) => newProducts[(newProductsOffset + index) % newProducts.length]);

  const visibleBestSellers = bestSellers.length <= 4
    ? bestSellers
    : Array.from({ length: 4 }, (_, index) => bestSellers[(bestSellerOffset + index) % bestSellers.length]);

  return (
    <div className="bg-[#131313] min-h-screen text-[#e5e2e1] font-heading pb-20 space-y-16">
      {/* ================= 1. HERO SECTION ================= */}
      {heroCouverture && heroBgImage && <section className="relative isolate w-full overflow-hidden border-b border-white/10 bg-[#0c0c0c]">
        <button type="button" onClick={openHeroCouverture} aria-disabled={!heroHasDestination} className="group block w-full text-left" aria-label={activeHeroBrandId ? `Découvrir les produits ${heroCouverture?.name || 'de cette marque'}` : heroCouverture?.name || 'Couverture'}>
          <picture className="block w-full">
            {heroMobileBgImage && <source media="(max-width: 767px)" srcSet={heroMobileBgImage} />}
            <img key={heroCouverture.id} src={heroBgImage} alt={heroCouverture.name || 'Couverture'} fetchpriority="high" decoding="async" className="block h-[clamp(13rem,60vw,24rem)] w-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.015] sm:h-[clamp(18rem,38vw,36rem)] lg:h-[clamp(22rem,34vw,40rem)]" />
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
      </section>}

      {/* ================= 2. NOUVEAUTÉS À DÉCOUVRIR ================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-end justify-between border-b border-white/10 pb-4">
          <div>
            <h2 className="font-black text-2xl sm:text-3xl text-white uppercase tracking-tight">NOUVEAUTÉS À DÉCOUVRIR</h2>
            <p className="text-xs text-gray-400 font-body mt-1">Les derniers produits ajoutés à notre sélection.</p>
          </div>
          <button
            onClick={() => navigateTo("shop", { shopFilters: { filter: "new" } })}
            className="text-xs font-black text-white hover:text-[#d90429] flex items-center gap-1 transition-colors uppercase"
          >
            VOIR TOUT <ChevronRight className="w-4 h-4 text-[#d90429]" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-[#d90429] animate-spin" />
          </div>
        ) : newProducts.length > 0 ? (
          <div key={newProductsOffset} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-[bestSellerVertical_0.55s_ease-out]">
            {visibleNewProducts.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 text-sm">Aucune nouveauté pour l'instant.</div>
        )}
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
          <div key={bestSellerOffset} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-[bestSellerVertical_0.55s_ease-out]">
            {visibleBestSellers.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 text-sm">Aucun produit en vedette pour l'instant.</div>
        )}
      </section>

      {/* ================= 4. PACKS HOMME / FEMME ================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-2">
          {[
            {
              title: "Pack Homme",
              description: "Performance, prise de masse et récupération réunies dans une sélection prête à l'emploi.",
              image: packHommeImage,
              action: "Découvrir le pack homme",
            },
            {
              title: "Pack Femme",
              description: "Beauté, vitalité et performance dans une sélection adaptée à vos objectifs.",
              image: packFemmeImage,
              action: "Découvrir le pack femme",
            },
          ].map(({ title, description, image, action }) => (
            <article key={title} className="group overflow-hidden rounded-2xl border border-white/15 bg-[#0e0e0e] shadow-xl shadow-black/35">
              <div className="aspect-[3/2] overflow-hidden bg-[#191919]">
                <img
                  src={image}
                  alt={title}
                  loading="lazy"
                  className="h-full w-full object-contain transition-transform duration-700 group-hover:scale-[1.025]"
                />
              </div>
              <div className="flex min-h-[220px] flex-col items-start justify-end border-t border-white/10 bg-gradient-to-br from-[#1d1d1d] to-[#0c0c0c] p-6 sm:p-8">
                <span className="mb-3 rounded-full border border-[#ff526d]/45 bg-[#d90429]/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#ff9aaa]">Sélection Protein Store</span>
                <h2 className="text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">{title}</h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-gray-300">{description}</p>
                <button
                  type="button"
                  onClick={() => navigateTo("packs")}
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#d90429] px-5 py-3 text-xs font-black uppercase tracking-wide text-white shadow-[0_0_18px_rgba(217,4,41,0.45)] transition hover:bg-[#b0021f] group-hover:translate-x-1"
                >
                  {action} <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}
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
      {/* ================= 6. COMPOSER VOTRE PACK ================= */}
      <section className="w-full px-4 sm:px-6 lg:px-8 pb-4">
        <button
          type="button"
          onClick={() => navigateTo("pack-builder")}
          className="group relative block w-full overflow-hidden rounded-2xl border border-[#d90429]/45 bg-[#100708] text-left shadow-[0_0_28px_rgba(217,4,41,0.2)] transition hover:-translate-y-0.5 hover:border-[#ff526d] hover:shadow-[0_0_35px_rgba(217,4,41,0.38)] focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          aria-label="Composer votre pack personnalisé"
        >
          <img
            src={packBuilderBanner}
            alt="Composez votre propre pack de compléments selon vos objectifs"
            className="h-44 w-full object-cover object-left transition-transform duration-500 group-hover:scale-[1.015] sm:h-auto"
          />
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-full bg-[#d90429] px-4 py-2.5 text-[10px] font-black uppercase tracking-wide text-white shadow-lg shadow-black/30 transition group-hover:bg-[#b0021f] sm:bottom-5 sm:right-5 sm:px-5 sm:py-3 sm:text-xs">
            Composer votre pack <ArrowRight className="h-4 w-4" />
          </span>
        </button>
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
