import React, { useState } from "react";
import { useCart } from "../context/CartContext";
import { orderService, couponService } from "../services/api";
import { Package, Check, ChevronDown, Loader2, X, CheckCircle2 } from "lucide-react";

const TERMS_SECTIONS = [
  {
    title: "Article 1 - Conditions de commande et d'acceptation",
    paragraphs: [
      "La passation d'une commande sur notre site implique la prise de connaissance des présentes conditions générales de vente ainsi que l'acceptation intégrale de leur contenu par le Client. Protein Store Tunisia se réserve le droit d'ajuster ou de modifier ces conditions générales de vente à tout moment. Dans ce cas, seules les conditions en vigueur au moment de la commande seront applicables. Protein Store Tunisia recommande au Client de conserver et/ou d'imprimer ces conditions générales de vente pour une conservation sûre et à long terme, afin de pouvoir s'y référer à tout moment pendant l'exécution du contrat, si nécessaire.",
    ],
  },
  {
    title: "Article 2 - Tarification",
    paragraphs: [
      "2.1. Tous les prix des produits et services disponibles à l'achat sur le site Protein Store Tunisia sont affichés en dinars tunisiens, toutes taxes comprises, hors frais de livraison.",
      "2.2. Protein Store Tunisia se réserve le droit de modifier ses prix à tout moment. Cependant, les tarifs appliqués seront ceux en vigueur au moment de la validation de la commande, sous réserve de la disponibilité des produits à cette date.",
      "2.3. Les produits restent la propriété de Protein Store Tunisia jusqu'à ce que le prix soit intégralement encaissé.",
    ],
  },
  {
    title: "Article 3 - Disponibilité",
    paragraphs: [
      "3.1. Les offres de produits et de prix demeurent valables tant qu'elles sont visibles sur notre site, dans la limite des stocks disponibles.",
      "3.2. En cas d'indisponibilité d'un produit après la validation de la commande, le Client sera informé du délai nécessaire pour rendre le produit disponible. Si le Client ne souhaite pas attendre cette disponibilité ou si le produit est définitivement indisponible, un remboursement intégral sera effectué pour toutes les sommes versées (en cas de paiement en ligne).",
    ],
  },
  {
    title: "Article 4 - Commande et validation de commande",
    paragraphs: [
      "4.1. Les commandes sont effectuées sur le site internet Protein Store Tunisia.",
      "4.2. Les commandes peuvent également être effectuées par WhatsApp au +216 56 711 048 tous les jours.",
      "4.3. Les informations contractuelles relatives à la commande, dont notamment le numéro de commande, feront l'objet d'une confirmation par voie e-mail en temps utile.",
      "4.4. La société Protein Store Tunisia se réserve le droit de refuser toute commande d'un client avec lequel existerait ou aurait existé un litige.",
      "4.5. Le Client déclare avoir la pleine capacité juridique lui permettant de s'engager au titre des présentes conditions générales de vente.",
      "4.6. La validation de la commande s'effectue dans les 24 heures qui suivent sa passation. Le client sera contacté par notre service clientèle pour confirmer les détails de la commande et les coordonnées exactes.",
    ],
  },
  {
    title: "Article 5 - Paiement",
    paragraphs: [
      "Après avoir passé la commande et après validation de l'achat, le client devra payer le montant de sa facture en espèces à la livraison.",
    ],
  },
  {
    title: "Article 6 - Livraison",
    paragraphs: [
      "Les produits commandés sur le site Protein Store Tunisia font l'objet d'une livraison via l'un de nos transporteurs ou d'une livraison directement sur place dans nos locaux (retrait au magasin).",
      "Le client devra indiquer son adresse exacte et un numéro de téléphone joignable lors de la passation de sa commande.",
      "Les frais de livraison sont de 7 TND pour les commandes inférieures à 300 TND. La livraison est gratuite à partir de 300 TND d'achat.",
      "6.1. Retrait au magasin : le client devra se munir du numéro de commande qui lui a été transmis par e-mail. La commande ne pourra être prise que par le client mentionné sur celle-ci. Ce client devra vérifier la conformité des produits mis à sa disposition.",
      "6.2. Livraison à domicile : après que le client a effectué sa commande et choisi la livraison par transporteur, il sera contacté par notre service clientèle, qui validera avec lui les coordonnées, la date et l'heure de livraison. En cas d'accord, le client s'engage à payer le transporteur sur place et à signer sa commande. Dans le cas contraire, le client rendra la commande au transporteur et annulera sa livraison.",
      "6.3. En cas de livraison, d'expédition ou de mise à disposition retardée, vous serez informé(e) par e-mail et par téléphone de l'avancement de votre commande. Nous mettons tout en œuvre pour respecter les délais et vous garantir une expérience d'achat optimale.",
    ],
  },
  {
    title: "Article 7 - Produits non conformes ou détériorés",
    paragraphs: [
      "En cas de produits non conformes ou détériorés lors de la réception de la commande (erreur sur le produit, produit endommagé ou autre problème), Protein Store Tunisia prendra en charge toute réclamation après avoir vérifié l'état du produit lors de son retour. Le client sera suivi par le service clientèle, qui prendra en charge sa réclamation.",
    ],
  },
  {
    title: "Article 8 - Notre service clientèle",
    paragraphs: [
      "Pour tout renseignement, le client peut contacter le service clientèle par téléphone au +216 56 711 048 ou au +216 58 030 304, du lundi au samedi de 9 h 30 à 21 h et le dimanche de 11 h à 17 h 30. Le client peut également envoyer un e-mail à l'adresse de contact indiquée sur le site pour toute demande de renseignement ou réclamation.",
    ],
  },
];

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

  const [agreeTerms, setAgreeTerms] = useState(true);
  const [showTerms, setShowTerms] = useState(false);
  const [orderConfirmation, setOrderConfirmation] = useState(null);
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
        items: cart.flatMap((item) => {
          if (item.itemType === "custom-pack") {
            return [{
              packId: item.customPack.packId,
              quantity: item.quantity || 1,
              products: item.customPack.items.map(({ productId, quantity }) => ({ productId, quantity })),
            }];
          }
          if (item.itemType === "product-bundle") {
            return (item.productBundle?.items || []).map(({ sku, quantity }) => ({
              sku,
              quantity: Number(quantity) * Number(item.quantity || 1),
            }));
          }
          return [{ sku: item.sku, quantity: item.quantity || 1 }];
        }),
      };

      const result = await orderService.create(orderInput);
      setOrderConfirmation({
        order: result?.order || result,
        customer: { ...formData },
        cartItems: cart.map((item) => ({ ...item })),
      });
      clearCart();
    } catch (err) {
      showToast(`Erreur: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (orderConfirmation) {
    const order = orderConfirmation.order || {};
    const reference = order.reference || order.orderReference || order.id || "—";
    const orderedItems = Array.isArray(order.items) && order.items.length > 0 ? order.items : orderConfirmation.cartItems;
    const amount = (value) => value === undefined || value === null ? null : `${Number(value).toFixed(2)} TND`;

    return (
      <div className="min-h-screen bg-[#131313] px-4 py-12 text-[#e5e2e1] sm:py-16">
        <section className="mx-auto max-w-3xl rounded-xl border border-white/10 bg-[#181818] p-6 shadow-2xl sm:p-10">
          <div className="flex flex-col items-center text-center">
            <CheckCircle2 className="h-14 w-14 text-emerald-400" />
            <h1 className="mt-4 text-2xl font-black uppercase text-white sm:text-3xl">Commande reçue</h1>
            <p className="mt-2 max-w-xl text-sm text-gray-300">Merci pour votre commande. Notre équipe l’a bien reçue et la préparera dès que possible.</p>
            <div className="mt-5 rounded-lg border border-[#d90429]/40 bg-[#d90429]/10 px-5 py-3">
              <span className="block text-[10px] font-bold uppercase tracking-widest text-gray-400">Référence de commande</span>
              <strong className="mt-1 block font-mono text-xl text-white">{reference}</strong>
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-[#111] p-4"><h2 className="text-xs font-black uppercase text-white">Livraison</h2><p className="mt-2 text-sm text-gray-300">{orderConfirmation.customer.firstName} {orderConfirmation.customer.lastName}</p><p className="text-sm text-gray-400">{orderConfirmation.customer.address}, {orderConfirmation.customer.gouvernorat}</p><p className="text-sm text-gray-400">{orderConfirmation.customer.city} {orderConfirmation.customer.postalCode}</p><p className="text-sm text-gray-400">{orderConfirmation.customer.phone}</p></div>
            <div className="rounded-lg bg-[#111] p-4"><h2 className="text-xs font-black uppercase text-white">Paiement</h2><p className="mt-2 text-sm text-gray-300">Paiement à la livraison</p><p className="text-sm text-gray-400">Statut : {order.paymentStatus || order.payment_status || "En attente"}</p></div>
          </div>

          <div className="mt-6 rounded-lg bg-[#111] p-4">
            <h2 className="text-xs font-black uppercase text-white">Détails de la commande</h2>
            <div className="mt-3 divide-y divide-white/10">{orderedItems.map((item, index) => <div key={item.id || index} className="flex justify-between gap-4 py-3 text-sm"><span className="text-gray-300">{item.packName ? `${item.packName} · ` : ""}{item.productName || item.product?.name || item.name || "Article"} × {item.quantity || 1}</span><span className="shrink-0 font-bold text-white">{amount(item.subtotal ?? item.lineSubtotal ?? item.total) || (item.price !== undefined ? amount(Number(item.price) * Number(item.quantity || 1)) : "—")}</span></div>)}</div>
            <div className="mt-2 space-y-2 border-t border-white/10 pt-3 text-sm">{order.subtotal !== undefined && <div className="flex justify-between text-gray-400"><span>Sous-total</span><span>{amount(order.subtotal)}</span></div>}{(order.discountAmount ?? order.discount) !== undefined && <div className="flex justify-between text-gray-400"><span>Réduction</span><span>−{amount(order.discountAmount ?? order.discount)}</span></div>}{(order.shippingFee ?? order.shippingCost) !== undefined && <div className="flex justify-between text-gray-400"><span>Livraison</span><span>{amount(order.shippingFee ?? order.shippingCost)}</span></div>}{order.total !== undefined && <div className="flex justify-between border-t border-white/10 pt-2 font-black text-white"><span>Total</span><span>{amount(order.total)}</span></div>}</div>
            {(order.couponCode || order.coupon?.code) && <p className="mt-3 text-xs text-gray-500">Code promo : {order.couponCode || order.coupon.code}</p>}
          </div>

          <button type="button" onClick={() => navigateTo("home")} className="mt-6 w-full rounded bg-[#d90429] px-5 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-[#b0021f]">Continuer mes achats</button>
        </section>
      </div>
    );
  }

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
              <h3 className="font-black text-sm text-white uppercase tracking-wider">Methode de Paiement</h3>
              <div className="p-4 rounded-xs border border-[#d90429] bg-[#0e0e0e] flex items-start gap-3">
                <Package className="w-5 h-5 text-gray-300 shrink-0 mt-0.5" />
                <div><span className="font-bold text-xs text-white block">Paiement à la livraison</span><span className="text-[10px] text-gray-400 block mt-0.5">Payez en espèces à la réception.</span></div>
                <Check className="w-4 h-4 text-[#d90429] ml-auto shrink-0" />
              </div>
            </div>

            <div className="bg-[#181818] border border-white/10 p-5 sm:p-6 rounded-lg space-y-4">
              <h3 className="font-black text-sm text-white uppercase tracking-wider border-b border-white/10 pb-3">
                Resumé de la Commande
              </h3>

              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {cart.map((item, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 text-xs">
                    <span className="min-w-0 text-gray-300" title={item.itemType === "custom-pack" ? (item.customPack?.items || []).map((entry) => `${entry.name} × ${entry.quantity}`).join(", ") : item.itemType === "product-bundle" ? (item.productBundle?.items || []).map((entry) => `${entry.name} × ${entry.quantity}`).join(", ") : undefined}>
                      <span className="block truncate">{item.name} <span className="text-gray-500">×{item.quantity}</span></span>
                      {item.itemType === "custom-pack" && <span className="mt-1 block truncate text-[10px] text-gray-500">{(item.customPack?.items || []).map((entry) => `${entry.name} × ${entry.quantity}`).join(", ")}</span>}
                      {item.itemType === "product-bundle" && <span className="mt-1 block truncate text-[10px] text-gray-500">{(item.productBundle?.items || []).map((entry) => `${entry.name} × ${entry.quantity}`).join(", ")}</span>}
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
              <div className="flex items-start gap-2.5 text-xs text-gray-300">
                <input
                  type="checkbox"
                  aria-label="Accepter les conditions générales de vente"
                  checked={agreeTerms}
                  onChange={(e) => e.target.checked ? setShowTerms(true) : setAgreeTerms(false)}
                  className="accent-[#d90429] w-4 h-4 rounded-xs cursor-pointer mt-0.5 shrink-0"
                />
                <span>
                  J&apos;accepte les{" "}
                  <button type="button" onClick={() => setShowTerms(true)} className="underline text-gray-300 hover:text-white">conditions generales de vente</button>
                </span>
              </div>

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
                  "CONFIRMER LA COMMANDE"
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
      {showTerms && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowTerms(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="terms-title" className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-white/10 bg-[#181818] shadow-2xl">
            <header className="flex items-center justify-between border-b border-white/10 p-5">
              <h2 id="terms-title" className="text-lg font-black uppercase text-white">Conditions générales de vente</h2>
              <button type="button" onClick={() => setShowTerms(false)} aria-label="Fermer" className="rounded p-2 text-gray-400 hover:bg-white/10 hover:text-white"><X size={18} /></button>
            </header>
                        <div className="space-y-5 overflow-y-auto p-5 text-sm leading-6 text-gray-300">
              <h3 className="text-base font-bold text-white">Nos conditions de vente</h3>
              {TERMS_SECTIONS.map((section) => (
                <section key={section.title} className="space-y-2">
                  <h4 className="font-bold text-white">{section.title}</h4>
                  {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                </section>
              ))}
            </div>
            <footer className="flex justify-end border-t border-white/10 p-4">
              <button type="button" onClick={() => { setAgreeTerms(true); setShowTerms(false); }} className="rounded bg-[#d90429] px-6 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-[#b0021f]">J&apos;accepte</button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
};
