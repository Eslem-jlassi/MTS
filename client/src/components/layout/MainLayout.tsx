// =============================================================================
// MTS TELECOM - Main Layout (Soft AI SaaS, sectioned sidebar + Command Palette)
// Billcom Consulting - PFE 2026
// =============================================================================

import React, { useEffect, useRef, useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  Activity,
  AlertTriangle,
  Building2,
  ChevronDown,
  Clock,
  FileText,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Menu,
  Moon,
  PanelLeft,
  PanelLeftClose,
  ScrollText,
  Search,
  Server,
  Settings,
  Sun,
  Ticket,
  User,
  Users,
  X,
  BookOpen,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "../../context/ThemeContext";
import { RootState, AppDispatch } from "../../redux/store";
import { logout } from "../../redux/slices/authSlice";
import { useWebSocketNotifications } from "../../hooks/useWebSocketNotifications";
import { UserRole, RoleLabels } from "../../types";
import Breadcrumb from "./Breadcrumb";
import CommandPalette from "../command/CommandPalette";
import OnboardingModal from "../auth/OnboardingModal";
import NotificationCenter from "../notifications/NotificationCenter";
import { ChatbotWidget } from "../chatbot";
import { ManagerCopilotWidget } from "../manager-copilot";

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
    title: "General",
    items: [{ name: "Tableau de bord", path: "/dashboard", icon: <LayoutDashboard size={20} /> }],
  },
  {
    title: "Support",
    items: [
      { name: "Tickets", path: "/tickets", icon: <Ticket size={20} /> },
      { name: "Base de connaissances", path: "/knowledge-base", icon: <BookOpen size={20} /> },
      {
        name: "Vue Kanban",
        path: "/tickets/kanban",
        icon: <LayoutGrid size={20} />,
        roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT],
      },
      {
        name: "Incidents",
        path: "/incidents",
        icon: <AlertTriangle size={20} />,
        roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT],
      },
    ],
  },
  {
    title: "Supervision",
    items: [
      {
        name: "SLA & Escalade",
        path: "/sla",
        icon: <Clock size={20} />,
        roles: [UserRole.ADMIN, UserRole.MANAGER],
      },
      {
        name: "Health Monitoring",
        path: "/health",
        icon: <Activity size={20} />,
        roles: [UserRole.ADMIN, UserRole.MANAGER],
      },
      {
        name: "Services",
        path: "/services",
        icon: <Server size={20} />,
        roles: [UserRole.ADMIN, UserRole.MANAGER],
      },
    ],
  },
  {
    title: "Analytics",
    items: [
      {
        name: "Rapports",
        path: "/reports",
        icon: <FileText size={20} />,
        roles: [UserRole.ADMIN, UserRole.MANAGER],
      },
    ],
  },
  {
    title: "Administration",
    items: [
      {
        name: "Clients",
        path: "/clients",
        icon: <Building2 size={20} />,
        roles: [UserRole.ADMIN, UserRole.MANAGER],
      },
      { name: "Utilisateurs", path: "/users", icon: <Users size={20} />, roles: [UserRole.ADMIN] },
      {
        name: "Journal d'audit",
        path: "/audit",
        icon: <ScrollText size={20} />,
        roles: [UserRole.ADMIN],
      },
      { name: "Parametres", path: "/settings", icon: <Settings size={20} /> },
    ],
  },
];

