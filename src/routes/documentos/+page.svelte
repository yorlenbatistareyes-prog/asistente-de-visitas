<script lang="ts">
  import { 
    FolderOpen, FileText, Upload, ChevronRight, 
    FileCode, ArrowLeft, Info, Search, Star, FilePlus
  } from "lucide-svelte";
  import { open } from "@tauri-apps/plugin-dialog";
  import { readDir } from "@tauri-apps/plugin-fs";
  import { convertFileSrc } from "@tauri-apps/api/core";
  import { onMount } from "svelte";

  interface Documento {
    nombre: string;
    ruta: string;
    extension: string;
    isDirectory: boolean;
  }

  let documentos: Documento[] = [];
  let carpetaSeleccionada: string | null = null;
  let documentoActivo: Documento | null = null;
  let urlVistaPrevia: string | null = null;
  let busqueda = "";
  let favoritos: string[] = [];

  onMount(() => {
    const favsGuardados = localStorage.getItem('docs_favoritos');
    if (favsGuardados) favoritos = JSON.parse(favsGuardados);
  });

  $: if (typeof window !== 'undefined') {
    localStorage.setItem('docs_favoritos', JSON.stringify(favoritos));
  }

  // --- NUEVA FUNCIÓN: IMPORTAR ARCHIVOS SUELTOS ---
  async function importarArchivosSueltos() {
    const seleccion = await open({
      multiple: true,
      filters: [{
        name: 'Documentos',
        extensions: ['pdf', 'doc', 'docx']
      }],
      title: "Seleccionar documentos"
    });

    if (seleccion && Array.isArray(seleccion)) {
      const nuevosDocs = seleccion.map(ruta => ({
        nombre: ruta.split(/[\\/]/).pop() || "Sin nombre",
        ruta: ruta,
        extension: ruta.split('.').pop()?.toLowerCase() || '',
        isDirectory: false
      }));
      
      // Los añadimos a la lista actual sin borrar los que ya estaban
      documentos = [...nuevosDocs, ...documentos];
    }
  }

  async function importarCarpeta() {
    const seleccion = await open({
      directory: true,
      multiple: false,
      title: "Seleccionar carpeta de documentos"
    });

    if (seleccion && typeof seleccion === 'string') {
      carpetaSeleccionada = seleccion;
      await cargarDocumentos(seleccion);
    }
  }

  async function cargarDocumentos(ruta: string) {
    try {
      const entradas = await readDir(ruta);
      documentos = entradas
        .filter(e => !e.name?.startsWith('.'))
        .map(e => ({
          nombre: e.name || "Sin nombre",
          ruta: `${ruta}/${e.name}`,
          extension: e.name?.split('.').pop()?.toLowerCase() || '',
          isDirectory: e.isDirectory
        }));
    } catch (error) {
      console.error("Error al leer carpeta:", error);
    }
  }

  async function seleccionarDocumento(doc: Documento) {
    if (doc.isDirectory) {
      carpetaSeleccionada = doc.ruta;
      await cargarDocumentos(doc.ruta);
    } else {
      documentoActivo = doc;
      urlVistaPrevia = convertFileSrc(doc.ruta);
    }
  }

  function toggleFavorito(doc: Documento) {
    if (favoritos.includes(doc.ruta)) {
      favoritos = favoritos.filter(f => f !== doc.ruta);
    } else {
      favoritos = [...favoritos, doc.ruta];
    }
  }

  $: docsFiltrados = documentos.filter(d => 
    d.nombre.toLowerCase().includes(busqueda.toLowerCase())
  ).sort((a, b) => {
    const aFav = favoritos.includes(a.ruta) ? 1 : 0;
    const bFav = favoritos.includes(b.ruta) ? 1 : 0;
    return bFav - aFav;
  });
</script>

