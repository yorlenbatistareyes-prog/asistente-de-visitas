<script lang="ts">
  import TopBar from '$lib/components/layout/TopBar.svelte';
  import BarraDeEstado from '$lib/components/layout/BarraDeEstado.svelte';
  import '../app.css';
  import { exists, BaseDirectory, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
  import { invoke } from '@tauri-apps/api/core';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  // Importamos getVersion y las funciones de DB
  import { getVersion } from '@tauri-apps/api/app'; 
  import { cargarConfig, guardarConfig } from '$lib/services/db';

  import { verificarActualizacion, irA_Descarga } from '$lib/services/updater';
  
  // 📡 NUEVAS IMPORTACIONES PARA EL RADAR Y EL MODAL GLOBAL
  import { get } from 'svelte/store';
  import { sesionApp } from '$lib/stores/authStore';
  import { estadoSyncWeb, estadoSyncCarpeta, comprobarNubeAlAbrir, pausarRadarTemporalmente } from '$lib/stores/autoSyncStore';
  import { descargarRespaldo, subirRespaldo } from '$lib/services/syncService';
  import { prepararDatosParaSubir, restaurarDatosDeDescarga } from '$lib/services/dbSyncHelper';
  import { stat } from '@tauri-apps/plugin-fs';

  // Importamos los iconos que usaremos (Añadí ServerCrash y UploadCloud para el modal)
  import { 
    CheckCircle2, Bell, Smartphone, Zap, Info, 
    Database, Download, Save, Palette, ShieldCheck, Bug,
    DownloadCloud, X, ServerCrash, UploadCloud
  } from "lucide-svelte";

  // 🔥 NUEVO: Detecta automáticamente cuál de los dos carriles tiene un conflicto
  $: conflictoActivo = $estadoSyncWeb.estado === 'conflicto' ? $estadoSyncWeb : ($estadoSyncCarpeta.estado === 'conflicto' ? $estadoSyncCarpeta : null);

   let mostrarNovedades = false; 
  // Variables para la actualización automática
  let avisoUpdateVisible = false;
  let updateInfo: any = null;
  let versionActual = "";

  // ⚠️ Versión de corte: la reestructuración mayor
  // Los usuarios con versión MENOR a esta verán el aviso de respaldo
  const VERSION_REESTRUCTURACION = "2.0.0";

  // Compara versiones semánticas (ej: "1.0.41" < "1.0.42")
  function versionEsMenor(actual: string, corte: string): boolean {
    const a = actual.split('.').map(Number);
    const b = corte.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
      if ((a[i] || 0) < (b[i] || 0)) return true;
      if ((a[i] || 0) > (b[i] || 0)) return false;
    }
    return false;
  }

  // ¿Debe mostrarse el aviso de respaldo?
  $: mostrarAvisoRespaldo = versionActual && versionEsMenor(versionActual, VERSION_REESTRUCTURACION);

  
  
  let cambiosRecientes: { texto: string, tipo: string }[] = [];

  const iconosMapa: Record<string, any> = {
    correcion: CheckCircle2, notificacion: Bell, movil: Smartphone, mejora: Zap,
    info: Info, base_datos: Database, importar: Download, respaldo: Save,
    diseno: Palette, seguridad: ShieldCheck, error: Bug 
  };

  const historialCambios: Record<string, { texto: string, tipo: string }[]> = {
    "2.0.4": [
      { texto: "Se corrigieron errores de sincronización", tipo: "Zap" },
      
    ]
  };

  // 🛡️ VARIABLES DEL MODAL GLOBAL DE CONFLICTO
  let procesandoConflicto = false;

  async function cerrarNovedades() {
    mostrarNovedades = false;
    await guardarConfig('ultima_version_vista', versionActual);
  }

