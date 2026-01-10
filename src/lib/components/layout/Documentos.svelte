<script lang="ts">
  import { FileText, Plus, Save, MessageSquare, Search, MoreVertical, ArrowLeft } from 'lucide-svelte';
  import { createEventDispatcher } from 'svelte';
  import { open } from '@tauri-apps/plugin-dialog'; 
  import { readTextFile, readFile } from '@tauri-apps/plugin-fs';
  import JSZip from 'jszip';
  
  // @ts-ignore
  import initSqlJs from 'sql.js'; 

  const dispatch = createEventDispatcher();

  // ... (Tus variables de documentos y notas se mantienen igual)
  let documentos = [
    { id: 1, titulo: 'Carta a los Ancianos - Enero', fecha: '08/01/2026', tipo: 'carta', contenido: 'Contenido de la carta de enero...' },
    { id: 2, titulo: 'Bosquejo Discurso Público', fecha: '05/01/2026', tipo: 'bosquejo', contenido: 'Puntos principales del bosquejo...' },
    { id: 3, titulo: 'Notas de la visita', fecha: '02/01/2026', tipo: 'nota', contenido: 'Observaciones de la semana...' }
  ];
  let notas = [
    { id: 1, texto: 'Repasar el punto 3 con el hermano Gómez.', referencia: 'Párrafo 2' },
    { id: 2, texto: 'Excelente aplicación bíblica aquí.', referencia: 'Intro' }
  ];
  let docSeleccionado = documentos[0];
  let notaNueva = "";
  let contenidoEditor = docSeleccionado.contenido || "";

  function seleccionarDocumento(doc: any) {
    docSeleccionado = doc;
    contenidoEditor = doc.contenido || "Este archivo no tiene contenido de texto legible.";
  }

  async function importarArchivo() {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Documentos', extensions: ['jwpub', 'txt', 'pdf'] }]
      });

      if (selected) {
        const path = typeof selected === 'string' ? selected : (selected as any).path;
        const nombreArchivo = path.split(/[\\/]/).pop() || 'Sin nombre';
        let contenidoLeido = "";
        
        if (path.endsWith('.txt')) {
          contenidoLeido = await readTextFile(path);
        } 
        else if (path.endsWith('.jwpub')) {
          try {
            const datosBinarios = await readFile(path);
            const zip = await JSZip.loadAsync(datosBinarios);
            const archivoDB = zip.file("contents");
            
            if (archivoDB) {
              const arrayBuffer = await archivoDB.async("uint8array");
              
              // Inicializamos SQL.js con tipado explícito
              const SQL = await initSqlJs({
                // Borramos la dirección de internet y ponemos solo esto:
                locateFile: (file: string) => `/${file}`
              });
              
              const db = new SQL.Database(arrayBuffer);
              
              // Intentamos obtener los títulos de la tabla Document
              const res = db.exec("SELECT Title FROM Document WHERE Title IS NOT NULL LIMIT 10");
              
              if (res.length > 0) {
                contenidoLeido = `📖 PUBLICACIÓN: ${nombreArchivo}\n`;
                contenidoLeido += `------------------------------------------\n`;
                contenidoLeido += `Artículos encontrados:\n\n`;
                
                // Tipamos row como any para que el forEach no de error
                res[0].values.forEach((row: any) => {
                  contenidoLeido += `• ${row[0]}\n`;
                });
                
                contenidoLeido += `\n[Contenido extraído de la base de datos interna]`;
              } else {
                contenidoLeido = "Base de datos abierta, pero la tabla Document no devolvió títulos.";
              }
              db.close();
            } else {
              contenidoLeido = "No se encontró el archivo 'contents' dentro del .jwpub";
            }
          } catch (err) {
            console.error("Error SQL/Zip:", err);
            contenidoLeido = "Error al procesar la base de datos interna del .jwpub";
          }
        }

        const nuevoDoc = { 
          id: Date.now(), 
          titulo: nombreArchivo, 
          fecha: 'Hoy', 
          tipo: 'importado',
          contenido: contenidoLeido 
        };

        documentos = [nuevoDoc, ...documentos];
        seleccionarDocumento(nuevoDoc);
      }
    } catch (err) {
      console.error("Error al importar:", err);
    }
  }

  function agregarNota() {
    if (notaNueva.trim() === "") return;
    notas = [...notas, { id: Date.now(), texto: notaNueva, referencia: 'General' }];
    notaNueva = "";
  }
</script>

