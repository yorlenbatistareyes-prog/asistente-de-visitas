<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { Eye, FileText, Trash2, TrendingUp, TrendingDown, Minus, Filter, Settings2 } from 'lucide-svelte';
  import { confirm as confirmDialog, save, message as messageDialog } from '@tauri-apps/plugin-dialog';
  import { writeFile } from '@tauri-apps/plugin-fs';
  
  import PanelEstadisticasCircuito from "$lib/components/PanelEstadisticasCircuito.svelte";
  import { 
    obtenerCircuitoPorId, 
    obtenerCongregaciones,
    obtenerHistorialRevisiones,
    eliminarRevisionVisita,
    cargarConfig,
    type Congregacion,
    type FilaHistorial 
  } from '$lib/services/db';

  import type { TDocumentDefinitions, TableCell } from 'pdfmake/interfaces';
  import { createPdf } from '$lib/utils/pdfConfig';

  $: idCircuito = Number($page.params.id);
  
  let listaCongregaciones: Congregacion[] = [];
  let historial: FilaHistorial[] = [];
  let cargando = true;
  let filtroCongregacion = "todas";

    // Control del menú de columnas
  let mostrarMenuColumnas = false;

  // Estado de visibilidad de cada columna (todas visibles por defecto)
  let columnasVisibles: Record<string, boolean> = {
    total: true, totalCursosBiblicos: true, sinCursos: true,
    nuevos: true, bautizados: true, readmitidos: true, reactivados: true,
    irregulares: true, inactivos: true, totalInactivos: true,
    tarjetasSacadas: true, sacados: true,
    precursoresRegulares: true, precursoresAuxiliares: true, precursoresAuxiliaresPermanentes: true,
    totalTerritorios: true, territoriosSinTrabajar6Meses: true, territoriosSinTrabajar1Ano: true,
    asistenciaEntreSemana: true, asistenciaFinSemana: true
  };

    // ¿Están todas activas? Se calcula automáticamente
  $: todasActivas = Object.values(columnasVisibles).every(v => v);

  // Activar/desactivar todas las columnas de golpe
  function toggleTodasColumnas() {
    const nuevoValor = !todasActivas;
    Object.keys(columnasVisibles).forEach(k => columnasVisibles[k] = nuevoValor);
    columnasVisibles = { ...columnasVisibles };
  }

  // Columnas filtradas (solo las visibles) - se actualiza automáticamente
  $: columnasActivas = columnas.filter(c => columnasVisibles[c.id]);

  // ─────────────────────────────────────────
  // COLUMNAS DEL HISTORIAL (sin las 3 excluidas)
  // ─────────────────────────────────────────
  const columnas = [
    // S-21
    { id: 'total', titulo: 'Pub.', full: 'Total publicadores', grupo: 'S-21' },
    { id: 'totalCursosBiblicos', titulo: 'C.Bib.', full: 'Total cursos bíblicos', grupo: 'S-21' },
    { id: 'sinCursos', titulo: 'S/Curs', full: 'Sin cursos bíblicos', grupo: 'S-21' },
    { id: 'nuevos', titulo: 'Nvos.', full: 'Nuevos', grupo: 'S-21' },
    { id: 'bautizados', titulo: 'Baut.', full: 'Bautizados', grupo: 'S-21' },
    { id: 'readmitidos', titulo: 'Rdm.', full: 'Readmitidos', grupo: 'S-21' },
    { id: 'reactivados', titulo: 'Rct.', full: 'Reactivados', grupo: 'S-21' },
    { id: 'irregulares', titulo: 'Irr.', full: 'Irregulares', grupo: 'S-21' },
    { id: 'inactivos', titulo: 'Ina.', full: 'Inactivos (6 meses)', grupo: 'S-21' },
    { id: 'totalInactivos', titulo: 'T.Ina.', full: 'Total inactivos', grupo: 'S-21' },
    { id: 'tarjetasSacadas', titulo: 'T.Sac.', full: 'Tarjetas sacadas', grupo: 'S-21' },
    { id: 'sacados', titulo: 'Sac.', full: 'Sacados', grupo: 'S-21' },
    { id: 'precursoresRegulares', titulo: 'P.Reg.', full: 'Precursores Regulares', grupo: 'S-21' },
    { id: 'precursoresAuxiliares', titulo: 'P.Aux.', full: 'Precursores Auxiliares', grupo: 'S-21' },
    { id: 'precursoresAuxiliaresPermanentes', titulo: 'P.AuxP.', full: 'Prec. Aux. Permanentes', grupo: 'S-21' },
    // S-13
    { id: 'totalTerritorios', titulo: 'Terr.', full: 'Total territorios', grupo: 'S-13' },
    { id: 'territoriosSinTrabajar6Meses', titulo: 'S/T6M', full: 'Sin trabajar 6 meses', grupo: 'S-13' },
    { id: 'territoriosSinTrabajar1Ano', titulo: 'S/T1A', full: 'Sin trabajar 1 año', grupo: 'S-13' },
    // S-88
    { id: 'asistenciaEntreSemana', titulo: 'As.E', full: 'Asistencia entre semana', grupo: 'S-88' },
    { id: 'asistenciaFinSemana', titulo: 'As.F', full: 'Asistencia fin de semana', grupo: 'S-88' }
  ];

  // ─────────────────────────────────────────
  // CARGA DE DATOS
  // ─────────────────────────────────────────
  async function cargarDatos() {
    if (!idCircuito) return;
    
    cargando = true;
    const circuito = await obtenerCircuitoPorId(idCircuito);
    
    if (circuito) {
      listaCongregaciones = await obtenerCongregaciones(circuito.nombre);
    }

    historial = await obtenerHistorialRevisiones(idCircuito);
    
    cargando = false;
  }

  onMount(cargarDatos);

  $: if (idCircuito) {
    cargarDatos();
  }

  // Filtro reactivo por congregación
  $: historialFiltrado = filtroCongregacion === 'todas' 
    ? historial 
    : historial.filter(h => h.congregacionNombre === filtroCongregacion);

  // ─────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────
  function parsearContadores(json: string | null): Record<string, number> {
    if (!json) return {};
    try {
      return JSON.parse(json);
    } catch {
      return {};
    }
  }

  function formatearFecha(fechaStr: string): string {
    if (!fechaStr) return '—';
    try {
      const fecha = new Date(fechaStr + 'T12:00:00');
      return fecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return fechaStr;
    }
  }

  // Compara la fila actual con la siguiente (porque orden DESC)
  function tendencia(actual: number, anterior: number | undefined): 'up' | 'down' | 'igual' | null {
    if (anterior === undefined) return null;
    if (actual > anterior) return 'up';
    if (actual < anterior) return 'down';
    return 'igual';
  }

  // ─────────────────────────────────────────
  // ACCIONES DE FILA
  // ─────────────────────────────────────────
  function verVisita(visitaId: number) {
    goto(`/circuito/${idCircuito}/visitas/${visitaId}`);
  }

  async function exportarPDF(fila: FilaHistorial) {
    const datos = parsearContadores(fila.contadores);
    const fechaBonita = formatearFecha(fila.fechaSemana);

    // Cabecera del documento
    const contenidoPdf: any[] = [];
    
    contenidoPdf.push({
      table: {
        widths: ['*'],
        body: [[{
          text: `${fila.congregacionNombre}\nSemana del: ${fechaBonita}`,
          fillColor: '#5c0a1f',
          color: '#ffffff',
          bold: true,
          fontSize: 14,
          margin: [15, 15, 15, 15],
          border: [false, false, false, false]
        }]]
      },
      layout: 'noBorders',
      margin: [0, 0, 0, 20]
    });

    // Tabla de contadores (agrupados por formulario)
    const filas: TableCell[][] = [
      [
        { text: 'FORMULARIO', style: 'tableHeader' },
        { text: 'CONTADOR', style: 'tableHeader' },
        { text: 'VALOR', style: 'tableHeader', alignment: 'center' }
      ]
    ];

    let grupoActual = '';
    columnas.forEach(col => {
      if (col.grupo !== grupoActual) {
        grupoActual = col.grupo;
        filas.push([
          { text: col.grupo, bold: true, fillColor: '#f1f5f9', colSpan: 3, fontSize: 11, margin: [0, 5, 0, 5] },
          {},
          {}
        ]);
      }
      filas.push([
        { text: '', margin: [0, 3, 0, 3] },
        { text: col.full, margin: [0, 3, 0, 3] },
        { text: (datos[col.id] ?? 0).toString(), alignment: 'center', bold: true, margin: [0, 3, 0, 3] }
      ]);
    });

    contenidoPdf.push({
      table: {
        headerRows: 1,
        widths: ['15%', '*', '15%'],
        body: filas
      },
      layout: 'lightHorizontalLines'
    });

    // Pie con firma
    let firmaUsuario = "Superintendente de Circuito";
    try {
      const resNombre = await cargarConfig("nombreUsuario");
      if (resNombre) firmaUsuario = resNombre;
    } catch {}

    contenidoPdf.push(
      { canvas: [{ type: 'line', x1: 150, y1: 0, x2: 360, y2: 0, lineWidth: 1, lineColor: '#94a3b8' }], alignment: 'center', margin: [0, 40, 0, 5] },
      { text: firmaUsuario, alignment: 'center', bold: true, fontSize: 11 }
    );

    const docDefinition: TDocumentDefinitions = {
      content: contenidoPdf,
      styles: {
        tableHeader: { bold: true, fontSize: 11, color: '#ffffff', fillColor: '#334155', margin: [0, 5, 0, 5] }
      },
      defaultStyle: { font: 'Roboto', fontSize: 10, color: '#1e293b' },
      footer: (currentPage: number, pageCount: number) => ({
        columns: [
          { text: 'Informe generado por Asistente de Visitas', color: '#94a3b8', fontSize: 8, margin: [40, 10, 0, 0] },
          { text: `Página ${currentPage} de ${pageCount}`, alignment: 'right', color: '#94a3b8', fontSize: 8, margin: [0, 10, 40, 0] }
        ]
      })
    };

    try {
      const nombreSeguro = fila.congregacionNombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9\s]/g, "_");
      const rutaDestino = await save({
        defaultPath: `Revision_${nombreSeguro}_${fila.fechaSemana}.pdf`,
        filters: [{ name: 'PDF', extensions: ['pdf'] }]
      });
      if (!rutaDestino) return;

      const bytes = await createPdf(docDefinition);
      await writeFile(rutaDestino, bytes);
      await messageDialog("✅ PDF generado correctamente.", { title: 'Éxito', kind: 'info' });
    } catch (e: any) {
      console.error(e);
      await messageDialog(`❌ Error: ${e.message || 'No se pudo generar el PDF'}`, { title: 'Error', kind: 'error' });
    }
  }

  async function eliminarFila(fila: FilaHistorial) {
    const confirmado = await confirmDialog(
      `¿Eliminar la revisión de "${fila.congregacionNombre}" del ${formatearFecha(fila.fechaSemana)}?\n\nEsta acción no se puede deshacer.`,
      { title: 'Eliminar Revisión', kind: 'warning' }
    );
    if (!confirmado) return;

    try {
      // Necesitamos el ID de la revisión, no el de la visita
      // Buscamos por visita_id — pero el FilaHistorial trae visitaId
      // Así que llamamos a la función con el id de la visita indirectamente
      // Por simplicidad, eliminamos por visita vinculada. Si falla, mostramos error.
      // Necesitamos obtener la revisión primero.
      const { obtenerRevisionPorVisita } = await import('$lib/services/db');
      const revision = await obtenerRevisionPorVisita(fila.visitaId);
      if (!revision || !revision.id) {
        await messageDialog("No se encontró la revisión para eliminar.", { title: 'Error', kind: 'error' });
        return;
      }
      await eliminarRevisionVisita(revision.id);
      await cargarDatos();
    } catch (e) {
      console.error(e);
      await messageDialog("Error al eliminar la revisión.", { title: 'Error', kind: 'error' });
    }
  }
