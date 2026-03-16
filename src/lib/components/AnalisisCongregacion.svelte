<script lang="ts">
  import { FileText, Save, CheckCircle, CheckCircle2, Circle, X } from "lucide-svelte";
  import { createEventDispatcher, onMount } from 'svelte';
  
  // --- NUESTRA ARQUITECTURA LIMPIA: Importamos el mensajero de Rust ---
  import { guardarConfig, cargarConfig } from '$lib/services/db';
  
  import { save } from "@tauri-apps/plugin-dialog";
  import jsPDF from "jspdf";
  import autoTable from "jspdf-autotable";
  import { fechaPorCongregacion, resumenUltimoAnalisis } from '$lib/stores/appStore';

  const dispatch = createEventDispatcher();
  
  export let nombreCongregacion: string;
  export let datosEdicion: any = null;

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
    recomendaciones: string; // <--- NUEVO
    localReunion: string;    // <--- NUEVO
  }

  const valoresPorDefecto: RegistroCongregacion = {
    fechaVisita: "", opinionAncianos: "", ministerioCristiano: "", reunionesCongregacion: "",
    pastoreo: "", precursores: "", irregularesInactivos: "", responsabilidades: "",
    contabilidad: "", miscelaneos: "", seguimiento: "",
    recomendaciones: "", localReunion: "" // <--- NUEVO
  };

  let registro: RegistroCongregacion = { ...valoresPorDefecto };
  let congregacionActual = "";

  // --- ESTADO DE LOS CHIPS VISUALES ---
  let estadoTarjetas: Record<string, 'guardando' | 'guardado' | null> = {};

  type ClaveRegistro = keyof Omit<RegistroCongregacion, 'fechaVisita'>;
  
  // --- LISTA DE MÓDULOS ACTUALIZADA (AHORA SON 12) ---
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
        'Calidad en la enseñanza.',
        'Procedimientos / Sugerencias.'
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
      id: 'recomendaciones', 
      titulo: '11. Recomendaciones / Nombramientos y Bajas', 
      guias: [
        'Nombramientos recomendados (Ancianos, Siervos Ministeriales).',
        'Bajas o eliminaciones de privilegios.'
      ] 
    },

    { 
      id: 'localReunion', 
      titulo: '12. Local de Reunión / Mantenimiento', 
      guias: [
        'Condición general del Salón del Reino.',
        'Necesidades de mantenimiento, seguridad o limpieza.'
      ] 
    },

    { 
      id: 'miscelaneos', 
      titulo: '9. Misceláneos', 
      guias: [
        'Atención a pecados graves u otros asuntos no cubiertos.',
        'Hermanos y hermanas con potencial para mayores privilegios.' // (Limpieza y mantenimiento se movió al módulo 12)
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

  // --- CARGAR BORRADOR USANDO RUST PURO ---
  async function cargarDatosBorrador() {
    try {
      const claveBorrador = `borrador_${nombreCongregacion}`;
      const valor = await cargarConfig(claveBorrador);
      
      if (valor && valor !== "{}") {
        registro = { ...valoresPorDefecto, ...JSON.parse(valor) };
      } else {
        registro = { ...valoresPorDefecto };
      }
    } catch (e) { 
      console.error("Error cargando borrador vía Rust:", e);
      registro = { ...valoresPorDefecto }; 
    }
  }

  // --- GUARDAR BORRADOR USANDO RUST PURO ---
  async function guardarCambios(idModificado?: string) {
    if (!nombreCongregacion) return;

    if (idModificado) {
      estadoTarjetas[idModificado] = 'guardando';
      estadoTarjetas = { ...estadoTarjetas }; 
    }

    try {
      const claveBorrador = `borrador_${nombreCongregacion}`;
      const valorJSON = JSON.stringify(registro);

      // Usamos nuestro puente de Rust en lugar de una consulta SQL directa
      await guardarConfig(claveBorrador, valorJSON);
      
      if (idModificado) await new Promise(r => setTimeout(r, 400));
      
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
      console.error(error);
      alert("❌ Error al guardar borrador."); 
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

  // --- FINALIZAR: LIMPIAR BORRADOR EN RUST Y ENVIAR AL HISTORIAL ---
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
      
      // Enviamos el evento para que el componente padre lo guarde en la tabla 'historial_visitas'
      dispatch('guardarEnHistorial', { congregacion: nombreCongregacion, fecha: registro.fechaVisita, contenido: resumen });
      
      // Borramos el borrador temporal guardando un JSON vacío usando Rust
      await guardarConfig(`borrador_${nombreCongregacion}`, "{}");
      
      registro = { ...valoresPorDefecto };
      dispatch('limpiarFormulario');
      alert("✅ Informe finalizado.");
    } catch (e) { alert("❌ Error al finalizar."); }
  }

  // --- GENERAR PDF LEYENDO PERFIL DESDE RUST PURO ---
  async function generarPDF() {
    let firmaUsuario = "Superintendente de Circuito";
    let cargoPdf = "Superintendente de Circuito";
    let textoPiePagina = "Informe generado por Asistente de Visitas"; 
    
    try {
      // Cargamos la info del PDF de la misma forma limpia
      const resNombre = await cargarConfig("nombreUsuario");
      if (resNombre) firmaUsuario = resNombre;

      const resCargo = await cargarConfig("cargoUsuario");
      if (resCargo) cargoPdf = resCargo;

      const resPie = await cargarConfig("piePagina");
      if (resPie) textoPiePagina = resPie;

    } catch (e) {
      console.error("Error al cargar configuración para PDF", e);
    }

    const doc = new jsPDF();
    
    // --- ENCABEZADO ESTILIZADO ---
    doc.setFillColor(225, 29, 72); 
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("courier", "bold");
    doc.setFontSize(32);
    doc.text("AV", 14, 25); 
    
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.5);
    doc.line(35, 10, 35, 30);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("INFORME DE ANÁLISIS", 42, 20);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`CONGREGACIÓN: ${nombreCongregacion.toUpperCase()}`, 42, 30);
    doc.text(`VISITA: ${registro.fechaVisita || '---'}`, 196, 30, { align: 'right' });

    // --- TABLA DE CONTENIDO ---
    const bodyData = modulos.map(mod => [
      mod.titulo.toUpperCase(), 
      registro[mod.id] || 'Sin observaciones registradas.'
    ]);

    autoTable(doc, { 
      startY: 45, 
      head: [['SECCIÓN', 'OBSERVACIONES Y NOTAS']], 
      body: bodyData,
      theme: 'grid',
      headStyles: { fillColor: [51, 65, 85], halign: 'center' },
      columnStyles: { 
        0: { fontStyle: 'bold', cellWidth: 50, fillColor: [248, 250, 252] },
        1: { fontSize: 10 }
      },
      margin: { top: 45 },
      didDrawPage: (data) => {
        const pageSize = doc.internal.pageSize;
        doc.setFontSize(8); doc.setTextColor(150, 150, 150);
        doc.text(`Firma: ${firmaUsuario}`, 14, pageSize.height - 10);
        const ancho = doc.getTextWidth(textoPiePagina);
        doc.text(textoPiePagina, pageSize.width - 14 - ancho, pageSize.height - 10);
      }
    });

    // --- ESPACIO DE FIRMA FINAL ---
    const finalY = (doc as any).lastAutoTable.finalY + 30;
    doc.setDrawColor(200, 200, 200);
    doc.line(70, finalY, 140, finalY);
    doc.setFontSize(9);
    doc.text(firmaUsuario, 105, finalY + 5, { align: 'center' });
    doc.text(cargoPdf, 105, finalY + 10, { align: 'center' });

    // --- GUARDADO NATIVO ---
    const nombreSeguro = nombreCongregacion.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9\s]/g, "_");
    const res = await save({ 
      defaultPath: `Analisis_${nombreSeguro}_${registro.fechaVisita}.pdf`, 
      filters: [{ name: 'PDF', extensions: ['pdf'] }] 
    });

    if (res) { 
      doc.save(res); 
      alert("✅ Informe PDF generado correctamente."); 
    }
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
  /* 1. CONTENEDOR PRINCIPAL */
  .contenedor-analisis { 
    padding: 20px; 
    font-family: var(--font-family); 
    background: var(--bg-app);
    border-radius: var(--radius-lg); 
    min-height: 100%; 
    color: var(--text-main);
  }
  
  .cabecera-principal { 
    display: flex; 
    justify-content: space-between; 
    align-items: flex-end; 
    margin-bottom: 10px; 
    border-bottom: var(--border-thin); 
    padding-bottom: 15px;
  }

  .info-cabecera h2 { 
    margin: 0 0 10px 0; 
    font-size: 1.4rem; 
    color: var(--text-main); 
    font-weight: 800; 
  }

  .fecha-seccion { 
    display: flex; 
    align-items: center; 
    gap: 10px; 
    font-size: 0.9rem; 
    color: var(--text-muted); 
    font-weight: 600; 
  }

  .fecha-seccion input { 
    border: var(--border-thin); 
    border-radius: var(--radius-sm); 
    padding: 4px 8px; 
    color: var(--text-main); 
    font-weight: bold; 
    background: var(--bg-panel);
  }
  
  .instruccion { color: var(--text-muted); font-size: 0.9rem; margin-bottom: 20px; }

  /* 2. BOTONES */
  .grupo-acciones {
    display: flex;
    gap: 10px;
    align-items: center;
  }

  button { 
    cursor: pointer; 
    font-weight: 600; 
    border-radius: var(--radius-md); 
    border: none; 
    padding: 8px 14px; 
    display: inline-flex; 
    align-items: center; 
    gap: 6px; 
    font-size: 0.85rem; 
    transition: all 0.2s; 
  }

  button:hover { transform: translateY(-1px); box-shadow: var(--shadow-sm); }
  .btn-gris { background-color: var(--text-muted); color: white; }
  .btn-azul { background-color: #2563eb; color: white; }

  /* 3. GRID Y TARJETAS */
  .muro-grid { 
    display: grid; 
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); 
    gap: 15px; 
  }

  .nota-card {
    background: var(--bg-panel); 
    border: var(--border-thin);
    border-radius: var(--radius-md);
    padding: 15px;
    height: 110px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    transition: all 0.2s ease;
    box-shadow: var(--shadow-sm);
  }

  .nota-card:hover {
    transform: translateY(-3px);
    box-shadow: var(--shadow-md);
    border-color: var(--primary); 
  }

  .nota-card.completada { border-left: 4px solid #10b981; }
  .nota-card.vacia { border-left: 4px solid var(--border-color); }

  .nota-header h4 { 
    margin: 0; 
    font-size: 0.9rem; 
    color: var(--text-main); 
    font-weight: 700; 
    line-height: 1.2; 
  }

  /* 4. MODAL Y FORMULARIO */
  .modal-backdrop {
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(15, 23, 42, 0.6); 
    backdrop-filter: blur(4px);
    display: flex; justify-content: center; align-items: center; z-index: 9999;
  }

  .focus-modal {
    background: var(--bg-panel); 
    color: var(--text-main);
    width: 90%; max-width: 600px; max-height: 90vh; overflow-y: auto;
    border-radius: var(--radius-lg); padding: 25px; box-sizing: border-box;
    box-shadow: var(--shadow-3d);
    display: flex; flex-direction: column; gap: 15px; animation: zoomIn 0.2s ease-out;
  }

  .modal-header h3 { margin: 0; font-size: 1.3rem; color: var(--text-main); font-weight: 800; }
  
  .guia-box { 
    background: rgba(22, 101, 52, 0.1); 
    border: 1px solid rgba(22, 101, 52, 0.2); 
    padding: 12px 15px; 
    border-radius: var(--radius-sm); 
  }

  .focus-textarea {
    width: 100%; min-height: 200px; box-sizing: border-box;
    background: var(--bg-app); 
    color: var(--text-main);
    border-radius: var(--radius-sm); 
    border: var(--border-thin); 
    padding: 15px; font-size: 1rem; line-height: 1.5; font-family: inherit;
    resize: vertical; outline: none; transition: border-color 0.2s;
  }

  .focus-textarea:focus { border-color: var(--primary); }

  .btn-primary { background: var(--primary); color: white; padding: 10px 20px; }

  /* CHIPS */
  .chip.guardado { background: rgba(22, 163, 74, 0.2); color: #4ade80; }
  .chip.guardando { background: rgba(234, 179, 8, 0.2); color: #facc15; }

  @keyframes zoomIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
</style>