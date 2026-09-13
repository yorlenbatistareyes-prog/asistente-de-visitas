<script lang="ts">
  import { FileText, Save, CheckCircle, CheckCircle2, Circle, X } from "lucide-svelte";
  import { createEventDispatcher, onMount } from 'svelte';

  import { 
    obtenerAnalisisPorVisita, 
    guardarAnalisisVisita, 
    cargarConfig,
    type AnalisisVisita 
  } from '$lib/services/db';

  import { save } from "@tauri-apps/plugin-dialog";
  import { writeFile } from "@tauri-apps/plugin-fs";

  import type { TDocumentDefinitions, TableCell } from 'pdfmake/interfaces';
  import { createPdf } from '$lib/utils/pdfConfig';

  const dispatch = createEventDispatcher();

  // Props
  export let visitaId: number;
  export let nombreCongregacion: string = "";
  export let fechaVisita: string = "";

  interface RegistroAnalisis {
    opinionAncianos: string;
    ministerioCristiano: string;
    reunionesCongregacion: string;
    pastoreo: string;
    precursores: string;
    irregularesInactivos: string;
    responsabilidades: string;
    contabilidad: string;
    miscelaneos: string;
    seguimiento: string;
    recomendaciones: string;
    localReunion: string;
    checklist: boolean[];
  }

  const puntosChecklist = [
    "Verificar que se siguen los procedimientos de contabilidad.",
    "Revisar Formularios Movimiento mensual de publicaciones (S-28).",
    "Revisar S-303 de la última visita para ver aspectos en los que se dejó a trabajar.",
    "Verificar que tengan seleccionados los territorios a trabajar durante la semana.",
    "Solicitar lista de temas propuestos para incluir en la agenda de la reunión con los ancianos; confeccionarla.",
    "Verificar si alguien solicitó salir a predicar con nosotros.",
    "Verificar el programa de la semana.",
    "Verificar las visitas de pastoreo programadas para la semana."
  ];

  const valoresPorDefecto: RegistroAnalisis = {
    opinionAncianos: "", ministerioCristiano: "", reunionesCongregacion: "",
    pastoreo: "", precursores: "", irregularesInactivos: "", responsabilidades: "",
    contabilidad: "", miscelaneos: "", seguimiento: "",
    recomendaciones: "", localReunion: "",
    checklist: new Array(8).fill(false)
  };

  let registro: RegistroAnalisis = { ...valoresPorDefecto };
  let analisisId: number | null = null;

  // Estados visuales
  let estadoTarjetas: Record<string, 'guardando' | 'guardado' | null> = {};
  let cargando = true;

  type ClaveRegistro = keyof Omit<RegistroAnalisis, 'checklist'>;

  const modulos: { id: ClaveRegistro, titulo: string, guias: string[] }[] = [
    { id: 'opinionAncianos', titulo: '1. Opinión de Ancianos', guias: ['Aspectos positivos que observan en la congregación.', 'Necesidades o tendencias que les preocupan.'] },
    { id: 'ministerioCristiano', titulo: '2. Ministerio Cristiano', guias: ['Prioridad a la predicación de casa en casa y diferentes facetas.', 'Trabajo del territorio / Revisitas / Cursos bíblicos.', 'Entusiasmo de los publicadores.'] },
    { id: 'reunionesCongregacion', titulo: '3. Reuniones de Congregación', guias: ['Asistencia, y participación.', 'Calidad en la enseñanza.', 'Procedimientos / Sugerencias.'] },
    { id: 'pastoreo', titulo: '4. Pastoreo', guias: ['¿Se hacen visitas periódicas y eficaces?', 'Progreso espiritual, adoración en familia y metas de los hermanos.'] },
    { id: 'precursores', titulo: '5. Precursores', guias: ['Actitud hacia el servicio.', 'Dificultades que enfrentan los precursores.', 'Apoyo de los ancianos.'] },
    { id: 'irregularesInactivos', titulo: '6. Irregulares e Inactivos', guias: ['Nombres y razones principales.', 'Ayuda específica del cuerpo de ancianos.'] },
    { id: 'responsabilidades', titulo: '7. Responsabilidades', guias: ['Unidad y paz del cuerpo de ancianos y siervos.', 'Labor del sup. de servicio.', 'Labor del SEC.', 'Labor de los SG.', 'Otros.'] },
    { id: 'contabilidad', titulo: '8. Contabilidad', guias: ['¿Archivos actualizados correctamente?', '¿Uso adecuado de la contabilidad en línea?'] },
    { id: 'recomendaciones', titulo: '11. Recomendaciones / Nombramientos y Bajas', guias: ['Nombramientos recomendados (Ancianos, Siervos Ministeriales).', 'Bajas o eliminaciones de privilegios.'] },
    { id: 'localReunion', titulo: '12. Local de Reunión / Mantenimiento', guias: ['Condición general del Salón del Reino.', 'Necesidades de mantenimiento, seguridad o limpieza.'] },
    { id: 'miscelaneos', titulo: '9. Misceláneos', guias: ['Atención a pecados graves u otros asuntos no cubiertos.', 'Hermanos y hermanas con potencial para mayores privilegios.'] },
    { id: 'seguimiento', titulo: '10. Seguimiento', guias: ['Asuntos pendientes antes de la próxima visita.', 'Asuntos que deben enviarse a la sucursal.'] }
  ];

  let moduloActivo: typeof modulos[0] | null = null;

  // Cargar al montar
  onMount(async () => {
    if (!visitaId) {
      cargando = false;
      return;
    }
    try {
      const existente = await obtenerAnalisisPorVisita(visitaId);
      if (existente) {
        analisisId = existente.id ?? null;
        const contenido = JSON.parse(existente.contenido);
        const checklist = existente.checklist ? JSON.parse(existente.checklist) : new Array(8).fill(false);
        registro = { ...valoresPorDefecto, ...contenido, checklist };
      }
    } catch (e) {
      console.error("Error cargando análisis:", e);
    }
    cargando = false;
  });

  // Guardar cambios
  async function guardarCambios(idModificado?: string) {
    if (!visitaId) return;

    if (idModificado) {
      estadoTarjetas[idModificado] = 'guardando';
      estadoTarjetas = { ...estadoTarjetas };
    }

    try {
      const { checklist, ...contenidoSinChecklist } = registro;
      const analisis: AnalisisVisita = {
        id: analisisId ?? undefined,
        visitaId,
        fecha: fechaVisita || new Date().toISOString().split('T')[0],
        contenido: JSON.stringify(contenidoSinChecklist),
        checklist: JSON.stringify(checklist),
        completado: false
      };

      const nuevoId = await guardarAnalisisVisita(analisis);
      if (!analisisId) analisisId = nuevoId;

      if (idModificado) await new Promise(r => setTimeout(r, 300));

      if (idModificado) {
        estadoTarjetas[idModificado] = 'guardado';
        estadoTarjetas = { ...estadoTarjetas };
        setTimeout(() => {
          estadoTarjetas[idModificado] = null;
          estadoTarjetas = { ...estadoTarjetas };
        }, 2000);
      }
    } catch (error) {
      console.error("Error al guardar análisis:", error);
      if (idModificado) {
        estadoTarjetas[idModificado] = null;
        estadoTarjetas = { ...estadoTarjetas };
      }
    }
  }

  async function cerrarYGuardar() {
    if (moduloActivo) {
      const idActual = moduloActivo.id;
      moduloActivo = null;
      await guardarCambios(idActual);
    }
  }

  // --- GENERAR PDF ---
  async function generarPDF() {
    let firmaUsuario = "Superintendente de Circuito";
    let cargoPdf = "Superintendente de Circuito";
    let textoPiePagina = "Informe generado por Asistente de Visitas";

    try {
      const resNombre = await cargarConfig("nombreUsuario");
      if (resNombre) firmaUsuario = resNombre;
      const resCargo = await cargarConfig("cargoUsuario");
      if (resCargo) cargoPdf = resCargo;
      const resPie = await cargarConfig("piePagina");
      if (resPie) textoPiePagina = resPie;
    } catch (e) {
      console.error("Error cargando config para PDF", e);
    }

    const modulosBody: TableCell[][] = [
      [
        { text: 'SECCIÓN', style: 'tableHeader', alignment: 'center' },
        { text: 'OBSERVACIONES Y NOTAS', style: 'tableHeader', alignment: 'center' }
      ]
    ];

    modulos.forEach(mod => {
      modulosBody.push([
        { text: mod.titulo.toUpperCase(), bold: true, fillColor: '#f8fafc', margin: [0, 5, 0, 5] },
        { text: (registro as any)[mod.id] || 'Sin observaciones registradas.', margin: [0, 5, 0, 5] }
      ]);
    });

    const checklistBody: TableCell[][] = [];
    puntosChecklist.forEach((punto, i) => {
      const estaMarcado = registro.checklist && registro.checklist[i];
      checklistBody.push([
        { text: estaMarcado ? '[ X ]' : '[   ]', color: estaMarcado ? '#16a34a' : '#94a3b8', bold: true, alignment: 'center', margin: [0, 3, 0, 3], fontSize: 11 },
        { text: punto, margin: [0, 3, 0, 3] }
      ]);
    });

    const docDefinition: TDocumentDefinitions = {
      content: [
        { text: 'INFORME DE ANÁLISIS', style: 'header' },
        {
          columns: [
            { text: `CONGREGACIÓN: ${nombreCongregacion.toUpperCase()}`, bold: true },
            { text: `VISITA: ${fechaVisita || '---'}`, alignment: 'right' }
          ],
          margin: [0, 0, 0, 15]
        },
        { table: { headerRows: 1, widths: ['35%', '65%'], body: modulosBody }, layout: 'lightHorizontalLines', margin: [0, 0, 0, 25] },
        { text: 'VERIFICACIÓN DE PROCEDIMIENTOS PREVIOS', style: 'subheader', margin: [0, 0, 0, 10] },
        { table: { widths: ['15%', '85%'], body: checklistBody }, layout: 'noBorders', margin: [0, 0, 0, 40] },
        { canvas: [{ type: 'line', x1: 150, y1: 0, x2: 360, y2: 0, lineWidth: 1, lineColor: '#94a3b8' }], alignment: 'center', margin: [0, 0, 0, 5] },
        { text: firmaUsuario, alignment: 'center', bold: true, fontSize: 11 },
        { text: cargoPdf, alignment: 'center', color: '#64748b', fontSize: 10 }
      ],
      styles: {
        header: { fontSize: 18, bold: true, color: '#e11d48', margin: [0, 0, 0, 10] },
        subheader: { fontSize: 12, bold: true, color: '#334155' },
        tableHeader: { bold: true, fontSize: 11, color: '#ffffff', fillColor: '#334155', margin: [0, 5, 0, 5] }
      },
      defaultStyle: { font: 'Roboto', fontSize: 10, color: '#1e293b' },
      footer: function(currentPage: number, pageCount: number) {
        return {
          columns: [
            { text: textoPiePagina, color: '#94a3b8', fontSize: 8, margin: [40, 10, 0, 0] },
            { text: `Página ${currentPage} de ${pageCount}`, alignment: 'right', color: '#94a3b8', fontSize: 8, margin: [0, 10, 40, 0] }
          ]
        };
      }
    };

    try {
      const nombreSeguro = nombreCongregacion.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9\s]/g, "_");
      const rutaDestino = await save({
        defaultPath: `Analisis_${nombreSeguro}_${fechaVisita || 'Borrador'}.pdf`,
        filters: [{ name: 'PDF', extensions: ['pdf'] }]
      });
      if (!rutaDestino) return;

      const bytes = await createPdf(docDefinition);
      if (bytes.length === 0) throw new Error('El PDF generado está vacío');
      await writeFile(rutaDestino, bytes);
      alert("✅ Informe PDF generado y guardado correctamente.");
    } catch (error: any) {
      console.error('Error detallado:', error);
      alert(`❌ Error: ${error.message || JSON.stringify(error)}`);
    }
  }
