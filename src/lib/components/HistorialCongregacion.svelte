<script lang="ts">
  import { onMount } from 'svelte';
  import { Calendar, ChevronDown, ChevronUp, Trash2, FileText, Clock } from 'lucide-svelte';
  
  // IMPORTACIONES DE TAURI
  import { save } from '@tauri-apps/plugin-dialog';
  import { writeFile } from '@tauri-apps/plugin-fs';
  
  // IMPORTAMOS TU MOTOR DE PDF ESTABLE
  import { createPdf } from '$lib/utils/pdfConfig';
  import type { TDocumentDefinitions } from 'pdfmake/interfaces';
  
  // IMPORTAMOS TU MOTOR DE BASE DE DATOS
  import { initDB } from '$lib/services/db';

  export let nombreCongregacion: string;

  let historial: any[] = [];
  let cargando = true;
  let congregacionId: number | null = null;
  
  // Controla qué tarjetas están abiertas (por su índice de array)
  let expandidos: Record<number, boolean> = {};

  async function cargarHistorial() {
    cargando = true;
    try {
      const db = await initDB();
      
      // 1. Primero buscamos el ID real de esta congregación
      const resCong = await db.select<{id: number}[]>(
        'SELECT id FROM congregaciones WHERE nombre = $1 LIMIT 1', 
        [nombreCongregacion]
      );

      if (resCong.length > 0) {
        congregacionId = resCong[0].id;
        
        // 2. Buscamos todo su historial ordenado por fecha (más reciente primero)
        historial = await db.select<any[]>(
          'SELECT * FROM historial_visitas WHERE congregacion_id = $1 ORDER BY fecha DESC', 
          [congregacionId]
        );
        
        // Expandimos automáticamente la visita más reciente
        if (historial.length > 0) {
          expandidos[0] = true;
        }
      } else {
        historial = [];
      }
    } catch (e) {
      console.error("Error cargando historial desde SQLite:", e);
    } finally {
      cargando = false;
    }
  }

  onMount(cargarHistorial);

  function toggleExpandir(index: number) {
    expandidos[index] = !expandidos[index];
  }

  // Ahora recibe el ID real de la base de datos, no la posición del array
  async function eliminarVisita(idVisita: number) {
    if (!confirm("¿Seguro que deseas eliminar este registro del historial? Esta acción no se puede deshacer.")) return;
    
    try {
      const db = await initDB();
      // Borramos usando el ID único del registro
      await db.execute('DELETE FROM historial_visitas WHERE id = $1', [idVisita]);
      
      await cargarHistorial(); // Recargamos la lista visual
    } catch(e) {
      alert("Error al eliminar del historial en la base de datos.");
    }
  }

  async function exportarPDF(visita: any) {
    console.log("🔵 Iniciando exportación de historial con pdfMake...");

    // 1. Construimos el contenido del documento
    const contenidoPdf: any[] = [];

    // --- ENCABEZADO (Banner Rojo) ---
    // Usamos una tabla sin bordes para crear el fondo de color de forma estable
    contenidoPdf.push({
      table: {
        widths: ['*'],
        body: [
          [
            {
              text: `Historial: ${nombreCongregacion}\nSemana del: ${visita.fecha}`,
              fillColor: '#e11d48', // Color rojo (rose-600)
              color: '#ffffff',
              bold: true,
              fontSize: 14,
              margin: [15, 15, 15, 15],
              border: [false, false, false, false]
            }
          ]
        ]
      },
      layout: 'noBorders',
      margin: [0, 0, 0, 20] // Margen inferior antes del texto
    });

    // --- CONTENIDO DEL INFORME ---
    // Dividimos por saltos de línea dobles
    const secciones = visita.contenido.split('\n\n');
    
    secciones.forEach((seccion: string) => {
      // Si la sección tiene formato "Título: contenido"
      if (seccion.includes(':')) {
        const index = seccion.indexOf(':');
        const titulo = seccion.substring(0, index);
        const texto = seccion.substring(index + 1).trim();

        contenidoPdf.push({
          // pdfmake permite mezclar negritas y texto normal en el mismo párrafo fácilmente
          text: [
            { text: titulo + ': ', bold: true, color: '#0f172a' },
            { text: texto, color: '#334155' }
          ],
          margin: [0, 0, 0, 10],
          fontSize: 10,
          lineHeight: 1.4
        });
      } else {
        // Párrafo normal sin dos puntos
        contenidoPdf.push({
          text: seccion,
          margin: [0, 0, 0, 10],
          fontSize: 10,
          color: '#334155',
          lineHeight: 1.4
        });
      }
    });

    // 2. Definición estructurada del documento
    const docDefinition: TDocumentDefinitions = {
      content: contenidoPdf,
      pageMargins: [40, 40, 40, 40],
      defaultStyle: {
        font: 'Roboto', // <-- CRUCIAL: Usa la fuente que inyectamos en pdfConfig.ts
        fontSize: 10
      },
      // --- PIE DE PÁGINA (Paginación automática) ---
      footer: function(currentPage, pageCount) {
        return {
          text: `Página ${currentPage} de ${pageCount}`,
          alignment: 'center',
          color: '#94a3b8',
          fontSize: 8,
          margin: [0, 10, 0, 0]
        };
      }
    };

    // 3. Generar y Guardar con Tauri
    try {
      const nombreSeguro = nombreCongregacion.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9\s]/g, "_");
      
      const rutaDestino = await save({ 
        defaultPath: `Historial_${nombreSeguro}_${visita.fecha}.pdf`, 
        filters: [{ name: 'PDF', extensions: ['pdf'] }] 
      });
      
      if (!rutaDestino) return; // Si el usuario cancela el diálogo

      const bytes = await createPdf(docDefinition);
      await writeFile(rutaDestino, bytes);
      
      alert("✅ PDF del historial exportado correctamente.");
    } catch (error: any) {
      console.error("Error al exportar PDF:", error);
      alert(`❌ Error al exportar el PDF: ${error.message}`);
    }
  }
