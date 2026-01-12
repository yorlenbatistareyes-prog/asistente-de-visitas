<script lang="ts">
  import { Calendar, FileText, Table } from "lucide-svelte";
  import { observacionesStore, guardarDatos } from '$lib/persistencia';
  import { jsPDF } from "jspdf";
  import autoTable from "jspdf-autotable";
  import Papa from "papaparse";
  import { save } from "@tauri-apps/plugin-dialog";
  import { writeFile, writeTextFile } from "@tauri-apps/plugin-fs";
  import { fechaPorCongregacion } from '$lib/stores/appStore';
  import { resumenUltimoAnalisis } from '$lib/stores/appStore';


  export let nombreCongregacion: string;
  

  interface RegistroCongregacion {
    fechaVisita: string;
    opinionGeneral: string;

    ministerioAnalisis: string;
    ministerioDias: string[];
    territorioAnalisis: string;
    precursorAnalisis: string;

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
    fechaVisita: "",
    opinionGeneral: "",
    ministerioAnalisis: "",
    ministerioDias: [],
    territorioAnalisis: "",
    precursorAnalisis: "",
    ministerio: "",
    territorio: "",
    atencionTerritorio: "",
    precursoresMetas: "",
    reuniones: "",
    pastoreo: "",
    crecimiento: "",
    superServicio: "",
    publicaciones: "",
    metas: "",
    cuerpoAncianos: "",
    local: "",
    miscelaneos: "",
    irregulares: "",
    potencial: "",
    analisisPrecursores: "",
    contabilidad: "",
    seguimiento: ""
  };

  // Construimos el registro a partir de los valores por defecto + lo guardado en el store
  $: registro = {
    ...valoresPorDefecto,
    ...($observacionesStore[nombreCongregacion] || {})
  };

  function actualizarResumen() {
  const resumen = construirResumenPlano(registro);

  resumenUltimoAnalisis.update((r: Record<string, string>) => ({
    ...r,
    [nombreCongregacion]: resumen
  }));
}

  function construirResumenPlano(registro: RegistroCongregacion): string {
  return `
FECHA DE VISITA:
${registro.fechaVisita || ""}

1. OPINIÓN DE LOS ANCIANOS
${registro.opinionGeneral || ""}

2. MINISTERIO CRISTIANO
${registro.ministerio || ""}
- Análisis Ministerio:
${registro.ministerioAnalisis || ""}
- Días:
${(registro.ministerioDias || []).join(", ") || ""}

3. CASA EN CASA
${registro.territorio || ""}
- Análisis Territorio:
${registro.territorioAnalisis || ""}

4. ATENCIÓN AL TERRITORIO
${registro.atencionTerritorio || ""}

5. SERVICIO DE PRECURSOR
${registro.precursoresMetas || ""}
- Análisis Precursores:
${registro.precursorAnalisis || ""}

6. REUNIONES
${registro.reuniones || ""}

7. PASTOREO
${registro.pastoreo || ""}

8. CRECIMIENTO
${registro.crecimiento || ""}

9. SUPERINTENDENTE DE SERVICIO
${registro.superServicio || ""}

10. PUBLICACIONES
${registro.publicaciones || ""}

11. METAS ESPIRITUALES
${registro.metas || ""}

12. CUERPO DE ANCIANOS
${registro.cuerpoAncianos || ""}

13. LOCAL
${registro.local || ""}

14. MISCELÁNEOS
${registro.miscelaneos || ""}

15. IRREGULARES
${registro.irregulares || ""}

16. POTENCIAL
${registro.potencial || ""}

17. ACTIVIDAD PRECURSORES
${registro.analisisPrecursores || ""}

18. CONTABILIDAD
${registro.contabilidad || ""}

19. SEGUIMIENTO
${registro.seguimiento || ""}
`.trim();
}

  async function guardarModulo() {
  if (!nombreCongregacion) return;

  const copiaActualizada = { ...$observacionesStore };
  copiaActualizada[nombreCongregacion] = { ...registro };

  try {
    console.log("💾 Guardando datos para:", nombreCongregacion);
    console.log("📦 Registro completo:", registro);
    
    // Guardar todo el registro (incluyendo fechaVisita) en el JSON
    await guardarDatos(copiaActualizada);
    
    const resumen = construirResumenPlano(registro);
    console.log("📄 Resumen generado (primeros 200 chars):", resumen.substring(0, 200));
    console.log("📏 Longitud del resumen:", resumen.length);

    resumenUltimoAnalisis.update(r => ({
       ...r,
       [nombreCongregacion]: resumen
    }));
    
    console.log("✅ Resumen actualizado en el store");

    // Sincronizar la fecha con el store usado por el Dashboard/historial
    fechaPorCongregacion.update((f) => {
      return {
        ...f,
        [nombreCongregacion]: registro.fechaVisita
      };
    });
    
    console.log("✅ Guardado completado exitosamente");
  } catch (error) {
    console.error("❌ Error al guardar:", error);
  }
}
  
  // AGREGAR JUSTO DESPUÉS DE LA FUNCIÓN guardarModulo()

