import React, { createContext, useContext, useState } from "react";

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [activeTab, setActiveTab] = useState("home");
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [selectedArticleId, setSelectedArticleId] = useState(null);
  const [selectedRecipeId, setSelectedRecipeId] = useState(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedShopCategoryIds, setSelectedShopCategoryIds] = useState([]);
  const [promoCode, setPromoCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState(null); // full coupon object from API
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const addToCart = (product, flavor = null, size = null, qty = 1) => {
    const targetFlavor = flavor || (product.flavors ? product.flavors[0] : "");
    const targetSize = size || (product.sizes ? product.sizes[0] : "");

    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex((item) => item.id === product.id);
      if (existingIndex > -1) {
        const updated = [...prevCart];
        updated[existingIndex].quantity += qty;
        return updated;
      } else {
        return [
          ...prevCart,
          {
            ...product,
            flavor: `${targetFlavor}${targetSize ? ' • ' + targetSize : ''}`,
            quantity: qty,
          },
        ];
      }
    });
    showToast(`🛒 Ajouté au panier: ${product.name}`);
  };

  const updateQuantity = (idOrIndex, newQty) => {
    setCart((prevCart) => {
      if (newQty <= 0) {
        return prevCart.filter((item, i) => item.id !== idOrIndex && i !== idOrIndex);
      }
      return prevCart.map((item, i) => {
        if (item.id === idOrIndex || i === idOrIndex) {
          return { ...item, quantity: newQty };
        }
        return item;
      });
    });
  };

  const removeFromCart = (idOrIndex) => {
    setCart((prevCart) => prevCart.filter((item, i) => item.id !== idOrIndex && i !== idOrIndex));
    showToast("🗑️ Article retiré du panier");
  };

  const clearCart = () => {
    setCart([]);
    setPromoCode("");
    setDiscount(0);
    setAppliedCoupon(null);
  };

  const applyPromoCode = (coupon) => {
    // coupon is the full object from API (type: 'percentage' | 'fixed', value: "10.00")
    if (!coupon) {
      showToast("❌ Code promo invalide ou expiré.");
      return false;
    }
    setAppliedCoupon(coupon);
    setPromoCode(coupon.code);
    if (coupon.type === 'percentage') {
      setDiscount(parseFloat(coupon.value) / 100);
    } else {
      setDiscount(0); // fixed discount handled separately in totals
    }
    showToast(`🎉 Code promo "${coupon.code}" appliqué !`);
    return true;
  };

  const viewProductDetails = (productId) => {
    setSelectedProductId(productId);
    setActiveTab("product-detail");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const viewBlogArticle = (articleId) => {
    setSelectedArticleId(articleId);
    setActiveTab("blog-article");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const viewRecipe = (recipeId) => {
    setSelectedRecipeId(recipeId);
    setActiveTab("recipes");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const navigateTo = (tab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openCartPage = () => {
    setActiveTab("cart");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Calculations
  const subtotal = cart.reduce((acc, item) => acc + item.price * (item.quantity || 1), 0);

  let discountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.type === 'percentage') {
      discountAmount = subtotal * (parseFloat(appliedCoupon.value) / 100);
    } else if (appliedCoupon.type === 'fixed') {
      discountAmount = parseFloat(appliedCoupon.value);
    }
  }

  const shippingFee = subtotal > 150 || subtotal === 0 ? 0 : 7;
  const totalPrice = Math.max(0, subtotal - discountAmount) + shippingFee;
  const totalItems = cart.reduce((acc, item) => acc + (item.quantity || 1), 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        activeTab,
        navigateTo,
        selectedProductId,
        viewProductDetails,
        selectedArticleId,
        viewBlogArticle,
      selectedRecipeId,
      viewRecipe,
      isCartOpen,
      setIsCartOpen: openCartPage,
      openCartPage,
      searchQuery,
      setSearchQuery,
      selectedShopCategoryIds,
      setSelectedShopCategoryIds,
      subtotal,
      discountAmount,
      shippingFee,
        totalPrice,
        totalItems,
        promoCode,
        appliedCoupon,
        applyPromoCode,
        toastMessage,
        showToast,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
