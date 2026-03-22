<script lang="ts">
  import TopBar from '$lib/components/layout/TopBar.svelte';
  import BarraDeEstado from '$lib/components/layout/BarraDeEstado.svelte';
  import '../app.css';
  
  import { onMount } from 'svelte';
  import { getCurrentWindow } from '@tauri-apps/api/window';
  import { readFile, writeFile, BaseDirectory } from '@tauri-apps/plugin-fs';
  import { confirm as confirmDialog } from '@tauri-apps/plugin-dialog'; // 🌟 Importamos el diálogo
  import { cargarConfig, guardarConfig } from '$lib/services/db';

  onMount(() => {
    const appWindow = getCurrentWindow();

    // Guardamos la promesa del interceptor
    const unlistenPromise = appWindow.onCloseRequested(async (event) => {
      
      // 1. Ponemos el freno de mano inicial
      event.preventDefault();
      
      let deberiaCerrar = true; // Por defecto, asumimos que todo saldrá bien

      try {
        const autoExp = await cargarConfig('autoExportar');
        const ruta = await cargarConfig('rutaSincronizacion');

        // 2. Si la casilla está marcada y hay ruta, INTENTA HACER LA COPIA
        if (autoExp === 'true' && ruta && ruta.trim() !== "") {
          console.log("Iniciando auto-guardado...");
          
          const separador = ruta.includes('\\') ? '\\' : '/';
          const barra = ruta.endsWith(separador) ? '' : separador;
          const rutaFinal = `${ruta}${barra}av_sync_backup.db`;

          try {
            // Intentamos leer y escribir
            const dbBytes = await readFile('av_database.db', { baseDir: BaseDirectory.AppLocalData });
            await writeFile(rutaFinal, dbBytes);

            // Si llegamos aquí, fue un éxito
            const fecha = new Date().toLocaleString();
            await guardarConfig('ultimaExportacion', fecha);
            console.log("Auto-guardado exitoso.");

          } catch (errorGuardado) {
            // 🚨 ¡FALLO DE ESCRITURA! (Carpeta borrada, USB desconectada, sin internet, etc.)
            console.error("Fallo al escribir en la ruta de sync:", errorGuardado);
            deberiaCerrar = false; // Activamos el Modo Seguro
          }
        }
      } catch (errorGeneral) {
        console.error("Error comprobando configuración:", errorGeneral);
      } 

      // 3. 🛡️ EL MODO SEGURO: Si falló, le damos la opción al usuario
      if (!deberiaCerrar) {
        const forzarCierre = await confirmDialog(
          "⚠️ NO SE PUDO GUARDAR LA COPIA AUTOMÁTICA.\n\n¿Desconectaste tu memoria USB o borraste la carpeta de sincronización?\n\nSi cierras la aplicación ahora, los cambios que hiciste hoy NO se subirán a la nube.\n\n¿Deseas forzar el cierre de todos modos?",
          { title: "Error Crítico de Sincronización", kind: "warning" }
        );

        if (forzarCierre) {
          deberiaCerrar = true; // El usuario asume el riesgo
        }
      }

      // 4. Cierre definitivo solo si está autorizado
      if (deberiaCerrar) {
        unlistenPromise.then(unlisten => unlisten());
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