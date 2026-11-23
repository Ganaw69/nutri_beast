import React, { useEffect, useRef, useState } from "react";
import { useCart } from "../context/CartContext";
import { productService, couvertureService, brandService, resolveProductImage, mediaUrl, resolveBrandLogo, hydrateProductsWithImages } from "../services/api";
import { ProductCard } from "../components/ProductCard";
import { ArrowRight, Truck, FlaskConical, ShieldCheck, ChevronLeft, ChevronRight, Loader2, Package } from "lucide-react";
import { getProductIdentity } from "../utils/productSearch";
import logo from "../assets/logo.png";
import packHommeImage from "../assets/pack-homme.jpeg";
import packFemmeImage from "../assets/pack-femme.jpeg";
import packBuilderBanner from "../assets/objectif.png";
import packBuilderMobileBanner from "../assets/banner-pack-mobile.jpeg";

const normalizeProduct = (p) => ({
  id: p.id,
  name: p.name,
  category: p.category?.name || '',
  brand: p.brand?.name || '',
  price: parseFloat(p.price || 0),
  originalPrice: p.isOnSale && p.salePrice ? parseFloat(p.price) : null,
  image: resolveProductImage(p, null),
  isNew: p.isNew,
  isBestSeller: p.isBestSeller,
  isOnSale: p.isOnSale,
  salePrice: p.salePrice,
  badge: p.isBestSeller || p.isFeatured ? 'TOP SELLER' : p.isNew ? 'NOUVEAU' : null,
  inStock: p.stock > 0,
  flavors: p.flavors?.map(f => f.name) || [],
  sizes: [],
  sku: p.sku,
});

const collectionItems = (data) => data?.['hydra:member'] || data?.member || (Array.isArray(data) ? data : []);

