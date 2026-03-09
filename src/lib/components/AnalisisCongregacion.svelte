<script lang="ts">
  import { FileText, Save, CheckCircle, CheckCircle2, Circle, X } from "lucide-svelte";
  import { createEventDispatcher, onMount } from 'svelte';
  
  import { LazyStore } from '@tauri-apps/plugin-store'; 
  import { writeFile, readTextFile, BaseDirectory, exists } from "@tauri-apps/plugin-fs";
  import { save } from "@tauri-apps/plugin-dialog";
  import jsPDF from "jspdf";
  import autoTable from "jspdf-autotable";
  import { fechaPorCongregacion, resumenUltimoAnalisis } from '$lib/stores/appStore';

  const dispatch = createEventDispatcher();
  
  export let nombreCongregacion: string;
  export let datosEdicion: any = null;

  // NUEVA ESTRUCTURA SIMPLIFICADA (10 Campos)
  interface RegistroCongregacion {
    fechaVisita: string;
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
  }

  const valoresPorDefecto: RegistroCongregacion = {
    fechaVisita: "", opinionAncianos: "", ministerioCristiano: "", reunionesCongregacion: "",
    pastoreo: "", precursores: "", irregularesInactivos: "", responsabilidades: "",
    contabilidad: "", miscelaneos: "", seguimiento: ""
  };

  let registro: RegistroCongregacion = { ...valoresPorDefecto };
  let congregacionActual = "";
  const store = new LazyStore('registro_circuito_v1.json');
  let mapaObservaciones: Record<string, any> = {};

  // --- ESTADO DE LOS CHIPS VISUALES ---
  let estadoTarjetas: Record<string, 'guardando' | 'guardado' | null> = {};

  // --- LAS 10 TARJETAS DEL MURO DE NOTAS ---
  type ClaveRegistro = keyof Omit<RegistroCongregacion, 'fechaVisita'>;
  
  // TUS MÓDULOS INTACTOS
  const modulos: { id: ClaveRegistro, titulo: string, guias: string[] }[] = [
    { 
      id: 'opinionAncianos', 
      titulo: '1. Opinión de Ancianos', 
      guias: [
        'Aspectos positivos que observan en la congregación.', 
        'Necesidades o tendencias que les preocupan.'
      ] 
    },
    { 
      id: 'ministerioCristiano', 
      titulo: '2. Ministerio Cristiano', 
      guias: [
        'Prioridad a la predicación de casa en casa y diferentes facetas.', 
        'Trabajo del territorio / Revisitas / Cursos bíblicos.', 
        'Entusiasmo de los publicadores.'
      ] 
    },
    { 
      id: 'reunionesCongregacion', 
      titulo: '3. Reuniones de Congregación', 
      guias: [
        'Asistencia, y participación.',
        'Calidad en la enseñanza.'
      ] 
    },
    { 
      id: 'pastoreo', 
      titulo: '4. Pastoreo', 
      guias: [
        '¿Se hacen visitas periódicas y eficaces?', 
        'Progreso espiritual, adoración en familia y metas de los hermanos.'
      ] 
    },
    { 
      id: 'precursores', 
      titulo: '5. Precursores', 
      guias: [
        'Actitud hacia el servicio.', 
        'Dificultades que enfrentan los precursores.',
        'Apoyo de los ancianos.'
      ] 
    },
    { 
      id: 'irregularesInactivos', 
      titulo: '6. Irregulares e Inactivos', 
      guias: [
        'Nombres y razones principales.', 
        'Ayuda específica del cuerpo de ancianos.'
      ] 
    },
    { 
      id: 'responsabilidades', 
      titulo: '7. Responsabilidades', 
      guias: [
        'Unidad y paz del cuerpo de ancianos y siervos.', 
        'Labor del sup. de servicio.',
        'Labor del SEC.',
        'Labor de los SG.',
        'Otros.'
      ] 
    },
    { 
      id: 'contabilidad', 
      titulo: '8. Contabilidad', 
      guias: [
        '¿Archivos actualizados correctamente?', 
        '¿Uso adecuado de la contabilidad en línea?'
      ] 
    },
    { 
      id: 'miscelaneos', 
      titulo: '9. Misceláneos', 
      guias: [
        'Atención a pecados graves u otros asuntos no cubiertos.',
        'Condición, limpieza y mantenimiento del local de reunión.',
        'Hermanos y hermanas con potencial para mayores privilegios.'
      ] 
    },
    { 
      id: 'seguimiento', 
      titulo: '10. Seguimiento', 
      guias: [
        'Asuntos pendientes antes de la próxima visita.', 
        'Asuntos que deben enviarse a la sucursal.'
      ] 
    }
  ];

  let moduloActivo: typeof modulos[0] | null = null;

  // Reactividad
  $: if (nombreCongregacion && nombreCongregacion !== congregacionActual) {
    congregacionActual = nombreCongregacion;
    if (!datosEdicion) cargarDatosBorrador();
  }
  $: if (datosEdicion) registro = { ...valoresPorDefecto, ...datosEdicion };

  async function cargarDatosBorrador() {
    try {
      const obs = await store.get<Record<string, any>>('observaciones');
      mapaObservaciones = obs || {};
      const guardado = mapaObservaciones[nombreCongregacion];
      registro = guardado ? { ...valoresPorDefecto, ...guardado } : { ...valoresPorDefecto };
    } catch (e) { registro = { ...valoresPorDefecto }; }
  }

  // --- LÓGICA DE GUARDADO MEJORADA CON CHIPS ---
  async function guardarCambios(idModificado?: string) {
    if (!nombreCongregacion) return;

    if (idModificado) {
      estadoTarjetas[idModificado] = 'guardando';
      estadoTarjetas = { ...estadoTarjetas }; 
    }

    try {
      const obs = await store.get<Record<string, any>>('observaciones') || {};
      mapaObservaciones = obs;
      mapaObservaciones[nombreCongregacion] = registro;
      await store.set('observaciones', mapaObservaciones);
      
      if (idModificado) await new Promise(r => setTimeout(r, 400));
      
      await store.save();

      if (idModificado) {
        estadoTarjetas[idModificado] = 'guardado';
        estadoTarjetas = { ...estadoTarjetas };

        setTimeout(() => {
          if (estadoTarjetas[idModificado] === 'guardado') {
            estadoTarjetas[idModificado] = null;
            estadoTarjetas = { ...estadoTarjetas };
          }
        }, 2500);
      }
    } catch (error) { 
      alert("❌ Error al guardar en disco."); 
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

  async function finalizarInforme() {
    if (!nombreCongregacion || !registro.fechaVisita) { alert("⚠️ Ingresa la fecha antes de finalizar."); return; }
    if (!confirm("¿Finalizar y limpiar formulario?")) return;

    try {
      const resumen = Object.entries(registro).filter(([key]) => key !== 'fechaVisita' && key !== 'id').map(([k, v]) => {
          const nombreModulo = k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
          return `${nombreModulo}: ${v || 'Sin observaciones'}`;
        }).join('\n\n');
      
      resumenUltimoAnalisis.update(r => ({ ...r, [nombreCongregacion]: resumen }));
      fechaPorCongregacion.update(f => ({ ...f, [nombreCongregacion]: registro.fechaVisita }));
      dispatch('guardarEnHistorial', { congregacion: nombreCongregacion, fecha: registro.fechaVisita, contenido: resumen });
      
      const obs = await store.get<Record<string, any>>('observaciones') || {};
      if (obs[nombreCongregacion]) {
        obs[nombreCongregacion] = { ...valoresPorDefecto };
        await store.set('observaciones', obs);
        await store.save();
      }
      
      registro = { ...valoresPorDefecto };
      dispatch('limpiarFormulario');
      alert("✅ Informe finalizado.");
    } catch (e) { alert("❌ Error al finalizar."); }
  }

  async function generarPDF() {
    let firmaUsuario = "";
    let textoPiePagina = "Informe generado por Asistente de Visitas"; 
    try {
      if (await exists('config_usuario.json', { baseDir: BaseDirectory.AppLocalData })) {
        const content = await readTextFile('config_usuario.json', { baseDir: BaseDirectory.AppLocalData });
        const config = JSON.parse(content);
        if (config.nombre) firmaUsuario = `Generado por: ${config.nombre}`;
        if (config.piePagina) textoPiePagina = config.piePagina;
      }
    } catch (e) {}

    const doc = new jsPDF();
    doc.setFontSize(18); doc.text(`Análisis: ${nombreCongregacion}`, 14, 20);
    doc.setFontSize(11); doc.text(`Fecha de la visita: ${registro.fechaVisita || 'No especificada'}`, 14, 27);

    const bodyData = Object.entries(registro).filter(([k]) => k !== 'fechaVisita').map(([k, v]) => {
         let label = k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
         return [label, v || 'Sin observaciones'];
      });

    autoTable(doc, { 
      startY: 35, head: [['Módulo', 'Observaciones']], body: bodyData, theme: 'grid', 
      headStyles: { fillColor: [225, 29, 72] }, columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } },
      didDrawPage: (data) => {
        const pageSize = doc.internal.pageSize;
        doc.setFontSize(8); doc.setTextColor(150, 150, 150);
        if (firmaUsuario) doc.text(firmaUsuario, 14, pageSize.height - 10);
        const ancho = doc.getTextWidth(textoPiePagina);
        doc.text(textoPiePagina, pageSize.width - 14 - ancho, pageSize.height - 10);
      }
    });

    const nombreSeguro = nombreCongregacion.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9\s]/g, "_");
    const res = await save({ defaultPath: `Analisis_${nombreSeguro}_${registro.fechaVisita}.pdf`, filters: [{ name: 'PDF', extensions: ['pdf'] }] });
    if (res) { await writeFile(res, new Uint8Array(doc.output('arraybuffer'))); alert("✅ PDF exportado."); }
  }
