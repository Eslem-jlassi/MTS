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

// Demo Mode - Bandeau visuel quand le mode démo est actif
import DemoBanner from "./demo/DemoBanner";

// =============================================================================
// COMPOSANTS IMPORTÉS
// =============================================================================

// Layout - Structure commune à toutes les pages protégées (sidebar, header)
import MainLayout from "./components/layout/MainLayout";
import RoleBasedRoute from "./components/auth/RoleBasedRoute";
import { LanguageProvider } from "./context/LanguageContext";
import { UserRole } from "./types";

// Pages - Les différentes vues de l'application
import LoginPage from "./pages/LoginPage";       // Page de connexion
import RegisterPage from "./pages/RegisterPage"; // Page d'inscription
import ForgotPasswordPage from "./pages/ForgotPasswordPage";import ResetPasswordPage from './pages/ResetPasswordPage';
import EmailVerificationPage from './pages/EmailVerificationPage';import Dashboard from "./pages/dashboard";       // Tableau de bord
import TicketList from "./pages/TicketList";     // Liste des tickets
import TicketDetail from "./pages/TicketDetail"; // Détail d'un ticket
import UsersPage from "./pages/UsersPage";       // Gestion des utilisateurs
import ClientsPage from "./pages/ClientsPage";   // Gestion des clients
import ServicesPage from "./pages/ServicesPage"; // Gestion des services télécom
import ReportsPage from "./pages/ReportsPage";   // Gestion des rapports
import IncidentsPage from "./pages/IncidentsPage";
import IncidentDetailPage from "./pages/IncidentDetailPage";
import IncidentNewPage from "./pages/IncidentNewPage";
import AuditLogPage from "./pages/AuditLogPage";
import SlaPage from "./pages/SlaPage";
import TicketsKanbanPage from "./pages/TicketsKanbanPage";
import HealthMonitoringPage from "./pages/HealthMonitoringPage";
import ProfilePage from "./pages/ProfilePage";   // Profil utilisateur
import SettingsPage from "./pages/SettingsPage"; // Paramètres
import NotificationsPage from "./pages/NotificationsPage"; // Notifications
// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Client ID Google OAuth (pour la connexion via Google).
 * Récupéré depuis les variables d'environnement (.env)
 * Si non défini, utilise une chaîne vide (désactive Google OAuth)
 */
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_OAUTH_CLIENT_ID || "";

/**
 * Vérifie si Google OAuth est configuré pour éviter les erreurs CORS
 */
export const isGoogleOAuthEnabled = GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID.includes('.apps.googleusercontent.com');

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
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

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
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

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
  return (
    // OptionalGoogleOAuthProvider: Context provider conditionnel pour l'auth Google
    <OptionalGoogleOAuthProvider>
      <LanguageProvider>
        {/* BrowserRouter: Active le routage HTML5 (URLs propres sans #) */}
        <BrowserRouter>
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
            <Route
              path="/reset-password"
              element={
                <PublicRoute>
                  <ResetPasswordPage />
                </PublicRoute>
              }
            />

            {/* Route de vérification d'email (après inscription) */}
            <Route
              path="/verify-email"
              element={
                <PublicRoute>
                  <EmailVerificationPage />
                </PublicRoute>
              }
            />

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
                  <MainLayout />
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
              {/* <Route path="tickets/:id" element={<TicketDetail />} /> */}

              {/* Health Monitoring - Supervision services */}
              <Route path="health" element={<HealthMonitoringPage />} />

              {/* Gestion Admin - Clients */}
              <Route path="clients" element={<RoleBasedRoute allowedRoles={[UserRole.ADMIN, UserRole.MANAGER]}><ClientsPage /></RoleBasedRoute>} />

              {/* Gestion Admin - Services Télécom */}
              <Route path="services" element={<RoleBasedRoute allowedRoles={[UserRole.ADMIN, UserRole.MANAGER]}><ServicesPage /></RoleBasedRoute>} />

              {/* Gestion Admin - Utilisateurs */}
              <Route path="users" element={<RoleBasedRoute allowedRoles={[UserRole.ADMIN]}><UsersPage /></RoleBasedRoute>} />

              {/* Rapports - Managers */}
              <Route path="reports" element={<RoleBasedRoute allowedRoles={[UserRole.ADMIN, UserRole.MANAGER]}><ReportsPage /></RoleBasedRoute>} />

              {/* Incidents - ITSM */}
              <Route path="incidents" element={<RoleBasedRoute allowedRoles={[UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT]}><IncidentsPage /></RoleBasedRoute>} />
              <Route path="incidents/new" element={<RoleBasedRoute allowedRoles={[UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT]}><IncidentNewPage /></RoleBasedRoute>} />
              <Route path="incidents/:id" element={<RoleBasedRoute allowedRoles={[UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT]}><IncidentDetailPage /></RoleBasedRoute>} />

              {/* SLA & Escalade */}
              <Route path="sla" element={<RoleBasedRoute allowedRoles={[UserRole.ADMIN, UserRole.MANAGER]}><SlaPage /></RoleBasedRoute>} />

              {/* Audit - Admin uniquement */}
              <Route path="audit" element={<RoleBasedRoute allowedRoles={[UserRole.ADMIN]}><AuditLogPage /></RoleBasedRoute>} />

              {/* Profil utilisateur */}
              <Route path="profile" element={<ProfilePage />} />

              {/* Notifications */}
              <Route path="notifications" element={<NotificationsPage />} />

              {/* Paramètres */}
              <Route path="settings" element={<SettingsPage />} />
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
      </LanguageProvider>
    </OptionalGoogleOAuthProvider>
  );
}
