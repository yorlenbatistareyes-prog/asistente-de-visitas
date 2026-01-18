// src/lib/services/db.ts
import { Store } from '@tauri-apps/plugin-store';

const DB_FILENAME = 'app_data.json';

// Variable para mantener la instancia de la tienda en memoria
let store: Store | null = null;

// --- FUNCIÓN INTERNA PARA INICIALIZAR ---
// Esta función asegura que el store esté cargado antes de usarlo
async function initStore() {
    if (store) return store; // Si ya existe, lo devolvemos

    try {
        // CORRECCIÓN: Usamos .load() en lugar de new Store()
        store = await Store.load(DB_FILENAME);
        return store;
    } catch (error) {
        console.error("Error fatal al cargar la BD:", error);
        throw error;
    }
}

// --- TIPOS DE DATOS ---
export interface AppData {
    documentos?: any[];
    congregaciones?: any[];
    informes?: any[];
    pendientes?: any[];
}

// 1. FUNCIÓN GENÉRICA PARA GUARDAR
export async function saveData(key: string, value: any) {
    try {
        const db = await initStore(); // Esperamos a que cargue
        await db.set(key, value);
        await db.save(); // Escribe en disco
        console.log(`✅ Guardado correctamente: ${key}`);
    } catch (error) {
        console.error(`❌ Error guardando ${key}:`, error);
    }
}

// 2. FUNCIÓN GENÉRICA PARA CARGAR
export async function loadData<T>(key: string): Promise<T | null> {
    try {
        const db = await initStore(); // Esperamos a que cargue
        const data = await db.get<T>(key);
        return data || null;
    } catch (error) {
        console.error(`❌ Error cargando ${key}:`, error);
        return null;
    }
}

// 3. LIMPIAR DATOS
export async function clearData(key: string) {
    try {
        const db = await initStore();
        await db.delete(key);
        await db.save();
    } catch (error) {
        console.error(`❌ Error borrando ${key}:`, error);
    }
}