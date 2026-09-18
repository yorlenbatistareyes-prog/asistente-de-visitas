// src/lib/stores/autoSyncStore.ts

import { writable, get } from 'svelte/store';
import { sesionApp } from '$lib/stores/authStore';
import { chequearEstadoNube, subirRespaldo } from '$lib/services/syncService';
import { prepararDatosParaSubir } from '$lib/services/dbSyncHelper';
import { cargarConfig, guardarConfig } from '$lib/services/db';

// 🔥 NUEVAS IMPORTACIONES PARA LA CARPETA COMPARTIDA
import { invoke } from '@tauri-apps/api/core';
import { writeTextFile, stat } from '@tauri-apps/plugin-fs';

export type SyncState = 'inactivo' | 'esperando' | 'sincronizando' | 'al_dia' | 'conflicto' | 'error';

export const estadoSincronizacion = writable({
    estado: 'inactivo' as SyncState,
    mensaje: '',
    nubeDispositivo: '',
    nubeFecha: '',
    origenConflicto: '' // 🔥 CLAVE: Identifica si el conflicto viene de 'web' o 'carpeta'
});

// 🔒 CANDADOS ANTI-ECO INDEPENDIENTES
export let guardandoMetadatosInternosWeb = false;
export let guardandoMetadatosInternosCarpeta = false;

// 🛑 PAUSA DE RADAR
export let radarPausado = false;

export function pausarRadarTemporalmente() {
    radarPausado = true;
    estadoSincronizacion.update(s => ({ ...s, estado: 'inactivo', mensaje: '' }));
    setTimeout(() => { radarPausado = false; }, 600000); 
}

// ⏱️ TEMPORIZADORES INDEPENDIENTES
let temporizadorSync: ReturnType<typeof setTimeout> | null = null; // Para el Servidor Web
let temporizadorCarpeta: ReturnType<typeof setTimeout> | null = null; // Para la Carpeta Local
let hayCambiosPendientesDuranteSubida = false;

// =======================================================
// --- 1. LÓGICA DEL SERVIDOR WEB (CARRIL INDEPENDIENTE) ---
// =======================================================

export async function dispararSincronizacionLocal() {
    let sesion = get(sesionApp);

    if (!sesion.isLoggedIn || !sesion.token) {
        const tokenGuardado = await cargarConfig('user_token'); 
        if (!tokenGuardado) return;
        sesion = { isLoggedIn: true, token: tokenGuardado, correo: sesion.correo || '', verificando: sesion.verificando || false };
        sesionApp.set(sesion);
    }

    if (get(estadoSincronizacion).estado === 'sincronizando') {
        hayCambiosPendientesDuranteSubida = true;
        return;
    }

    if (temporizadorSync) clearTimeout(temporizadorSync);

    estadoSincronizacion.set({ estado: 'esperando', mensaje: 'Esperando para subir cambios (Web)...', nubeDispositivo: '', nubeFecha: '', origenConflicto: '' });

    temporizadorSync = setTimeout(async () => {
        await procesarSubidaAutomatica(sesion.token);
    }, 5000);
}

