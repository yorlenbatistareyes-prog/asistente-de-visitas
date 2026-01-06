<script lang="ts">
  import { 
    MapPin, ChevronRight, Plus, FileText, Folder, ListChecks, 
    Settings, Pencil, Trash2, ArrowLeft, Save, ClipboardList,
    History, Clock 
  } from "lucide-svelte";
  import NuevaCongregacionModal from "../modals/NuevaCongregacionModal.svelte";

  // 1. IMPORTAMOS EL STORE
  import { listaCongregaciones } from '$lib/stores/appStore';
  import AnalisisCongregacion from '$lib/components/AnalisisCongregacion.svelte';

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

  import { open } from '@tauri-apps/plugin-shell';
  import { documentDir, join } from '@tauri-apps/api/path';
  import { readDir, BaseDirectory } from '@tauri-apps/plugin-fs';
  import { fechaPorCongregacion } from '$lib/stores/appStore';

  interface VisitaHistorial {
    id: number;
    fecha: string;
    tipo: string;
    completado: boolean;
  }

  // --- VARIABLES DE ESTADO ---
  export let circuitoNombre: string = "Holguín-14";
  let seleccionado = "AEROPUERTO";
  let vistaActual: "dashboard" | "informes" = "dashboard";
  let viendoFormulario = false; 
  let mostrarHistorial = false;
  
  // Mantenemos las visitas de la sesión actual separadas de los archivos físicos
  let historialSesion: Record<string, VisitaHistorial[]> = {};
  let historialVisitas: VisitaHistorial[] = [];
  let textoAnalisis = "";

  let observacionesPorCongregacion: Record<string, string> = {
    "AEROPUERTO": "",
    "CACOCUM": ""
  };

  let datos: Record<string, Congregacion[]> = {
    "Holguín-14": [
      { nombre: "AEROPUERTO", enVisita: true }, 
      { nombre: "CACOCUM", enVisita: false }
    ],
    "Holguín-15": [
      { nombre: "Pueblo Nuevo", enVisita: false }
    ]
  };

  // --- LÓGICA DE SELECCIÓN CORE ---
  function seleccionarCongregacion(nombre: string) {
    // 1. Guardar el texto actual en la congregación anterior
    observacionesPorCongregacion[seleccionado] = textoAnalisis;

    // 2. Cambiar selección
    seleccionado = nombre;

    // 3. Inicializar texto si no existe
    if (!(nombre in observacionesPorCongregacion)) {
      observacionesPorCongregacion[nombre] = "";
    }

    // 4. Cargar texto de la nueva congregación
    textoAnalisis = observacionesPorCongregacion[nombre];

    // 5. Inicializar historial si no existe
    if (!historialSesion[nombre]) {
      historialSesion[nombre] = [];
    }

    // 6. Actualizar historial combinado
    cargarHistorialReal();

    mostrarMenuConfig = false;
  }

  // --- ARCHIVOS Y PERSISTENCIA ---
  async function cargarHistorialReal() {
    let visitasFisicas: VisitaHistorial[] = [];
    try {
      const archivos = await readDir('AsistenteVisitas', { baseDir: BaseDirectory.Document });
      visitasFisicas = archivos
        .filter(f => f.name?.includes(seleccionado) && f.name?.endsWith('.pdf'))
        .map((f, index) => ({
          id: index,
          fecha: f.name?.split('_')[2]?.replace('.pdf', '') || 'Fecha desconocida',
          tipo: "Informe Guardado (PDF)",
          completado: true
        }));
    } catch (err) {
      console.log("Sin carpeta física.");
    }

    // Combinamos lo que hay en memoria de esta sesión + lo que hay en disco
    const visitasEnMemoria = historialSesion[seleccionado] || [];
    historialVisitas = [...visitasEnMemoria, ...visitasFisicas];
  }

  async function abrirReportePDF(fecha: string): Promise<void> {
    try {
      if (!seleccionado) return;
      const baseDir = await documentDir();
      const filePath = await join(baseDir, 'AsistenteVisitas', `Reporte_${seleccionado}_${fecha}.pdf`);
      await open(filePath);
    } catch (err) {
      alert(`No se encontró el reporte físico.`);
    }
  }

  // --- GUARDADO ---
  function guardarYVolver() {
    // Guardar el texto actual de la congregación (textoAnalisis local)
    observacionesPorCongregacion[seleccionado] = textoAnalisis;

    // Crear la nueva visita usando la fecha que tengas registrada para esta congregación
    const nuevaVisita: VisitaHistorial = {
      id: Date.now(),
      // Usamos la fecha asociada a la congregación; si no hay, queda vacío
      fecha: $fechaPorCongregacion[seleccionado] || "",
      tipo: "Análisis de Congregación",
      completado: true
    };

    // Guardar específicamente para ESTA congregación en la sesión
    if (!historialSesion[seleccionado]) historialSesion[seleccionado] = [];
    historialSesion[seleccionado] = [nuevaVisita, ...historialSesion[seleccionado]];

    // Refrescar la lista visual
    cargarHistorialReal();

    // Volver al panel
    viendoFormulario = false;
    vistaActual = "dashboard";
  }

  // --- NAVEGACIÓN ---
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
  }

  // --- MODALES AND CONFIG ---
  let mostrarModal = false;
  let mostrarMenuConfig = false;
  let datosEdicion: Congregacion | null = null;

  const secciones = [
    { titulo: "Informes", icon: FileText, action: irAInformes },
    { titulo: "Documentos", icon: Folder, action: () => {} },
    { titulo: "Asuntos pendientes", icon: ListChecks, action: () => {} }
  ];

  $: lista = datos[circuitoNombre] || [];

  $: if (lista) {
    listaCongregaciones.set(new Array(lista.length).fill({}));
  }

  function abrirModal() {
    datosEdicion = null;
    mostrarModal = true;
  }

  function editarCongregacion() {
    const actual = lista.find(c => c.nombre === seleccionado);
    if (!actual) return;
    datosEdicion = { ...actual };
    mostrarModal = true;
    mostrarMenuConfig = false;
  }

  function eliminarCongregacion() {
    datos[circuitoNombre] = datos[circuitoNombre].filter(c =>
      c.nombre !== seleccionado
    );
    seleccionado = datos[circuitoNombre][0]?.nombre || "";
    textoAnalisis = observacionesPorCongregacion[seleccionado] || "";
    mostrarMenuConfig = false;
  }
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
  on:click={() => { 
    seleccionado = cong.nombre; 
    volverAlDashboard();
  }}
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
      <div class="history-header">
        <button class="back-btn" on:click={cerrarHistorial}>
          <ArrowLeft size={20} />
          <span>Volver al panel</span>
        </button>
        <h2>Historial de Visitas: {seleccionado}</h2>
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
            
            <div class="row-actions">
              {#if visita.completado}
                <span class="badge-success">Completado</span>
              {/if}
              <button class="h-view-btn" on:click={() => abrirReportePDF(visita.fecha)}>
                <FileText size={14} style="margin-right: 4px;" />
                <span>Ver PDF</span>
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
    on:save={(e) => {
      const nueva = e.detail;
      datos[circuitoNombre] = [...(datos[circuitoNombre] || []), { ...nueva, nombre: nueva.nombre.toUpperCase(), enVisita: false }];
      seleccionado = nueva.nombre.toUpperCase();
      mostrarModal = false;
      datosEdicion = null;
    }}
    on:update={(e) => {
      const editada = e.detail;
      datos[circuitoNombre] = datos[circuitoNombre].map(c =>
        c.nombre === (datosEdicion?.nombre ?? "") ? { ...c, ...editada, nombre: editada.nombre.toUpperCase() } : c
      );
      seleccionado = editada.nombre.toUpperCase();
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

  /* 5. VISTA DE INFORMES */
  .report-view { background: white; height: 100%; border-radius: 20px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; overflow: hidden; }
  .report-header { padding: 25px 30px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
  .back-link { display: flex; align-items: center; gap: 8px; background: none; border: none; color: #64748b; font-weight: 600; cursor: pointer; font-size: 14px; }
  .report-title { text-align: center; }
  .report-title h1 { margin: 0; font-size: 1.25rem; color: #1e293b; }
  .report-title p { margin: 0; font-size: 0.85rem; color: #64748b; }
  .save-button { background: #e11d48; color: white; border: none; padding: 10px 20px; border-radius: 10px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: 0.2s; }
  
  .report-content-scroll { flex: 1; overflow-y: auto; padding: 20px; background: #fdfdfd; }
  
  /* ESTADOS VACÍOS E ICONOS (FIJO Y CENTRADO) */
  .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 40px; animation: fadeIn 0.4s ease-out; }
  .icon-wrapper {
    position: relative;
    width: 120px;
    height: 120px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 25px;
  }
  .empty-icon-container {
    background: #fff1f2;
    color: #e11d48;
    width: 100px;
    height: 100px;
    border-radius: 35px;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2;
  }
  .icon-decoration {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border: 2px dashed #fecaca; /* El borde que ahora es fijo */
    border-radius: 42px;
    z-index: 1;
    /* Se eliminó la animación de rotación */
  }

  .empty-state h2 { color: #1e293b; font-size: 22px; font-weight: 800; margin: 0 0 10px 0; }
  .empty-state p { color: #64748b; max-width: 360px; line-height: 1.6; margin-bottom: 30px; text-align: center; }
  
  .start-btn { background: #e11d48; color: white; border: none; padding: 15px 30px; border-radius: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 12px; transition: all 0.2s; box-shadow: 0 10px 15px -3px rgba(225, 29, 72, 0.2); }
  .start-btn:hover { background: #be123c; transform: scale(1.03); }

  .report-footer { padding: 15px 30px; border-top: 1px solid #f1f5f9; flex-shrink: 0; }
  .status-indicator { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #94a3b8; }
  .pulse-dot { width: 8px; height: 8px; background: #10b981; border-radius: 50%; animation: pulse 2s infinite; }
  
  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }

  /* Config Menu */
  .config-wrapper { position: relative; margin-left: auto; }
  .config-btn { display: flex; align-items: center; gap: 8px; background: white; color: #64748b; border: 1px solid #e2e8f0; padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; }
  .config-menu { position: absolute; top: 40px; right: 0; background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 6px; width: 190px; z-index: 1000; display: flex; flex-direction: column; gap: 4px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
  .config-menu button { display: flex; align-items: center; gap: 10px; background: none; border: none; padding: 8px 12px; cursor: pointer; font-size: 13px; color: #475569; border-radius: 6px; text-align: left; }
  .config-menu button:hover { background: #f1f5f9; }
  .config-menu .danger { color: #dc2626; }

  /* Contenedor para centrar ambos botones */
  .actions-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    width: 100%;
  }

  /* Aseguramos que el contenedor padre permita el flujo */
  .actions-container {
    overflow: visible !important; 
    height: auto !important;
  }

  /* Botón Ver PDF dentro de la lista */
  .h-view-btn {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    padding: 5px 12px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 700;
    color: #475569;
    cursor: pointer;
    transition: 0.2s;
  }

  .h-view-btn:hover {
    background: #e11d48;
    color: white;
    border-color: #e11d48;
  }
  /* Animación suave de aparición */
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-5px); }
    to { opacity: 1; transform: translateY(0); }
  }
  /* --- CONTENEDOR DE LA PÁGINA DE HISTORIAL --- */
  .history-page-container {
    padding: 24px;
    animation: fadeIn 0.3s ease-out;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }
  /* CABECERA: Botón volver y Título */
  .history-header {
    display: flex;
    align-items: center;
    gap: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid #e2e8f0;
  }
  .back-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #f1f5f9;
    border: none;
    padding: 8px 16px;
    border-radius: 8px;
    color: #475569;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }
  .back-btn:hover {
    background: #e2e8f0;
    color: #1e293b;
  }
  .history-header h2 {
    font-size: 1.25rem;
    color: #1e293b;
    margin: 0;
    font-weight: 700;
  }
  /* LISTA DE FILAS ANCHAS */
  .full-history-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .history-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: white;
    padding: 16px 20px;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    transition: transform 0.2s, box-shadow 0.2s;
  }
  .history-row:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    border-color: #cbd5e1;
  }
  .row-left {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .icon-circle {
    background: #f8fafc;
    color: #64748b;
    padding: 10px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .row-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .row-date {
    font-weight: 700;
    color: #1e293b;
    font-size: 14px;
  }
  .row-type {
    font-size: 12px;
    color: #64748b;
  }
  /* ACCIONES Y BADGES */
  .row-actions {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .badge-success {
    background: #dcfce7;
    color: #166534;
    font-size: 11px;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 6px;
    text-transform: uppercase;
  }
  .h-view-btn {
    background: white;
    border: 1px solid #e2e8f0;
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    color: #475569;
    cursor: pointer;
    transition: all 0.2s;
  }
  .h-view-btn:hover {
    background: #e11d48;
    color: white;
    border-color: #e11d48;
  }
  /* BOTÓN DE NAVEGACIÓN (En la página principal) */
  .history-nav-btn {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 320px;
    padding: 14px 20px;
    background: white;
    color: #475569;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }
  .history-nav-btn:hover {
    background: #f8fafc;
    border-color: #cbd5e1;
    transform: translateY(-1px);
  }

  /* ESTADO VACÍO */
  .history-empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px;
    color: #94a3b8;
    gap: 12px;
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .item-text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.fecha {
  font-size: 11px;
  opacity: 0.7;
  margin-top: 2px;
}
</style>