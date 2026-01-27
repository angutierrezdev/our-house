import React from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Kanban, Users, CheckCircle2, Settings as SettingsIcon } from "lucide-react";
import { ROUTES, APP_NAME } from "../constants";
import { isFirebaseConfigured } from "../firebase";

const Layout: React.FC = () => {
  const location = useLocation();

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
    return `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
      isActive
        ? "bg-blue-100 text-blue-700 font-medium"
        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
    }`;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <header className="md:hidden bg-white border-b border-gray-200 p-4 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-6 h-6 text-blue-600" />
          <h1 className="text-lg font-bold text-gray-900">{APP_NAME}</h1>
        </div>
        <div className={`w-3 h-3 rounded-full ${isFirebaseConfigured ? "bg-green-500" : "bg-yellow-500"}`} title={isFirebaseConfigured ? "Online" : "Offline"} />
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col fixed inset-y-0 left-0 z-20">
        <div className="p-6 flex items-center gap-2 border-b border-gray-100">
          <CheckCircle2 className="w-8 h-8 text-blue-600" />
          <h1 className="text-xl font-bold text-gray-900">{APP_NAME}</h1>
        </div>

        <nav className="p-4 space-y-1 flex-1">
          {navLinks.map((link) => (
            <NavLink key={link.to} to={link.to} className={({ isActive }) => getNavLinkClass(isActive, false)}>
              <link.icon className="w-5 h-5" />
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 mt-auto">
          <div className={`text-xs px-3 py-2 rounded-md flex items-center gap-2 ${isFirebaseConfigured ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
            <div className={`w-2 h-2 rounded-full ${isFirebaseConfigured ? "bg-green-500" : "bg-yellow-500"}`} />
            {isFirebaseConfigured ? "Online" : "Offline"}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 pb-24 md:p-8 overflow-x-hidden min-h-[calc(100vh-4rem)] md:min-h-screen">
        <div className="max-w-6xl mx-auto h-full">
          <Outlet />
        </div>
      </main>

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