async function procesarSubidaAutomatica(token: string) {
    estadoSincronizacion.update(s => ({ ...s, estado: 'sincronizando', mensaje: 'Sincronizando con servidor...' }));
    hayCambiosPendientesDuranteSubida = false;

    try {
        // 🔥 Usamos su propia variable de base de datos
        let localUltimaSync = await cargarConfig('last_synced_web');
        if (!localUltimaSync) localUltimaSync = "1970-01-01T00:00:00.000Z";

        const estadoNube = await chequearEstadoNube(token);

        if (estadoNube && estadoNube.last_synced_at) {
            const fechaLocal = new Date(localUltimaSync).getTime();
            const fechaNube = new Date(estadoNube.last_synced_at).getTime();

            if (fechaNube > fechaLocal) {
                console.warn("⚠️ CONFLICTO DETECTADO: La nube tiene datos más nuevos.");
                estadoSincronizacion.update(s => ({
                    ...s, estado: 'conflicto', mensaje: 'Hay datos nuevos en la nube.',
                    nubeDispositivo: estadoNube.last_device || 'Dispositivo desconocido',
                    nubeFecha: estadoNube.last_synced_at,
                    origenConflicto: 'web'
                }));
                return;
            }
        }

        const fechaOriginalMilisegundos = new Date().toISOString();
        const jsonDatos = await prepararDatosParaSubir();
        await subirRespaldo(token, jsonDatos, fechaOriginalMilisegundos);
        
        // 🔒 ENCENDEMOS EL CANDADO WEB Y GUARDAMOS EN SU VARIABLE
        guardandoMetadatosInternosWeb = true;
        await guardarConfig('last_synced_web', fechaOriginalMilisegundos);
        setTimeout(() => { guardandoMetadatosInternosWeb = false; }, 2000);

        estadoSincronizacion.update(s => ({ ...s, estado: 'al_dia', mensaje: 'Sincronizado con éxito (Web)' }));

        setTimeout(() => {
            if (get(estadoSincronizacion).estado === 'al_dia') {
                estadoSincronizacion.update(s => ({ ...s, estado: 'inactivo', mensaje: '' }));
            }
        }, 3000);

    } catch (error) {
        console.error("❌ Error en auto-sync web:", error);
        estadoSincronizacion.update(s => ({
            ...s, estado: 'error', mensaje: 'Error de conexión. Se reintentará en el próximo cambio.'
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

// =======================================================
// --- 2. LÓGICA DE CARPETA COMPARTIDA (CARRIL INDEPENDIENTE) ---
// =======================================================

async function obtenerOCrearLlave(): Promise<string> {
    let llave = await cargarConfig('llave_carpeta_sync');
    if (!llave) {
        llave = await invoke<string>('generar_llave_invisible');
        guardandoMetadatosInternosCarpeta = true;
        await guardarConfig('llave_carpeta_sync', llave);
        setTimeout(() => { guardandoMetadatosInternosCarpeta = false; }, 2000);
    }
    return llave;
}

export function dispararSincronizacionCarpeta() {
    if (temporizadorCarpeta) clearTimeout(temporizadorCarpeta);
    
    // Si la web ya está mostrando un mensaje, no lo pisamos visualmente de golpe
    if (get(estadoSincronizacion).estado !== 'sincronizando') {
        estadoSincronizacion.update(s => ({ ...s, estado: 'esperando', mensaje: 'Preparando carpeta...' }));
    }

    // Le damos 6 segundos de retraso para evitar choques simultáneos con la subida web
    temporizadorCarpeta = setTimeout(async () => {
        await ejecutarSincronizacionCarpetaLocal();
    }, 6000);
}

async function ejecutarSincronizacionCarpetaLocal() {
    try {
        const rutaCarpeta = await invoke<string | null>('obtener_ruta_sync');
        if (!rutaCarpeta) return;

        estadoSincronizacion.update(s => ({ ...s, estado: 'sincronizando', mensaje: 'Guardando en carpeta...' }));

        const llave = await obtenerOCrearLlave();
        const paqueteCifrado = await invoke<string>('exportar_db_encriptada_global', { llaveBase64: llave });

        const separador = rutaCarpeta.includes('/') ? '/' : '\\';
        const rutaArchivoFinal = `${rutaCarpeta}${separador}sincronizacion_global.avisits`;

        await writeTextFile(rutaArchivoFinal, paqueteCifrado);

        // 🔥 ACTUALIZAMOS SU PROPIA VARIABLE INDEPENDIENTE
        const fechaBlinda = new Date(Date.now() + 2000).toISOString();
        guardandoMetadatosInternosCarpeta = true;
        await guardarConfig('last_synced_folder', fechaBlinda);
        setTimeout(() => { guardandoMetadatosInternosCarpeta = false; }, 2000);

        estadoSincronizacion.set({ estado: 'al_dia', mensaje: '¡Carpeta sincronizada!', nubeDispositivo: '', nubeFecha: '', origenConflicto: '' });
        
        setTimeout(() => {
            if (get(estadoSincronizacion).estado === 'al_dia') {
                estadoSincronizacion.update(s => ({ ...s, estado: 'inactivo', mensaje: '' }));
            }
        }, 3000);

    } catch (error) {
        console.error("❌ [CarpetaSync] Error al sincronizar en la carpeta local:", error);
        estadoSincronizacion.update(s => ({ ...s, estado: 'error', mensaje: 'Error en carpeta local' }));
        setTimeout(() => {
            if (get(estadoSincronizacion).estado === 'error') {
                estadoSincronizacion.update(s => ({ ...s, estado: 'inactivo', mensaje: '' }));
            }
        }, 4000);
    }
}

// =======================================================
// --- 3. FUNCIONES AUXILIARES (CONSERVADAS Y ADAPTADAS) ---
// =======================================================

export function resetearEstadoSincronizacion() {
    estadoSincronizacion.set({ estado: 'inactivo', mensaje: '', nubeDispositivo: '', nubeFecha: '', origenConflicto: '' });
}

export async function registrarSubidaManualExitosa(fechaExacta?: string) {
    const fechaActual = fechaExacta || new Date().toISOString();
    
    // Esta función es llamada desde el Login/Sincronizacion Web, por lo que usa la variable web
    guardandoMetadatosInternosWeb = true;
    await guardarConfig('last_synced_web', fechaActual);
    setTimeout(() => { guardandoMetadatosInternosWeb = false; }, 2000);
    
    estadoSincronizacion.set({ estado: 'al_dia', mensaje: 'Sincronizado con éxito', nubeDispositivo: '', nubeFecha: '', origenConflicto: '' });
    setTimeout(() => {
        if (get(estadoSincronizacion).estado === 'al_dia') {
            estadoSincronizacion.update(s => ({ ...s, estado: 'inactivo', mensaje: '' }));
        }
    }, 3000);
}

// =======================================================
// --- 4. EL RADAR (ESCUCHA LOS CAMBIOS Y DECIDE) ---
// =======================================================

export async function comprobarNubeAlAbrir() {
    if (radarPausado) return;

    // 🌐 REVISIÓN INDEPENDIENTE 1: Servidor Web
    let sesion = get(sesionApp);
    if (!sesion.isLoggedIn || !sesion.token) {
        const tokenGuardado = await cargarConfig('user_token'); 
        if (tokenGuardado) {
            sesion = { isLoggedIn: true, token: tokenGuardado, correo: sesion.correo || '', verificando: sesion.verificando || false };
            sesionApp.set(sesion);
        }
    }

    if (sesion.isLoggedIn && sesion.token) {
        try {
            // 🔥 Usa la variable exclusiva web
            let localUltimaSyncWeb = await cargarConfig('last_synced_web') || "1970-01-01T00:00:00.000Z";
            const tiempoLocalWeb = new Date(localUltimaSyncWeb).getTime();
            
            const estadoNube = await chequearEstadoNube(sesion.token);
            if (estadoNube && estadoNube.last_synced_at) {
                const fechaNube = new Date(estadoNube.last_synced_at).getTime();

                if (fechaNube > tiempoLocalWeb) {
                    estadoSincronizacion.update(s => ({
                        ...s, estado: 'conflicto', mensaje: 'Hay una actualización disponible en la nube.',
                        nubeDispositivo: estadoNube.last_device || 'Dispositivo desconocido',
                        nubeFecha: estadoNube.last_synced_at,
                        origenConflicto: 'web'
                    }));
                    return; // Si detecta conflicto en web, detiene aquí para mostrar el modal
                }
            }
        } catch (error) {
            console.error("Error al comprobar la nube web en el arranque:", error);
        }
    }

    // 📂 REVISIÓN INDEPENDIENTE 2: Carpeta Compartida
    try {
        const rutaCarpeta = await invoke<string | null>('obtener_ruta_sync');
        if (rutaCarpeta) {
            // 🔥 Usa la variable exclusiva de carpeta
            let localUltimaSyncFolder = await cargarConfig('last_synced_folder') || "1970-01-01T00:00:00.000Z";
            const tiempoLocalFolder = new Date(localUltimaSyncFolder).getTime();

            const separador = rutaCarpeta.includes('/') ? '/' : '\\';
            const rutaArchivoFinal = `${rutaCarpeta}${separador}sincronizacion_global.avisits`;

            const infoArchivo = await stat(rutaArchivoFinal);
            if (infoArchivo && infoArchivo.mtime) {
                const tiempoCarpeta = infoArchivo.mtime.getTime();

                if (tiempoCarpeta > (tiempoLocalFolder + 15000)) {
                    estadoSincronizacion.set({
                        estado: 'conflicto',
                        mensaje: 'Hay una actualización disponible en la carpeta compartida.',
                        nubeDispositivo: 'Otro dispositivo',
                        nubeFecha: new Date(tiempoCarpeta).toISOString(),
                        origenConflicto: 'carpeta'
                    });
                }
            }
        }
    } catch (e) {
        // Ignoramos silenciosamente si la carpeta no está configurada o el archivo aún no existe
    }
}

if (typeof window !== 'undefined') {
    if (!(window as any).__radarAVisitsIniciado) {
        (window as any).__radarAVisitsIniciado = true;

        let filtroAntiBucle: ReturnType<typeof setTimeout>;

        window.addEventListener('db_local_cambiada', () => {
            // 🔥 Comprueba ambos candados
            if (guardandoMetadatosInternosWeb || guardandoMetadatosInternosCarpeta) {
                console.log("🤫 [SyncStore] Ignorando eco interno.");
                return;
            }

            clearTimeout(filtroAntiBucle);

            filtroAntiBucle = setTimeout(async () => {
                let rutaCarpeta: string | null = null;
                try { rutaCarpeta = await invoke<string | null>('obtener_ruta_sync'); } catch (e) { rutaCarpeta = null; }

                const sesion = get(sesionApp);
                const sesionActiva = !!(sesion?.isLoggedIn && sesion?.token);

                if (!rutaCarpeta && !sesionActiva) return;

                console.log("👂 [SyncStore] Cambio detectado. Disparando métodos activos...");
                
                // Dispara los que estén configurados
                if (sesionActiva) dispararSincronizacionLocal();
                if (rutaCarpeta) dispararSincronizacionCarpeta();

            }, 1000);
        });

        setInterval(async () => {
            try {
                if (guardandoMetadatosInternosWeb || guardandoMetadatosInternosCarpeta || get(estadoSincronizacion).estado === 'sincronizando' || radarPausado) return;
                await comprobarNubeAlAbrir();
            } catch (e) {}
        }, 15000);
    }
}