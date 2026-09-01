import React, { useState } from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { DashboardOverview } from './DashboardOverview';
import { BannerManager } from './BannerManager';
import { CategoryManager } from './CategoryManager';
import { ProductManager } from './ProductManager';
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

export const AdminPage = ({ onLogout }) => {
  const [activeAdminTab, setActiveAdminTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeAdminTab) {
      case 'dashboard':    return <DashboardOverview />;
      case 'banner':       return <BannerManager />;
      case 'categories':   return <CategoryManager />;
      case 'products':     return <ProductManager />;
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
