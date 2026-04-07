// =============================================================================
// MTS TELECOM SUPERVISION SYSTEM - Point d'entrée de l'application React
// Billcom Consulting - PFE 2026
// =============================================================================
/**
 * ============================================================================
 * App.tsx - Composant racine de l'application React
 * ============================================================================
 *
 * RÔLE DE CE FICHIER:
 * C'est le composant principal qui structure toute l'application.
 * Il définit:
 * - Le système de routage (navigation entre les pages)
 * - La protection des routes (authentification requise)
 * - La structure globale (layout, providers)
 *
 * ARCHITECTURE:
 * index.tsx → App.tsx → Routes → Pages
 *                     → MainLayout → Outlet (contenu des pages)
 *
 * CONCEPTS CLÉS:
 * - React Router: Bibliothèque de routage pour les SPA (Single Page Applications)
 * - Protected Routes: Routes accessibles uniquement si connecté
 * - Public Routes: Routes accessibles uniquement si NON connecté
 * - Nested Routes: Routes imbriquées dans un layout commun
 *
 * ============================================================================
 */

// =============================================================================
// IMPORTS
// =============================================================================

// React Router - Gestion de la navigation
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
// - BrowserRouter: Provider qui active le routage dans l'app
// - Navigate: Composant pour rediriger vers une autre route
// - Route: Définit une route (chemin → composant)
// - Routes: Conteneur pour les Route

// Redux - Accès au state global (pour vérifier l'authentification)
import { useSelector } from "react-redux";
import { RootState } from "./redux/store";

// Google OAuth - Authentification via Google (optionnel)
import { GoogleOAuthProvider } from "@react-oauth/google";
import { googleOAuthConfig } from "./config/googleOAuthConfig";

// Demo Mode - Bandeau visuel quand le mode démo est actif
import DemoBanner from "./demo/DemoBanner";

// =============================================================================
// COMPOSANTS IMPORTÉS
// =============================================================================

// Layout - Structure commune à toutes les pages protégées (sidebar, header)
import MainLayout from "./components/layout/MainLayout";
import RoleBasedRoute from "./components/auth/RoleBasedRoute";
import { LanguageProvider } from "./context/LanguageContext";
import { ToastProvider } from "./context/ToastContext";
import { UserRole } from "./types";

// Pages - Les différentes vues de l'application
import LoginPage from "./pages/LoginPage"; // Page de connexion
import RegisterPage from "./pages/RegisterPage"; // Page d'inscription
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import EmailVerificationPage from "./pages/EmailVerificationPage";
import Dashboard from "./pages/dashboard"; // Tableau de bord
import TicketList from "./pages/TicketList"; // Liste des tickets
import UsersPage from "./pages/UsersPage"; // Gestion des utilisateurs
import ClientsPage from "./pages/ClientsPage"; // Gestion des clients
import ServicesPage from "./pages/ServicesPage"; // Gestion des services télécom
import ReportsPage from "./pages/ReportsPage"; // Gestion des rapports
import IncidentsPage from "./pages/IncidentsPage";
import IncidentDetailPage from "./pages/IncidentDetailPage";
import IncidentNewPage from "./pages/IncidentNewPage";
import AuditLogPage from "./pages/AuditLogPage";
import SlaPage from "./pages/SlaPage";
import TicketsKanbanPage from "./pages/TicketsKanbanPage";
import HealthMonitoringPage from "./pages/HealthMonitoringPage";
import ProfilePage from "./pages/ProfilePage"; // Profil utilisateur
import SettingsPage from "./pages/SettingsPage"; // Paramètres
import NotificationsPage from "./pages/NotificationsPage"; // Notifications
import KnowledgeBasePage from "./pages/KnowledgeBasePage"; // Base de connaissances
// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Client ID Google OAuth (pour la connexion via Google).
 * Récupéré depuis les variables d'environnement (.env)
 * Si non défini, utilise une chaîne vide (désactive Google OAuth)
 */
const GOOGLE_CLIENT_ID = googleOAuthConfig.clientId;
const GOOGLE_OAUTH_ENABLED_FLAG = googleOAuthConfig.isEnabled;
const GOOGLE_OAUTH_ALLOWED_ORIGINS = googleOAuthConfig.allowedOrigins;

const isCurrentOriginAllowedForGoogleOAuth = (() => {
  if (typeof window === "undefined") return true;
  if (GOOGLE_OAUTH_ALLOWED_ORIGINS.length === 0) return true;
  return googleOAuthConfig.reason !== "origin-not-allowed";
})();

/**
 * Vérifie si Google OAuth est configuré pour éviter les erreurs CORS
 */
export const isGoogleOAuthEnabled =
  GOOGLE_OAUTH_ENABLED_FLAG && Boolean(GOOGLE_CLIENT_ID) && isCurrentOriginAllowedForGoogleOAuth;

