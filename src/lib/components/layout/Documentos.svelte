<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  
  // IMPORTACIONES TAURI
  import { open as openDialog, ask } from '@tauri-apps/plugin-dialog';
  import { copyFile, mkdir, exists, BaseDirectory, readFile, writeTextFile, readTextFile, remove, readDir } from '@tauri-apps/plugin-fs';
  import { appLocalDataDir, join } from '@tauri-apps/api/path';
  import { invoke, convertFileSrc } from '@tauri-apps/api/core';

  // ICONOS
  import { 
    Folder, FileText, FileSpreadsheet, File as FileIcon, 
    Search, Plus, Download, ChevronRight, Home, 
    Trash2, ArrowLeft, FolderPlus
  } from 'lucide-svelte';

  const dispatch = createEventDispatcher();

  // TIPOS
  interface DocFile { id: string; name: string; type: 'pdf' | 'docx' | 'xlsx' | 'folder' | 'other'; path: string; date: string; size?: string; }
  
  // ESTADO
  let rootFiles: DocFile[] = []; 
  let fileListDisplayed: DocFile[] = [];
  let searchQuery = '';
  let selectedFile: DocFile | null = null;
  let currentPathLabel: string[] = ['Inicio']; 
  let currentPathUrl: string = ''; 
  let pdfUrl: string | null = null;
  const DB_FILE = 'registro_documentos.json';

  // --- LÓGICA (Intacta) ---
  const getToday = () => new Date().toLocaleDateString('es-ES');
  async function guardarEnDisco() { try { await writeTextFile(DB_FILE, JSON.stringify(rootFiles, null, 2), { baseDir: BaseDirectory.AppLocalData }); } catch (e) { console.error(e); } }
  async function cargarDesdeDisco() { try { if (await exists(DB_FILE, { baseDir: BaseDirectory.AppLocalData })) { const json = await readTextFile(DB_FILE, { baseDir: BaseDirectory.AppLocalData }); rootFiles = JSON.parse(json); fileListDisplayed = [...rootFiles]; } } catch (e) { console.error(e); } }
  
  onMount(async () => { await cargarDesdeDisco(); });
  $: filteredFiles = fileListDisplayed.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));

  function detectType(nameOrPath: string, isDir: boolean = false): DocFile['type'] { if (isDir) return 'folder'; const l = nameOrPath.toLowerCase(); if (l.endsWith('.pdf')) return 'pdf'; if (l.endsWith('.docx') || l.endsWith('.doc')) return 'docx'; if (l.endsWith('.xlsx') || l.endsWith('.xls')) return 'xlsx'; return 'other'; }
  function getIcon(type: string) { switch (type) { case 'folder': return Folder; case 'pdf': return FileText; case 'xlsx': return FileSpreadsheet; case 'docx': return FileText; default: return FileIcon; } }
  function getColorClass(type: string) { switch (type) { case 'folder': return 'text-yellow-500'; case 'pdf': return 'text-red-500'; case 'xlsx': return 'text-green-600'; case 'docx': return 'text-blue-600'; default: return 'text-gray-500'; } }

  function irAInicio() { currentPathLabel = ['Inicio']; currentPathUrl = ''; fileListDisplayed = [...rootFiles]; selectedFile = null; pdfUrl = null; }
  
  async function abrirCarpeta(carpeta: DocFile) {
      try {
          const entradas = await readDir(carpeta.path);
          const archivos = await Promise.all(entradas.map(async (e) => ({ id: await join(carpeta.path, e.name), name: e.name, type: detectType(e.name, e.isDirectory), path: await join(carpeta.path, e.name), date: '-', size: '-' } as DocFile)));
          fileListDisplayed = archivos.filter(f => !f.name.startsWith('.'));
          currentPathLabel = [...currentPathLabel, carpeta.name]; currentPathUrl = carpeta.path;
      } catch (error) { await ask("Error al abrir carpeta.", { kind: 'error' }); }
  }

  async function handleFileClick(file: DocFile) {
    if (file.type === 'folder') { await abrirCarpeta(file); } 
    else { selectedFile = file; if (file.type === 'pdf') await cargarPdfEnMemoria(file.path); else pdfUrl = null; }
  }

  async function importFiles() {
    const selected = await openDialog({ multiple: true, filters: [{ name: 'Docs', extensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'jpg', 'png'] }] });
    if (!selected) return;
    const paths = Array.isArray(selected) ? selected : [selected];
    const appData = await appLocalDataDir();
    if (!(await exists('biblioteca_docs', { baseDir: BaseDirectory.AppLocalData }))) await mkdir('biblioteca_docs', { baseDir: BaseDirectory.AppLocalData });
    
    let last: DocFile | null = null;
    for (const src of paths) {
        const name = src.split(/[\\/]/).pop() || 'file';
        await copyFile(src, `biblioteca_docs/${name}`, { toPathBaseDir: BaseDirectory.AppLocalData });
        const newItem: DocFile = { id: Date.now() + Math.random().toString(), name, type: detectType(name), path: await join(appData, 'biblioteca_docs', name), date: getToday() };
        rootFiles = [...rootFiles, newItem]; last = newItem;
    }
    if (currentPathUrl === '') fileListDisplayed = [...rootFiles];
    await guardarEnDisco();
    if (last && currentPathUrl === '') handleFileClick(last);
  }

  async function linkFolder() {
      const sel = await openDialog({ directory: true });
      if (typeof sel === 'string') {
          const name = sel.split(/[\\/]/).pop() || 'Carpeta';
          const newF: DocFile = { id: Date.now().toString(), name, type: 'folder', path: sel, date: getToday() };
          rootFiles = [...rootFiles, newF];
          if (currentPathUrl === '') fileListDisplayed = [...rootFiles];
          await guardarEnDisco();
      }
  }

  async function cargarPdfEnMemoria(ruta: string) {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      const content = await readFile(ruta);
      pdfUrl = URL.createObjectURL(new Blob([content], { type: 'application/pdf' }));
  }

  async function openExternally() {
      if(selectedFile) await invoke('abrir_archivo_nativo', { ruta: selectedFile.path }).catch(e => ask(String(e)));
  }

  async function eliminarArchivo(f: DocFile, e?: MouseEvent) {
      if (e) e.stopPropagation();
      if (!await ask(`¿Eliminar "${f.name}"?`, { kind: 'warning', okLabel: 'Eliminar', cancelLabel: 'Cancelar' })) return;
      try { await remove(f.path, { recursive: true }); } catch {}
      fileListDisplayed = fileListDisplayed.filter(x => x.path !== f.path);
      if (currentPathUrl === '') { rootFiles = rootFiles.filter(x => x.id !== f.id); await guardarEnDisco(); }
      if (selectedFile?.path === f.path) { selectedFile = null; pdfUrl = null; }
  }
