import React, { useEffect, useState } from "react";
import { useCart } from "../context/CartContext";
import { productService, bannerService, resolveProductImage } from "../services/api";
import { ProductCard } from "../components/ProductCard";
import { ArrowRight, Truck, FlaskConical, ShieldCheck, ChevronRight, Loader2 } from "lucide-react";

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
  const [heroBanner, setHeroBanner] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      productService.getAll({ isFeatured: true, isActive: true, itemsPerPage: 3 }, true).catch(() => ({ 'hydra:member': [] })),
      bannerService.getActive().catch(() => ({ 'hydra:member': [] })),
    ]).then(([prodData, bannerData]) => {
      const prods = prodData['hydra:member'] || [];
      setBestSellers(prods.map(normalizeProduct));
      const banners = bannerData['hydra:member'] || [];
      if (banners.length > 0) setHeroBanner(banners[0]);
      setLoading(false);
    });
  }, []);

  const heroTitle = heroBanner?.title || 'INGÉNIERIE PAR OBJECTIF';
  const heroSubtitle = heroBanner?.subtitle || '';
  const heroDesc = heroBanner?.description || 'Dominez vos entraînements avec une nutrition de précision testée en laboratoire pour une puissance et une récupération sans compromis.';
  const heroBtnLabel = heroBanner?.buttonLabel || 'DÉCOUVRIR LA GAMME';
  const heroBgImage = heroBanner?.imageDesktop
    ? `https://127.0.0.1:8000/uploads/banners/desktop/${heroBanner.imageDesktop}`
    : 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&q=80&w=1920';

  return (
    <div className="bg-[#131313] min-h-screen text-[#e5e2e1] font-heading pb-20 space-y-16">
      {/* ================= 1. HERO SECTION ================= */}
      <section className="relative w-full min-h-[580px] bg-[#0c0c0c] border-b border-white/10 overflow-hidden flex items-center">
        <div className="absolute inset-0 z-0">
          <img
            src={heroBgImage}
            alt="Gym Athlete background"
            className="w-full h-full object-cover object-center opacity-35 mix-blend-luminosity filter contrast-125"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0c0c0c] via-[#0c0c0c]/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0c] via-transparent to-[#0c0c0c]/60" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-6">
              <div className="inline-flex items-center gap-2 text-[#d90429] font-black text-xs tracking-[0.25em] uppercase">
                <span className="w-1.5 h-4 bg-[#d90429] inline-block" /> ENGINEERED FOR EXCELLENCE
              </div>

              <h1 className="font-black text-5xl sm:text-7xl text-white uppercase leading-none tracking-tight">
                {heroSubtitle ? (
                  <>{heroTitle}<br /><span className="text-[#d90429]">{heroSubtitle}</span></>
                ) : (
                  <>INGÉNIERIE <br /><span className="text-[#d90429]">PAR OBJECTIF</span></>
                )}
              </h1>

              <p className="text-gray-300 text-xs sm:text-sm max-w-xl leading-relaxed font-body">
                {heroDesc}
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  onClick={() => navigateTo("shop")}
                  className="bg-[#d90429] hover:bg-[#b0021f] text-white font-black text-xs uppercase tracking-wider px-8 py-4 rounded-xs shadow-xl transition-all"
                >
                  {heroBtnLabel}
                </button>
                <button
                  onClick={() => navigateTo("shop")}
                  className="bg-transparent border border-white/40 hover:bg-white hover:text-black text-white font-bold text-xs uppercase tracking-wider px-8 py-4 rounded-xs transition-all"
                >
                  BEST SELLERS
                </button>
              </div>
            </div>

            {/* Featured product badge */}
            {bestSellers[0] && (
              <div className="lg:col-span-4 flex justify-end">
                <div
                  onClick={() => viewProductDetails(bestSellers[0].id)}
                  className="bg-[#181818]/90 border border-white/10 backdrop-blur-md p-4 rounded-md w-full max-w-xs cursor-pointer hover:border-[#d90429] transition-all shadow-2xl space-y-1.5"
                >
                  <div className="flex justify-between items-center">
                    <span className="bg-[#d90429] text-white text-[9px] font-black px-2 py-0.5 rounded-xs uppercase">
                      {bestSellers[0].inStock ? 'EN STOCK' : 'RUPTURE'}
                    </span>
                    <span className="text-xs font-black text-[#d90429]">{bestSellers[0].price.toFixed(2)} TND</span>
                  </div>
                  <h3 className="font-black text-xs text-white uppercase tracking-wider">
                    {bestSellers[0].name}
                  </h3>
                </div>
              </div>
            )}
          </div>
        </div>
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
                Ne devinez plus. Notre algorithme exclusif analyse vos objectifs, votre niveau d'activité et votre morphologie pour vous recommander le stack de suppléments optimale.
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
    </div>
  );
};
