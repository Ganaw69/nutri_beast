import React from "react";
import { useCart } from "../context/CartContext";
import { Shield, Dumbbell, Share2, Globe } from "lucide-react";

export const Footer = () => {
  const { navigateTo } = useCart();

  return (
    <footer className="bg-[#0c0c0c] border-t border-white/10 pt-16 pb-8 text-[#e5e2e1] font-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-white/10">
          {/* Column 1: Brand Info & Crest */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative w-9 h-9 bg-[#d90429] rounded flex items-center justify-center shadow-md shadow-[#d90429]/30">
                <Shield className="w-6 h-6 text-white fill-white/20" />
                <Dumbbell className="w-3.5 h-3.5 text-white absolute transform -rotate-45" />
              </div>
              <div>
                <span className="font-black text-sm text-white tracking-wider uppercase block">
                  PROTEIN STORE
                </span>
                <span className="text-[9px] font-black text-[#d90429] tracking-[0.25em] block uppercase">
                  TUNISIA
                </span>
              </div>
            </div>

            <p className="text-xs text-gray-400 font-body leading-relaxed max-w-xs">
              La destination n°1 en Tunisie pour les athlètes exigeants. Performance, précision, et puissance dans chaque dose.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <a
                href="#"
                className="w-8 h-8 bg-[#181818] border border-white/10 rounded flex items-center justify-center text-gray-300 hover:text-[#d90429] hover:border-[#d90429] transition-colors"
                title="Partager"
              >
                <Share2 className="w-4 h-4" />
              </a>
              <a
                href="#"
                className="w-8 h-8 bg-[#181818] border border-white/10 rounded flex items-center justify-center text-gray-300 hover:text-[#d90429] hover:border-[#d90429] transition-colors"
                title="Site Web"
              >
                <Globe className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Column 2: NAVIGATION */}
          <div className="space-y-4">
            <h4 className="font-black text-xs text-white uppercase tracking-widest">
              NAVIGATION
            </h4>
            <ul className="space-y-2 text-xs text-gray-400 font-body">
              <li>
                <button onClick={() => navigateTo("shop")} className="hover:text-white transition-colors">
                  Protéine
                </button>
              </li>
              <li>
                <button onClick={() => navigateTo("shop")} className="hover:text-white transition-colors">
                  Performance
                </button>
              </li>
              <li>
                <button onClick={() => navigateTo("shop")} className="hover:text-white transition-colors">
                  Boissons
                </button>
              </li>
              <li>
                <button onClick={() => navigateTo("calculator")} className="hover:text-white transition-colors">
                  Objectifs
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: AIDE & INFOS */}
          <div className="space-y-4">
            <h4 className="font-black text-xs text-white uppercase tracking-widest">
              AIDE & INFOS
            </h4>
            <ul className="space-y-2 text-xs text-gray-400 font-body">
              <li>
                <button onClick={() => navigateTo("checkout")} className="hover:text-white transition-colors">
                  Shipping
                </button>
              </li>
              <li>
                <button onClick={() => navigateTo("checkout")} className="hover:text-white transition-colors">
                  Privacy Policy
                </button>
              </li>
              <li>
                <button onClick={() => navigateTo("checkout")} className="hover:text-white transition-colors">
                  Terms of Service
                </button>
              </li>
              <li>
                <button onClick={() => navigateTo("shop")} className="hover:text-white transition-colors">
                  Store Locator
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: NEWSLETTER */}
          <div className="space-y-4">
            <h4 className="font-black text-xs text-white uppercase tracking-widest">
              NEWSLETTER
            </h4>
            <p className="text-xs text-gray-400 font-body leading-relaxed">
              Rejoignez l'élite et recevez nos offres exclusives.
            </p>
            <form onSubmit={(e) => e.preventDefault()} className="space-y-2 pt-1">
              <input
                type="email"
                placeholder="Votre email"
                className="w-full bg-[#181818] border border-white/10 rounded-xs px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#d90429]"
              />
              <button
                type="submit"
                className="w-full bg-[#d90429] hover:bg-[#b0021f] text-white font-black text-xs uppercase tracking-wider py-3 rounded-xs transition-colors shadow-md"
              >
                S'ABONNER
              </button>
            </form>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between text-[11px] text-gray-500 gap-4 font-bold tracking-wider">
          <p>© 2026 PROTEIN STORE TUNISIA. CONÇU POUR DÉPASSER.</p>
          <div className="uppercase text-gray-400">
            PAIEMENTS 100% SÉCURISÉS EN TUNISIE
          </div>
        </div>
      </div>
    </footer>
  );
};
