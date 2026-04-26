<script lang="ts">
  import TopBar from '$lib/components/layout/TopBar.svelte';
  import BarraDeEstado from '$lib/components/layout/BarraDeEstado.svelte';
  import '../app.css';
  import { exists, BaseDirectory } from '@tauri-apps/plugin-fs';
  import { invoke } from '@tauri-apps/api/core';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  // Importamos getVersion y las funciones de DB
  import { getVersion } from '@tauri-apps/api/app'; 
  import { cargarConfig, guardarConfig } from '$lib/services/db';

  import { verificarActualizacion, irA_Descarga } from '$lib/services/updater';

  // 📡 NUEVAS IMPORTACIONES PARA EL RADAR Y EL MODAL GLOBAL
  import { get } from 'svelte/store';
  import { sesionApp, arrancarAplicacion } from '$lib/stores/authStore';
  import { estadoSincronizacion, comprobarNubeAlAbrir } from '$lib/stores/autoSyncStore';
  import { descargarRespaldo, subirRespaldo } from '$lib/services/syncService';
  import { prepararDatosParaSubir, restaurarDatosDeDescarga } from '$lib/services/dbSyncHelper';

  // Importamos los iconos que usaremos (Añadí ServerCrash y UploadCloud para el modal)
  import { 
    CheckCircle2, Bell, Smartphone, Zap, Info, 
    Database, Download, Save, Palette, ShieldCheck, Bug,
    DownloadCloud, X, ServerCrash, UploadCloud
  } from "lucide-svelte";

  let mostrarNovedades = false; 
  // Variables para la actualización automática
  let avisoUpdateVisible = false;
  let updateInfo: any = null;
  let versionActual = "";
  
  let cambiosRecientes: { texto: string, tipo: string }[] = [];

  const iconosMapa: Record<string, any> = {
    correcion: CheckCircle2, notificacion: Bell, movil: Smartphone, mejora: Zap,
    info: Info, base_datos: Database, importar: Download, respaldo: Save,
    diseno: Palette, seguridad: ShieldCheck, error: Bug 
  };

  const historialCambios: Record<string, { texto: string, tipo: string }[]> = {
    "1.0.39": [
      { texto: "Sistema de actualización de la aplicación añadido. Puede ver el panel de actualización en la sección de configuración.", tipo: "Zap" },
      { texto: "Se ha actualizado el nombre de la app que se muestra en la pantalla del dispositivo", tipo: "Bug" }
    ]
  };

  // 🛡️ VARIABLES DEL MODAL GLOBAL DE CONFLICTO
  let procesandoConflicto = false;

  async function cerrarNovedades() {
    mostrarNovedades = false;
    await guardarConfig('ultima_version_vista', versionActual);
  }

  // 🛡️ FUNCIONES PARA RESOLVER EL CONFLICTO DESDE CUALQUIER PANTALLA
  async function resolverDescargando() {
    procesandoConflicto = true;
    estadoSincronizacion.update(s => ({ ...s, estado: 'sincronizando', mensaje: 'Descargando datos...' }));

    try {
      const sesion = get(sesionApp);
      const datosNube = await descargarRespaldo(sesion.token);
      
      const datosParseados = typeof datosNube.backup.backup_data === 'string' 
        ? JSON.parse(datosNube.backup.backup_data) : datosNube.backup.backup_data;

      await restaurarDatosDeDescarga(datosParseados);
      await guardarConfig('last_synced_at', datosNube.backup.last_synced_at); 
      
      estadoSincronizacion.update(s => ({ ...s, estado: 'al_dia', mensaje: '¡Datos actualizados!' }));
      
      // Recargamos la página actual para que la UI refleje los datos nuevos
      setTimeout(() => window.location.reload(), 1500);

    } catch (e) {
      estadoSincronizacion.update(s => ({ ...s, estado: 'error', mensaje: 'Fallo al descargar' }));
      procesandoConflicto = false;
    }
  }

  async function resolverForzandoSubida() {
    procesandoConflicto = true;
    estadoSincronizacion.update(s => ({ ...s, estado: 'sincronizando', mensaje: 'Forzando subida...' }));

    try {
      const sesion = get(sesionApp);
      const jsonDatos = await prepararDatosParaSubir();
      const fechaActual = new Date().toISOString();
      
      await subirRespaldo(sesion.token, jsonDatos, fechaActual);
      await guardarConfig('last_synced_at', fechaActual);
      
      estadoSincronizacion.update(s => ({ ...s, estado: 'al_dia', mensaje: '¡Nube sobrescrita!' }));
      setTimeout(() => estadoSincronizacion.update(s => ({ ...s, estado: 'inactivo', mensaje: '' })), 3000);

    } catch (e) {
      estadoSincronizacion.update(s => ({ ...s, estado: 'error', mensaje: 'Fallo al subir' }));
    } finally {
      procesandoConflicto = false;
    }
  }

  onMount(async () => {
     await arrancarAplicacion();
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
      const ultimaVista = await cargarConfig('ultima_version_vista') || "1.0.46";
      if (versionActual !== ultimaVista) {
        cambiosRecientes = historialCambios[versionActual] || [
          { texto: "Mejoras de estabilidad en sincronización y corrección de errores.", tipo: "info" },
          { texto: "Mejoras visuales de la app en Barra superior y en modales.", tipo: "info" }
        ];
        mostrarNovedades = true;
      }
    } catch (e) { console.error("Error en versión:", e); }

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

    // 5. 📡 EL RADAR DE LA NUBE
    let ultimaComprobacion = 0;

    async function ejecutarComprobacion() {
      const ahora = Date.now();
      // Si han pasado menos de 30 segundos, no comprobamos para no saturar al servidor
      if (ahora - ultimaComprobacion < 30000) return;
      
      ultimaComprobacion = ahora;
      await comprobarNubeAlAbrir();
    }

    // Arranca 1.5s después de abrir la app
    setTimeout(ejecutarComprobacion, 1500);

    // Y también vigila cada vez que la app vuelve a pantalla
    window.addEventListener('focus', ejecutarComprobacion);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        ejecutarComprobacion();
      }
    });
  });
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
      <span>¡Hay una nueva versión <strong>v{updateInfo.version}</strong> disponible!</span>
    </div>
    <div class="banner-botones">
      <button class="btn-actualizar-ahora" on:click={irA_Descarga}>Instalar</button>
      <button class="btn-cerrar-banner" on:click={() => avisoUpdateVisible = false}>
        <X size={18} />
      </button>
    </div>
  </div>
{/if}

