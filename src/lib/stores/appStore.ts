import { writable } from 'svelte/store';

// 1. Definimos la estructura para que TypeScript no dé error al buscar el 'id'
export interface Congregacion {
  id: number;
  nombre: string;
  circuito?: string;
  numero?: string;
  ciudad?: string;
  provincia?: string;
  pais?: string;
  idioma?: string;
  esLenguaSenas?: boolean;
  telefono?: string;
  horaSemana?: string;
  horaFinSemana?: string;
  diaSemana?: string;
  diaFinSemana?: string;
}

export const circuitoActivo = writable("Holguín-14"); // Cambiado a Holguín-14
export const listaCongregaciones = writable<Congregacion[]>([]);
export const fechaPorCongregacion = writable<Record<string, string>>({});
export const resumenUltimoAnalisis = writable<Record<string, string>>({});

// NUEVO: Store para controlar la visibilidad del CircuitBar
export const mostrarCircuitBar = writable(true);