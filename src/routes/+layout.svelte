<script lang="ts">
  import TopBar from '$lib/components/layout/TopBar.svelte';
  import BarraDeEstado from '$lib/components/layout/BarraDeEstado.svelte';
  import '../app.css';
  
  import { onMount } from 'svelte';
  import { getCurrentWindow } from '@tauri-apps/api/window';
  import { readFile, writeFile, BaseDirectory } from '@tauri-apps/plugin-fs';
  import { cargarConfig, guardarConfig } from '$lib/services/db';

  onMount(() => {
    const appWindow = getCurrentWindow();

    // Guardamos la promesa del interceptor
    const unlistenPromise = appWindow.onCloseRequested(async (event) => {
      
      // 1. Ponemos el freno de mano
      event.preventDefault();

      try {
        const autoExp = await cargarConfig('autoExportar');
        const ruta = await cargarConfig('rutaSincronizacion');

        // 2. Si la casilla está marcada y hay ruta, HACE LA COPIA
        if (autoExp === 'true' && ruta && ruta.trim() !== "") {
          console.log("Iniciando auto-guardado...");
          
          const separador = ruta.includes('\\') ? '\\' : '/';
          const barra = ruta.endsWith(separador) ? '' : separador;
          const rutaFinal = `${ruta}${barra}av_sync_backup.db`;

          const dbBytes = await readFile('av_database.db', { baseDir: BaseDirectory.AppLocalData });
          await writeFile(rutaFinal, dbBytes);

          const fecha = new Date().toLocaleString();
          await guardarConfig('ultimaExportacion', fecha);
          
          console.log("Auto-guardado exitoso.");
        }
      } catch (error) {
        console.error("Error en auto-guardado:", error);
      } finally {
        // 3. Quitamos el freno de mano
        unlistenPromise.then(unlisten => unlisten());
        
        // 4. Cerramos la ventana (¡Ahora sí tiene permiso para hacerlo en 1 solo clic!)
        await appWindow.close();
      }
    });

    return () => {
      unlistenPromise.then(unlisten => unlisten());
    };
  });
</script>

<div class="app-container">
  <TopBar />
  
  <main class="main-content">
    <slot />
  </main>

  <BarraDeEstado />

</div>

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
</style>