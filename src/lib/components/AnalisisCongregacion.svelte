<script lang="ts">
  import { FileText, Save, CheckCircle } from "lucide-svelte";
  import { observacionesStore, guardarDatos } from '$lib/persistencia';
  import { jsPDF } from "jspdf";
  import autoTable from "jspdf-autotable";
  import { save } from "@tauri-apps/plugin-dialog";

  import { writeFile, writeTextFile } from "@tauri-apps/plugin-fs";
  import { fechaPorCongregacion, resumenUltimoAnalisis } from '$lib/stores/appStore';
  import { construirResumenPlano, type RegistroCongregacion } from '$lib/utils/construirResumenPlano';
  import { createEventDispatcher } from 'svelte';

  // Para emitir eventos al padre
  const dispatch = createEventDispatcher();
  
  export let nombreCongregacion: string;
  export let datosEdicion: any = null; // Prop para recibir datos del historial para edición

  interface RegistroCongregacion {
    fechaVisita: string;
    opinionGeneral: string;
    ministerio: string;
    territorio: string;
    atencionTerritorio: string;
    precursoresMetas: string;
    reuniones: string;
    pastoreo: string;
    crecimiento: string;
    superServicio: string;
    publicaciones: string;
    metas: string;
    cuerpoAncianos: string;
    local: string;
    miscelaneos: string;
    irregulares: string;
    potencial: string;
    analisisPrecursores: string;
    contabilidad: string;
    seguimiento: string;
  }

  const valoresPorDefecto: RegistroCongregacion = {
    fechaVisita: "", opinionGeneral: "", ministerio: "", territorio: "",
    atencionTerritorio: "", precursoresMetas: "", reuniones: "", pastoreo: "",
    crecimiento: "", superServicio: "", publicaciones: "", metas: "", cuerpoAncianos: "",
    local: "", miscelaneos: "", irregulares: "", potencial: "", analisisPrecursores: "",
    contabilidad: "", seguimiento: ""
  };

  let registro: RegistroCongregacion = { ...valoresPorDefecto };
  let congregacionActual = "";

  // Reactividad para cargar datos cuando cambia la congregación o cuando llegan datos de edición
  $: if (nombreCongregacion && nombreCongregacion !== congregacionActual) {
    congregacionActual = nombreCongregacion;
    // Si hay datosEdicion, los usamos; si no, cargamos del store
    if (datosEdicion) {
      console.log("🔄 Cargando datos de edición para nueva congregación:", datosEdicion);
      registro = { ...valoresPorDefecto, ...datosEdicion };
    } else {
      const guardado = $observacionesStore[nombreCongregacion];
      registro = guardado ? { ...valoresPorDefecto, ...guardado } : { ...valoresPorDefecto };
    }
  }

  // También reaccionamos a cambios en datosEdicion para la misma congregación
  $: if (nombreCongregacion && congregacionActual === nombreCongregacion && datosEdicion) {
    console.log("🔄 Cargando datos de edición en el formulario:", datosEdicion);
    registro = { ...valoresPorDefecto, ...datosEdicion };
  }

  // Si no hay datosEdicion, guardamos los cambios en el store
  $: if (nombreCongregacion && congregacionActual === nombreCongregacion && !datosEdicion) {
    observacionesStore.update(store => ({ ...store, [nombreCongregacion]: { ...registro } }));
  }

  async function guardarCambios() {
    if (!nombreCongregacion) {
      alert("⚠️ No hay congregación seleccionada.");
      return;
    }
    try {
      await guardarDatos($observacionesStore);
      alert("✅ Cambios guardados correctamente.");
    } catch (error) {
      console.error("Error al guardar:", error);
      alert("❌ Error al guardar.");
    }
  }

  async function finalizarInforme() {
    console.log("🔵 Botón Finalizar y Limpiar presionado");
    
    if (!nombreCongregacion || !registro.fechaVisita) {
      alert("⚠️ Ingresa la fecha antes de finalizar.");
      return;
    }
    
    if (!confirm("¿Finalizar y limpiar formulario? Esta acción guardará el informe en el historial.")) return;

    try {
      // 1. Crear resumen del formulario
      const resumen = Object.entries(registro)
        .filter(([key]) => key !== 'fechaVisita')
        .map(([k, v]) => {
          // Formatear nombres de módulos
          const nombreModulo = k
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .replace('Cuerpo Ancianos', 'Cuerpo de Ancianos');
          return `${nombreModulo}: ${v || 'Sin observaciones'}`;
        })
        .join('\n\n');
      
      console.log("📝 Resumen generado:", resumen.substring(0, 100) + "...");
      
      // 2. Actualizar los stores globales (para que el padre tenga acceso)
      resumenUltimoAnalisis.update(r => ({ ...r, [nombreCongregacion]: resumen }));
      fechaPorCongregacion.update(f => ({ ...f, [nombreCongregacion]: registro.fechaVisita }));

      // 3. Emitir evento para guardar en historial (el padre lo manejará)
      dispatch('guardarEnHistorial', {
        congregacion: nombreCongregacion,
        fecha: registro.fechaVisita,
        contenido: resumen
      });
      
      // 4. Limpiar el store local y el estado
      const nuevaCopiaStore = { ...$observacionesStore };
      nuevaCopiaStore[nombreCongregacion] = { ...valoresPorDefecto };
      observacionesStore.set(nuevaCopiaStore);
      
      // 5. Guardar datos persistentes (para que la limpieza persista)
      await guardarDatos(nuevaCopiaStore);
      
      // 6. Resetear estado local
      registro = { ...valoresPorDefecto };
      
      // 7. Emitir evento para indicar que se debe limpiar el formulario (y cerrar)
      dispatch('limpiarFormulario');
      
      // 8. Mostrar mensaje
      alert("✅ Informe finalizado y guardado en el historial.");
      
    } catch (e) {
      console.error("❌ Error al finalizar informe:", e);
      alert("❌ Error al finalizar el informe.");
    }
  }

  async function generarPDF() {
    const doc = new jsPDF();
    doc.text(`Análisis: ${nombreCongregacion}`, 14, 20);
    autoTable(doc, { 
      startY: 30, 
      head: [['Módulo', 'Observaciones']],
      body: Object.entries(registro).filter(([k]) => k !== 'fechaVisita')
    });
    const res = await save({ defaultPath: `Analisis_${nombreCongregacion}.pdf` });
    if (res) await writeFile(res, new Uint8Array(doc.output('arraybuffer')));
  }

  let guias = {
    g1: false, g2: false, g3: false, g4: false, g5: false, g6: false, g7: false, g8: false,
    g9: false, g10: false, g11: false, g12: false, g13: false, g14: false, g15: false,
    g16: false, g17: false, g18: false, g19: false
  };
