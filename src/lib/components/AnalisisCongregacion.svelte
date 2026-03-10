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
    let firmaUsuario = "Superintendente de Circuito";
    let textoPiePagina = "Informe generado por RAssembly"; 
    
    try {
      if (await exists('config_usuario.json', { baseDir: BaseDirectory.AppLocalData })) {
        const content = await readTextFile('config_usuario.json', { baseDir: BaseDirectory.AppLocalData });
        const config = JSON.parse(content);
        if (config.nombre) firmaUsuario = config.nombre;
        if (config.piePagina) textoPiePagina = config.piePagina;
      }
    } catch (e) {}

    const doc = new jsPDF();
    
    // --- ENCABEZADO ESTILIZADO (SIN IMÁGENES) ---
    doc.setFillColor(225, 29, 72); // Rojo RAssembly
    doc.rect(0, 0, 210, 40, 'F');
    
    // "Logo" de texto AV
    doc.setTextColor(255, 255, 255);
    doc.setFont("courier", "bold");
    doc.setFontSize(32);
    doc.text("AV", 14, 25); 
    
    // Línea divisoria blanca vertical sutil
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.5);
    doc.line(35, 10, 35, 30);

    // Título del Informe
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
    doc.text("Superintendente de Circuito", 105, finalY + 10, { align: 'center' });

    // --- GUARDADO ---
    const nombreSeguro = nombreCongregacion.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9\s]/g, "_");
    const res = await save({ 
      defaultPath: `Analisis_${nombreSeguro}_${registro.fechaVisita}.pdf`, 
      filters: [{ name: 'PDF', extensions: ['pdf'] }] 
    });

    if (res) { 
      await writeFile(res, new Uint8Array(doc.output('arraybuffer'))); 
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
    background: var(--bg-app); /* Cambiado de #f8fafc */
    border-radius: var(--radius-lg); 
    min-height: 100%; 
    color: var(--text-main);
  }
  
  .cabecera-principal { 
    display: flex; 
    justify-content: space-between; 
    align-items: flex-end; 
    margin-bottom: 10px; 
    border-bottom: var(--border-thin); /* Cambiado de sólido fijo */
    padding-bottom: 15px;
  }

  .info-cabecera h2 { 
    margin: 0 0 10px 0; 
    font-size: 1.4rem; 
    color: var(--text-main); /* Cambiado de #1e293b */
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
    display: inline-flex; /* Esto evita que se apilen */
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
    background: var(--bg-panel); /* Cambiado de blanco fijo */
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
    border-color: var(--primary); /* Resalte con tu rojo en hover */
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
    background: rgba(15, 23, 42, 0.6); /* Oscurecemos más el fondo */
    backdrop-filter: blur(4px);
    display: flex; justify-content: center; align-items: center; z-index: 9999;
  }

  .focus-modal {
    background: var(--bg-panel); /* Cambiado de blanco */
    color: var(--text-main);
    width: 90%; max-width: 600px; max-height: 90vh; overflow-y: auto;
    border-radius: var(--radius-lg); padding: 25px; box-sizing: border-box;
    box-shadow: var(--shadow-3d);
    display: flex; flex-direction: column; gap: 15px; animation: zoomIn 0.2s ease-out;
  }

  .modal-header h3 { margin: 0; font-size: 1.3rem; color: var(--text-main); font-weight: 800; }
  
  .guia-box { 
    background: rgba(22, 101, 52, 0.1); /* Fondo verde traslúcido */
    border: 1px solid rgba(22, 101, 52, 0.2); 
    padding: 12px 15px; 
    border-radius: var(--radius-sm); 
  }

  .focus-textarea {
    width: 100%; min-height: 200px; box-sizing: border-box;
    background: var(--bg-app); /* Un tono más oscuro que el panel */
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