</script>

<div class="historial-layout">
  {#if cargando}
    <div class="estado-vacio">
      <p>Cargando historial...</p>
    </div>
  {:else if historial.length === 0}
    <div class="estado-vacio">
      <Clock size={48} color="#cbd5e1" />
      <h3>Historial Vacío</h3>
      <p>Aún no has finalizado ninguna visita para {nombreCongregacion}.</p>
    </div>
  {:else}
    <div class="timeline">
      {#each historial as visita, i}
        <div class="historial-card {expandidos[i] ? 'expandida' : ''}">
          <div class="card-header" on:click={() => toggleExpandir(i)}>
            <div class="header-info">
              <Calendar size={18} color="#2563eb" />
              <span class="fecha">Semana del <strong>{visita.fecha}</strong></span>
            </div>
            <div class="header-actions">
              {#if expandidos[i]}
                <ChevronUp size={20} color="#64748b" />
              {:else}
                <ChevronDown size={20} color="#64748b" />
              {/if}
            </div>
          </div>

          {#if expandidos[i]}
            <div class="card-body">
              <div class="contenido-texto">
                {#each visita.contenido.split('\n\n') as parrafo}
                   <p style="margin-bottom: 10px;">
                     {@html parrafo.replace(/^([^:]+):/, '<strong style="color: #1e293b; font-weight: 800;">$1:</strong>')}
                   </p>
                {/each}
              </div>
              
              <div class="card-footer">
                <button class="btn-accion btn-outline" on:click={() => exportarPDF(visita)}>
                  <FileText size={16} /> Exportar PDF
                </button>
                <button class="btn-accion btn-danger" on:click={() => eliminarVisita(visita.id)}>
                  <Trash2 size={16} /> Eliminar
                </button>
              </div>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .historial-layout { 
    max-width: 900px; 
    margin: 0 auto; 
    animation: fadeIn 0.3s ease; 
  }
  
  .estado-vacio { 
    display: flex; 
    flex-direction: column; 
    align-items: center; 
    justify-content: center; 
    padding: 60px 20px; 
    color: var(--text-muted); 
    text-align: center; 
    background: var(--bg-panel); 
    border-radius: var(--radius-lg); 
    border: 1px dashed var(--border-color); 
  }
  
  .estado-vacio h3 { margin: 15px 0 5px; color: var(--text-main); font-size: 1.2rem; }
  .estado-vacio p { margin: 0; font-size: 0.95rem; }

  .timeline { display: flex; flex-direction: column; gap: 15px; }

  .historial-card { 
    background: var(--bg-panel); 
    border: var(--border-thin); 
    border-radius: var(--radius-md); 
    overflow: hidden; 
    transition: all 0.2s; 
    box-shadow: var(--shadow-sm); 
  }
  
  .historial-card:hover { border-color: var(--primary); }
  .historial-card.expandida { border-color: var(--primary); box-shadow: var(--shadow-md); }

  .card-header { 
    display: flex; 
    justify-content: space-between; 
    align-items: center; 
    padding: 18px 20px; 
    background: var(--bg-app); 
    cursor: pointer; 
    user-select: none; 
  }
  
  .header-info { display: flex; align-items: center; gap: 10px; font-size: 1.05rem; color: var(--text-main); }
  .header-info strong { color: var(--text-main); }

  .card-body { 
    padding: 25px 20px; 
    border-top: var(--border-thin); 
    animation: slideDown 0.2s ease-out; 
  }
  
  .contenido-texto { 
    white-space: pre-wrap; 
    font-size: 0.95rem; 
    line-height: 1.8; 
    color: var(--text-main); 
    margin-bottom: 25px;
    background: var(--bg-app); 
    padding: 20px;
    border-radius: var(--radius-md);
    border-left: 4px solid var(--primary); 
  }

  .card-footer { display: flex; justify-content: flex-end; gap: 10px; padding-top: 15px; border-top: 1px dashed var(--border-color); }
  
  .btn-accion { 
    display: flex; 
    align-items: center; 
    gap: 6px; 
    padding: 8px 14px; 
    border-radius: var(--radius-sm); 
    font-size: 0.85rem; 
    font-weight: 600; 
    cursor: pointer; 
    transition: 0.2s; 
    border: none; 
  }
  
  .btn-outline { 
    background: var(--bg-panel); 
    border: var(--border-thin); 
    color: var(--text-main); 
  }
  
  .btn-outline:hover { background: var(--bg-app); color: var(--primary); border-color: var(--primary); }
  
  .btn-danger { background: rgba(225, 29, 72, 0.1); color: var(--primary); }
  .btn-danger:hover { background: var(--primary); color: white; }

  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes slideDown { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
</style>