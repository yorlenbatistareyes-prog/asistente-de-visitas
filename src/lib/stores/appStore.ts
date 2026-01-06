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

export const circuitoActivo = writable("HG-06");
export const listaCongregaciones = writable<Congregacion[]>([]);
export const fechaPorCongregacion = writable<Record<string, string>>({});