// ⭐ LLAMAR actualizarResumen automáticamente cuando cambien los datos
$: {
  if (registro && nombreCongregacion) {
    console.log("🔄 Detectado cambio en registro, actualizando resumen...");
    actualizarResumen();
  }
}

  async function generarPDF() {
    try {
      console.log("=== INICIANDO GENERACIÓN DE PDF ===");
      
      const doc = new jsPDF();
      
      // Encabezado
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(`Análisis: ${nombreCongregacion}`, 14, 20);
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Fecha: ${registro.fechaVisita || 'No especificada'}`, 14, 28);
      
      // Preparar TODOS los datos
      const filas = [
        ["1. OPINIÓN DE LOS ANCIANOS", registro.opinionGeneral || ""],
        ["2. MINISTERIO CRISTIANO", registro.ministerio || ""],
        ["   - Análisis Ministerio", registro.ministerioAnalisis || ""],
        ["   - Días", (registro.ministerioDias || []).join(", ") || ""],
        ["3. CASA EN CASA", registro.territorio || ""],
        ["   - Análisis Territorio", registro.territorioAnalisis || ""],
        ["4. ATENCIÓN AL TERRITORIO", registro.atencionTerritorio || ""],
        ["5. SERVICIO DE PRECURSOR", registro.precursoresMetas || ""],
        ["   - Análisis Precursor", registro.precursorAnalisis || ""],
        ["6. REUNIONES", registro.reuniones || ""],
        ["7. PASTOREO", registro.pastoreo || ""],
        ["8. CRECIMIENTO", registro.crecimiento || ""],
        ["9. SUPERINTENDENTE DE SERVICIO", registro.superServicio || ""],
        ["10. PUBLICACIONES", registro.publicaciones || ""],
        ["11. METAS ESPIRITUALES", registro.metas || ""],
        ["12. CUERPO DE ANCIANOS", registro.cuerpoAncianos || ""],
        ["13. LOCAL", registro.local || ""],
        ["14. MISCELÁNEOS", registro.miscelaneos || ""],
        ["15. IRREGULARES", registro.irregulares || ""],
        ["16. POTENCIAL", registro.potencial || ""],
        ["17. ACTIVIDAD PRECURSORES", registro.analisisPrecursores || ""],
        ["18. CONTABILIDAD", registro.contabilidad || ""],
        ["19. SEGUIMIENTO", registro.seguimiento || ""]
      ];

      // Crear tabla simple
      autoTable(doc, {
        startY: 35,
        head: [['Módulo', 'Observaciones']],
        body: filas,
        theme: 'striped',
        headStyles: { 
          fillColor: [41, 128, 185],
          fontSize: 12,
          fontStyle: 'bold'
        },
        styles: { 
          fontSize: 10,
          cellPadding: 5
        },
        columnStyles: {
          0: { cellWidth: 60, fontStyle: 'bold' as const },
          1: { cellWidth: 'auto' as const }
        }
      });

      console.log("PDF generado");

      // Guardar
      const pdfOutput = doc.output('arraybuffer');
      const uint8Array = new Uint8Array(pdfOutput);

      const nombreSeguro = nombreCongregacion
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9\s]/g, "_")
        .replace(/\s+/g, "_");

      const filePath = await save({
        filters: [{ name: "PDF", extensions: ["pdf"] }],
        defaultPath: `Analisis_${nombreSeguro}.pdf`
      });

     	if (!filePath) {
        alert("Guardado cancelado");
        return;
      }

      await writeFile(filePath, uint8Array);
      alert(`✓ PDF guardado en:\n${filePath}`);

    } catch (err) {
      console.error("Error:", err);
      const error = err as Error;
      alert("❌ Error: " + (error?.message || "Error desconocido"));
    }
  }

  async function generarCSV() {
    try {
      console.log("=== INICIANDO GENERACIÓN DE CSV ===");
      console.log("Congregación:", nombreCongregacion);

      // Preparar datos
      const datosCSV = {
        Congregacion: nombreCongregacion,
        Fecha: registro.fechaVisita || "",
        OpinionAncianos: registro.opinionGeneral || "",
        MinisterioAnalisis: registro.ministerioAnalisis || "",
        MinisterioDias: (registro.ministerioDias || []).join("; "),
        TerritorioAnalisis: registro.territorioAnalisis || "",
        PrecursorAnalisis: registro.precursorAnalisis || "",
        Ministerio: registro.ministerio || "",
        CasaEnCasa: registro.territorio || "",
        AtencionTerritorio: registro.atencionTerritorio || "",
        MetasPrecursores: registro.precursoresMetas || "",
        Reuniones: registro.reuniones || "",
        Pastoreo: registro.pastoreo || "",
        Crecimiento: registro.crecimiento || "",
        SuperServicio: registro.superServicio || "",
        Publicaciones: registro.publicaciones || "",
        Metas: registro.metas || "",
        CuerpoAncianos: registro.cuerpoAncianos || "",
        Local: registro.local || "",
        Miscelaneos: registro.miscelaneos || "",
        Irregulares: registro.irregulares || "",
        Potencial: registro.potencial || "",
        AnalisisPrecursores: registro.analisisPrecursores || "",
        Contabilidad: registro.contabilidad || "",
        Seguimiento: registro.seguimiento || ""
      };

      // Generar CSV
      const csv = Papa.unparse([datosCSV], {
        quotes: true,
        delimiter: ",",
        header: true
      });

      console.log("CSV generado, tamaño:", csv.length, "caracteres");

      // Nombre seguro
      const nombreSeguro = nombreCongregacion
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9\s]/g, "_")
        .replace(/\s+/g, "_");

      console.log("Abriendo diálogo de guardado...");

      // Abrir diálogo
      const filePath = await save({
        filters: [{ 
          name: "CSV", 
          extensions: ["csv"] 
        }],
        defaultPath: `Analisis_${nombreSeguro}.csv`
      });

      if (!filePath) {
        console.log("Usuario canceló");
        alert("Guardado cancelado");
        return;
      }

      console.log("Ruta seleccionada:", filePath);
      console.log("Escribiendo archivo...");

      // Escribir archivo
      await writeTextFile(filePath, csv);

      console.log("=== CSV GUARDADO EXITOSAMENTE ===");
      alert(`✓ Archivo CSV guardado en:\n${filePath}`);

    } catch (err) {
      console.error("=== ERROR AL GUARDAR CSV ===");
      console.error("Error completo:", err);
      
      const error = err as Error;
      const mensajeError = error?.message || "Error desconocido";
      alert("❌ Error al guardar CSV:\n" + mensajeError + "\n\nRevisa la consola (F12) para más detalles");
    }
  }

  let mostrarGuiaOpinion = false, mostrarGuiaMinisterio = false, mostrarGuiaTerritorio = false,
      mostrarGuiaAtencionTerritorio = false, mostrarGuiaPrecursoresMetas = false, mostrarGuiaReuniones = false,
      mostrarGuiaPastoreo = false, mostrarGuiaCrecimiento = false, mostrarGuiaSuperServicio = false,
      mostrarGuiaPublicaciones = false, mostrarGuiaMetas = false, mostrarGuiaCuerpoAncianos = false,
      mostrarGuiaLocal = false, mostrarGuiaMiscelaneos = false, mostrarGuiaIrregulares = false,
      mostrarGuiaPotencial = false, mostrarGuiaAnalisisPrecursores = false, mostrarGuiaContabilidad = false,
      mostrarGuiaSeguimiento = false;
</script>

<div class="contenedor-analisis">
  <div class="cabecera-principal">
    <h2>Análisis de la congregación: {nombreCongregacion}</h2>
    
    <div class="grupo-acciones">
      <button class="btn-exportar pdf" on:click={generarPDF}>
        <FileText size={18} /> Guardar Informe PDF
      </button>
      <button class="btn-exportar csv" on:click={generarCSV}>
        <Table size={18} /> Exportar Excel (CSV)
      </button>
    </div>
  </div>
  
  <div class="fecha-seccion">
    <div class="fecha-fila">
      <label for="fechaVisita" class="fecha-label">Fecha de la visita</label>
      <div class="fecha-input-box">
        <input
          type="date"
          id="fechaVisita"
          bind:value={registro.fechaVisita}
          on:blur={guardarModulo}
        />
      </div>
    </div>
  </div>
  
  <div class="modulo">
    <h2 class="modulo-titulo">1. OPINIÓN DE LOS ANCIANOS</h2>
    <button class="guia-toggle" on:click={() => mostrarGuiaOpinion = !mostrarGuiaOpinion}>
      {mostrarGuiaOpinion ? 'OCULTAR PREGUNTAS ▲' : 'VER PREGUNTAS ▼'}
    </button>
    {#if mostrarGuiaOpinion}
      <div class="guia-contenido">
        <p><strong>Aspectos positivos que observan</strong></p>
        <p><strong>Necesidades que les preocupan</strong></p>
      </div>
    {/if}
    <textarea bind:value={registro.opinionGeneral} on:blur={guardarModulo} placeholder="Escriba aquí las observaciones de los ancianos…"></textarea>
  </div>

  <div class="modulo">
    <h2 class="modulo-titulo">2. MINISTERIO CRISTIANO</h2>
    <button class="guia-toggle" on:click={() => mostrarGuiaMinisterio = !mostrarGuiaMinisterio}>
      {mostrarGuiaMinisterio ? 'OCULTAR PREGUNTAS ▲' : 'VER PREGUNTAS ▼'}
    </button>
    {#if mostrarGuiaMinisterio}
      <div class="guia-contenido">
        <p>¿En qué aspectos del ministerio están teniendo buenos resultados, y en cuáles necesitan mejoras?</p>
        <p>¿Participan los publicadores en diferentes facetas de la predicación?</p>
        <p>¿Tienen planes la congregación para participar en otras formas de predicación? [En las calles, los negocios, por teléfono, etc.]</p>
        <p><strong>Sobre los cursos bíblicos:</strong></p>
        <p>¿El CA ha analizado cómo lograr que la congregación dirija más cursos bíblicos?</p>
        <p>¿Los publicadores ofrecen cursos bíblicos en toda ocasión apropiada, y de manera directa cuando es oportuno?</p>
        <p>¿Están los ancianos y siervos ministeriales dando un buen ejemplo de entusiasmo siendo los primeros en ofrecerlos?</p>
        <p>¿Están los SG brindando ayuda personal y estímulo a quiénes lo necesitan?</p>
      </div>
    {/if}
    <textarea bind:value={registro.ministerio} on:blur={guardarModulo} placeholder="Escriba aquí..."></textarea>
  </div>

  <div class="modulo">
    <h2 class="modulo-titulo">3. SOBRE LA PREDICACIÓN DE CASA EN CASA</h2>
    <button class="guia-toggle" on:click={() => mostrarGuiaTerritorio = !mostrarGuiaTerritorio}>
      {mostrarGuiaTerritorio ? 'OCULTAR PREGUNTAS ▲' : 'VER PREGUNTAS ▼'}
    </button>
    {#if mostrarGuiaTerritorio}
      <div class="guia-contenido">
        <p>¿Está la congregación dando prioridad a la predicación de casa en casa? (S-147-24.04; Anuncio-2024 03 31-S_Cu (SV))</p>
        <p>¿Qué actitud están manifestando los publicadores? ¿Son entusiastas y positivos, o manifiestan actitud negativa o temor?</p>
        <p>¿Se realiza la predicación de casa en casa en horas en que es más probable encontrar a la gente?</p>
        <p>¿Apoyan los publicadores regularmente las RSC? ¿Los nombrados y los precursores están llevando la delantera?</p>
        <p>Si algunos no salen a predicar con la congregación, ¿cuál es la razón? ¿Se dirigen RSC prácticas y bien preparadas? [Km 3/15 4 párrs. 4-7]</p>
        <p>¿Necesitan los publicadores ayuda para ser más eficaces al hacer revisitas, desarrollar habilidades al conversar, o en el uso de las herramientas disponibles?</p>
        <p>¿Toman en serio el ministerio los hermanos volviendo a visitar a los que muestran interés en la verdad?</p>
        <p>¿Se están usando apropiadamente y eficaz las publicaciones en la predicación?</p>
      </div>
    {/if}
    <textarea bind:value={registro.territorio} on:blur={guardarModulo} placeholder="Escriba aquí..."></textarea>
  </div>

  <div class="modulo">
    <h2 class="modulo-titulo">4. DANDO LA DEBIDA ATENCIÓN AL TERRITORIO (Romanos 15:23 a)</h2>
    <button class="guia-toggle" on:click={() => mostrarGuiaAtencionTerritorio = !mostrarGuiaAtencionTerritorio}>
      {mostrarGuiaAtencionTerritorio ? 'OCULTAR PREGUNTAS ▲' : 'VER PREGUNTAS ▼'}
    </button>
    {#if mostrarGuiaAtencionTerritorio}
      <div class="guia-contenido">
        <p>¿Se están predicando los territorios de manera completa? (Frecuencia y cabalidad)</p>
        <p>¿Se están trabajando los NC antes de dar por terminado un territorio?</p>
        <p>¿Tiene la congregación un mapa grande de toda la zona, con los límites y los números de los territorios individuales claramente marcados? (sfg-S 3)</p>
      </div>
    {/if}
    <textarea bind:value={registro.atencionTerritorio} on:blur={guardarModulo} placeholder="Escriba aquí..."></textarea>
  </div>

  <div class="modulo">
    <h2 class="modulo-titulo">5. SOBRE EL SERVICIO DE PRECURSOR REGULAR Y AUXILIAR</h2>
    <button class="guia-toggle" on:click={() => mostrarGuiaPrecursoresMetas = !mostrarGuiaPrecursoresMetas}>
      {mostrarGuiaPrecursoresMetas ? 'OCULTAR PREGUNTAS ▲' : 'VER PREGUNTAS ▼'}
    </button>
    {#if mostrarGuiaPrecursoresMetas}
      <div class="guia-contenido">
        <p>¿Qué actitud manifiestan los hermanos respecto al servicio de precursor?</p>
        <p>¿Están animando a quiénes tienen potencial para que sirvan como precursores auxiliares o regulares?</p>
        <p>¿Los nombrados y sus familias están dando un buen ejemplo al respecto? (Heb. 13:17)</p>
      </div>
    {/if}
    <textarea bind:value={registro.precursoresMetas} on:blur={guardarModulo} placeholder="Escriba aquí..."></textarea>
  </div>

  <div class="modulo">
    <h2 class="modulo-titulo">6. REUNIONES DE CONGREGACIÓN</h2>
    <button class="guia-toggle" on:click={() => mostrarGuiaReuniones = !mostrarGuiaReuniones}>
      {mostrarGuiaReuniones ? 'OCULTAR PREGUNTAS ▲' : 'VER PREGUNTAS ▼'}
    </button>
    {#if mostrarGuiaReuniones}
      <div class="guia-contenido">
        <p>¿Qué retos están superando los hermanos para asistir a las reuniones presencialmente? (Trabajo, transporte, etc.)</p>
        <p>Si ha habido un aumento o disminución notable en la asistencia, ¿cuáles parecen ser las causas principales?</p>
        <p>¿Qué medidas ha tomado el CA para ayudar a los publicadores que no pueden asistir por razones de salud o edad avanzada?</p>
        <p>¿Se están presentando con calidad los discursos públicos? ¿Necesitan los oradores locales ayuda o sugerencias específicas para mejorar su oratoria o enseñanza?</p>
        <p>¿Están los ancianos capacitando a los siervos ministeriales para que aprendan a enseñar en público?</p>
        <p>¿Participan los hermanos de buena gana en las reuniones? ¿Se nota por sus comentarios que se han preparado bien?</p>
      </div>
    {/if}
    <textarea bind:value={registro.reuniones} on:blur={guardarModulo} placeholder="Escriba aquí..."></textarea>
  </div>

  <div class="modulo">
    <h2 class="modulo-titulo">7. PASTOREO</h2>
    <button class="guia-toggle" on:click={() => mostrarGuiaPastoreo = !mostrarGuiaPastoreo}>
      {mostrarGuiaPastoreo ? 'OCULTAR PREGUNTAS ▲' : 'VER PREGUNTAS ▼'}
    </button>
    {#if mostrarGuiaPastoreo}
      <div class="guia-contenido">
        <p>¿Reciben los publicadores visitas de pastoreo de manera periódica y eficaz?</p>
        <p>¿Se están beneficiando los hermanos de la labor de pastoreo? (Anuncio 2024-03-12-S_Cu (SV))</p>
        <p>¿Qué se está haciendo por los publicadores inactivos o por los que han sido expulsados? (Carta 2024-03-31-S_Cu (SV))</p>
      </div>
    {/if}
    <textarea bind:value={registro.pastoreo} on:blur={guardarModulo} placeholder="Escriba aquí..."></textarea>
  </div>

  <div class="modulo">
    <h2 class="modulo-titulo">8. CRECIMIENTO DE LA CONGREGACIÓN</h2>
    <button class="guia-toggle" on:click={() => mostrarGuiaCrecimiento = !mostrarGuiaCrecimiento}>
      {mostrarGuiaCrecimiento ? 'OCULTAR PREGUNTAS ▲' : 'VER PREGUNTAS ▼'}
    </button>
    {#if mostrarGuiaCrecimiento}
      <div class="guia-contenido">
        <p>¿Qué progreso espiritual están haciendo los estudiantes de la Biblia? ¿Hay estudiantes asistiendo a las reuniones?</p>
        <p>¿Se están usando eficazmente las herramientas de enseñanza, como el libro "Disfrute de la Vida"?</p>
        <p>¿Qué ayuda están brindando los ancianos a los maestros de la congregación?</p>
      </div>
    {/if}
    <textarea bind:value={registro.crecimiento} on:blur={guardarModulo} placeholder="Escriba aquí..."></textarea>
  </div>

  <div class="modulo">
    <h2 class="modulo-titulo">9. EL TRABAJO DEL SUPERINTENDENTE DE SERVICIO</h2>
    <button class="guia-toggle" on:click={() => mostrarGuiaSuperServicio = !mostrarGuiaSuperServicio}>
      {mostrarGuiaSuperServicio ? 'OCULTAR PREGUNTAS ▲' : 'VER PREGUNTAS ▼'}
    </button>
    {#if mostrarGuiaSuperServicio}
      <div class="guia-contenido">
        <p>¿Visita el superintendente de servicio periódicamente los grupos de servicio del campo? ¿Cómo realiza estas visitas?</p>
        <p>¿Están colaborando estrechamente los SG con él?</p>
      </div>
    {/if}
    <textarea bind:value={registro.superServicio} on:blur={guardarModulo} placeholder="Escriba aquí..."></textarea>
  </div>

  <div class="modulo">
    <h2 class="modulo-titulo">10. PUBLICACIONES</h2>
    <button class="guia-toggle" on:click={() => mostrarGuiaPublicaciones = !mostrarGuiaPublicaciones}>
      {mostrarGuiaPublicaciones ? 'OCULTAR PREGUNTAS ▲' : 'VER PREGUNTAS ▼'}
    </button>
    {#if mostrarGuiaPublicaciones}
      <div class="guia-contenido">
        <p>¿Hay un excedente de publicaciones? ¿Son los pedidos desproporcionados a las necesidades reales?</p>
        <p>¿Se realiza el inventario mensual en JW Hub de manera correcta (S-28)?</p>
      </div>
    {/if}
    <textarea bind:value={registro.publicaciones} on:blur={guardarModulo} placeholder="Escriba aquí..."></textarea>
  </div>

  <div class="modulo">
    <h2 class="modulo-titulo">11. METAS Y PROGRESO ESPIRITUAL</h2>
    <button class="guia-toggle" on:click={() => mostrarGuiaMetas = !mostrarGuiaMetas}>
      {mostrarGuiaMetas ? 'OCULTAR PREGUNTAS ▲' : 'VER PREGUNTAS ▼'}
    </button>
    {#if mostrarGuiaMetas}
      <div class="guia-contenido">
        <p>¿Qué hábitos de estudio personal y adoración en familia tienen los hermanos?</p>
        <p>¿Tienen metas espirituales los jóvenes y adolescentes de la congregación?</p>
        <p>¿Cómo es la salud espiritual de los matrimonios?</p>
      </div>
    {/if}
    <textarea bind:value={registro.metas} on:blur={guardarModulo} placeholder="Escriba aquí..."></textarea>
  </div>

  <div class="modulo">
    <h2 class="modulo-titulo">12. EL CUERPO DE ANCIANOS Y SIERVOS MINISTERIALES</h2>
    <button class="guia-toggle" on:click={() => mostrarGuiaCuerpoAncianos = !mostrarGuiaCuerpoAncianos}>
      {mostrarGuiaCuerpoAncianos ? 'OCULTAR PREGUNTAS ▲' : 'VER PREGUNTAS ▼'}
    </button>
    {#if mostrarGuiaCuerpoAncianos}
      <div class="guia-contenido">
        <p>¿Llevan los nombrados la delantera en la predicación y el pastoreo?</p>
        <p>¿Existe un buen ambiente de unidad, paz y confianza en el CA?</p>
        <p>¿Hay un programa de capacitación para que otros hermanos progresen y alcancen responsabilidades?</p>
      </div>
    {/if}
    <textarea bind:value={registro.cuerpoAncianos} on:blur={guardarModulo} placeholder="Escriba aquí..."></textarea>
  </div>

  <div class="modulo">
    <h2 class="modulo-titulo">13. EL LOCAL DE REUNIÓN</h2>
    <button class="guia-toggle" on:click={() => mostrarGuiaLocal = !mostrarGuiaLocal}>
      {mostrarGuiaLocal ? 'OCULTAR PREGUNTAS ▲' : 'VER PREGUNTAS ▼'}
    </button>
    {#if mostrarGuiaLocal}
      <div class="guia-contenido">
        <p>¿En qué estado de limpieza y mantenimiento se encuentra el Salón del Reino? ¿Se sigue el programa del LDC?</p>
        <p>¿Cuáles son los planes de seguridad de la congregación?</p>
        <p>¿Se mantiene actualizado el tablero de anuncios?</p>
      </div>
    {/if}
    <textarea bind:value={registro.local} on:blur={guardarModulo} placeholder="Escriba aquí..."></textarea>
  </div>

  <div class="modulo">
    <h2 class="modulo-titulo">14. MISCELÁNEOS (Vestimenta y arreglo, etc.)</h2>
    <button class="guia-toggle" on:click={() => mostrarGuiaMiscelaneos = !mostrarGuiaMiscelaneos}>
      {mostrarGuiaMiscelaneos ? 'OCULTAR PREGUNTAS ▲' : 'VER PREGUNTAS ▼'}
    </button>
    {#if mostrarGuiaMiscelaneos}
      <div class="guia-contenido">
        <p>¿Qué efecto han tenido los cambios recientes en la vestimenta, arreglo personal y el uso de la barba?</p>
        <p>¿Qué efecto han tenido los cambios en la manera de atender a los que cometen pecados graves?</p>
      </div>
    {/if}
    <textarea bind:value={registro.miscelaneos} on:blur={guardarModulo} placeholder="Escriba aquí..."></textarea>
  </div>

  <div class="modulo">
    <h2 class="modulo-titulo">15. IRREGULARES E INACTIVOS</h2>
    <button class="guia-toggle" on:click={() => mostrarGuiaIrregulares = !mostrarGuiaIrregulares}>
      {mostrarGuiaIrregulares ? 'OCULTAR PREGUNTAS ▲' : 'VER PREGUNTAS ▼'}
    </button>
    {#if mostrarGuiaIrregulares}
      <div class="guia-contenido">
        <p>Liste los nombres de los que son irregulares o inactivos. ¿Cuál es la razón en cada caso?</p>
        <p>¿Qué planes de ayuda específica se han hecho para ellos?</p>
      </div>
    {/if}
    <textarea bind:value={registro.irregulares} on:blur={guardarModulo} placeholder="Escriba aquí..."></textarea>
  </div>

  <div class="modulo">
    <h2 class="modulo-titulo">16. HERMANOS CON POTENCIAL</h2>
    <button class="guia-toggle" on:click={() => mostrarGuiaPotencial = !mostrarGuiaPotencial}>
      {mostrarGuiaPotencial ? 'OCULTAR PREGUNTAS ▲' : 'VER PREGUNTAS ▼'}
    </button>
    {#if mostrarGuiaPotencial}
      <div class="guia-contenido">
        <p>Mencione a los hermanos que tengan potencial para servir como siervos ministeriales o ancianos.</p>
        <p>Mencione a las hermanas que tengan potencial para servir como precursoras regulares.</p>
      </div>
    {/if}
    <textarea bind:value={registro.potencial} on:blur={guardarModulo} placeholder="Escriba aquí..."></textarea>
  </div>

  <div class="modulo">
    <h2 class="modulo-titulo">17. PRECURSORES (Análisis sobre su actividad)</h2>
    <button class="guia-toggle" on:click={() => mostrarGuiaAnalisisPrecursores = !mostrarGuiaAnalisisPrecursores}>
      {mostrarGuiaAnalisisPrecursores ? 'OCULTAR PREGUNTAS ▲' : 'VER PREGUNTAS ▼'}
    </button>
    {#if mostrarGuiaAnalisisPrecursores}
      <div class="guia-contenido">
        <p>¿Cómo marcha el año de servicio? ¿Tienen un horario práctico?</p>
        <p>¿Están participando en todas las facetas de servicio? ¿Dirigen regularmente los cursos bíblicos?</p>
        <p>¿Están utilizando las publicaciones recomendadas y siguiendo las últimas sugerencias?</p>
        <p>¿Reciben estímulo y apoyo por parte de los ancianos de la congregación?</p>
        <p>¿Están asistiendo a las reuniones para el servicio del campo? Si no, ¿por qué?</p>
        <p>¿Tienden a salir precursor con precursor? ¿Por qué? ¿Están animando a otros?</p>
      </div>
    {/if}
    <textarea bind:value={registro.analisisPrecursores} on:blur={guardarModulo} placeholder="Escriba aquí el análisis de actividad..."></textarea>
  </div>

  <div class="modulo">
    <h2 class="modulo-titulo">18. CONTABILIDAD</h2>
    <button class="guia-toggle" on:click={() => mostrarGuiaContabilidad = !mostrarGuiaContabilidad}>
      {mostrarGuiaContabilidad ? 'OCULTAR PREGUNTAS ▲' : 'VER PREGUNTAS ▼'}
    </button>
    {#if mostrarGuiaContabilidad}
      <div class="guia-contenido">
        <p>¿Se han revisado los archivos de contabilidad?</p>
        <p>¿Está la congregación usando correctamente la función de contabilidad en línea?</p>
      </div>
    {/if}
    <textarea bind:value={registro.contabilidad} on:blur={guardarModulo} placeholder="Escriba aquí..."></textarea>
  </div>

  <div class="modulo">
    <h2 class="modulo-titulo">19. ASUNTOS PARA DARLE SEGUIMIENTO</h2>
    <button class="guia-toggle" on:click={() => mostrarGuiaSeguimiento = !mostrarGuiaSeguimiento}>
      {mostrarGuiaSeguimiento ? 'OCULTAR PREGUNTAS ▲' : 'VER PREGUNTAS ▼'}
    </button>
    {#if mostrarGuiaSeguimiento}
      <div class="guia-contenido">
        <p>Anote aquí cualquier asunto que requiera atención antes de la próxima visita o que deba informarse a la sucursal.</p>
      </div>
    {/if}
    <textarea bind:value={registro.seguimiento} on:blur={guardarModulo} placeholder="Escriba aquí..."></textarea>
  </div>
</div>

<style>
  .contenedor-analisis {
    padding: 20px;
  }

  /* Cabecera y Botones de Exportación */
  .cabecera-principal {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 25px;
    padding-bottom: 10px;
    border-bottom: 2px solid #3498db;
  }

  .grupo-acciones {
    display: flex;
    gap: 12px;
  }

  .btn-exportar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 18px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
    transition: background 0.2s;
  }

  .btn-exportar.pdf { background-color: #e74c3c; color: white; }
  .btn-exportar.pdf:hover { background-color: #c0392b; }
  .btn-exportar.csv { background-color: #27ae60; color: white; }
  .btn-exportar.csv:hover { background-color: #1e8449; }

  /* Sección de Fecha */
  .fecha-seccion {
    margin: 20px 0 30px 0;
    width: 100%;
    display: flex;
    justify-content: flex-start;
  }

  .fecha-fila {
    display: flex;
    align-items: center;
    gap: 15px;
    background: #f8f9fa;
    padding: 15px;
    border-radius: 8px;
    border: 1px solid #dee2e6;
  }

  .fecha-label {
    font-size: 16px;
    font-weight: 700;
    color: #1e293b;
    white-space: nowrap;
  }

  .fecha-input-box {
    position: relative;
    width: 220px;
    display: flex;
    align-items: center;
  }

  .fecha-input-box input[type="date"] {
    width: 100%;
    padding: 10px 15px;
    font-size: 15px;
    font-weight: 600;
    font-family: inherit;
    border: 1.5px solid #e2e8f0;
    border-radius: 10px;
    background: #ffffff;
    color: #334155;
    outline: none;
    transition: all 0.2s ease;
    cursor: pointer;
  }

  .fecha-input-box input:focus {
    border-color: #e11d48;
    box-shadow: 0 0 0 3px rgba(225, 29, 72, 0.08);
  }

  /* Módulos de Análisis */
  .modulo {
    border: 1px solid #ddd;
    border-radius: 10px;
    padding: 16px;
    margin-bottom: 24px;
    background: #fff;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  }

  .modulo-titulo {
    font-size: 16px;
    font-weight: bold;
    margin-bottom: 10px;
    color: #111827;
  }

  .guia-toggle {
    background-color: #fef2f2;
    color: #b91c1c;
    border: 1px solid #fca5a5;
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 14px;
    cursor: pointer;
    margin-bottom: 12px;
    transition: background-color 0.2s ease;
  }

  .guia-toggle:hover {
    background-color: #fde8e8;
  }

  /* Guía de Preguntas (Estilo unificado) */
  .guia-contenido {
    background-color: #fff1f2;
    border-left: 4px solid #e11d48;
    padding: 15px 20px;
    margin-bottom: 16px;
    border-radius: 8px;
    font-size: 14px;
    color: #4c0519;
    line-height: 1.6;
    box-shadow: inset 0 0 10px rgba(225, 29, 72, 0.03);
  }

  .guia-contenido p {
    margin: 8px 0;
    position: relative;
    padding-left: 15px;
  }

  .guia-contenido p::before {
    content: "•";
    position: absolute;
    left: 0;
    color: #e11d48;
    font-weight: bold;
  }

  /* Área de Texto */
  textarea {
    width: 100%;
    min-height: 100px;
    padding: 12px;
    border-radius: 8px;
    border: 1px solid #ccc;
    font-size: 14px;
    resize: vertical;
    margin-top: 6px;
    font-family: inherit;
    transition: border-color 0.2s;
  }

  textarea:focus {
    border-color: #3498db;
    outline: none;
  }

  /* Limpieza del icono nativo para la fecha */
  input::-webkit-calendar-picker-indicator {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
  }
</style>