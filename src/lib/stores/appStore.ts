import { writable } from 'svelte/store';

// Definimos el circuito por defecto
export const circuitoActivo = writable("Holguín-14");

// También podemos guardar la congregación seleccionada aquí
export const congregacionSeleccionada = writable("AEROPUERTO");