import React from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Kanban, Users, Settings as SettingsIcon, Cloud } from "lucide-react";
import { ROUTES, APP_NAME } from "../constants";
import { isFirebaseConfigured } from "../firebase";
import { useAuth } from "../contexts/AuthContext";

const Layout: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const showSyncNudge = isFirebaseConfigured && !user;

  const navLinks = [
    { to: ROUTES.DASHBOARD, icon: LayoutDashboard, label: 'Dashboard' },
    { to: ROUTES.KANBAN, icon: Kanban, label: 'Board' },
    { to: ROUTES.PEOPLE, icon: Users, label: 'People' },
    { to: ROUTES.SETTINGS, icon: SettingsIcon, label: 'Settings' },
  ];

  const getNavLinkClass = (isActive: boolean, isMobile: boolean) => {
    if (isMobile) {
      return `flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${
        isActive
          ? "text-blue-600"
          : "text-gray-500 hover:text-gray-900"
      }`;
    }
    return `flex items-center justify-center lg:justify-start gap-3 px-3 lg:px-4 py-3 rounded-lg transition-colors ${
      isActive
        ? "bg-blue-100 text-blue-700 font-medium"
        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
    }`;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <header className="md:hidden bg-white border-b border-gray-200 p-4 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img 
            src="/our-house/icons/icon-192x192.png" 
            alt="Our House" 
            className="w-7 h-7"
          />
          <h1 className="text-lg font-bold text-gray-900">{APP_NAME}</h1>
        </div>
        <div className={`w-3 h-3 rounded-full ${isFirebaseConfigured ? "bg-green-500" : "bg-yellow-500"}`} title={isFirebaseConfigured ? "Online" : "Offline"} />
      </header>

      {/* Sidebar - Slim on md, Full on lg */}
      <aside className="flex w-full md:w-20 lg:w-64 bg-white border-t md:border-t-0 md:border-r border-gray-200 flex-col md:fixed md:inset-y-0 md:left-0 z-20 order-2 md:order-1 transition-all duration-300">
        <div className="p-6 hidden lg:flex items-center gap-2 border-b border-gray-100">
          <img 
            src="/our-house/icons/icon-192x192.png" 
            alt="Our House" 
            className="w-8 h-8"
          />
          <h1 className="text-xl font-bold text-gray-900 truncate">{APP_NAME}</h1>
        </div>
        <div className="p-4 hidden md:flex lg:hidden items-center justify-center border-b border-gray-100">
          <img 
            src="/our-house/icons/icon-192x192.png" 
            alt="Our House" 
            className="w-8 h-8"
          />
        </div>

        <nav className="p-2 lg:p-4 space-y-1 flex-1">
          <div className="md:hidden lg:block mb-4">
            <h2 className="text-[10px] lg:text-xs font-semibold text-gray-400 uppercase tracking-wider px-4">Menu</h2>
          </div>
          {navLinks.map((link) => (
            <NavLink key={link.to} to={link.to} className={({ isActive }) => getNavLinkClass(isActive, false)} title={link.label}>
              <link.icon className="w-5 h-5 flex-shrink-0" />
              <span className="hidden lg:block truncate">{link.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 mt-auto border-t border-gray-100 md:border-0">
          <div className={`text-xs px-3 py-2 rounded-md flex items-center justify-center lg:justify-start gap-2 ${isFirebaseConfigured ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isFirebaseConfigured ? "bg-green-500" : "bg-yellow-500"}`} />
            <span className="hidden lg:block">{isFirebaseConfigured ? "Online" : "Offline"}</span>
          </div>
        </div>
      </aside>

      {/* Right column: nudge + content */}
      <div className="flex-1 md:ml-16 flex flex-col min-h-screen">
        {/* Sync nudge banner */}
        {showSyncNudge && (
          <div className="bg-blue-50 border-b border-blue-100 text-blue-700 text-xs py-1.5 px-4 flex items-center justify-center gap-1.5">
            <Cloud className="w-3 h-3 flex-shrink-0" />
            <span>Sign in to sync across devices.</span>
            <NavLink to={ROUTES.SETTINGS} className="underline font-semibold">Set up in Settings</NavLink>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 md:ml-4 lg:ml-48 p-4 pb-24 md:p-6 lg:p-8 overflow-x-hidden min-h-[calc(100vh-4rem)] md:min-h-screen order-1 md:order-2">
          <div className="max-w-6xl mx-auto h-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around p-2 pb-safe z-40 shadow-[0_-1px_3px_rgba(0,0,0,0.05)]">
        {navLinks.map((link) => (
          <NavLink key={link.to} to={link.to} className={({ isActive }) => getNavLinkClass(isActive, true)}>
            <link.icon className={`w-6 h-6 ${location.pathname === link.to ? 'mb-1' : 'mb-0'}`} />
            <span className="text-[10px] font-medium">{link.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default Layout;