// =============================================================================
// MTS TELECOM - Main Layout (Soft AI SaaS, sectioned sidebar + Command Palette)
// Billcom Consulting - PFE 2026
// =============================================================================

import React, { useState, useEffect, useRef } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  LayoutDashboard,
  Ticket,
  Users,
  Building2,
  Server,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  User,
  ChevronDown,
  FileText,
  CheckCheck,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeft,
  Search,
  AlertTriangle,
  Clock,
  ScrollText,
  LayoutGrid,
  Activity,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../../context/ThemeContext";
import { RootState, AppDispatch } from "../../redux/store";
import { logout, fetchCurrentUser } from "../../redux/slices/authSlice";
import {
  fetchUnreadCount,
  fetchUnreadNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../../redux/slices/notificationsSlice";
import { useWebSocketNotifications } from "../../hooks/useWebSocketNotifications";
import { UserRole, RoleLabels } from "../../types";
import Breadcrumb from "./Breadcrumb";
import CommandPalette from "../command/CommandPalette";
import OnboardingModal from "../auth/OnboardingModal";
import NotificationCenter from "../notifications/NotificationCenter";

// ---------------------------------------------------------------------------
// Navigation model — grouped by section with RBAC
// ---------------------------------------------------------------------------
interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  roles?: UserRole[];
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const SIDEBAR_WIDTH = 260;
const SIDEBAR_COLLAPSED = 72;

const navigationSections: NavSection[] = [
  {
    title: "Général",
    items: [
      { name: "Tableau de bord", path: "/dashboard", icon: <LayoutDashboard size={20} /> },
    ],
  },
  {
    title: "Support",
    items: [
      { name: "Tickets", path: "/tickets", icon: <Ticket size={20} /> },
      { name: "Vue Kanban", path: "/tickets/kanban", icon: <LayoutGrid size={20} />, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT] },
      { name: "Incidents", path: "/incidents", icon: <AlertTriangle size={20} />, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT] },
    ],
  },
  {
    title: "Supervision",
    items: [
      { name: "SLA & Escalade", path: "/sla", icon: <Clock size={20} />, roles: [UserRole.ADMIN, UserRole.MANAGER] },
      { name: "Health Monitoring", path: "/health", icon: <Activity size={20} />, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT] },
      { name: "Services", path: "/services", icon: <Server size={20} />, roles: [UserRole.ADMIN, UserRole.MANAGER] },
    ],
  },
  {
    title: "Analytics",
    items: [
      { name: "Rapports", path: "/reports", icon: <FileText size={20} />, roles: [UserRole.ADMIN, UserRole.MANAGER] },
    ],
  },
  {
    title: "Administration",
    items: [
      { name: "Clients", path: "/clients", icon: <Building2 size={20} />, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT] },
      { name: "Utilisateurs", path: "/users", icon: <Users size={20} />, roles: [UserRole.ADMIN] },
      { name: "Journal d'audit", path: "/audit", icon: <ScrollText size={20} />, roles: [UserRole.ADMIN] },
      { name: "Paramètres", path: "/settings", icon: <Settings size={20} /> },
    ],
  },
];

const MainLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const notificationsPanelRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useTheme();

  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { list: notifications, unreadCount, isLoading: notificationsLoading } = useSelector(
    (state: RootState) => state.notifications
  );
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (token) dispatch(fetchCurrentUser());
  }, [dispatch, token]);
  useEffect(() => {
    if (user) dispatch(fetchUnreadCount());
  }, [dispatch, user]);
  useWebSocketNotifications(dispatch, token);
  useEffect(() => {
    if (notificationsOpen) dispatch(fetchUnreadNotifications());
  }, [dispatch, notificationsOpen]);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (notificationsPanelRef.current && !notificationsPanelRef.current.contains(target)) setNotificationsOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(target)) setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Global Ctrl+K / Cmd+K shortcut for Command Palette
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handleGlobalKey);
    return () => window.removeEventListener("keydown", handleGlobalKey);
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  // RBAC filter — remove entire sections if empty after filtering
  const filteredSections = navigationSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (!item.roles) return true;
        return user && item.roles.includes(user.role);
      }),
    }))
    .filter((section) => section.items.length > 0);

  const isActive = (path: string) => location.pathname.startsWith(path);

  const sidebarW = sidebarCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_WIDTH;

  // ---------------------------------------------------------------------------
  // Sidebar nav renderer — shared between mobile & desktop
  // ---------------------------------------------------------------------------
  const renderNavSections = (collapsed: boolean, onNavigate?: () => void) =>
    filteredSections.map((section, idx) => (
      <div key={section.title} className={idx > 0 ? "mt-4" : ""}>
        {!collapsed && (
          <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-ds-muted/60">
            {section.title}
          </p>
        )}
        {collapsed && idx > 0 && <div className="mx-3 mb-2 border-t border-ds-border" />}
        <div className="space-y-0.5">
          {section.items.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              title={collapsed ? item.name : undefined}
              className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                isActive(item.path)
                  ? "bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-300 shadow-sm"
                  : "text-ds-secondary hover:bg-ds-elevated hover:text-ds-primary"
              } ${collapsed ? "justify-center" : ""}`}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {!collapsed && <span className="ml-3 truncate">{item.name}</span>}
            </Link>
          ))}
        </div>
      </div>
    ));

  return (
    <div className="min-h-screen bg-ds-page transition-[background-color] duration-300">
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar mobile */}
      <motion.aside
        initial={false}
        animate={{ x: sidebarOpen ? 0 : "-100%" }}
        transition={{ type: "tween", duration: 0.3, ease: "easeInOut" }}
        className="fixed inset-y-0 left-0 z-50 w-[260px] bg-white dark:bg-[rgb(var(--sidebar-bg))] border-r border-ds-border flex flex-col lg:hidden shadow-sidebar"
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-ds-border">
          <span className="text-lg font-semibold text-ds-primary tracking-tight">MTS Telecom</span>
          <button type="button" onClick={() => setSidebarOpen(false)} className="p-2 text-ds-muted hover:text-ds-primary rounded-xl hover:bg-ds-elevated transition-all duration-200" aria-label="Fermer le menu">
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 mt-4 px-2 overflow-y-auto pb-4">
          {renderNavSections(false, () => setSidebarOpen(false))}
        </nav>
      </motion.aside>

      {/* Sidebar desktop */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarW }}
        transition={{ type: "tween", duration: 0.3, ease: "easeInOut" }}
        className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:flex-col bg-white dark:bg-[rgb(var(--sidebar-bg))] border-r border-ds-border z-30 overflow-hidden shadow-sidebar"
      >
        <div className="flex items-center justify-between h-16 min-h-[4rem] px-3 border-b border-ds-border flex-shrink-0">
          {!sidebarCollapsed && (
            <span className="text-lg font-semibold text-ds-primary truncate pl-1 tracking-tight">MTS Telecom</span>
          )}
          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 text-ds-muted hover:text-ds-primary hover:bg-ds-elevated rounded-xl transition-all duration-200 flex-shrink-0"
            title={sidebarCollapsed ? "Agrandir le menu" : "Réduire le menu"}
            aria-label={sidebarCollapsed ? "Agrandir le menu" : "Réduire le menu"}
          >
            {sidebarCollapsed ? <PanelLeft size={20} /> : <PanelLeftClose size={20} />}
          </button>
        </div>
        <nav className="flex-1 mt-4 px-2 overflow-y-auto pb-4">
          {renderNavSections(sidebarCollapsed)}
        </nav>
        {!sidebarCollapsed && (
          <div className="p-3 border-t border-ds-border flex-shrink-0">
            <p className="text-xs text-ds-muted/50">© 2026 Billcom Consulting</p>
          </div>
        )}
      </motion.aside>

      {/* Main content area */}
      <div
        className={`flex flex-col min-h-screen transition-[padding] duration-300 ease-in-out ${sidebarCollapsed ? "lg:pl-[72px]" : "lg:pl-[260px]"}`}
      >
        {/* Topbar - search, notifications, profile */}
        <header className="sticky top-0 z-20 h-16 min-h-[4rem] bg-ds-card/95 backdrop-blur-md border-b border-ds-border shadow-soft transition-colors duration-300">
          <div className="flex items-center justify-between h-full px-4 sm:px-6 gap-4">
            <button
              type="button"
              className="lg:hidden p-2 text-ds-secondary hover:text-ds-primary rounded-xl hover:bg-ds-elevated transition-all duration-200"
              onClick={() => setSidebarOpen(true)}
              aria-label="Ouvrir le menu"
            >
              <Menu size={24} />
            </button>
            <div className="flex-1 min-w-0 flex items-center gap-4">
              <button
                type="button"
                onClick={() => setPaletteOpen(true)}
                className="hidden sm:flex flex-1 max-w-md items-center gap-2 px-3 py-2 rounded-xl border border-ds-border bg-ds-surface text-ds-muted text-sm hover:border-primary-300 dark:hover:border-primary-700 hover:bg-ds-elevated transition-all duration-200 cursor-pointer"
                aria-label="Recherche rapide (Ctrl+K)"
              >
                <Search size={16} className="flex-shrink-0" />
                <span className="flex-1 text-left">Rechercher…</span>
                <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium bg-ds-elevated border border-ds-border rounded-md">
                  Ctrl+K
                </kbd>
              </button>
              <Breadcrumb />
            </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={toggleTheme}
                className="p-2 rounded-xl text-ds-secondary hover:text-ds-primary hover:bg-ds-elevated transition-all duration-200"
                title={theme === "dark" ? "Mode clair" : "Mode sombre"}
                aria-label={theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
              >
                {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
              </button>

              {/* NotificationCenter - nouveau component avec dropdown */}
              <NotificationCenter />

              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 sm:gap-2.5 p-2 rounded-xl hover:bg-ds-elevated transition-all duration-200"
                >
                  <div className="w-8 h-8 bg-primary-50 border border-primary-200/50 rounded-full flex items-center justify-center flex-shrink-0 text-primary-600 dark:bg-primary-900/40 dark:border-primary-700/30 dark:text-primary-300">
                    {user?.profilePhotoUrl ? (
                      <img src={user.profilePhotoUrl} alt={user.fullName} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <User size={16} />
                    )}
                  </div>
                  <div className="hidden md:block text-left">
                    <div className="text-sm font-medium text-ds-primary">{user?.fullName || "Utilisateur"}</div>
                    <div className="text-xs text-ds-secondary">{user?.role ? RoleLabels[user.role] : ""}</div>
                  </div>
                  <ChevronDown size={16} className="text-ds-muted flex-shrink-0" />
                </button>
                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-2 w-56 bg-ds-card rounded-2xl shadow-dropdown border border-ds-border py-1 z-50"
                    >
                      <div className="px-4 py-2 border-b border-ds-border">
                        <p className="text-xs font-medium text-ds-muted uppercase tracking-wider">Rôle</p>
                        <p className="text-sm font-semibold text-ds-primary">{user?.role ? RoleLabels[user.role] : ""}</p>
                      </div>
                      <Link to="/profile" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-ds-secondary hover:bg-ds-elevated hover:text-ds-primary transition-colors">
                        <User size={16} /> Mon profil
                      </Link>
                      <Link to="/settings" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-ds-secondary hover:bg-ds-elevated hover:text-ds-primary transition-colors">
                        <Settings size={16} /> Paramètres
                      </Link>
                      <button type="button" onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10 text-left rounded-b-xl transition-colors">
                        <LogOut size={16} /> Déconnexion
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 sm:p-8 bg-ds-page transition-colors duration-300">
          <div className="mx-auto max-w-7xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Command Palette */}
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        userRole={user?.role}
      />

      {/* Onboarding Modal — s'affiche une seule fois après le premier login */}
      {user && (
        <OnboardingModal
          userRole={user.role}
          userId={user.id}
        />
      )}
    </div>
  );
};

export default MainLayout;
