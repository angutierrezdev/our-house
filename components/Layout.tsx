import React from "react";
import { Outlet, NavLink } from "react-router-dom";
import { LayoutDashboard, Kanban, Users, CheckCircle2 } from "lucide-react";
import { ROUTES, APP_NAME } from "../constants";
import { isFirebaseConfigured } from "../firebase";

const Layout: React.FC = () => {
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
      isActive
        ? "bg-blue-100 text-blue-700 font-medium"
        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
    }`;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-gray-200 flex-shrink-0">
        <div className="p-6 flex items-center gap-2 border-b border-gray-100">
          <CheckCircle2 className="w-8 h-8 text-blue-600" />
          <h1 className="text-xl font-bold text-gray-900">{APP_NAME}</h1>
        </div>

        <nav className="p-4 space-y-1">
          <NavLink to={ROUTES.DASHBOARD} className={navClass}>
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </NavLink>
          <NavLink to={ROUTES.KANBAN} className={navClass}>
            <Kanban className="w-5 h-5" />
            Kanban Board
          </NavLink>
          <NavLink to={ROUTES.PEOPLE} className={navClass}>
            <Users className="w-5 h-5" />
            People
          </NavLink>
        </nav>

        <div className="p-4 mt-auto">
          <div className={`text-xs px-3 py-2 rounded-md ${isFirebaseConfigured ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
            Mode: {isFirebaseConfigured ? "Firebase (Online)" : "Local Storage (Offline)"}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;