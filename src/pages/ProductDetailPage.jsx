import React, { useState, useEffect } from "react";
import { useCart } from "../context/CartContext";
import { productService, reviewService, flavorService, resolveProductImage, productImageUrl, isPrimaryProductImage, resolveProductFlavors } from "../services/api";
import { ProductCard } from "../components/ProductCard";
import {
  Star, ShoppingCart, ShieldCheck, Truck, CheckCircle2,
  ChevronLeft, Zap, Loader2, Send
} from "lucide-react";

const normalizeProduct = (p, flavorCatalog = []) => ({
  id: p.id,
  name: p.name,
  category: p.category?.name || '',
  brand: p.brand?.name || '',
  price: parseFloat(p.price || 0),
  originalPrice: p.isOnSale && p.salePrice ? parseFloat(p.price) : null,
  image: resolveProductImage(p, null),
  badge: p.isFeatured ? 'TOP SELLER' : p.isNew ? 'NOUVEAU' : null,
  inStock: (p.stock || 0) > 0,
  flavors: resolveProductFlavors(p, flavorCatalog),
  sizes: [],
  sku: p.sku,
  description: p.shortDescription || p.description || '',
  nutritionFact: p.nutritionFact || null,
  productImages: p.productImages || [],
  '@id': p['@id'],
});