// 🛡️ RESOLUCIÓN INTELIGENTE CON PUENTE DE MEMORIA
  async function resolverDescargando() {
    if (!conflictoActivo) return;
    procesandoConflicto = true;
    
    const storeActual = conflictoActivo.origenConflicto === 'web' ? estadoSyncWeb : estadoSyncCarpeta;
    storeActual.update(s => ({ ...s, estado: 'sincronizando', mensaje: 'Descargando datos...' }));

    try {
      if (conflictoActivo.origenConflicto === 'carpeta') {
        // --- 📂 RESOLVER CARPETA LOCAL ---
        const rutaCarpeta = await invoke<string>('obtener_ruta_sync');
        if (!rutaCarpeta) throw new Error("No hay ruta de carpeta configurada.");
        const separador = rutaCarpeta.includes('/') ? '/' : '\\';
        const rutaArchivoFinal = `${rutaCarpeta}${separador}sincronizacion_global.avisits`;

        const paqueteCifrado = await readTextFile(rutaArchivoFinal);
        const llave = await cargarConfig('llave_carpeta_sync');

        await invoke('importar_db_encriptada_global', { paqueteBase64: paqueteCifrado, llaveBase64: llave });

        const infoArchivo = await stat(rutaArchivoFinal);
        const tiempoBase = infoArchivo && infoArchivo.mtime ? infoArchivo.mtime.getTime() : Date.now();
        localStorage.setItem('post_update_folder', new Date(tiempoBase + 5000).toISOString());

      } else if (conflictoActivo.origenConflicto === 'web') {
        // --- 🌐 RESOLVER SERVIDOR WEB ---
        const sesion = get(sesionApp);
        const datosNube = await descargarRespaldo(sesion.token);
        const datosParseados = typeof datosNube.backup.backup_data === 'string' 
            ? JSON.parse(datosNube.backup.backup_data) : datosNube.backup.backup_data;

        await restaurarDatosDeDescarga(datosParseados);

        const tiempoNube = new Date(datosNube.backup.last_synced_at).getTime();
        localStorage.setItem('post_update_web', new Date(tiempoNube + 5000).toISOString());
      }

      await new Promise(resolve => setTimeout(resolve, 500)); 
      storeActual.update(s => ({ ...s, estado: 'al_dia', mensaje: '¡Datos restaurados!' }));
      setTimeout(() => window.location.reload(), 2000);

    } catch (e) {
      console.error(e);
      storeActual.update(s => ({ ...s, estado: 'error', mensaje: 'Fallo al descargar' }));
      procesandoConflicto = false;
    }
  }

  async function resolverForzandoSubida() {
    if (!conflictoActivo) return;
    procesandoConflicto = true;
    
    const storeActual = conflictoActivo.origenConflicto === 'web' ? estadoSyncWeb : estadoSyncCarpeta;
    storeActual.update(s => ({ ...s, estado: 'sincronizando', mensaje: 'Forzando subida...' }));

    try {
      const fechaActual = new Date().toISOString();

      if (conflictoActivo.origenConflicto === 'web') {
        const sesion = get(sesionApp);
        if (sesion && sesion.isLoggedIn && sesion.token) {
          const jsonDatos = await prepararDatosParaSubir();
          await subirRespaldo(sesion.token, jsonDatos, fechaActual);
          await guardarConfig('last_synced_web', fechaActual);
        }
      } else if (conflictoActivo.origenConflicto === 'carpeta') {
        const rutaCarpeta = await invoke<string | null>('obtener_ruta_sync');
        if (rutaCarpeta) {
          const llave = await cargarConfig('llave_carpeta_sync');
          const paqueteCifrado = await invoke<string>('exportar_db_encriptada_global', { llaveBase64: llave });
          const separador = rutaCarpeta.includes('/') ? '/' : '\\';
          await writeTextFile(`${rutaCarpeta}${separador}sincronizacion_global.avisits`, paqueteCifrado);
          await guardarConfig('last_synced_folder', fechaActual);
        }
      }

      storeActual.update(s => ({ ...s, estado: 'al_dia', mensaje: '¡Datos sobrescritos con éxito!' }));
      setTimeout(() => storeActual.update(s => ({ ...s, estado: 'inactivo', mensaje: '' })), 3000);

    } catch (e) {
      console.error(e);
      storeActual.update(s => ({ ...s, estado: 'error', mensaje: 'Fallo al subir' }));
    } finally {
      procesandoConflicto = false;
    }
  }

 onMount(() => { // 🔥 ELIMINAMOS EL 'async' DE AQUÍ
    
    // 🔥 ENVOLVEMOS TODA LA LÓGICA ASÍNCRONA EN ESTA FUNCIÓN
    async function inicializarAsincrono() {
     // 🔥 LA CURA DEL BUCLE: Revisamos si venimos de un reinicio por descarga
      const fechaCarpetaPendiente = localStorage.getItem('post_update_folder');
      if (fechaCarpetaPendiente) {
        await guardarConfig('last_synced_folder', fechaCarpetaPendiente);
        localStorage.removeItem('post_update_folder');
      }

      const fechaWebPendiente = localStorage.getItem('post_update_web');
      if (fechaWebPendiente) {
        await guardarConfig('last_synced_web', fechaWebPendiente);
        localStorage.removeItem('post_update_web');
      }
      
      // 1. 💻 LÓGICA DE WINDOWS
      try {
        const hayArchivo = await invoke<boolean>('hay_archivo_pendiente');
        if (hayArchivo) {
          const archivo = await invoke<string | null>('verificar_archivo_pendiente');
          if (archivo) {
            sessionStorage.setItem('archivoPendiente', archivo);
            goto('/configuracion');
            return;
          }
        }
      } catch (e) {}

      // 2. 🕵️ VIGILANTE DEL BUZÓN DE ANDROID
      try {
        const existeBuzon = await exists('importacion_pendiente.avisits', { baseDir: BaseDirectory.AppCache });
        if (existeBuzon) {
          sessionStorage.setItem('archivoPendiente', 'BUZON_ANDROID');
          goto('/configuracion');
          return;
        }
      } catch (e) {}

      // 3. Detección de nueva versión
      try {
        versionActual = await getVersion();
        const ultimaVista = await cargarConfig('ultima_version_vista') || "1.0.41";
        if (versionActual !== ultimaVista) {
          cambiosRecientes = historialCambios[versionActual] || [
            { texto: "Mejoras de estabilidad en sincronización y corrección de errores.", tipo: "info" }
          ];
          mostrarNovedades = true;
        }
      } catch (e) { console.error("Error en versión:", e); }
    }

    // 🚀 EJECUTAMOS LA FUNCIÓN (esto evita el error de TypeScript)
    inicializarAsincrono();

    // 4. 🚀 VIGILANTE SILENCIOSO DE ACTUALIZACIONES
    setTimeout(async () => {
      try {
        const info = await verificarActualizacion();
        if (info && info.hayNueva) {
          updateInfo = info;
          avisoUpdateVisible = true;
        }
      } catch (e) {}
    }, 3000); 

    // 5. 📡 EL RADAR DE LA NUBE (Espera uniforme de 3 segundos)
    let ultimaComprobacion = 0;
    let motorListo = false; // 🛡️ Candado para evitar que los eventos se roben el intento inicial

    async function ejecutarComprobacion() {
      const ahora = Date.now();
      // Si han pasado menos de 30 segundos desde el último intento, lo ignoramos
      if (ahora - ultimaComprobacion < 30000) return;
      
      // Actualizamos el reloj de la última comprobación AQUÍ
      ultimaComprobacion = ahora; 
      await comprobarNubeAlAbrir();
    }

    // 1. Damos 3 segundos de respiro parejo a todos los dispositivos para inicializar SQLite
    setTimeout(() => {
      motorListo = true; // Abrimos el candado
      ejecutarComprobacion(); // Hacemos la primera comprobación real
    }, 3000);

    const onFocus = () => {
      if (motorListo) ejecutarComprobacion();
    };
    
    const onVisibility = () => {
      if (motorListo && document.visibilityState === 'visible') {
        ejecutarComprobacion();
      }
    };

    // Activamos los escuchadores (ELIMINADA LA DB)
    window.addEventListener('focus', onFocus);
    window.addEventListener('visibilitychange', onVisibility);

    // 🔥 LIMPIEZA VITAL PARA MODO DEV (HMR)
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('visibilitychange', onVisibility);
    };
  }); // <-- Fin del onMount

