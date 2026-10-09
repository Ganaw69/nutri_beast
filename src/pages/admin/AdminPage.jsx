import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { DashboardOverview } from './DashboardOverview';
import { BannerManager } from './BannerManager';
import { CouvertureManager } from './CouvertureManager';
import { CategoryManager } from './CategoryManager';
import { ProductManager } from './ProductManager';
import { PackManager } from './PackManager';
import { OrderManager } from './OrderManager';
import { CustomerManager } from './CustomerManager';
import { AnalyticsManager } from './AnalyticsManager';
import { BlogManager } from './BlogManager';
import { RecipeManager } from './RecipeManager';
import { BrandManager } from './BrandManager';
import { ReviewManager } from './ReviewManager';
import { CouponManager } from './CouponManager';
import { SettingsManager } from './SettingsManager';
import { UserManager } from './UserManager';
import { StockMovementManager } from './StockMovementManager';

const ADMIN_TABS = new Set([
  'dashboard', 'banner', 'couvertures', 'categories', 'products', 'packs',
  'orders', 'customers', 'analytics', 'blog', 'recipes', 'brands', 'reviews',
  'coupons', 'settings', 'users', 'stock',
]);

const getInitialAdminTab = () => {
  const hashTab = decodeURIComponent(window.location.hash.slice(1));
  const pathTab = window.location.pathname.replace(/^\/admin\/?/, '').split('/')[0];
  const savedTab = sessionStorage.getItem('active_admin_tab');
  return [hashTab, pathTab, savedTab].find((tab) => ADMIN_TABS.has(tab)) || 'dashboard';
};

export const AdminPage = ({ onLogout }) => {
  const [activeAdminTab, setActiveAdminTab] = useState(getInitialAdminTab);

  useEffect(() => {
    sessionStorage.setItem('active_admin_tab', activeAdminTab);
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${activeAdminTab}`);
  }, [activeAdminTab]);

  const renderContent = () => {
    switch (activeAdminTab) {
      case 'dashboard':    return <DashboardOverview />;
      case 'banner':       return <BannerManager />;
      case 'couvertures':  return <CouvertureManager />;
      case 'categories':   return <CategoryManager />;
      case 'products':     return <ProductManager />;
      case 'packs':        return <PackManager />;
      case 'orders':       return <OrderManager />;
      case 'customers':    return <CustomerManager />;
      case 'analytics':    return <AnalyticsManager />;
      case 'blog':         return <BlogManager />;
      case 'recipes':      return <RecipeManager />;
      case 'brands':       return <BrandManager />;
      case 'reviews':      return <ReviewManager />;
      case 'coupons':      return <CouponManager />;
      case 'settings':     return <SettingsManager />;
      case 'users':        return <UserManager />;
      case 'stock':        return <StockMovementManager />;
      default:             return <DashboardOverview />;
    }
  };

  return (
    <AdminLayout
      activeAdminTab={activeAdminTab}
      setActiveAdminTab={setActiveAdminTab}
      onLogout={onLogout}
      onExit={() => window.location.href = '/'}
    >
      {renderContent()}
    </AdminLayout>
  );
};