const uniqueProducts = (products) => {
  const seen = new Set();
  return products.filter((product) => {
    const identity = getProductIdentity(product);
    if (!identity) return true;
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
};

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
  const [bestSellersError, setBestSellersError] = useState('');
  const [newProductsError, setNewProductsError] = useState('');
  const [brands, setBrands] = useState([]);
  const [heroCouvertures, setHeroCouvertures] = useState([]);
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [brandCopies, setBrandCopies] = useState(3);
  const brandTrackRef = useRef(null);
  const brandGroupRef = useRef(null);
  const isBrandTrackInteracting = useRef(false);
  const isBrandTrackHovered = useRef(false);

  useEffect(() => {
    let active = true;

    Promise.allSettled([
      productService.getBestSellers({ isActive: true }),
      productService.getNew({ isActive: true }),
      couvertureService.getAll().catch(() => ({ 'hydra:member': [] })),
      brandService.getAll({ itemsPerPage: 100 }, true).catch(() => ({ 'hydra:member': [] })),
    ]).then(([bestSellersResult, newProductsResult, couvertureResult, brandResult]) => {
      if (!active) return;
      const bestSellersData = bestSellersResult.status === 'fulfilled' ? bestSellersResult.value : null;
      const newProductsData = newProductsResult.status === 'fulfilled' ? newProductsResult.value : null;
      const availableProducts = uniqueProducts(collectionItems(bestSellersData).filter((product) =>
        product.isActive !== false && product.brand?.isActive !== false
      ));
      const availableNewProducts = uniqueProducts(collectionItems(newProductsData).filter((product) =>
        product.isActive !== false && product.brand?.isActive !== false
      ));
      setBestSellersError(bestSellersResult.status === 'rejected'
        ? bestSellersResult.reason?.message || 'Erreur inconnue.'
        : '');
      setNewProductsError(newProductsResult.status === 'rejected'
        ? newProductsResult.reason?.message || 'Erreur inconnue.'
        : '');
      setBestSellers(availableProducts.map(normalizeProduct));
      setNewProducts(availableNewProducts.map(normalizeProduct));
      const couvertureData = couvertureResult.status === 'fulfilled' ? couvertureResult.value : {};
      const brandData = brandResult.status === 'fulfilled' ? brandResult.value : {};
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
      const brand = brands.find((item) => String(brandId(item)) === String(destination.value));
      viewBrandDetails(brand || destination.value);
    } else if (destination.type === 'url') {
      window.location.assign(destination.value);
    } else if (destination.type === 'page') {
      navigateTo(destination.value.split('/')[0] || 'shop');
    }
  };

  const heroHasDestination = Boolean(heroDestination);
  const logoBrands = brands.filter((brand) => resolveBrandLogo(brand));

  useEffect(() => {
    const track = brandTrackRef.current;
    const group = brandGroupRef.current;
    if (!track || !group || !logoBrands.length) return undefined;

    const updateCopies = () => {
      const groupWidth = group.getBoundingClientRect().width;
      if (!groupWidth) return;
      const requiredCopies = Math.max(3, Math.ceil(track.clientWidth / groupWidth) + 2);
      setBrandCopies((current) => current === requiredCopies ? current : requiredCopies);
    };

    updateCopies();
    window.addEventListener('resize', updateCopies);
    return () => window.removeEventListener('resize', updateCopies);
  }, [logoBrands.length]);

  useEffect(() => {
    const track = brandTrackRef.current;
    const group = brandGroupRef.current;
    if (!track || !group || !logoBrands.length) return undefined;

    const copyWidth = group.getBoundingClientRect().width;
    track.scrollLeft = copyWidth;
    let previousFrameTime = 0;
    let animationFrame = 0;
    const moveTrack = (time) => {
      if (previousFrameTime && !isBrandTrackInteracting.current && !isBrandTrackHovered.current) {
        track.scrollLeft += Math.min(time - previousFrameTime, 32) * 0.25;
        if (track.scrollLeft >= copyWidth * 2) track.scrollLeft -= copyWidth;
        if (track.scrollLeft <= 0) track.scrollLeft += copyWidth;
      }
      previousFrameTime = time;
      animationFrame = window.requestAnimationFrame(moveTrack);
    };

    animationFrame = window.requestAnimationFrame(moveTrack);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [brandCopies, logoBrands.length]);

  const visibleNewProducts = newProducts.length <= 4
    ? newProducts
    : Array.from({ length: 4 }, (_, index) => newProducts[(newProductsOffset + index) % newProducts.length]);

  const visibleBestSellers = bestSellers.length <= 4
    ? bestSellers
    : Array.from({ length: 4 }, (_, index) => bestSellers[(bestSellerOffset + index) % bestSellers.length]);

  const changeProducts = (products, setOffset, direction) => {
    if (products.length <= 4) return;
    setOffset((current) => (current + (direction === 'left' ? 4 : -4) + products.length) % products.length);
  };

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
      <section className="mx-auto w-full px-4 sm:px-6 lg:px-8 2xl:px-10 space-y-6">
        <div className="flex items-end justify-between border-b border-white/10 pb-4">
          <div>
            <h2 className="whitespace-nowrap font-black text-[13px] leading-5 text-white uppercase tracking-tight sm:text-3xl">NOUVEAUTÉS À DÉCOUVRIR</h2>
            <p className="text-xs text-gray-400 font-body mt-1">Les derniers produits ajoutés à notre sélection.</p>
          </div>
          <button
            onClick={() => navigateTo("shop", { shopFilters: { filter: "new" } })}
            className="flex shrink-0 items-center gap-1 text-[10px] font-black uppercase text-white transition-colors hover:text-[#d90429] sm:text-xs"
          >
            VOIR TOUT <ChevronRight className="w-4 h-4 text-[#d90429]" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-[#d90429] animate-spin" />
          </div>
        ) : newProductsError ? (
          <div role="alert" className="text-center py-8 text-sm text-red-400">
            Impossible de charger les nouveautés : {newProductsError}
          </div>
        ) : newProducts.length > 0 ? (
          <div className={`grid items-center gap-2 ${newProducts.length > 4 ? 'grid-cols-1 sm:grid-cols-[2.5rem_minmax(0,1fr)_2.5rem]' : 'grid-cols-1'}`}>
            {newProducts.length > 4 && (
              <button type="button" onClick={() => changeProducts(newProducts, setNewProductsOffset, 'right')} className="hidden h-10 w-10 place-items-center justify-self-center rounded-full border border-white/30 bg-black/80 text-white shadow-lg transition-colors hover:border-[#d90429] hover:bg-[#d90429] focus:outline-none focus-visible:ring-2 focus-visible:ring-white sm:grid" aria-label="Nouveautés précédentes">
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            <div className="hidden grid-cols-1 gap-6 sm:grid sm:grid-cols-2 lg:grid-cols-4">
              {visibleNewProducts.map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
            <div className="home-product-touch-scroll -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain px-4 pb-2 sm:hidden" role="region" aria-label="Nouveautés, faites défiler horizontalement" tabIndex={0}>
              {newProducts.map((product) => <div key={product.id} className="w-full shrink-0 snap-start px-2"><ProductCard product={product} /></div>)}
            </div>
            {newProducts.length > 4 && (
              <button type="button" onClick={() => changeProducts(newProducts, setNewProductsOffset, 'left')} className="hidden h-10 w-10 place-items-center justify-self-center rounded-full border border-white/30 bg-black/80 text-white shadow-lg transition-colors hover:border-[#d90429] hover:bg-[#d90429] focus:outline-none focus-visible:ring-2 focus-visible:ring-white sm:grid" aria-label="Nouveautés suivantes">
                <ChevronRight className="h-5 w-5" />
              </button>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 text-sm">Aucune nouveauté pour l'instant.</div>
        )}
      </section>

      {/* ================= 3. NOS BEST SELLERS ================= */}
      <section className="mx-auto w-full px-4 sm:px-6 lg:px-8 2xl:px-10 space-y-6">
        <div className="flex items-end justify-between border-b border-white/10 pb-4">
          <div>
            <h2 className="whitespace-nowrap font-black text-[13px] leading-5 text-white uppercase tracking-tight sm:text-3xl">NOS MEILLEURS VENTES</h2>
            <p className="text-xs text-gray-400 font-body mt-1">Le carburant préféré de nos athlètes d'élite.</p>
          </div>
          <button
            onClick={() => navigateTo("shop")}
            className="flex shrink-0 items-center gap-1 text-[10px] font-black uppercase text-white transition-colors hover:text-[#d90429] sm:text-xs"
          >
            VOIR TOUT <ChevronRight className="w-4 h-4 text-[#d90429]" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-[#d90429] animate-spin" />
          </div>
        ) : bestSellersError ? (
          <div role="alert" className="text-center py-8 text-sm text-red-400">
            Impossible de charger les meilleures ventes : {bestSellersError}
          </div>
        ) : bestSellers.length > 0 ? (
          <div className={`grid items-center gap-2 ${bestSellers.length > 4 ? 'grid-cols-1 sm:grid-cols-[2.5rem_minmax(0,1fr)_2.5rem]' : 'grid-cols-1'}`}>
            {bestSellers.length > 4 && (
              <button type="button" onClick={() => changeProducts(bestSellers, setBestSellerOffset, 'right')} className="hidden h-10 w-10 place-items-center justify-self-center rounded-full border border-white/30 bg-black/80 text-white shadow-lg transition-colors hover:border-[#d90429] hover:bg-[#d90429] focus:outline-none focus-visible:ring-2 focus-visible:ring-white sm:grid" aria-label="Meilleures ventes précédentes">
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            <div className="hidden grid-cols-1 gap-6 sm:grid sm:grid-cols-2 lg:grid-cols-4">
              {visibleBestSellers.map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
            <div className="home-product-touch-scroll -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain px-4 pb-2 sm:hidden" role="region" aria-label="Meilleures ventes, faites défiler horizontalement" tabIndex={0}>
              {bestSellers.map((product) => <div key={product.id} className="w-full shrink-0 snap-start px-2"><ProductCard product={product} /></div>)}
            </div>
            {bestSellers.length > 4 && (
              <button type="button" onClick={() => changeProducts(bestSellers, setBestSellerOffset, 'left')} className="hidden h-10 w-10 place-items-center justify-self-center rounded-full border border-white/30 bg-black/80 text-white shadow-lg transition-colors hover:border-[#d90429] hover:bg-[#d90429] focus:outline-none focus-visible:ring-2 focus-visible:ring-white sm:grid" aria-label="Meilleures ventes suivantes">
                <ChevronRight className="h-5 w-5" />
              </button>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 text-sm">Aucun produit en vedette pour l'instant.</div>
        )}
      </section>

      {/* ================= 4. PACKS HOMME / FEMME ================= */}
      <section className="mx-auto w-full px-4 sm:px-6 lg:px-8 2xl:px-10">
        <div className="grid gap-6 md:grid-cols-2">
          {[
            {
              title: "Pack Homme",
              description: "Performance, prise de masse et récupération réunies dans une sélection prête à l'emploi.",
              image: packHommeImage,
              action: "Découvrir le pack homme",
              sexe: "homme",
            },
            {
              title: "Pack Femme",
              description: "Beauté, vitalité et performance dans une sélection adaptée à vos objectifs.",
              image: packFemmeImage,
              action: "Découvrir le pack femme",
              sexe: "femme",
            },
          ].map(({ title, description, image, action, sexe }) => (
            <article key={title} className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/15 bg-[#0e0e0e] shadow-xl shadow-black/35">
              <button
                type="button"
                onClick={() => navigateTo("packs", { packFilters: { sexe } })}
                aria-label={`${action} — ${title}`}
                className="absolute inset-0 z-10 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#ff526d]"
              />
              <div className="aspect-[1.65/1] overflow-hidden bg-[#191919]">
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
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ================= 5. TRUST BADGES ================= */}
      <section className="mx-auto w-full px-4 sm:px-6 lg:px-8 2xl:px-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-5 border-t border-white/10">
          {[
            { icon: Truck, title: 'LIVRAISON RAPIDE', desc: 'Expédition sous 24/48h partout en Tunisie.' },
            { icon: FlaskConical, title: 'TESTÉ EN LABO', desc: 'Pureté garantie et sans substance interdite.' },
            { icon: ShieldCheck, title: 'EXPERTISE 25 ANS', desc: 'Formulation de niveau supérieur recommandée.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex min-h-24 items-center gap-5 rounded-xl border border-white/10 bg-[#181818] p-6 sm:p-7">
              <Icon className="h-10 w-10 text-white shrink-0" />
              <div>
                <h4 className="font-black text-sm sm:text-base text-white uppercase">{title}</h4>
                <p className="mt-1 text-sm text-gray-300 font-body leading-relaxed">{desc}</p>
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
          <picture className="block w-full">
            <source media="(max-width: 639px)" srcSet={packBuilderMobileBanner} />
            <img
              src={packBuilderBanner}
              alt="Composez votre propre pack de compléments selon vos objectifs"
              className="block h-auto w-full object-contain"
            />
          </picture>
          <span className="pointer-events-none absolute bottom-5 left-1/2 hidden w-[92%] max-w-[30rem] -translate-x-1/2 items-center justify-center gap-3 rounded-full border-2 border-white/90 bg-gradient-to-r from-[#210008] via-[#c90028] to-[#f71940] px-5 py-3.5 text-base font-black italic tracking-wide text-white shadow-[0_0_20px_rgba(255,24,61,0.95),inset_0_0_14px_rgba(255,255,255,0.2)] transition group-hover:brightness-110 sm:flex sm:px-7 sm:py-4 sm:text-lg">
            <Package className="h-7 w-7 shrink-0 sm:h-8 sm:w-8" />
            <span className="h-8 w-px shrink-0 bg-white/85" />
            Compositeur de pack
            <ArrowRight className="h-7 w-7 shrink-0 sm:h-8 sm:w-8" />
          </span>
        </button>
      </section>

      {/* ================= 7. À PROPOS ================= */}
      <section className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 overflow-hidden rounded-2xl border border-[#ff173f] bg-[#080808] shadow-[0_0_32px_rgba(217,4,41,0.16)] lg:min-h-[420px] lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative isolate flex min-h-[280px] items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_55%_48%,rgba(255,0,34,0.8),rgba(126,0,13,0.42)_38%,transparent_70%),linear-gradient(135deg,#150305,#080808_76%)] p-7 sm:min-h-[360px] sm:p-9 lg:min-h-[420px]">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-70 [background:repeating-linear-gradient(132deg,transparent_0,transparent_36px,rgba(255,16,48,0.12)_37px,rgba(255,16,48,0.12)_39px,transparent_40px,transparent_67px)]" />
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(132deg,transparent_0%,transparent_12%,rgba(255,15,45,0.85)_12.2%,rgba(255,15,45,0.85)_12.5%,transparent_12.8%,transparent_17%,rgba(255,15,45,0.34)_17.2%,transparent_17.5%,transparent_84%,rgba(255,15,45,0.35)_84.2%,transparent_84.6%,transparent_89%,rgba(255,15,45,0.9)_89.2%,rgba(255,15,45,0.9)_89.5%,transparent_89.8%)]" />
            <div aria-hidden="true" className="about-red-light pointer-events-none absolute inset-y-0 left-0 z-[1] w-1/2" />
            <img src={logo} alt="Nutri Beast" className="relative z-10 w-full max-w-[500px] object-contain drop-shadow-[0_0_42px_rgba(255,0,32,0.55)]" />
          </div>
          <div className="flex flex-col justify-center px-7 py-9 sm:px-9 lg:px-11 xl:px-12">
            <div className="inline-flex items-center gap-2.5 text-[#ff173f] font-black text-[10px] sm:text-xs tracking-[0.25em] uppercase">
              <span className="h-5 w-1.5 bg-[#ff173f] inline-block" /> À PROPOS DE PROTEIN STORE TUNISIA
            </div>
            <h2 className="mt-5 max-w-[620px] font-black text-3xl sm:text-4xl xl:text-[42px] leading-[1.08] text-white uppercase tracking-tight">Votre performance, notre mission.</h2>
            <p className="mt-6 max-w-[620px] text-sm sm:text-base leading-[1.55] text-gray-300 font-body">
             <b>Protein Store Tunisia</b> sélectionne des compléments de qualité pour accompagner chaque athlète, du premier entraînement aux objectifs les plus ambitieux. Notre shop réunit des produits fiables, des conseils simples et les essentiels pour progresser avec confiance.
            </p>
            <button onClick={() => navigateTo("shop")} className="mt-8 inline-flex w-fit items-center gap-3 bg-[#ed0730] hover:bg-[#c90028] px-7 py-4 text-xs font-black uppercase tracking-wider text-white shadow-[0_0_20px_rgba(237,7,48,0.2)] transition-colors">
              Découvrir le shop <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {logoBrands.length > 0 && (
        <section className="brand-logo-marquee-section border-y border-[#d90429]/30 bg-[#0b0b0b] py-4 overflow-hidden sm:py-6" aria-label="Marques partenaires">
          <div
            ref={brandTrackRef}
            className="brand-logo-marquee-track"
            role="region"
            aria-label="Marques partenaires, faites défiler horizontalement"
            tabIndex={0}
            onMouseEnter={() => { isBrandTrackHovered.current = true; }}
            onMouseLeave={() => { isBrandTrackHovered.current = false; }}
            onPointerDown={() => { isBrandTrackInteracting.current = true; }}
            onPointerUp={() => { isBrandTrackInteracting.current = false; }}
            onPointerCancel={() => { isBrandTrackInteracting.current = false; }}
          >
            {Array.from({ length: brandCopies }, (_, group) => (
              <div key={group} ref={group === 0 ? brandGroupRef : null} className="brand-logo-marquee-group" aria-hidden={group !== 0}>
                {logoBrands.map((brand) => {
                  const logoPath = resolveBrandLogo(brand);
                  return (
                    <button key={`${group}-${brand.id ?? brand.slug ?? brand.name}`} type="button" onClick={() => viewBrandDetails(brand)} tabIndex={group === 0 ? undefined : -1} className="brand-logo-card" aria-label={`Découvrir ${brand.name}`}>
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
