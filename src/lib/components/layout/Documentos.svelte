<script lang="ts">
  import { ArrowLeft, FileText, Download, Eye, Folder, } from "lucide-svelte";
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  function volver() {
    dispatch('volver');
  }

  // Datos de ejemplo para documentos
  let documentos = [
    { id: 1, nombre: "Informe Mensual Circuito", tipo: "PDF", tamaño: "2.4 MB", fecha: "15/03/2024" },
    { id: 2, nombre: "Estadísticas Bautismos", tipo: "Excel", tamaño: "1.8 MB", fecha: "10/03/2024" },
    { id: 3, nombre: "Guía de Visitación", tipo: "PDF", tamaño: "3.2 MB", fecha: "05/03/2024" },
    { id: 4, nombre: "Listado Congregaciones", tipo: "Excel", tamaño: "0.9 MB", fecha: "01/03/2024" },
    { id: 5, nombre: "Plan Anual de Circuito", tipo: "PDF", tamaño: "4.1 MB", fecha: "25/02/2024" },
    { id: 6, nombre: "Formato Informe Visita", tipo: "Word", tamaño: "1.2 MB", fecha: "20/02/2024" }
  ];

  function descargarDocumento(id: number) {
    const documento = documentos.find(d => d.id === id);
    if (documento) {
      alert(`Descargando: ${documento.nombre}`);
    }
  }

  function verDocumento(id: number) {
    const documento = documentos.find(d => d.id === id);
    if (documento) {
      alert(`Viendo: ${documento.nombre}`);
    }
  }
</script>

<div class="documentos-view">
  <header class="header-cong">
    <div class="boton-inicio-container">
  <button on:click={() => dispatch('volver')} class="btn-inicio">
    <ArrowLeft size={18} />
    <span>Inicio</span>
  </button>
