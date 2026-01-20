<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  
  // --- IMPORTACIONES DE TAURI ---
  import { open as openDialog, ask } from '@tauri-apps/plugin-dialog';
  import { copyFile, mkdir, exists, BaseDirectory, readFile, writeTextFile, readTextFile, remove, readDir } from '@tauri-apps/plugin-fs';
  import { appLocalDataDir, join } from '@tauri-apps/api/path';
  import { invoke, convertFileSrc } from '@tauri-apps/api/core';

  // --- ICONOS ---
  import { 
    Folder, FileText, FileSpreadsheet, File as FileIcon, 
    Search, Plus, Download, ChevronRight, Home, 
    Trash2, ExternalLink, ArrowLeft, AlertTriangle
  } from 'lucide-svelte';

  const dispatch = createEventDispatcher();

  // --- TIPOS ---
  interface DocFile {
    id: string;
    name: string;
    type: 'pdf' | 'docx' | 'xlsx' | 'folder' | 'other';
    path: string; 
    date: string;
    size?: string;
  }

  // --- ESTADO ---
  let rootFiles: DocFile[] = []; 
  let fileListDisplayed: DocFile[] = [];
  let searchQuery = '';
  let selectedFile: DocFile | null = null;
  let currentPathLabel: string[] = ['Inicio']; 
  let currentPathUrl: string = ''; 
  let pdfUrl: string | null = null;
  
  const DB_FILE = 'registro_documentos.json';

  // --- PERSISTENCIA ---
  async function guardarEnDisco() {
    try {
        const json = JSON.stringify(rootFiles, null, 2);
        await writeTextFile(DB_FILE, json, { baseDir: BaseDirectory.AppLocalData });
    } catch (error) { console.error("Error guardando BD:", error); }
  }

  async function cargarDesdeDisco() {
    try {
        if (await exists(DB_FILE, { baseDir: BaseDirectory.AppLocalData })) {
            const json = await readTextFile(DB_FILE, { baseDir: BaseDirectory.AppLocalData });
            rootFiles = JSON.parse(json);
            fileListDisplayed = [...rootFiles];
        }
    } catch (error) { console.error("Error leyendo BD:", error); }
  }

  onMount(async () => { await cargarDesdeDisco(); });

  $: filteredFiles = fileListDisplayed.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // --- UTILIDADES ---
  const getToday = () => new Date().toLocaleDateString('es-ES');

  function detectType(nameOrPath: string, isDir: boolean = false): DocFile['type'] {
      if (isDir) return 'folder';
      const lower = nameOrPath.toLowerCase();
      if (lower.endsWith('.pdf')) return 'pdf';
      if (lower.endsWith('.docx') || lower.endsWith('.doc')) return 'docx';
      if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) return 'xlsx';
      return 'other';
  }

  function getIcon(type: string) {
    switch (type) {
      case 'folder': return Folder;
      case 'pdf': return FileText;
      case 'xlsx': return FileSpreadsheet;
      case 'docx': return FileText;
      default: return FileIcon;
    }
  }

  function getColorClass(type: string) {
    switch (type) {
      case 'folder': return 'text-yellow-500';
      case 'pdf': return 'text-red-500';
      case 'xlsx': return 'text-green-600';
      case 'docx': return 'text-blue-600';
      default: return 'text-gray-500';
    }
  }

  // --- NAVEGACIÓN ---
  function irAInicio() {
      currentPathLabel = ['Inicio'];
      currentPathUrl = ''; 
      fileListDisplayed = [...rootFiles];
      selectedFile = null;
      pdfUrl = null;
  }

  async function abrirCarpeta(carpeta: DocFile) {
      try {
          const entradas = await readDir(carpeta.path);
          const archivosEnCarpeta: DocFile[] = await Promise.all(entradas.map(async (entry) => {
              const fullPath = await join(carpeta.path, entry.name);
              return {
                  id: fullPath, 
                  name: entry.name,
                  type: detectType(entry.name, entry.isDirectory),
                  path: fullPath,
                  date: '-', 
                  size: '-'
              };
          }));
          fileListDisplayed = archivosEnCarpeta.filter(f => !f.name.startsWith('.'));
          currentPathLabel = [...currentPathLabel, carpeta.name];
          currentPathUrl = carpeta.path;
      } catch (error) {
          console.error("Error carpeta:", error);
          await ask("No se pudo acceder al contenido.", { title: "Error", kind: 'error' });
      }
  }

  async function handleFileClick(file: DocFile) {
    if (file.type === 'folder') {
      await abrirCarpeta(file);
    } else {
      selectedFile = file;
      if (file.type === 'pdf') await cargarPdfEnMemoria(file.path);
      else pdfUrl = null;
    }
  }

  // --- IMPORTAR ---
  async function importFiles() {
    try {
        const selected = await openDialog({
            multiple: true,
            filters: [{ name: 'Documentos', extensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'jpg', 'png'] }]
        });

        if (!selected) return;
        const pathsToImport = Array.isArray(selected) ? selected : [selected];
        
        const CARPETA_INTERNA = 'biblioteca_docs';
        if (!(await exists(CARPETA_INTERNA, { baseDir: BaseDirectory.AppLocalData }))) {
            await mkdir(CARPETA_INTERNA, { baseDir: BaseDirectory.AppLocalData });
        }

        const appDataPath = await appLocalDataDir();
        let ultimoImportado: DocFile | null = null;

        for (const sourcePath of pathsToImport) {
            const fileName = sourcePath.split(/[\\/]/).pop() || 'archivo_sin_nombre';
            const destinoRelativo = `${CARPETA_INTERNA}/${fileName}`;
            const destinoAbsoluto = await join(appDataPath, CARPETA_INTERNA, fileName);

            await copyFile(sourcePath, destinoRelativo, { toPathBaseDir: BaseDirectory.AppLocalData });
            
            const newDoc: DocFile = {
                id: Date.now().toString() + Math.random(),
                name: fileName,
                type: detectType(fileName),
                path: destinoAbsoluto,
                date: getToday(),
                size: '-'
            };
            rootFiles = [...rootFiles, newDoc];
            ultimoImportado = newDoc;
        }

        if (currentPathUrl === '') fileListDisplayed = [...rootFiles];
        await guardarEnDisco();
        if (ultimoImportado && currentPathUrl === '') await handleFileClick(ultimoImportado);

    } catch (err) {
        console.error("Error importando:", err);
        alert("Error al importar archivos.");
    }
  }

  async function linkFolder() {
    try {
        const selected = await openDialog({ directory: true, multiple: false });
        if (selected && typeof selected === 'string') {
            const name = selected.split(/[\\/]/).pop() || 'Nueva Carpeta';
            const newFolder: DocFile = {
                id: Date.now().toString(),
                name: name,
                type: 'folder',
                path: selected,
                date: getToday()
            };
            rootFiles = [...rootFiles, newFolder];
            if (currentPathUrl === '') fileListDisplayed = [...rootFiles];
            await guardarEnDisco();
        }
    } catch (err) { console.error(err); }
  }

  async function cargarPdfEnMemoria(ruta: string) {
      try {
          if (pdfUrl) URL.revokeObjectURL(pdfUrl);
          const contenido = await readFile(ruta);
          const blob = new Blob([contenido], { type: 'application/pdf' });
          pdfUrl = URL.createObjectURL(blob);
      } catch (error) { console.error("Error PDF:", error); }
  }

  // --- FUNCIÓN ABRIR EXTERNO ---
  async function openExternally() {
    if(!selectedFile) return;
    try {
        await invoke('abrir_archivo_nativo', { ruta: selectedFile.path });
    } catch (e) {
        console.error("Fallo:", e);
        const txt = String(e);
        await ask(`No se pudo abrir el archivo.\n\nError: ${txt}`, { title: "Error", kind: 'error' });
    }
  }

  // --- LÓGICA DE ELIMINAR ACTUALIZADA ---
  async function eliminarArchivo(archivo: DocFile, event?: MouseEvent) {
    if (event) event.stopPropagation();
    
    const esArchivoDeBD = currentPathUrl === ''; 
    const esCarpeta = archivo.type === 'folder';

    const mensaje = esCarpeta 
        ? `¿Seguro que deseas eliminar la carpeta "${archivo.name}" y TODO su contenido?`
        : `¿Eliminar "${archivo.name}"?`;

    const confirmar = await ask(
        mensaje, 
        { 
            title: esCarpeta ? 'Eliminar Carpeta' : 'Eliminar Archivo', 
            kind: 'warning', 
            okLabel: 'Eliminar', 
            cancelLabel: 'Cancelar' 
        }
    );

    if (!confirmar) return;

    try {
        try {
            await remove(archivo.path, { recursive: true });
        } catch (e) { 
            console.warn("Error borrado físico (puede que no exista o permisos):", e); 
        }

        fileListDisplayed = fileListDisplayed.filter(f => f.path !== archivo.path);

        if (esArchivoDeBD) {
            rootFiles = rootFiles.filter(f => f.id !== archivo.id);
            await guardarEnDisco();
        }

        if (selectedFile && selectedFile.path === archivo.path) {
            selectedFile = null;
            pdfUrl = null;
        }
    } catch (error) { 
        console.error("Error eliminando:", error);
        await ask("Error al eliminar el elemento.", { kind: 'error' });
    }
  }