</script>

<div class="contenedor-analisis">
  
  <div class="cabecera-principal">
    <div class="info-cabecera">
      <h2>Muro de Análisis: {nombreCongregacion}</h2>
      <div class="fecha-seccion">
        <label for="fv">Semana de visita:</label>
        <input type="date" id="fv" bind:value={registro.fechaVisita} on:change={() => guardarCambios('fecha')} />
        
        {#if estadoTarjetas['fecha'] === 'guardando'}
          <span class="chip guardando">Guardando...</span>
        {:else if estadoTarjetas['fecha'] === 'guardado'}
          <span class="chip guardado">Guardado</span>
        {/if}
      </div>
    </div>
    
    <div class="grupo-acciones">
      <button class="btn-gris" on:click={generarPDF}><FileText size={16} /> PDF</button>
      <button class="btn-azul" title="Guardar en historial y limpiar" on:click={finalizarInforme}><CheckCircle size={16} /> Finalizar</button>
    </div>
  </div>

  <p class="instruccion">Haz clic en cualquier tarjeta para añadir o editar las notas de esa sección.</p>

  <div class="muro-grid">
    {#each modulos as mod}
      <div 
        class="nota-card {registro[mod.id] && registro[mod.id].trim() !== '' ? 'completada' : 'vacia'}"
        on:click={() => moduloActivo = mod}
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

      <textarea 
        class="focus-textarea" 
        bind:value={registro[moduloActivo.id]} 
        placeholder="Escribe tus observaciones aquí..."
        autofocus
      ></textarea>

      <div class="modal-footer">
        <button class="btn-global btn-primary" on:click={cerrarYGuardar}>
          <Save size={16} /> Listo y Guardar
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .contenedor-analisis { padding: 20px; font-family: system-ui; background: #f8fafc; border-radius: 12px; min-height: 100%; }
  
  .cabecera-principal { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 10px; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px;}
  .info-cabecera h2 { margin: 0 0 10px 0; font-size: 1.4rem; color: #1e293b; font-weight: 800; }
  .fecha-seccion { display: flex; align-items: center; gap: 10px; font-size: 0.9rem; color: #64748b; font-weight: 600; }
  .fecha-seccion input { border: 1px solid #cbd5e1; border-radius: 6px; padding: 4px 8px; color: #333; font-weight: bold; background: #fff;}
  
  .instruccion { color: #64748b; font-size: 0.9rem; margin-bottom: 20px; }

  .grupo-acciones { display: flex; gap: 8px; }
  button { cursor: pointer; font-weight: 600; border-radius: 8px; border: none; padding: 8px 14px; display: flex; align-items: center; gap: 6px; font-size: 0.85rem; transition: all 0.2s; }
  button:hover { transform: translateY(-1px); }
  .btn-rojo { background-color: #e11d48; color: white; }
  .btn-gris { background-color: #64748b; color: white; }
  .btn-azul { background-color: #2563eb; color: white; }

  .muro-grid { 
    display: grid; 
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); 
    gap: 15px; 
  }

  .nota-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 15px;
    height: 110px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    transition: all 0.2s ease;
    box-shadow: 0 1px 3px rgba(0,0,0,0.02);
  }

  .nota-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    border-color: #cbd5e1;
  }

  .nota-card.completada { border-left: 4px solid #10b981; }
  .nota-card.vacia { border-left: 4px solid #cbd5e1; }

  .nota-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
  .nota-header h4 { margin: 0; font-size: 0.9rem; color: #334155; font-weight: 700; line-height: 1.2; padding-right: 5px;}

  /* ESTILOS DE LOS CHIPS */
  .indicador-estado { display: flex; align-items: center; }
  .chip { 
    font-size: 0.65rem; 
    padding: 3px 8px; 
    border-radius: 10px; 
    font-weight: 700; 
    text-transform: uppercase; 
    letter-spacing: 0.5px; 
  }
  .chip.guardando { background: #fef08a; color: #854d0e; animation: pulse 1s infinite; }
  .chip.guardado { background: #dcfce7; color: #166534; }

  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.6; }
    100% { opacity: 1; }
  }

  .nota-body { flex: 1; overflow: hidden; }
  .preview-text { 
    margin: 0; font-size: 0.8rem; color: #475569; display: -webkit-box;
    -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  }
  .empty-text { margin: 0; font-size: 0.8rem; color: #94a3b8; font-style: italic; }

  .modal-backdrop {
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(2px);
    display: flex; justify-content: center; align-items: center; z-index: 9999;
  }

  .focus-modal {
    background: white; width: 90%; max-width: 600px; max-height: 90vh; overflow-y: auto;
    border-radius: 12px; padding: 25px; box-sizing: border-box;
    box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
    display: flex; flex-direction: column; gap: 15px; animation: zoomIn 0.2s ease-out;
  }

  .modal-header { display: flex; justify-content: space-between; align-items: center; }
  .modal-header h3 { margin: 0; font-size: 1.3rem; color: #0f172a; font-weight: 800; }
  .btn-close { background: transparent; padding: 5px; color: #64748b; }
  .btn-close:hover { background: #f1f5f9; color: #ef4444; border-radius: 5px;}

  .guia-box { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px 15px; border-radius: 8px; }
  .guia-titulo { margin: 0 0 5px 0; font-size: 0.8rem; font-weight: 700; color: #166534; }
  .guia-box ul { margin: 0; padding-left: 20px; font-size: 0.85rem; color: #15803d; }
  .guia-box li { margin-bottom: 3px; }

  .focus-textarea {
    width: 100%; min-height: 200px; box-sizing: border-box;
    border-radius: 8px; border: 2px solid #e2e8f0; padding: 15px; 
    font-size: 1rem; line-height: 1.5; font-family: inherit;
    resize: vertical; outline: none; transition: border-color 0.2s;
  }
  .focus-textarea:focus { border-color: #3b82f6; }

  .modal-footer { display: flex; justify-content: flex-end; margin-top: 5px;}
  .btn-primary { background: #3b82f6; color: white; padding: 10px 20px; font-size: 0.95rem; }
  .btn-primary:hover { background: #2563eb; }

  @keyframes zoomIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
</style>
