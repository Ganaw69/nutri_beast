import React, { useEffect, useState } from "react";
import { useCart } from "../context/CartContext";
import { productService, couvertureService, brandService, resolveProductImage, mediaUrl, hydrateProductsWithImages } from "../services/api";
import { ProductCard } from "../components/ProductCard";
import { ArrowRight, Truck, FlaskConical, ShieldCheck, ChevronRight, Loader2, Target, Dumbbell, Flame, HeartPulse } from "lucide-react";
import logo from "../assets/logo.png";

const normalizeProduct = (p) => ({
  id: p.id,
  name: p.name,
  category: p.category?.name || '',
  brand: p.brand?.name || '',
  price: parseFloat(p.price || 0),
  originalPrice: p.isOnSale && p.salePrice ? parseFloat(p.price) : null,
  image: resolveProductImage(p, null),
  badge: p.isFeatured ? 'TOP SELLER' : p.isNew ? 'NOUVEAU' : null,
  inStock: p.stock > 0,
  flavors: p.flavors?.map(f => f.name) || [],
  sizes: [],
  sku: p.sku,
});

export const HomePage = () => {
  const { navigateTo, viewProductDetails } = useCart();
  const [bestSellers, setBestSellers] = useState([]);
  const [brands, setBrands] = useState([]);
  const [heroCouvertures, setHeroCouvertures] = useState([]);
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      productService.getAll({ isFeatured: true, isActive: true, itemsPerPage: 3 }, true).catch(() => ({ 'hydra:member': [] })),
      couvertureService.getAll().catch(() => ({ 'hydra:member': [] })),
      brandService.getAll({ itemsPerPage: 100 }, true).catch(() => ({ 'hydra:member': [] })),
    ]).then(async ([prodData, couvertureData, brandData]) => {
      const prods = prodData['hydra:member'] || [];
      const detailed = await hydrateProductsWithImages(
        await Promise.all(prods.map((product) => productService.getOne(product.id, true).catch(() => product)))
      );
      setBestSellers(detailed.map(normalizeProduct));
      const couvertures = (couvertureData['hydra:member'] || couvertureData.member || [])
        .filter((couverture) => couverture.active !== false)
        .sort((first, second) => (first.index ?? 0) - (second.index ?? 0));
      setHeroCouvertures(couvertures);
      setBrands((brandData['hydra:member'] || []).filter((brand) => brand.active !== false && brand.isActive !== false && brand.logo));
      setLoading(false);
    });
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
  const heroBgImage = heroCouverture?.image
    ? mediaUrl(`couvertures/${heroCouverture.image}`)
    : 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&q=80&w=1920';
  const heroMobileBgImage = heroCouverture?.imageMobile ? mediaUrl(`couvertures/${heroCouverture.imageMobile}`) : heroBgImage;

  const handleHeroNavigation = () => {
    const type = heroCouverture?.navigationType;
    const target = String(heroCouverture?.navigation || '').trim();
    if (!target) return navigateTo('shop');

    if (type === 'product') {
      const productId = Number(target.split('/').filter(Boolean).pop());
      if (Number.isInteger(productId) && productId > 0) return viewProductDetails(productId);
    }
    if (type === 'category') {
      // The homepage has no category selector; category targets open the shop.
      return navigateTo('shop');
    }
    if (type === 'page') {
      const page = target.replace(/^\/+|\/+$/g, '');
      const supportedPages = ['home', 'shop', 'blog', 'recipes', 'calculator', 'nutritionist-ai', 'coach-ia', 'cart'];
      if (supportedPages.includes(page)) return navigateTo(page);
    }
    if (type === 'url') {
      window.location.assign(target);
      return;
    }
    navigateTo('shop');
  };

  return (
    <div className="bg-[#131313] min-h-screen text-[#e5e2e1] font-heading pb-20 space-y-16">
      {/* ================= 1. HERO SECTION ================= */}
      <section className="relative w-full aspect-[3/2] bg-[#0c0c0c] border-b border-white/10 overflow-hidden">
        <button type="button" onClick={handleHeroNavigation} className="absolute inset-0 w-full h-full cursor-pointer" aria-label={heroCouverture?.buttonText || heroCouverture?.name || 'Voir la couverture'}>
          <picture className="block w-full h-full">
            <source media="(max-width: 639px)" srcSet={heroMobileBgImage} />
            <img key={heroCouverture?.id || 'fallback'} src={heroBgImage} alt={heroCouverture?.name || 'Couverture'} className="w-full h-full object-cover object-center animate-[pulse_0.35s_ease-out]" />
          </picture>
        </button>
        <div className="absolute inset-0 bg-black/30 pointer-events-none" />
        {heroCouvertures.length > 1 && <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 gap-2" aria-label="Navigation des couvertures">
          {heroCouvertures.map((couverture, index) => <button key={couverture.id} type="button" onClick={() => setActiveHeroIndex(index)} className={`h-1.5 rounded-full transition-all ${index === activeHeroIndex ? 'w-7 bg-white' : 'w-1.5 bg-white/60 hover:bg-white'}`} aria-label={`Afficher la couverture ${index + 1}`} />)}
        </div>}
      </section>

      {/* ================= 2. PROTEIN WATER PROMO BANNER ================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#00a896] rounded-xl p-8 sm:p-12 text-white relative overflow-hidden shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="space-y-6 max-w-xl z-10">
            <div>
              <h2 className="font-black text-4xl sm:text-6xl text-white uppercase leading-none tracking-tight block">PROTEIN</h2>
              <span className="italic font-normal text-4xl sm:text-6xl text-white block mt-1">WATER</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
              <span className="bg-white/20 backdrop-blur-md px-3.5 py-2 rounded-md border border-white/30">ZÉRO SUCRE</span>
              <span className="bg-white/20 backdrop-blur-md px-3.5 py-2 rounded-md border border-white/30">10 G DE PROTÉINES</span>
              <span className="bg-white/20 backdrop-blur-md px-3.5 py-2 rounded-md border border-white/30">RAFRAÎCHISSANT</span>
            </div>
            <div>
              <button
                onClick={() => navigateTo("shop")}
                className="bg-[#d90429] hover:bg-[#b0021f] text-white font-black text-xs uppercase tracking-wider px-6 py-3.5 rounded-full shadow-lg inline-flex items-center gap-2 transition-transform hover:scale-105"
              >
                JE DÉCOUVRE <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="w-full lg:w-1/2 flex justify-center z-10">
            <div className="relative transform rotate-3 hover:rotate-0 transition-transform duration-500 bg-[#0c0c0c] border border-white/20 p-2 rounded-xl backdrop-blur-sm shadow-2xl w-full max-w-md">
              <img
                src="https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=80&w=800"
                alt="Protein Water Splash Cans"
                className="w-full h-64 object-cover rounded-lg"
              />
            </div>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {bestSellers.map((product) => <ProductCard key={product.id} product={product} />)}
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

      {brands.length > 0 && (
        <section className="brand-logo-marquee-section border-y border-[#d90429]/30 bg-[#0b0b0b] py-6 overflow-hidden" aria-label="Marques partenaires">
          <div className="brand-logo-marquee-track">
            {[0, 1].map((group) => (
              <div key={group} className="brand-logo-marquee-group" aria-hidden={group === 1}>
                {brands.map((brand) => {
                  const logoPath = brand.logo.startsWith('/uploads/') ? brand.logo : `brands/${brand.logo}`;
                  return (
                    <div key={`${group}-${brand.id ?? brand.slug}`} className="brand-logo-card">
                      <img src={mediaUrl(logoPath)} alt={group === 0 ? brand.slug : ''} className="brand-logo-image" />
                    </div>
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
