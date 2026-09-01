import React from 'react';
import { AdminSidebar } from './AdminSidebar';
import { useAdmin } from '../../context/AdminContext';
import { User, Bell, Search, LogOut } from 'lucide-react';

export const AdminLayout = ({ children, activeAdminTab, setActiveAdminTab, onLogout }) => {
  const handleViewStore = () => {
    window.location.href = '/';
  };

  return (
    <div className="admin-shell min-h-screen bg-[#101010] text-[#e5e2e1] flex font-sans selection:bg-[#d90429] selection:text-white">
      {/* Sidebar */}
      <AdminSidebar activeTab={activeAdminTab} setActiveTab={setActiveAdminTab} onExit={handleViewStore} onLogout={onLogout} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 bg-[#161616] border-b border-[#2a2a2a] flex items-center justify-between px-8 sticky top-0 z-20">
          <div className="flex-1">
            <div className="relative w-64">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="w-full bg-[#111] border border-[#2a2a2a] text-sm text-gray-300 rounded px-9 py-2 focus:outline-none focus:border-[#444]"
              />
            </div>
          </div>

          <div className="flex-1 text-center">
            <h2 className="text-[#ffb4b4] font-bold tracking-tight text-lg uppercase">
              Protein Store Tunisia
            </h2>
          </div>

          <div className="flex-1 flex items-center justify-end gap-6">
            <button className="text-gray-400 hover:text-white transition-colors">
              <Bell size={18} />
            </button>
            <button className="text-gray-400 hover:text-white transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            </button>
            <div className="w-8 h-8 rounded-full bg-[#222] border border-[#444] flex items-center justify-center overflow-hidden cursor-pointer">
               <div className="w-full h-full bg-[#e60033]/20 flex items-center justify-center"><div className="w-3 h-3 bg-[#e60033] rounded-full blur-[2px]"></div></div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-y-auto bg-[#111]">
          <div className="w-full h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
