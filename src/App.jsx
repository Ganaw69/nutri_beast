import React from "react";
import { CartProvider, useCart } from "./context/CartContext";
import { AdminProvider, useAdmin } from "./context/AdminContext";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { Toast } from "./components/Toast";
import { HomePage } from "./pages/HomePage";
import { ShopPage } from "./pages/ShopPage";
import { ProductDetailPage } from "./pages/ProductDetailPage";
import { CalculatorPage } from "./pages/CalculatorPage";
import { CoachIaPage } from "./pages/CoachIaPage";
import { CartPage } from "./pages/CartPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { BlogPage } from "./pages/BlogPage";
import { BlogArticlePage } from "./pages/BlogArticlePage";
import { RecipesPage } from "./pages/RecipesPage";
import { AdminPage } from "./pages/admin/AdminPage";
import { AdminLoginPage } from "./pages/admin/AdminLoginPage";

// Check if the current URL path is /admin
const isAdminRoute = () => {
  const path = window.location.pathname;
  return path === "/admin" || path.startsWith("/admin/");
};

// Admin App Shell — completely separate from client app
const AdminApp = () => {
  const { isAuthenticated, logout } = useAdmin();

  if (!isAuthenticated) {
    return <AdminLoginPage onLoginSuccess={() => {}} />;
  }

  return <AdminPage onLogout={logout} />;
};

// Client App
const MainContent = () => {
  const { activeTab } = useCart();

  return (
    <main className="min-h-screen">
      {activeTab === "home" && <HomePage />}
      {activeTab === "shop" && <ShopPage />}
      {activeTab === "product-detail" && <ProductDetailPage />}
      {activeTab === "calculator" && <CalculatorPage />}
      {activeTab === "coach-ia" && <CoachIaPage />}
      {activeTab === "cart" && <CartPage />}
      {activeTab === "checkout" && <CheckoutPage />}
      {activeTab === "blog" && <BlogPage />}
      {activeTab === "blog-article" && <BlogArticlePage />}
      {activeTab === "recipes" && <RecipesPage />}
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
