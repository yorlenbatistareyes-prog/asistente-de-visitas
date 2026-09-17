<!-- src/lib/components/SincronizacionCarpeta.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';
  import { open } from '@tauri-apps/plugin-dialog';
  import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs'; 
  import { FolderSync, CheckCircle, AlertCircle, Info } from 'lucide-svelte';
  
  // Importamos de la base de datos de AVisits
  import { guardarRutaSync, cargarConfig, guardarConfig, iniciarRestauracion, terminarRestauracion } from '$lib/services/db';
  
  // Importamos el estado visual del radar que acabamos de crear
  import { estadoSincronizacion } from '$lib/stores/autoSyncStore';

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
      const seleccion = await open({
        directory: true,
        multiple: false,
        title: "Selecciona tu carpeta de Google Drive / OneDrive"
      });

      if (seleccion) {
        guardando = true;
        rutaCarpeta = seleccion as string;
        await guardarRutaSync(rutaCarpeta); // Llama a Rust y notifica al radar
        guardando = false;
      }
    } catch (e) {
      console.error(e);
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
      estadoSincronizacion.set({ estado: 'sincronizando', mensaje: 'Guardando manual...', nubeDispositivo: '', nubeFecha: '' });

      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const llave = await obtenerOCrearLlave();
      const paqueteCifrado = await invoke<string>('exportar_db_encriptada_global', { llaveBase64: llave });

      const separador = rutaCarpeta.includes('/') ? '/' : '\\';
      // 🔥 Usamos la extensión .avisits
      const rutaArchivoFinal = `${rutaCarpeta}${separador}sincronizacion_global.avisits`;

      await writeTextFile(rutaArchivoFinal, paqueteCifrado);
      
      estadoSincronizacion.set({ estado: 'al_dia', mensaje: '¡Carpeta sincronizada!', nubeDispositivo: '', nubeFecha: '' });

      setTimeout(() => {
          estadoSincronizacion.update(s => ({ ...s, estado: 'inactivo', mensaje: '' }));
      }, 3000);

    } catch (error) {
      console.error("Error al sincronizar y guardar:", error);
      estadoSincronizacion.set({ estado: 'error', mensaje: 'Error al guardar', nubeDispositivo: '', nubeFecha: '' });
      setTimeout(() => {
          estadoSincronizacion.update(s => ({ ...s, estado: 'inactivo', mensaje: '' }));
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
      iniciarRestauracion(); // 🛡️ Encendemos el semáforo para que no haya ecos
      
      const separador = rutaCarpeta.includes('/') ? '/' : '\\';
      const rutaArchivoFinal = `${rutaCarpeta}${separador}sincronizacion_global.avisits`;

      const paqueteCifrado = await readTextFile(rutaArchivoFinal);
      const llave = await obtenerOCrearLlave();

      // Esto sobrescribirá la BD y reiniciará la app
      await invoke('importar_db_encriptada_global', {
        paqueteBase64: paqueteCifrado,
        llaveBase64: llave
      });

    } catch (error) {
      console.error("Error al importar la sincronización:", error);
      alert("Hubo un error al leer o restaurar el archivo. Asegúrate de que exista y no esté corrupto.");
      terminarRestauracion(); // Si falla, apagamos el semáforo
    } finally {
      guardando = false;
    }
  }
</script>

<div class="panel-sync shadow-sm">
    <div class="header-sync">
        <div class="icono-morado"><FolderSync size={24} /></div>
        <div class="info-sync">
            <div class="titulo-badge">
                <h3>Carpeta Compartida (Drive / OneDrive)</h3>
                {#if rutaCarpeta}
                    <span class="badge conectado"><CheckCircle size={12}/> Vinculado</span>
                {:else}
                    <span class="badge desconectado"><AlertCircle size={12}/> Sin vincular</span>
                {/if}
            </div>
            <p>Directorio raíz para sincronizar tus visitas de forma rápida y segura.</p>
        </div>
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
            <Info size={14}/> Esta carpeta servirá como puente seguro entre tu computadora y tu móvil/tableta. Los datos se guardarán encriptados.
        </div>

        <div class="acciones">
             <button class="btn-moderno btn-primario" on:click={sincronizarAhora} disabled={!rutaCarpeta || guardando}>
                 {guardando ? 'Sincronizando...' : '🔄 Forzar Subida'}
             </button>

             <button class="btn-moderno btn-outline" on:click={importarSincronizacion} disabled={!rutaCarpeta || guardando}>
                 📥 Restaurar Manual
             </button>
        </div>
    </div>
</div>

<style>
    .panel-sync {
        background: white;
        border-radius: 12px;
        padding: 20px;
        border: 1px solid #e2e8f0;
        margin-bottom: 20px;
        width: 100%;
        max-width: 800px;
    }
    .shadow-sm { box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); }
    
    .header-sync {
        display: flex;
        gap: 15px;
        margin-bottom: 20px;
        align-items: flex-start;
    }
    .icono-morado {
        background: #f3e8ff;
        color: #9333ea;
        padding: 10px;
        border-radius: 10px;
        display: flex;
    }
    .info-sync h3 { margin: 0; font-size: 16px; color: #1e293b; }
    .info-sync p { margin: 4px 0 0 0; font-size: 13px; color: #64748b; }
    
    .titulo-badge {
        display: flex;
        align-items: center;
        gap: 12px;
    }
    .badge { display: flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
    .conectado { background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2); }
    .desconectado { background: rgba(100, 116, 139, 0.1); color: #64748b; border: 1px solid rgba(100, 116, 139, 0.2); }

    .grupo-input { display: flex; gap: 15px; margin-bottom: 12px; align-items: center; }
    .ruta-input { 
        flex: 1; display: flex; align-items: center; padding: 12px 15px; 
        background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; 
        font-family: monospace; font-size: 13px; overflow: hidden; 
    }
    .texto-ruta { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #334155; }
    .ruta-input.vacio .texto-ruta { color: #94a3b8; }

    .btn-primario { background: #4f46e5; color: white; padding: 10px 20px; border-radius: 8px; font-weight: 600; border: none; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
    .btn-primario:hover:not(:disabled) { background: #4338ca; transform: translateY(-1px); }
    .btn-primario:disabled { opacity: 0.6; cursor: not-allowed; }
    
    .btn-peligro-outline { background: transparent; color: #ef4444; border: 1px solid #fecaca; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
    .btn-peligro-outline:hover { background: #fee2e2; }

    .aviso { display: flex; gap: 8px; align-items: center; font-size: 12.5px; color: #64748b; background: #f1f5f9; padding: 10px 15px; border-radius: 6px; }

    .acciones { margin-top: 20px; display: flex; justify-content: flex-end; gap: 12px; }
    .btn-moderno { display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; border: 1px solid transparent; }
    .btn-moderno:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-outline { background: transparent; color: #475569; border-color: #cbd5e1; }
    .btn-outline:hover:not(:disabled) { background: #f1f5f9; color: #0f172a; border-color: #94a3b8; }

    @media (max-width: 600px) {
        .titulo-badge { flex-direction: column; align-items: flex-start; gap: 5px; }
        .grupo-input { flex-direction: column; gap: 10px; }
        .ruta-input { width: 100%; box-sizing: border-box; }
        .btn-primario, .btn-peligro-outline { width: 100%; }
        .acciones { flex-direction: column; }
        .btn-moderno { width: 100%; justify-content: center; }
    }
</style>