</div>

    <h2>📄 Documentos Generales</h2>
    <p class="subtitle">Sección independiente - No vinculada a congregación específica</p>
  </header>

  <div class="documentos-content">
    <div class="documentos-stats">
      <div class="stat-card">
        <div class="stat-icon">
          <Folder size={24} />
        </div>
        <div class="stat-info">
          <div class="stat-number">{documentos.length}</div>
          <div class="stat-label">Documentos Totales</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">
          <FileText size={24} />
        </div>
        <div class="stat-info">
          <div class="stat-number">{documentos.filter(d => d.tipo === 'PDF').length}</div>
          <div class="stat-label">Documentos PDF</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">
          <Download size={24} />
        </div>
        <div class="stat-info">
          <div class="stat-number">{Math.round(documentos.reduce((acc, d) => {
            const tamañoNum = parseFloat(d.tamaño);
            return acc + (isNaN(tamañoNum) ? 0 : tamañoNum);
          }, 0) * 10) / 10} MB</div>
          <div class="stat-label">Espacio Total</div>
        </div>
      </div>
    </div>

    <div class="documentos-toolbar">
      <button class="toolbar-btn">
        <FileText size={16} />
        <span>Nuevo Documento</span>
      </button>
      <button class="toolbar-btn secondary">
        <Folder size={16} />
        <span>Crear Carpeta</span>
      </button>
      <div class="search-box">
        <input type="text" placeholder="Buscar documentos..." />
      </div>
    </div>

    <div class="documentos-list">
      <div class="table-header">
        <div class="col nombre">Nombre del Documento</div>
        <div class="col tipo">Tipo</div>
        <div class="col tamaño">Tamaño</div>
        <div class="col fecha">Fecha</div>
        <div class="col acciones">Acciones</div>
      </div>

      {#each documentos as documento (documento.id)}
        <div class="documento-row">
          <div class="col nombre">
            <div class="documento-icon">
              {#if documento.tipo === 'PDF'}
                📄
              {:else if documento.tipo === 'Excel'}
                📊
              {:else}
                📝
              {/if}
            </div>
            <div class="documento-info">
              <strong>{documento.nombre}</strong>
              <span class="documento-path">/documentos/generales/</span>
            </div>
          </div>
          <div class="col tipo">
            <span class="badge {documento.tipo.toLowerCase()}">{documento.tipo}</span>
          </div>
          <div class="col tamaño">{documento.tamaño}</div>
          <div class="col fecha">{documento.fecha}</div>
          <div class="col acciones">
            <button class="action-btn view" on:click={() => verDocumento(documento.id)} title="Ver documento">
              <Eye size={14} />
            </button>
            <button class="action-btn download" on:click={() => descargarDocumento(documento.id)} title="Descargar">
              <Download size={14} />
            </button>
          </div>
        </div>
      {/each}
    </div>

    <div class="documentos-upload">
      <h3>Subir Nuevo Documento</h3>
      <div class="upload-area">
        <FileText size={48} />
        <p>Arrastra y suelta archivos aquí o haz clic para seleccionar</p>
        <button class="upload-btn">Seleccionar Archivos</button>
      </div>
    </div>
  </div>
</div>

<style>
  .documentos-view {
    padding: 20px;
    height: 100%;
    background: #f9fafb;
  }

  .header-cong {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 25px;
    padding-bottom: 15px;
    border-bottom: 1px solid #e5e7eb;
  }

  .back-link {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    color: #4b5563;
    cursor: pointer;
    font-size: 0.9rem;
    align-self: flex-start;
  }

  .back-link:hover {
    background: #f3f4f6;
  }

  .header-cong h2 {
    margin: 0;
    font-size: 1.8rem;
    color: #1f2937;
  }

  .subtitle {
    margin: 0;
    color: #6b7280;
    font-size: 0.95rem;
  }

  .documentos-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 15px;
    margin-bottom: 25px;
  }

  .stat-card {
    background: white;
    border-radius: 10px;
    padding: 20px;
    display: flex;
    align-items: center;
    gap: 15px;
    border: 1px solid #e5e7eb;
  }

  .stat-icon {
    background: #eff6ff;
    width: 50px;
    height: 50px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #3b82f6;
  }

  .stat-number {
    font-size: 1.5rem;
    font-weight: bold;
    color: #1f2937;
  }

  .stat-label {
    font-size: 0.9rem;
    color: #6b7280;
  }

  .documentos-toolbar {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
    align-items: center;
  }

  .toolbar-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 500;
  }

  .toolbar-btn.secondary {
    background: #6b7280;
  }

  .toolbar-btn:hover {
    opacity: 0.9;
  }

  .search-box {
    flex: 1;
  }

  .search-box input {
    width: 100%;
    padding: 10px 15px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    font-size: 0.9rem;
  }

  .documentos-list {
    background: white;
    border-radius: 10px;
    border: 1px solid #e5e7eb;
    margin-bottom: 25px;
    overflow: hidden;
  }

  .table-header {
    display: grid;
    grid-template-columns: 3fr 1fr 1fr 1fr 1fr;
    padding: 15px;
    background: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
    font-weight: 600;
    color: #374151;
    font-size: 0.9rem;
  }

  .documento-row {
    display: grid;
    grid-template-columns: 3fr 1fr 1fr 1fr 1fr;
    padding: 15px;
    border-bottom: 1px solid #f3f4f6;
    align-items: center;
  }

  .documento-row:hover {
    background: #f9fafb;
  }

  .col {
    padding: 0 8px;
  }

  .documento-icon {
    font-size: 1.5rem;
    margin-right: 12px;
  }

  .col.nombre {
    display: flex;
    align-items: center;
  }

  .documento-info {
    display: flex;
    flex-direction: column;
  }

  .documento-path {
    font-size: 0.8rem;
    color: #9ca3af;
  }

  .badge {
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 500;
  }

  .badge.pdf {
    background: #fee2e2;
    color: #dc2626;
  }

  .badge.excel {
    background: #dcfce7;
    color: #16a34a;
  }

  .badge.word {
    background: #dbeafe;
    color: #2563eb;
  }

  .acciones {
    display: flex;
    gap: 8px;
  }

  .action-btn {
    width: 36px;
    height: 36px;
    border-radius: 6px;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .action-btn.view {
    background: #eff6ff;
    color: #3b82f6;
  }

  .action-btn.download {
    background: #f0fdf4;
    color: #16a34a;
  }

  .documentos-upload {
    background: white;
    border-radius: 10px;
    padding: 25px;
    border: 2px dashed #d1d5db;
    text-align: center;
  }

  .documentos-upload h3 {
    margin: 0 0 15px 0;
    color: #1f2937;
  }

  .upload-area {
    padding: 40px 20px;
    background: #f9fafb;
    border-radius: 8px;
    border: 2px dashed #d1d5db;
  }

  .upload-area p {
    margin: 15px 0;
    color: #6b7280;
  }

  .upload-btn {
    padding: 12px 24px;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
  }

  .btn-inicio {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background-color: #f3f4f6;
    color: #374151;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s ease;
  }
  
  .btn-inicio:hover {
    background-color: #e5e7eb;
    border-color: #9ca3af;
  }
  
  /* Versión más compacta */
  .btn-compacto {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: none;
    border: none;
    color: #6b7280;
    cursor: pointer;
    font-size: 14px;
  }
  
  .btn-compacto:hover {
    color: #374151;
  }

  .boton-inicio-container {
    margin: 1rem 0;
  }
  
  .btn-inicio {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background-color: #f3f4f6;
    color: #374151;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s ease;
  }
  
  .btn-inicio:hover {
    background-color: #e5e7eb;
    border-color: #9ca3af;
  }

  .btn-inicio {
  white-space: nowrap;
}
</style>