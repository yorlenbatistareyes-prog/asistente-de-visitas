<script lang="ts">
  import { 
    MapPin, ChevronRight, Plus, FileText, Folder, ListChecks, 
    Settings, Pencil, Trash2, ArrowLeft, Save, ClipboardList,
    History, Clock, Download,
  } from "lucide-svelte";
  import NuevaCongregacionModal from "../modals/NuevaCongregacionModal.svelte";

  // 1. IMPORTACIONES DE ESTADO Y COMPONENTES
  import { onMount } from 'svelte';
  import { listaCongregaciones, fechaPorCongregacion } from '$lib/stores/appStore';
  import AnalisisCongregacion from '$lib/components/AnalisisCongregacion.svelte';
  import { resumenUltimoAnalisis } from '$lib/stores/appStore';
  // TAURI PLUGINS
  import { LazyStore } from '@tauri-apps/plugin-store';
  
  import jsPDF from "jspdf";
  import { save } from "@tauri-apps/plugin-dialog";
  import { writeFile } from "@tauri-apps/plugin-fs";
  
  // --- INTERFACES ---
  interface Congregacion { 
    nombre: string; 
    enVisita: boolean; 
    ciudad?: string;
    provincia?: string;
    pais?: string;
    idioma?: string;
    esLenguaSenas?: boolean;
    telefono?: string;
    horaSemana?: string;
    horaFinSemana?: string;
    diaSemana?: string;
    diaFinSemana?: string;
  }

  interface VisitaHistorial {
    id: number;
    fecha: string;
    tipo: string;
    completado: boolean;
    contenido?: string; 
  }

  // --- VARIABLES DE ESTADO ---
  export let circuitoNombre: string = "Holguín-14";
  let seleccionado = "AEROPUERTO";
  let vistaActual: "dashboard" | "informes" = "dashboard";
  let viendoFormulario = false; 
  let mostrarHistorial = false;
  
  let observacionesPorCongregacion: Record<string, string> = {}; 
  let historialSesion: Record<string, VisitaHistorial[]> = {};
  let historialVisitas: VisitaHistorial[] = [];

  let datos: Record<string, Congregacion[]> = {
    "Holguín-14": [
      { nombre: "AEROPUERTO", enVisita: true }, 
      { nombre: "CACOCUM", enVisita: false }
    ]
  };

  const store = new LazyStore('datos_asistente.json');

  // --- PERSISTENCIA ---
  async function persistirDatos() {
    try {
      await store.set('observaciones', observacionesPorCongregacion);
      await store.set('historial_sesion', historialSesion);
      await store.set('datos_congregaciones', datos); 
      await store.save();
    } catch (err) {
      console.error("Error al guardar en disco:", err);
    }
  }

  async function cargarDatosGuardados() {
    try {
      const obsGuardadas = await store.get<Record<string, string>>('observaciones');
      const histGuardado = await store.get<Record<string, VisitaHistorial[]>>('historial_sesion');
      const datosGuardados = await store.get<Record<string, Congregacion[]>>('datos_congregaciones');

      if (obsGuardadas) observacionesPorCongregacion = obsGuardadas;
      if (histGuardado) historialSesion = histGuardado;
      if (datosGuardados) datos = datosGuardados;

      const listaActual = datos[circuitoNombre] || [];
      if (!listaActual.find(c => c.nombre === seleccionado) && listaActual.length > 0) {
          seleccionado = listaActual[0].nombre;
      }
      cargarHistorialReal();
    } catch (err) {
      console.log("Iniciando con datos por defecto.");
    }
  }

  onMount(cargarDatosGuardados);

  // --- ACCIONES DE CONGREGACIÓN ---
  function abrirModal() { datosEdicion = null; mostrarModal = true; }

  function editarCongregacion() {
    const actual = lista.find(c => c.nombre === seleccionado);
    if (!actual) return;
    datosEdicion = { ...actual };
    mostrarModal = true;
    mostrarMenuConfig = false;
  }

  async function eliminarCongregacion() {
    if(!confirm(`¿Eliminar la congregación ${seleccionado} y todos sus datos?`)) return;
    datos[circuitoNombre] = datos[circuitoNombre].filter(c => c.nombre !== seleccionado);
    seleccionado = datos[circuitoNombre][0]?.nombre || "";
    await persistirDatos();
    mostrarMenuConfig = false;
  }

  async function seleccionarCongregacion(nombre: string) {
    seleccionado = nombre;
    if (!historialSesion[nombre]) historialSesion[nombre] = [];
    if (!(nombre in observacionesPorCongregacion)) observacionesPorCongregacion[nombre] = "";
    cargarHistorialReal();
    mostrarMenuConfig = false;
  }

  // --- LÓGICA DE HISTORIAL (EDICIÓN Y EXPORTACIÓN) ---

  function editarRegistro(visita: VisitaHistorial) {
    // Recuperamos el contenido guardado en ese historial
    observacionesPorCongregacion[seleccionado] = visita.contenido || "";
    // IMPORTANTE: Reasignamos para que Svelte detecte el cambio en el formulario
    observacionesPorCongregacion = {...observacionesPorCongregacion};
    
    viendoFormulario = true;
    mostrarHistorial = false;
  }

  async function exportarHistorialPDF(visita: VisitaHistorial) {
  console.log("🧾 Exportando visita:", visita);

  const contenido = visita.contenido || "";

  if (!contenido.trim()) {
    alert("No se encontró texto guardado en este registro del historial.");
    return;
  }

  const doc = new jsPDF();
  let y = 10;

  doc.setFontSize(16);
  doc.text(`Informe de Análisis - ${seleccionado}`, 10, y);
  y += 10;

  doc.setFontSize(12);
  doc.text(`Fecha de visita: ${visita.fecha}`, 10, y);
  y += 10;

  const lineas = doc.splitTextToSize(contenido, 180);
  doc.text(lineas, 10, y);

  const nombreSeguro = seleccionado
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, "_")
    .replace(/\s+/g, "_");

  const ruta = await save({
    title: "Guardar informe PDF",
    filters: [{ name: "PDF", extensions: ["pdf"] }],
    defaultPath: `Informe_${nombreSeguro}_${visita.fecha.replace(/\//g, "-")}.pdf`
  });

  if (!ruta) {
    console.log("Guardado cancelado");
    return;
  }

  await writeFile(ruta, new Uint8Array(doc.output("arraybuffer")));

  alert("✓ PDF guardado correctamente.");
}

  async function eliminarRegistro(id: number) {
    if (!confirm("¿Estás seguro de que deseas eliminar este registro del historial?")) return;
    if (historialSesion[seleccionado]) {
      historialSesion[seleccionado] = historialSesion[seleccionado].filter(v => v.id !== id);
      await persistirDatos();
      cargarHistorialReal();
    }
  }

  function cargarHistorialReal() {
    historialVisitas = historialSesion[seleccionado] || [];
  }

  // --- NAVEGACIÓN Y GUARDADO ---