// =============================================================================
// COMPOSANT: OptionalGoogleOAuthProvider - Wrapper conditionnel pour Google OAuth
// =============================================================================
/**
 * Wrapper qui active Google OAuth seulement si correctement configuré
 */
const OptionalGoogleOAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (isGoogleOAuthEnabled) {
    return <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>{children}</GoogleOAuthProvider>;
  }
  return <>{children}</>;
};

// =============================================================================
// COMPOSANT: ProtectedRoute - Protection des routes authentifiées
// =============================================================================
/**
 * Composant qui protège les routes nécessitant une authentification.
 *
 * FONCTIONNEMENT:
 * 1. Vérifie si l'utilisateur est connecté (isAuthenticated)
 * 2. Si NON → Redirige vers /login
 * 3. Si OUI → Affiche le contenu (children)
 *
 * UTILISATION:
 * <ProtectedRoute>
 *   <Dashboard />
 * </ProtectedRoute>
 *
 * @param children - Le contenu à afficher si authentifié
 */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // useSelector: Hook Redux pour lire le state global
  // On récupère isAuthenticated depuis le slice auth
  const { isAuthenticated, isInitialized } = useSelector((state: RootState) => state.auth);

  if (!isInitialized) {
    return <div className="min-h-screen bg-ds-page" />;
  }

  // Si pas authentifié, on redirige vers login
  // "replace" évite d'ajouter l'URL actuelle dans l'historique
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Si authentifié, on affiche le contenu
  // <></> est un Fragment React (pas de div supplémentaire dans le DOM)
  return <>{children}</>;
};

// =============================================================================
// COMPOSANT: PublicRoute - Routes publiques (login, register)
// =============================================================================
/**
 * Composant pour les routes accessibles uniquement aux utilisateurs NON connectés.
 *
 * FONCTIONNEMENT:
 * 1. Vérifie si l'utilisateur est connecté
 * 2. Si OUI → Redirige vers /dashboard (déjà connecté, pas besoin de login)
 * 3. Si NON → Affiche le contenu (login/register)
 *
 * UTILISATION:
 * <PublicRoute>
 *   <LoginPage />
 * </PublicRoute>
 */
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isInitialized } = useSelector((state: RootState) => state.auth);

  if (!isInitialized) {
    return <div className="min-h-screen bg-ds-page" />;
  }

  // Si déjà connecté, on redirige vers le dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// =============================================================================
// COMPOSANT PRINCIPAL: App
// =============================================================================
/**
 * Composant racine de l'application.
 *
 * STRUCTURE DES ROUTES:
 *
 * /login          → PublicRoute → LoginPage
 * /register       → PublicRoute → RegisterPage
 *
 * /               → ProtectedRoute → MainLayout
 *   /dashboard    →                    Dashboard
 *   /tickets      →                    TicketList
 *   /tickets/:id  →                    TicketList (détail)
 *   /users        →                    UsersPage
 *   ...
 *
 * *               → Redirect vers /
 */
