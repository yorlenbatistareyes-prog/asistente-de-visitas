import { writable } from 'svelte/store';
// Importamos la interfaz directamente desde tu base de datos para no duplicar código
import type { Congregacion } from '$lib/services/db';

// Inicializamos vacío. Más adelante haremos que recuerde el último circuito abierto.
export const circuitoActivo = writable<string>(""); 

export const listaCongregaciones = writable<Congregacion[]>([]);

// Estas dos variables ahora solo sirven para que la pantalla se actualice 
// visualmente al instante tras finalizar un informe, pero el guardado real va a SQLite.
export const fechaPorCongregacion = writable<Record<string, string>>({});
export const resumenUltimoAnalisis = writable<Record<string, string>>({});