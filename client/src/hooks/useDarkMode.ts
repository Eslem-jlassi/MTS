// =============================================================================
// MTS TELECOM - Hook pour le mode sombre
// =============================================================================
/**
 * ============================================================================
 * useDarkMode.ts - Hook pour gérer le thème sombre/clair
 * ============================================================================
 *
 * CE QUE FAIT CE HOOK:
 * - Lit le thème sauvegardé dans localStorage
 * - Applique les classes CSS correspondantes
 * - Permet de basculer entre mode sombre et clair
 * - Persiste le choix dans localStorage
 *
 * COMMENT ÇA MARCHE:
 * Tailwind CSS a un mode 'dark' qui fonctionne avec des classes:
 * - <html class="dark"> → Mode sombre actif
 * - <html class="light"> → Mode clair actif
 *
 * Les classes Tailwind utilisent le préfixe dark: pour le mode sombre:
 * - text-gray-900 dark:text-white
 * - bg-white dark:bg-gray-800
 *
 * UTILISATION:
 * function ThemeToggle() {
 *   const [currentTheme, setTheme] = useDarkMode();
 *
 *   return (
 *     <button onClick={() => setTheme(currentTheme)}>
 *       {currentTheme === 'dark' ? '🌙 Mode sombre' : '☀️ Mode clair'}
 *     </button>
 *   );
 * }
 *
 * ============================================================================
 */

import { useEffect, useState } from "react";

// =============================================================================
// CONSTANTES
// =============================================================================

/** Valeur pour le thème sombre */
export const DARK: string = "dark";

/** Valeur pour le thème clair */
export const LIGHT: string = "light";

/** Clé utilisée dans localStorage pour sauvegarder le thème */
const THEME: string = "theme";

// =============================================================================
// HOOK useDarkMode
// =============================================================================

/**
 * Hook personnalisé pour gérer le mode sombre.
 *
 * @returns [currentTheme, setTargetTheme]
 *   - currentTheme: Le thème OPPOSÉ (pour le bouton toggle)
 *   - setTargetTheme: Fonction pour changer le thème
 *
 * NOTE IMPORTANTE:
 * Ce hook retourne le thème OPPOSÉ au thème actif!
 * Si le mode sombre est actif, currentTheme = 'light' (pour afficher "Passer en mode clair")
 */
export default function useDarkMode(): [string, Function] {
  // =========================================================================
  // STATE
  // =========================================================================

  /**
   * État du thème cible.
   * Initialisé avec la valeur sauvegardée dans localStorage.
   * localStorage.theme peut être 'dark', 'light', ou undefined.
   */
  const [targetTheme, setTargetTheme] = useState(localStorage.theme);

  /**
   * Le thème opposé (pour le toggle button).
   * Si le thème actif est 'dark', on retourne 'light' pour le bouton.
   */
  const currentTheme = targetTheme === DARK ? LIGHT : DARK;

  // =========================================================================
  // EFFECT - Appliquer le thème
  // =========================================================================

  /**
   * useEffect qui s'exécute quand targetTheme change.
   *
   * Actions:
   * 1. Récupère l'élément <html> (documentElement)
   * 2. Retire la classe de l'ancien thème
   * 3. Ajoute la classe du nouveau thème
   * 4. Sauvegarde dans localStorage
   */
  useEffect(() => {
    // Récupère l'élément <html>
    const root = window.document.documentElement;

    // Retire l'ancienne classe de thème
    root.classList.remove(currentTheme);

    // Ajoute la nouvelle classe de thème
    root.classList.add(targetTheme);

    // Sauvegarde le choix pour la prochaine visite
    localStorage.setItem(THEME, targetTheme);
  }, [targetTheme, setTargetTheme, currentTheme]);

  // Retourne le thème opposé (pour affichage) et la fonction de changement
  return [currentTheme, setTargetTheme];
}
