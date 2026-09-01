import React, { createContext, useContext, useEffect, useState } from 'react';
import { bannerService } from '../services/api';

const AdminContext = createContext();

const NAVIGATION_STORAGE_KEY = 'admin_navigation';
const CATEGORY_NAV_STORAGE_KEY = 'admin_category_navigation';
const BANNER_STORAGE_KEY = 'admin_banner';
const SALES_STATS_STORAGE_KEY = 'admin_sales_stats';
const ADMIN_TOKEN_KEY = 'admin_jwt';
const ADMIN_AUTH_KEY = 'admin_authenticated';
const ADMIN_REMEMBER_KEY = 'admin_remember_me';
const ADMIN_EMAIL_KEY = 'admin_email';

const DEFAULT_NAVIGATION = [
  { id: 'home', label: 'Accueil', url: '/', enabled: true, type: 'link' },
  {
    id: 'shop',
    label: 'Boutique',
    url: '/shop',
    enabled: true,
    type: 'dropdown',
    dropdownItems: [
      { id: 'proteins', label: 'Protéines', url: '/shop?category=proteins' },
      { id: 'performance', label: 'Performance', url: '/shop?category=performance' },
      { id: 'vitamins', label: 'Vitamines', url: '/shop?category=vitamins' },
    ],
  },
  { id: 'calculator', label: 'Calculateur', url: '/calculator', enabled: true, type: 'link' },
  { id: 'coach-ia', label: 'Coach IA', url: '/coach-ia', enabled: true, type: 'link' },
  { id: 'blog', label: 'Blog', url: '/blog', enabled: true, type: 'link' },
  { id: 'recipes', label: 'Recettes', url: '/recipes', enabled: true, type: 'link' },
];

const DEFAULT_BANNER = {
  enabled: true,
  text: 'Livraison rapide partout en Tunisie',
  ctaText: 'Voir les offres',
  backgroundColor: '#d90429',
  textColor: '#ffffff',
};

const DEFAULT_SALES_STATS = {
  totalRevenue: 482500,
  netSales: 410200,
  avgOrderValue: 84.5,
  totalOrders: 5710,
};

const DEFAULT_CATEGORY_NAVIGATION = {
  hiddenTopLevelCategoryIds: [],
  topLevelOrder: [],
};

const readStoredJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (_) {
    return fallback;
  }
};

const isJwtExpired = (token) => {
  if (!token || typeof token !== 'string') return true;
  const parts = token.split('.');
  if (parts.length !== 3) return false;

  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (!payload.exp) return false;
    return Date.now() >= payload.exp * 1000;
  } catch (_) {
    return false;
  }
};

export function useAdmin() {
  return useContext(AdminContext) ?? {
    adminToken: null,
    login: () => {},
    logout: () => {},
    isAuthenticated: false,
    navigation: [],
    updateNavigation: () => {},
    categoryNavigation: { hiddenTopLevelCategoryIds: [], topLevelOrder: [] },
    updateCategoryNavigation: () => {},
    banner: null,
    updateBanner: () => {},
    salesStats: {},
    updateSalesStats: () => {},
  };
}

export const AdminProvider = ({ children }) => {
  const [adminToken, setAdminToken] = useState(() =>
    sessionStorage.getItem(ADMIN_TOKEN_KEY) ||
    localStorage.getItem(ADMIN_TOKEN_KEY) ||
    null
  );
  const [navigation, setNavigation] = useState(() =>
    readStoredJson(NAVIGATION_STORAGE_KEY, DEFAULT_NAVIGATION)
  );
  const [categoryNavigation, setCategoryNavigation] = useState(() =>
    readStoredJson(CATEGORY_NAV_STORAGE_KEY, DEFAULT_CATEGORY_NAVIGATION)
  );
  const [banner, setBanner] = useState(DEFAULT_BANNER);
  const [salesStats, setSalesStats] = useState(() =>
    readStoredJson(SALES_STATS_STORAGE_KEY, DEFAULT_SALES_STATS)
  );

  const login = (token, options = {}) => {
    const rememberMe = !!options.rememberMe;

    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    sessionStorage.removeItem(ADMIN_AUTH_KEY);
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_AUTH_KEY);

    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem(ADMIN_TOKEN_KEY, token);
    storage.setItem(ADMIN_AUTH_KEY, 'true');
    localStorage.setItem(ADMIN_REMEMBER_KEY, rememberMe ? 'true' : 'false');

    if (typeof options.email === 'string' && options.email.trim()) {
      localStorage.setItem(ADMIN_EMAIL_KEY, options.email.trim());
    } else {
      localStorage.removeItem(ADMIN_EMAIL_KEY);
    }

    setAdminToken(token);
  };

  const logout = () => {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    sessionStorage.removeItem(ADMIN_AUTH_KEY);
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_AUTH_KEY);
    setAdminToken(null);
  };

  const updateNavigation = (items) => {
    setNavigation(items);
    localStorage.setItem(NAVIGATION_STORAGE_KEY, JSON.stringify(items));
  };

  const updateCategoryNavigation = (nextConfig) => {
    setCategoryNavigation(nextConfig);
    localStorage.setItem(CATEGORY_NAV_STORAGE_KEY, JSON.stringify(nextConfig));
  };

  const updateBanner = (nextBanner) => {
    setBanner(nextBanner);
    localStorage.setItem(BANNER_STORAGE_KEY, JSON.stringify(nextBanner));
  };

  const updateSalesStats = (nextStats) => {
    setSalesStats(nextStats);
    localStorage.setItem(SALES_STATS_STORAGE_KEY, JSON.stringify(nextStats));
  };

  const isAuthenticated = !!adminToken;

  useEffect(() => {
    if (isJwtExpired(adminToken)) {
      logout();
      return;
    }

    let alive = true;
    const handleAuthExpired = () => logout();

    window.addEventListener('admin-auth-expired', handleAuthExpired);

    bannerService.getActive()
      .then((data) => {
        if (!alive) return;
        const banners = data?.['hydra:member'] || [];
        if (banners.length > 0) {
          setBanner(banners[0]);
        }
      })
      .catch(() => {});

    return () => {
      alive = false;
      window.removeEventListener('admin-auth-expired', handleAuthExpired);
    };
  }, [adminToken]);

  return (
    <AdminContext.Provider
      value={{
        adminToken,
        login,
        logout,
        isAuthenticated,
        navigation,
        updateNavigation,
        categoryNavigation,
        updateCategoryNavigation,
        banner,
        updateBanner,
        salesStats,
        updateSalesStats,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};
