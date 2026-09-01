import React, { useState } from "react";
import { useCart } from "../context/CartContext";
import { X, Lock, ShoppingBag, ArrowRight } from "lucide-react";

export const CartPage = () => {
  const { cart, removeFromCart, updateQuantity, navigateTo } = useCart();
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState(false);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = appliedPromo ? subtotal * 0.2 : 0;
  const finalTotal = subtotal - discount;

  const handleApplyPromo = (e) => {
    e.preventDefault();
    if (promoCode.trim()) {
      setAppliedPromo(true);
    }
  };

  return (
    <div className="bg-[#131313] min-h-screen text-[#e5e2e1] font-heading py-8 sm:py-12 pb-20 sm:pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-10">
        <div className="flex items-center gap-3">
          <span className="w-1.5 h-8 bg-[#d90429] inline-block rounded-xs" />
          <h1 className="font-black text-3xl sm:text-5xl text-white uppercase tracking-tight">
            YOUR CART
          </h1>
        </div>

        {cart.length === 0 ? (
          <div className="bg-[#181818] border border-white/10 rounded-lg p-8 sm:p-12 text-center space-y-4">
            <ShoppingBag className="w-12 h-12 text-gray-500 mx-auto" />
            <h2 className="font-black text-xl text-white uppercase">VOTRE PANIER EST VIDE</h2>
            <p className="text-xs text-gray-400 font-body">
              Decouvrez notre gamme de nutrition sportive haut de gamme.
            </p>
            <button
              onClick={() => navigateTo("shop")}
              className="bg-[#d90429] text-white font-black text-xs uppercase px-8 py-4 rounded-xs inline-flex items-center gap-2 justify-center w-full sm:w-auto"
            >
              DECOUVRIR LE CATALOGUE <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
            <div className="lg:col-span-7 space-y-4">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#181818] border border-white/10 p-5 sm:p-6 rounded-lg relative font-heading flex flex-col sm:flex-row items-center sm:items-start justify-between gap-5 sm:gap-6"
                >
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="absolute top-3 right-3 sm:top-4 sm:right-4 text-gray-400 hover:text-white transition-colors"
                    title="Supprimer du panier"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <div className="bg-white p-3 rounded-md w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center shrink-0 relative shadow-md">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-contain mix-blend-multiply"
                    />
                  </div>

                  <div className="flex-1 space-y-3 text-center sm:text-left w-full">
                    <div>
                      <h3 className="font-black text-base sm:text-lg text-white uppercase tracking-tight">
                        {item.name}
                      </h3>
                      <p className="text-xs text-gray-400 font-body mt-0.5">
                        {item.flavor || "Standard"}
                      </p>
                    </div>

                    <div className="inline-flex items-center bg-[#0e0e0e] border border-white/10 rounded-xs px-3 py-1.5 font-bold text-xs text-white gap-4 mx-auto sm:mx-0">
                      <button
                        onClick={() => updateQuantity(item.id, (item.quantity || 1) - 1)}
                        className="text-gray-400 hover:text-white transition-colors px-1"
                      >
                        -
                      </button>
                      <span>{item.quantity || 1}</span>
                      <button
                        onClick={() => updateQuantity(item.id, (item.quantity || 1) + 1)}
                        className="text-gray-400 hover:text-white transition-colors px-1"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="text-center sm:text-right self-center sm:self-center w-full sm:w-auto">
                    <span className="font-black text-xl sm:text-2xl text-white tracking-tight">
                      {(item.price * (item.quantity || 1)).toFixed(2)} TND
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="lg:col-span-5 lg:sticky lg:top-24">
              <div className="bg-[#181818] border border-white/10 p-5 sm:p-6 lg:p-8 rounded-lg space-y-6 font-heading">
                <h2 className="font-black text-xl sm:text-2xl text-white uppercase tracking-wider border-b border-white/10 pb-4">
                  SUMMARY
                </h2>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center gap-4">
                    <span className="font-bold text-gray-400">Subtotal</span>
                    <span className="font-bold text-white text-sm">{subtotal.toFixed(2)} TND</span>
                  </div>
                  <div className="flex justify-between items-center gap-4">
                    <span className="font-bold text-gray-400">Shipping</span>
                    <span className="font-black text-[#d90429] uppercase">FREE</span>
                  </div>
                  {appliedPromo && (
                    <div className="flex justify-between items-center gap-4 text-green-400">
                      <span className="font-bold">Promo (-20%)</span>
                      <span className="font-bold">-{discount.toFixed(2)} TND</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-white/10 pt-4 flex justify-between items-baseline gap-4">
                  <span className="font-black text-sm text-gray-300 uppercase tracking-wider">Total</span>
                  <span className="font-black text-2xl sm:text-3xl text-[#d90429] tracking-tight">
                    {finalTotal.toFixed(2)} TND
                  </span>
                </div>

                <form
                  onSubmit={handleApplyPromo}
                  className="bg-[#0e0e0e] border border-white/10 rounded-xs p-3 flex flex-col sm:flex-row gap-2 sm:justify-between sm:items-center text-xs"
                >
                  <input
                    type="text"
                    placeholder="PROMO CODE"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    className="bg-transparent text-white placeholder-gray-500 font-bold text-xs uppercase focus:outline-none flex-1 pr-2 text-center sm:text-left"
                  />
                  <button
                    type="submit"
                    className="text-[#d90429] font-black uppercase hover:text-white transition-colors tracking-wider self-center sm:self-auto"
                  >
                    APPLY
                  </button>
                </form>

                <button
                  onClick={() => navigateTo("checkout")}
                  className="w-full bg-[#d90429] hover:bg-[#b0021f] text-white font-black text-xs uppercase tracking-widest py-4 rounded-xs text-center shadow-lg transition-all transform hover:scale-[1.01]"
                >
                  SECURE CHECKOUT
                </button>

                <div className="text-[10px] font-bold text-gray-400 flex items-center justify-center gap-1.5 uppercase tracking-wider text-center">
                  <Lock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span>Secure encrypted payment</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
