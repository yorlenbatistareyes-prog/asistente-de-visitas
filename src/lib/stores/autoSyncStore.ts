// src/lib/stores/autoSyncStore.ts

import { writable, get } from 'svelte/store';
import { sesionApp } from '$lib/stores/authStore';
import { chequearEstadoNube, subirRespaldo } from '$lib/services/syncService';
import { prepararDatosParaSubir } from '$lib/services/dbSyncHelper';
import { cargarConfig, guardarConfig } from '$lib/services/db';

// Definimos todos los posibles estados que verá el usuario
export type SyncState = 'inactivo' | 'esperando' | 'sincronizando' | 'al_dia' | 'conflicto' | 'error';

export const estadoSincronizacion = writable({
    estado: 'inactivo' as SyncState,
    mensaje: '',
    nubeDispositivo: '', // Guardaremos quién hizo los cambios recientes
    nubeFecha: ''        // Guardaremos cuándo se hicieron
});

// Esta variable es nuestro "cronómetro". Al dejarla afuera, vive en la memoria global.
let temporizadorSync: ReturnType<typeof setTimeout> | null = null;

/**
 * Función principal: LLAMAR CADA VEZ QUE SE GUARDE/BORRE ALGO EN LA APP.
 */
export function dispararSincronizacionLocal() {
    // 1. Verificamos si el usuario tiene la sesión iniciada
    const sesion = get(sesionApp);
    if (!sesion.isLoggedIn || !sesion.token) return;

    // 2. EL DEBOUNCE: Si ya había un cronómetro corriendo, lo matamos.
    if (temporizadorSync) {
        clearTimeout(temporizadorSync);
    }

    // 3. Avisamos a la UI que estamos esperando
    estadoSincronizacion.set({
        estado: 'esperando',
        mensaje: 'Esperando para sincronizar...',
        nubeDispositivo: '',
        nubeFecha: ''
    });

    // 4. Arrancamos el cronómetro de 5 segundos (5000 milisegundos)
    temporizadorSync = setTimeout(async () => {
        await procesarSubidaAutomatica(sesion.token);
    }, 5000);
}

/**
 * Función interna: Ocurre cuando el cronómetro llega a 0.
 */
async function procesarSubidaAutomatica(token: string) {
    estadoSincronizacion.update(s => ({ ...s, estado: 'sincronizando', mensaje: 'Sincronizando con la nube...' }));

    try {
        // --- PREVENCIÓN DE CONFLICTOS ---
        // A. Leemos cuándo fue la última vez que NOSOTROS subimos/bajamos datos.
        let localUltimaSync = await cargarConfig('last_synced_at');
        if (!localUltimaSync) localUltimaSync = "1970-01-01T00:00:00.000Z"; // Si nunca se ha sincronizado

        // B. Preguntamos al servidor cómo están sus datos
        const estadoNube = await chequearEstadoNube(token);

        if (estadoNube && estadoNube.last_synced_at) {
            const fechaLocal = new Date(localUltimaSync).getTime();
            const fechaNube = new Date(estadoNube.last_synced_at).getTime();

            // C. EL CHOQUE: Si la nube tiene una fecha MAYOR a la nuestra
            if (fechaNube > fechaLocal) {
                console.warn("⚠️ CONFLICTO DETECTADO: La nube tiene datos más nuevos.");
                
                estadoSincronizacion.update(s => ({
                    ...s,
                    estado: 'conflicto',
                    mensaje: 'Hay datos nuevos en la nube.',
                    nubeDispositivo: estadoNube.last_device || 'Dispositivo desconocido',
                    nubeFecha: estadoNube.last_synced_at
                }));
                return; // ⛔ ABORTAMOS LA SUBIDA PARA NO BORRAR EL TRABAJO DEL OTRO
            }
        }

        // --- ZONA SEGURA: PROCEDEMOS A SUBIR ---
        
        // D. Empaquetamos todo desde la base de datos local
        const jsonDatos = await prepararDatosParaSubir();
        const fechaActual = new Date().toISOString();

        // E. Subimos usando la función que actualizamos en el Paso 1
        await subirRespaldo(token, jsonDatos, fechaActual);

        // F. MUY IMPORTANTE: Actualizamos nuestra marca de tiempo local
        await guardarConfig('last_synced_at', fechaActual);

        // G. Éxito
        estadoSincronizacion.update(s => ({ ...s, estado: 'al_dia', mensaje: '¡Nube actualizada!' }));

        // Después de 3 segundos, ocultamos el mensaje para no molestar
        setTimeout(() => {
            estadoSincronizacion.update(s => ({ ...s, estado: 'inactivo', mensaje: '' }));
        }, 3000);

    } catch (error) {
        console.error("❌ Error en auto-sync:", error);
        estadoSincronizacion.update(s => ({
            ...s,
            estado: 'error',
            mensaje: 'Error de conexión. Se reintentará en el próximo cambio.'
        }));
        
        // Volver a inactivo después de unos segundos
        setTimeout(() => {
            estadoSincronizacion.update(s => ({ ...s, estado: 'inactivo', mensaje: '' }));
        }, 4000);
    }
}

/**
 * Función extra para usar desde la página de configuración para forzar que el estado regrese a inactivo
 * si el usuario resolvió el conflicto descargando.
 */
export function resetearEstadoSincronizacion() {
    estadoSincronizacion.set({ estado: 'inactivo', mensaje: '', nubeDispositivo: '', nubeFecha: '' });
}

/**
 * Función extra: Llamar cuando se haga una subida MANUAL exitosa para evitar falsos conflictos.
 */
export async function registrarSubidaManualExitosa() {
    const fechaActual = new Date().toISOString();
    await guardarConfig('last_synced_at', fechaActual);
    estadoSincronizacion.set({ estado: 'al_dia', mensaje: '¡Nube actualizada!', nubeDispositivo: '', nubeFecha: '' });
    
    // Lo ocultamos a los 3 segundos igual que el automático
    setTimeout(() => {
        estadoSincronizacion.update(s => ({ ...s, estado: 'inactivo', mensaje: '' }));
    }, 3000);
}