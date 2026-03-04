// =============================================================================
// MTS TELECOM - Hook personnalisé pour sélectionner le state Redux
// =============================================================================
/**
 * ============================================================================
 * useAppSelector.ts - Hook typé pour lire le state Redux
 * ============================================================================
 * 
 * POURQUOI CE HOOK?
 * -----------------
 * Par défaut, useSelector de React-Redux n'est pas typé pour notre app.
 * Ce hook ajoute le typage de notre RootState.
 * 
 * SANS CE HOOK:
 * const user = useSelector((state) => state.auth.user);
 * // state est de type any, pas d'autocomplétion
 * 
 * AVEC CE HOOK:
 * const user = useAppSelector((state) => state.auth.user);
 * // state est de type RootState, autocomplétion complète!
 * 
 * UTILISATION:
 * Dans un composant React:
 * 
 * import { useAppSelector } from './hooks/useAppSelector';
 * 
 * function MyComponent() {
 *   // Lire une valeur du state
 *   const user = useAppSelector((state) => state.auth.user);
 *   const tickets = useAppSelector((state) => state.tickets.tickets);
 *   
 *   return <div>{user?.fullName}</div>;
 * }
 * 
 * ============================================================================
 */

import { useSelector } from 'react-redux'
import type { RootState } from '../redux/store';

/**
 * Hook useAppSelector typé.
 * 
 * withTypes<RootState>() crée une version typée du hook useSelector.
 * 
 * RootState est défini dans store.ts:
 * export type RootState = ReturnType<typeof store.getState>;
 * 
 * Cela représente la forme complète du state Redux:
 * {
 *   auth: { user, token, isLoading, error },
 *   tickets: { tickets, selectedTicket, ... },
 *   dashboard: { stats, ... }
 * }
 */
export const useAppSelector = useSelector.withTypes<RootState>();
