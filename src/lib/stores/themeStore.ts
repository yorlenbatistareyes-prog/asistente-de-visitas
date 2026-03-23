import { writable } from 'svelte/store';

// Definimos los tipos de tema
export type Theme = 'light' | 'dark' | 'system';

// Store que persiste el tema elegido
export const currentTheme = writable<Theme>('system');

// Función para aplicar el tema al HTML
export function applyTheme(theme: Theme) {
  const root = window.document.documentElement;
  
  if (theme === 'system') {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', isDark);
  } else {
    root.classList.toggle('dark', theme === 'dark');
  }
}