// Source de vérité unique du shell applicatif:
// sidebar + topbar + breadcrumb + outlet de contenu.
// Les pages métier ne doivent PAS réinjecter ces éléments.
const MainLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useTheme();

  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const shouldRenderChatbot = user?.role === UserRole.CLIENT;
  const shouldRenderManagerCopilot =
    user?.role === UserRole.MANAGER || user?.role === UserRole.ADMIN;
  const isDashboardRoute = location.pathname.startsWith("/dashboard");
  const roleLabel = user?.role ? RoleLabels[user.role] : "";

  useWebSocketNotifications(dispatch, Boolean(user));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleGlobalKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "k") {
        event.preventDefault();
        setPaletteOpen((value) => !value);
      }
    };

    window.addEventListener("keydown", handleGlobalKey);
    return () => window.removeEventListener("keydown", handleGlobalKey);
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  const filteredSections = navigationSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (!item.roles) {
          return true;
        }

        return Boolean(user && item.roles.includes(user.role));
      }),
    }))
    .filter((section) => section.items.length > 0);

  const isActive = (path: string) => location.pathname.startsWith(path);
  const sidebarW = sidebarCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_WIDTH;

  const renderBrand = (showCopy: boolean) => (
    <div className="app-sidebar-brand">
      <span className="app-sidebar-brand-mark" aria-hidden />
      {showCopy && (
        <div className="app-sidebar-brand-copy">
          <span className="app-sidebar-brand-title">MTS Telecom</span>
          <span className="app-sidebar-brand-subtitle">Supervision intelligente</span>
        </div>
      )}
    </div>
  );

  const renderNavSections = (collapsed: boolean, onNavigate?: () => void) =>
    filteredSections.map((section, index) => (
      <div
        key={section.title}
        className={`app-sidebar-section ${index > 0 ? "app-sidebar-section-spaced" : ""}`}
      >
        {!collapsed && <p className="app-sidebar-section-title">{section.title}</p>}
        {collapsed && index > 0 && <div className="app-sidebar-divider" />}

        <div className="app-sidebar-section-links space-y-0.5">
          {section.items.map((item) => {
            const active = isActive(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                aria-current={active ? "page" : undefined}
                onClick={onNavigate}
                title={collapsed ? item.name : undefined}
                className={`app-nav-link text-sm font-medium ${active ? "app-nav-link-active" : ""} ${
                  collapsed ? "app-nav-link-collapsed" : ""
                }`}
              >
                <span className="app-nav-icon-shell" aria-hidden>
                  <span className="app-nav-link-icon">{item.icon}</span>
                </span>
                {!collapsed && <span className="app-nav-label">{item.name}</span>}
                {!collapsed && active && <span className="app-nav-active-dot" aria-hidden />}
              </Link>
            );
          })}
        </div>
      </div>
    ));

  return (
    <div className="app-shell min-h-screen bg-ds-page transition-[background-color] duration-300">
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

      <motion.aside
        initial={false}
        animate={{ x: sidebarOpen ? 0 : "-100%" }}
        transition={{ type: "tween", duration: 0.3, ease: "easeInOut" }}
        className="app-sidebar fixed inset-y-0 left-0 z-50 w-[260px] border-r flex flex-col lg:hidden shadow-sidebar"
      >
        <div className="app-sidebar-header flex items-center justify-between h-16 px-4 border-b border-ds-border">
          {renderBrand(true)}
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="app-header-control p-2 text-ds-muted rounded-xl transition-all duration-200"
            aria-label="Fermer le menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="app-sidebar-nav flex-1 mt-4 px-2 overflow-y-auto pb-4">
          {renderNavSections(false, () => setSidebarOpen(false))}
        </nav>
      </motion.aside>

      <motion.aside
        initial={false}
        animate={{ width: sidebarW }}
        transition={{ type: "tween", duration: 0.3, ease: "easeInOut" }}
        className="app-sidebar hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:flex-col border-r z-30 overflow-hidden shadow-sidebar"
      >
        <div className="app-sidebar-header flex items-center justify-between h-16 min-h-[4rem] px-3 border-b border-ds-border flex-shrink-0">
          {!sidebarCollapsed ? renderBrand(true) : renderBrand(false)}
          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="app-sidebar-collapse-button p-2 text-ds-muted rounded-xl transition-all duration-200 flex-shrink-0"
            title={sidebarCollapsed ? "Agrandir le menu" : "Reduire le menu"}
            aria-label={sidebarCollapsed ? "Agrandir le menu" : "Reduire le menu"}
          >
            {sidebarCollapsed ? <PanelLeft size={20} /> : <PanelLeftClose size={20} />}
          </button>
        </div>

        <nav className="app-sidebar-nav flex-1 mt-4 px-2 overflow-y-auto pb-4">
          {renderNavSections(sidebarCollapsed)}
        </nav>

        {!sidebarCollapsed && (
          <div className="app-sidebar-footer flex-shrink-0">
            <div className="app-sidebar-footer-card">
              {roleLabel && <span className="app-role-chip">{roleLabel}</span>}
              <p className="mt-3 text-xs font-medium text-ds-secondary">
                Plateforme de supervision telecom et support client.
              </p>
              <p className="mt-1 text-[11px] text-ds-muted">© 2026 Billcom Consulting</p>
            </div>
          </div>
        )}
      </motion.aside>

      <div
        className={`flex min-h-full flex-1 flex-col transition-[padding] duration-300 ease-in-out ${sidebarCollapsed ? "lg:pl-[72px]" : "lg:pl-[260px]"}`}
      >
        <header className="app-topbar sticky top-0 z-20 h-16 min-h-[4rem] border-b border-ds-border transition-colors duration-300">
          <div className="flex items-center justify-between h-full px-4 sm:px-6 gap-4">
            <button
              type="button"
              className="app-header-control lg:hidden p-2 text-ds-secondary rounded-xl transition-all duration-200"
              onClick={() => setSidebarOpen(true)}
              aria-label="Ouvrir le menu"
            >
              <Menu size={24} />
            </button>

            <div className="flex-1 min-w-0 flex items-center gap-4">
              <button
                type="button"
                onClick={() => setPaletteOpen(true)}
                className="app-topbar-search hidden sm:flex flex-1 max-w-md items-center gap-2 px-3 py-2 rounded-xl text-ds-muted text-sm transition-all duration-200 cursor-pointer"
                aria-label="Recherche rapide (Ctrl+K)"
              >
                <Search size={16} className="flex-shrink-0" />
                <span className="flex-1 text-left">Rechercher...</span>
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
                className="app-header-control p-2 rounded-xl text-ds-secondary transition-all duration-200"
                title={theme === "dark" ? "Mode clair" : "Mode sombre"}
                aria-label={theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
              >
                {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
              </button>

              <NotificationCenter />

              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="app-profile-trigger flex items-center gap-2 sm:gap-2.5 p-2 rounded-xl transition-all duration-200"
                >
                  <div className="app-user-avatar w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                    {user?.profilePhotoUrl ? (
                      <img
                        src={user.profilePhotoUrl}
                        alt={user.fullName}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <User size={16} />
                    )}
                  </div>
                  <div className="hidden md:block text-left">
                    <div className="text-sm font-medium text-ds-primary">
                      {user?.fullName || "Utilisateur"}
                    </div>
                    <div className="text-xs text-ds-secondary">{roleLabel}</div>
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
                      className="app-user-menu-panel absolute right-0 mt-2 w-56 rounded-2xl border border-ds-border py-1 z-50"
                    >
                      <div className="px-4 py-3 border-b border-ds-border">
                        <p className="text-xs font-medium text-ds-muted uppercase tracking-wider">
                          Role
                        </p>
                        <p className="mt-1 text-sm font-semibold text-ds-primary">{roleLabel}</p>
                      </div>

                      <Link
                        to="/profile"
                        onClick={() => setUserMenuOpen(false)}
                        className="app-dropdown-link flex items-center gap-2 px-4 py-2.5 text-sm text-ds-secondary transition-colors"
                      >
                        <User size={16} /> Mon profil
                      </Link>
                      <Link
                        to="/settings"
                        onClick={() => setUserMenuOpen(false)}
                        className="app-dropdown-link flex items-center gap-2 px-4 py-2.5 text-sm text-ds-secondary transition-colors"
                      >
                        <Settings size={16} /> Parametres
                      </Link>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="app-dropdown-link app-dropdown-link-danger w-full flex items-center gap-2 px-4 py-2.5 text-sm text-error-500 text-left rounded-b-xl transition-colors"
                      >
                        <LogOut size={16} /> Deconnexion
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 min-h-0 p-6 sm:p-8 bg-ds-page transition-colors duration-300">
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

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        userRole={user?.role}
      />

      {user && <OnboardingModal userRole={user.role} userId={user.id} />}

      {shouldRenderManagerCopilot && !isDashboardRoute && (
        <ManagerCopilotWidget role={user?.role} />
      )}
      {shouldRenderChatbot && <ChatbotWidget />}
    </div>
  );
};

export default MainLayout;
