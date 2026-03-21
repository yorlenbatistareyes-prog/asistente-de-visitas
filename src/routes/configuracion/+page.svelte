<script lang="ts">
  import { 
    FolderSync, RefreshCcw, Trash, FolderX, FolderInput, User, Database, Globe, Save, 
    ArrowLeft, Download, Upload, AlertTriangle, X, HardDriveDownload, ArchiveRestore
  } from 'lucide-svelte';
  import { onMount } from 'svelte';

  import { save as saveDialog, open as openDialog } from '@tauri-apps/plugin-dialog';
  import { readFile, writeFile, remove, BaseDirectory } from '@tauri-apps/plugin-fs';
  
  // IMPORTAMOS TUS FUNCIONES DESDE db.ts
  import { guardarConfig, cargarConfig, initDB } from '$lib/services/db';
  
  // --- VARIABLES DE ESTADO GLOBALES ---
  let nombreUsuario = "";
  let cargoUsuario = "Superintendente de Circuito";
  let nombreCircuito = "";
  let piePagina = "Informe generado por Asistente de Visitas";
  let idioma = "Español";
  
  let mostrarModalReset = false;
  let palabraConfirmacion = "";

  // --- VARIABLES DE ESTADO: SINCRONIZACIÓN ---
  let rutaSincronizacion = ""; 
  let ultimaExportacion = "Desconocido";
  let ultimaImportacion = "Desconocido";
  let autoExportar = false;

  // Función auxiliar para obtener la fecha y hora actual con buen formato
  function obtenerFechaActual() {
    return new Date().toLocaleString();
  }

  // Función auxiliar para crear la ruta exacta del archivo en la nube
  // (Une la carpeta seleccionada con el nombre del archivo de forma segura)
  function obtenerRutaArchivoSync() {
    const separador = rutaSincronizacion.includes('\\') ? '\\' : '/'; // Detecta si es Windows o Mac/Linux
    const barra = rutaSincronizacion.endsWith(separador) ? '' : separador;
    return `${rutaSincronizacion}${barra}av_sync_backup.db`;
  }

  // --- CARGAR DATOS AL INICIAR ---
  onMount(async () => {
    try {
      nombreUsuario = await cargarConfig('nombreUsuario') || "";
      cargoUsuario = await cargarConfig('cargoUsuario') || "Superintendente de Circuito";
      nombreCircuito = await cargarConfig('nombreCircuito') || "";
      piePagina = await cargarConfig('piePagina') || "Informe generado por Asistente de Visitas";
      idioma = await cargarConfig('idioma') || "Español";

      // Cargar configuraciones de Sincronización
      rutaSincronizacion = await cargarConfig('rutaSincronizacion') || "";
      ultimaExportacion = await cargarConfig('ultimaExportacion') || "Desconocido";
      ultimaImportacion = await cargarConfig('ultimaImportacion') || "Desconocido";
      const autoExp = await cargarConfig('autoExportar');
      autoExportar = autoExp === 'true';

    } catch (error) {
      console.error("No se pudo cargar la configuración de SQLite:", error);
    }
  });

  function volver() {
    window.history.back();
  }

  // --- LÓGICA DE SINCRONIZACIÓN EN LA NUBE (ESTILO EZRA) ---

  async function elegirCarpetaSync() {
    try {
      // 1. Abrir diálogo de Tauri forzado SOLO a elegir directorios (carpetas)
      const carpeta = await openDialog({
        title: 'Seleccionar Carpeta en la Nube (Google Drive, OneDrive)',
        directory: true, 
        multiple: false
      });

      if (!carpeta) return; // Si cancela, no pasa nada

      // 2. Guardamos la ruta en pantalla y en la base de datos
      rutaSincronizacion = carpeta as string;
      await guardarConfig('rutaSincronizacion', rutaSincronizacion);
      
      alert("✅ Carpeta de sincronización vinculada.");
    } catch (error) {
      console.error("Error al elegir carpeta:", error);
      alert("❌ Ocurrió un error al abrir el explorador.");
    }
  }

  async function exportarSync() {
    if (!rutaSincronizacion) return;
    try {
      // 1. Leemos la base de datos local actual
      const dbBytes = await readFile('av_database.db', { baseDir: BaseDirectory.AppLocalData });
      
      // 2. Escribimos los datos en la carpeta de la nube seleccionada
      const rutaFinal = obtenerRutaArchivoSync();
      await writeFile(rutaFinal, dbBytes); // Nota: Sin BaseDirectory porque es una ruta absoluta externa

      // 3. Actualizamos la fecha de exportación
      ultimaExportacion = obtenerFechaActual();
      await guardarConfig('ultimaExportacion', ultimaExportacion);

      alert("✅ Datos exportados correctamente a la carpeta de sincronización.");
    } catch (error) {
      console.error("Error exportando a la nube:", error);
      alert("❌ Error al exportar. Comprueba que la carpeta sigue existiendo o tienes permisos.");
    }
  }

  async function importarSync() {
    if (!rutaSincronizacion) return;
    try {
      // 1. Leemos el archivo desde la carpeta de la nube
      const rutaFinal = obtenerRutaArchivoSync();
      const backupBytes = await readFile(rutaFinal);

      // 2. Lo guardamos en el directorio local de la app (Sobrescribiendo la DB actual)
      await writeFile('av_database.db', backupBytes, { baseDir: BaseDirectory.AppLocalData });

      // 3. Actualizamos la fecha
      ultimaImportacion = obtenerFechaActual();
      await guardarConfig('ultimaImportacion', ultimaImportacion);

      alert("✅ Datos sincronizados con éxito. La aplicación se reiniciará para aplicar los cambios.");
      window.location.reload();
    } catch (error) {
      console.error("Error importando desde la nube:", error);
      alert("❌ Error al importar. ¿Estás seguro de que hay un archivo de sincronización en esa carpeta?");
    }
  }

  async function restablecerCarpeta() {
    if (confirm("¿Seguro que deseas desvincular la carpeta? La app dejará de sincronizarse.")) {
      rutaSincronizacion = "";
      autoExportar = false;
      await guardarConfig('rutaSincronizacion', "");
      await guardarConfig('autoExportar', "false");
    }
  }

  async function limpiarCarpetaSync() {
    if (confirm("⚠️ ¿Deseas borrar el archivo de sincronización que está en tu Google Drive/OneDrive?")) {
      try {
        const rutaFinal = obtenerRutaArchivoSync();
        await remove(rutaFinal); // Usamos remove de Tauri
        
        ultimaExportacion = "Desconocido";
        ultimaImportacion = "Desconocido";
        await guardarConfig('ultimaExportacion', "Desconocido");
        await guardarConfig('ultimaImportacion', "Desconocido");
        
        alert("✅ Archivo de sincronización eliminado de la nube.");
      } catch (error) {
        console.error(error);
        alert("❌ No se pudo borrar el archivo. Puede que ya no exista o esté bloqueado.");
      }
    }
  }

  // Se llama cuando haces clic en el checkbox de AutoExportar
  async function toggleAutoExportar() {
    await guardarConfig('autoExportar', autoExportar ? 'true' : 'false');
  }

  // --- GUARDAR CONFIGURACIÓN GLOBAL ---
  async function guardarCambios() {
    try {
      await guardarConfig('nombreUsuario', nombreUsuario);
      await guardarConfig('cargoUsuario', cargoUsuario);
      await guardarConfig('nombreCircuito', nombreCircuito);
      await guardarConfig('piePagina', piePagina);
      await guardarConfig('idioma', idioma);
      // Las variables de sincronización ya se guardan solas al tocarlas
      
      alert("✅ Configuración guardada en SQLite correctamente.");
      volver();
    } catch (error) {
      console.error("Error guardando en SQLite:", error);
      alert("❌ Hubo un error al guardar en la base de datos.");
    }
  }

  // --- LÓGICA DE BACKUPS MANUALES (Discos USB, etc.) ---
  async function exportarCopia() {
    try {
      const rutaDestino = await saveDialog({
        title: 'Exportar Copia de Seguridad',
        defaultPath: 'Respaldo_Visitas_AV.db',
        filters: [{ name: 'Base de Datos SQLite', extensions: ['db'] }]
      });
      if (!rutaDestino) return; 

      const dbBytes = await readFile('av_database.db', { baseDir: BaseDirectory.AppLocalData });
      await writeFile(rutaDestino, dbBytes);
      alert("✅ Copia de seguridad manual exportada con éxito.");
    } catch (error) {
      console.error("Error al exportar:", error);
      alert("❌ Ocurrió un error al exportar la copia manual.");
    }
  }

  async function restaurarCopia() {
    try {
      if (!confirm("⚠️ ADVERTENCIA: Esto reemplazará todos tus datos. ¿Deseas continuar?")) return;

      const rutaOrigen = await openDialog({
        title: 'Restaurar Copia de Seguridad',
        filters: [{ name: 'Base de Datos SQLite', extensions: ['db'] }],
        multiple: false,
        directory: false
      });
      if (!rutaOrigen) return; 

      const backupBytes = await readFile(rutaOrigen as string);
      await writeFile('av_database.db', backupBytes, { baseDir: BaseDirectory.AppLocalData });

      alert("✅ Datos restaurados correctamente. La aplicación se recargará.");
      window.location.reload();
    } catch (error) {
      console.error("Error al restaurar:", error);
      alert("❌ Error al restaurar el respaldo manual.");
    }
  }

  // --- LÓGICA DE RESETEO (ZONA DE PELIGRO) ---
  function abrirModalReset() { mostrarModalReset = true; palabraConfirmacion = ""; }
  function cerrarModalReset() { mostrarModalReset = false; palabraConfirmacion = ""; }

  async function confirmarReset() {
    if (palabraConfirmacion === "ELIMINAR") {
      try {
        const db = await initDB();
        await db.execute('DELETE FROM historial_visitas'); 
        await db.execute('DELETE FROM personas');
        await db.execute('DELETE FROM congregaciones');
        await db.execute('DELETE FROM circuitos');
        
        alert("✅ La base de datos ha sido limpiada exitosamente.");
        cerrarModalReset();
      } catch (error) {
        alert("❌ Error al limpiar la base de datos.");
      }
    }
  }