export default function App() {
  // Source de vérité unique du shell applicatif (sidebar + topbar + breadcrumb + outlet)
  const AppShellLayout = MainLayout;

  return (
    // OptionalGoogleOAuthProvider: Context provider conditionnel pour l'auth Google
    <OptionalGoogleOAuthProvider>
      <LanguageProvider>
        <ToastProvider>
          {/* BrowserRouter: Active le routage HTML5 (URLs propres sans #) */}
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            {/* Bandeau démo (affiché uniquement si DEMO_MODE_ACTIVE) */}
            <DemoBanner />
            {/* Routes: Conteneur de toutes les routes */}
            <Routes>
              {/* ================================================================ */}
              {/* ROUTES PUBLIQUES - Accessibles sans authentification */}
              {/* ================================================================ */}

              {/* Route de connexion */}
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <LoginPage />
                  </PublicRoute>
                }
              />

              {/* Route d'inscription */}
              <Route
                path="/register"
                element={
                  <PublicRoute>
                    <RegisterPage />
                  </PublicRoute>
                }
              />

              {/* Route de mot de passe oublié */}
              <Route
                path="/forgot-password"
                element={
                  <PublicRoute>
                    <ForgotPasswordPage />
                  </PublicRoute>
                }
              />

              {/* Route de réinitialisation de mot de passe (avec token) */}
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              {/* Route de vérification d'email (après inscription) */}
              <Route path="/verify-email" element={<EmailVerificationPage />} />

              {/* ================================================================ */}
              {/* ROUTES PROTÉGÉES - Nécessitent une authentification */}
              {/* ================================================================ */}

              {/* 
          Route parente avec MainLayout.
          Les routes enfants seront affichées dans <Outlet /> du MainLayout.
          C'est le pattern "Nested Routes" de React Router v6.
        */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <AppShellLayout />
                  </ProtectedRoute>
                }
              >
                {/* 
            Route "index": S'affiche quand on accède à "/" exactement.
            Redirige vers /dashboard.
          */}
                <Route index element={<Navigate to="/dashboard" replace />} />

                {/* Tableau de bord principal */}
                <Route path="dashboard" element={<Dashboard />} />

                {/* Liste des tickets (Enterprise) */}
                <Route path="tickets" element={<TicketList />} />
                {/* Vue Kanban pour agents */}
                <Route path="tickets/kanban" element={<TicketsKanbanPage />} />

                {/* Création d'un nouveau ticket (avant :id pour éviter le conflit) */}
                <Route path="tickets/new" element={<TicketList />} />

                {/* Détail d'un ticket en Drawer (Enterprise) — handled by TicketList overlay */}
                <Route path="tickets/:id" element={<TicketList />} />

                {/* Health Monitoring - Supervision services */}
                <Route
                  path="health"
                  element={
                    <RoleBasedRoute allowedRoles={[UserRole.ADMIN, UserRole.MANAGER]}>
                      <HealthMonitoringPage />
                    </RoleBasedRoute>
                  }
                />

                {/* Gestion Admin - Clients */}
                <Route
                  path="clients"
                  element={
                    <RoleBasedRoute allowedRoles={[UserRole.ADMIN, UserRole.MANAGER]}>
                      <ClientsPage />
                    </RoleBasedRoute>
                  }
                />

                {/* Gestion Admin - Services Télécom */}
                <Route
                  path="services"
                  element={
                    <RoleBasedRoute allowedRoles={[UserRole.ADMIN, UserRole.MANAGER]}>
                      <ServicesPage />
                    </RoleBasedRoute>
                  }
                />

                {/* Gestion Admin - Utilisateurs */}
                <Route
                  path="users"
                  element={
                    <RoleBasedRoute allowedRoles={[UserRole.ADMIN]}>
                      <UsersPage />
                    </RoleBasedRoute>
                  }
                />

                {/* Rapports - Managers */}
                <Route
                  path="reports"
                  element={
                    <RoleBasedRoute allowedRoles={[UserRole.ADMIN, UserRole.MANAGER]}>
                      <ReportsPage />
                    </RoleBasedRoute>
                  }
                />

                {/* Incidents - ITSM */}
                <Route
                  path="incidents"
                  element={
                    <RoleBasedRoute
                      allowedRoles={[UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT]}
                    >
                      <IncidentsPage />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="incidents/new"
                  element={
                    <RoleBasedRoute
                      allowedRoles={[UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT]}
                    >
                      <IncidentNewPage />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="incidents/:id"
                  element={
                    <RoleBasedRoute
                      allowedRoles={[UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT]}
                    >
                      <IncidentDetailPage />
                    </RoleBasedRoute>
                  }
                />

                {/* SLA & Escalade */}
                <Route
                  path="sla"
                  element={
                    <RoleBasedRoute allowedRoles={[UserRole.ADMIN, UserRole.MANAGER]}>
                      <SlaPage />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="sla-policies"
                  element={
                    <RoleBasedRoute allowedRoles={[UserRole.ADMIN, UserRole.MANAGER]}>
                      <Navigate to="/sla" replace />
                    </RoleBasedRoute>
                  }
                />

                {/* Legacy admin shortcuts kept for backward compatibility */}
                <Route
                  path="categories"
                  element={
                    <RoleBasedRoute allowedRoles={[UserRole.ADMIN, UserRole.MANAGER]}>
                      <Navigate to="/services" replace />
                    </RoleBasedRoute>
                  }
                />

                {/* Audit - Admin uniquement */}
                <Route
                  path="audit"
                  element={
                    <RoleBasedRoute allowedRoles={[UserRole.ADMIN]}>
                      <AuditLogPage />
                    </RoleBasedRoute>
                  }
                />

                {/* Profil utilisateur */}
                <Route path="profile" element={<ProfilePage />} />

                {/* Notifications */}
                <Route path="notifications" element={<NotificationsPage />} />

                {/* Paramètres */}
                <Route path="settings" element={<SettingsPage />} />

                {/* Base de connaissances */}
                <Route path="knowledge-base" element={<KnowledgeBasePage />} />
              </Route>

              {/* ================================================================ */}
              {/* ROUTE CATCH-ALL - Capture toutes les URLs non reconnues */}
              {/* ================================================================ */}

              {/* 
          path="*" capture toutes les routes non définies.
          Redirige vers "/" qui elle-même redirige vers /dashboard ou /login.
        */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </LanguageProvider>
    </OptionalGoogleOAuthProvider>
  );
}