export const ProductDetailPage = () => {
  const { selectedProductId, addToCart, navigateTo, showToast } = useCart();

  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState('');

  const [selectedFlavor, setSelectedFlavor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);

  // Review form
  const [reviewForm, setReviewForm] = useState({ customerName: '', email: '', rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (!selectedProductId) return;
    setLoading(true);

    Promise.all([
    productService.getOne(selectedProductId, true),
    productService.getAll({ isActive: true, itemsPerPage: 4 }, true).catch(() => ({ 'hydra:member': [] })),
    reviewService.getAll({ 'product.id': selectedProductId, approved: true }).catch(() => ({ 'hydra:member': [] })),
    flavorService.getAll(true).catch(() => ({ 'hydra:member': [] })),
    ]).then(([prod, relData, revData, flavorData]) => {
      const flavorCatalog = flavorData['hydra:member'] || [];
      const norm = normalizeProduct(prod, flavorCatalog);
      setProduct(norm);
      const primaryImageUrl = (prod?.productImages || [])
        .find((img) => isPrimaryProductImage(img));
      setActiveImage(resolveProductImage(prod, norm.image) || productImageUrl(primaryImageUrl));
      setSelectedFlavor(norm.flavors[0] || '');
      const relProds = (relData['hydra:member'] || []).filter(p => p.id !== prod.id).slice(0, 3).map((item) => normalizeProduct(item, flavorCatalog));
      setRelated(relProds);
      setReviews(revData['hydra:member'] || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [selectedProductId]);

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!product) return;
    setSubmittingReview(true);
    try {
      await reviewService.create({
        product: product['@id'] || `/api/products/${product.id}`,
        customerName: reviewForm.customerName,
        email: reviewForm.email,
        rating: reviewForm.rating,
        comment: reviewForm.comment,
      });
      showToast('✅ Avis envoyé ! Il sera visible après approbation.');
      setReviewForm({ customerName: '', email: '', rating: 5, comment: '' });
    } catch (err) {
      showToast(`❌ ${err.message}`);
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-[#d90429] animate-spin" />
      </div>
    );
  }

  if (!product) {
    return <div className="text-center py-20 text-gray-400">Produit introuvable.</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16">
      <button onClick={() => navigateTo("shop")}
        className="inline-flex items-center gap-2 text-xs font-heading font-bold text-gray-400 hover:text-[#d90429] transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> RETOUR À LA BOUTIQUE
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Left Image */}
        <div className="lg:col-span-6 bg-[#1a1a1a] border border-white/10 p-8 rounded-2xl relative flex items-center justify-center">
          {product.badge && (
            <div className="absolute top-4 left-4 bg-[#d90429] text-white text-xs font-black px-3 py-1 rounded shadow-lg uppercase">
              {product.badge}
            </div>
          )}
          <div className="w-full space-y-4">
            <div className="w-full h-96 flex items-center justify-center">
              {activeImage || product.image ? (
                <img
                  src={activeImage || product.image}
                  alt={product.name}
                  className="w-full h-96 object-contain py-4 transform hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-96 flex items-center justify-center rounded-xl border border-white/10 bg-[#111] text-gray-500 text-sm font-bold uppercase tracking-widest">
                  No picture
                </div>
              )}
            </div>
            {product.productImages.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {product.productImages.map((img, index) => {
                  const imageSrc = productImageUrl(img) || product.image;
                  return (
                    <button
                      key={img.id ?? img['@id'] ?? `${img.image || 'img'}-${index}`}
                      type="button"
                      onClick={() => setActiveImage(imageSrc)}
                      className={`bg-[#111] border rounded-lg p-2 aspect-square overflow-hidden transition-colors ${activeImage === imageSrc ? 'border-[#d90429]' : 'border-white/10 hover:border-white/30'}`}
                    >
                      {imageSrc ? (
                        <img src={imageSrc} alt="" className="w-full h-full object-contain" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">Image</div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Info */}
        <div className="lg:col-span-6 space-y-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-bold text-[#d90429] tracking-widest uppercase font-heading">{product.brand}</span>
              <span className="text-gray-600">•</span>
              <div className="flex items-center gap-1 text-yellow-400 text-xs font-bold">
                <Star className="w-4 h-4 fill-yellow-400" />
                <span>{reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '—'}</span>
                <span className="text-gray-400 font-normal">({reviews.length} avis)</span>
              </div>
            </div>
            <h1 className="font-heading font-black text-3xl sm:text-4xl text-white leading-tight uppercase">{product.name}</h1>
            <div className="flex items-baseline gap-3 mt-4">
              <span className="font-black text-3xl text-white">{product.price.toFixed(2)} <span className="text-sm font-bold text-[#d90429]">TND</span></span>
              {product.originalPrice && (
                <span className="text-sm text-gray-500 line-through">{product.originalPrice.toFixed(2)} TND</span>
              )}
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded ${product.inStock ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
                {product.inStock ? 'En Stock' : 'Rupture de Stock'}
              </span>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-gray-300 leading-relaxed border-t border-b border-white/10 py-4">{product.description}</p>

          {product.flavors.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-heading font-bold text-gray-300 block uppercase">
                Saveur: <span className="text-[#d90429]">{selectedFlavor}</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {product.flavors.map((f, index) => (
                  <button key={`${f}-${index}`} onClick={() => setSelectedFlavor(f)}
                    className={`px-4 py-2 rounded-lg border text-xs font-bold transition-all ${selectedFlavor === f ? 'bg-[#d90429] text-white border-[#d90429]' : 'bg-[#1a1a1a] border-white/10 text-gray-300 hover:border-white/30'}`}
                  >{f}</button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 pt-4">
            <div className="flex items-center border border-white/10 rounded-xl bg-[#1a1a1a] px-3 py-3">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="text-gray-400 hover:text-white px-2 font-bold">-</button>
              <span className="w-8 text-center font-bold text-white text-sm">{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)} className="text-gray-400 hover:text-white px-2 font-bold">+</button>
            </div>
            <button
              onClick={() => addToCart(product, selectedFlavor, selectedSize, quantity)}
              disabled={!product.inStock}
              className="flex-1 bg-[#d90429] hover:bg-[#b0021f] disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-heading font-black text-xs uppercase tracking-wider py-4 px-6 rounded-xl shadow-xl shadow-[#d90429]/30 flex items-center justify-center gap-3 transition-all"
            >
              <ShoppingCart className="w-5 h-5" /> AJOUTER AU PANIER
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-4 text-xs text-gray-400">
            <div className="flex items-center gap-2"><Truck className="w-4 h-4 text-[#d90429] shrink-0" /><span>Livraison express (24-48h)</span></div>
            <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" /><span>Paiement sécurisé</span></div>
          </div>
        </div>
      </div>

      {/* Nutrition Facts */}
      {product.nutritionFact && (
        <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-8 space-y-6">
          <h2 className="font-heading font-black text-xl text-white uppercase flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#d90429]" /> VALEURS NUTRITIONNELLES
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: 'PROTÉINE', value: `${product.nutritionFact.protein}g`, bar: 90, color: 'bg-[#d90429]' },
              { label: 'GLUCIDES', value: `${product.nutritionFact.carbs}g`, bar: 20, color: 'bg-blue-400' },
              { label: 'LIPIDES', value: `${product.nutritionFact.fat}g`, bar: 10, color: 'bg-amber-400' },
              { label: 'CALORIES', value: `${product.nutritionFact.calories} kcal`, bar: 60, color: 'bg-emerald-400' },
            ].map(({ label, value, bar, color }) => (
              <div key={label} className="bg-[#111] border border-white/5 p-4 rounded-xl space-y-2">
                <span className="text-xs text-gray-400 uppercase font-heading font-bold">{label}</span>
                <div className="font-heading font-black text-2xl text-white">{value}</div>
                <div className="w-full bg-[#2a2a2a] h-1.5 rounded-full overflow-hidden">
                  <div className={`${color} h-full`} style={{ width: `${bar}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reviews */}
      <div className="space-y-8">
        <h2 className="font-heading font-black text-xl text-white uppercase">AVIS CLIENTS ({reviews.length})</h2>
        {reviews.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reviews.map(r => (
              <div key={r.id} className="bg-[#1a1a1a] border border-white/10 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">{r.customerName}</span>
                  <div className="flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} />)}</div>
                </div>
                <p className="text-xs text-gray-300">{r.comment}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Aucun avis pour l'instant. Soyez le premier !</p>
        )}

        {/* Review Form */}
        <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 space-y-4">
          <h3 className="font-black text-white uppercase text-sm">LAISSER UN AVIS</h3>
          <form onSubmit={handleReviewSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input required placeholder="Votre nom *" value={reviewForm.customerName}
                onChange={e => setReviewForm(p => ({ ...p, customerName: e.target.value }))}
                className="bg-[#111] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#d90429]"
              />
              <input type="email" required placeholder="Email *" value={reviewForm.email}
                onChange={e => setReviewForm(p => ({ ...p, email: e.target.value }))}
                className="bg-[#111] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#d90429]"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 uppercase font-bold">Note:</span>
              {[1,2,3,4,5].map(n => (
                <button type="button" key={n} onClick={() => setReviewForm(p => ({ ...p, rating: n }))}>
                  <Star className={`w-5 h-5 transition-colors ${n <= reviewForm.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} />
                </button>
              ))}
            </div>
            <textarea required placeholder="Votre commentaire..." rows={3} value={reviewForm.comment}
              onChange={e => setReviewForm(p => ({ ...p, comment: e.target.value }))}
              className="w-full bg-[#111] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#d90429] resize-none"
            />
            <button type="submit" disabled={submittingReview}
              className="bg-[#d90429] hover:bg-[#b0021f] disabled:opacity-60 text-white font-black text-xs uppercase tracking-wider px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
            >
              {submittingReview ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Envoyer l'avis
            </button>
          </form>
        </div>
      </div>

      {/* Related Products */}
      {related.length > 0 && (
        <div className="space-y-6">
          <h2 className="font-heading font-black text-xl text-white uppercase">PRODUITS COMPLÉMENTAIRES</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {related.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      )}
    </div>
  );
};