</script>

<div class="config-page">
  <header class="config-header">
    <button class="btn-back" on:click={volver}>
      <ArrowLeft size={20} /> Volver
    </button>
    <h1>Configuración Global</h1>
  </header>

  <div class="config-grid">
    
    <section class="card-global config-section">
      <div class="section-icon"><User size={24} /></div>
      <div class="section-content">
        <h3>Perfil y Firma Oficial</h3>
        <p>Personaliza cómo aparecen tus datos en los informes PDF.</p>
        
        <div class="form-row">
          <div class="form-group half">
            <label for="username">Nombre Completo</label>
            <input id="username" type="text" class="input-global" bind:value={nombreUsuario} />
          </div>
          <div class="form-group half">
            <label for="cargo">Cargo o Asignación</label>
            <input id="cargo" type="text" class="input-global" bind:value={cargoUsuario} />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group half">
            <label for="circuito">Nombre del Circuito</label>
            <input id="circuito" type="text" class="input-global" bind:value={nombreCircuito} />
          </div>
          <div class="form-group half">
            <label for="lang">Idioma Predeterminado</label>
            <select id="lang" class="input-global" bind:value={idioma}>
              <option value="Español">Español</option>
              <option value="English">English</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label for="pie">Pie de Página (Impresión)</label>
          <input id="pie" type="text" class="input-global" bind:value={piePagina} />
        </div>
      </div>
    </section>

    <section class="card-global config-section">
      <div class="section-icon"><FolderSync size={24} /></div>
      <div class="section-content">
        <h3>Carpeta de Sincronización</h3>
        <p>Elige una carpeta en la nube (Google Drive, OneDrive) para compartir datos entre tus dispositivos.</p>

        <div class="sync-info-box">
          {#if rutaSincronizacion === ""}
            <p class="text-muted">Aún no se ha seleccionado una carpeta de sincronización.</p>
          {:else}
            <div class="sync-details">
              <p><strong>Carpeta actual:</strong> <span class="ruta-path">{rutaSincronizacion}</span></p>
              <p><strong>Última exportación:</strong> {ultimaExportacion}</p>
              <p><strong>Última importación:</strong> {ultimaImportacion}</p>
            </div>
          {/if}
        </div>

        <div class="sync-actions-primary">
          <button class="btn-global btn-sync-primary" on:click={elegirCarpetaSync}>
            Elegir carpeta sincronizada
          </button>
          
          <button class="btn-global btn-outline" disabled={!rutaSincronizacion} on:click={exportarSync}>
            Exportar sincronización
          </button>
          
          <button class="btn-global btn-outline" disabled={!rutaSincronizacion} on:click={importarSync}>
            Importar sincronización
          </button>
        </div>

        <div class="sync-auto-option">
          <label class="checkbox-label" class:disabled={!rutaSincronizacion}>
            <input type="checkbox" bind:checked={autoExportar} disabled={!rutaSincronizacion} />
            <span class="checkmark"></span>
            Exportar cambios automáticamente al cerrar
          </label>
        </div>

        <div class="sync-actions-secondary">
          <button class="btn-global btn-outline-warning" disabled={!rutaSincronizacion} on:click={restablecerCarpeta}>
            <FolderX size={16} style="margin-right: 5px;" /> Restablecer carpeta
          </button>
          
          <button class="btn-global btn-outline-danger" disabled={!rutaSincronizacion} on:click={limpiarCarpetaSync}>
            <Trash size={16} style="margin-right: 5px;" /> Limpiar carpeta
          </button>
        </div>

      </div>
    </section>

    <section class="card-global config-section">
      <div class="section-icon"><Database size={24} /></div>
      <div class="section-content">
        <h3>Base de Datos y Respaldo</h3>
        <p>Gestiona el motor SQLite y mantén tus datos seguros.</p>
        
        <div class="db-status">
          <span class="status-dot"></span> 
          <span>Conectado a <code>av_database.db</code></span>
        </div>
        
        <div class="backup-cards">
          <button class="backup-card" on:click={exportarCopia}>
            <div class="icon-box save-box">
              <Save size={24} />
            </div>
            <div class="card-text">
              <h4>Crear Respaldo</h4>
              <span>Guardar TODO</span>
            </div>
          </button>

          <button class="backup-card" on:click={restaurarCopia}>
            <div class="icon-box restore-box">
              <FolderInput size={24} />
            </div>
            <div class="card-text">
              <h4>Restaurar Datos</h4>
              <span>Recuperar desde archivo</span>
            </div>
          </button>
        </div>
        
        <div class="danger-zone">
          <p class="danger-text">Zona de peligro: Esta acción no se puede deshacer.</p>
          <button class="btn-global danger-btn" on:click={abrirModalReset}>
            <AlertTriangle size={16} /> Resetear Aplicación
          </button>
        </div>
      </div>
    </section>
  </div>

  <footer class="config-footer">
    <button class="btn-global" on:click={volver}>Cancelar</button>
    <button class="btn-global btn-primary" on:click={guardarCambios}>
      <Save size={18} /> Guardar Cambios
    </button>
  </footer>
</div>

{#if mostrarModalReset}
  <div class="modal-backdrop" on:click={cerrarModalReset}>
    <div class="modal-content danger-modal" on:click|stopPropagation>
      <div class="modal-header">
        <div class="header-title-danger">
          <AlertTriangle size={24} color="#ef4444" />
          <h3>¿Estás completamente seguro?</h3>
        </div>
        <button class="btn-close" on:click={cerrarModalReset}><X size={20}/></button>
      </div>

      <p class="modal-warning">
        Estás a punto de borrar <strong>todas las congregaciones, personas y el historial de análisis</strong>. 
        Esta acción destruirá los datos permanentemente.
      </p>

      <div class="form-group">
        <label for="confirm">Para continuar, escribe <strong>ELIMINAR</strong> en el recuadro:</label>
        <input 
          id="confirm" 
          type="text" 
          class="input-global" 
          bind:value={palabraConfirmacion} 
          placeholder="Escribe ELIMINAR"
          autocomplete="off"
        />
      </div>

      <div class="modal-footer">
        <button class="btn-global" on:click={cerrarModalReset}>Cancelar</button>
        <button 
          class="btn-global danger-btn-solid" 
          disabled={palabraConfirmacion !== 'ELIMINAR'}
          on:click={confirmarReset}
        >
          Borrar Todo
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .config-page { max-width: 900px; margin: 0 auto; padding-bottom: 50px; animation: fadeIn 0.3s ease-out; }

  .config-header { display: flex; align-items: center; gap: 20px; margin-bottom: 40px; }
  .config-header h1 { margin: 0; font-size: 2rem; color: var(--text-main); }
  
  .btn-back { background: none; border: none; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; gap: 8px; font-weight: 600; transition: color 0.2s;}
  .btn-back:hover { color: var(--primary); }

  .config-grid { display: flex; flex-direction: column; gap: 25px; }

  .config-section { display: flex; gap: 25px; padding: 30px; }
  .section-icon { color: var(--primary); background: var(--bg-app); padding: 15px; border-radius: 15px; height: fit-content; }
  
  .section-content { flex: 1; }
  .section-content h3 { margin: 0 0 5px 0; font-size: 1.3rem; color: var(--text-main); }
  .section-content p { margin: 0 0 20px 0; color: var(--text-muted); font-size: 0.9rem; }

  /* ESTRUCTURA DE FORMULARIOS */
  .form-row { display: flex; gap: 20px; margin-bottom: 15px; }
  .form-group { margin-bottom: 15px; }
  .form-group.half { flex: 1; margin-bottom: 0; }
  .form-group label { display: block; font-size: 0.85rem; font-weight: 700; margin-bottom: 8px; color: var(--text-muted); }

  /* SECCIÓN BASE DE DATOS */
  .db-status { display: flex; align-items: center; gap: 10px; font-size: 0.9rem; margin-bottom: 20px; color: var(--text-main); }
  .status-dot { width: 10px; height: 10px; background: #22c55e; border-radius: 50%; box-shadow: 0 0 8px rgba(34, 197, 94, 0.4); }

  /* NUEVOS BOTONES DE RESPALDO (Estilo Tarjeta) */
  .backup-cards { 
    display: flex; 
    gap: 15px; 
    margin-bottom: 30px; 
  }

  .backup-card {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 15px;
    padding: 15px;
    background: var(--bg-app);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left; /* Para que el texto no se centre como en botones normales */
  }

  .backup-card:hover {
    background: var(--bg-panel);
    border-color: var(--primary);
    box-shadow: 0 4px 10px rgba(0,0,0,0.05);
    transform: translateY(-2px);
  }

  /* Cajas de color para los iconos */
  .icon-box {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 48px;
    height: 48px;
    border-radius: 12px; /* Cuadro con bordes suaves */
  }

  /* Azul para Guardar */
  .save-box {
    background: #eff6ff;
    color: #2563eb;
  }

  /* Verde para Restaurar */
  .restore-box {
    background: #f0fdf4;
    color: #16a34a;
  }

  /* Adaptación al Modo Oscuro */
  :global(body.dark-mode) .save-box, :global(.dark) .save-box {
    background: rgba(37, 99, 235, 0.15);
    color: #60a5fa;
  }
  :global(body.dark-mode) .restore-box, :global(.dark) .restore-box {
    background: rgba(22, 163, 74, 0.15);
    color: #4ade80;
  }

  /* Textos de la tarjeta */
  .card-text {
    display: flex;
    flex-direction: column;
  }

  .card-text h4 {
    margin: 0;
    font-size: 1rem;
    color: var(--text-main);
    font-weight: 700;
  }

  .card-text span {
    font-size: 0.8rem;
    color: var(--text-muted);
    margin-top: 2px;
  }

  .btn-outline { background: var(--bg-app); color: var(--text-main); border: var(--border-thin); }
  .btn-outline:hover { background: var(--bg-panel); border-color: var(--primary); color: var(--primary); }

  .danger-zone { border-top: 1px dashed var(--border-color); padding-top: 20px; }
  .danger-text { color: var(--text-muted); font-size: 0.85rem; margin-bottom: 10px; }
  
  .danger-btn { border-color: #ef4444; color: #ef4444; background: transparent; }
  .danger-btn:hover { background: rgba(239, 68, 68, 0.1); }

  .config-footer { margin-top: 40px; display: flex; justify-content: flex-end; gap: 15px; border-top: var(--border-thin); padding-top: 25px; }
  .btn-primary { background: var(--primary); color: white; border: none; }
  .btn-primary:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }

  /* ESTILOS DEL MODAL DE RESET */
  .modal-backdrop {
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(4px);
    display: flex; justify-content: center; align-items: center; z-index: 9999;
  }

  .danger-modal {
    background: var(--bg-panel); width: 90%; max-width: 450px;
    border-radius: var(--radius-lg); padding: 30px; border: 1px solid #ef4444;
    box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2);
    display: flex; flex-direction: column; gap: 15px; animation: zoomIn 0.2s ease-out;
  }

  .modal-header { display: flex; justify-content: space-between; align-items: center; }
  .header-title-danger { display: flex; align-items: center; gap: 10px; }
  .header-title-danger h3 { margin: 0; font-size: 1.2rem; color: var(--text-main); }
  
  .btn-close { background: transparent; padding: 5px; color: var(--text-muted); border: none; cursor: pointer; }
  .btn-close:hover { color: var(--text-main); }

  .modal-warning { color: var(--text-muted); font-size: 0.95rem; line-height: 1.5; margin: 10px 0; }
  .modal-warning strong { color: var(--text-main); }

  .modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
  
  .danger-btn-solid { background: #ef4444; color: white; border: none; opacity: 1; transition: opacity 0.2s; }
  .danger-btn-solid:disabled { opacity: 0.4; cursor: not-allowed; }
  .danger-btn-solid:not(:disabled):hover { background: #dc2626; }

  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes zoomIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }

  /* =============================================
     DISEÑO RESPONSIVO (Configuración Global)
     ============================================= */

  @media (max-width: 768px) {
    .config-page {
      padding: 15px;
    }

    /* 1. Cabecera: Título más compacto */
    .config-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 10px;
      margin-bottom: 25px;
    }
    
    .config-header h1 {
      font-size: 1.6rem;
    }

    /* 2. Secciones: El icono pasa arriba para dar espacio */
    .config-section {
      flex-direction: column;
      padding: 20px;
      gap: 15px;
    }

    .section-icon {
      width: 45px;
      height: 45px;
      padding: 10px;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    /* 3. Formularios: Todo a una sola columna */
    .form-row {
      flex-direction: column;
      gap: 15px;
      margin-bottom: 0;
    }

    .form-group.half {
      width: 100%;
    }

    /* 4. Botones de Backup: Uno debajo del otro en móvil */
    .backup-cards {
      flex-direction: column;
      gap: 12px;
    }

    /* 5. Zona de Peligro */
    .danger-btn {
      width: 100%;
      height: 48px;
      justify-content: center;
    }

    /* 6. Footer de la página fijo o más grande */
    .config-footer {
      flex-direction: column-reverse; /* El botón principal queda arriba */
      gap: 10px;
    }

    .config-footer .btn-global {
      width: 100%;
      height: 50px;
      font-size: 1rem;
    }
  }

  /* Ajustes para el Modal de Reset en móvil */
  @media (max-width: 480px) {
    .danger-modal {
      padding: 20px;
      gap: 20px;
    }

    .modal-footer {
      flex-direction: column-reverse;
      gap: 10px;
    }

    .modal-footer .btn-global {
      width: 100%;
      height: 48px;
    }
  }

  /* --- ESTILOS DE SINCRONIZACIÓN (ESTILO EZRA) --- */
  .sync-info-box {
    border: 1px dashed var(--border-color);
    background: rgba(0,0,0,0.02); /* Fondo súper tenue */
    padding: 15px 20px;
    border-radius: 8px;
    margin-bottom: 20px;
    min-height: 60px;
    display: flex;
    align-items: center;
  }

  :global(body.dark-mode) .sync-info-box { background: rgba(255,255,255,0.02); }

  .sync-details p { margin: 4px 0 !important; color: var(--text-main) !important; font-size: 0.9rem !important; }
  .sync-details strong { color: var(--text-muted); font-weight: 600; width: 140px; display: inline-block; }
  .ruta-path { font-family: monospace; color: var(--primary); background: var(--bg-app); padding: 2px 6px; border-radius: 4px; border: 1px solid var(--border-color);}

  /* Botones Principales de Sincronización */
  .sync-actions-primary { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px; }
  
  .btn-sync-primary {
    background: #e11d48; /* Color rosa/rojo vibrante similar a Ezra */
    color: white;
    border: none;
    font-weight: 700;
  }
  .btn-sync-primary:hover { background: #be123c; transform: translateY(-1px); }

  /* Los botones outline se apagan solos si tienen el atributo disabled */
  .btn-global:disabled { opacity: 0.5; cursor: not-allowed; pointer-events: none; }

  /* Checkbox personalizado */
  .sync-auto-option { margin-bottom: 25px; border-bottom: 1px solid var(--border-color); padding-bottom: 20px;}
  .checkbox-label { display: flex; align-items: center; gap: 10px; cursor: pointer; color: var(--text-main); font-size: 0.95rem; }
  .checkbox-label.disabled { opacity: 0.5; cursor: not-allowed; }
  
  /* Botones secundarios */
  .sync-actions-secondary { display: flex; gap: 10px; }
  
  .btn-outline-warning { color: #d97706; border: 1px solid #fcd34d; background: transparent; }
  .btn-outline-warning:hover:not(:disabled) { background: #fffbeb; }
  
  .btn-outline-danger { color: #dc2626; border: 1px solid #fca5a5; background: transparent; }
  .btn-outline-danger:hover:not(:disabled) { background: #fef2f2; }

</style>