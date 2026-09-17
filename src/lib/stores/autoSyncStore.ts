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
    nubeFecha: ''       
});

// 🔒 CANDADO ANTI-ECO: Evita que la app reaccione cuando ella misma guarda
export let guardandoMetadatosInternos = false;

// 🛑 PAUSA DE RADAR: Para la Regla 5 (Ignorar conflicto)
export let radarPausado = false;

export function pausarRadarTemporalmente() {
    radarPausado = true;
    estadoSincronizacion.update(s => ({ ...s, estado: 'inactivo', mensaje: '' }));
    // El radar se pausa por 10 minutos (o hasta reiniciar la app)
    setTimeout(() => { radarPausado = false; }, 600000); 
}

// ⏱️ TEMPORIZADORES INDEPENDIENTES
let temporizadorSync: ReturnType<typeof setTimeout> | null = null; // Para el Servidor
let temporizadorCarpeta: ReturnType<typeof setTimeout> | null = null; // Para la Carpeta
let hayCambiosPendientesDuranteSubida = false;

// =======================================================
// --- 1. LÓGICA DEL SERVIDOR WEB (INTACTA Y MEJORADA) ---
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

    estadoSincronizacion.set({ estado: 'esperando', mensaje: 'Esperando para subir cambios...', nubeDispositivo: '', nubeFecha: '' });

    temporizadorSync = setTimeout(async () => {
        await procesarSubidaAutomatica(sesion.token);
    }, 5000);
}

async function procesarSubidaAutomatica(token: string) {
    estadoSincronizacion.update(s => ({ ...s, estado: 'sincronizando', mensaje: 'Sincronizando con servidor...' }));
    hayCambiosPendientesDuranteSubida = false;

    try {
        let localUltimaSync = await cargarConfig('last_synced_at');
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
                    nubeFecha: estadoNube.last_synced_at
                }));
                return;
            }
        }

        const fechaOriginalMilisegundos = new Date().toISOString();
        const jsonDatos = await prepararDatosParaSubir();
        await subirRespaldo(token, jsonDatos, fechaOriginalMilisegundos);
        
        // 🔒 ENCENDEMOS EL CANDADO ANTES DE GUARDAR LA FECHA (Evita bucle infinito)
        guardandoMetadatosInternos = true;
        await guardarConfig('last_synced_at', fechaOriginalMilisegundos);
        setTimeout(() => { guardandoMetadatosInternos = false; }, 2000);

        estadoSincronizacion.update(s => ({ ...s, estado: 'al_dia', mensaje: 'Sincronizado con éxito' }));

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
// --- 2. NUEVA LÓGICA DE CARPETA COMPARTIDA (LOCAL) ---
// =======================================================

// Genera o recupera la llave de seguridad para la carpeta
async function obtenerOCrearLlave(): Promise<string> {
    let llave = await cargarConfig('llave_carpeta_sync');
    if (!llave) {
        llave = await invoke<string>('generar_llave_invisible');
        // 🔒 Usamos el candado para que no se dispare un evento de sync extra
        guardandoMetadatosInternos = true;
        await guardarConfig('llave_carpeta_sync', llave);
        setTimeout(() => { guardandoMetadatosInternos = false; }, 2000);
    }
    return llave;
}

