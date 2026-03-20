<script lang="ts">
  import { User, Database, Globe, Save, ArrowLeft, Download, Upload, AlertTriangle, X } from 'lucide-svelte';
  import { onMount } from 'svelte';

  import { save as saveDialog, open as openDialog } from '@tauri-apps/plugin-dialog';
  import { readFile, writeFile, BaseDirectory } from '@tauri-apps/plugin-fs';
  
  // IMPORTAMOS TUS FUNCIONES DESDE db.ts
  import { guardarConfig, cargarConfig, initDB } from '$lib/services/db';
  
  // --- VARIABLES DE ESTADO ---
  let nombreUsuario = "";
  let cargoUsuario = "Superintendente de Circuito";
  let nombreCircuito = "";
  let piePagina = "Informe generado por Asistente de Visitas";
  let idioma = "Español";
  
  let mostrarModalReset = false;
  let palabraConfirmacion = "";

  // --- CARGAR DATOS AL INICIAR ---
  onMount(async () => {
    try {
      // Cargamos cada campo usando tu función de db.ts
      nombreUsuario = await cargarConfig('nombreUsuario') || "";
      cargoUsuario = await cargarConfig('cargoUsuario') || "Superintendente de Circuito";
      nombreCircuito = await cargarConfig('nombreCircuito') || "";
      piePagina = await cargarConfig('piePagina') || "Informe generado por Asistente de Visitas";
      idioma = await cargarConfig('idioma') || "Español";
    } catch (error) {
      console.error("No se pudo cargar la configuración de SQLite:", error);
    }
  });

  function volver() {
    window.history.back();
  }

  // --- GUARDAR EN SQLITE ---
  async function guardarCambios() {
    try {
      // Guardamos cada campo individualmente
      await guardarConfig('nombreUsuario', nombreUsuario);
      await guardarConfig('cargoUsuario', cargoUsuario);
      await guardarConfig('nombreCircuito', nombreCircuito);
      await guardarConfig('piePagina', piePagina);
      await guardarConfig('idioma', idioma);
      
      alert("✅ Configuración guardada en SQLite correctamente.");
      volver();
    } catch (error) {
      console.error("Error guardando en SQLite:", error);
      alert("❌ Hubo un error al guardar en la base de datos.");
    }
  }

  // --- LÓGICA DE BACKUPS (Pendiente de conectar con fs y dialog) ---
  // --- LÓGICA DE BACKUPS CON TAURI ---
  async function exportarCopia() {
    try {
      // 1. Abrimos la ventana para que elijas dónde guardar
      const rutaDestino = await saveDialog({
        title: 'Exportar Copia de Seguridad',
        defaultPath: 'Respaldo_Visitas_AV.db',
        filters: [{ name: 'Base de Datos SQLite', extensions: ['db'] }]
      });

      if (!rutaDestino) return; // Si el usuario cancela o cierra la ventana, no hacemos nada

      // 2. Leemos la base de datos original. 
      // (Por defecto, el plugin SQL de Tauri v2 guarda los datos en AppLocalData o AppData)
      const dbBytes = await readFile('av_database.db', { baseDir: BaseDirectory.AppLocalData });

      // 3. Escribimos esa copia exacta en la ruta elegida (tu memoria USB, Documentos, etc.)
      await writeFile(rutaDestino, dbBytes);

      alert("✅ Copia de seguridad exportada con éxito.");
    } catch (error) {
      console.error("Error al exportar:", error);
      alert("❌ Ocurrió un error al exportar. Es posible que la base de datos esté en uso o la ruta sea incorrecta.");
    }
  }

  async function restaurarCopia() {
    try {
      // 1. Advertencia de seguridad crucial
      if (!confirm("⚠️ ADVERTENCIA: Esto reemplazará todos tus datos actuales con los de la copia de seguridad. ¿Deseas continuar?")) return;

      // 2. Abrimos el explorador para buscar el archivo de respaldo
      const rutaOrigen = await openDialog({
        title: 'Restaurar Copia de Seguridad',
        filters: [{ name: 'Base de Datos SQLite', extensions: ['db'] }],
        multiple: false,
        directory: false
      });

      if (!rutaOrigen) return; 

      // 3. Leemos los bytes del archivo que seleccionaste
      const backupBytes = await readFile(rutaOrigen as string);

      // 4. Sobrescribimos nuestra base de datos actual con ese respaldo
      await writeFile('av_database.db', backupBytes, { baseDir: BaseDirectory.AppLocalData });

      alert("✅ Datos restaurados correctamente. La aplicación se recargará para aplicar los cambios.");
      
      // 5. Recargamos la interfaz para que SQLite lea la nueva información
      window.location.reload();
    } catch (error) {
      console.error("Error al restaurar:", error);
      alert("❌ Error al restaurar la base de datos. Verifica que el archivo sea un respaldo válido.");
    }
  }

  // --- LÓGICA DE RESETEO ---
  function abrirModalReset() { mostrarModalReset = true; palabraConfirmacion = ""; }
  function cerrarModalReset() { mostrarModalReset = false; palabraConfirmacion = ""; }

  async function confirmarReset() {
    if (palabraConfirmacion === "ELIMINAR") {
      try {
        const db = await initDB();
        // Vaciamos las tablas correctas definidas en db.ts
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
      <div class="section-icon"><Database size={24} /></div>
      <div class="section-content">
        <h3>Base de Datos y Respaldo</h3>
        <p>Gestiona el motor SQLite y mantén tus datos seguros.</p>
        
        <div class="db-status">
          <span class="status-dot"></span> 
          <span>Conectado a <code>av_database.db</code></span>
        </div>
        
        <div class="backup-buttons">
          <button class="btn-global btn-outline" on:click={exportarCopia}>
            <Download size={16} /> Exportar Copia (.db)
          </button>
          <button class="btn-global btn-outline" on:click={restaurarCopia}>
            <Upload size={16} /> Restaurar Datos
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

  .backup-buttons { display: flex; gap: 15px; margin-bottom: 30px; }
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

    /* 4. Botones de Backup: Uno debajo del otro */
    .backup-buttons {
      flex-direction: column;
      gap: 10px;
    }

    .backup-buttons .btn-global {
      width: 100%;
      height: 48px; /* Altura táctil mejorada */
      justify-content: center;
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

</style>