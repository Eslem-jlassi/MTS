// =============================================================================
// MTS TELECOM - Hook personnalisé pour le dispatch Redux
// =============================================================================
/**
 * ============================================================================
 * useAppDispatch.ts - Hook typé pour dispatcher des actions Redux
 * ============================================================================
 * 
 * POURQUOI CE HOOK?
 * -----------------
 * Par défaut, useDispatch de React-Redux n'est pas typé pour notre app.
 * Ce hook ajoute le typage de notre AppDispatch.
 * 
 * SANS CE HOOK:
 * const dispatch = useDispatch();  // dispatch est de type any
 * dispatch(login(credentials));    // Pas d'autocomplétion, pas de vérification
 * 
 * AVEC CE HOOK:
 * const dispatch = useAppDispatch();  // dispatch est de type AppDispatch
 * dispatch(login(credentials));        // Autocomplétion + vérification de types
 * 
 * UTILISATION:
 * Dans un composant React:
 * 
 * import { useAppDispatch } from './hooks/useAppDispatch';
 * 
 * function MyComponent() {
 *   const dispatch = useAppDispatch();
 *   
 *   const handleClick = () => {
 *     dispatch(someAction());
 *   };
 * }
 * 
 * ============================================================================
 */

import { useDispatch } from 'react-redux'
import { AppDispatch } from "../redux/store";

/**
 * Hook useAppDispatch typé.
 * 
 * withTypes<AppDispatch>() est une nouvelle API de React-Redux (v9+)
 * qui crée une version typée du hook.
 * 
 * AppDispatch est défini dans store.ts:
 * export type AppDispatch = typeof store.dispatch;
 */
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