</script>

<div class="registros-layout">
  <div class="header-section">
    <h3>Registros e Informes</h3>
    <p>Estadísticas y resumen general del circuito.</p>
  </div>

  {#if cargando}
    <div class="cargando-estado">Cargando estadísticas...</div>
  {:else}
    <!-- ───────────────────────────────────── -->
    <!-- PANEL DE ESTADÍSTICAS GLOBALES -->
    <!-- ───────────────────────────────────── -->
    <div class="panel-contenedor">
             <PanelEstadisticasCircuito {listaCongregaciones} circuitoId={idCircuito} />
    </div>

    <!-- ───────────────────────────────────── -->
    <!-- HISTORIAL COMPARATIVO -->
    <!-- ───────────────────────────────────── -->
    <div class="historial-section">
      <div class="historial-header">
        <div>
          <h4>Historial Comparativo de Revisiones</h4>
          <p>Todas las visitas con revisión registrada en este circuito.</p>
        </div>
        
                <div class="header-acciones">
          <div class="filtro-wrapper">
            <Filter size={14} />
            <select bind:value={filtroCongregacion}>
              <option value="todas">Todas las congregaciones</option>
              {#each listaCongregaciones as cong}
                <option value={cong.nombre}>{cong.nombre}</option>
              {/each}
            </select>
          </div>

                    <div class="menu-columnas-wrapper">
            <button class="btn-config" on:click={() => mostrarMenuColumnas = true}>
              <Settings2 size={14} /> Columnas
            </button>
          </div>
        </div>
      </div>

      <!-- MODAL DE COLUMNAS (fuera del header para que no lo recorte nada) -->
      {#if mostrarMenuColumnas}
        <div class="modal-columnas-backdrop" on:click={() => mostrarMenuColumnas = false}>
          <div class="modal-columnas" on:click|stopPropagation>
            <div class="modal-columnas-header">
              <h3>Mostrar u Ocultar Columnas</h3>
              <button class="btn-cerrar-modal" on:click={() => mostrarMenuColumnas = false}>✕</button>
            </div>

            <!-- Checkbox maestro -->
            <label class="toggle-container maestro">
              <input 
                type="checkbox" 
                checked={todasActivas} 
                on:change={toggleTodasColumnas}
              >
              <span class="toggle-slider"></span>
              <span class="toggle-label">Todas las columnas</span>
            </label>

            <div class="modal-columnas-body">
              <div class="menu-seccion">S-21 · Publicadores</div>
              {#each columnas.filter(c => c.grupo === 'S-21') as col}
                <label class="toggle-container">
                  <input type="checkbox" bind:checked={columnasVisibles[col.id]}>
                  <span class="toggle-slider"></span>
                  <span class="toggle-label">{col.full}</span>
                </label>
              {/each}

              <div class="menu-seccion">S-13 · Territorios</div>
              {#each columnas.filter(c => c.grupo === 'S-13') as col}
                <label class="toggle-container">
                  <input type="checkbox" bind:checked={columnasVisibles[col.id]}>
                  <span class="toggle-slider"></span>
                  <span class="toggle-label">{col.full}</span>
                </label>
              {/each}

              <div class="menu-seccion">S-88 · Asistencia</div>
              {#each columnas.filter(c => c.grupo === 'S-88') as col}
                <label class="toggle-container">
                  <input type="checkbox" bind:checked={columnasVisibles[col.id]}>
                  <span class="toggle-slider"></span>
                  <span class="toggle-label">{col.full}</span>
                </label>
              {/each}
            </div>

            <div class="modal-columnas-footer">
              <button class="btn-cerrar" on:click={() => mostrarMenuColumnas = false}>Listo</button>
            </div>
          </div>
        </div>
      {/if}

      {#if historialFiltrado.length === 0}
        <div class="empty-state">
          <p>Aún no hay revisiones registradas en este circuito.</p>
          <p class="sub">Cuando finalices una visita y guardes la revisión, aparecerá aquí.</p>
        </div>
      {:else}
        <div class="tabla-scroll">
          <table class="tabla-historial">
            <thead>
              <tr>
                <th class="sticky-col col-cong">Congregación</th>
                <th class="sticky-col col-fecha">Fecha</th>
                {#each columnasActivas as col}
                  <th title={col.full} class="col-num">{col.titulo}</th>
                {/each}
                <th class="col-acciones">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {#each historialFiltrado as fila, index}
                {@const datos = parsearContadores(fila.contadores)}
                {@const anterior = historialFiltrado[index + 1] ? parsearContadores(historialFiltrado[index + 1].contadores) : null}
                
                <tr>
                  <td class="sticky-col col-cong">
                    <strong>{fila.congregacionNombre}</strong>
                  </td>
                  <td class="sticky-col col-fecha">{formatearFecha(fila.fechaSemana)}</td>
                  
                  {#each columnasActivas as col}
                    {@const valorActual = datos[col.id] ?? 0}
                    {@const valorAnterior = anterior ? (anterior[col.id] ?? 0) : undefined}
                    {@const tend = anterior ? tendencia(valorActual, valorAnterior) : null}
                    
                    <td class="col-num">
                      <div class="celda-valor">
                        <span class="num">{valorActual}</span>
                        {#if tend === 'up'}
                          <TrendingUp size={11} class="ico-up" />
                        {:else if tend === 'down'}
                          <TrendingDown size={11} class="ico-down" />
                        {:else if tend === 'igual'}
                          <Minus size={11} class="ico-igual" />
                        {/if}
                      </div>
                    </td>
                  {/each}
                  
                  <td class="col-acciones">
                    <div class="acciones-btns">
                      <button class="btn-mini ver" on:click={() => verVisita(fila.visitaId)} title="Ver visita completa">
                        <Eye size={14} />
                      </button>
                      <button class="btn-mini pdf" on:click={() => exportarPDF(fila)} title="Exportar PDF">
                        <FileText size={14} />
                      </button>
                      <button class="btn-mini del" on:click={() => eliminarFila(fila)} title="Eliminar revisión">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .registros-layout {
    animation: fadeIn 0.3s ease-out;
    padding-top: 10px;
  }

  .header-section { margin-bottom: 25px; }
  .header-section h3 { margin: 0 0 5px 0; font-size: 1.5rem; color: var(--text-main); font-weight: 800; }
  .header-section p { margin: 0; color: var(--text-muted); font-size: 0.9rem; }

  .cargando-estado { color: var(--text-muted); font-size: 0.95rem; padding: 20px 0; }
  .panel-contenedor { max-width: 100%; }

  /* ────────────────────────────────────── */
  /* HISTORIAL COMPARATIVO */
  /* ────────────────────────────────────── */
  .historial-section {
    margin-top: 40px;
    padding-top: 30px;
    border-top: 2px solid var(--border-color);
  }

  .historial-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    flex-wrap: wrap;
    gap: 15px;
    margin-bottom: 20px;
  }

  .historial-header h4 {
    margin: 0 0 5px 0;
    font-size: 1.2rem;
    font-weight: 800;
    color: var(--text-main);
  }
  .historial-header p { margin: 0; font-size: 0.85rem; color: var(--text-muted); }

  .filtro-wrapper {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--bg-panel);
    border: 1px solid var(--border-color);
    border-radius: 10px;
    padding: 8px 14px;
    color: var(--text-muted);
  }
  .filtro-wrapper select {
    border: none;
    background: transparent;
    color: var(--text-main);
    font-family: inherit;
    font-weight: 600;
    font-size: 0.85rem;
    outline: none;
    cursor: pointer;
  }

  /* ────────────────────────────────────── */
  /* HEADER ACCIONES */
  /* ────────────────────────────────────── */
  .header-acciones {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .btn-config {
    display: flex;
    align-items: center;
    gap: 6px;
    background: var(--bg-panel);
    border: 1px solid var(--border-color);
    border-radius: 10px;
    padding: 8px 14px;
    color: var(--text-main);
    font-family: inherit;
    font-weight: 600;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s;
  }
  .btn-config:hover {
    border-color: var(--primary);
    color: var(--primary);
  }

  /* ────────────────────────────────────── */
  /* MODAL DE COLUMNAS */
  /* ────────────────────────────────────── */
  .modal-columnas-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(15, 23, 42, 0.6);
    backdrop-filter: blur(3px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    padding: 20px;
    box-sizing: border-box;
    animation: fadeIn 0.2s ease-out;
  }

  .modal-columnas {
    background: var(--bg-panel);
    border-radius: 14px;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
    width: 100%;
    max-width: 420px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: scaleIn 0.2s ease-out;
  }

  .modal-columnas-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 18px 22px;
    border-bottom: 1px solid var(--border-color);
    background: #1e293b;
    color: white;
  }
  .modal-columnas-header h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 700;
  }
  .btn-cerrar-modal {
    background: transparent;
    border: none;
    color: white;
    font-size: 1.2rem;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 6px;
    transition: background 0.2s;
  }
  .btn-cerrar-modal:hover {
    background: rgba(255, 255, 255, 0.15);
  }

  .modal-columnas-body {
    flex: 1;
    overflow-y: auto;
    padding: 16px 22px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    scrollbar-width: thin;
  }
  .modal-columnas-body::-webkit-scrollbar {
    width: 6px;
  }
  .modal-columnas-body::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
  }

  .menu-seccion {
    font-size: 0.68rem;
    font-weight: 800;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-top: 12px;
    padding-bottom: 6px;
    border-bottom: 1px solid var(--border-color);
  }
  .menu-seccion:first-child {
    margin-top: 0;
  }

  .toggle-container {
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    user-select: none;
    padding: 3px 0;
  }

  .toggle-container input[type="checkbox"] {
    opacity: 0;
    width: 0;
    height: 0;
    position: absolute;
  }

  .toggle-slider {
    position: relative;
    display: inline-block;
    width: 34px;
    height: 20px;
    background-color: #cbd5e1;
    border-radius: 20px;
    transition: background-color 0.3s ease;
    flex-shrink: 0;
  }

  .toggle-slider::before {
    content: "";
    position: absolute;
    height: 16px;
    width: 16px;
    left: 2px;
    bottom: 2px;
    background-color: white;
    border-radius: 50%;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  }

  .toggle-container input:checked + .toggle-slider {
    background-color: var(--primary);
  }

  .toggle-container input:checked + .toggle-slider::before {
    transform: translateX(14px);
  }

  .toggle-label {
    font-size: 0.82rem;
    color: var(--text-main);
    font-weight: 500;
  }

  /* Checkbox maestro */
  .toggle-container.maestro {
    padding: 12px 22px;
    background: rgba(92, 10, 31, 0.06);
    border-bottom: 1px solid var(--border-color);
    margin: 0;
  }
  .toggle-container.maestro .toggle-label {
    font-weight: 800;
    color: var(--primary);
    font-size: 0.85rem;
  }

  /* PIE DEL MODAL */
  .modal-columnas-footer {
    padding: 14px 22px;
    border-top: 1px solid var(--border-color);
    background: var(--bg-subtle, #f8fafc);
    display: flex;
    justify-content: flex-end;
  }
  .btn-cerrar {
    background: #5c0a1f;
    color: white;
    border: none;
    padding: 10px 24px;
    border-radius: 20px;
    font-weight: 700;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s;
  }
  .btn-cerrar:hover {
    background: #3a0411;
  }

  /* ────────────────────────────────────── */
  /* TABLA CON SCROLL HORIZONTAL */
  /* ────────────────────────────────────── */
  .tabla-scroll {
    overflow-x: auto;
    overflow-y: visible;
    border: 1px solid var(--border-color);
    border-radius: 10px;
    background: var(--bg-panel);
    max-width: 100%;
    -webkit-overflow-scrolling: touch;
  }

  .tabla-historial {
    border-collapse: separate;
    border-spacing: 0;
    font-size: 0.8rem;
    white-space: nowrap;
    min-width: 100%;
  }

  .tabla-historial thead th {
    background: var(--bg-subtle, #f8fafc);
    color: var(--text-muted);
    font-weight: 700;
    text-transform: uppercase;
    font-size: 0.68rem;
    letter-spacing: 0.5px;
    padding: 10px 8px;
    border-bottom: 2px solid var(--border-color);
    text-align: center;
    position: sticky;
    top: 0;
    z-index: 5;
  }

  .tabla-historial tbody td {
    padding: 10px 8px;
    border-bottom: 1px solid var(--border-color);
    color: var(--text-main);
    text-align: center;
    vertical-align: middle;
  }

  .tabla-historial tbody tr:hover { background: rgba(92, 10, 31, 0.03); }
  .tabla-historial tbody tr:last-child td { border-bottom: none; }

  /* COLUMNAS STICKY (congregación y fecha) */
  .sticky-col {
    position: sticky;
    background: var(--bg-panel);
    z-index: 4;
  }
  .tabla-historial thead .sticky-col {
    z-index: 10;
    background: var(--bg-subtle, #f8fafc);
  }

  .col-cong {
    left: 0;
    text-align: left;
    min-width: 160px;
    max-width: 200px;
    box-shadow: 3px 0 5px -2px rgba(0,0,0,0.08);
  }

  .col-fecha {
    left: 160px;
    text-align: left;
    min-width: 110px;
    box-shadow: 3px 0 5px -2px rgba(0,0,0,0.08);
  }

  .col-num { min-width: 52px; }

  .col-acciones {
    min-width: 130px;
    background: var(--bg-panel);
  }
  .tabla-historial thead .col-acciones {
    background: var(--bg-subtle, #f8fafc);
  }

  /* Celda con valor + tendencia */
  .celda-valor {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 3px;
  }
  .celda-valor .num {
    font-weight: 700;
    color: var(--text-main);
  }
  .ico-up { color: #10b981; }
  .ico-down { color: #ef4444; }
  .ico-igual { color: #94a3b8; }

  /* BOTONES DE ACCIÓN */
  .acciones-btns {
    display: flex;
    justify-content: center;
    gap: 6px;
  }

  .btn-mini {
    width: 30px;
    height: 30px;
    border-radius: 6px;
    border: 1px solid var(--border-color);
    background: var(--bg-app);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.15s;
  }
  .btn-mini.ver { color: #2563eb; }
  .btn-mini.ver:hover { background: #2563eb; color: white; border-color: #2563eb; }
  .btn-mini.pdf { color: #dc2626; }
  .btn-mini.pdf:hover { background: #dc2626; color: white; border-color: #dc2626; }
  .btn-mini.del { color: #64748b; }
  .btn-mini.del:hover { background: #ef4444; color: white; border-color: #ef4444; }

  /* ESTADO VACÍO */
  .empty-state {
    text-align: center;
    padding: 50px 20px;
    border: 1px dashed var(--border-color);
    border-radius: 10px;
    color: var(--text-muted);
  }
  .empty-state p { margin: 0 0 6px 0; font-size: 0.95rem; }
  .empty-state .sub { font-size: 0.85rem; opacity: 0.8; }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }

  /* ────────────────────────────────────── */
  /* RESPONSIVE */
  /* ────────────────────────────────────── */
  @media (max-width: 768px) {
    .historial-header { flex-direction: column; align-items: stretch; }
    .filtro-wrapper { width: 100%; justify-content: center; }
    .filtro-wrapper select { flex: 1; text-align: center; }
    
    .header-acciones { width: 100%; }
    .btn-config { flex: 1; justify-content: center; }

    .modal-columnas { max-width: 100%; max-height: 85vh; }
    .modal-columnas-body { padding: 14px 18px; }
    
    .col-cong { min-width: 130px; max-width: 150px; font-size: 0.75rem; }
    .col-fecha { left: 130px; min-width: 90px; font-size: 0.75rem; }
    .tabla-historial thead th { font-size: 0.6rem; padding: 8px 5px; }
    .tabla-historial tbody td { padding: 8px 5px; }
  }
</style>