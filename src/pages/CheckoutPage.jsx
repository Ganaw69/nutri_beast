import React, { useState } from "react";
import { useCart } from "../context/CartContext";
import { orderService, couponService } from "../services/api";
import { Package, CreditCard, Check, ChevronDown, Loader2 } from "lucide-react";

export const CheckoutPage = () => {
  const {
    cart,
    subtotal,
    discountAmount,
    shippingFee,
    totalPrice,
    clearCart,
    navigateTo,
    showToast,
    appliedCoupon,
    applyPromoCode,
  } = useCart();

  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    postalCode: "",
    gouvernorat: "",
    notes: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleApplyCoupon = async () => {
    if (!promoInput.trim()) return;
    setCheckingCoupon(true);
    try {
      const coupon = await couponService.findByCode(promoInput.trim().toUpperCase());
      if (!coupon || !coupon.isActive) {
        showToast("Code promo invalide ou expire.");
      } else {
        applyPromoCode(coupon);
      }
    } catch {
      showToast("Impossible de verifier le code promo.");
    } finally {
      setCheckingCoupon(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agreeTerms) {
      showToast("Veuillez accepter les conditions generales de vente.");
      return;
    }
    if (cart.length === 0) {
      showToast("Votre panier est vide.");
      return;
    }

    setSubmitting(true);
    try {
      const orderInput = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        email: formData.email,
        address: `${formData.address}, ${formData.gouvernorat}`,
        city: formData.city,
        postalCode: formData.postalCode,
        notes: formData.notes,
        coupon: appliedCoupon?.code || undefined,
        items: cart.map((item) => ({ sku: item.sku, quantity: item.quantity || 1 })),
      };

      const result = await orderService.create(orderInput);
      showToast(`Commande #${result.reference || result.id} confirmee ! Merci.`);
      clearCart();
      navigateTo("home");
    } catch (err) {
      showToast(`Erreur: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[#131313] min-h-screen text-[#e5e2e1] font-heading py-8 sm:py-12 pb-20 sm:pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-10">
        <h1 className="font-black text-3xl sm:text-5xl text-white uppercase tracking-tight">
          PAIEMENT
        </h1>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
          <div className="lg:col-span-7 bg-[#181818] border border-white/10 p-5 sm:p-6 lg:p-8 rounded-lg space-y-6">
            <h2 className="font-black text-xl sm:text-2xl text-white uppercase tracking-wider">
              ADRESSE DE LIVRAISON
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  name="firstName"
                  placeholder="Prenom *"
                  required
                  value={formData.firstName}
                  onChange={handleChange}
                  className="w-full bg-[#0e0e0e] border border-white/10 rounded-xs p-3.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#d90429]"
                />
                <input
                  name="lastName"
                  placeholder="Nom *"
                  required
                  value={formData.lastName}
                  onChange={handleChange}
                  className="w-full bg-[#0e0e0e] border border-white/10 rounded-xs p-3.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#d90429]"
                />
              </div>

              <input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                className="w-full bg-[#0e0e0e] border border-white/10 rounded-xs p-3.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#d90429]"
              />

              <input
                name="address"
                placeholder="Adresse *"
                required
                value={formData.address}
                onChange={handleChange}
                className="w-full bg-[#0e0e0e] border border-white/10 rounded-xs p-3.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#d90429]"
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="relative">
                  <select
                    name="gouvernorat"
                    value={formData.gouvernorat}
                    onChange={handleChange}
                    className="w-full bg-[#0e0e0e] border border-white/10 rounded-xs p-3.5 text-xs text-gray-300 focus:outline-none focus:border-[#d90429] appearance-none cursor-pointer"
                  >
                    <option value="">Gouvernorat...</option>
                    {[
                      "Tunis",
                      "Ariana",
                      "Ben Arous",
                      "Manouba",
                      "Nabeul",
                      "Zaghouan",
                      "Bizerte",
                      "Beja",
                      "Jendouba",
                      "Le Kef",
                      "Siliana",
                      "Sousse",
                      "Monastir",
                      "Mahdia",
                      "Sfax",
                      "Kairouan",
                      "Kasserine",
                      "Sidi Bouzid",
                      "Gabes",
                      "Medenine",
                      "Tataouine",
                      "Gafsa",
                      "Tozeur",
                      "Kebili",
                    ].map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <input
                  name="city"
                  placeholder="Ville *"
                  required
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full bg-[#0e0e0e] border border-white/10 rounded-xs p-3.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#d90429]"
                />
                <input
                  name="postalCode"
                  placeholder="Code Postal"
                  value={formData.postalCode}
                  onChange={handleChange}
                  className="w-full bg-[#0e0e0e] border border-white/10 rounded-xs p-3.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#d90429]"
                />
              </div>

              <input
                name="phone"
                placeholder="Telephone *"
                required
                value={formData.phone}
                onChange={handleChange}
                className="w-full bg-[#0e0e0e] border border-white/10 rounded-xs p-3.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#d90429]"
              />

              <textarea
                name="notes"
                placeholder="Notes de commande (optionnel)"
                rows={3}
                value={formData.notes}
                onChange={handleChange}
                className="w-full bg-[#0e0e0e] border border-white/10 rounded-xs p-3.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#d90429] resize-none"
              />
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
            <div className="bg-[#181818] border border-white/10 p-5 sm:p-6 rounded-lg space-y-4">
              <h3 className="font-black text-sm text-white uppercase tracking-wider">
                Methode de Paiement
              </h3>

              {[
                {
                  id: "cod",
                  label: "Paiement a la Livraison",
                  desc: "Payez en especes a la reception.",
                  Icon: Package,
                },
                {
                  id: "card",
                  label: "Carte Bancaire",
                  desc: "Redirection vers ClicToPay securise.",
                  Icon: CreditCard,
                },
              ].map(({ id, label, desc, Icon }) => (
                <div
                  key={id}
                  onClick={() => setPaymentMethod(id)}
                  className={`p-4 rounded-xs border flex items-start sm:items-center justify-between gap-4 cursor-pointer transition-all ${
                    paymentMethod === id
                      ? "bg-[#0e0e0e] border-[#d90429]"
                      : "bg-[#0e0e0e] border-white/10 hover:border-white/30"
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        paymentMethod === id ? "border-[#d90429]" : "border-gray-500"
                      }`}
                    >
                      {paymentMethod === id && <div className="w-2 h-2 rounded-full bg-[#d90429]" />}
                    </div>
                    <Icon className="w-5 h-5 text-gray-300 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <span className="font-bold text-xs text-white block">{label}</span>
                      <span className="text-[10px] text-gray-400 font-body block mt-0.5">
                        {desc}
                      </span>
                    </div>
                  </div>
                  {paymentMethod === id && <Check className="w-4 h-4 text-[#d90429] shrink-0" />}
                </div>
              ))}
            </div>

            <div className="bg-[#181818] border border-white/10 p-5 sm:p-6 rounded-lg space-y-4">
              <h3 className="font-black text-sm text-white uppercase tracking-wider border-b border-white/10 pb-3">
                Resumé de la Commande
              </h3>

              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {cart.map((item, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-gray-300 truncate">
                      {item.name} <span className="text-gray-500">x{item.quantity}</span>
                    </span>
                    <span className="font-bold text-white shrink-0">
                      {(item.price * item.quantity).toFixed(2)} TND
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <input
                  type="text"
                  placeholder="CODE PROMO"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value)}
                  className="flex-1 bg-[#0e0e0e] border border-white/10 rounded-xs px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#d90429] uppercase"
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={checkingCoupon}
                  className="bg-[#2a2a2a] hover:bg-white hover:text-black text-white text-xs font-bold px-4 py-2 rounded-xs transition-colors disabled:opacity-50 w-full sm:w-auto"
                >
                  {checkingCoupon ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : "Appliquer"}
                </button>
              </div>

              {appliedCoupon && (
                <p className="text-xs text-emerald-400">
                  Code "{appliedCoupon.code}" applique
                </p>
              )}

              <div className="space-y-2 text-xs pt-3 border-t border-white/10">
                <div className="flex justify-between font-body text-gray-400 gap-4">
                  <span>Sous-total:</span>
                  <span className="text-white font-bold">{subtotal.toFixed(2)} TND</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between font-body text-emerald-400 gap-4">
                    <span>Reduction:</span>
                    <span>-{discountAmount.toFixed(2)} TND</span>
                  </div>
                )}
                <div className="flex justify-between font-body text-gray-400 gap-4">
                  <span>Livraison:</span>
                  <span className="text-white font-bold">
                    {shippingFee === 0 ? "Gratuit" : `${shippingFee.toFixed(2)} TND`}
                  </span>
                </div>
                <div className="flex justify-between font-black text-sm text-white pt-2 border-t border-white/10 gap-4">
                  <span>Total:</span>
                  <span className="text-white font-black text-base">{totalPrice.toFixed(2)} TND</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="flex items-start gap-2.5 text-xs text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="accent-[#d90429] w-4 h-4 rounded-xs cursor-pointer mt-0.5 shrink-0"
                />
                <span>
                  J&apos;accepte les{" "}
                  <a href="#" className="underline text-gray-300 hover:text-white">
                    conditions generales de vente
                  </a>
                </span>
              </label>

              <button
                type="submit"
                disabled={submitting || cart.length === 0}
                className="w-full bg-[#d90429] hover:bg-[#b0021f] disabled:bg-[#353535] disabled:cursor-not-allowed text-white font-black text-xs uppercase tracking-widest py-4 rounded-xs text-center shadow-lg transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Traitement...
                  </>
                ) : (
                  "CONFIRMER ET PAYER"
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
