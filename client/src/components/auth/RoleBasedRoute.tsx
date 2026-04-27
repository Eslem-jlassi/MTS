/**
 * ============================================================================
 * COMPOSANT: RoleBasedRoute
 * ============================================================================
 *
 * OBJECTIF:
 * Ce composant permet de protéger les routes en fonction du rôle de l'utilisateur.
 * Il vérifie si l'utilisateur connecté a le rôle requis pour accéder à une page.
 *
 * FONCTIONNEMENT:
 * 1. Récupère l'utilisateur connecté depuis Redux
 * 2. Vérifie si le rôle de l'utilisateur est dans la liste des rôles autorisés
 * 3. Si OUI → Affiche la page demandée (children)
 * 4. Si NON → Redirige vers une page d'erreur ou le dashboard
 *
 * UTILISATION DANS App.tsx:
 * <Route
 *   path="/admin"
 *   element={
 *     <RoleBasedRoute allowedRoles={[UserRole.ADMIN, UserRole.MANAGER]}>
 *       <AdminPage />
 *     </RoleBasedRoute>
 *   }
 * />
 *
 * ============================================================================
 */

import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAppSelector } from "../../hooks/useAppSelector";
import { UserRole } from "../../types";

// =============================================================================
// INTERFACES ET TYPES
// =============================================================================

/**
 * Props du composant RoleBasedRoute
 *
 * @property children - Le contenu à afficher si l'utilisateur a le bon rôle
 * @property allowedRoles - Liste des rôles autorisés à accéder à cette route
 * @property fallbackPath - Chemin de redirection si non autorisé (par défaut: /dashboard)
 * @property showError - Si true, affiche un message d'erreur au lieu de rediriger
 */
interface RoleBasedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  fallbackPath?: string;
  showError?: boolean;
}

// =============================================================================
// COMPOSANT PRINCIPAL
// =============================================================================

/**
 * RoleBasedRoute - Composant de protection des routes par rôle
 *
 * Ce composant wrap les routes qui nécessitent un rôle spécifique.
 * Il utilise le pattern "Higher Order Component" (HOC) simplifié.
 */
const RoleBasedRoute: React.FC<RoleBasedRouteProps> = ({
  children,
  allowedRoles,
  fallbackPath = "/dashboard",
  showError = false,
}) => {
  // ============================================
  // RÉCUPÉRATION DES DONNÉES DEPUIS REDUX
  // ============================================

  /**
   * useAppSelector: Hook personnalisé pour accéder au store Redux typé
   * On récupère ici l'utilisateur connecté et l'état d'authentification
   */
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);

  /**
   * useLocation: Hook de React Router pour connaître l'URL actuelle
   * Utile pour rediriger vers la bonne page après connexion
   */
  const location = useLocation();

  // ============================================
  // VÉRIFICATION DE L'AUTHENTIFICATION
  // ============================================

  /**
   * Si l'utilisateur n'est pas connecté, on le redirige vers la page de login
   * On sauvegarde l'URL actuelle dans "state" pour y revenir après connexion
   */
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // ============================================
  // VÉRIFICATION DU RÔLE
  // ============================================

  /**
   * On récupère le rôle de l'utilisateur depuis ses données
   * Par défaut, on considère le rôle CLIENT si non défini
   */
  const userRole = user.role || UserRole.CLIENT;

  /**
   * Vérifie si le rôle de l'utilisateur est dans la liste des rôles autorisés
   * La méthode includes() recherche si l'élément existe dans le tableau
   */
  const hasRequiredRole = allowedRoles.includes(userRole);

  // ============================================
  // GESTION DU NON-ACCÈS
  // ============================================

  if (!hasRequiredRole) {
    /**
     * Si showError est true, on affiche un message d'erreur stylisé
     * Sinon, on redirige silencieusement vers le fallbackPath
     */
    if (showError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-ds-page">
          <div className="bg-ds-card rounded-xl shadow-md p-8 max-w-md text-center">
            {/* Icône d'erreur */}
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            {/* Message d'erreur */}
            <h2 className="text-xl font-bold text-ds-primary mb-2">Accès refusé</h2>
            <p className="text-ds-secondary mb-6">
              Vous n'avez pas les permissions nécessaires pour accéder à cette page.
              <br />
              <span className="text-sm text-ds-muted">Rôle requis: {allowedRoles.join(", ")}</span>
            </p>

            {/* Bouton retour */}
            <button
              onClick={() => window.history.back()}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Retour
            </button>
          </div>
        </div>
      );
    }

    /**
     * Redirection silencieuse vers le fallbackPath
     * "replace" évite d'ajouter l'URL dans l'historique
     */
    return <Navigate to={fallbackPath} replace />;
  }

  // ============================================
  // RENDU DU CONTENU PROTÉGÉ
  // ============================================

  /**
   * Si toutes les vérifications passent, on affiche le contenu protégé
   * Le fragment <></> permet de retourner children sans wrapper supplémentaire
   */
  return <>{children}</>;
};

// =============================================================================
// COMPOSANTS UTILITAIRES PRÉ-CONFIGURÉS
// =============================================================================

/**
 * AdminOnlyRoute - Raccourci pour les pages admin uniquement
 *
 * Usage: <AdminOnlyRoute><AdminPage /></AdminOnlyRoute>
 */
export const AdminOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <RoleBasedRoute allowedRoles={[UserRole.ADMIN]} showError>
    {children}
  </RoleBasedRoute>
);

/**
 * ManagerRoute - Accès pour Manager et Admin
 *
 * Usage: <ManagerRoute><ReportsPage /></ManagerRoute>
 */
export const ManagerRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <RoleBasedRoute allowedRoles={[UserRole.ADMIN, UserRole.MANAGER]} showError>
    {children}
  </RoleBasedRoute>
);

/**
 * AgentRoute - Accès pour Agent, Manager et Admin
 *
 * Usage: <AgentRoute><TicketAssignmentPage /></AgentRoute>
 */
export const AgentRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <RoleBasedRoute allowedRoles={[UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT]} showError>
    {children}
  </RoleBasedRoute>
);

/**
 * ClientRoute - Accès pour tous les utilisateurs authentifiés
 *
 * Usage: <ClientRoute><MyTicketsPage /></ClientRoute>
 */
export const ClientRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <RoleBasedRoute
    allowedRoles={[UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT, UserRole.CLIENT]}
  >
    {children}
  </RoleBasedRoute>
);

// Export par défaut du composant principal
export default RoleBasedRoute;
