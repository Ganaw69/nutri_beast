import React, { createContext, useContext, useEffect, useState } from "react";

const CartContext = createContext();

const CLIENT_TABS = new Set([
  "home",
  "shop",
  "calculator",
  "nutritionist-ai",
  "coach-ia",
  "cart",
  "checkout",
  "blog",
  "recipes",
]);

const validId = (value) => value !== undefined && value !== null && value !== "";

const readClientRoute = () => {
  const route = decodeURIComponent(window.location.hash.replace(/^#/, "")).replace(/^\/+|\/+$/g, "");
  if (!route) return { tab: "home" };

  const [tab, id] = route.split("/");
  if ((tab === "product" || tab === "product-detail") && validId(id)) {
    return { tab: "product-detail", productId: id };
  }
  if ((tab === "article" || tab === "blog-article") && validId(id)) {
    return { tab: "blog-article", articleId: id };
  }
  if (tab === "recipes" && validId(id)) {
    return { tab: "recipes", recipeId: id };
  }
  return CLIENT_TABS.has(tab) ? { tab } : { tab: "home" };
};

const routeHash = (tab, id) => {
  if (tab === "home") return "";
  if (tab === "product-detail" && validId(id)) return `#product/${id}`;
  if (tab === "blog-article" && validId(id)) return `#article/${id}`;
  if (tab === "recipes" && validId(id)) return `#recipes/${id}`;
  return `#${tab}`;
};

export const CartProvider = ({ children }) => {
  const [initialRoute] = useState(readClientRoute);
  const [cart, setCart] = useState([]);
  const [activeTab, setActiveTab] = useState(initialRoute.tab);
  const [selectedProductId, setSelectedProductId] = useState(initialRoute.productId || null);
  const [selectedArticleId, setSelectedArticleId] = useState(initialRoute.articleId || null);
  const [selectedRecipeId, setSelectedRecipeId] = useState(initialRoute.recipeId || null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedShopCategoryIds, setSelectedShopCategoryIds] = useState([]);
  const [promoCode, setPromoCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState(null); // full coupon object from API
  const [toastMessage, setToastMessage] = useState(null);

  const updateRoute = (tab, id) => {
    const nextHash = routeHash(tab, id);
    if (window.location.hash !== nextHash) {
      window.history.pushState(null, "", nextHash || window.location.pathname + window.location.search);
    }
  };

  useEffect(() => {
    const syncRouteFromUrl = () => {
      const route = readClientRoute();
      setActiveTab(route.tab);
      setSelectedProductId(route.productId || null);
      setSelectedArticleId(route.articleId || null);
      setSelectedRecipeId(route.recipeId || null);
    };

    window.addEventListener("hashchange", syncRouteFromUrl);
    window.addEventListener("popstate", syncRouteFromUrl);
    return () => {
      window.removeEventListener("hashchange", syncRouteFromUrl);
      window.removeEventListener("popstate", syncRouteFromUrl);
    };
  }, []);

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
    updateRoute("product-detail", productId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const viewBlogArticle = (articleId) => {
    setSelectedArticleId(articleId);
    setActiveTab("blog-article");
    updateRoute("blog-article", articleId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const viewRecipe = (recipeId) => {
    setSelectedRecipeId(recipeId);
    setActiveTab("recipes");
    updateRoute("recipes", recipeId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const navigateTo = (tab) => {
    setActiveTab(tab);
    updateRoute(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openCartPage = () => {
    setActiveTab("cart");
    updateRoute("cart");
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