</script>

<div class="docs-layout">
  <header class="top-bar">
    <div class="left-actions">
      <button class="btn-back" on:click={() => dispatch('volver')} title="Volver al Dashboard">
        <ArrowLeft size={20} />
      </button>
      <h2>Documentos del Circuito</h2>
    </div>

    <div class="search-box">
      <Search size={18} class="search-icon" />
      <input type="text" placeholder="Buscar documento..." bind:value={searchQuery} />
    </div>
  </header>

  <div class="main-split">
    <aside class="sidebar-explorer">
      <div class="toolbar">
        <div class="btn-group">
            <button class="btn-tool primary" on:click={importFiles} title="Importar">
                <Download size={16} /> <span>Importar</span>
            </button>
            <button class="btn-tool secondary" on:click={linkFolder} title="Vincular Carpeta">
                <Plus size={16} /> <span>Carpeta</span>
            </button>
        </div>
      </div>

      <div class="breadcrumbs">
        <button class="crumb-home" on:click={irAInicio}>
            <Home size={14} />
        </button>
        {#each currentPathLabel.slice(1) as crumb}
            <ChevronRight size={12} class="crumb-sep" />
            <span class="crumb-text">{crumb}</span>
        {/each}
      </div>

      <div class="file-list">
        {#if fileListDisplayed.length === 0}
            <div class="empty-list-sidebar">
                <p>Carpeta vacía</p>
                <small>Usa "Importar" para agregar.</small>
            </div>
        {:else if filteredFiles.length === 0}
            <div class="empty-search"><p>Sin resultados.</p></div>
        {:else}
            {#each filteredFiles as file (file.id)}
            <div 
                class="file-item" 
                class:active={selectedFile?.id === file.id}
                on:click={() => handleFileClick(file)}
                on:keydown={(e) => e.key === 'Enter' && handleFileClick(file)}
                role="button" 
                tabindex="0"
            >
                <div class="file-icon {getColorClass(file.type)}">
                    <svelte:component this={getIcon(file.type)} size={20} />
                </div>
                <div class="file-info">
                    <span class="file-name">{file.name}</span>
                    <span class="file-meta">{file.date}</span>
                </div>
                
                <div class="file-actions-hover">
                    <button class="btn-mini-delete" title={file.type === 'folder' ? "Eliminar Carpeta" : "Eliminar Archivo"}
                        on:click|stopPropagation={(e) => eliminarArchivo(file, e)}>
                        <Trash2 size={16} />
                    </button>
                    
                    {#if file.type === 'folder'}
                      <ChevronRight size={16} class="folder-arrow" />
                    {/if}
                </div>

            </div>
            {/each}
        {/if}
      </div>
    </aside>

    <main class="preview-panel">
      {#if selectedFile}
        <div class="preview-header">
            <div class="preview-title">
                <div class="icon-large {getColorClass(selectedFile.type)}">
                    <svelte:component this={getIcon(selectedFile.type)} size={24} />
                </div>
                <h3 class="file-title-text" title={selectedFile.name}>{selectedFile.name}</h3>
            </div>
            <div class="preview-actions">
                <button 
                    class="btn-preview delete" 
                    title="Eliminar este documento"
                    on:click={() => selectedFile && eliminarArchivo(selectedFile)}
               >
                    <Trash2 size={18} />
               </button>
            </div>
        </div>

        <div class="preview-content">
           {#if selectedFile.type === 'pdf' && pdfUrl}
                <iframe 
                    src="{pdfUrl}#toolbar=1&view=FitH" 
                    title="Visor PDF" 
                    width="100%" 
                    height="100%"
                    class="pdf-viewer"
                ></iframe>
           {:else if ['jpg', 'png'].includes(selectedFile.type)}
                <img src={convertFileSrc(selectedFile.path)} alt="Vista previa" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
           {:else}
                <div class="placeholder-viewer">
                    <svelte:component this={getIcon(selectedFile.type)} size={64} class={getColorClass(selectedFile.type)}/>
                    <p style="margin-top: 20px;">Vista previa no disponible</p>
                    <button class="btn-open-real" on:click={openExternally}>Abrir archivo</button>
                </div>
           {/if}
        </div>
      {:else}
        <div class="empty-state">
            <div class="empty-icon-bg"><FileText size={64} color="#cbd5e1" /></div>
            <h3>Selecciona un documento</h3>
        </div>
      {/if}
    </main>
  </div>
</div>

<style>
  :global(body), :global(html) { margin: 0; padding: 0; height: 100%; width: 100%; overflow: hidden; }
  .docs-layout { display: flex; flex-direction: column; height: 100vh; width: 100vw; background: #f8fafc; font-family: 'Segoe UI', system-ui, sans-serif; color: #334155; }
  
  .top-bar { background: white; border-bottom: 1px solid #e2e8f0; padding: 0 20px; display: flex; justify-content: space-between; align-items: center; height: 60px; flex-shrink: 0; }
  .left-actions { display: flex; align-items: center; gap: 15px; }
  .btn-back { background: none; border: none; cursor: pointer; color: #64748b; padding: 8px; border-radius: 6px; }
  .btn-back:hover { background: #f1f5f9; color: #0f172a; }

  /* SEARCH BOX */
  .search-box { position: relative; width: 300px; display: flex; align-items: center; }
  .search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #94a3b8; pointer-events: none; z-index: 10; }
  .search-box input { width: 100%; padding: 8px 10px 8px 36px; border: 1px solid #cbd5e1; border-radius: 8px; outline: none; font-size: 0.9rem; transition: border 0.2s; background: white; }
  .search-box input:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.1); }
  
  .main-split { display: flex; flex: 1; overflow: hidden; height: 100%; }
  .sidebar-explorer { width: 320px; background: white; border-right: 1px solid #e2e8f0; display: flex; flex-direction: column; flex-shrink: 0; }
  .toolbar { padding: 15px; border-bottom: 1px solid #f1f5f9; }
  .btn-group { display: flex; gap: 10px; }
  .btn-tool { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px; border-radius: 6px; cursor: pointer; font-size: 0.85rem; }
  .btn-tool.primary { background: #3b82f6; color: white; border: none; }
  .btn-tool.secondary { background: white; border: 1px solid #cbd5e1; }
  
  .breadcrumbs { display: flex; align-items: center; padding: 10px 15px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-size: 0.8rem; color: #64748b; }
  .crumb-home { border: none; background: none; padding: 4px; cursor: pointer; }
  .crumb-sep { margin: 0 4px; opacity: 0.5; }
  
  .file-list { flex: 1; overflow-y: auto; padding: 10px; }
  .empty-list-sidebar { text-align: center; padding: 20px; color: #94a3b8; }
  
  .file-item { display: flex; align-items: center; gap: 12px; padding: 10px; border-radius: 8px; cursor: pointer; margin-bottom: 2px; position: relative; }
  .file-item:hover { background: #f1f5f9; }
  .file-item.active { background: #eff6ff; border-color: #bfdbfe; }
  
  .file-info { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
  .file-name { font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .file-meta { font-size: 0.75rem; color: #94a3b8; }
  .file-actions-hover { display: flex; gap: 4px; align-items: center; }
  
  /* ESTILOS BOTON ELIMINAR */
  .btn-mini-delete { background: transparent; border: none; padding: 4px; color: #ef4444; cursor: pointer; opacity: 0; border-radius: 4px; transition: 0.2s; }
  .btn-mini-delete:hover { background: #fee2e2; }
  .file-item:hover .btn-mini-delete { opacity: 1; }
  
  .preview-panel { flex: 1; background: #f8fafc; display: flex; flex-direction: column; padding: 20px; height: 100%; box-sizing: border-box; }
  .preview-header { display: flex; justify-content: space-between; align-items: center; background: white; padding: 15px 20px; border: 1px solid #e2e8f0; border-bottom: none; border-radius: 10px 10px 0 0; flex-shrink: 0; }
  .preview-title { display: flex; align-items: center; gap: 12px; overflow: hidden; }
  .file-title-text { margin: 0; font-size: 1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 400px; }
  
  .btn-preview { padding: 6px 12px; border: 1px solid #cbd5e1; background: white; border-radius: 6px; cursor: pointer; color: #475569; }
  
  .preview-content { flex: 1; background: white; border: 1px solid #e2e8f0; border-radius: 0 0 10px 10px; display: flex; flex-direction: column; overflow: hidden; position: relative; height: 100%; }
  
  /* ESTILOS Iframe PDF */
  .pdf-viewer {
      width: 100%;
      height: 100%;
      border: none;
      display: block;
      background: #f1f5f9;
      flex: 1; /* Esto asegura que crezca para llenar todo el espacio */
  }
  
  iframe { width: 100%; height: 100%; border: none; display: block; background: #f1f5f9; }
  
  .empty-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #94a3b8; text-align: center; }
  .empty-icon-bg { background: #e2e8f0; width: 100px; height: 100px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 20px; }
  
  .placeholder-viewer { text-align: center; color: #64748b; margin: auto; }
  .btn-open-real { margin-top: 10px; padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; }

  /* Colores */
  .folder-arrow { color: #cbd5e1; }
  .text-yellow-500 { color: #eab308; }
  .text-red-500 { color: #ef4444; }
  .text-green-600 { color: #16a34a; }
  .text-blue-600 { color: #2563eb; }
  .text-gray-500 { color: #64748b; }
</style>
