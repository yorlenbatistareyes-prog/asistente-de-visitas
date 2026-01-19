<script lang="ts">
  import { 
    X, Trash2, Database, Save, FolderInput, AlertTriangle, 
    User, Briefcase, Mail, Info, FileText, FolderOpen 
  } from "lucide-svelte";
  import { createEventDispatcher, onMount } from 'svelte';
  
  // IMPORTACIONES TAURI
  import { remove, readTextFile, writeTextFile, BaseDirectory, exists } from '@tauri-apps/plugin-fs';
  import { save, open, message, ask } from '@tauri-apps/plugin-dialog';
  import { appLocalDataDir } from '@tauri-apps/api/path';
  import { invoke } from '@tauri-apps/api/core';
  import { LazyStore } from '@tauri-apps/plugin-store';

  const dispatch = createEventDispatcher();
  let procesando = false;

  // PERFIL
  let nombreUsuario = "";
  let rolUsuario = "";
  let emailContacto = "";
  let piePaginaPDF = "Informe generado por Asistente de Visitas";

  function cerrar() { dispatch('close'); }

  onMount(async () => { await cargarPerfil(); });

  async function cargarPerfil() {
    try {
      if (await exists('config_usuario.json', { baseDir: BaseDirectory.AppLocalData })) {
        const content = await readTextFile('config_usuario.json', { baseDir: BaseDirectory.AppLocalData });
        const config = JSON.parse(content);
        nombreUsuario = config.nombre || "";
        rolUsuario = config.rol || "";
        emailContacto = config.email || "";
        piePaginaPDF = config.piePagina || "Informe generado por Asistente de Visitas";
      }
    } catch (e) { console.log("Configuración nueva."); }
  }

  async function guardarPerfil() {
    try {
      const config = { nombre: nombreUsuario, rol: rolUsuario, email: emailContacto, piePagina: piePaginaPDF };
      const json = JSON.stringify(config);
      await writeTextFile('config_usuario.json', json, { baseDir: BaseDirectory.AppLocalData });
      try { await writeTextFile('config_usuario.json', json, { baseDir: BaseDirectory.AppData }); } catch(e){}
      await message('Configuración guardada.', { title: 'Guardado', kind: 'info' });
    } catch (e) { await message('Error al guardar.', { kind: 'error' }); }
  }

  async function abrirCarpetaDatos() {
    try {
      const dir = await appLocalDataDir();
      await invoke('abrir_archivo_nativo', { ruta: dir });
    } catch (e) { await message("Error: " + e, { kind: 'error' }); }
  }

  // =============================================================================
  // 🛡️ SISTEMA DE RESPALDO BLINDADO v5 (Especial para Tareas)
  // =============================================================================
  
  // 'STORE': Se inyecta clave por clave (Ideal para Circuitos y Observaciones)
  // 'RAW': Se copia el archivo tal cual (Ideal para Configuración, Docs y TAREAS)
  const MAPA_ARCHIVOS = [
    { nombre: 'registro_circuito_v1.json', tipo: 'STORE' }, 
    { nombre: 'app_data.json',             tipo: 'RAW'   }, // Tareas: RAW es vital aquí
    { nombre: 'datos_asistente.json',      tipo: 'STORE' }, 
    { nombre: 'registro_documentos.json',  tipo: 'RAW'   }, 
    { nombre: 'config_usuario.json',       tipo: 'RAW'   }  
  ];

  async function crearBackup() {
    try {
      procesando = true;
      
      let backupPayload = {
        meta: { app: "Asistente de Visitas", version: "5.0", fecha: new Date().toISOString() },
        archivos: {} as Record<string, any>
      };

      for (const item of MAPA_ARCHIVOS) {
        if (item.tipo === 'STORE') {
          // ESTRATEGIA STORE: Leemos memoria/disco unificados
          try {
            const store = new LazyStore(item.nombre);
            const entries = await store.entries();
            const objetoStore: Record<string, any> = {};
            for (const [k, v] of entries) objetoStore[k] = v;
            if (Object.keys(objetoStore).length > 0) backupPayload.archivos[item.nombre] = objetoStore;
          } catch(e) {}

        } else {
          // ESTRATEGIA RAW: Leemos disco físico (lo que realmente hay guardado)
          let contenido = null;
          // Prioridad: AppLocalData -> AppData
          if (await exists(item.nombre, { baseDir: BaseDirectory.AppLocalData })) {
            contenido = await readTextFile(item.nombre, { baseDir: BaseDirectory.AppLocalData });
          } else if (await exists(item.nombre, { baseDir: BaseDirectory.AppData })) {
            contenido = await readTextFile(item.nombre, { baseDir: BaseDirectory.AppData });
          }
          
          if (contenido) {
             try {
                backupPayload.archivos[item.nombre] = JSON.parse(contenido);
             } catch(e) { console.warn(`Archivo corrupto: ${item.nombre}`); }
          }
        }
      }

      if (Object.keys(backupPayload.archivos).length === 0) throw new Error("No hay datos guardados para respaldar.");

      const ruta = await save({
        title: 'Guardar Respaldo',
        defaultPath: `Respaldo_TOTAL_${new Date().toISOString().split('T')[0]}.json`,
        filters: [{ name: 'Respaldo App', extensions: ['json'] }]
      });

      if (ruta) {
        await writeTextFile(ruta, JSON.stringify(backupPayload, null, 2));
        await message('✅ Respaldo creado exitosamente.', { title: 'Éxito' });
      }

    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      await message(`Error al crear respaldo: ${msg}`, { kind: 'error' });
    } finally { procesando = false; }
  }

  async function restaurarBackup() {
    try {
      const confirmacion = await ask(
        "⚠️ Se reemplazarán TODOS los datos actuales.\n\n¿Continuar?", 
        { title: 'Restauración', kind: 'warning' }
      );
      if (!confirmacion) return;

      const ruta = await open({
        title: 'Seleccionar Respaldo',
        multiple: false,
        filters: [{ name: 'Respaldo App', extensions: ['json'] }]
      });

      if (!ruta) return;
      procesando = true;

      const pathToFile = typeof ruta === 'string' ? ruta : (ruta as any).path;
      const contenidoRaw = await readTextFile(pathToFile);
      const backupObj = JSON.parse(contenidoRaw);

      if (!backupObj.meta || backupObj.meta.app !== "Asistente de Visitas") {
        throw new Error("El archivo no es válido.");
      }

      let datosParaRestaurar: Record<string, any> = backupObj.archivos || {};
      
      // Compatibilidad con backups antiguos
      if (backupObj.data) {
        if(backupObj.data.circuito) datosParaRestaurar['registro_circuito_v1.json'] = backupObj.data.circuito;
        if(backupObj.data.tareas) datosParaRestaurar['app_data.json'] = backupObj.data.tareas;
        if(backupObj.data.documentos) datosParaRestaurar['registro_documentos.json'] = backupObj.data.documentos;
        if(backupObj.data.usuario) datosParaRestaurar['config_usuario.json'] = backupObj.data.usuario;
      }

      for (const item of MAPA_ARCHIVOS) {
        const datosDelArchivo = datosParaRestaurar[item.nombre];
        
        if (datosDelArchivo) {
          if (item.tipo === 'STORE') {
            // TIPO STORE: Inyectamos en memoria y guardamos
            const store = new LazyStore(item.nombre);
            await store.clear();
            for (const [key, val] of Object.entries(datosDelArchivo)) {
              await store.set(key, val);
            }
            await store.save(); 
            
          } else {
            // TIPO RAW (TAREAS, CONFIG, DOCS):
            // 1. "Matamos" la memoria del store si existe, para que no interfiera
            try {
                const storeFantasma = new LazyStore(item.nombre);
                await storeFantasma.clear(); 
                await storeFantasma.save(); // Esto deja el archivo en disco como "{}" o "[]"
            } catch(e) {}

            // 2. Sobrescribimos violentamente el archivo en disco con los datos correctos
            const jsonStr = JSON.stringify(datosDelArchivo, null, 2);
            await writeTextFile(item.nombre, jsonStr, { baseDir: BaseDirectory.AppLocalData });
            try { await writeTextFile(item.nombre, jsonStr, { baseDir: BaseDirectory.AppData }); } catch(e){}
          }
        }
      }

      await message('✅ Restauración completada. Reiniciando...', { title: 'Éxito', kind: 'info' });
      setTimeout(() => { window.location.reload(); }, 1000);

    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      await message(`Fallo en restauración: ${msg}`, { kind: 'error' });
    } finally { procesando = false; }
  }

  async function resetFabrica() {
    const confirmacion = await ask("☢️ ¿BORRAR TODO?", { title: 'Zona de Peligro', kind: 'error' });
    if (!confirmacion) return;

    procesando = true;
    try {
      for (const item of MAPA_ARCHIVOS) {
        // Limpieza lógica
        try { const s = new LazyStore(item.nombre); await s.clear(); await s.save(); } catch(e){}
        
        // Limpieza física
        const dirs = [BaseDirectory.AppLocalData, BaseDirectory.AppData];
        for (const dir of dirs) {
            if (await exists(item.nombre, { baseDir: dir })) await remove(item.nombre, { baseDir: dir });
        }
      }
      
      const dirs = [BaseDirectory.AppLocalData, BaseDirectory.AppData];
      for (const dir of dirs) {
          if (await exists('biblioteca_docs', { baseDir: dir })) await remove('biblioteca_docs', { baseDir: dir, recursive: true });
      }

      await message('Sistema limpio. Reiniciando.', { title: 'Reset' });
      setTimeout(() => { window.location.reload(); }, 1000);
    } catch (e) { await message("Error: " + e, { kind: 'error' }); } finally { procesando = false; }
  }
