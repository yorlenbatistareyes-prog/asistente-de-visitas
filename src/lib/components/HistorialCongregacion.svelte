<script lang="ts">
  import { onMount } from 'svelte';
  import { Calendar, ChevronDown, ChevronUp, Trash2, FileText, Clock, Archive, ClipboardEdit, TrendingUp, TrendingDown, Minus } from 'lucide-svelte';
  
  import { save } from '@tauri-apps/plugin-dialog';
  import { writeFile } from '@tauri-apps/plugin-fs';
  import { createPdf } from '$lib/utils/pdfConfig';
  import type { TDocumentDefinitions } from 'pdfmake/interfaces';
  import { initDB } from '$lib/services/db';

  export let nombreCongregacion: string;
  export let visitaResaltada: number | null = null; 

  let historial: any[] = [];
  let cargando = true;
  let congregacionId: number | null = null;
  let expandidos: Record<number, boolean> = {};

  const tarjetasRevision = [
    { id: 'total', titulo: 'Total de publicadores', color: 'blue' },
    { id: 'mayores65', titulo: 'Mayores de 65 años', color: 'blue' },
    { id: 'sinCursos', titulo: 'Sin cursos bíblicos', color: 'slate' },
    { id: 'nuevos', titulo: 'Nuevos publicadores', color: 'green' },
    { id: 'bautizados', titulo: 'Bautizados', color: 'green' },
    { id: 'readmitidos', titulo: 'Readmitidos', color: 'green' },
    { id: 'reactivados', titulo: 'Reactivados', color: 'green' },
    { id: 'irregulares', titulo: 'Irregulares', color: 'orange' },
    { id: 'inactivos', titulo: 'Inactivos', color: 'red' },
    { id: 'sacados', titulo: 'Tarjetas sacadas', color: 'slate' },
    { id: 'precursoresAuxiliares', titulo: 'Precursores Auxiliares', color: 'blue' },
    { id: 'precursoresRegulares', titulo: 'Precursores Regulares', color: 'blue' },
    { id: 'ancianos', titulo: 'Ancianos', color: 'slate' },
    { id: 'siervosMinisteriales', titulo: 'Siervos Ministeriales', color: 'slate' }
  ];

  async function cargarHistorial() {
    cargando = true;
    try {
      const db = await initDB();
      const resCong = await db.select<{id: number}[]>(
         'SELECT id FROM congregaciones WHERE TRIM(UPPER(nombre)) = TRIM(UPPER($1)) LIMIT 1', 
         [nombreCongregacion]
      );

      if (resCong.length > 0) {
        congregacionId = resCong[0].id;
        historial = await db.select<any[]>(
          'SELECT * FROM historial_visitas WHERE congregacion_id = $1 ORDER BY fecha DESC', [congregacionId]
        );
        
        if (historial.length > 0) {
          if (visitaResaltada) {
            const index = historial.findIndex((v: any) => v.id === visitaResaltada);
            if (index !== -1) expandidos[index] = true;
            else expandidos[0] = true;
          } else { expandidos[0] = true; }
        }
      } else { historial = []; }
    } catch (e) { console.error("Error SQLite:", e); } 
    finally { cargando = false; }
  }

  onMount(cargarHistorial);

  function toggleExpandir(index: number) { expandidos[index] = !expandidos[index]; }

  async function eliminarVisita(idVisita: number) {
    if (!confirm("¿Seguro que deseas eliminar este registro?")) return;
    try {
      const db = await initDB();
      await db.execute('DELETE FROM historial_visitas WHERE id = $1', [idVisita]);
      await cargarHistorial();
    } catch(e) { alert("Error al eliminar."); }
  }

  function procesarDatos(contenido: string) {
    try {
      const parsed = JSON.parse(contenido);
      if (parsed.total && typeof parsed.total === 'object') return parsed;
      
      let datosAdaptados: Record<string, any> = {};
      const totalPubs = Number(parsed.total) || 0;
      tarjetasRevision.forEach(t => {
        const valor = Number(parsed[t.id]) || 0;
        let pct = '0.0%';
        if (t.id !== 'total' && totalPubs > 0) pct = ((valor / totalPubs) * 100).toFixed(1) + '%';
        datosAdaptados[t.id] = { valor: valor, porcentaje: pct, tendencia: null };
      });
      return datosAdaptados;
    } catch (e) { return {}; }
  }

  // --- MOTOR DE PDF ACTUALIZADO ---
  // --- MOTOR DE PDF ACTUALIZADO CON COLUMNAS ---
  async function exportarPDF(visita: any) {
    const contenidoPdf: any[] = [];
    const tipoVisita = visita.tipo || 'Análisis';

    contenidoPdf.push({
      table: { widths: ['*'], body: [[{ text: `Historial: ${nombreCongregacion}\nTipo: ${tipoVisita}\nSemana del: ${visita.fecha}`, fillColor: '#e11d48', color: '#ffffff', bold: true, fontSize: 14, margin: [15, 15, 15, 15], border: [false, false, false, false] }]] }, layout: 'noBorders', margin: [0, 0, 0, 20]
    });

    if (tipoVisita === 'Revisión de Archivos') {
      const datos = procesarDatos(visita.contenido);
      const filasTabla: any[][] = [];
      
      // 1. AÑADIMOS UNA CABECERA A LA TABLA PARA QUE SE ENTIENDAN LAS COLUMNAS
      filasTabla.push([
        { text: 'MÉTRICA', bold: true, color: '#334155', fontSize: 10, margin: [0, 5, 0, 5] },
        { text: 'TOTAL', bold: true, color: '#334155', fontSize: 10, alignment: 'center', margin: [0, 5, 0, 5] },
        { text: '%', bold: true, color: '#334155', fontSize: 10, alignment: 'center', margin: [0, 5, 0, 5] },
        { text: 'TENDENCIA', bold: true, color: '#334155', fontSize: 10, alignment: 'right', margin: [0, 5, 0, 5] }
      ]);

      tarjetasRevision.forEach(tarjeta => {
        if (datos[tarjeta.id] !== undefined) {
          const dato = datos[tarjeta.id];
          
          // Formateamos el porcentaje (si es 'total', le ponemos un guión)
          const pctTexto = tarjeta.id === 'total' ? '-' : dato.porcentaje;

          // Formateamos la tendencia
          let tendenciaElemento: any = { text: '-', alignment: 'right', color: '#94a3b8', fontSize: 10, margin: [0, 5, 0, 5] };
          if (dato.tendencia) {
            let colorHex = '#64748b'; // gris
            if (dato.tendencia.color === 'verde') colorHex = '#10b981';
            if (dato.tendencia.color === 'rojo') colorHex = '#ef4444';

            tendenciaElemento = { 
              text: dato.tendencia.texto, // Ya incluye el + o - (ej: +2 (20.0%))
              color: colorHex, 
              bold: true, 
              fontSize: 10, 
              alignment: 'right',
              margin: [0, 5, 0, 5]
            };
          }

          // 2. CREAMOS LA FILA CON 4 COLUMNAS EXACTAS
          filasTabla.push([
            { text: tarjeta.titulo, color: '#334155', margin: [0, 5, 0, 5] }, 
            { text: dato.valor.toString(), bold: true, color: '#0f172a', alignment: 'center', margin: [0, 5, 0, 5] },
            { text: pctTexto, color: '#64748b', alignment: 'center', margin: [0, 5, 0, 5] },
            tendenciaElemento
          ]);
        }
      });
      
      // 3. LE DECIMOS AL PDF EL TAMAÑO EXACTO DE CADA COLUMNA
      // '*' = Toma el espacio que sobra. Los números son el ancho fijo.
      contenidoPdf.push({ 
        table: { 
          widths: ['*', 50, 60, 100], 
          body: filasTabla 
        }, 
        layout: 'lightHorizontalLines', 
        margin: [0, 0, 0, 10] 
      });
      
    } else {
      const secciones = visita.contenido.split('\n\n');
      secciones.forEach((seccion: string) => {
        if (seccion.includes(':')) {
          const index = seccion.indexOf(':');
          contenidoPdf.push({ text: [ { text: seccion.substring(0, index) + ': ', bold: true, color: '#0f172a' }, { text: seccion.substring(index + 1).trim(), color: '#334155' } ], margin: [0, 0, 0, 10], fontSize: 10, lineHeight: 1.4 });
        } else {
          contenidoPdf.push({ text: seccion, margin: [0, 0, 0, 10], fontSize: 10, color: '#334155', lineHeight: 1.4 });
        }
      });
    }

    const docDefinition: TDocumentDefinitions = { content: contenidoPdf, pageMargins: [40, 40, 40, 40], defaultStyle: { font: 'Roboto', fontSize: 10 }, footer: function(currentPage, pageCount) { return { text: `Página ${currentPage} de ${pageCount}`, alignment: 'center', color: '#94a3b8', fontSize: 8, margin: [0, 10, 0, 0] }; } };
    try {
      const nombreSeguro = nombreCongregacion.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9\s]/g, "_");
      const rutaDestino = await save({ defaultPath: `${tipoVisita.replace(/\s+/g, "")}_${nombreSeguro}_${visita.fecha}.pdf`, filters: [{ name: 'PDF', extensions: ['pdf'] }] });
      if (!rutaDestino) return; 
      const bytes = await createPdf(docDefinition);
      await writeFile(rutaDestino, bytes);
      alert("✅ PDF exportado correctamente.");
    } catch (error: any) { alert(`❌ Error al exportar: ${error.message}`); }
  }