<div class="docs-workspace">
  
  <div class="sidebar-docs">
    <div class="sidebar-header">
      <h3>Mis Documentos</h3>
      <button class="icon-btn" on:click={importarArchivo}>
        <Plus size={18} />
      </button>
    </div>
    
    <div class="search-bar">
      <Search size={14} color="#64748b" />
      <input type="text" placeholder="Buscar..." />
    </div>

    <div class="doc-list">
      {#each documentos as doc}
         <div 
           class="doc-item {docSeleccionado.id === doc.id ? 'active' : ''}"
           on:click={() => seleccionarDocumento(doc)} 
         >
           <div class="doc-icon">
             <FileText size={18} />
           </div>
           <div class="doc-info">
             <span class="doc-title">{doc.titulo}</span>
             <span class="doc-date">{doc.fecha}</span>
           </div>
        </div>
     {/each}
    </div>
  </div>

  <div class="main-editor">
    <div class="editor-header">
      <h2>{docSeleccionado.titulo}</h2>
      <div class="editor-actions">
        <button class="action-btn primary"><Save size={16} /> Guardar</button>
        <button class="action-btn" on:click={() => dispatch('volver')} style="margin-left: 10px; border: none; background: none; display: flex; align-items: center; gap: 5px; color: #64748b; cursor: pointer;">
           <ArrowLeft size={16} /> Volver
        </button>
      </div>
    </div>
    
    <div class="editor-content" contenteditable="true">
      {#if docSeleccionado.tipo === 'importado'}
        <pre style="font-family: inherit; white-space: pre-wrap; margin: 0;">{contenidoEditor}</pre>
      {:else}
        <p>Este es un documento de ejemplo: <strong>{docSeleccionado.titulo}</strong></p>
        <p>Selecciona un archivo importado o usa el botón "+" para cargar un .txt o .jwpub.</p>
      {/if}
    </div>
</div>

  <div class="notes-panel">
    <div class="notes-header">
      <h3><MessageSquare size={16} /> Anotaciones</h3>
    </div>

    <div class="notes-list">
      {#each notas as nota}
        <div class="note-card">
          <div class="note-ref">{nota.referencia}</div>
          <p class="note-text">{nota.texto}</p>
        </div>
      {/each}
    </div>

    <div class="notes-input">
      <textarea 
        placeholder="Escribir una nota rápida..." 
        bind:value={notaNueva}
        on:keydown={(e) => e.key === 'Enter' && !e.shiftKey && agregarNota()}
      ></textarea>
      <button class="add-note-btn" on:click={agregarNota}>Agregar</button>
    </div>
  </div>

</div>

<style>
  .docs-workspace {
    display: flex;
    height: 100%;
    background: #f8fafc;
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid #e2e8f0;
  }

  /* --- SIDEBAR --- */
  .sidebar-docs {
    width: 260px;
    background: #ffffff;
    border-right: 1px solid #e2e8f0;
    display: flex;
    flex-direction: column;
  }

  .sidebar-header {
    padding: 15px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #f1f5f9;
  }
  
  .sidebar-header h3 { margin: 0; font-size: 1rem; color: #334155; }

  .search-bar {
    margin: 15px;
    padding: 8px 12px;
    background: #f1f5f9;
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .search-bar input { border: none; background: transparent; width: 100%; outline: none; font-size: 0.9rem; }

  .doc-list { overflow-y: auto; flex: 1; }

  .doc-item {
    padding: 12px 15px;
    display: flex;
    gap: 12px;
    cursor: pointer;
    border-bottom: 1px solid #f8fafc;
    transition: background 0.2s;
  }
  .doc-item:hover {
  background-color: #f1f5f9; /* Un gris muy clarito al pasar el mouse */
}

  .doc-item.active {
  background-color: #e2e8f0;
  border-left: 3px solid #2563eb; /* Una rayita azul para indicar selección */
}

  .doc-icon { color: #64748b; margin-top: 2px; }
  .doc-item.active .doc-icon { color: #2563eb; }
  
  .doc-info { display: flex; flex-direction: column; }
  .doc-title { font-size: 0.9rem; font-weight: 500; color: #1e293b; }
  .doc-date { font-size: 0.75rem; color: #94a3b8; }

  /* --- EDITOR --- */
  .main-editor {
    flex: 1; 
    display: flex;
    flex-direction: column;
    background: #ffffff;
  }

  .editor-header {
    padding: 15px 25px;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .editor-header h2 { margin: 0; font-size: 1.2rem; color: #1e293b; }

  .editor-content {
    flex: 1;
    padding: 40px;
    overflow-y: auto;
    outline: none;
    font-size: 1.05rem;
    line-height: 1.7;
    color: #334155;
    max-width: 800px;
    margin: 0 auto;
    width: 100%;
  }

  /* --- NOTAS --- */
  .notes-panel {
    width: 280px;
    background: #f8fafc;
    border-left: 1px solid #e2e8f0;
    display: flex;
    flex-direction: column;
  }

  .notes-header { padding: 15px; border-bottom: 1px solid #e2e8f0; }
  .notes-header h3 { margin: 0; font-size: 0.95rem; display: flex; align-items: center; gap: 8px; color: #475569; }

  .notes-list { flex: 1; overflow-y: auto; padding: 15px; display: flex; flex-direction: column; gap: 10px; }

  .note-card {
    background: #ffffff;
    padding: 12px;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 1px 2px rgba(0,0,0,0.03);
  }
  .note-ref { font-size: 0.75rem; color: #2563eb; font-weight: 600; margin-bottom: 4px; text-transform: uppercase; }
  .note-text { margin: 0; font-size: 0.9rem; color: #334155; }

  .notes-input { padding: 15px; border-top: 1px solid #e2e8f0; background: white; }
  .notes-input textarea {
    width: 100%; height: 60px; border: 1px solid #cbd5e1; border-radius: 6px; 
    padding: 8px; font-family: inherit; font-size: 0.9rem; resize: none; margin-bottom: 8px;
  }
  .add-note-btn {
    width: 100%; background: #0f172a; color: white; border: none; 
    padding: 6px; border-radius: 6px; cursor: pointer; font-size: 0.9rem;
  }

  /* --- BOTONES COMUNES --- */
  .icon-btn { background: none; border: none; cursor: pointer; color: #64748b; }
  .action-btn { 
    display: flex; align-items: center; gap: 6px; 
    padding: 6px 12px; border-radius: 6px; border: 1px solid #e2e8f0; 
    background: white; cursor: pointer; color: #475569; font-weight: 500;
  }
  .action-btn.primary { background: #2563eb; color: white; border-color: #2563eb; }
</style>