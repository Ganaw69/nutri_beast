import React from "react";
import { useCart } from "../context/CartContext";
import { Shield, Dumbbell, Share2, Home, Mail, Phone } from "lucide-react";

const CONTACT_EMAIL = "contact@proteinstore.tn";
const CONTACT_PHONE = "+216 53 928 675";
const CONTACT_PHONE_LINK = "+21653928675";

export const Footer = () => {
  const { navigateTo } = useCart();

  const shareStore = async () => {
    const shareData = {
      title: "Protein Store Tunisia",
      text: "Découvrez Protein Store Tunisia.",
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareData.url);
        return;
      }
      window.prompt("Copiez ce lien pour le partager :", shareData.url);
    } catch (error) {
      if (error?.name !== "AbortError") window.prompt("Copiez ce lien pour le partager :", shareData.url);
    }
  };

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
              <button
                type="button"
                onClick={shareStore}
                className="w-8 h-8 bg-[#181818] border border-white/10 rounded flex items-center justify-center text-gray-300 hover:text-[#d90429] hover:border-[#d90429] transition-colors"
                title="Partager"
                aria-label="Partager Protein Store Tunisia"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => navigateTo("home")}
                className="w-8 h-8 bg-[#181818] border border-white/10 rounded flex items-center justify-center text-gray-300 hover:text-[#d90429] hover:border-[#d90429] transition-colors"
                title="Home"
                aria-label="Home"
              >
                <Home className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Column 2: NAVIGATION */}
          <div className="space-y-4">
            <h4 className="font-black text-xs text-white uppercase tracking-widest">
              NAVIGATION
            </h4>
            <ul className="space-y-2 text-xs text-gray-400 font-body">
              <li>
                <button type="button" onClick={() => navigateTo("shop")} className="hover:text-white transition-colors">
                  Shop
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigateTo("packs")} className="hover:text-white transition-colors">
                  Packs Exclusifs
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigateTo("order-tracking")} className="text-left hover:text-white transition-colors">
                  Suivre ma commande
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigateTo("blog")} className="hover:text-white transition-colors">
                  Blog
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigateTo("recipes")} className="hover:text-white transition-colors">
                  Recettes
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
                <button onClick={() => navigateTo("faq")} className="hover:text-white transition-colors">
                  FAQ
                </button>
              </li>
              <li>
                <button onClick={() => navigateTo("privacy-policy")} className="hover:text-white transition-colors">
                  Privacy Policy
                </button>
              </li>
              <li>
                <button onClick={() => navigateTo("terms-of-service")} className="hover:text-white transition-colors">
                  Terms of Service
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: CONTACT */}
          <div className="space-y-4">
            <h4 className="font-black text-xs text-white uppercase tracking-widest">
              CONTACT US
            </h4>
            <p className="text-xs text-gray-400 font-body leading-relaxed">
              Une question sur votre commande ou un produit ? Notre équipe vous répond.
            </p>
            <div className="space-y-2">
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="inline-flex items-center gap-2 break-all text-sm font-black text-[#ff526d] underline decoration-[#d90429]/50 underline-offset-4 transition-colors hover:text-white"
              >
                <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
                {CONTACT_EMAIL}
              </a>
              <a
                href={`tel:${CONTACT_PHONE_LINK}`}
                className="inline-flex items-center gap-2 text-sm font-black text-[#ff526d] underline decoration-[#d90429]/50 underline-offset-4 transition-colors hover:text-white"
                aria-label={`Appeler le ${CONTACT_PHONE}`}
              >
                <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
                {CONTACT_PHONE}
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between text-[11px] text-gray-500 gap-4 font-bold tracking-wider">
          <p>© 2026 PROTEIN STORE TUNISIA. CONÇU POUR DÉPASSER.</p>
          <p>CREATED BY HAIZ SOLUTIONS</p>
          <div className="uppercase text-gray-400">
            PAIEMENTS 100% SÉCURISÉS EN TUNISIE
          </div>
        </div>
      </div>
    </footer>
  );
};