</script>

<div class="docs-layout">
  
  <header class="top-bar">
    <div class="left-actions">
      <button class="btn-back" on:click={() => dispatch('volver')} title="Volver al Dashboard">
        <ArrowLeft size={20} />
      </button>
      <h2>Documentos</h2>
    </div>
    
    <div class="search-box">
      <Search size={18} class="search-icon" />
      <input type="text" placeholder="Buscar..." bind:value={searchQuery} />
    </div>
  </header>

  <div class="body-split">
    
    <aside class="sidebar">
      <div class="toolbar-compact">
        <div class="toolbar-header">
          <h3>Archivos</h3>
        </div>
        <div class="toolbar-actions">
          <button class="toolbar-btn import-btn" on:click={importFiles} title="Importar archivos">
            <div class="btn-icon">
              <Download size={16} />
            </div>
            <span class="btn-text">Importar</span>
          </button>
          
          <button class="toolbar-btn folder-btn" on:click={linkFolder} title="Vincular carpeta">
            <div class="btn-icon">
              <FolderPlus size={16} />
            </div>
            <span class="btn-text">Carpeta</span>
          </button>
        </div>
      </div>

      <div class="breadcrumbs">
         <button class="crumb-home" on:click={irAInicio}><Home size={14}/></button>
         {#each currentPathLabel.slice(1) as crumb}
            <ChevronRight size={12} style="opacity:0.5; margin:0 2px;" />
            <span>{crumb}</span>
         {/each}
      </div>

      <div class="file-list-scroll">
         {#each filteredFiles as file (file.id)}
             <div class="file-row" class:active={selectedFile?.id === file.id} on:click={() => handleFileClick(file)} on:keydown={() => {}} role="button" tabindex="0">
                 <div class="icon-box {getColorClass(file.type)}">
                     <svelte:component this={getIcon(file.type)} size={18} />
                 </div>
                 <div class="file-data">
                     <span class="fname">{file.name}</span>
                     <span class="fdate">{file.date}</span>
                 </div>
                 <div class="actions-hover">
                    <button class="del-btn" on:click|stopPropagation={(e) => eliminarArchivo(file, e)}><Trash2 size={15}/></button>
                 </div>
             </div>
         {/each}
         {#if filteredFiles.length === 0}
            <div class="empty-msg">Carpeta vacía</div>
         {/if}
      </div>
    </aside>

    <main class="preview-panel">
      {#if selectedFile}
          <div class="viewer-header">
             <div class="viewer-title">
                 <div class="icon-box {getColorClass(selectedFile.type)}"><svelte:component this={getIcon(selectedFile.type)} size={20} /></div>
                 <span>{selectedFile.name}</span>
             </div>
             <button class="del-btn visible" on:click={() => selectedFile && eliminarArchivo(selectedFile)}><Trash2 size={18}/></button>
          </div>

          <div class="viewer-body">
              {#if selectedFile.type === 'pdf' && pdfUrl}
                  <div class="absolute-pdf-wrapper">
                      <iframe 
                          src="{pdfUrl}#toolbar=1&navpanes=0&view=FitH" 
                          title="Visor PDF"
                      ></iframe>
                  </div>
              {:else if ['jpg', 'png'].includes(selectedFile.type)}
                  <div class="img-center">
                      <img src={convertFileSrc(selectedFile.path)} alt="Preview" />
                  </div>
              {:else}
                  <div class="no-preview">
                      <svelte:component this={getIcon(selectedFile.type)} size={48} class={getColorClass(selectedFile.type)}/>
                      <p>Vista previa no disponible</p>
                      <button class="btn-open" on:click={openExternally}>Abrir archivo</button>
                  </div>
              {/if}
          </div>
      {:else}
          <div class="empty-state">
              <FileIcon size={64} color="#e2e8f0" />
              <p>Selecciona un documento</p>
          </div>
      {/if}
    </main>

  </div>
</div>

<style>
    /* Estructura Principal */
    .docs-layout {
        display: flex;
        flex-direction: column;
        height: 100vh;
        width: 100%;
        background: #f8fafc;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif;
        color: #334155;
        overflow: hidden;
    }

    /* Header Normal */
    .top-bar {
        height: 60px;
        flex-shrink: 0;
        background: white;
        border-bottom: 1px solid #e2e8f0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0 20px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        overflow: hidden;
    }

    /* Cuerpo Dividido */
    .body-split {
        flex: 1;
        display: flex;
        overflow: hidden;
        min-height: 0;
    }

    /* Barra Lateral */
    .sidebar {
        width: 320px;
        min-width: 320px;
        background: white;
        border-right: 1px solid #e2e8f0;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

    /* TOOLBAR MEJORADA - COMPACTA */
    .toolbar-compact {
        padding: 16px 16px 12px;
        border-bottom: 1px solid #f1f5f9;
        background: white;
        flex-shrink: 0;
    }

    .toolbar-header { margin-bottom: 12px; }
    .toolbar-header h3 {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .toolbar-actions { display: flex; gap: 8px; }

    .toolbar-btn {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 8px 12px;
        border-radius: 8px;
        border: 1px solid;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        height: 36px;
        min-height: 36px;
    }
    .toolbar-btn:hover { transform: translateY(-1px); }

    .import-btn { background: #3b82f6; color: white; border-color: #3b82f6; }
    .import-btn:hover { background: #2563eb; border-color: #2563eb; box-shadow: 0 2px 8px rgba(37, 99, 235, 0.2); }

    .folder-btn { background: white; color: #475569; border-color: #cbd5e1; }
    .folder-btn:hover { background: #f8fafc; border-color: #94a3b8; box-shadow: 0 2px 8px rgba(148, 163, 184, 0.1); }

    .btn-icon { display: flex; align-items: center; justify-content: center; }
    .btn-text { white-space: nowrap; }

    /* --- LUPA CORREGIDA (Centrado Perfecto) --- */
    .search-box {
        position: relative;
        width: 280px;
        height: 40px;
    }

    .search-icon {
        position: absolute;
        left: 12px;
        top: 50%;
        transform: translateY(-50%);
        color: #94a3b8;
        pointer-events: none;
        z-index: 10;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .search-box input {
        width: 100%;
        height: 100%;
        padding: 0 12px 0 38px;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        outline: none;
        background: white;
        font-size: 14px;
        color: #334155;
        transition: all 0.2s ease;
        box-sizing: border-box;
    }
    .search-box input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
    .search-box input::placeholder { color: #94a3b8; }

    /* Breadcrumbs */
    .breadcrumbs {
        padding: 10px 16px;
        font-size: 13px;
        color: #64748b;
        background: #f8fafc;
        border-bottom: 1px solid #e2e8f0;
        display: flex;
        align-items: center;
        flex-shrink: 0;
    }
    .crumb-home { border: none; background: none; cursor: pointer; padding: 0; display: flex; color: #64748b; }
    .crumb-home:hover { color: #334155; }

    /* Lista */
    .file-list-scroll { flex: 1; overflow-y: auto; padding: 8px; min-height: 0; }
    .file-row { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px; cursor: pointer; margin-bottom: 4px; transition: background 0.2s; border: 1px solid transparent; }
    .file-row:hover { background: #f1f5f9; border-color: #e2e8f0; }
    .file-row.active { background: #eff6ff; border: 1px solid #bfdbfe; }
    .file-data { flex: 1; overflow: hidden; display: flex; flex-direction: column; min-width: 0; }
    .fname { font-weight: 500; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .fdate { font-size: 11px; color: #94a3b8; }
    .actions-hover { display: flex; gap: 4px; opacity: 0; transition: opacity 0.2s; }
    .file-row:hover .actions-hover { opacity: 1; }
    .del-btn { background: none; border: none; color: #ef4444; cursor: pointer; padding: 4px; border-radius: 4px; display: flex; align-items: center; justify-content: center; }
    .del-btn:hover { background: #fee2e2; }
    .del-btn.visible { opacity: 1; }

    /* Panel Principal */
    .preview-panel { flex: 1; background: #f8fafc; display: flex; flex-direction: column; overflow: hidden; position: relative; }
    .viewer-header { height: 56px; flex-shrink: 0; background: white; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05); }
    .viewer-title { display: flex; align-items: center; gap: 10px; font-weight: 600; overflow: hidden; flex: 1; }
    .viewer-title span { font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 500px; }
    .viewer-body { flex: 1; position: relative; overflow: hidden; background: white; }
    .absolute-pdf-wrapper { position: absolute; top: 0; left: 0; right: 0; bottom: 0; width: 100%; height: 100%; overflow: hidden; background: #f1f5f9; }
    iframe { width: 100%; height: 100%; border: none; display: block; background: white; }
    .empty-msg { text-align: center; padding: 40px 20px; color: #94a3b8; font-size: 14px; }
    .empty-state { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #94a3b8; gap: 16px; }
    .empty-state p { font-size: 15px; color: #64748b; }
    .no-preview { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #94a3b8; gap: 20px; padding: 40px; }
    .no-preview p { font-size: 15px; color: #64748b; }
    .btn-open { padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; font-size: 14px; transition: background 0.2s; }
    .btn-open:hover { background: #2563eb; }
    .img-center { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; overflow: auto; background: #f8fafc; padding: 20px; }
    .img-center img { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); }
    .text-yellow-500 { color: #eab308; }
    .text-red-500 { color: #ef4444; }
    .text-green-600 { color: #16a34a; }
    .text-blue-600 { color: #2563eb; }
    .text-gray-500 { color: #64748b; }
    .left-actions { display: flex; align-items: center; gap: 15px; }
    .btn-back { background: none; border: none; cursor: pointer; color: #64748b; padding: 8px; border-radius: 6px; display: flex; align-items: center; justify-content: center; }
    .btn-back:hover { background: #f1f5f9; color: #0f172a; }
    .left-actions h2 { margin: 0; font-size: 20px; font-weight: 600; color: #1e293b; }
    .file-list-scroll::-webkit-scrollbar { width: 6px; }
    .file-list-scroll::-webkit-scrollbar-track { background: transparent; }
    .file-list-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
    .file-list-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
    
    @media (max-width: 1024px) {
        .sidebar { width: 280px; min-width: 280px; }
        .search-box { width: 240px; }
    }
</style>