<!-- src/lib/components/SincronizacionCarpeta.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';
  import { CheckCircle, AlertCircle, Info } from 'lucide-svelte';
  
  // Importamos de la base de datos de AVisits
  import { guardarRutaSync, cargarConfig, guardarConfig, iniciarRestauracion, terminarRestauracion } from '$lib/services/db';
  
  // Importamos el estado visual del radar de la carpeta
  // Importamos el estado visual y el registro seguro
  import { estadoSyncCarpeta, registrarSubidaCarpetaExitosa } from '$lib/stores/autoSyncStore';
  import { esAndroid, seleccionarRutaCarpeta, leerPaqueteSync, escribirPaqueteSync } from '$lib/services/folderSyncPath';

  let rutaCarpeta: string | null = null;
  let guardando = false;

  onMount(async () => {
    try {
      rutaCarpeta = await invoke('obtener_ruta_sync');
    } catch (e) {
      console.log("Aún no hay ruta configurada.");
    }
  });

  // Función para obtener la llave de seguridad (si no existe, la crea)
  async function obtenerOCrearLlave(): Promise<string> {
    let llave = await cargarConfig('llave_carpeta_sync');
    if (!llave) {
        llave = await invoke<string>('generar_llave_invisible');
        await guardarConfig('llave_carpeta_sync', llave);
    }
    return llave;
  }

  async function seleccionarCarpeta() {
    try {
      const seleccion = await seleccionarRutaCarpeta();

      if (seleccion) {
        guardando = true;
        rutaCarpeta = seleccion as string;
        await guardarRutaSync(rutaCarpeta); // Llama a Rust y notifica al radar
        if (esAndroid()) {
          console.log('📱 Android: archivo de sincronización seleccionado:', rutaCarpeta);
        }
        guardando = false;
      }
    } catch (e) {
      console.error(e);
      alert(`No se pudo abrir el selector de carpetas: ${e instanceof Error ? e.message : String(e)}`);
      guardando = false;
    }
  }

  async function desvincular() {
    if (confirm("¿Desvincular esta carpeta? La app dejará de guardar datos aquí.")) {
      rutaCarpeta = null;
      await guardarRutaSync(null);
    }
  }
  
 // Botón MANUAL de subir
  async function sincronizarAhora() {
    if (!rutaCarpeta) return;
    try {
      guardando = true;
      estadoSyncCarpeta.set({ estado: 'sincronizando', mensaje: 'Sincronizando', nubeDispositivo: '', nubeFecha: '', origenConflicto: 'carpeta' });

      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const llave = await obtenerOCrearLlave();
      const paqueteCifrado = await invoke<string>('exportar_db_encriptada_global', { llaveBase64: llave });

      await escribirPaqueteSync(rutaCarpeta, paqueteCifrado);
      
      // 🔥 Usamos el registro seguro que bloquea el eco del radar
      await registrarSubidaCarpetaExitosa();

    } catch (error) {
      console.error("Error al sincronizar y guardar:", error);
      const detalle = error instanceof Error ? error.message : String(error);
      estadoSyncCarpeta.set({ estado: 'error', mensaje: `Error al guardar: ${detalle}`, nubeDispositivo: '', nubeFecha: '', origenConflicto: 'carpeta' });
      setTimeout(() => {
          estadoSyncCarpeta.update(s => ({ ...s, estado: 'inactivo', mensaje: '' }));
      }, 4000);
    } finally {
      guardando = false;
    }
  }

  // Botón MANUAL de restaurar/bajar
  async function importarSincronizacion() {
    if (!rutaCarpeta) return;
    if (!confirm("⚠️ ¿Restaurar datos desde la carpeta? Esto sobrescribirá la base de datos actual con la versión guardada allí.")) return;
    
    try {
      guardando = true;
      iniciarRestauracion(); 
      
      const paquete = await leerPaqueteSync(rutaCarpeta);
      const paqueteCifrado = paquete.content;
      const llave = await obtenerOCrearLlave();
      const tiempoBase = paquete.modifiedAt;
      const fechaSincronizacion = new Date(tiempoBase + 5000).toISOString();

      await invoke('importar_db_encriptada_global', {
        paqueteBase64: paqueteCifrado,
        llaveBase64: llave,
        lastSyncedFolder: fechaSincronizacion
      });

      // 🔥 BLINDAJE RESTAURACIÓN MANUAL: Emparejamos la fecha con la de la carpeta
      await guardarConfig('last_synced_folder', fechaSincronizacion);
      
      await new Promise(resolve => setTimeout(resolve, 500)); // Pausa para SQLite

    } catch (error) {
      console.error("Error al importar la sincronización:", error);
      alert("Hubo un error al leer o restaurar el archivo. Asegúrate de que exista y no esté corrupto.");
      terminarRestauracion(); 
    } finally {
      guardando = false;
    }
  }
