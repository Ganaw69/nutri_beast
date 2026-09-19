import React, { useState } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { Bell, Menu, Search, X } from 'lucide-react';

export const AdminLayout = ({ children, activeAdminTab, setActiveAdminTab, onLogout }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleViewStore = () => {
    window.location.href = '/';
  };

  return (
    <div className="admin-shell min-h-[100dvh] bg-[#101010] text-[#e5e2e1] flex font-sans selection:bg-[#d90429] selection:text-white">
      {/* Sidebar */}
      <AdminSidebar activeTab={activeAdminTab} setActiveTab={setActiveAdminTab} onExit={handleViewStore} onLogout={onLogout} />

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" onClick={() => setMobileMenuOpen(false)} className="absolute inset-0 bg-black/70" aria-label="Fermer le menu" />
          <div className="relative h-full w-64">
            <AdminSidebar
              mobile
              activeTab={activeAdminTab}
              setActiveTab={setActiveAdminTab}
              onExit={handleViewStore}
              onLogout={onLogout}
              onClose={() => setMobileMenuOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-14 sm:h-16 bg-[#161616] border-b border-[#2a2a2a] flex items-center gap-3 px-3 sm:px-6 lg:px-8 sticky top-0 z-20">
          <button type="button" onClick={() => setMobileMenuOpen(true)} className="lg:hidden rounded-lg p-2 text-white/80 hover:bg-[#222] hover:text-white" aria-label="Ouvrir le menu">
            <Menu size={20} />
          </button>

          <div className="hidden sm:block flex-1">
            <div className="relative w-48 lg:w-64">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text" 
                placeholder="Search..." 
                className="w-full bg-[#111] border border-[#2a2a2a] text-sm text-gray-300 rounded px-9 py-2 focus:outline-none focus:border-[#444]"
              />
            </div>
          </div>

          <div className="flex-1 min-w-0 text-center">
            <h2 className="text-[#ffb4b4] font-bold tracking-tight text-xs sm:text-base lg:text-lg uppercase truncate">
              <span className="sm:hidden">NUTRIBEAST</span>
              <span className="hidden sm:inline">Protein Store Tunisia</span>
            </h2>
          </div>

          <div className="flex-1 flex items-center justify-end gap-2 sm:gap-4 lg:gap-6">
            <button className="hidden sm:block text-gray-400 hover:text-white transition-colors" aria-label="Notifications">
              <Bell size={18} />
            </button>
            <button className="hidden md:block text-gray-400 hover:text-white transition-colors" aria-label="Applications">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            </button>
            <div className="w-8 h-8 rounded-full bg-[#222] border border-[#444] flex items-center justify-center overflow-hidden cursor-pointer">
               <div className="w-full h-full bg-[#e60033]/20 flex items-center justify-center"><div className="w-3 h-3 bg-[#e60033] rounded-full blur-[2px]"></div></div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-3 sm:p-6 overflow-x-hidden overflow-y-auto bg-[#111]">
          <div className="w-full h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
