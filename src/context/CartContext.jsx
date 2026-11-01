import React, { createContext, useContext, useEffect, useState } from "react";
import { couponService, resolvePackImage, resolveProductImage } from "../services/api";

const CartContext = createContext();

const CLIENT_TABS = new Set([
  "home",
  "shop",
  "new",
  "packs",
  "pack-builder",
  "calculator",
  "nutritionist-ai",
  "coach-ia",
  "cart",
  "checkout",
  "order-tracking",
  "blog",
  "recipes",
]);

const validId = (value) => value !== undefined && value !== null && value !== "";

const normaliseShopRouteFilters = (filters = {}) => ({
  filter: String(filters.filter ?? filters.is_new ?? "").trim(),
  category: String(filters.category ?? "").trim(),
});

const readClientRoute = () => {
  const hashRoute = decodeURIComponent(window.location.hash.replace(/^#/, ""));
  const [rawRoute, rawQuery = ""] = hashRoute.split("?");
  const route = rawRoute.replace(/^\/+|\/+$/g, "");
  if (!route) {
    const pathTab = window.location.pathname.replace(/^\/+|\/+$/g, "");
    if (pathTab === "shop" || pathTab === "catalog") {
      const params = new URLSearchParams(window.location.search);
      return {
        tab: "shop",
        shopRouteFilters: normaliseShopRouteFilters({
          filter: params.get("filter") || (params.get("is_new") === "1" ? "new" : ""),
          category: params.get("category"),
        }),
      };
    }
    if (CLIENT_TABS.has(pathTab)) return { tab: pathTab };
    return { tab: "home" };
  }

  const [tab, id] = route.split("/");
  if ((tab === "product" || tab === "product-detail") && validId(id)) {
    return { tab: "product-detail", productId: id };
  }
  if (tab === "pack" && validId(id)) {
    return { tab: "pack-detail", packId: id };
  }
  if ((tab === "brand" || tab === "brand-detail") && validId(id)) {
    return { tab: "brand-detail", brandId: id };
  }
  if ((tab === "article" || tab === "blog-article") && validId(id)) {
    return { tab: "blog-article", articleId: id };
  }
  if (tab === "recipes" && validId(id)) {
    return { tab: "recipes", recipeId: id };
  }
  if (tab === "shop") {
    const params = new URLSearchParams(rawQuery);
    return {
      tab,
      shopRouteFilters: normaliseShopRouteFilters({
        filter: params.get("filter") || (params.get("is_new") === "1" ? "new" : ""),
        category: params.get("category"),
      }),
    };
  }
  return CLIENT_TABS.has(tab) ? { tab } : { tab: "home" };
};

const routeHash = (tab, id, shopRouteFilters) => {
  if (tab === "home") return "";
  if (tab === "product-detail" && validId(id)) return `#product/${id}`;
  if (tab === "pack-detail" && validId(id)) return `#pack/${id}`;
  if (tab === "brand-detail" && validId(id)) return `#brand/${id}`;
  if (tab === "blog-article" && validId(id)) return `#article/${id}`;
  if (tab === "recipes" && validId(id)) return `#recipes/${id}`;
  if (tab === "shop") {
    const filters = normaliseShopRouteFilters(shopRouteFilters);
    const params = new URLSearchParams();
    if (filters.filter) params.set("filter", filters.filter);
    if (filters.category) params.set("category", filters.category);
    const query = params.toString();
    return `#shop${query ? `?${query}` : ""}`;
  }
  return `#${tab}`;
};

export const CartProvider = ({ children }) => {
  const [initialRoute] = useState(readClientRoute);
  const [cart, setCart] = useState([]);
  const [activeTab, setActiveTab] = useState(initialRoute.tab);
  const [selectedProductId, setSelectedProductId] = useState(initialRoute.productId || null);
  const [selectedPackId, setSelectedPackId] = useState(initialRoute.packId || null);
  const [selectedBrandId, setSelectedBrandId] = useState(initialRoute.brandId || null);
  const [customPackDraft, setCustomPackDraft] = useState([]);
  const [selectedCustomPackId, setSelectedCustomPackId] = useState(null);
  const [customPackQuote, setCustomPackQuote] = useState(null);
  const [selectedArticleId, setSelectedArticleId] = useState(initialRoute.articleId || null);
  const [selectedRecipeId, setSelectedRecipeId] = useState(initialRoute.recipeId || null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedShopCategoryIds, setSelectedShopCategoryIds] = useState([]);
  const [shopRouteFilters, setShopRouteFilters] = useState(() => initialRoute.shopRouteFilters || {});
  const [promoCode, setPromoCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState(null); // full coupon object from API
  const [toastMessage, setToastMessage] = useState(null);

  const updateRoute = (tab, id, filters) => {
    const nextHash = routeHash(tab, id, filters);
    if (window.location.hash !== nextHash) {
      window.history.pushState(null, "", nextHash || window.location.pathname + window.location.search);
    }
  };

  useEffect(() => {
    const syncRouteFromUrl = () => {
      const route = readClientRoute();
      setActiveTab(route.tab);
      setSelectedProductId(route.productId || null);
      setSelectedPackId(route.packId || null);
      setSelectedBrandId(route.brandId || null);
      setSelectedArticleId(route.articleId || null);
      setSelectedRecipeId(route.recipeId || null);
      setShopRouteFilters(route.shopRouteFilters || {});
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

  const addCustomPackToCart = (pack, quote, quantity = 1) => {
    if (!pack?.id || !quote || !Number.isFinite(Number(quote.finalPrice)) || Number(quote.finalPrice) < 0 || !Array.isArray(quote.items)
      || Number(quote.distinctProductCount ?? quote.items.length) < 2
      || Number(quote.distinctProductCount ?? quote.items.length) > 5) {
      showToast("Le serveur n’a pas confirmé le prix de ce pack.");
      return false;
    }
    const randomPart = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const cartItem = {
      id: `custom-pack-${pack.id}-${randomPart}`,
      itemType: "custom-pack",
      name: pack.name,
      image: resolvePackImage(pack),
      price: Number(quote.finalPrice),
      originalPrice: Number(quote.subtotal ?? quote.basePrice),
      quantity: Math.max(1, Number(quantity) || 1),
      customPack: {
        packId: pack.id,
        subtotal: Number(quote.subtotal ?? quote.basePrice),
        finalPrice: Number(quote.finalPrice),
        total: quote.total != null ? Number(quote.total) : undefined,
        discountAmount: quote.discountAmount != null
          ? Number(quote.discountAmount)
          : quote.items.reduce((sum, item) => sum + Number(item.discountAmount || 0), 0),
        items: quote.items.map((item) => ({
          productId: item.productId,
          name: item.productName || item.name,
          sku: item.sku,
          variantSku: item.variantSku || null,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          discountAmount: item.discountAmount != null ? Number(item.discountAmount) : undefined,
          subtotal: item.subtotal != null ? Number(item.subtotal) : undefined,
          total: item.total != null ? Number(item.total) : undefined,
        })),
      },
    };
    setCart((prevCart) => [...prevCart, cartItem]);
    showToast(`Pack personnalisé ajouté : ${pack.name}`);
    return true;
  };

  const addPredefinedPackToCart = (pack, products, quantity = 1) => {
    const finalPrice = Number(pack?.finalPrice);
    if (!pack?.id || !Number.isFinite(finalPrice) || finalPrice <= 0 || !Array.isArray(products) || products.length === 0
      || products.some((item) => !item?.product?.id || !item.product.sku || Number(item.quantity) < 1)) {
      showToast("Ce pack n’est pas encore prêt à être commandé.");
      return false;
    }

    const items = products.map((item) => ({
      productId: item.product.id,
      sku: item.product.sku,
      name: item.product.name,
      quantity: Number(item.quantity),
      unitPrice: Number(item.product.salePrice ?? item.product.currentPrice ?? item.product.price ?? 0),
    }));
    const randomPart = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    setCart((previous) => [...previous, {
      id: `predefined-pack-${pack.id}-${randomPart}`,
      itemType: "predefined-pack",
      name: pack.name,
      // Pack records commonly store just a filename. Resolve it before it
      // enters the cart so the cart works in both local and deployed builds.
      image: resolvePackImage(pack),
      price: finalPrice,
      originalPrice: Number(pack.basePrice ?? finalPrice),
      quantity: Math.max(1, Number(quantity) || 1),
      predefinedPack: { packId: pack.id, items },
    }]);
    showToast(`Pack ajouté au panier : ${pack.name}`);
    return true;
  };

  const addProductBundleToCart = (products) => {
    if (!Array.isArray(products) || products.length === 0 || products.some((product) => !product?.sku || Number(product.quantity) < 1)) {
      showToast("La composition doit contenir des produits avec un SKU valide.");
      return false;
    }
    const items = products.map((product) => ({
      productId: product.productId,
      sku: product.sku,
      name: product.name,
      image: resolveProductImage({ image: product.image }, null) || product.image || null,
      quantity: Number(product.quantity),
      unitPrice: Number(product.unitPrice || 0),
    }));
    const estimate = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const randomPart = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setCart((previous) => [...previous, {
      id: `product-bundle-${randomPart}`,
      itemType: "product-bundle",
      name: "Ma composition personnalisée",
      image: items.find((item) => item.image)?.image || null,
      price: estimate,
      quantity: 1,
      productBundle: { items },
    }]);
    showToast("Votre composition a été ajoutée au panier. Les prix et stocks seront revérifiés à la commande.");
    return true;
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

  const applyPromoCode = async (couponOrCode) => {
    let coupon = couponOrCode;
    if (typeof couponOrCode === "string") {
      try {
        coupon = await couponService.findByCode(couponOrCode);
      } catch {
        showToast("Impossible de vérifier le code promo.");
        return false;
      }
    }

    const now = Date.now();
    const startDate = coupon?.startDate ?? coupon?.start_date;
    const endDate = coupon?.endDate ?? coupon?.end_date;
    const minimumAmount = Number(coupon?.minimumAmount ?? coupon?.minimum_amount ?? 0);
    const startsInFuture = startDate && new Date(startDate).getTime() > now;
    const hasEnded = endDate && new Date(endDate).getTime() < now;
    const isActive = coupon?.isActive ?? coupon?.is_active ?? coupon?.active;

    if (!coupon || isActive === false || startsInFuture || hasEnded) {
      showToast("❌ Code promo invalide ou expiré.");
      return false;
    }
    if (Number.isFinite(minimumAmount) && minimumAmount > subtotal) {
      showToast(`Ce code est valable à partir de ${minimumAmount.toFixed(2)} TND.`);
      return false;
    }

    const code = String(coupon.code || "").trim().toUpperCase();
    const rawType = String(coupon.type ?? coupon.discountType ?? coupon.discount_type ?? "").toLowerCase();
    const type = ["percentage", "percent", "percent_off", "pourcentage"].includes(rawType)
      ? "percentage"
      : "fixed";
    const value = Math.max(0, Number(coupon.value ?? coupon.amount ?? coupon.discount ?? 0) || 0);
    if (!code || value <= 0) {
      showToast("❌ Code promo invalide ou expiré.");
      return false;
    }

    const normalizedCoupon = { ...coupon, code, type, value };
    setAppliedCoupon(normalizedCoupon);
    setPromoCode(code);
    setDiscount(type === "percentage" ? value / 100 : 0);
    showToast(`🎉 Code promo "${code}" appliqué !`);
    return true;
  };

  const viewProductDetails = (productId) => {
    setSelectedProductId(productId);
    setActiveTab("product-detail");
    updateRoute("product-detail", productId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const viewPackDetails = (packId) => {
    setSelectedPackId(packId);
    setActiveTab("pack-detail");
    updateRoute("pack-detail", packId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const viewBrandDetails = (brandId) => {
    setSelectedBrandId(brandId);
    setActiveTab("brand-detail");
    updateRoute("brand-detail", brandId);
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

  const navigateTo = (tab, { preserveScroll = false, shopFilters = {} } = {}) => {
    const nextShopFilters = tab === "shop" ? normaliseShopRouteFilters(shopFilters) : {};
    setActiveTab(tab);
    setShopRouteFilters(nextShopFilters);
    updateRoute(tab, undefined, nextShopFilters);
    if (!preserveScroll) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
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

  discountAmount = Math.min(subtotal, Number.isFinite(discountAmount) ? discountAmount : 0);
  const shippingFee = subtotal >= 300 || subtotal === 0 ? 0 : 7;
  const totalPrice = Math.max(0, subtotal - discountAmount) + shippingFee;
  const totalItems = cart.reduce((acc, item) => acc + (item.quantity || 1), 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        addCustomPackToCart,
        addPredefinedPackToCart,
        addProductBundleToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        activeTab,
        navigateTo,
        selectedProductId,
        viewProductDetails,
        selectedPackId,
        viewPackDetails,
        selectedBrandId,
        viewBrandDetails,
        customPackDraft,
        setCustomPackDraft,
        selectedCustomPackId,
        setSelectedCustomPackId,
        customPackQuote,
        setCustomPackQuote,
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
      shopRouteFilters,
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