{#if $estadoSincronizacion.estado === 'conflicto'}
  <div class="modal-backdrop-global">
    <div class="card-global modal-content conflicto-modal">
      <div class="modal-header-alerta">
        <ServerCrash size={28} color="#ef4444" />
        <h2>¡Nuevos datos detectados!</h2>
      </div>
      
      <p class="alerta-texto">
        Se ha detectado una copia de seguridad de tus datos más reciente en la nube. ¿Deseas descargarla y reemplazar tus datos actuales? Si continúas usando la app sin actualizar, podrías sobrescribir el trabajo de otro dispositivo.
      </p>
      
      <div class="info-nube-box">
        <p><strong>Subido por:</strong> {$estadoSincronizacion.nubeDispositivo}</p>
        <p><strong>Fecha:</strong> {new Date($estadoSincronizacion.nubeFecha).toLocaleString()}</p>
      </div>

      <p class="alerta-pregunta">¿Qué deseas hacer?</p>

      <div class="modal-actions-column">
        <button class="btn-global btn-descargar-nube" on:click={resolverDescargando} disabled={procesandoConflicto}>
          <DownloadCloud size={20} />
          <span>Descargar y sobrescribir esta app (Recomendado)</span>
        </button>
        
        <button class="btn-global btn-forzar-subida" on:click={resolverForzandoSubida} disabled={procesandoConflicto}>
          <UploadCloud size={20} />
          <span>Ignorar la nube y forzar la subida de mis datos locales</span>
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
  .icono-banner { background: rgba(16, 185, 129, 0.1); padding: 8px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
  .banner-botones { display: flex; align-items: center; gap: 10px; }
  .btn-actualizar-ahora { background: #10b981; color: white; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 700; cursor: pointer; transition: background 0.2s; }
  .btn-actualizar-ahora:hover { background: #059669; }
  .btn-cerrar-banner { background: transparent; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; display: flex; align-items: center; justify-content: center; }
  .btn-cerrar-banner:hover { color: var(--text-main); }
  @keyframes deslizarArriba { from { transform: translateY(100px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  @media (max-width: 600px) { .banner-flotante-update { bottom: 80px; left: 15px; right: 15px; flex-direction: column; align-items: flex-start; gap: 15px; } .banner-botones { width: 100%; justify-content: space-between; } .btn-actualizar-ahora { flex: 1; } }

  /* --- MODAL GLOBAL DE CONFLICTO DE NUBE --- */
  .modal-backdrop-global { 
    position: fixed; top: 0; left: 0; 
    width: 100vw; 
    height: 100vh; 
    height: 100dvh; /* Evita problemas con la barra del navegador en móviles */
    background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(4px); 
    display: flex; justify-content: center; align-items: center; 
    z-index: 10000; 
    padding: 20px; 
    box-sizing: border-box; /* 👈 Esto evita que el padding lo empuje a la derecha */
  }

  .conflicto-modal { 
    border-top: 5px solid #ef4444; 
    background: var(--bg-panel); 
    border-radius: var(--radius-lg); 
    padding: 35px; 
    
    /* 👈 Aire a los laterales */
    width: calc(100% - 40px); 
    max-width: 500px; 
    
    /* 👈 Límite de altura y scroll por si la pantalla es muy pequeña */
    max-height: 85dvh;
    overflow-y: auto;
    
    animation: scaleIn 0.2s ease-out; 
    box-shadow: var(--shadow-3d); 
    box-sizing: border-box; /* 👈 Evita que el padding interno desborde la tarjeta */
  }

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

  @media (max-width: 480px) {
    .conflicto-modal { 
      padding: 25px 20px; 
    }
  }

</style>