</script>

{#if cargando}
  <div class="cargando">Cargando análisis...</div>
{:else}
  <div class="contenedor-analisis">

    <div class="cabecera-principal">
      <div class="info-cabecera">
        <h2>Análisis de la Visita</h2>
        <p class="subtitulo">Congregación: <strong>{nombreCongregacion}</strong> · Semana: <strong>{fechaVisita}</strong></p>
      </div>

      <div class="grupo-acciones">
        <button class="btn-gris" on:click={generarPDF}><FileText size={16} /> PDF</button>
      </div>
    </div>

    <p class="instruccion">Haz clic en cualquier tarjeta para añadir o editar las notas de esa sección.</p>

    <div class="muro-grid">
      {#each modulos as mod}
        <div
          class="nota-card {registro[mod.id] && registro[mod.id].trim() !== '' ? 'completada' : 'vacia'}"
          role="button"
          tabindex="0"
          on:click={() => moduloActivo = mod}
          on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); moduloActivo = mod; } }}
        >
          <div class="nota-header">
            <h4>{mod.titulo}</h4>
            <div class="indicador-estado">
              {#if estadoTarjetas[mod.id] === 'guardando'}
                <span class="chip guardando">Guardando...</span>
              {:else if estadoTarjetas[mod.id] === 'guardado'}
                <span class="chip guardado">Guardado</span>
              {:else if registro[mod.id] && registro[mod.id].trim() !== ''}
                <CheckCircle2 size={18} color="#10b981" />
              {:else}
                <Circle size={18} color="#cbd5e1" />
              {/if}
            </div>
          </div>

          <div class="nota-body">
            {#if registro[mod.id] && registro[mod.id].trim() !== ''}
              <p class="preview-text">{registro[mod.id]}</p>
            {:else}
              <p class="empty-text">Sin observaciones aún...</p>
            {/if}
          </div>
        </div>
      {/each}
    </div>

    <div class="seccion-checklist">
      <div class="checklist-header">
        <h3><CheckCircle2 size={18} color="#10b981" /> Tareas de Verificación Previas</h3>
        {#if estadoTarjetas['checklist'] === 'guardando'}
          <span class="chip guardando">Guardando...</span>
        {:else if estadoTarjetas['checklist'] === 'guardado'}
          <span class="chip guardado">Guardado</span>
        {/if}
      </div>

      <div class="checklist-grid">
        {#each puntosChecklist as punto, i}
          <label class="check-item {registro.checklist && registro.checklist[i] ? 'marcado' : ''}">
            <input type="checkbox" bind:checked={registro.checklist[i]} on:change={() => guardarCambios('checklist')} />
            <span class="check-texto">{punto}</span>
          </label>
        {/each}
      </div>
    </div>

  </div>

  {#if moduloActivo}
    <div class="modal-backdrop" on:click={cerrarYGuardar}>
      <div class="modal-content focus-modal" on:click|stopPropagation>
        <div class="modal-header">
          <h3>{moduloActivo.titulo}</h3>
          <button class="btn-close" on:click={cerrarYGuardar}><X size={20}/></button>
        </div>

        <div class="guia-box">
          <p class="guia-titulo">Puntos a evaluar:</p>
          <ul>
            {#each moduloActivo.guias as guia}
              <li>{guia}</li>
            {/each}
          </ul>
        </div>

        <textarea class="focus-textarea" bind:value={registro[moduloActivo.id]} placeholder="Escribe tus observaciones aquí..." autofocus></textarea>

        <div class="modal-footer">
          <button class="btn-primary" on:click={cerrarYGuardar}><Save size={16} /> Listo y Guardar</button>
        </div>
      </div>
    </div>
  {/if}
{/if}

<style>
  .contenedor-analisis { padding: 20px; font-family: var(--font-family); background: var(--bg-app); border-radius: var(--radius-lg); min-height: 100%; color: var(--text-main); }
  .cargando { padding: 40px; text-align: center; color: var(--text-muted); }

  .cabecera-principal { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 10px; border-bottom: var(--border-thin); padding-bottom: 15px; }
  .info-cabecera h2 { margin: 0 0 5px 0; font-size: 1.4rem; color: var(--text-main); font-weight: 800; }
  .subtitulo { margin: 0; font-size: 0.85rem; color: var(--text-muted); }
  .subtitulo strong { color: var(--text-main); }
  .instruccion { color: var(--text-muted); font-size: 0.9rem; margin-bottom: 20px; }

  .grupo-acciones { display: flex; gap: 10px; align-items: center; }
  button { cursor: pointer; font-weight: 600; border-radius: var(--radius-md); border: none; padding: 8px 14px; display: inline-flex; align-items: center; gap: 6px; font-size: 0.85rem; transition: all 0.2s; }
  button:hover { transform: translateY(-1px); box-shadow: var(--shadow-sm); }
  .btn-gris { background-color: var(--text-muted); color: white; }

  .muro-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 15px; }
  .nota-card { background: var(--bg-panel); border: var(--border-thin); border-radius: var(--radius-md); padding: 15px; height: 110px; cursor: pointer; display: flex; flex-direction: column; transition: all 0.2s ease; box-shadow: var(--shadow-sm); }
  .nota-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-md); border-color: var(--primary); }
  .nota-card.completada { border-left: 4px solid #10b981; }
  .nota-card.vacia { border-left: 4px solid var(--border-color); }

  .nota-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
  .nota-header h4 { margin: 0; font-size: 0.9rem; color: var(--text-main); font-weight: 700; line-height: 1.2; }
  .indicador-estado { flex-shrink: 0; }
  .nota-body { flex: 1; overflow: hidden; margin-top: 10px; }
  .preview-text { margin: 0; font-size: 0.85rem; color: var(--text-muted); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  .empty-text { margin: 0; font-size: 0.85rem; color: var(--text-muted); font-style: italic; }

  .modal-backdrop { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); display: flex; justify-content: center; align-items: center; z-index: 9999; }
  .focus-modal { background: var(--bg-panel); color: var(--text-main); width: 90%; max-width: 600px; max-height: 90vh; overflow-y: auto; border-radius: var(--radius-lg); padding: 25px; box-sizing: border-box; box-shadow: var(--shadow-3d); display: flex; flex-direction: column; gap: 15px; animation: zoomIn 0.2s ease-out; }
  .modal-header { display: flex; justify-content: space-between; align-items: center; }
  .modal-header h3 { margin: 0; font-size: 1.3rem; color: var(--text-main); font-weight: 800; }
  .btn-close { background: transparent; border: none; cursor: pointer; padding: 4px; color: var(--text-muted); }
  .guia-box { background: rgba(22, 101, 52, 0.1); border: 1px solid rgba(22, 101, 52, 0.2); padding: 12px 15px; border-radius: var(--radius-sm); }
  .guia-titulo { margin: 0 0 8px 0; font-weight: 700; font-size: 0.85rem; color: #166534; }
  .guia-box ul { margin: 0; padding-left: 20px; font-size: 0.85rem; color: var(--text-main); }
  .guia-box li { margin-bottom: 4px; }
  .focus-textarea { width: 100%; min-height: 200px; box-sizing: border-box; background: var(--bg-app); color: var(--text-main); border-radius: var(--radius-sm); border: var(--border-thin); padding: 15px; font-size: 1rem; line-height: 1.5; font-family: inherit; resize: vertical; outline: none; }
  .focus-textarea:focus { border-color: var(--primary); }
  .modal-footer { display: flex; justify-content: flex-end; }
  .btn-primary { background-color: #5c0a1f !important; color: white !important; padding: 10px 20px !important; border-radius: 30px !important; border: none; font-weight: 600; }

  .chip { padding: 2px 10px; border-radius: 50px; font-size: 0.75rem; font-weight: 700; display: inline-block; }
  .chip.guardado { background-color: #22c55e; color: white; }
  .chip.guardando { background-color: #facc15; color: #713f12; }

  .seccion-checklist { margin-top: 30px; padding-top: 20px; border-top: var(--border-thin); }
  .checklist-header { display: flex; align-items: center; gap: 15px; margin-bottom: 15px; }
  .checklist-header h3 { margin: 0; font-size: 1.1rem; color: var(--text-main); display: flex; align-items: center; gap: 8px; }
  .checklist-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 12px; }
  .check-item { display: flex; align-items: flex-start; gap: 10px; background: var(--bg-panel); padding: 12px 15px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); cursor: pointer; transition: all 0.2s; }
  .check-item:hover { border-color: var(--primary); }
  .check-item.marcado { background: rgba(16, 185, 129, 0.05); border-color: #10b981; }
  .check-item input[type="checkbox"] { margin-top: 3px; width: 18px; height: 18px; cursor: pointer; accent-color: #10b981; }
  .check-texto { font-size: 0.9rem; line-height: 1.4; color: var(--text-main); user-select: none; }

  @keyframes zoomIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }

  @media (max-width: 768px) {
    .cabecera-principal { flex-direction: column; align-items: flex-start; gap: 15px; }
    .grupo-acciones { width: 100%; }
    .grupo-acciones button { flex: 1; justify-content: center; height: 44px; }
    .muro-grid { grid-template-columns: 1fr; }
    .nota-card { height: auto; min-height: 110px; }
    .checklist-grid { grid-template-columns: 1fr; }
    .focus-modal { padding: 20px; width: 95%; }
    .modal-footer .btn-primary { width: 100% !important; height: 48px !important; border-radius: 12px !important; }
  }
</style>