</script>

<div class="historial-layout">
  {#if cargando}
    <div class="estado-vacio"><p>Cargando historial...</p></div>
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
              {#if visita.tipo === 'Revisión de Archivos'}
                <Archive size={18} color="#10b981" />
                <span class="fecha">Semana del <strong>{visita.fecha}</strong></span>
                <span class="chip-tipo tipo-revision">Revisión de Archivos</span>
              {:else}
                <ClipboardEdit size={18} color="#2563eb" />
                <span class="fecha">Semana del <strong>{visita.fecha}</strong></span>
                <span class="chip-tipo tipo-regular">Análisis</span>
              {/if}
            </div>
            <div class="header-actions">
              {#if expandidos[i]} <ChevronUp size={20} color="#64748b" /> {:else} <ChevronDown size={20} color="#64748b" /> {/if}
            </div>
          </div>

          {#if expandidos[i]}
            <div class="card-body">
              
              {#if visita.tipo === 'Revisión de Archivos'}
                {@const snapshot = procesarDatos(visita.contenido)}
                
                <div class="grid-contadores">
                  {#each tarjetasRevision as tarjeta}
                    {@const datos = snapshot[tarjeta.id] || { valor: 0, porcentaje: '0.0%', tendencia: null }}

                    <div class="counter-card theme-{tarjeta.color}">
                      <div class="tarjeta-header">
                        <h4>{tarjeta.titulo}</h4>
                        
                        <div class="header-badges">
                          {#if tarjeta.id !== 'total'}
                            <div class="badge-porcentaje {datos.valor > 0 ? 'theme-' + tarjeta.color : 'vacio'}">
                              {datos.porcentaje}
                            </div>
                          {/if}

                          {#if datos.tendencia}
                            <div class="badge-tendencia color-{datos.tendencia.color}" title="Comparado al momento de archivar">
                              {#if datos.tendencia.icono === 'up'} <TrendingUp size={12} strokeWidth={3} />
                              {:else if datos.tendencia.icono === 'down'} <TrendingDown size={12} strokeWidth={3} />
                              {:else} <Minus size={12} strokeWidth={3} /> {/if}
                              <span>{datos.tendencia.texto}</span>
                            </div>
                          {/if}
                        </div>
                      </div>

                      <div class="counter-value">
                        {datos.valor}
                      </div>
                    </div>
                  {/each}
                </div>

              {:else}
                <div class="contenido-texto">
                  {#each visita.contenido.split('\n\n') as parrafo}
                     <p style="margin-bottom: 10px;">
                       {@html parrafo.replace(/^([^:]+):/, '<strong style="color: #1e293b; font-weight: 800;">$1:</strong>')}
                     </p>
                  {/each}
                </div>
              {/if}
              
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
  .historial-layout { max-width: 900px; margin: 0 auto; animation: fadeIn 0.3s ease; }
  .estado-vacio { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; color: var(--text-muted); text-align: center; background: var(--bg-panel); border-radius: var(--radius-lg); border: 1px dashed var(--border-color); }
  .estado-vacio h3 { margin: 15px 0 5px; color: var(--text-main); font-size: 1.2rem; }
  .estado-vacio p { margin: 0; font-size: 0.95rem; }
  .timeline { display: flex; flex-direction: column; gap: 15px; }
  .historial-card { background: var(--bg-panel); border: var(--border-thin); border-radius: var(--radius-md); overflow: hidden; transition: all 0.2s; box-shadow: var(--shadow-sm); }
  .historial-card:hover { border-color: var(--primary); }
  .historial-card.expandida { border-color: var(--primary); box-shadow: var(--shadow-md); }
  .card-header { display: flex; justify-content: space-between; align-items: center; padding: 18px 20px; background: var(--bg-app); cursor: pointer; user-select: none; }
  .header-info { display: flex; align-items: center; gap: 10px; font-size: 1.05rem; color: var(--text-main); flex-wrap: wrap;}
  .header-info strong { color: var(--text-main); }
  .chip-tipo { font-size: 0.75rem; padding: 3px 8px; border-radius: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;}
  .tipo-regular { background: rgba(37, 99, 235, 0.1); color: #2563eb; }
  .tipo-revision { background: rgba(16, 185, 129, 0.1); color: #059669; }
  .card-body { padding: 25px 20px; border-top: var(--border-thin); animation: slideDown 0.2s ease-out; }
  .contenido-texto { white-space: pre-wrap; font-size: 0.95rem; line-height: 1.8; color: var(--text-main); margin-bottom: 25px; background: var(--bg-app); padding: 20px; border-radius: var(--radius-md); border-left: 4px solid var(--primary); }

  .grid-contadores { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 25px; }
  .counter-card { background: var(--bg-panel); border: var(--border-thin); border-radius: var(--radius-md); padding: 12px 15px; display: flex; flex-direction: column; align-items: center; box-shadow: var(--shadow-sm); border-top: 4px solid var(--border-color); }
  .counter-card.theme-green { border-top-color: #10b981; }
  .counter-card.theme-red { border-top-color: #ef4444; }
  .counter-card.theme-orange { border-top-color: #f59e0b; }
  .counter-card.theme-blue { border-top-color: #3b82f6; }
  .counter-card.theme-slate { border-top-color: #64748b; }
  .tarjeta-header { display: flex; flex-direction: column; align-items: center; gap: 6px; margin-bottom: 8px; min-height: 48px; width: 100%;}
  .counter-card h4 { margin: 0; font-size: 0.85rem; color: var(--text-muted); text-align: center; line-height: 1.2; }
  .header-badges { display: flex; gap: 5px; align-items: center; justify-content: center; flex-wrap: wrap; }
  
  .badge-porcentaje { font-size: 0.75rem; font-weight: 800; padding: 2px 8px; border-radius: 12px; background: var(--bg-app); border: 1px solid transparent; }
  .badge-porcentaje.theme-green { color: #059669; border-color: rgba(16, 185, 129, 0.2); background: rgba(16, 185, 129, 0.05); }
  .badge-porcentaje.theme-red { color: #e11d48; border-color: rgba(225, 29, 72, 0.2); background: rgba(225, 29, 72, 0.05); }
  .badge-porcentaje.theme-orange { color: #d97706; border-color: rgba(245, 158, 11, 0.2); background: rgba(245, 158, 11, 0.05); }
  .badge-porcentaje.theme-blue { color: #2563eb; border-color: rgba(37, 99, 235, 0.2); background: rgba(37, 99, 235, 0.05); }
  .badge-porcentaje.theme-slate { color: #475569; border-color: rgba(100, 116, 139, 0.2); background: rgba(100, 116, 139, 0.05); }
  .badge-porcentaje.vacio { color: #94a3b8; border-color: var(--border-thin); background: transparent; }
  
  .badge-tendencia { display: flex; align-items: center; gap: 3px; font-size: 0.7rem; font-weight: 800; padding: 2px 6px; border-radius: 6px; }
  .badge-tendencia.color-verde { color: #10b981; background: rgba(16, 185, 129, 0.1); }
  .badge-tendencia.color-rojo { color: #ef4444; background: rgba(239, 68, 68, 0.1); }
  .badge-tendencia.color-gris { color: #64748b; background: rgba(100, 116, 139, 0.1); }
  
  .counter-value { font-size: 1.8rem; font-weight: 800; color: var(--text-main); margin-top: 5px; }

  .card-footer { display: flex; justify-content: flex-end; gap: 10px; padding-top: 15px; border-top: 1px dashed var(--border-color); }
  .btn-accion { display: flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: var(--radius-sm); font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: 0.2s; border: none; }
  .btn-outline { background: var(--bg-panel); border: var(--border-thin); color: var(--text-main); }
  .btn-outline:hover { background: var(--bg-app); color: var(--primary); border-color: var(--primary); }
  .btn-danger { background: rgba(225, 29, 72, 0.1); color: var(--primary); }
  .btn-danger:hover { background: var(--primary); color: white; }

  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes slideDown { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
  @media (max-width: 768px) {
    .header-info { flex-direction: column; align-items: flex-start; gap: 5px; }
  }
</style>