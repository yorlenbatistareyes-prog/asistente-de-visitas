import { writable } from 'svelte/store';

export interface Congregacion {
  nombre: string;
  enVisita: boolean;
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

// Inicializamos vacío. Más adelante haremos que recuerde el último circuito abierto.
export const circuitoActivo = writable<string>(""); 

export const listaCongregaciones = writable<Congregacion[]>([]);
export const fechaPorCongregacion = writable<Record<string, string>>({});
export const resumenUltimoAnalisis = writable<Record<string, string>>({});

// Eliminamos 'mostrarCircuitBar' porque ya no existirá esa barra lateral.