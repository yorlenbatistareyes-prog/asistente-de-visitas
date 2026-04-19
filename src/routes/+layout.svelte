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

  // Importamos los iconos que usaremos
  import { 
    CheckCircle2, Bell, Smartphone, Zap, Info, 
    Database,    // 👈 Para cambios en la base de datos o SQLite
    Download,    // 👈 Para importaciones o descargas
    Save,        // 👈 Para temas de guardado o Backups
    Palette,     // 👈 Para cambios de colores o diseño (UI)
    ShieldCheck, // 👈 Para seguridad o permisos de Android
    Bug,          // 👈 Para cuando arregles un error específico

    DownloadCloud, X
  } from "lucide-svelte";

  let mostrarNovedades = false; 
  // Variables para la actualización automática
  let avisoUpdateVisible = false;
  let updateInfo: any = null;
  let versionActual = "";
  
  // Ahora es un array de objetos
  let cambiosRecientes: { texto: string, tipo: string }[] = [];

  // Diccionario para asignar iconos según el "tipo"
  const iconosMapa: Record<string, any> = {
    correcion: CheckCircle2,
    notificacion: Bell,
    movil: Smartphone,
    mejora: Zap,
    info: Info,
    base_datos: Database, // 👈 Nuevo
    importar: Download,   // 👈 Nuevo
    respaldo: Save,       // 👈 Nuevo
    diseno: Palette,      // 👈 Nuevo
    seguridad: ShieldCheck, // 👈 Nuevo
    error: Bug            // 👈 Nuevo
  };

  const historialCambios: Record<string, { texto: string, tipo: string }[]> = {
    "1.0.36": [
      { texto: "Sistema de actualización de la aplicación añadido. Puede ver el panel de actualización en la sección de configuración.", tipo: "Zap" },
      { texto: "Corregido error por el que no se sincronizaban los cambios en el registro de personas", tipo: "Bug" }
    ]
  };

  async function cerrarNovedades() {
    mostrarNovedades = false;
    await guardarConfig('ultima_version_vista', versionActual);
  }

  onMount(async () => {
    // 1. 💻 LÓGICA DE WINDOWS (Recuperada para el doble clic en PC)
    try {
      const hayArchivo = await invoke<boolean>('hay_archivo_pendiente');
      if (hayArchivo) {
        const archivo = await invoke<string | null>('verificar_archivo_pendiente');
        if (archivo) {
          sessionStorage.setItem('archivoPendiente', archivo);
          goto('/configuracion');
          return; // Detenemos aquí para que Windows cargue el modal inmediatamente
        }
      }
    } catch (e) {
      // Ignorar en silencio si estamos en Android
    }

    // 2. 🕵️ VIGILANTE DEL BUZÓN DE ANDROID
    try {
      // Revisamos si Android dejó el archivo en la caché
      const existeBuzon = await exists('importacion_pendiente.avisits', { baseDir: BaseDirectory.AppCache });
      
      if (existeBuzon) {
        console.log("📂 ¡Buzón detectado desde el Layout! Redirigiendo...");
        // Guardamos la señal para que la página de configuración sepa que debe abrir el modal
        sessionStorage.setItem('archivoPendiente', 'BUZON_ANDROID');
        // Saltamos directo a configuración para que el usuario vea el cartel azul
        goto('/configuracion');
        return;
      }
    } catch (e) {
      // Si falla es porque no es Android o la carpeta no existe aún, lo ignoramos
    }

    // 3. Detección de nueva versión
    try {
      versionActual = await getVersion();
      const ultimaVista = await cargarConfig('ultima_version_vista') || "0.0.0";

      if (versionActual !== ultimaVista) {
        // Buscamos los cambios. Si no hay, ponemos uno por defecto con tipo "info"
        cambiosRecientes = historialCambios[versionActual] || [
          { texto: "Mejoras de estabilidad y corrección de errores.", tipo: "info" }
        ];
        mostrarNovedades = true;
      }
    } catch (e) { 
      console.error("Error en versión:", e); 
    }

    // 4. 🚀 VIGILANTE SILENCIOSO DE ACTUALIZACIONES
    setTimeout(async () => {
      try {
        const info = await verificarActualizacion();
        if (info && info.hayNueva) {
          updateInfo = info;
          avisoUpdateVisible = true;
        }
      } catch (e) {
        // Si falla (por ejemplo, no hay internet), lo ignoramos en completo silencio
      }
    }, 3000); // 3000ms = Espera 3 segundos para no poner lenta la carga inicial de la app
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
      <button class="btn-actualizar-ahora" on:click={irA_Descarga}>
        Instalar
      </button>
      <button class="btn-cerrar-banner" on:click={() => avisoUpdateVisible = false}>
        <X size={18} />
      </button>
    </div>
  </div>
{/if}

<style>
  /* 1. EL MARCO DE LA APP: No se mueve nunca */
  .app-container { 
    display: flex; 
    flex-direction: column; 
    height: 100dvh; /* Altura dinámica para móviles */
    width: 100vw;   /* Ancho exacto de la ventana */
    overflow: hidden; /* 🌟 EVITA EL SCROLL LATERAL DE LAS BARRAS */
    position: relative;
  }

  /* 2. EL CONTENIDO: Es el único que tiene permiso de hacer scroll */
  .main-content { 
    flex: 1; /* Ocupa todo el espacio disponible entre las barras */
    overflow-y: auto; /* Scroll vertical normal */
    overflow-x: auto; /* 🌟 SI ALGO ES MUY ANCHO, EL SCROLL SUCEDE AQUÍ DENTRO */
    background: var(--bg-app); 
    width: 100%;
    box-sizing: border-box;
    
    /* Espacio inferior para que la barra de estado no tape el contenido final */
    padding-bottom: 40px; 
  }

  /* Opcional: Centrado del contenido en pantallas gigantes */
  :global(.main-content > slot) {
    display: block;
    width: 100%;
    max-width: 1600px;
    margin: 0 auto;
  }

  /* Ajustes de padding para el contenido según el dispositivo */
  @media (max-width: 768px) {
    .main-content { padding: 15px 15px 50px 15px; }
  }

  .modal-backdrop-novedades {
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(5px);
    display: flex; justify-content: center; align-items: center; z-index: 10000;
  }
  .novedades-card {
    background: var(--bg-panel); width: 90%; max-width: 400px; padding: 25px; 
    border-radius: 20px; border-top: 6px solid #5c0a1f; text-align: center;
  }
  .badge-version { background: rgba(92, 10, 31, 0.1); color: #5c0a1f; padding: 2px 10px; border-radius: 20px; font-weight: 800; font-size: 0.8rem; }
  .lista-cambios { list-style: none; padding: 0; margin: 20px 0; text-align: left; }
  .lista-cambios li { padding-left: 10px; border-left: 3px solid #10b981; margin-bottom: 8px; font-size: 0.9rem; }
  .btn-entendido { width: 100%; height: 40px; border-radius: 25px; border: none; background: #5c0a1f; color: white; font-weight: 700; cursor: pointer; }

  .lista-cambios { 
    list-style: none; 
    padding: 0; 
    margin: 20px 0; 
    text-align: left; 
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .lista-cambios li { 
    display: flex;
    align-items: flex-start; /* Para que el icono no baje si el texto es largo */
    gap: 12px;
    font-size: 0.95rem; 
    color: var(--text-main); 
  }

  .icono-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    color: #5c0a1f; /* Color vino de tu app */
    background: rgba(92, 10, 31, 0.1);
    padding: 6px;
    border-radius: 8px;
    flex-shrink: 0; /* Evita que el icono se aplaste */
  }

  .lista-cambios li span {
    line-height: 1.4;
    padding-top: 4px;
  }

/* === BANNER FLOTANTE DE ACTUALIZACIÓN === */
  .banner-flotante-update {
    position: fixed;
    bottom: 60px; /* Un poco arriba para que no lo tape la barra de estado */
    right: 20px;
    background: var(--bg-panel);
    border-left: 4px solid #10b981;
    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    border-radius: 12px;
    padding: 12px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    z-index: 9999;
    animation: deslizarArriba 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
  }

  .banner-contenido {
    display: flex;
    align-items: center;
    gap: 12px;
    color: var(--text-main);
    font-size: 0.95rem;
  }

  .icono-banner {
    background: rgba(16, 185, 129, 0.1);
    padding: 8px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .banner-botones {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .btn-actualizar-ahora {
    background: #10b981;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 8px;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.2s;
  }

  .btn-actualizar-ahora:hover {
    background: #059669;
  }

  .btn-cerrar-banner {
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .btn-cerrar-banner:hover {
    color: var(--text-main);
  }

  @keyframes deslizarArriba {
    from { transform: translateY(100px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }

  /* Para que en celulares se vea bien (ancho completo) */
  @media (max-width: 600px) {
    .banner-flotante-update {
      bottom: 80px; /* Más arriba por la barra de navegación en móviles */
      left: 15px;
      right: 15px;
      flex-direction: column;
      align-items: flex-start;
      gap: 15px;
    }
    .banner-botones {
      width: 100%;
      justify-content: space-between;
    }
    .btn-actualizar-ahora {
      flex: 1;
    }
  }
</style>