// src/lib/stores/autoSyncStore.ts

import { writable, get } from 'svelte/store';
import { sesionApp } from '$lib/stores/authStore';
import { chequearEstadoNube, subirRespaldo } from '$lib/services/syncService';
import { prepararDatosParaSubir } from '$lib/services/dbSyncHelper';
// Mantenemos a db.ts como nuestro único Manager de base de datos
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
let hayCambiosPendientesDuranteSubida = false;

/**
 * Función principal: Ocurre cuando el store detecta un cambio en la base de datos.
 */
export async function dispararSincronizacionLocal() {
    let sesion = get(sesionApp);

    // 🛠️ RESCATE DE MEMORIA: Si Svelte perdió la sesión, la sacamos de la BD
    if (!sesion.isLoggedIn || !sesion.token) {
        // OJO: Cambia 'user_token' por la clave exacta que usas al guardar el token en el login
        const tokenGuardado = await cargarConfig('user_token'); 
        if (!tokenGuardado) return; // Si no hay token, abortamos
        
        sesion = { isLoggedIn: true, token: tokenGuardado, correo: sesion.correo || '', verificando: sesion.verificando || false };
    }

    // 🛡️ CANDADO: Si ya estamos subiendo datos, esperamos a que termine
    if (get(estadoSincronizacion).estado === 'sincronizando') {
        hayCambiosPendientesDuranteSubida = true;
        return;
    }

    // EL DEBOUNCE: Reiniciamos el reloj
    if (temporizadorSync) {
        clearTimeout(temporizadorSync);
    }

    // Avisamos a la UI que estamos esperando
    estadoSincronizacion.set({
        estado: 'esperando',
        mensaje: 'Esperando para subir cambios...',
        nubeDispositivo: '',
        nubeFecha: ''
    });

    // ⚡ TURBO: 5 segundos de espera (agrupando múltiples cambios)
    temporizadorSync = setTimeout(async () => {
        await procesarSubidaAutomatica(sesion.token);
    }, 5000);
}

/**
 * Función interna: Ocurre cuando el cronómetro llega a 0.
 */
async function procesarSubidaAutomatica(token: string) {
    estadoSincronizacion.update(s => ({ ...s, estado: 'sincronizando', mensaje: 'Sincronizando...' }));
    hayCambiosPendientesDuranteSubida = false;

    try {
        // --- PREVENCIÓN DE CONFLICTOS ---
        let localUltimaSync = await cargarConfig('last_synced_at');
        if (!localUltimaSync) localUltimaSync = "1970-01-01T00:00:00.000Z";

        const estadoNube = await chequearEstadoNube(token);

        if (estadoNube && estadoNube.last_synced_at) {
            const fechaLocal = new Date(localUltimaSync).getTime();
            const fechaNube = new Date(estadoNube.last_synced_at).getTime();

            if (fechaNube > fechaLocal) {
                console.warn("⚠️ CONFLICTO DETECTADO: La nube tiene datos más nuevos.");
                estadoSincronizacion.update(s => ({
                    ...s,
                    estado: 'conflicto',
                    mensaje: 'Hay datos nuevos en la nube.',
                    nubeDispositivo: estadoNube.last_device || 'Dispositivo desconocido',
                    nubeFecha: estadoNube.last_synced_at
                }));
                return; // ⛔ ABORTAMOS
            }
        }

        // --- ZONA SEGURA (LÓGICA DE MILISEGUNDOS DEL AMIGO) ---
        
        // 1. Tomamos la fecha EXACTA antes de recopilar los datos
        const fechaOriginalMilisegundos = new Date().toISOString();

        // 2. Empaquetamos todo desde la base de datos local
        const jsonDatos = await prepararDatosParaSubir();

        // 3. Subimos enviando NUESTRA fecha
        await subirRespaldo(token, jsonDatos, fechaOriginalMilisegundos);

        // 4. Guardamos la MISMA fecha exacta localmente
        await guardarConfig('last_synced_at', fechaOriginalMilisegundos);

        // G. Éxito
        estadoSincronizacion.update(s => ({ ...s, estado: 'al_dia', mensaje: 'Sincronizado con éxito' }));

        setTimeout(() => {
            if (get(estadoSincronizacion).estado === 'al_dia') {
                estadoSincronizacion.update(s => ({ ...s, estado: 'inactivo', mensaje: '' }));
            }
        }, 3000);

    } catch (error) {
        console.error("❌ Error en auto-sync:", error);
        estadoSincronizacion.update(s => ({
            ...s,
            estado: 'error',
            mensaje: 'Error de conexión. Se reintentará en el próximo cambio.'
        }));
        
        setTimeout(() => {
            if (get(estadoSincronizacion).estado === 'error') {
                estadoSincronizacion.update(s => ({ ...s, estado: 'inactivo', mensaje: '' }));
            }
        }, 4000);
    } finally {
        if (hayCambiosPendientesDuranteSubida) {
            hayCambiosPendientesDuranteSubida = false;
            dispararSincronizacionLocal();
        }
    }
}

