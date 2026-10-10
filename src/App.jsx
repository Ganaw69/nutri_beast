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
const PacksPage = lazyPage(() => import("./pages/PacksPage"), "PacksPage");
const PackDetailPage = lazyPage(() => import("./pages/PacksPage"), "PackDetailPage");
const PackBuilderPage = lazyPage(() => import("./pages/PackBuilderPage"), "PackBuilderPage");
const ProductDetailPage = lazyPage(() => import("./pages/ProductDetailPage"), "ProductDetailPage");
const CalculatorPage = lazyPage(() => import("./pages/CalculatorPage"), "CalculatorPage");
const NutritionistAIPage = lazyPage(() => import("./pages/NutritionistAIPage"), "NutritionistAIPage");
const CoachIaPage = lazyPage(() => import("./pages/CoachIaPage"), "CoachIaPage");
const CartPage = lazyPage(() => import("./pages/CartPage"), "CartPage");
const CheckoutPage = lazyPage(() => import("./pages/CheckoutPage"), "CheckoutPage");
const BlogPage = lazyPage(() => import("./pages/BlogPage"), "BlogPage");
const BlogArticlePage = lazyPage(() => import("./pages/BlogArticlePage"), "BlogArticlePage");
const RecipesPage = lazyPage(() => import("./pages/RecipesPage"), "RecipesPage");
const FAQPage = lazyPage(() => import("./pages/FAQPage"), "FAQPage");
const PrivacyPolicyPage = lazyPage(() => import("./pages/PrivacyPolicyPage"), "PrivacyPolicyPage");
const TermsPage = lazyPage(() => import("./pages/TermsPage"), "TermsPage");
const AdminPage = lazyPage(() => import("./pages/admin/AdminPage"), "AdminPage");
const AdminLoginPage = lazyPage(() => import("./pages/admin/AdminLoginPage"), "AdminLoginPage");

const PageLoader = () => (
  <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-label="Chargement">
    <span className="h-8 w-8 animate-spin rounded-full border-2 border-[#d90429] border-t-transparent" />
  </div>
);

class PageErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <section role="alert" className="mx-auto my-10 max-w-3xl rounded-xl border border-red-500/30 bg-[#181818] p-6 text-center text-white">
          <h1 className="text-xl font-black">Cette page n’a pas pu être affichée</h1>
          <p className="mt-2 text-sm text-gray-400">Une erreur est survenue pendant le chargement. Rechargez la page pour réessayer.</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-5 rounded-lg bg-[#d90429] px-5 py-3 text-sm font-bold text-white">Recharger la page</button>
        </section>
      );
    }

    return this.props.children;
  }
}

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
      <PageErrorBoundary key={activeTab}>
        <Suspense fallback={<PageLoader />}>
          {activeTab === "home" && <HomePage />}
          {activeTab === "shop" && <ShopPage />}
          {activeTab === "packs" && <PacksPage />}
          {activeTab === "pack-detail" && <PackDetailPage />}
          {activeTab === "pack-builder" && <PackBuilderPage />}
          {activeTab === "product-detail" && <ProductDetailPage />}
          {activeTab === "calculator" && <CalculatorPage />}
          {activeTab === "nutritionist-ai" && <NutritionistAIPage />}
          {activeTab === "coach-ia" && <CoachIaPage />}
          {activeTab === "cart" && <CartPage />}
          {activeTab === "checkout" && <CheckoutPage />}
          {activeTab === "blog" && <BlogPage />}
          {activeTab === "blog-article" && <BlogArticlePage />}
          {activeTab === "recipes" && <RecipesPage />}
          {activeTab === "faq" && <FAQPage />}
          {activeTab === "privacy-policy" && <PrivacyPolicyPage />}
          {activeTab === "terms-of-service" && <TermsPage />}
        </Suspense>
      </PageErrorBoundary>
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