</script>

<div class="sync-carpeta-wrapper">
    <div class="estado-badge-container">
        {#if rutaCarpeta}
            <span class="badge conectado"><CheckCircle size={12}/> Vinculado</span>
        {:else}
            <span class="badge desconectado"><AlertCircle size={12}/> Sin vincular</span>
        {/if}
    </div>

    <div class="contenido-sync">
        <div class="grupo-input">
            <div class="ruta-input" class:vacio={!rutaCarpeta}>
                <span class="texto-ruta">{rutaCarpeta || 'Ninguna carpeta seleccionada...'}</span>
            </div>
            
            {#if !rutaCarpeta}
                <button class="btn-primario" on:click={seleccionarCarpeta} disabled={guardando}>
                    {guardando ? 'Guardando...' : 'Elegir Carpeta'}
                </button>
            {:else}
                <button class="btn-peligro-outline" on:click={desvincular}>
                    Desvincular
                </button>
            {/if}
        </div>
        
        <div class="aviso">
            <Info size={14}/> <span>Esta carpeta servirá como puente seguro entre tus dispositivos. Los datos se guardarán encriptados.</span>
        </div>

        <div class="acciones">
             <button class="btn-moderno btn-primario" on:click={sincronizarAhora} disabled={!rutaCarpeta || guardando}>
                 {guardando ? 'Sincronizando...' : '🔄 Forzar Subida'}
             </button>

             <button class="btn-moderno btn-restaurar-manual" on:click={importarSincronizacion} disabled={!rutaCarpeta || guardando}>
                 📥 Restaurar Manual
             </button>
        </div>
    </div>
</div>

<style>
    .sync-carpeta-wrapper {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 15px;
        box-sizing: border-box;
    }
    
    .estado-badge-container {
        display: flex;
        align-items: center;
    }

    .badge { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
    .conectado { background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2); }
    .desconectado { background: rgba(100, 116, 139, 0.1); color: #64748b; border: 1px solid rgba(100, 116, 139, 0.2); }

    .grupo-input { display: flex; gap: 15px; align-items: center; width: 100%; }
    
    .ruta-input { 
        flex: 1; display: flex; align-items: center; padding: 12px 15px; 
        background: var(--bg-app); 
        border: 1px solid var(--border-color); 
        border-radius: 8px; 
        font-family: monospace; font-size: 13px; overflow: hidden; 
    }
    .texto-ruta { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-main); }
    .ruta-input.vacio .texto-ruta { color: var(--text-muted); }

    .btn-primario { background: var(--primary, #4f46e5); color: white; padding: 10px 20px; border-radius: 8px; font-weight: 600; border: none; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
    .btn-primario:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
    .btn-primario:disabled { opacity: 0.6; cursor: not-allowed; }
    
    .btn-peligro-outline { background: transparent; color: #ef4444; border: 1px solid #fecaca; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
    .btn-peligro-outline:hover { background: rgba(239, 68, 68, 0.1); }

    .aviso { 
        display: flex; gap: 8px; align-items: center; font-size: 12.5px; 
        color: var(--text-muted); 
        background: var(--bg-app); 
        border: 1px dashed var(--border-color);
        padding: 10px 15px; border-radius: 6px; 
    }

   .acciones { 
        margin-top: 15px; 
        display: flex; 
        justify-content: flex-start; /* Los alinea a la izquierda de forma ordenada */
        gap: 12px; 
        flex-wrap: wrap; /* Permite que bajen de línea si la pantalla es estrecha */
    }

    .btn-moderno { display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; border: 1px solid transparent; }
    .btn-moderno:disabled { opacity: 0.5; cursor: not-allowed; }
    

    @media (max-width: 600px) {
        .grupo-input { flex-direction: column; gap: 10px; }
        .ruta-input { width: 100%; box-sizing: border-box; }
        .btn-primario, .btn-peligro-outline { width: 100%; }
        .acciones { flex-direction: column; }
        .btn-moderno { width: 100%; justify-content: center; }
    }

    /* 🔴 Borde rojo directo y sin escape */
    button.btn-moderno.btn-restaurar-manual {
        background: transparent !important;
        border: 1px solid #ef4444 !important;
        color: #ef4444 !important;
    }

    button.btn-moderno.btn-restaurar-manual:hover:not(:disabled) {
        background: rgba(239, 68, 68, 0.1) !important;
        border-color: #dc2626 !important;
        color: #dc2626 !important;
    }
</style>