export function resetearEstadoSincronizacion() {
    estadoSincronizacion.set({ estado: 'inactivo', mensaje: '', nubeDispositivo: '', nubeFecha: '' });
}

export async function registrarSubidaManualExitosa(fechaExacta?: string) {
    const fechaActual = fechaExacta || new Date().toISOString();
    await guardarConfig('last_synced_at', fechaActual);
    
    estadoSincronizacion.set({ estado: 'al_dia', mensaje: 'Sincronizado con éxito', nubeDispositivo: '', nubeFecha: '' });
    
    setTimeout(() => {
        if (get(estadoSincronizacion).estado === 'al_dia') {
            estadoSincronizacion.update(s => ({ ...s, estado: 'inactivo', mensaje: '' }));
        }
    }, 3000);
}

// 👇 LA MAGIA DE LOS EVENTOS: Esto rompe la dependencia circular.
// Escuchamos cuando db.ts "grita" que hubo un cambio, sin necesidad de que nos importe directamente.
if (typeof window !== 'undefined') {
    window.addEventListener('db_local_cambiada', () => {
        dispararSincronizacionLocal();
    });
}

/**
 * NUEVO: Función para ejecutar SOLO al abrir la app. 
 * Revisa si hay datos nuevos en la nube para avisar inmediatamente.
 */
export async function comprobarNubeAlAbrir() {
    let sesion = get(sesionApp);

    // 🛠️ RESCATE DE MEMORIA: Beneficia tanto a Android como a Windows
    if (!sesion.isLoggedIn || !sesion.token) {
        const tokenGuardado = await cargarConfig('user_token'); 
        if (!tokenGuardado) {
            console.log("Radar: No hay token guardado. Abortando chequeo.");
            return; 
        }
        sesion = { isLoggedIn: true, token: tokenGuardado, correo: sesion.correo || '', verificando: sesion.verificando || false };
    }

    try {
        let localUltimaSync = await cargarConfig('last_synced_at');
        if (!localUltimaSync) localUltimaSync = "1970-01-01T00:00:00.000Z";

        const estadoNube = await chequearEstadoNube(sesion.token);

        if (estadoNube && estadoNube.last_synced_at) {
            const fechaLocal = new Date(localUltimaSync).getTime();
            const fechaNube = new Date(estadoNube.last_synced_at).getTime();

            console.log("Radar -> Fecha Local:", localUltimaSync);
            console.log("Radar -> Fecha Nube:", estadoNube.last_synced_at);

            if (fechaNube > fechaLocal) {
                console.log("Radar: ¡Datos nuevos detectados en la nube!");
                estadoSincronizacion.update(s => ({
                    ...s,
                    estado: 'conflicto',
                    mensaje: 'Hay una actualización disponible en la nube.',
                    nubeDispositivo: estadoNube.last_device || 'Dispositivo desconocido',
                    nubeFecha: estadoNube.last_synced_at
                }));
            }
        }
    } catch (error) {
        console.error("Error al comprobar la nube en el arranque:", error);
    }
}