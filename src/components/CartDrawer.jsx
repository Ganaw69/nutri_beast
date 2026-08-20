import React, { useState } from "react";
import { useCart } from "../context/CartContext";
import { X, Trash2, Plus, Minus, ArrowRight, Tag, ShieldCheck, ShoppingCart } from "lucide-react";

export const CartDrawer = () => {
  const {
    cart,
    isCartOpen,
    setIsCartOpen,
    updateQuantity,
    removeFromCart,
    subtotal,
    discountAmount,
    shippingFee,
    totalPrice,
    applyPromoCode,
    promoCode,
    navigateTo
  } = useCart();
  const [inputCode, setInputCode] = useState("");

  if (!isCartOpen) return null;

  const handlePromoSubmit = (e) => {
    e.preventDefault();
    applyPromoCode(inputCode);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-background/80 backdrop-blur-sm transition-opacity animate-fadeIn">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-surface-dark border-l border-white/10 shadow-2xl flex flex-col justify-between">
          {/* Header */}
          <div className="p-6 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-primary/20 text-primary flex items-center justify-center">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-heading font-black text-lg text-white">VOTRE PANIER</h2>
                <p className="text-xs text-gray-400">{cart.length} article(s) sélectionné(s)</p>
              </div>
            </div>
            <button
              onClick={() => setIsCartOpen(false)}
              className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-surface-high transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {cart.length === 0 ? (
              <div className="text-center py-16 space-y-4">
                <div className="w-16 h-16 bg-surface-high rounded-full flex items-center justify-center mx-auto text-gray-500">
                  <ShoppingCart className="w-8 h-8" />
                </div>
                <h3 className="font-heading font-bold text-white text-base">Votre panier est vide</h3>
                <p className="text-xs text-gray-400 max-w-xs mx-auto">
                  Découvrez nos compléments alimentaires haut de gamme pour booster vos performances.
                </p>
                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    navigateTo("shop");
                  }}
                  className="bg-primary text-white text-xs font-heading font-bold px-6 py-3 rounded-lg shadow-lg hover:bg-primary-dark transition-all"
                >
                  EXPLORER LA BOUTIQUE
                </button>
              </div>
            ) : (
              cart.map((item, index) => (
                <div
                  key={`${item.id}-${item.selectedFlavor}-${item.selectedSize}-${index}`}
                  className="bg-surface border border-white/5 rounded-xl p-4 flex gap-4 items-center group relative"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-16 h-16 object-contain bg-surface-dark p-2 rounded-lg"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-heading font-bold text-sm text-white truncate">
                      {item.name}
                    </h4>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {item.selectedFlavor} • {item.selectedSize}
                    </p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="font-heading font-black text-sm text-white">
                        {item.price * item.quantity} <span className="text-xs text-primary font-bold">TND</span>
                      </span>

                      {/* Qty controls */}
                      <div className="flex items-center gap-2 bg-surface-high px-2 py-1 rounded-md border border-white/5">
                        <button
                          onClick={() => updateQuantity(index, -1)}
                          className="text-gray-400 hover:text-white"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-bold text-white w-4 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(index, 1)}
                          className="text-gray-400 hover:text-white"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => removeFromCart(index)}
                    className="text-gray-500 hover:text-red-400 p-1.5 transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer Summary & Checkout */}
          {cart.length > 0 && (
            <div className="p-6 bg-surface border-t border-white/10 space-y-4">
              {/* Promo Code Form */}
              <form onSubmit={handlePromoSubmit} className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Code Promo (ex: APEX10)"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                    className="w-full bg-surface-low border border-white/10 rounded-lg py-2 pl-9 pr-3 text-xs text-white uppercase tracking-wider placeholder-gray-500 focus:outline-none focus:border-primary"
                  />
                  <Tag className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
                <button
                  type="submit"
                  className="bg-surface-high border border-white/10 hover:border-primary text-white text-xs font-heading font-bold px-4 py-2 rounded-lg transition-colors"
                >
                  Appliquer
                </button>
              </form>

              {/* Price breakdown */}
              <div className="space-y-2 text-xs text-gray-300">
                <div className="flex justify-between">
                  <span>Sous-total</span>
                  <span className="font-bold text-white">{subtotal.toFixed(2)} TND</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Remise ({promoCode})</span>
                    <span className="font-bold">-{discountAmount.toFixed(2)} TND</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Frais de livraison</span>
                  <span>
                    {shippingFee === 0 ? (
                      <strong className="text-emerald-400">GRATUIT</strong>
                    ) : (
                      `${shippingFee} TND`
                    )}
                  </span>
                </div>
                <div className="flex justify-between pt-3 border-t border-white/10 font-heading font-black text-base text-white">
                  <span>TOTAL</span>
                  <span className="text-primary">{totalPrice.toFixed(2)} TND</span>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                onClick={() => {
                  setIsCartOpen(false);
                  navigateTo("checkout");
                }}
                className="sheen-btn w-full bg-primary hover:bg-primary-dark text-white font-heading font-black text-xs tracking-wider py-4 rounded-xl shadow-xl shadow-primary/20 flex items-center justify-center gap-2 transition-all"
              >
                COMMANDER (PAYER À LA LIVRAISON) <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-gray-400 pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Paiement sécurisé à la réception partout en Tunisie
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