</script>

<div 
  class="modal-overlay" 
  role="button" 
  tabindex="0" 
  on:click|self={cerrar} 
  on:keydown={(e) => { if(e.key === 'Escape') cerrar() }}
>
  <div class="modal-content">
    <header>
      <div class="title-group">
        <div class="icon-box"><Database size={20} color="#475569"/></div>
        <h3>Configuración Global</h3>
      </div>
      <button class="close-btn" on:click={cerrar} aria-label="Cerrar">
        <X size={20} />
      </button>
    </header>
    
    <div class="scroll-content">
      <div class="options-grid">
        <div class="section-label">PERFIL DE USUARIO</div>
        <div class="card-container">
          <div class="card-body">
            <div class="row-inputs">
              <div class="input-group"><label for="uName"><User size={13}/> Nombre</label><input id="uName" type="text" bind:value={nombreUsuario} placeholder="Ej. Juan Pérez" /></div>
              <div class="input-group"><label for="uRole"><Briefcase size={13}/> Rol / Privilegio</label><input id="uRole" type="text" bind:value={rolUsuario} placeholder="Ej. Superintendente" /></div>
            </div>
            <div class="input-group"><label for="pdfFooter"><FileText size={13}/> Pie de Página (PDF)</label><input id="pdfFooter" type="text" bind:value={piePaginaPDF} placeholder="Texto al final de los informes PDF" /></div>
            <button class="save-profile-btn" on:click={guardarPerfil}><Save size={14} /> Guardar Perfil</button>
          </div>
        </div>
        <div class="divider"></div>
        <div class="section-label">GESTIÓN DE DATOS</div>
        
        <div class="storage-card" on:click={abrirCarpetaDatos} role="button" tabindex="0" on:keydown={(e) => { if(e.key === 'Enter') abrirCarpetaDatos() }}>
            <div class="storage-info"><FolderOpen size={20} /><div><h4>Ubicación de Archivos</h4><p>Acceder a la carpeta física de datos</p></div></div><div class="btn-mini">Abrir</div>
        </div>
        
        <div class="backup-actions">
          <button class="action-card" on:click={crearBackup} disabled={procesando}><div class="card-icon backup"><Save size={20} /></div><div class="text-col"><h4>Crear Respaldo</h4><p>Guardar TODO</p></div></button>
          <button class="action-card" on:click={restaurarBackup} disabled={procesando}><div class="card-icon restore"><FolderInput size={20} /></div><div class="text-col"><h4>Restaurar Datos</h4><p>Recuperar desde archivo</p></div></button>
        </div>
        <div class="danger-zone"><div class="danger-text"><AlertTriangle size={16} /><span>Restablecer Fábrica</span></div><button class="btn-reset-mini" on:click={resetFabrica} disabled={procesando}><Trash2 size={14} /> Borrar Todo</button></div>
      </div>
    </div>
    <footer><p class="copyright">v5.0 Final Stable</p><button class="btn-sec" on:click={cerrar}>Cerrar</button></footer>
  </div>