function dispararSincronizacionCarpeta() {
    if (temporizadorCarpeta) clearTimeout(temporizadorCarpeta);
    
    estadoSincronizacion.update(s => ({ ...s, estado: 'esperando', mensaje: 'Preparando carpeta...' }));

    temporizadorCarpeta = setTimeout(async () => {
        await ejecutarSincronizacionCarpetaLocal();
    }, 5000);
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
        console.log("✅ [CarpetaSync] Archivo cifrado guardado en:", rutaArchivoFinal);

        // 🔥 NUEVO: Actualizamos la fecha local para que el radar sepa que este cambio fue nuestro
        const fechaActual = new Date().toISOString();
        guardandoMetadatosInternos = true;
        await guardarConfig('last_synced_at', fechaActual);
        setTimeout(() => { guardandoMetadatosInternos = false; }, 2000);

        estadoSincronizacion.set({ estado: 'al_dia', mensaje: '¡Carpeta sincronizada!', nubeDispositivo: '', nubeFecha: '' });
        
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
// --- 3. EL RADAR (ESCUCHA LOS CAMBIOS Y DECIDE) ---
// =======================================================

if (typeof window !== 'undefined') {
    // 🔥 NUEVO: Previene la creación de radares múltiples ("fantasmas") durante el modo desarrollo (HMR)
    if (!(window as any).__radarAVisitsIniciado) {
        (window as any).__radarAVisitsIniciado = true;

        let filtroAntiBucle: ReturnType<typeof setTimeout>;

        window.addEventListener('db_local_cambiada', () => {
            if (guardandoMetadatosInternos) {
                console.log("🤫 [SyncStore] Ignorando eco interno.");
                return;
            }

            clearTimeout(filtroAntiBucle);

            filtroAntiBucle = setTimeout(async () => {
                let rutaCarpeta: string | null = null;
                try {
                    rutaCarpeta = await invoke<string | null>('obtener_ruta_sync');
                } catch (e) { rutaCarpeta = null; }

                const sesion = get(sesionApp);
                const sesionActiva = !!(sesion?.isLoggedIn && sesion?.token);

                if (!rutaCarpeta && !sesionActiva) return; // Nada activo, no hacemos nada

                console.log("👂 [SyncStore] Cambio detectado. Disparando métodos activos...");
                
                if (sesionActiva) dispararSincronizacionLocal();
                if (rutaCarpeta) dispararSincronizacionCarpeta();

            }, 1000);
        });

        // Radar pasivo: Revisa la carpeta cada 15 segundos
        setInterval(async () => {
            try {
                if (guardandoMetadatosInternos || get(estadoSincronizacion).estado === 'sincronizando' || radarPausado) return;

                const rutaCarpeta = await invoke<string | null>('obtener_ruta_sync');
                if (!rutaCarpeta) return;

                const separador = rutaCarpeta.includes('/') ? '/' : '\\';
                const rutaArchivoFinal = `${rutaCarpeta}${separador}sincronizacion_global.avisits`;

                const infoArchivo = await stat(rutaArchivoFinal);
                if (infoArchivo && infoArchivo.mtime) {
                    let localUltimaSync = await cargarConfig('last_synced_at') || "1970-01-01T00:00:00.000Z";
                    const tiempoLocal = new Date(localUltimaSync).getTime();
                    const tiempoCarpeta = infoArchivo.mtime.getTime();

                    // 🔥 NUEVO: Aumentamos la tolerancia a 15 segundos para evitar falsos positivos por retrasos de disco o red
                    if (tiempoCarpeta > (tiempoLocal + 15000)) {
                        estadoSincronizacion.set({
                            estado: 'conflicto',
                            mensaje: 'Hay una actualización disponible en la carpeta compartida.',
                            nubeDispositivo: 'Otro dispositivo',
                            nubeFecha: new Date(tiempoCarpeta).toISOString()
                        });
                    }
                }
            } catch (e) {}
        }, 15000);
    }
}

// =======================================================
// --- FUNCIONES AUXILIARES (INTACTAS) ---
// =======================================================

export function resetearEstadoSincronizacion() {
    estadoSincronizacion.set({ estado: 'inactivo', mensaje: '', nubeDispositivo: '', nubeFecha: '' });
}

export async function registrarSubidaManualExitosa(fechaExacta?: string) {
    const fechaActual = fechaExacta || new Date().toISOString();
    
    guardandoMetadatosInternos = true;
    await guardarConfig('last_synced_at', fechaActual);
    setTimeout(() => { guardandoMetadatosInternos = false; }, 2000);
    
    estadoSincronizacion.set({ estado: 'al_dia', mensaje: 'Sincronizado con éxito', nubeDispositivo: '', nubeFecha: '' });
    setTimeout(() => {
        if (get(estadoSincronizacion).estado === 'al_dia') {
            estadoSincronizacion.update(s => ({ ...s, estado: 'inactivo', mensaje: '' }));
        }
    }, 3000);
}

export async function comprobarNubeAlAbrir() {
    // 🛑 1. Respetamos si el usuario le dio a "Ignorar" (Pausa de 10 min)
    if (radarPausado) return;

    let localUltimaSync = await cargarConfig('last_synced_at') || "1970-01-01T00:00:00.000Z";
    const tiempoLocal = new Date(localUltimaSync).getTime();

    // 🌐 2. REVISIÓN INTELIGENTE 1: Servidor Web
    let sesion = get(sesionApp);
    if (!sesion.isLoggedIn || !sesion.token) {
        const tokenGuardado = await cargarConfig('user_token'); 
        if (tokenGuardado) { // 🔥 FÍJATE AQUÍ: Ya no hay "return", solo asignamos si existe
            sesion = { isLoggedIn: true, token: tokenGuardado, correo: sesion.correo || '', verificando: sesion.verificando || false };
            sesionApp.set(sesion);
        }
    }

    if (sesion.isLoggedIn && sesion.token) {
        try {
            const estadoNube = await chequearEstadoNube(sesion.token);
            if (estadoNube && estadoNube.last_synced_at) {
                const fechaNube = new Date(estadoNube.last_synced_at).getTime();

                if (fechaNube > tiempoLocal) {
                    estadoSincronizacion.update(s => ({
                        ...s, estado: 'conflicto', mensaje: 'Hay una actualización disponible en la nube.',
                        nubeDispositivo: estadoNube.last_device || 'Dispositivo desconocido',
                        nubeFecha: estadoNube.last_synced_at
                    }));
                    return; // Si ya detectó conflicto en web, paramos aquí para mostrar el modal
                }
            }
        } catch (error) {
            console.error("Error al comprobar la nube web en el arranque:", error);
        }
    }

    // 📂 3. REVISIÓN INTELIGENTE 2: Carpeta Compartida (Drive/OneDrive)
    try {
        const rutaCarpeta = await invoke<string | null>('obtener_ruta_sync');
        if (rutaCarpeta) {
            const separador = rutaCarpeta.includes('/') ? '/' : '\\';
            const rutaArchivoFinal = `${rutaCarpeta}${separador}sincronizacion_global.avisits`;

            const infoArchivo = await stat(rutaArchivoFinal);
            if (infoArchivo && infoArchivo.mtime) {
                const tiempoCarpeta = infoArchivo.mtime.getTime();

                // Usamos la tolerancia de 15s para evitar falsos positivos por retraso de disco
                if (tiempoCarpeta > (tiempoLocal + 15000)) {
                    estadoSincronizacion.set({
                        estado: 'conflicto',
                        mensaje: 'Hay una actualización disponible en la carpeta compartida.',
                        nubeDispositivo: 'Otro dispositivo',
                        nubeFecha: new Date(tiempoCarpeta).toISOString()
                    });
                }
            }
        }
    } catch (e) {
        // Ignoramos silenciosamente si la carpeta no está configurada o el archivo aún no existe
    }
}