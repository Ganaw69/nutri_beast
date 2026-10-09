import React, { Suspense, lazy } from "react";
import { CartProvider, useCart } from "./context/CartContext";
import { AdminProvider, useAdmin } from "./context/AdminContext";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { Toast } from "./components/Toast";
import { HomePage } from "./pages/HomePage";

const lazyPage = (loader, exportName) => lazy(async () => {
  const module = await loader();
  return { default: module[exportName] };
});

// Keep the landing page in the initial bundle, but load feature screens only
// when a visitor opens them. The admin and AI dependencies were otherwise
// delaying the first storefront paint for every visitor.
const ShopPage = lazyPage(() => import("./pages/ShopPage"), "ShopPage");
const ProductDetailPage = lazyPage(() => import("./pages/ProductDetailPage"), "ProductDetailPage");
const CalculatorPage = lazyPage(() => import("./pages/CalculatorPage"), "CalculatorPage");
const NutritionistAIPage = lazyPage(() => import("./pages/NutritionistAIPage"), "NutritionistAIPage");
const CoachIaPage = lazyPage(() => import("./pages/CoachIaPage"), "CoachIaPage");
const CartPage = lazyPage(() => import("./pages/CartPage"), "CartPage");
const CheckoutPage = lazyPage(() => import("./pages/CheckoutPage"), "CheckoutPage");
const BlogPage = lazyPage(() => import("./pages/BlogPage"), "BlogPage");
const BlogArticlePage = lazyPage(() => import("./pages/BlogArticlePage"), "BlogArticlePage");
const RecipesPage = lazyPage(() => import("./pages/RecipesPage"), "RecipesPage");
const AdminPage = lazyPage(() => import("./pages/admin/AdminPage"), "AdminPage");
const AdminLoginPage = lazyPage(() => import("./pages/admin/AdminLoginPage"), "AdminLoginPage");

const PageLoader = () => (
  <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-label="Chargement">
    <span className="h-8 w-8 animate-spin rounded-full border-2 border-[#d90429] border-t-transparent" />
  </div>
);

// Check if the current URL path is /admin
const isAdminRoute = () => {
  const path = window.location.pathname;
  return path === "/admin" || path.startsWith("/admin/");
};

// Admin App Shell — completely separate from client app
const AdminApp = () => {
  const { isAuthenticated, logout } = useAdmin();

  return (
    <Suspense fallback={<PageLoader />}>
      {isAuthenticated ? <AdminPage onLogout={logout} /> : <AdminLoginPage onLoginSuccess={() => {}} />}
    </Suspense>
  );
};

// Client App
const MainContent = () => {
  const { activeTab } = useCart();

  return (
    <main className="min-h-screen">
      <Suspense fallback={<PageLoader />}>
        {activeTab === "home" && <HomePage />}
        {activeTab === "shop" && <ShopPage />}
        {activeTab === "product-detail" && <ProductDetailPage />}
        {activeTab === "calculator" && <CalculatorPage />}
        {activeTab === "nutritionist-ai" && <NutritionistAIPage />}
        {activeTab === "coach-ia" && <CoachIaPage />}
        {activeTab === "cart" && <CartPage />}
        {activeTab === "checkout" && <CheckoutPage />}
        {activeTab === "blog" && <BlogPage />}
        {activeTab === "blog-article" && <BlogArticlePage />}
        {activeTab === "recipes" && <RecipesPage />}
      </Suspense>
    </main>
  );
};

const ClientApp = () => {
  return (
    <CartProvider>
      <div className="min-h-screen bg-[#131313] text-[#e5e2e1] flex flex-col justify-between selection:bg-[#d90429] selection:text-white">
        <div>
          <Navbar />
          <MainContent />
        </div>
        <Footer />
        <Toast />
      </div>
    </CartProvider>
  );
};

export function App() {
  return (
    <AdminProvider>
      {isAdminRoute() ? <AdminApp /> : <ClientApp />}
    </AdminProvider>
  );
}

export default App;
