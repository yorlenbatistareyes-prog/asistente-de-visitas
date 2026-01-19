import { writable } from 'svelte/store';

export interface Congregacion {
  nombre: string;
  enVisita: boolean; // <--- FALTABA ESTO
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

export const circuitoActivo = writable("Holguín-14");
export const listaCongregaciones = writable<Congregacion[]>([]);
export const fechaPorCongregacion = writable<Record<string, string>>({});
export const resumenUltimoAnalisis = writable<Record<string, string>>({});
export const mostrarCircuitBar = writable(true);
