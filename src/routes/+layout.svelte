<script lang="ts">
  import TopBar from '$lib/components/layout/TopBar.svelte';
  import BarraDeEstado from '$lib/components/layout/BarraDeEstado.svelte';
  import '../app.css';
  import { invoke } from '@tauri-apps/api/core';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  import { getVersion } from '@tauri-apps/api/app'; 
  import { cargarConfig, guardarConfig } from '$lib/services/db';

  let mostrarNovedades = false; // 👈 Déjalo en false, la lógica lo pondrá en true
  let versionActual = "";
  let cambiosRecientes: string[] = [];

  const historialCambios: Record<string, string[]> = {
    "1.0.14": [
      "✅ Corregida la importación de CSV para congregaciones y personas.",
      "🔔 Añadido sistema de notificaciones para nuevas actualizaciones.",
      "📱 Optimización visual para dispositivos Android."
    ]
  };

  async function cerrarNovedades() {
    mostrarNovedades = false;
    await guardarConfig('ultima_version_vista', versionActual);
  }

  onMount(async () => {
    // 1. Lógica para archivos externos
    try {
      const hayArchivo = await invoke<boolean>('hay_archivo_pendiente');
      if (hayArchivo) {
        const archivo = await invoke<string | null>('verificar_archivo_pendiente');
        if (archivo) {
          sessionStorage.setItem('archivoPendiente', archivo);
          goto('/configuracion');
        }
      }
    } catch (e) { console.error("Error en archivos:", e); }

    // 2. 🌟 Detección de nueva versión (FUERA del bloque anterior)
    try {
      versionActual = await getVersion();
      const ultimaVista = await cargarConfig('ultima_version_vista') || "0.0.0";

      if (versionActual !== ultimaVista) {
        // Buscamos los cambios para la versión detectada
        cambiosRecientes = historialCambios[versionActual] || ["Mejoras de estabilidad y corrección de errores."];
        mostrarNovedades = true;
      }
    } catch (e) { 
      console.error("Error en versión:", e); 
    }
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
          <li>{cambio}</li>
        {/each}
      </ul>
      <button class="btn-entendido" on:click={cerrarNovedades}>¡Excelente!</button>
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
</style>