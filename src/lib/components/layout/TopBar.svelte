<script lang="ts">
  import { Settings, Home, Monitor, Sun, Moon, RefreshCw, HelpCircle } from "lucide-svelte";
  import { createEventDispatcher, onMount } from 'svelte';
  import { currentTheme, applyTheme, type Theme } from '$lib/stores/themeStore';
  import { goto } from '$app/navigation';

  // --- HERRAMIENTAS DE SINCRONIZACIÓN ---
  import { stat, readFile, writeFile, BaseDirectory } from '@tauri-apps/plugin-fs';
  import { message as messageDialog, confirm as confirmDialog } from '@tauri-apps/plugin-dialog';
  import { cargarConfig, guardarConfig } from '$lib/services/db';

  const dispatch = createEventDispatcher();

  // --- VARIABLES DE SINCRONIZACIÓN ---
  let rutaSync = "";
  let isSyncing = false; // Controla la animación

  // 🌟 LÓGICA DE SINCRONIZACIÓN INTELIGENTE (VERSIÓN BLINDADA Y SIN ERRORES TS)
  async function ejecutarSincronizacionInteligente() {
    if (!rutaSync) return;
    isSyncing = true; // Empieza la animación de giro

    try {
      const separador = rutaSync.includes('\\') ? '\\' : '/';
      const barra = rutaSync.endsWith(separador) ? '' : separador;
      const rutaFinal = `${rutaSync}${barra}av_sync_backup.db`;

      // 1. Verificar si existe en la nube
      let cloudStat: any = null; // <-- TS FIX
      try { cloudStat = await stat(rutaFinal); } catch(e) {}

      if (!cloudStat) {
        // ESCENARIO A: Primera exportación
        const localBytes = await readFile('av_database.db', { baseDir: BaseDirectory.AppLocalData });
        await writeFile(rutaFinal, localBytes);
        await guardarConfig('ultimaExportacion', new Date().toLocaleString());
        await messageDialog("Se ha creado la primera copia de seguridad en tu carpeta.", { title: "Sincronizado", kind: "info" });
      } else {
        // 2. 🌟 RAYOS X: Leer AMBOS archivos para compararlos byte por byte
        const localBytes = await readFile('av_database.db', { baseDir: BaseDirectory.AppLocalData });
        const cloudBytes = await readFile(rutaFinal);

        // Comparamos si su peso y su contenido son exactamente iguales
        let sonIdenticos = false;
        if (localBytes.length === cloudBytes.length) {
        // Tipamos los parámetros para eliminar el error de TypeScript
        sonIdenticos = localBytes.every((val: number, index: number) => val === cloudBytes[index]);
        }

        // Si el contenido es el mismo, cortamos el proceso aquí (adiós bucle infinito)
        if (sonIdenticos) {
          await messageDialog("Tus datos ya están completamente sincronizados y al día.", { title: "Todo en orden", kind: "info" });
          isSyncing = false;
          return;
        }

        // 3. Si NO son idénticos, miramos la fecha para saber cuál cambió
        const localStat = await stat('av_database.db', { baseDir: BaseDirectory.AppLocalData });
        
        // <-- TS FIX: Le decimos qué hacer si la fecha viene vacía
        const localTime = localStat.mtime ? new Date(localStat.mtime).getTime() : 0;
        const cloudTime = cloudStat.mtime ? new Date(cloudStat.mtime).getTime() : 0;

        if (cloudTime > localTime) {
          // ESCENARIO B: La nube es más nueva
          const resp = await confirmDialog("Hay datos más recientes en tu carpeta compartida. ¿Deseas importarlos a este equipo?", { title: "Actualización detectada", kind: "info" });
          if (resp) {
            await writeFile('av_database.db', cloudBytes, { baseDir: BaseDirectory.AppLocalData });
            await guardarConfig('ultimaImportacion', new Date().toLocaleString());
            await messageDialog("Datos importados correctamente. La aplicación se reiniciará.", { title: "Éxito", kind: "info" });
            window.location.reload();
          }
        } else {
          // ESCENARIO C: Tu PC es más nueva
          await writeFile(rutaFinal, localBytes);
          await guardarConfig('ultimaExportacion', new Date().toLocaleString());
          await messageDialog("Tus cambios recientes se han guardado en la carpeta de sincronización.", { title: "Sincronizado", kind: "info" });
        }
      }
    } catch (error) {
      console.error("Error en sincronización inteligente:", error);
      await messageDialog("Ocurrió un error al intentar sincronizar. Revisa que la carpeta exista.", { title: "Error", kind: "error" });
    } finally {
      isSyncing = false; // Detiene el giro
    }
  }

  // Función para rotar entre los 3 estados: Sistema -> Claro -> Oscuro
  function cambiarTema() {
    currentTheme.update(t => {
      let nuevo: Theme = t === 'system' ? 'light' : t === 'light' ? 'dark' : 'system';
      applyTheme(nuevo);
      return nuevo;
    });
  }

  // Aseguramos que el tema se aplique al iniciar la app
  onMount(() => {
    const unsubscribe = currentTheme.subscribe(t => applyTheme(t));
    // Carga la ruta de sincronización
    cargarConfig('rutaSincronizacion').then(ruta => rutaSync = ruta || "");
    return unsubscribe;
  });