async function guardarYVolver() {
  // 1. Tomamos el resumen generado automáticamente por el formulario
  const resumen = $resumenUltimoAnalisis[seleccionado] || "";
  console.log("🟩 Resumen recibido desde resumenUltimoAnalisis:", resumen);

  if (!resumen.trim()) {
    alert("No hay contenido para guardar en el historial.");
    return;
  }

  // 2. Creamos el objeto de la visita
  const nuevaVisita: VisitaHistorial = {
    id: Date.now(),
    fecha: $fechaPorCongregacion[seleccionado] || new Date().toLocaleDateString('es-ES'),
    tipo: "Análisis de Congregación",
    completado: true,
    contenido: resumen   // 👈 AHORA SÍ: contenido real del formulario
  };
  console.log("🟨 Visita creada:", nuevaVisita);

  // 3. Lo añadimos al historial
  if (!historialSesion[seleccionado]) historialSesion[seleccionado] = [];
  historialSesion[seleccionado] = [nuevaVisita, ...historialSesion[seleccionado]];
  console.log("🟧 Historial actualizado:", historialSesion[seleccionado]);

  // 4. Persistencia y navegación
  await persistirDatos();
  cargarHistorialReal();

  // 5. Volver al dashboard
  viendoFormulario = false;
  vistaActual = "dashboard";
}

