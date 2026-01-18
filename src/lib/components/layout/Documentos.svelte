<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  
  // --- IMPORTACIONES DE TAURI ---
  // 1. Para mostrar el selector de archivos
  import { open as openDialog } from '@tauri-apps/plugin-dialog';
  // 2. Para copiar archivos y crear carpetas
  // En la línea donde importas desde '@tauri-apps/plugin-fs':
import { copyFile, mkdir, exists, BaseDirectory, readFile } from '@tauri-apps/plugin-fs';
  // 3. Para saber la ruta real del sistema (C:/Users/...)
  import { appLocalDataDir, join } from '@tauri-apps/api/path';
  // 4. Para abrir el archivo con el visor predeterminado (plugin-opener o shell)
  // Nota: Si usas plugin-shell, cambia esto por '@tauri-apps/plugin-shell'
  import { openPath } from '@tauri-apps/plugin-opener'; 
  import { invoke, convertFileSrc } from '@tauri-apps/api/core';

  // --- ICONOS ---
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

  // --- 2. ESTADO ---
  let allFiles: DocFile[] = []; 
  let searchQuery = '';
  let selectedFile: DocFile | null = null;
  let currentPath: string[] = ['Inicio'];

  // --- 3. FILTRADO ---
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

  // --- 5. LÓGICA PRINCIPAL ---

  // A) IMPORTAR Y COPIAR ARCHIVOS (LA JOYA DE LA CORONA)
  async function importFiles() {
    try {
        // 1. Seleccionar archivos del origen (Downloads, etc)
        const selected = await openDialog({
            multiple: true,
            filters: [{
                name: 'Documentos',
                extensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'jpg', 'png']
            }]
        });

        if (!selected) return; // Usuario canceló

        // Aseguramos que sea un array
        const pathsToImport = Array.isArray(selected) ? selected : [selected];
        
        // 2. Preparar carpeta destino interna
        const CARPETA_INTERNA = 'biblioteca_docs';
        // Verificar si existe la carpeta, si no, crearla
        const existe = await exists(CARPETA_INTERNA, { baseDir: BaseDirectory.AppLocalData });
        if (!existe) {
            await mkdir(CARPETA_INTERNA, { baseDir: BaseDirectory.AppLocalData });
        }

        // Obtener la ruta base absoluta de la AppData para construir la ruta final completa
        const appDataPath = await appLocalDataDir();

        for (const sourcePath of pathsToImport) {
            const fileName = sourcePath.split(/[\\/]/).pop() || 'archivo_sin_nombre';
            
            // Definir ruta destino relativa (para copyFile) y absoluta (para la BD)
            const destinoRelativo = `${CARPETA_INTERNA}/${fileName}`;
            const destinoAbsoluto = await join(appDataPath, CARPETA_INTERNA, fileName);

            // 3. COPIAR EL ARCHIVO FÍSICAMENTE
            await copyFile(sourcePath, destinoRelativo, { toPathBaseDir: BaseDirectory.AppLocalData });
            
            console.log(`Copiado a: ${destinoAbsoluto}`);

            // 4. Actualizar Vista
            const type = detectType(fileName);
            const date = getToday();

            const newDoc: DocFile = {
                id: Date.now().toString() + Math.random(),
                name: fileName,
                type,
                path: destinoAbsoluto, // Guardamos la ruta interna, no la original
                date,
                size: '-' 
            };
            
            allFiles = [...allFiles, newDoc];

            // 5. Guardar en Backend (Rust)
            await invoke('save_document_record', {
                name: fileName,
                path: destinoAbsoluto, // Ahora guardamos la ruta segura
                docType: type,
                size: '0 KB',
                date: date
            });
        }
        
        alert("Archivos importados y guardados en la aplicación correctamente.");

    } catch (err) {
        console.error("Error importando:", err);
        alert("Error al importar. Revisa la consola.");
    }
  }

  // B) VINCULAR CARPETA (Mantenemos igual, solo vincula, no copia)
  async function linkFolder() {
    try {
        const selected = await openDialog({
            directory: true, 
            multiple: false
        });

        if (selected && typeof selected === 'string') {
            const name = selected.split(/[\\/]/).pop() || 'Nueva Carpeta';
            const date = getToday();
            
            const newFolder: DocFile = {
                id: Date.now().toString(),
                name: name,
                type: 'folder',
                path: selected,
                date: date
            };

            allFiles = [...allFiles, newFolder];
            
            await invoke('save_document_record', {
                name: name,
                path: selected,
                docType: 'folder',
                size: '-',
                date: date
            });
        }
    } catch (err) {
        console.error("Error carpeta:", err);
    }
  }

  // Variable para guardar la URL segura del PDF en memoria
  let pdfUrl: string | null = null;

  async function cargarPdfEnMemoria(ruta: string) {
      try {
          // 1. Leemos el archivo real del disco
          const contenido = await readFile(ruta);
          
          // 2. Creamos un Blob (archivo en memoria)
          const blob = new Blob([contenido], { type: 'application/pdf' });
          
          // 3. Generamos una URL temporal que el iframe SIEMPRE puede leer
          pdfUrl = URL.createObjectURL(blob);
      } catch (error) {
          console.error("Error al cargar PDF:", error);
          alert("No se pudo leer el archivo PDF.");
      }
  }

  function handleFileClick(file: DocFile) {
    if (file.type === 'folder') {
      currentPath = [...currentPath, file.name];
    } else {
      selectedFile = file;
      // SI ES PDF, CARGAMOS EL BLOB
      if (file.type === 'pdf') {
          cargarPdfEnMemoria(file.path);
      } else {
          pdfUrl = null; // Limpiamos si no es PDF
      }
    }
  }

  // C) ABRIR ARCHIVO INTERNO
  async function openExternally() {
    if(!selectedFile) return;
    try {
        console.log("Intentando abrir:", selectedFile.path);
        // Como guardamos la ruta absoluta en importFiles, esto debería funcionar directo
        await openPath(selectedFile.path); 
    } catch (e) {
        console.error(e);
        alert("No se pudo abrir el archivo. Verifique si aún existe.");
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
            <button class="btn-tool primary" on:click={importFiles} title="Importar Archivos (Copiar)">
                <Download size={16} /> <span>Importar</span>
            </button>
            <button class="btn-tool secondary" on:click={linkFolder} title="Vincular Carpeta Externa">
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
                <div style="overflow: hidden;">
                    <h3 class="file-title-text" title={selectedFile.name}>{selectedFile.name}</h3>
                </div>
            </div>
            
            <div class="preview-actions">
                <button class="btn-preview delete" title="Eliminar referencia">
                    <Trash2 size={18} />
                </button>
            </div>
        </div>

        <div class="preview-content">
           {#if selectedFile.type === 'pdf'}
                {#if pdfUrl}
                    <iframe 
                        src={pdfUrl} 
                        width="100%" 
                        height="100%"
                        style="border: none; display: block;"
                        title="Visor de Documento"
                    ></iframe>
                {:else}
                    <div style="display: flex; justify-content: center; align-items: center; height: 100%; color: #64748b;">
                        <p>Cargando documento...</p>
                    </div>
                {/if}

            {:else if ['jpg', 'png', 'jpeg'].includes(selectedFile.type)}
                <img 
                    src={convertFileSrc(selectedFile.path)} 
                    alt="Vista previa"
                    style="max-width: 100%; max-height: 100%; object-fit: contain;"
                />
            {:else}
                <div class="placeholder-viewer">
                    <svelte:component this={getIcon(selectedFile.type)} size={64} class={getColorClass(selectedFile.type)}/>
                    <p style="margin-top: 20px; font-weight: 500;">Vista previa no disponible</p>
                    <p style="font-size: 0.8rem;">Este tipo de archivo se debe abrir externamente.</p>
                    
                    <button class="btn-open-real" on:click={openExternally}>
                        Abrir archivo
                    </button>
                </div>
            {/if}
        </div>

      {:else}
        <div class="empty-state">
            <div class="empty-icon-bg">
                <FileText size={64} color="#cbd5e1" />
            </div>
            <h3>Selecciona un documento</h3>
            <p>Haz clic en un archivo de la lista para verlo aquí.</p>
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

  /* Asegura que el contenedor ocupe todo el alto disponible */
.preview-content { 
    flex: 1; 
    background: white; 
    border: 1px solid #e2e8f0; 
    border-radius: 0 0 10px 10px; 
    display: flex; 
    flex-direction: column; /* Importante para que el iframe se estire */
    overflow: hidden; 
    position: relative;
}

/* Ajustes para el título largo */
.file-title-text {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 300px;
}
</style>