</script>

<header class="topbar-container" data-tauri-drag-region>
  <div class="background-layers">
    <div class="white-row"></div>
    <div class="gray-row"></div>
  </div>

  <div class="content-overlay">
    <div class="logo-box">AV</div>
    
    <div class="info-area">
      <div class="text-group">
        <h1>Asistente de Visitas</h1>
        <p>Documenta todas tus visitas</p>
      </div>

      <div class="right-actions">
        <button class="top-btn" on:click={() => goto('/')}>
          <Home size={16} /> <span>Inicio</span>
        </button>

        {#if rutaSync}
          <button class="icon-btn {isSyncing ? 'syncing' : ''}" on:click={ejecutarSincronizacionInteligente} title="Sincronizar datos">
            <RefreshCw size={18} />
          </button>
        {/if}

        <button class="icon-btn" on:click={cambiarTema} title="Cambiar tema">
          {#if $currentTheme === 'system'}
            <Monitor size={18} />
          {:else if $currentTheme === 'light'}
            <Sun size={18} />
          {:else}
            <Moon size={18} />
          {/if}
        </button>

        <button class="icon-btn" on:click={() => goto('/configuracion')}>
           <Settings size={18} />
        </button>

        <button class="icon-btn" on:click={() => goto('/ayuda')} title="Centro de Ayuda">
           <HelpCircle size={18} />
        </button>
        
      </div>
    </div>
  </div>
</header>

<style>
  /* =============================================
     ESTRUCTURA PRINCIPAL (Elástica)
     ============================================= */
  .topbar-container {
    position: relative;
    width: calc(100% - 30px);
    min-height: 100px; /* Cambiado de height a min-height para que pueda crecer */
    margin: 10px auto 0 auto;
    border-radius: 12px 12px 0 0;
    overflow: hidden;
    box-shadow: var(--shadow-md);
    z-index: 100;
  }

  .background-layers {
    position: absolute;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .white-row {
    background: var(--bg-panel);
    flex: 1; /* Esto hace magia: rellena todo el espacio por encima de la franja gris automáticamente */
  }

  .gray-row {
    background: #373737;
    height: 35px;
    flex-shrink: 0; /* Obligamos a que la franja gris siempre mida 35px, pase lo que pase */
  }

  :global(.dark) .gray-row {
    background: #111827;
  }

  .content-overlay {
    position: relative;
    display: flex;
    align-items: flex-start; /* Evita que los elementos se estiren verticalmente */
    width: 100%;
    z-index: 2;
  }

  .logo-box {
    background: var(--primary);
    color: white;
    width: 85px;
    height: 82px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2.5rem;
    font-weight: 600;
    flex-shrink: 0;
  }

  /* La zona de información empujará el contenedor */
  .info-area {
    flex: 1;
    min-height: 65px; /* Altura mínima de la zona blanca */
    display: flex;
    align-items: center;
    padding: 10px 20px;
    justify-content: space-between;
    box-sizing: border-box;
    gap: 15px;
    margin-bottom: 35px; /* ¡CLAVE! Reserva el espacio exacto para la franja gris de abajo */
  }

  .text-group {
    display: flex;
    flex-direction: column;
    justify-content: center;
    flex: 1;
    min-width: 0;
    line-height: 1.2;
  }

  .text-group h1 {
    margin: 0;
    font-size: 1.4rem;
    color: var(--text-main);
    font-weight: 800;
    white-space: normal;
    word-wrap: break-word; /* Si una palabra es muy larga, la rompe seguro */
    line-height: 1.2;
  }

  .text-group p,

  .right-actions {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  }

  .top-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    background: var(--bg-panel);
    border: 1px solid var(--border-color);
    padding: 6px 14px;
    border-radius: 8px;
    color: var(--text-main);
    font-weight: 600;
    font-size: 0.85rem;
    cursor: pointer;
    transition: 0.2s;
    white-space: nowrap;
  }

  .top-btn:hover {
    background: var(--bg-app);
    border-color: var(--primary);
  }

  .icon-btn {
    background: none;
    border: 1px solid transparent;
    cursor: pointer;
    color: var(--text-muted);
    padding: 8px;
    border-radius: 50%;
    display: flex;
    transition: 0.2s;
  }

  .icon-btn:hover {
    background: var(--bg-app);
    color: var(--primary);
  }

  /* =============================================
     RESPONSIVE: ajustes para tablets y móviles
     ============================================= */

  /* Tablets (hasta 1024px) */
  @media (max-width: 1024px) {
    .topbar-container {
      width: calc(100% - 20px);
    }
    .info-area {
      padding: 10px 15px;
    }
    .text-group h1 {
      font-size: 1.3rem;
    }
  }

  /* Móviles (hasta 768px) */
  @media (max-width: 768px) {
    .topbar-container {
      width: 100%;
      margin: 0;
      border-radius: 0;
      min-height: 85px; /* Reducimos la altura base en móviles */
    }
    
    .logo-box {
      width: 70px;
      height: 70px; /* Logo más pequeño */
      font-size: 1.8rem;
    }

    .info-area {
      padding: 10px 12px;
      min-height: 50px;
      margin-bottom: 35px; /* Mantenemos el margen para la franja gris */
      gap: 10px;
    }

    .text-group h1 {
      font-size: 1.15rem;
    }
    
    .text-group p,


    .top-btn span {
      display: none; /* Ocultamos la palabra "Inicio", dejamos solo el icono */
    }
    
    .top-btn {
      padding: 8px;
      border-radius: 50%; /* Convertimos el botón Inicio en un círculo como los demás */
    }
    
    .icon-btn {
      padding: 8px;
    }
  }

  /* Móviles pequeños (hasta 480px) */
  @media (max-width: 480px) {
    .logo-box {
      width: 55px;
      height: 55px;
      font-size: 1.4rem;
    }
    
    .info-area {
      padding: 8px 10px;
      gap: 5px;
    }

    .text-group h1 {
      font-size: 1.05rem;
    }
    
    .right-actions {
      gap: 4px; /* Juntamos un poquito más los botones */
    }
  }

  /* =============================================
     ESTILOS DE SINCRONIZACIÓN
     ============================================= */
  .icon-btn.syncing {
    color: #3b82f6; /* Se vuelve Azul brillante para indicar actividad */
    pointer-events: none; /* Bloquea el botón para evitar doble clic */
  }

  .icon-btn.syncing :global(svg) {
    animation: spin 1s linear infinite; /* Animación de giro */
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
</style>