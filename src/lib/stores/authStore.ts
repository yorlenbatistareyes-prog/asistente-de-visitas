import { writable } from 'svelte/store';
import { load } from '@tauri-apps/plugin-store';
import { guardarConfig, cargarConfig } from '$lib/services/db';

// --- 1. ESTADO GLOBAL ---
export const sesionApp = writable({
    correo: '',
    token: '',
    isLoggedIn: false,
    verificando: true
});

export interface DatosSesion {
    correo: string;
    token: string;
}

let isInitialized = false;

// --- 2. FUNCIONES MAESTRAS ---

export async function arrancarAplicacion() {
    if (isInitialized) {
        sesionApp.update(s => ({ ...s, verificando: false }));
        return;
    }

    try {
        // SOLUCIÓN: Simplemente cargamos el archivo, sin opciones extra
        const store = await load('sesion_app.json');
        const correo = await store.get<string>('correo');
        const token = await store.get<string>('token');
        
        if (correo && token) {
            sesionApp.set({ 
                correo, 
                token, 
                isLoggedIn: true, 
                verificando: false 
            });

            isInitialized = true;
            return;
        }
    } catch (error) {
        console.error("❌ Error leyendo Store:", error);
    }
    
    sesionApp.update(s => ({ ...s, verificando: false }));
    isInitialized = true;
}

export async function guardarSesion(correo: string, token: string) {
    try {
        const store = await load('sesion_app.json');
        await store.set('correo', correo);
        await store.set('token', token);
        await store.save(); // Aquí ya guardamos manualmente, ¡no hay problema!
        
        await guardarConfig('user_token', token);
        await guardarConfig('user_email', correo);

        sesionApp.set({ 
            correo, 
            token, 
            isLoggedIn: true, 
            verificando: false 
        });
        isInitialized = true;
    } catch (error) {
        console.error("❌ Error guardando sesión:", error);
    }
}

export async function obtenerSesion(): Promise<DatosSesion | null> {
    try {
        const store = await load('sesion_app.json');
        const correo = await store.get<string>('correo');
        const token = await store.get<string>('token');
        
        if (correo && token) {
            return { correo, token };
        }
        return null;
    } catch (error) {
        return null;
    }
}

export async function cerrarSesionSegura() {
    try {
        const store = await load('sesion_app.json');
        await store.delete('correo');
        await store.delete('token');
        await store.save();
        
        await guardarConfig('user_token', '');
        await guardarConfig('user_email', '');

        sesionApp.set({ 
            correo: '', 
            token: '', 
            isLoggedIn: false, 
            verificando: false 
        });
        isInitialized = false;
    } catch (error) {
        console.error("❌ Error al cerrar sesión:", error);
    }
}