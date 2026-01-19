<script lang="ts">
  import { 
    X, Trash2, Database, Save, FolderInput, AlertTriangle, 
    User, Briefcase, Mail, Info, FileText, FolderOpen 
  } from "lucide-svelte";
  import { createEventDispatcher, onMount } from 'svelte';
  
  import { remove, readTextFile, writeTextFile, BaseDirectory, exists } from '@tauri-apps/plugin-fs';
  import { save, open, message, ask } from '@tauri-apps/plugin-dialog';
  // Importamos 'openPath' para abrir la carpeta de datos en el explorador
  import { openPath } from '@tauri-apps/plugin-opener';
  import { appDataDir } from '@tauri-apps/api/path';

  const dispatch = createEventDispatcher();
  let procesando = false;

  // VARIABLES DE PERFIL
  let nombreUsuario = "";
  let rolUsuario = "";
  let emailContacto = "";
  
  // VARIABLES DE PREFERENCIAS (NUEVO)
  let piePaginaPDF = "Informe Confidencial";

  function cerrar() {
    dispatch('close');
  }

  onMount(async () => {
    try {
      if (await exists('config_usuario.json', { baseDir: BaseDirectory.AppData })) {
        const content = await readTextFile('config_usuario.json', { baseDir: BaseDirectory.AppData });
        const config = JSON.parse(content);
        nombreUsuario = config.nombre || "";
        rolUsuario = config.rol || "";
        emailContacto = config.email || "";
        // Cargamos la preferencia nueva
        piePaginaPDF = config.piePagina || "Informe Confidencial";
      }
    } catch (e) {
      console.log("Iniciando configuración nueva.");
    }
  });

  async function guardarPerfil() {
    try {
      const config = { 
        nombre: nombreUsuario, 
        rol: rolUsuario,
        email: emailContacto,
        piePagina: piePaginaPDF // Guardamos la preferencia
      };
      await writeTextFile('config_usuario.json', JSON.stringify(config), { baseDir: BaseDirectory.AppData });
      await message('Configuración guardada correctamente.', { title: 'Guardado', kind: 'info' });
    } catch (e) {
      console.error(e);
      await message('Error al guardar.', { title: 'Error', kind: 'error' });
    }
  }

  // --- FUNCIÓN NUEVA: ABRIR CARPETA DE DATOS ---
  async function abrirCarpetaDatos() {
    try {
      const dir = await appDataDir();
      await openPath(dir);
    } catch (e) {
      await message("No se pudo abrir la carpeta: " + e, { kind: 'error' });
    }
  }

  // ... (LAS FUNCIONES DE BACKUP Y RESET SIGUEN IGUAL QUE ANTES) ...
  // Copia aquí las funciones crearBackup, restaurarBackup y resetFabrica del código anterior
  // Para no hacer el mensaje eterno, asumo que mantienes esas funciones idénticas.
  
  // --- PEGA AQUÍ TUS FUNCIONES DE BACKUP (crearBackup, restaurarBackup, resetFabrica) ---
  // (Si necesitas que te las repita completas dímelo, pero son las mismas del paso anterior)
  
  async function crearBackup() {
    try {
      procesando = true;
      const archivos = [
        { key: 'circuito', file: 'registro_circuito_v1.json' },
        { key: 'documentos', file: 'registro_documentos.json' },
        { key: 'tareas', file: 'app_data.json' },
        { key: 'usuario', file: 'config_usuario.json' }
      ];

      let backupData: any = {
        meta: { app: "Asistente de Visitas", version: "1.0", fecha: new Date().toISOString() },
        data: {}
      };

      for (const item of archivos) {
        const existe = await exists(item.file, { baseDir: BaseDirectory.AppData });
        if (existe) {
          const contenido = await readTextFile(item.file, { baseDir: BaseDirectory.AppData });
          backupData.data[item.key] = JSON.parse(contenido);
        } else {
          backupData.data[item.key] = [];
        }
      }

      const ruta = await save({
        title: 'Guardar Copia de Seguridad',
        defaultPath: `Respaldo_Visitas_${new Date().toISOString().split('T')[0]}.json`,
        filters: [{ name: 'Archivo JSON', extensions: ['json'] }]
      });

      if (ruta) {
        await writeTextFile(ruta, JSON.stringify(backupData, null, 2));
        await message('Copia de seguridad guardada con éxito.', { title: 'Éxito', kind: 'info' });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      await message(`Error: ${msg}`, { title: 'Error', kind: 'error' });
    } finally {
      procesando = false;
    }
  }

  async function restaurarBackup() {
    try {
      const confirmacion = await ask(
        "Esto sobrescribirá TODOS los datos actuales.\n\n¿Continuar?", 
        { title: 'Restaurar Datos', kind: 'warning' }
      );
      if (!confirmacion) return;

      const ruta = await open({
        title: 'Seleccionar Copia',
        multiple: false,
        filters: [{ name: 'Archivo JSON', extensions: ['json'] }]
      });

      if (!ruta) return;
      procesando = true;

      const pathToFile = typeof ruta === 'string' ? ruta : (ruta as any).path;
      const contenidoBackup = await readTextFile(pathToFile);
      const backupObj = JSON.parse(contenidoBackup);

      if (!backupObj.meta || backupObj.meta.app !== "Asistente de Visitas") throw new Error("Archivo inválido.");

      const mapaArchivos = {
        'circuito': 'registro_circuito_v1.json',
        'documentos': 'registro_documentos.json',
        'tareas': 'app_data.json',
        'usuario': 'config_usuario.json'
      };

      for (const [key, filename] of Object.entries(mapaArchivos)) {
        if (backupObj.data[key]) {
          await writeTextFile(filename, JSON.stringify(backupObj.data[key], null, 2), { baseDir: BaseDirectory.AppData });
        }
      }
      await message('Restaurado. Reiniciando...', { title: 'Éxito', kind: 'info' });
      window.location.reload();
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      await message(`Error: ${msg}`, { title: 'Error', kind: 'error' });
    } finally {
      procesando = false;
    }
  }

  async function resetFabrica() {
    const confirmacion = await ask("¿Borrar TODO?", { title: 'Borrado Total', kind: 'error' });
    if (!confirmacion) return;
    try {
      const archivos = ['registro_circuito_v1.json', 'datos_asistente.json', 'registro_documentos.json', 'app_data.json', 'config_usuario.json'];
      for (const archivo of archivos) {
        if (await exists(archivo, { baseDir: BaseDirectory.AppData })) await remove(archivo, { baseDir: BaseDirectory.AppData });
      }
      await message('Datos borrados.', { title: 'Reset' });
      window.location.reload();
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        await message(`Error: ${msg}`, { title: 'Error', kind: 'error' });
    }
  }
</script>

<div class="modal-overlay" on:click|self={cerrar}>
  <div class="modal-content">
    <header>
      <div class="title-group">
        <div class="icon-box"><Database size={24} color="#475569"/></div>
        <div>
          <h3>Configuración Global</h3>
          <p>Preferencias y mantenimiento</p>
        </div>
      </div>
      <button class="close-btn" on:click={cerrar}><X size={20} /></button>
    </header>

    <div class="scroll-content">
      <div class="options-grid">
        
        <div class="section-label">PERFIL Y PREFERENCIAS</div>
        <div class="card-container">
          <div class="card-body">
            <div class="row-inputs">
              <div class="input-group">
                <label for="uName"><User size={13}/> Nombre</label>
                <input id="uName" type="text" bind:value={nombreUsuario} placeholder="Tu Nombre" />
              </div>
              <div class="input-group">
                <label for="uRole"><Briefcase size={13}/> Asignación</label>
                <input id="uRole" type="text" bind:value={rolUsuario} placeholder="Tu Cargo" />
              </div>
            </div>
            
            <div class="input-group">
              <label for="uEmail"><Mail size={13}/> Correo</label>
              <input id="uEmail" type="email" bind:value={emailContacto} placeholder="correo@ejemplo.com" />
            </div>

            <div class="input-group">
              <label for="pdfFooter"><FileText size={13}/> Pie de Página (PDF)</label>
              <input id="pdfFooter" type="text" bind:value={piePaginaPDF} placeholder="Ej. Informe Confidencial" />
            </div>

            <button class="save-profile-btn" on:click={guardarPerfil}>
              <Save size={14} /> Guardar Cambios
            </button>
          </div>
        </div>

        <div class="divider"></div>

        <div class="section-label">ALMACENAMIENTO</div>
        <div class="storage-card" on:click={abrirCarpetaDatos} role="button" tabindex="0" on:keydown={() => {}}>
            <div class="storage-info">
                <FolderOpen size={20} />
                <div>
                    <h4>Carpeta de Datos</h4>
                    <p>Abrir ubicación física de los archivos</p>
                </div>
            </div>
            <div class="btn-mini">Abrir</div>
        </div>

        <div class="backup-actions">
          <button class="action-card" on:click={crearBackup} disabled={procesando}>
            <div class="card-icon backup"><Save size={20} /></div>
            <div class="text-col">
              <h4>Crear Respaldo</h4>
              <p>Exportar datos</p>
            </div>
          </button>

          <button class="action-card" on:click={restaurarBackup} disabled={procesando}>
            <div class="card-icon restore"><FolderInput size={20} /></div>
            <div class="text-col">
              <h4>Restaurar</h4>
              <p>Importar datos</p>
            </div>
          </button>
        </div>

        <div class="danger-zone">
          <div class="danger-text">
            <AlertTriangle size={16} />
            <span>Zona de Peligro</span>
          </div>
          <button class="btn-reset-mini" on:click={resetFabrica} disabled={procesando}>
            <Trash2 size={14} /> Resetear
          </button>
        </div>

      </div>
    </div>

    <footer>
      <p class="copyright">v1.0.0 Stable</p>
      <button class="btn-sec" on:click={cerrar}>Cerrar</button>
    </footer>
  </div>
</div>

<style>
  /* ... (Mismos estilos del modal anterior) ... */
  .modal-overlay { 
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(2px);
    display: flex; align-items: center; justify-content: center; z-index: 99999;
  }
  .modal-content { 
    background: white; width: 90%; max-width: 500px; max-height: 90vh; 
    border-radius: 16px; padding: 0; box-shadow: 0 20px 40px rgba(0,0,0,0.2);
    overflow: hidden; display: flex; flex-direction: column; font-family: 'Inter', sans-serif;
  }
  header { padding: 15px 20px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; background: white; flex-shrink: 0; }
  .title-group { display: flex; gap: 10px; align-items: center; }
  .icon-box { background: #f1f5f9; padding: 6px; border-radius: 8px; }
  h3 { margin: 0; font-size: 1rem; color: #1e293b; font-weight: 700; }
  .close-btn { background: none; border: none; cursor: pointer; color: #94a3b8; padding: 4px; }
  .scroll-content { flex: 1; overflow-y: auto; padding: 20px; }
  .options-grid { display: flex; flex-direction: column; gap: 18px; }
  .section-label { font-size: 0.7rem; font-weight: 800; color: #94a3b8; letter-spacing: 0.05em; margin-bottom: -5px; }
  
  /* INPUTS */
  .card-container { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 15px; }
  .card-body { display: flex; flex-direction: column; gap: 10px; }
  .row-inputs { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .input-group { display: flex; flex-direction: column; gap: 4px; }
  .input-group label { display: flex; align-items: center; gap: 5px; font-size: 0.75rem; font-weight: 600; color: #64748b; }
  .input-group input { padding: 6px 10px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 0.85rem; }
  
  /* NUEVO: Tarjeta de Almacenamiento */
  .storage-card { 
    display: flex; justify-content: space-between; align-items: center;
    background: white; border: 1px solid #e2e8f0; padding: 12px 15px; 
    border-radius: 10px; cursor: pointer; transition: 0.2s;
  }
  .storage-card:hover { border-color: #3b82f6; background: #eff6ff; }
  .storage-info { display: flex; align-items: center; gap: 12px; color: #334155; }
  .storage-info h4 { margin: 0; font-size: 0.9rem; font-weight: 600; }
  .storage-info p { margin: 0; font-size: 0.75rem; color: #64748b; }
  .btn-mini { font-size: 0.75rem; font-weight: 600; color: #2563eb; background: #dbeafe; padding: 4px 10px; border-radius: 6px; }

  /* BACKUP */
  .backup-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .action-card { display: flex; align-items: center; gap: 10px; text-align: left; padding: 10px; border-radius: 10px; border: 1px solid #e2e8f0; background: white; cursor: pointer; transition: 0.2s; }
  .action-card:hover { border-color: #3b82f6; background: #eff6ff; }
  .card-icon { padding: 8px; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
  .card-icon.backup { background: #dbeafe; color: #2563eb; }
  .card-icon.restore { background: #d1fae5; color: #059669; }
  .text-col h4 { margin: 0; font-size: 0.85rem; font-weight: 600; color: #334155; }
  .text-col p { margin: 0; font-size: 0.7rem; color: #64748b; }

  .divider { height: 1px; background: #f1f5f9; }

  /* PELIGRO */
  .danger-zone { border: 1px dashed #fecaca; background: #fff1f2; border-radius: 10px; padding: 10px 15px; display: flex; justify-content: space-between; align-items: center; }
  .danger-text { display: flex; align-items: center; gap: 8px; color: #991b1b; font-weight: 700; font-size: 0.8rem; }
  .btn-reset-mini { display: flex; align-items: center; gap: 6px; background: white; color: #dc2626; border: 1px solid #fecaca; padding: 6px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; cursor: pointer; }
  
  footer { background: #f8fafc; padding: 15px 24px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #eee; flex-shrink: 0; }
  .copyright { font-size: 0.8rem; color: #cbd5e1; }
  .btn-sec { background: white; border: 1px solid #e2e8f0; padding: 8px 16px; border-radius: 6px; font-weight: 500; cursor: pointer; color: #64748b; }
  .btn-sec:hover { background: #f1f5f9; }
</style>