<div class="gestor-contenedor">
  <aside class="sidebar">
    <div class="sidebar-header">
      <a href="/" class="btn-volver">
        <ArrowLeft size={16} /> Menú Principal
      </a>
      <h2>Documentos</h2>
      
      <div class="search-box">
        <Search size={16} class="search-icon" />
        <input type="text" placeholder="Buscar..." bind:value={busqueda} />
      </div>

      <div class="acciones-importar">
        <button class="btn-importar" on:click={importarArchivosSueltos}>
          <FilePlus size={16} /> Archivos
        </button>
        <button class="btn-importar btn-secundario-import" on:click={importarCarpeta}>
          <FolderOpen size={16} /> Carpeta
        </button>
      </div>
    </div>

    <div class="lista-documentos">
      {#each docsFiltrados as doc}
        <div 
          class="item-doc" 
          class:activo={documentoActivo?.ruta === doc.ruta}
          on:click={() => seleccionarDocumento(doc)}
          on:keydown={(e) => e.key === 'Enter' && seleccionarDocumento(doc)}
          role="button"
          tabindex="0"
        >
          {#if doc.isDirectory}
            <FolderOpen size={18} class="color-folder" />
          {:else}
            <FileText size={18} class="color-file" />
          {/if}
          
          <span class="nombre-texto">{doc.nombre}</span>

          <button 
            class="btn-star" 
            on:click|stopPropagation={() => toggleFavorito(doc)}
          >
            <Star 
              size={16} 
              fill={favoritos.includes(doc.ruta) ? "#f59e0b" : "none"} 
              color={favoritos.includes(doc.ruta) ? "#f59e0b" : "#cbd5e1"} 
            />
          </button>
        </div>
      {/each}

      {#if documentos.length === 0}
        <div class="estado-vacio-lateral">
          <p>Usa los botones de arriba para añadir documentos.</p>
        </div>
      {/if}
    </div>
  </aside>

  <main class="visor">
    {#if documentoActivo}
      <div class="visor-header">
        <div class="visor-titulo">
          <h3>{documentoActivo.nombre}</h3>
        </div>
        <button class="btn-cerrar" on:click={() => { documentoActivo = null; urlVistaPrevia = null; }}>Cerrar</button>
      </div>

      <div class="visor-contenido">
        {#if documentoActivo.extension === 'pdf'}
          <iframe src={urlVistaPrevia} title="Visor" width="100%" height="100%"></iframe>
        {:else if ['doc', 'docx'].includes(documentoActivo.extension)}
          <div class="mensaje-formato">
            <FileCode size={60} color="#2563eb" />
            <h4>Archivo Word</h4>
            <p>Se requiere Microsoft Word para visualizar este archivo.</p>
            <a href={urlVistaPrevia} download={documentoActivo.nombre} class="btn-descarga">Abrir Documento</a>
          </div>
        {:else}
          <div class="mensaje-formato"><p>Sin vista previa disponible.</p></div>
        {/if}
      </div>
    {:else}
      <div class="visor-vacio">
        <FileText size={80} color="#cbd5e1" />
        <p>Selecciona un documento para visualizar</p>
      </div>
    {/if}
  </main>
</div>

<style>
  :global(body) { margin: 0; padding: 0; overflow: hidden; }
  .gestor-contenedor { display: flex; height: 100vh; background: #f8fafc; font-family: sans-serif; }
  .sidebar { width: 320px; background: white; border-right: 1px solid #e2e8f0; display: flex; flex-direction: column; }
  .sidebar-header { padding: 15px; border-bottom: 1px solid #f1f5f9; }
  .btn-volver { display: flex; align-items: center; gap: 5px; color: #64748b; text-decoration: none; font-size: 0.8rem; margin-bottom: 10px; }
  h2 { margin: 0 0 10px 0; font-size: 1.1rem; }
  
  .search-box { position: relative; margin-bottom: 12px; }
  .search-icon { position: absolute; left: 8px; top: 50%; transform: translateY(-50%); color: #94a3b8; }
  .search-box input { width: 100%; padding: 8px 8px 8px 30px; border: 1px solid #e2e8f0; border-radius: 6px; box-sizing: border-box; }

  .acciones-importar { display: flex; gap: 8px; }
  .btn-importar { flex: 1; background: #2563eb; color: white; border: none; padding: 8px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; font-size: 0.85rem; font-weight: 500; }
  .btn-secundario-import { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
  
  .lista-documentos { flex: 1; overflow-y: auto; padding: 8px; }
  .item-doc { display: flex; align-items: center; padding: 10px; border-radius: 6px; cursor: pointer; margin-bottom: 2px; }
  .item-doc:hover { background: #f1f5f9; }
  .item-doc.activo { background: #eff6ff; }
  .nombre-texto { flex: 1; font-size: 0.85rem; margin: 0 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .btn-star { background: none; border: none; padding: 4px; cursor: pointer; border-radius: 4px; display: flex; }
  .color-folder { color: #f59e0b; }
  .color-file { color: #64748b; }

  .visor { flex: 1; display: flex; flex-direction: column; background: #f1f5f9; }
  .visor-header { background: white; padding: 10px 20px; display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0; }
  .btn-cerrar { background: #fff1f2; color: #e11d48; border: 1px solid #fecaca; padding: 5px 12px; border-radius: 4px; cursor: pointer; }
  .visor-contenido { flex: 1; padding: 15px; display: flex; justify-content: center; }
  iframe { border: none; background: white; border-radius: 8px; max-width: 900px; width: 100%; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
  .visor-vacio { height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; color: #94a3b8; }
  .mensaje-formato { background: white; padding: 30px; border-radius: 12px; text-align: center; margin: auto; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
  .btn-descarga { display: inline-block; margin-top: 10px; background: #2563eb; color: white; padding: 8px 16px; border-radius: 6px; text-decoration: none; }
  .estado-vacio-lateral { text-align: center; color: #94a3b8; padding-top: 20px; font-size: 0.8rem; }
</style>