import { load } from '@tauri-apps/plugin-store';
import { writable } from 'svelte/store';

// Store de Svelte para la interfaz del Asistente de visitas [cite: 2026-01-01]
export const observacionesStore = writable<Record<string, any>>({});

// Definimos los valores por defecto vacíos para que TypeScript no marque error
const opcionesStore = { 
    defaults: {}, 
    autoSave: true 
};

/**
 * Función para cargar los datos al iniciar
 */
export async function cargarDatos() {
    try {
        // Cargamos el archivo usando las opciones que exige el plugin
        const store = await load('datos_visitas.json', opcionesStore);
        
        const saved = await store.get<Record<string, any>>('registro_analisis');
        if (saved) {
            observacionesStore.set(saved);
        }
    } catch (error) {
        console.error("Error al cargar desde Windows:", error);
    }
}

/**
 * Función para guardar los datos físicamente
 */
export async function guardarDatos(nuevosDatos: Record<string, any>) {
    try {
        observacionesStore.set(nuevosDatos);
        
        const store = await load('datos_visitas.json', opcionesStore);
        await store.set('registro_analisis', nuevosDatos);
        
        // Aunque tiene autoSave, forzamos el guardado para máxima seguridad
        await store.save(); 
    } catch (error) {
        console.error("Error al guardar en el JSON:", error);
    }
}