</script>

<div class="app-container">
  <TopBar />
  
  <main class="main-content">
    <slot />
  </main>

  <BarraDeEstado />
</div>

{#if mostrarNovedades}
  <div class="modal-backdrop-novedades">
    <div class="novedades-card">
      <h2>¡Actualización Instalada! 🎉</h2>
      <span class="badge-version">Versión {versionActual}</span>
      
      <ul class="lista-cambios">
        {#each cambiosRecientes as cambio}
          <li>
            <div class="icono-wrapper">
              <svelte:component this={iconosMapa[cambio.tipo] || Info} size={18} />
            </div>
            <span>{cambio.texto}</span>
          </li>
        {/each}
      </ul>
      
      <button class="btn-entendido" on:click={cerrarNovedades}>¡Excelente!</button>
    </div>
  </div>
{/if}

{#if avisoUpdateVisible}
  <div class="banner-flotante-update">
    <div class="banner-contenido">
      <div class="icono-banner">
        <DownloadCloud size={20} color="#10b981" />
      </div>
      <div class="banner-texto">
        <span>¡Hay una nueva versión <strong>v{updateInfo.version}</strong> disponible!</span>
        
        {#if mostrarAvisoRespaldo}
          <span class="aviso-backup">
            💡 Recomendamos hacer un respaldo antes de actualizar. Ve a <strong>Configuración → Respaldos</strong>.
          </span>
        {/if}
      </div>
    </div>
    <div class="banner-botones">
      <button class="btn-actualizar-ahora" on:click={irA_Descarga}>Instalar</button>
      <button class="btn-cerrar-banner" on:click={() => avisoUpdateVisible = false}>
        <X size={18} />
      </button>
    </div>
  </div>
{/if}

{#if conflictoActivo}
  <div class="modal-backdrop-global">
    <div class="card-global modal-content conflicto-modal">
      <div class="modal-header-alerta">
        <ServerCrash size={28} color="#ef4444" />
        <h2>¡Nuevos datos detectados ({conflictoActivo.origenConflicto === 'web' ? 'Nube' : 'Carpeta'})!</h2>
      </div>
      
      <p class="alerta-texto">
        <strong>{conflictoActivo.mensaje}</strong><br>
        ¿Deseas descargar esta copia y reemplazar tus datos actuales? Si continúas sin actualizar, podrías sobrescribir el trabajo de otro dispositivo.
      </p>
      
      <div class="info-nube-box">
        <p><strong>Subido por:</strong> {conflictoActivo.nubeDispositivo}</p>
        <p><strong>Fecha:</strong> {new Date(conflictoActivo.nubeFecha).toLocaleString()}</p>
      </div>

      <p class="alerta-pregunta">¿Qué deseas hacer?</p>

      <div class="modal-actions-column">
        <button class="btn-global btn-descargar-nube" on:click={resolverDescargando} disabled={procesandoConflicto}>
          <DownloadCloud size={20} />
          <span>Descargar y sobrescribir esta app (Recomendado)</span>
        </button>
        
        <button class="btn-global btn-forzar-subida" on:click={resolverForzandoSubida} disabled={procesandoConflicto}>
          <UploadCloud size={20} />
          <span>Ignorar y forzar la subida de mis datos locales</span>
        </button>

        <button class="btn-ignorar-sutil" on:click={pausarRadarTemporalmente} disabled={procesandoConflicto}>
           <X size={16} />
           <span>Ignorar por ahora (Pausar alertas)</span>
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  /* 1. EL MARCO DE LA APP */
  .app-container { display: flex; flex-direction: column; height: 100dvh; width: 100vw; overflow: hidden; position: relative; }

  /* 2. EL CONTENIDO */
  .main-content { flex: 1; overflow-y: auto; overflow-x: auto; background: var(--bg-app); width: 100%; box-sizing: border-box; padding-bottom: 40px; }

  :global(.main-content > slot) { display: block; width: 100%; max-width: 1600px; margin: 0 auto; }

  @media (max-width: 768px) { .main-content { padding: 15px 15px 50px 15px; } }

  /* --- MODAL DE NOVEDADES --- */
  .modal-backdrop-novedades { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(5px); display: flex; justify-content: center; align-items: center; z-index: 10000; }
  .novedades-card { background: var(--bg-panel); width: 90%; max-width: 400px; padding: 25px; border-radius: 20px; border-top: 6px solid #5c0a1f; text-align: center; }
  .badge-version { background: rgba(92, 10, 31, 0.1); color: #5c0a1f; padding: 2px 10px; border-radius: 20px; font-weight: 800; font-size: 0.8rem; }
  .lista-cambios { list-style: none; padding: 0; margin: 20px 0; text-align: left; display: flex; flex-direction: column; gap: 15px; }
  .lista-cambios li { display: flex; align-items: flex-start; gap: 12px; font-size: 0.95rem; color: var(--text-main); }
  .icono-wrapper { display: flex; align-items: center; justify-content: center; color: #5c0a1f; background: rgba(92, 10, 31, 0.1); padding: 6px; border-radius: 8px; flex-shrink: 0; }
  .lista-cambios li span { line-height: 1.4; padding-top: 4px; }
  .btn-entendido { width: 100%; height: 40px; border-radius: 25px; border: none; background: #5c0a1f; color: white; font-weight: 700; cursor: pointer; }

  /* --- BANNER DE UPDATE --- */
  .banner-flotante-update { position: fixed; bottom: 60px; right: 20px; background: var(--bg-panel); border-left: 4px solid #10b981; box-shadow: 0 10px 25px rgba(0,0,0,0.2); border-radius: 12px; padding: 12px 20px; display: flex; align-items: center; justify-content: space-between; gap: 20px; z-index: 9999; animation: deslizarArriba 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
  .banner-contenido { display: flex; align-items: center; gap: 12px; color: var(--text-main); font-size: 0.95rem; }
  
    .banner-texto {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .aviso-backup {
    font-size: 0.78rem;
    color: var(--text-muted);
    line-height: 1.3;
  }

  .aviso-backup strong {
    color: #f59e0b;
    font-weight: 700;
  }
  
  .icono-banner { background: rgba(16, 185, 129, 0.1); padding: 8px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
  .banner-botones { display: flex; align-items: center; gap: 10px; }
  .btn-actualizar-ahora { background: #10b981; color: white; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 700; cursor: pointer; transition: background 0.2s; }
  .btn-actualizar-ahora:hover { background: #059669; }
  .btn-cerrar-banner { background: transparent; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; display: flex; align-items: center; justify-content: center; }
  .btn-cerrar-banner:hover { color: var(--text-main); }
  @keyframes deslizarArriba { from { transform: translateY(100px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  @media (max-width: 600px) { .banner-flotante-update { bottom: 80px; left: 15px; right: 15px; flex-direction: column; align-items: flex-start; gap: 15px; } .banner-botones { width: 100%; justify-content: space-between; } .btn-actualizar-ahora { flex: 1; } }

  /* --- MODAL GLOBAL DE CONFLICTO DE NUBE --- */
  .modal-backdrop-global { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(4px); display: flex; justify-content: center; align-items: center; z-index: 10000; padding: 20px; }
  .conflicto-modal { border-top: 5px solid #ef4444; background: var(--bg-panel); border-radius: var(--radius-lg); padding: 35px; width: 100%; max-width: 500px; animation: scaleIn 0.2s ease-out; box-shadow: var(--shadow-3d); }
  .modal-header-alerta { display: flex; align-items: center; gap: 12px; margin-bottom: 15px; }
  .modal-header-alerta h2 { margin: 0; color: #ef4444; font-size: 1.4rem; font-weight: 800; }
  .alerta-texto { color: var(--text-main); font-size: 0.95rem; margin-bottom: 15px; line-height: 1.5; }
  .info-nube-box { background: rgba(239, 68, 68, 0.05); border: 1px dashed rgba(239, 68, 68, 0.4); border-radius: 8px; padding: 15px; margin-bottom: 20px; }
  .info-nube-box p { margin: 5px 0; color: var(--text-main); font-size: 0.9rem; }
  .alerta-pregunta { font-weight: 700; color: var(--text-main); margin-bottom: 15px; }
  .modal-actions-column { display: flex; flex-direction: column; gap: 10px; }
  .btn-descargar-nube { background: #3b82f6; color: white; border: none; display: flex; justify-content: flex-start; gap: 15px; padding: 16px; font-weight: 700; text-align: left; border-radius: 8px; cursor: pointer; transition: transform 0.2s; }
  .btn-descargar-nube:hover:not(:disabled) { background: #2563eb; transform: translateY(-1px); }
  .btn-forzar-subida { background: transparent; color: #ef4444; border: 1px solid #ef4444; display: flex; justify-content: flex-start; gap: 15px; padding: 16px; font-weight: 700; text-align: left; border-radius: 8px; cursor: pointer; }
  .btn-forzar-subida:hover:not(:disabled) { background: rgba(239, 68, 68, 0.1); }
  @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }

  .btn-ignorar-sutil {
   background: transparent;
   color: #94a3b8; /* Gris suave */
   border: none;
   display: flex;
   justify-content: center;
   gap: 8px;
   padding: 10px;
   font-size: 0.85rem;
   cursor: pointer;
   margin-top: 5px;
}
.btn-ignorar-sutil:hover {
   color: #64748b;
   text-decoration: underline;
}

</style>