import { appDataDir, join } from '@tauri-apps/api/path';
import { Stronghold, type Client } from '@tauri-apps/plugin-stronghold';
import { writable } from 'svelte/store'; // MAGIA REACTIVA PARA LA INTERFAZ

// --- 1. ESTADO GLOBAL REACTIVO DE SVELTE ---
export const sesionApp = writable({
    correo: '',
    token: '',
    isLoggedIn: false,
    verificando: true // Comienza en true para mostrar el spinner de carga
});

// Contraseña maestra de la bóveda
const VAULT_PASSWORD = 'clave-segura-asistente-2026'; 

// Nombre del "Cliente"
const CLIENT_NAME = 'cliente_sesion';

export interface DatosSesion {
    correo: string;
    token: string;
}

let cachedVaultPath: string | null = null;

async function getVaultPath(): Promise<string> {
    if (cachedVaultPath) return cachedVaultPath;
    
    const dataDir = await appDataDir();
    const vaultFileName = "auth_session.stronghold";
    
    // FIX CLAVE: Usamos 'join' de Tauri para que ponga la barra (\ o /) correctamente
    const fullPath = await join(dataDir, vaultFileName);
    
    console.log(`🔐 Usando ruta de bóveda: ${fullPath}`);
    cachedVaultPath = fullPath;
    return fullPath;
}

async function obtenerBovedaYStore() {
    const path = await getVaultPath();
    const vault = await Stronghold.load(path, VAULT_PASSWORD);
    
    let client: Client;
    try {
        client = await vault.loadClient(CLIENT_NAME);
    } catch {
        client = await vault.createClient(CLIENT_NAME);
    }
    
    return {
        store: client.getStore(),
        vault: vault
    };
}

// --- FUNCIONES MAESTRAS (Disco + Interfaz Svelte) ---

/**
 * Lee el disco duro y despierta la interfaz de usuario.
 * (Llamar a esta función en el onMount del .svelte)
 */
export async function arrancarAplicacion() {
    try {
        const { store } = await obtenerBovedaYStore();
        const dataBytes = await store.get('auth_data');
        
        if (dataBytes) {
            const jsonString = new TextDecoder().decode(new Uint8Array(dataBytes));
            const sesion = JSON.parse(jsonString) as DatosSesion;
            console.log("📦 Datos recuperados de la bóveda:", sesion);
            
            // ¡Forzamos a Svelte a saltar al Paso 3!
            sesionApp.set({ 
                correo: sesion.correo, 
                token: sesion.token, 
                isLoggedIn: true, 
                verificando: false 
            });
            return;
        }
        console.log("⚠️ No hay datos en la bóveda.");
    } catch (error) {
        console.error("❌ Error arrancando aplicación:", error);
    }
    
    // Si no hay datos, apaga el spinner y muestra el Paso 1
    sesionApp.update(s => ({ ...s, verificando: false }));
}

/**
 * Guarda en el disco duro y actualiza la pantalla.
 */
export async function guardarSesion(correo: string, token: string) {
    try {
        const { store, vault } = await obtenerBovedaYStore();
        const sesionObj = JSON.stringify({ correo, token });
        const dataBytes = new TextEncoder().encode(sesionObj);
        
        await store.insert('auth_data', Array.from(dataBytes));
        await vault.save();
        console.log("✅ Sesión guardada en:", await getVaultPath());
        
        // ¡Forzamos a Svelte a saltar al Paso 3!
        sesionApp.set({ 
            correo, 
            token, 
            isLoggedIn: true, 
            verificando: false 
        });
    } catch (error) {
        console.error("❌ Error guardando en la bóveda:", error);
    }
}

/**
 * Devuelve los datos crudos si se necesitan en otro lado sin tocar la UI.
 */
export async function obtenerSesion(): Promise<DatosSesion | null> {
    try {
        const { store } = await obtenerBovedaYStore();
        const dataBytes = await store.get('auth_data');
        if (dataBytes) {
            const jsonString = new TextDecoder().decode(new Uint8Array(dataBytes));
            return JSON.parse(jsonString) as DatosSesion;
        }
        return null;
    } catch (error) {
        console.error("❌ Error obteniendo sesión cruda:", error);
        return null;
    }
}

/**
 * Borra el disco duro y regresa la pantalla al inicio.
 */
export async function cerrarSesionSegura() {
    try {
        const { store, vault } = await obtenerBovedaYStore();
        await store.remove('auth_data');
        await vault.save();
        console.log("🗑️ Sesión eliminada de la bóveda.");
        
        // ¡Forzamos a Svelte a regresar al Paso 1!
        sesionApp.set({ 
            correo: '', 
            token: '', 
            isLoggedIn: false, 
            verificando: false 
        });
    } catch (error) {
        console.error("❌ Error eliminando la sesión:", error);
    }
}