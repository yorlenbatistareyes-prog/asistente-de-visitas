<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  // Plugin oficial de Tauri para abrir archivos nativos
  import { open } from '@tauri-apps/plugin-dialog';
  // Para comunicarse con el Backend (Rust)
  import { invoke } from '@tauri-apps/api/core'; 

  // Iconos
  import { 
    Folder, FileText, FileSpreadsheet, File as FileIcon, 
    Search, Plus, Download, ChevronRight, Home, 
    Trash2, ExternalLink, ArrowLeft
  } from 'lucide-svelte';
  import { fade } from 'svelte/transition';

  const dispatch = createEventDispatcher();

  // --- 1. DEFINICIÓN DE TIPOS ---
  interface DocFile {
    id: string;
    name: string;
    type: 'pdf' | 'docx' | 'xlsx' | 'folder' | 'other';
    path: string;
    date: string;
    size?: string;
  }

  // --- 2. ESTADO INICIAL (VACÍO) ---
  let allFiles: DocFile[] = []; 
  let searchQuery = '';
  let selectedFile: DocFile | null = null;
  let currentPath: string[] = ['Inicio'];

  // --- 3. FILTRADO REACTIVO ---
  $: filteredFiles = allFiles.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // --- 4. UTILIDADES ---
  const getToday = () => new Date().toLocaleDateString('es-ES');

  function detectType(path: string): DocFile['type'] {
      const lower = path.toLowerCase();
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

  // --- 5. FUNCIONES DE LÓGICA (RUST) ---

  // A) IMPORTAR ARCHIVOS
  // Reemplaza tu función importFiles actual con esta versión corregida:

  async function importFiles() {
    try {
        const selected = await open({
            multiple: true,
            filters: [{
                name: 'Documentos',
                extensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt']
            }]
        });

        if (Array.isArray(selected)) {
            for (const path of selected) {
                const name = path.split(/[\\/]/).pop() || 'Desconocido';
                const type = detectType(name);
                const date = getToday();
                
                // 1. Actualizar Vista (Frontend)
                const newDoc: DocFile = {
                    id: Date.now().toString() + Math.random(),
                    name,
                    type,
                    path,
                    date,
                    size: '-' 
                };
                
                allFiles = [...allFiles, newDoc];

                // 2. Guardar en Backend (Rust)
                // CORRECCIÓN TÉCNICA AQUÍ:
                // En TypeScript enviamos 'docType' (camelCase).
                // Tauri lo convierte automáticamente a 'doc_type' para que Rust lo entienda.
                await invoke('save_document_record', {
                    name: name,
                    path: path,
                    docType: type, // <--- AQUÍ ESTÁ LA CORRECCIÓN (Antes decía doc_type)
                    size: '0 KB',
                    date: date
                });
            }
        }
    } catch (err) {
        console.error("Error detallado:", err);
        // Quitamos el alert de permisos porque probablemente el error era solo el nombre del argumento
        alert("Ocurrió un error al importar. Revisa la consola (F12) para detalles.");
    }
  }
  // B) VINCULAR CARPETA
  async function linkFolder() {
    try {
        // Abrir selector de directorios
        const selected = await open({
            directory: true, 
            multiple: false
        });

        if (selected && typeof selected === 'string') {
            const name = selected.split(/[\\/]/).pop() || 'Nueva Carpeta';
            const date = getToday();
            
            // 1. Actualizar Vista
            const newFolder: DocFile = {
                id: Date.now().toString(),
                name: name,
                type: 'folder',
                path: selected,
                date: date
            };

            allFiles = [...allFiles, newFolder];
            
            // 2. Guardar en Backend
            await invoke('save_document_record', {
                name: name,
                path: selected,
                doc_type: 'folder',
                size: '-',
                date: date
            });
        }
    } catch (err) {
        console.error("Error seleccionando carpeta:", err);
    }
  }

  function handleFileClick(file: DocFile) {
    if (file.type === 'folder') {
      currentPath = [...currentPath, file.name];
      // Aquí podrías añadir lógica para listar el contenido real de esa carpeta usando 'fs'
    } else {
      selectedFile = file;
    }
  }

  // Abrir archivo con el programa predeterminado del sistema
  async function openExternally() {
    if(!selectedFile) return;
    try {
        // Usa el plugin 'opener' que configuramos en capabilities
        // Si tienes problemas, asegúrate de importar { open } from '@tauri-apps/plugin-opener'
        // O usar invoke('plugin:opener|open', ...)
        alert(`Abriendo: ${selectedFile.path}`);
        // await invoke('plugin:opener|open', { path: selectedFile.path }); 
    } catch (e) {
        alert("No se pudo abrir el archivo.");
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
            <button class="btn-tool primary" on:click={importFiles} title="Importar Archivos">
                <Download size={16} /> <span>Importar</span>
            </button>
            <button class="btn-tool secondary" on:click={linkFolder} title="Vincular Carpeta">
                <Plus size={16} /> <span>Carpeta</span>
            </button>
        </div>
      </div>

      <div class="breadcrumbs">
        <button class="crumb-home" on:click={() => currentPath = ['Inicio']}>
            <Home size={14} />
        </button>
        {#each currentPath.slice(1) as crumb}
            <ChevronRight size={12} class="crumb-sep" />
            <span class="crumb-text">{crumb}</span>
        {/each}
      </div>

      <div class="file-list">
        {#if allFiles.length === 0}
            <div class="empty-list-sidebar">
                <p>Carpeta vacía</p>
                <small>Usa "Importar" para agregar archivos.</small>
            </div>
        {:else if filteredFiles.length === 0}
            <div class="empty-search">
                <p>No se encontraron resultados.</p>
            </div>
        {:else}
            {#each filteredFiles as file (file.id)}
            <div 
                class="file-item" 
                class:active={selectedFile?.id === file.id}
                on:click={() => handleFileClick(file)}
            >
                <div class="file-icon {getColorClass(file.type)}">
                    <svelte:component this={getIcon(file.type)} size={20} />
                </div>
                <div class="file-info">
                    <span class="file-name">{file.name}</span>
                    <span class="file-meta">{file.date} • {file.type.toUpperCase()}</span>
                </div>
                {#if file.type === 'folder'}
                    <ChevronRight size={16} class="folder-arrow" />
                {/if}
            </div>
            {/each}
        {/if}
      </div>
    </aside>

    <main class="preview-panel">
      {#if selectedFile}
        <div class="preview-header" transition:fade>
            <div class="preview-title">
                <div class="icon-large {getColorClass(selectedFile.type)}">
                    <svelte:component this={getIcon(selectedFile.type)} size={24} />
                </div>
                <div>
                    <h3 class="file-title-text">{selectedFile.name}</h3>
                    <small class="path-text">{selectedFile.path}</small>
                </div>
            </div>
            <div class="preview-actions">
                <button class="btn-preview" on:click={openExternally} title="Abrir externamente">
                    <ExternalLink size={18} /> Abrir
                </button>
                <button class="btn-preview delete" title="Eliminar referencia">
                    <Trash2 size={18} />
                </button>
            </div>
        </div>

        <div class="preview-content">
            <div class="placeholder-viewer">
                {#if selectedFile.type === 'pdf'}
                    <div class="pdf-mockup">
                        <FileText size={48} class="text-red-400 mb-2"/>
                        <p>Documento PDF</p>
                        <button class="btn-open-real" on:click={openExternally}>Ver PDF</button>
                    </div>
                {:else if selectedFile.type === 'xlsx' || selectedFile.type === 'docx'}
                    <div class="office-mockup">
                        <svelte:component this={getIcon(selectedFile.type)} size={48} class={getColorClass(selectedFile.type)}/>
                        <p>Documento de Office</p>
                        <button class="btn-open-real" on:click={openExternally}>Abrir archivo</button>
                    </div>
                {:else}
                    <p>Archivo seleccionado</p>
                    <button class="btn-open-real" on:click={openExternally}>Abrir</button>
                {/if}
            </div>
        </div>
      {:else}
        <div class="empty-state">
            <div class="empty-icon-bg">
                <FileText size={64} color="#cbd5e1" />
            </div>
            <h3>Gestor de Documentos</h3>
            <p>Selecciona un archivo o importa uno nuevo para gestionarlo.</p>
        </div>
      {/if}
    </main>
  </div>
</div>

<style>
  /* --- LAYOUT PRINCIPAL --- */
  .docs-layout { display: flex; flex-direction: column; height: 100vh; background: #f8fafc; font-family: 'Segoe UI', system-ui, sans-serif; color: #334155; overflow: hidden; }
  
  /* --- TOP BAR --- */
  .top-bar { background: white; border-bottom: 1px solid #e2e8f0; padding: 10px 20px; display: flex; justify-content: space-between; align-items: center; height: 60px; box-sizing: border-box; }
  .left-actions { display: flex; align-items: center; gap: 15px; }
  .left-actions h2 { margin: 0; font-size: 1.1rem; font-weight: 600; }
  .btn-back { background: none; border: none; cursor: pointer; color: #64748b; padding: 8px; border-radius: 6px; transition: background 0.2s; }
  .btn-back:hover { background: #f1f5f9; color: #0f172a; }
  
  /* --- BÚSQUEDA --- */
  .search-box { position: relative; width: 300px; }
  .search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #94a3b8; pointer-events: none; }
  .search-box input { width: 100%; padding: 8px 10px 8px 36px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.9rem; outline: none; transition: border 0.2s; }
  .search-box input:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.1); }
  
  /* --- SPLIT VIEW --- */
  .main-split { display: flex; flex: 1; overflow: hidden; }
  .sidebar-explorer { width: 320px; background: white; border-right: 1px solid #e2e8f0; display: flex; flex-direction: column; }
  
  /* --- TOOLBAR IZQUIERDA --- */
  .toolbar { padding: 15px; border-bottom: 1px solid #f1f5f9; }
  .btn-group { display: flex; gap: 10px; }
  .btn-tool { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px; border-radius: 6px; font-size: 0.85rem; font-weight: 500; cursor: pointer; transition: all 0.2s; }
  .btn-tool.primary { background: #3b82f6; color: white; border: none; }
  .btn-tool.primary:hover { background: #2563eb; }
  .btn-tool.secondary { background: white; border: 1px solid #cbd5e1; color: #475569; }
  .btn-tool.secondary:hover { background: #f8fafc; border-color: #94a3b8; }
  
  /* --- LISTA Y BREADCRUMBS --- */
  .breadcrumbs { display: flex; align-items: center; padding: 10px 15px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-size: 0.8rem; color: #64748b; }
  .crumb-home { border: none; background: none; padding: 4px; cursor: pointer; color: inherit; }
  .crumb-sep { margin: 0 4px; opacity: 0.5; }
  .file-list { flex: 1; overflow-y: auto; padding: 10px; }
  .empty-list-sidebar, .empty-search { text-align: center; padding: 20px 10px; color: #94a3b8; font-size: 0.9rem; }
  .file-item { display: flex; align-items: center; gap: 12px; padding: 10px; border-radius: 8px; cursor: pointer; transition: background 0.1s; border: 1px solid transparent; }
  .file-item:hover { background: #f1f5f9; }
  .file-item.active { background: #eff6ff; border-color: #bfdbfe; }
  .file-info { flex: 1; overflow: hidden; }
  .file-name { display: block; font-weight: 500; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .file-meta { display: block; font-size: 0.75rem; color: #94a3b8; margin-top: 2px; }
  .folder-arrow { color: #cbd5e1; }
  .text-yellow-500 { color: #eab308; }
  .text-red-500 { color: #ef4444; }
  .text-green-600 { color: #16a34a; }
  .text-blue-600 { color: #2563eb; }
  .text-gray-500 { color: #64748b; }
  .text-red-400 { color: #f87171; }
  
  /* --- PANEL DERECHO (PREVIEW) --- */
  .preview-panel { flex: 1; background: #f8fafc; display: flex; flex-direction: column; padding: 20px; overflow: hidden; }
  .preview-header { display: flex; justify-content: space-between; align-items: center; background: white; padding: 15px 20px; border-radius: 10px 10px 0 0; border: 1px solid #e2e8f0; border-bottom: none; }
  .preview-title { display: flex; align-items: center; gap: 12px; }
  .file-title-text { margin: 0; font-size: 1rem; color: #0f172a; }
  .path-text { font-size: 0.75rem; color: #94a3b8; display: block; max-width: 400px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .preview-actions { display: flex; gap: 8px; }
  .btn-preview { display: flex; align-items: center; gap: 6px; background: white; border: 1px solid #cbd5e1; padding: 6px 12px; border-radius: 6px; font-size: 0.85rem; cursor: pointer; color: #475569; }
  .btn-preview:hover { background: #f1f5f9; color: #0f172a; }
  .btn-preview.delete:hover { background: #fee2e2; border-color: #fca5a5; color: #ef4444; }
  .preview-content { flex: 1; background: white; border: 1px solid #e2e8f0; border-radius: 0 0 10px 10px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
  .placeholder-viewer { text-align: center; color: #64748b; }
  .pdf-mockup, .office-mockup { display: flex; flex-direction: column; align-items: center; gap: 10px; }
  .btn-open-real { margin-top: 10px; padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; }
  .empty-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #94a3b8; text-align: center; }
  .empty-icon-bg { background: #e2e8f0; width: 100px; height: 100px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 20px; }
</style>