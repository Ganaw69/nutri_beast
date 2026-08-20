import React, { useState } from 'react';
import {
  LayoutGrid,
  Globe,
  ShoppingCart,
  FileText,
  Settings,
  LogOut,
  ChevronDown,
  ChevronUp,
  Star,
  Tag,
  Users,
  Package,
  Bookmark,
  Dumbbell,
} from 'lucide-react';

export const AdminSidebar = ({ activeTab, setActiveTab, onExit, onLogout }) => {
  const [expandedMenus, setExpandedMenus] = useState({
    website: true,
    shop: true,
    content: false,
  });

  const toggleMenu = (key) => {
    setExpandedMenus(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const openDefaultChild = (item) => {
    if (item.subItems?.length) {
      setActiveTab(item.subItems[0].id);
    }
  };

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutGrid,
    },
    {
      id: 'website',
      label: 'Site Web',
      icon: Globe,
      subItems: [
        { id: 'navigation', label: 'Navigation' },
        { id: 'banner', label: 'Bannières' },
        { id: 'categories', label: 'Catégories' },
      ],
    },
    {
      id: 'shop',
      label: 'Boutique',
      icon: ShoppingCart,
      subItems: [
        { id: 'products', label: 'Produits' },
        { id: 'orders', label: 'Commandes' },
        { id: 'brands', label: 'Marques' },
        { id: 'coupons', label: 'Codes Promo' },
        { id: 'stock', label: 'Stocks' },
        { id: 'reviews', label: 'Avis Clients' },
        { id: 'customers', label: 'Clients' },
        { id: 'analytics', label: 'Analytiques' },
      ],
    },
    {
      id: 'content',
      label: 'Contenu',
      icon: FileText,
      subItems: [
        { id: 'blog', label: 'Blog & Articles' },
        { id: 'recipes', label: 'Recettes' },
      ],
    },
    {
      id: 'users',
      label: 'Utilisateurs',
      icon: Users,
    },
    {
      id: 'settings',
      label: 'Paramètres',
      icon: Settings,
    },
  ];

  return (
    <aside className="w-64 bg-[#161616] border-r border-[#2a2a2a] flex flex-col h-screen sticky top-0 shrink-0">
      {/* Logo */}
      <div className="h-20 flex items-center px-6 border-b border-[#2a2a2a]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#d90429] rounded flex items-center justify-center">
            <Dumbbell size={16} className="text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-sm text-white leading-tight tracking-wide">NUTRIBEAST</span>
            <span className="text-[10px] text-gray-500 font-mono">Admin Console</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
        {menuItems.map(item => {
          const Icon = item.icon;
          const isDirectlyActive = activeTab === item.id;

          if (item.subItems) {
            const hasActiveChild = item.subItems.some(sub => sub.id === activeTab);
            const isExpanded = expandedMenus[item.id];

            return (
              <div key={item.id} className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    toggleMenu(item.id);
                    openDefaultChild(item);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-bold ${
                    hasActiveChild && !isExpanded
                      ? 'bg-[#d90429]/10 text-[#d90429]'
                      : 'text-gray-300 hover:bg-[#222] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={17} className={hasActiveChild && !isExpanded ? 'text-[#d90429]' : 'text-gray-400'} />
                    {item.label}
                  </div>
                  {isExpanded ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
                </button>

                {isExpanded && (
                  <div className="pl-9 pr-2 space-y-0.5 pb-1">
                    {item.subItems.map(sub => (
                      <button
                        type="button"
                        key={sub.id}
                        onClick={() => setActiveTab(sub.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-200 text-xs font-semibold ${
                          activeTab === sub.id
                            ? 'bg-[#d90429] text-white font-bold'
                            : 'text-gray-400 hover:text-white hover:bg-[#222]'
                        }`}
                      >
                        {sub.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <button
              type="button"
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-bold ${
                isDirectlyActive
                  ? 'bg-[#d90429] text-white'
                  : 'text-gray-300 hover:bg-[#222] hover:text-white'
              }`}
            >
              <Icon size={17} className={isDirectlyActive ? 'text-white' : 'text-gray-400'} />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Bottom */}
      <div className="p-4 space-y-3 border-t border-[#2a2a2a]">
        <button
          onClick={onExit}
          className="w-full flex items-center justify-center px-3 py-2.5 rounded-lg border border-[#333] text-sm font-bold text-gray-300 hover:bg-[#222] hover:text-white bg-[#1a1a1a] transition-all"
        >
          Vue Boutique
        </button>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:bg-[#222] hover:text-red-400 transition-all"
        >
          <LogOut size={16} className="text-gray-500" />
          Déconnexion
        </button>
      </div>
    </aside>
  );
};