</div>

<style>
  .modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(3px); display: flex; align-items: center; justify-content: center; z-index: 99999; }
  .modal-content { background: white; width: 90%; max-width: 500px; max-height: 90vh; border-radius: 16px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); overflow: hidden; display: flex; flex-direction: column; font-family: 'Inter', sans-serif; border: 1px solid #e2e8f0; }
  header { padding: 16px 24px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; background: #fff; }
  .title-group { display: flex; gap: 12px; align-items: center; }
  .icon-box { background: #f1f5f9; padding: 8px; border-radius: 10px; color: #64748b; }
  h3 { margin: 0; font-size: 1.1rem; color: #0f172a; font-weight: 700; letter-spacing: -0.02em; }
  .close-btn { background: none; border: none; cursor: pointer; color: #94a3b8; padding: 6px; border-radius: 8px; transition: 0.2s; }
  .close-btn:hover { background: #f1f5f9; color: #ef4444; }
  .scroll-content { flex: 1; overflow-y: auto; padding: 24px; background: #ffffff; }
  .options-grid { display: flex; flex-direction: column; gap: 24px; }
  .section-label { font-size: 0.75rem; font-weight: 800; color: #94a3b8; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: -12px; margin-left: 4px; }
  .card-container { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; }
  .card-body { display: flex; flex-direction: column; gap: 14px; }
  .row-inputs { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .input-group { display: flex; flex-direction: column; gap: 6px; }
  .input-group label { display: flex; align-items: center; gap: 6px; font-size: 0.8rem; font-weight: 600; color: #64748b; }
  .input-group input { padding: 10px 12px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 0.9rem; transition: 0.2s; background: white; }
  .input-group input:focus { border-color: #3b82f6; outline: none; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
  .save-profile-btn { background: #0f172a; color: white; border: none; padding: 12px; border-radius: 8px; font-size: 0.9rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 8px; transition: 0.2s; }
  .save-profile-btn:hover { background: #1e293b; transform: translateY(-1px); }
  .divider { height: 1px; background: #e2e8f0; margin: 0 10px; }
  .storage-card { display: flex; justify-content: space-between; align-items: center; background: white; border: 1px solid #e2e8f0; padding: 16px; border-radius: 12px; cursor: pointer; transition: 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
  .storage-card:hover { border-color: #3b82f6; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1); transform: translateY(-1px); }
  .storage-info { display: flex; align-items: center; gap: 16px; color: #334155; }
  .storage-info h4 { margin: 0; font-size: 0.95rem; font-weight: 700; color: #1e293b; }
  .storage-info p { margin: 2px 0 0 0; font-size: 0.8rem; color: #64748b; }
  .btn-mini { font-size: 0.8rem; font-weight: 600; color: #2563eb; background: #eff6ff; padding: 6px 12px; border-radius: 6px; border: 1px solid #dbeafe; }
  .backup-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .action-card { display: flex; align-items: center; gap: 12px; text-align: left; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0; background: white; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
  .action-card:hover { transform: translateY(-2px); box-shadow: 0 8px 16px rgba(0,0,0,0.06); }
  .action-card:hover .card-icon.backup { background: #2563eb; color: white; }
  .action-card:hover .card-icon.restore { background: #059669; color: white; }
  .card-icon { padding: 10px; border-radius: 10px; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
  .card-icon.backup { background: #eff6ff; color: #2563eb; }
  .card-icon.restore { background: #ecfdf5; color: #059669; }
  .text-col h4 { margin: 0; font-size: 0.9rem; font-weight: 700; color: #1e293b; }
  .text-col p { margin: 2px 0 0 0; font-size: 0.75rem; color: #64748b; }
  .danger-zone { border: 1px dashed #fca5a5; background: #fef2f2; border-radius: 12px; padding: 16px; display: flex; justify-content: space-between; align-items: center; }
  .danger-text { display: flex; align-items: center; gap: 10px; color: #b91c1c; font-weight: 700; font-size: 0.85rem; }
  .btn-reset-mini { display: flex; align-items: center; gap: 8px; background: white; color: #dc2626; border: 1px solid #fecaca; padding: 8px 14px; border-radius: 8px; font-size: 0.8rem; font-weight: 700; cursor: pointer; transition: 0.2s; }
  .btn-reset-mini:hover { background: #dc2626; color: white; border-color: #dc2626; }
  footer { background: #f8fafc; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e2e8f0; }
  .copyright { font-size: 0.75rem; color: #94a3b8; font-weight: 500; }
  .btn-sec { background: white; border: 1px solid #cbd5e1; padding: 8px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; color: #475569; transition: 0.2s; }
  .btn-sec:hover { background: #f1f5f9; color: #1e293b; }
</style>
