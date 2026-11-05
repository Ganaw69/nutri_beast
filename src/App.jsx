import React, { Suspense, lazy, useEffect } from "react";
import { CartProvider, useCart } from "./context/CartContext";
import { AdminProvider, useAdmin } from "./context/AdminContext";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { Toast } from "./components/Toast";
import { HomePage } from "./pages/HomePage";
import { ArrowUp } from "lucide-react";

const lazyPage = (loader, exportName) => lazy(async () => {
  const module = await loader();
  return { default: module[exportName] };
});
const SITE_URL = "https://proteinstoretunisia.tn";

// Keep the landing page in the initial bundle, but load feature screens only
// when a visitor opens them. The admin and AI dependencies were otherwise
// delaying the first storefront paint for every visitor.
const ShopPage = lazyPage(() => import("./pages/ShopPage"), "ShopPage");
const NewProductsPage = lazyPage(() => import("./pages/NewProductsPage"), "NewProductsPage");
const PacksPage = lazyPage(() => import("./pages/PacksPage"), "PacksPage");
const PackDetailPage = lazyPage(() => import("./pages/PacksPage"), "PackDetailPage");
const PackBuilderPage = lazyPage(() => import("./pages/PackBuilderPage"), "PackBuilderPage");
const ProductDetailPage = lazyPage(() => import("./pages/ProductDetailPage"), "ProductDetailPage");
const BrandDetailPage = lazyPage(() => import("./pages/BrandDetailPage"), "BrandDetailPage");
const CalculatorPage = lazyPage(() => import("./pages/CalculatorPage"), "CalculatorPage");
const NutritionistAIPage = lazyPage(() => import("./pages/NutritionistAIPage"), "NutritionistAIPage");
const CoachIaPage = lazyPage(() => import("./pages/CoachIaPage"), "CoachIaPage");
const CartPage = lazyPage(() => import("./pages/CartPage"), "CartPage");
const CheckoutPage = lazyPage(() => import("./pages/CheckoutPage"), "CheckoutPage");
const OrderTrackingPage = lazyPage(() => import("./pages/OrderTrackingPage"), "OrderTrackingPage");
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

const BackToTopButton = () => {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 500);
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-5 right-5 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-[#d90429] text-white shadow-lg transition hover:bg-[#b0021f] focus:outline-none focus:ring-2 focus:ring-white/70"
      aria-label="Retour en haut"
      title="Retour en haut"
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
};

const SEO = () => {
  const { activeTab } = useCart();
  const metadata = {
    home: ["Protein Store Tunisia | Nutrition sportive en Tunisie", "Compléments alimentaires et nutrition sportive livrés en Tunisie : whey, créatine, pré-workout, mass gainers et packs exclusifs."],
    shop: ["Boutique de compléments alimentaires en Tunisie | Protein Store", "Découvrez nos compléments alimentaires et produits de nutrition sportive : whey, créatine, pré-workout et plus."],
    new: ["Nouveautés nutrition sportive | Protein Store Tunisia", "Découvrez les nouveaux produits de nutrition sportive disponibles en Tunisie."],
    packs: ["Packs exclusifs de nutrition sportive | Protein Store", "Découvrez nos packs exclusifs de compléments alimentaires et de nutrition sportive."],
    recipes: ["Recettes sportives et nutrition | Protein Store Tunisia", "Des recettes simples et adaptées à vos objectifs sportifs et nutritionnels."],
    blog: ["Conseils nutrition sportive | Protein Store Tunisia", "Conseils, informations et actualités sur la nutrition sportive et les compléments alimentaires."],
    faq: ["FAQ | Protein Store Tunisia", "Les réponses aux questions fréquentes sur nos produits, commandes, paiements et livraisons."],
    "order-tracking": ["Suivre ma commande | Protein Store Tunisia", "Consultez l’avancement de votre commande Protein Store Tunisia."],
    "privacy-policy": ["Politique de confidentialité | Protein Store Tunisia", "Politique de confidentialité de Protein Store Tunisia."],
    "terms-of-service": ["Conditions générales | Protein Store Tunisia", "Conditions générales de vente et d’utilisation de Protein Store Tunisia."],
  }[activeTab] || ["Protein Store Tunisia | Nutrition sportive en Tunisie", "Compléments alimentaires et nutrition sportive livrés en Tunisie."];
  const canonicalPath = {
    home: "/",
    shop: "/shop",
    new: "/new",
    packs: "/packs",
    recipes: "/recipes",
    blog: "/blog",
    faq: "/faq",
    "order-tracking": "/order-tracking",
    "privacy-policy": "/privacy-policy",
    "terms-of-service": "/terms-of-service",
  }[activeTab] || "/";
  const canonical = `${SITE_URL}${canonicalPath}`;

  React.useEffect(() => {
    document.title = metadata[0];
    const description = document.querySelector('meta[name="description"]');
    const canonicalLink = document.querySelector('link[rel="canonical"]');
    if (description) description.setAttribute("content", metadata[1]);
    if (canonicalLink) canonicalLink.setAttribute("href", canonical);
  }, [canonical, metadata]);

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Protein Store Tunisia",
      url: `${SITE_URL}/`,
      logo: `${SITE_URL}/favicon.svg`,
      email: "contact@proteinstore.tn",
      areaServed: "TN",
    }) }} />
  );
};

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

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    const resetScroll = () => {
      document.scrollingElement?.scrollTo({ top: 0, left: 0, behavior: "auto" });
      window.scrollTo(0, 0);
    };

    resetScroll();
    const frameId = window.requestAnimationFrame(resetScroll);
    const timeoutIds = [100, 300, 800].map((delay) => window.setTimeout(resetScroll, delay));

    return () => {
      window.cancelAnimationFrame(frameId);
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, [activeTab]);

  return (
    <main className="min-h-screen">
      <PageErrorBoundary key={activeTab}>
        <Suspense fallback={<PageLoader />}>
          {activeTab === "home" && <HomePage />}
          {activeTab === "shop" && <ShopPage />}
          {activeTab === "new" && <NewProductsPage />}
          {activeTab === "packs" && <PacksPage />}
          {activeTab === "pack-detail" && <PackDetailPage />}
          {activeTab === "pack-builder" && <PackBuilderPage />}
          {activeTab === "product-detail" && <ProductDetailPage />}
          {activeTab === "brand-detail" && <BrandDetailPage />}
          {activeTab === "calculator" && <CalculatorPage />}
          {activeTab === "nutritionist-ai" && <NutritionistAIPage />}
          {activeTab === "coach-ia" && <CoachIaPage />}
          {activeTab === "cart" && <CartPage />}
          {activeTab === "checkout" && <CheckoutPage />}
          {activeTab === "order-tracking" && <OrderTrackingPage />}
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
        <SEO />
        <div>
          <Navbar />
          <MainContent />
        </div>
        <Footer />
        <Toast />
        <BackToTopButton />
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