function irAInformes() {
  vistaActual = "informes";
  viendoFormulario = false;
  mostrarHistorial = false;
  cargarHistorialReal();
}

function volverAlDashboard() {
  vistaActual = "dashboard";
  viendoFormulario = false;
  mostrarHistorial = false;
}

function abrirHistorial() {
  mostrarHistorial = true;
  viendoFormulario = false;
  cargarHistorialReal();
}

function cerrarHistorial() {
  mostrarHistorial = false;
  viendoFormulario = false;
}

  // --- MODALES ---
  let mostrarModal = false;
  let mostrarMenuConfig = false;
  let datosEdicion: Congregacion | null = null;

  const secciones = [
    { titulo: "Informes", icon: FileText, action: irAInformes },
    { titulo: "Documentos", icon: Folder, action: () => {} },
    { titulo: "Asuntos pendientes", icon: ListChecks, action: () => {} }
  ];

  $: lista = datos[circuitoNombre] || [];
</script>

<div class="dashboard">
  <aside class="sidebar-cong">
    <div class="label-box">
      <MapPin size={12} /> 
      <span>CONGREGACIONES</span>
    </div>

    <div class="scroll-area">
      <div class="items">
        {#each lista as cong}
          <button 
            class="item {seleccionado === cong.nombre ? 'active' : ''}" 
            on:click={() => seleccionarCongregacion(cong.nombre)}
          >
            <div class="item-text">
              <strong>{cong.nombre}</strong>
              <p class="fecha">Última visita: {$fechaPorCongregacion[cong.nombre] || "—"}</p>
            </div>
            <ChevronRight size={14} />
          </button>
        {/each}
      </div>
    </div>

    <button class="add-btn" on:click={abrirModal}>
      <Plus size={16} /> Nueva Congregación
    </button>
  </aside>

  <main class="main-panel">
    {#if vistaActual === "dashboard"}
      <div class="header-cong">
        <h2>Congregación <strong>{seleccionado}</strong></h2>

        {#if lista.find(c => c.nombre === seleccionado)?.enVisita}
          <span class="badge">EN VISITA</span>
        {/if}

        <div class="config-wrapper">
          <button class="config-btn" on:click={() => mostrarMenuConfig = !mostrarMenuConfig}>
            <Settings size={14} /> Configuración
          </button>

          {#if mostrarMenuConfig}
            <div class="config-menu">
              <button on:click={editarCongregacion}>
                <Pencil size={14} /> Editar congregación
              </button>
              <button class="danger" on:click={eliminarCongregacion}>
                <Trash2 size={14} /> Eliminar congregación
              </button>
            </div>
          {/if}
        </div>
      </div>

      <div class="grid">
        {#each secciones as s}
          <button class="card" on:click={s.action}>
            <div class="icon-wrap">
              <svelte:component this={s.icon} size={30} />
            </div>
            <div class="text">
              <h3>{s.titulo}</h3>
              <span>Acceder a sección</span>
            </div>
          </button>
        {/each}
      </div>

    {:else if vistaActual === "informes"}
      <div class="report-view">
        <header class="report-header">
          <button class="back-link" on:click={volverAlDashboard}>
            <ArrowLeft size={18} /> Volver al panel
          </button>
          
          <div class="report-title">
            <h1>Análisis de congregación</h1>
            <p>Registrando informe para <strong>{seleccionado}</strong></p>
          </div>

          {#if viendoFormulario}
            <button class="save-button" on:click={guardarYVolver}>
              <Save size={18} /> Guardar cambios
            </button>
          {:else}
            <div style="width: 155px;"></div>
          {/if}
        </header>

        <div class="report-content-scroll">
          {#if viendoFormulario}
            <AnalisisCongregacion nombreCongregacion={seleccionado} />

          {:else if mostrarHistorial}
            <div class="history-page-container">
              <div class="history-header" style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px;">
                <button class="back-btn-modern" on:click={cerrarHistorial}>
                   <ArrowLeft size={18} />
                   <span>Volver a opciones</span>
                </button>
    
                <h2 style="margin: 0; font-size: 1.4rem; color: #1e293b; font-weight: 600;">
                 Historial: <span style="color: #2563eb;">{seleccionado}</span>
                </h2>
              </div>

              <div class="full-history-list">
                {#each historialVisitas as visita}
                  <div class="history-row">
                    <div class="row-left">
                      <div class="icon-circle">
                        <Clock size={20} />
                      </div>
                      <div class="row-info">
                        <span class="row-date">{visita.fecha}</span>
                        <span class="row-type">{visita.tipo}</span>
                      </div>
                    </div>
                    
                    <div class="row-actions" style="display: flex; gap: 8px;">
                      <button class="h-edit-btn" on:click={() => editarRegistro(visita)} title="Editar informe">
                        <Pencil size={14} />
                        <span>Editar</span>
                      </button>

                      <button class="h-edit-btn" style="background: #fee2e2; color: #991b1b; border: 1px solid #fecaca;" on:click={() => exportarHistorialPDF(visita)} title="Descargar PDF">
                        <FileText size={14} />
                        <span>PDF</span>
                      </button>
                      
                      <button class="h-delete-btn" on:click={() => eliminarRegistro(visita.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                {:else}
                  <div class="history-empty-state">
                    <History size={48} strokeWidth={1} />
                    <p>No hay registros previos para esta congregación.</p>
                  </div>
                {/each}
              </div>
            </div>

          {:else}
            <div class="empty-state">
              <div class="icon-wrapper">
                <div class="icon-decoration"></div>
                <div class="empty-icon-container">
                  <ClipboardList size={50} strokeWidth={1.5} />
                </div>
              </div>

              <h2>Nuevo Análisis de Congregación</h2>
              <p>
                Comienza a registrar los detalles de la visita para <strong>{seleccionado}</strong>. 
              </p>

              <div class="actions-container" style="display: flex; flex-direction: column; align-items: center; gap: 15px; width: 100%;">
                <button class="start-btn" on:click={() => viendoFormulario = true}>
                  <Plus size={20} /> 
                  <span>COMENZAR NUEVO ANÁLISIS</span>
                </button>

                <button 
                  class="history-nav-btn" 
                  on:click={abrirHistorial}
                >
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <History size={18} />
                    <span>VER HISTORIAL COMPLETO</span>
                  </div>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          {/if}
        </div>

        <footer class="report-footer">
          <div class="status-indicator">
            <div class="pulse-dot"></div>
            <span>Auto-guardado activo para {seleccionado}</span>
          </div>
        </footer>
      </div>
    {/if}
  </main>
</div>

{#if mostrarModal}
  <NuevaCongregacionModal 
    {datosEdicion}
    on:close={() => { mostrarModal = false; datosEdicion = null; }}
    on:save={async (e) => {
      const nueva = e.detail;
      datos[circuitoNombre] = [...(datos[circuitoNombre] || []), { ...nueva, nombre: nueva.nombre.toUpperCase(), enVisita: false }];
      seleccionado = nueva.nombre.toUpperCase();
      if (!(seleccionado in observacionesPorCongregacion)) {
         observacionesPorCongregacion[seleccionado] = "";
      }
      await persistirDatos(); 
      mostrarModal = false;
      datosEdicion = null;
    }}
    on:update={async (e) => {
      const editada = e.detail;
      datos[circuitoNombre] = datos[circuitoNombre].map(c =>
        c.nombre === (datosEdicion?.nombre ?? "") ? { ...c, ...editada, nombre: editada.nombre.toUpperCase() } : c
      );
      seleccionado = editada.nombre.toUpperCase();
      await persistirDatos();
      mostrarModal = false;
      datosEdicion = null;
    }}
  />
{/if}

<style>
  /* 1. Limpieza y Layout Base */
  :global(body, html) { margin: 0; padding: 0; height: 100%; width: 100%; overflow: hidden !important; font-family: 'Inter', sans-serif; }
  .dashboard { display: flex; gap: 20px; padding: 20px; background: #f8fafc; height: calc(100vh - 65px); width: 100vw; box-sizing: border-box; overflow: hidden; }

  /* 2. Sidebar */
  .sidebar-cong { width: 260px; background: white; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; height: 100%; box-sizing: border-box; }
  .label-box { flex: 0 0 auto; display: flex; align-items: center; gap: 5px; color: #94a3b8; font-size: 10px; font-weight: bold; margin-bottom: 15px; }
  .scroll-area { flex: 1 1 auto; overflow-y: auto; min-height: 0; padding-right: 5px; }
  .scroll-area::-webkit-scrollbar { width: 4px; }
  .scroll-area::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
  .items { display: flex; flex-direction: column; gap: 5px; }
  .item { width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 10px; border: none; background: none; border-radius: 8px; color: #64748b; font-weight: 600; cursor: pointer; transition: 0.2s; }
  .item:hover { background: #f1f5f9; }
  .item.active { background: #fff1f2; color: #e11d48; }
  .item-text { display: flex; flex-direction: column; align-items: flex-start; }
  .fecha { font-size: 11px; opacity: 0.7; margin: 2px 0 0 0; }
  .add-btn { flex: 0 0 auto; width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; color: #e11d48; background: none; border: 1px dashed #fecaca; padding: 12px; border-radius: 10px; cursor: pointer; font-weight: 600; margin-top: 10px; }

  /* 3. Panel Principal */
  .main-panel { flex: 1; height: 100%; overflow-y: auto; }
  .header-cong { display: flex; align-items: center; gap: 15px; margin-bottom: 25px; }
  .badge { background: #e11d48; color: white; font-size: 10px; font-weight: 800; padding: 4px 8px; border-radius: 4px; }

  /* 4. Grid de Tarjetas */
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px; }
  .card { background: white; padding: 40px; border-radius: 20px; display: flex; align-items: center; gap: 30px; border: 2px solid #e2e8f0; cursor: pointer; transition: 0.3s; text-align: left; }
  .card:hover { border-color: #e11d48; transform: translateY(-5px); box-shadow: 0 10px 20px rgba(225, 29, 72, 0.08); }
  .icon-wrap { background: #f1f5f9; padding: 12px; border-radius: 12px; color: #64748b; }
  .card:hover .icon-wrap { background: #fff1f2; color: #e11d48; }
  .text h3 { margin: 0; font-size: 18px; color: #1e293b; }
  .text span { font-size: 14px; color: #94a3b8; }

  /* 5. Vista de Informes y Header */
  .report-view { background: white; height: 100%; border-radius: 20px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; overflow: hidden; }
  .report-header { padding: 25px 30px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
  .back-link { display: flex; align-items: center; gap: 8px; background: none; border: none; color: #64748b; font-weight: 600; cursor: pointer; font-size: 14px; }
  .report-title { text-align: center; }
  .report-title h1 { margin: 0; font-size: 1.25rem; color: #1e293b; }
  .report-title p { margin: 0; font-size: 0.85rem; color: #64748b; }
  .save-button { background: #e11d48; color: white; border: none; padding: 10px 20px; border-radius: 10px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: 0.2s; }
  .report-content-scroll { flex: 1; overflow-y: auto; padding: 20px; background: #fdfdfd; }

  /* 6. Historial - Filas y Botones Nuevos */
  .history-page-container { padding: 24px; animation: fadeIn 0.3s ease-out; display: flex; flex-direction: column; gap: 24px; }
  .history-header { display: flex; align-items: center; gap: 16px; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0; }
  .history-header h2 { font-size: 1.25rem; color: #1e293b; margin: 0; font-weight: 700; }
  
  .full-history-list { display: flex; flex-direction: column; gap: 12px; }
  .history-row { display: flex; align-items: center; justify-content: space-between; background: white; padding: 16px 20px; border-radius: 12px; border: 1px solid #e2e8f0; transition: all 0.2s; }
  .history-row:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); border-color: #cbd5e1; }
  
  .row-left { display: flex; align-items: center; gap: 16px; }
  .icon-circle { background: #f8fafc; color: #64748b; padding: 10px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
  .row-info { display: flex; flex-direction: column; gap: 2px; }
  .row-date { font-weight: 700; color: #1e293b; font-size: 14px; }
  .row-type { font-size: 12px; color: #64748b; }

  /* Acciones del historial */
  .row-actions { display: flex; align-items: center; gap: 10px; }

  /* Botón Editar Historial */
  .h-edit-btn { display: flex; align-items: center; gap: 6px; background: #eff6ff; color: #2563eb; border: 1px solid #dbeafe; padding: 8px 14px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: 0.2s; }
  .h-edit-btn:hover { background: #2563eb; color: white; border-color: #2563eb; }

  /* Botón Eliminar Historial */
  .h-delete-btn { display: flex; align-items: center; justify-content: center; background: #fff1f2; color: #e11d48; border: 1px solid #ffe4e6; padding: 8px; border-radius: 8px; cursor: pointer; transition: 0.2s; }
  .h-delete-btn:hover { background: #e11d48; color: white; border-color: #e11d48; }

  /* 7. Estados Vacíos */
  .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 40px; }
  .icon-wrapper { position: relative; width: 120px; height: 120px; display: flex; align-items: center; justify-content: center; margin-bottom: 25px; }
  .empty-icon-container { background: #fff1f2; color: #e11d48; width: 100px; height: 100px; border-radius: 35px; display: flex; align-items: center; justify-content: center; z-index: 2; }
  .icon-decoration { position: absolute; top: 0; left: 0; right: 0; bottom: 0; border: 2px dashed #fecaca; border-radius: 42px; z-index: 1; }
  .empty-state h2 { color: #1e293b; font-size: 22px; font-weight: 800; margin-bottom: 10px; }
  .empty-state p { color: #64748b; max-width: 360px; line-height: 1.6; margin-bottom: 30px; text-align: center; }
  
  /* 8. Botones de Navegación */
  .start-btn { background: #e11d48; color: white; border: none; padding: 15px 30px; border-radius: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 12px; transition: all 0.2s; box-shadow: 0 10px 15px -3px rgba(225, 29, 72, 0.2); }
  .start-btn:hover { background: #be123c; transform: scale(1.03); }
  .history-nav-btn { display: flex; align-items: center; justify-content: space-between; width: 320px; padding: 14px 20px; background: white; color: #475569; border: 1px solid #e2e8f0; border-radius: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
  .history-nav-btn:hover { background: #f8fafc; border-color: #cbd5e1; transform: translateY(-1px); }

  /* 9. Config Menu y Footer */
  .config-wrapper { position: relative; margin-left: auto; }
  .config-btn { display: flex; align-items: center; gap: 8px; background: white; color: #64748b; border: 1px solid #e2e8f0; padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; }
  .config-menu { position: absolute; top: 40px; right: 0; background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 6px; width: 190px; z-index: 1000; display: flex; flex-direction: column; gap: 4px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
  .config-menu button { display: flex; align-items: center; gap: 10px; background: none; border: none; padding: 8px 12px; cursor: pointer; font-size: 13px; color: #475569; border-radius: 6px; text-align: left; }
  .config-menu button:hover { background: #f1f5f9; }
  .config-menu .danger { color: #dc2626; }

  .report-footer { padding: 15px 30px; border-top: 1px solid #f1f5f9; flex-shrink: 0; }
  .status-indicator { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #94a3b8; }
  .pulse-dot { width: 8px; height: 8px; background: #10b981; border-radius: 50%; animation: pulse 2s infinite; }
  
  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }

  .back-btn-modern {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    padding: 8px 14px;
    border-radius: 10px;
    color: #475569;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  }

  .back-btn-modern:hover {
    background: #f1f5f9;
    color: #1e293b;
    border-color: #cbd5e1;
    transform: translateX(-2px);
  }

  </style>
  