</script>

<div class="contenedor-analisis">
  <div class="cabecera-principal">
    <h2>Asistente de visitas: {nombreCongregacion}</h2>
    <div class="grupo-acciones">
      <button class="btn-rojo" on:click={guardarCambios}><Save size={18} /> Guardar cambios</button>
      <button class="btn-gris" on:click={generarPDF}><FileText size={18} /> PDF</button>
      <button class="btn-azul" on:click={finalizarInforme}><CheckCircle size={18} /> Finalizar y Limpiar</button>
    </div>
  </div>

  <div class="fecha-seccion">
    <label for="fv" class="fecha-label">Fecha de la visita:</label>
    <input type="date" id="fv" bind:value={registro.fechaVisita} />
  </div>

  <!-- Los módulos del formulario se mantienen exactamente igual -->
  <div class="modulo">
    <h3 class="modulo-titulo">1. OPINIÓN DE LOS ANCIANOS</h3>
    <button class="guia-toggle" on:click={() => guias.g1 = !guias.g1}>{guias.g1 ? 'OCULTAR' : 'VER PREGUNTAS'}</button>
    {#if guias.g1}<div class="guia-contenido"><p>Aspectos positivos que observan.</p><p>Necesidades que les preocupan.</p></div>{/if}
    <textarea bind:value={registro.opinionGeneral}></textarea>
  </div>

  <div class="modulo">
    <h3 class="modulo-titulo">2. MINISTERIO CRISTIANO</h3>
    <button class="guia-toggle" on:click={() => guias.g2 = !guias.g2}>{guias.g2 ? 'OCULTAR' : 'VER PREGUNTAS'}</button>
    {#if guias.g2}
      <div class="guia-contenido">
        <p>¿En qué aspectos tienen buenos resultados y en cuáles necesitan mejoras?</p>
        <p>¿Participan en diferentes facetas (calles, negocios, teléfono, etc.)?</p>
        <p>Cursos bíblicos: ¿Cómo lograr dirigir más? ¿Los nombrados dan ejemplo de entusiasmo?</p>
        <p>¿Están los SG brindando ayuda personal y estímulo?</p>
      </div>
    {/if}
    <textarea bind:value={registro.ministerio}></textarea>
  </div>

  <div class="modulo">
    <h3 class="modulo-titulo">3. SOBRE LA PREDICACIÓN DE CASA EN CASA</h3>
    <button class="guia-toggle" on:click={() => guias.g3 = !guias.g3}>{guias.g3 ? 'OCULTAR ▲' : 'VER PREGUNTAS ▼'}</button>
    {#if guias.g3}
      <div class="guia-contenido">
        <p>¿Está la congregación dando prioridad a la predicación de casa en casa?</p>
        <p>¿Qué actitud manifiestan los publicadores? ¿Son entusiastas o manifiestan temor?</p>
        <p>¿Se realiza en horas en que es más probable encontrar a la gente?</p>
        <p>¿Apoyan los publicadores regularmente las RSC? ¿Los nombrados y precursores llevan la delantera?</p>
        <p>Si algunos no salen a predicar con la congregación, ¿cuál es la razón? ¿Se dirigen RSC prácticas?</p>
        <p>¿Necesitan ayuda para ser más eficaces al hacer revisitas o desarrollar habilidades al conversar?</p>
        <p>¿Toman en serio el ministerio volviendo a visitar a los interesados?</p>
        <p>¿Se están usando apropiada y eficazmente las publicaciones en la predicación?</p>
      </div>
    {/if}
    <textarea bind:value={registro.territorio}></textarea>
  </div>

  <div class="modulo">
    <h3 class="modulo-titulo">4. DANDO LA DEBIDA ATENCIÓN AL TERRITORIO</h3>
    <button class="guia-toggle" on:click={() => guias.g4 = !guias.g4}>{guias.g4 ? 'OCULTAR' : 'VER PREGUNTAS'}</button>
    {#if guias.g4}<div class="guia-contenido"><p>¿Se predican de manera completa? ¿Se trabajan los NC antes de terminar un territorio? ¿Hay mapa grande actualizado?</p></div>{/if}
    <textarea bind:value={registro.atencionTerritorio}></textarea>
  </div>

  <div class="modulo">
    <h3 class="modulo-titulo">5. SERVICIO DE PRECURSOR REGULAR Y AUXILIAR</h3>
    <button class="guia-toggle" on:click={() => guias.g5 = !guias.g5}>{guias.g5 ? 'OCULTAR' : 'VER PREGUNTAS'}</button>
    {#if guias.g5}<div class="guia-contenido"><p>¿Actitud hacia el servicio? ¿Animan a quienes tienen potencial? ¿Los nombrados dan ejemplo?</p></div>{/if}
    <textarea bind:value={registro.precursoresMetas}></textarea>
  </div>

  <div class="modulo">
    <h3 class="modulo-titulo">6. REUNIONES DE CONGREGACIÓN</h3>
    <button class="guia-toggle" on:click={() => guias.g6 = !guias.g6}>{guias.g6 ? 'OCULTAR' : 'VER PREGUNTAS'}</button>
    {#if guias.g6}
      <div class="guia-contenido">
        <p>¿Retos para asistir presencialmente? ¿Causas de aumento o disminución notable?</p>
        <p>¿Medidas para ayudar a enfermos o mayores? ¿Calidad de discursos públicos?</p>
        <p>¿Capacitación de siervos ministeriales? ¿Participación de buena gana en comentarios?</p>
      </div>
    {/if}
    <textarea bind:value={registro.reuniones}></textarea>
  </div>

  <div class="modulo">
    <h3 class="modulo-titulo">7. PASTOREO</h3>
    <button class="guia-toggle" on:click={() => guias.g7 = !guias.g7}>{guias.g7 ? 'OCULTAR' : 'VER PREGUNTAS'}</button>
    {#if guias.g7}<div class="guia-contenido"><p>¿Visitas periódicas y eficaces? ¿Se benefician los hermanos? ¿Qué se hace por inactivos o expulsados?</p></div>{/if}
    <textarea bind:value={registro.pastoreo}></textarea>
  </div>

  <div class="modulo">
    <h3 class="modulo-titulo">8. CRECIMIENTO DE LA CONGREGACIÓN</h3>
    <button class="guia-toggle" on:click={() => guias.g8 = !guias.g8}>{guias.g8 ? 'OCULTAR' : 'VER PREGUNTAS'}</button>
    {#if guias.g8}<div class="guia-contenido"><p>¿Progreso de estudiantes? ¿Asisten a reuniones? ¿Uso eficaz de "Disfrute de la vida"? ¿Ayuda a maestros?</p></div>{/if}
    <textarea bind:value={registro.crecimiento}></textarea>
  </div>

  <div class="modulo">
    <h3 class="modulo-titulo">9. EL TRABAJO DEL SUPERINTENDENTE DE SERVICIO</h3>
    <button class="guia-toggle" on:click={() => guias.g9 = !guias.g9}>{guias.g9 ? 'OCULTAR' : 'VER PREGUNTAS'}</button>
    {#if guias.g9}<div class="guia-contenido"><p>¿Visita periódicamente los grupos? ¿Cómo realiza las visitas? ¿Colaboran los SG?</p></div>{/if}
    <textarea bind:value={registro.superServicio}></textarea>
  </div>

  <div class="modulo">
    <h3 class="modulo-titulo">10. PUBLICACIONES</h3>
    <button class="guia-toggle" on:click={() => guias.g10 = !guias.g10}>{guias.g10 ? 'OCULTAR' : 'VER PREGUNTAS'}</button>
    {#if guias.g10}<div class="guia-contenido"><p>¿Excedente de publicaciones? ¿Inventario mensual en JW Hub (S-28) correcto?</p></div>{/if}
    <textarea bind:value={registro.publicaciones}></textarea>
  </div>

  <div class="modulo">
    <h3 class="modulo-titulo">11. METAS Y PROGRESO ESPIRITUAL</h3>
    <button class="guia-toggle" on:click={() => guias.g11 = !guias.g11}>{guias.g11 ? 'OCULTAR' : 'VER PREGUNTAS'}</button>
    {#if guias.g11}<div class="guia-contenido"><p>¿Estudio personal y adoración en familia? ¿Metas de jóvenes? ¿Salud espiritual de matrimonios?</p></div>{/if}
    <textarea bind:value={registro.metas}></textarea>
  </div>

  <div class="modulo">
    <h3 class="modulo-titulo">12. EL CUERPO DE ANCIANOS Y SIERVOS</h3>
    <button class="guia-toggle" on:click={() => guias.g12 = !guias.g12}>{guias.g12 ? 'OCULTAR' : 'VER PREGUNTAS'}</button>
    {#if guias.g12}<div class="guia-contenido"><p>¿Llevan la delantera en predicación/pastoreo? ¿Unidad y paz en el CA? ¿Programa de capacitación?</p></div>{/if}
    <textarea bind:value={registro.cuerpoAncianos}></textarea>
  </div>

  <div class="modulo">
    <h3 class="modulo-titulo">13. EL LOCAL DE REUNIÓN</h3>
    <button class="guia-toggle" on:click={() => guias.g13 = !guias.g13}>{guias.g13 ? 'OCULTAR' : 'VER PREGUNTAS'}</button>
    {#if guias.g13}<div class="guia-contenido"><p>¿Limpieza y mantenimiento (LDC)? ¿Planes de seguridad? ¿Tablero de anuncios?</p></div>{/if}
    <textarea bind:value={registro.local}></textarea>
  </div>

  <div class="modulo">
    <h3 class="modulo-titulo">14. MISCELÁNEOS</h3>
    <button class="guia-toggle" on:click={() => guias.g14 = !guias.g14}>{guias.g14 ? 'OCULTAR' : 'VER PREGUNTAS'}</button>
    {#if guias.g14}<div class="guia-contenido"><p>Efecto de cambios en vestimenta/barba y atención a pecados graves.</p></div>{/if}
    <textarea bind:value={registro.miscelaneos}></textarea>
  </div>

  <div class="modulo">
    <h3 class="modulo-titulo">15. IRREGULARES E INACTIVOS</h3>
    <button class="guia-toggle" on:click={() => guias.g15 = !guias.g15}>{guias.g15 ? 'OCULTAR' : 'VER PREGUNTAS'}</button>
    {#if guias.g15}<div class="guia-contenido"><p>Nombres, razones y planes de ayuda específica.</p></div>{/if}
    <textarea bind:value={registro.irregulares}></textarea>
  </div>

  <div class="modulo">
    <h3 class="modulo-titulo">16. HERMANOS CON POTENCIAL</h3>
    <button class="guia-toggle" on:click={() => guias.g16 = !guias.g16}>{guias.g16 ? 'OCULTAR' : 'VER PREGUNTAS'}</button>
    {#if guias.g16}<div class="guia-contenido"><p>Hermanos para siervos/ancianos. Hermanas para precursoras.</p></div>{/if}
    <textarea bind:value={registro.potencial}></textarea>
  </div>

  <div class="modulo">
    <h3 class="modulo-titulo">17. PRECURSORES (ACTIVIDAD)</h3>
    <button class="guia-toggle" on:click={() => guias.g17 = !guias.g17}>{guias.g17 ? 'OCULTAR' : 'VER PREGUNTAS'}</button>
    {#if guias.g17}
      <div class="guia-contenido">
        <p>¿Horario práctico? ¿Todas las facetas? ¿Cursos bíblicos? ¿Apoyo de ancianos?</p>
        <p>¿Asistencia a reuniones de servicio? ¿Salen solo entre ellos?</p>
      </div>
    {/if}
    <textarea bind:value={registro.analisisPrecursores}></textarea>
  </div>

  <div class="modulo">
    <h3 class="modulo-titulo">18. CONTABILIDAD</h3>
    <button class="guia-toggle" on:click={() => guias.g18 = !guias.g18}>{guias.g18 ? 'OCULTAR' : 'VER PREGUNTAS'}</button>
    {#if guias.g18}<div class="guia-contenido"><p>¿Archivos revisados? ¿Uso correcto de contabilidad en línea?</p></div>{/if}
    <textarea bind:value={registro.contabilidad}></textarea>
  </div>

  <div class="modulo">
    <h3 class="modulo-titulo">19. SEGUIMIENTO</h3>
    <button class="guia-toggle" on:click={() => guias.g19 = !guias.g19}>{guias.g19 ? 'OCULTAR' : 'VER PREGUNTAS'}</button>
    {#if guias.g19}<div class="guia-contenido"><p>Asuntos antes de la próxima visita o para la sucursal.</p></div>{/if}
    <textarea bind:value={registro.seguimiento}></textarea>
  </div>
</div>

<style>
  .contenedor-analisis { padding: 20px; font-family: system-ui; background: #fff; }
  .cabecera-principal { 
    display: flex; 
    justify-content: space-between; 
    align-items: center; 
    border-bottom: 3px solid #3498db; 
    margin-bottom: 25px; 
    padding-bottom: 10px; 
  }
  .grupo-acciones { display: flex; gap: 8px; }
  button { 
    cursor: pointer; 
    font-weight: bold; 
    border-radius: 6px; 
    border: none; 
    padding: 10px 14px; 
    display: flex; 
    align-items: center; 
    gap: 6px; 
    transition: all 0.2s ease;
  }
  button:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  .btn-rojo { 
    background-color: #e11d48; 
    color: white; 
  }
  .btn-rojo:hover {
    background-color: #be123c;
  }
  .btn-gris { 
    background-color: #64748b; 
    color: white; 
  }
  .btn-gris:hover {
    background-color: #475569;
  }
  .btn-azul { 
    background-color: #2563eb; 
    color: white; 
  }
  .btn-azul:hover {
    background-color: #1d4ed8;
  }
  .modulo { 
    background: #fcfcfc; 
    border: 1px solid #e2e8f0; 
    border-radius: 10px; 
    padding: 18px; 
    margin-bottom: 20px; 
    box-shadow: 0 2px 4px rgba(0,0,0,0.05); 
  }
  .modulo-titulo { 
    font-size: 0.9rem; 
    color: #111; 
    margin-bottom: 8px; 
    font-weight: 800; 
  }
  .guia-toggle { 
    background: #fef2f2; 
    color: #b91c1c; 
    font-size: 0.7rem; 
    padding: 4px 8px; 
    margin-bottom: 8px; 
    border-radius: 4px;
  }
  .guia-contenido { 
    background: #fff1f2; 
    border-left: 4px solid #e11d48; 
    padding: 12px; 
    margin-bottom: 10px; 
    font-size: 0.85rem; 
    border-radius: 0 4px 4px 0; 
  }
  .guia-contenido p { margin: 4px 0; }
  .guia-contenido p::before { content: "• "; color: #e11d48; font-weight: bold; }
  textarea { 
    width: 100%; 
    min-height: 100px; 
    border-radius: 6px; 
    border: 1.5px solid #cbd5e1; 
    padding: 10px; 
    resize: vertical; 
    font-family: inherit; 
  }
  .fecha-seccion { 
    margin-bottom: 20px; 
    display: flex; 
    align-items: center; 
    gap: 10px; 
    background: #f8fafc; 
    padding: 10px; 
    border-radius: 6px; 
  }
</style>