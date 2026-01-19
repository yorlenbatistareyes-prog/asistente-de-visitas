<script lang="ts">
  import { 
    MapPin, ChevronRight, Plus, FileText, Folder, ListChecks, 
    Settings, Pencil, Trash2, ArrowLeft, ClipboardList,
    History, Clock, LayoutGrid, AlertCircle
  } from "lucide-svelte";
  import NuevaCongregacionModal from "../modals/NuevaCongregacionModal.svelte";

  // 1. IMPORTACIONES
  import { onMount } from 'svelte';
  // Importamos circuitoActivo para saber cuál eligió el usuario en la barra lateral
  import { listaCongregaciones, fechaPorCongregacion, resumenUltimoAnalisis, mostrarCircuitBar, circuitoActivo } from '$lib/stores/appStore';
  import AnalisisCongregacion from '$lib/components/AnalisisCongregacion.svelte';
  import Documentos from '$lib/components/layout/Documentos.svelte';
  import AsuntosPendientes from '$lib/components/layout/AsuntosPendientes.svelte';

  // TAURI
  import { LazyStore } from '@tauri-apps/plugin-store';
  import jsPDF from "jspdf";
  import { save } from "@tauri-apps/plugin-dialog";
  import { writeFile, readTextFile, BaseDirectory, exists } from "@tauri-apps/plugin-fs";
  
  // --- INTERFACES ---
  interface Congregacion { 
    nombre: string; enVisita: boolean; ciudad?: string; provincia?: string; pais?: string; idioma?: string; esLenguaSenas?: boolean; telefono?: string; horaSemana?: string; horaFinSemana?: string; diaSemana?: string; diaFinSemana?: string;
  }
  interface VisitaHistorial { id: number; fecha: string; tipo: string; completado: boolean; contenido?: string; }

  // --- VARIABLES ---
  // YA NO HAY VALOR POR DEFECTO. Se llena reactivamente con el store.
  let circuitoNombre: string = ""; 
  
  let seleccionado = ""; 
  let vistaActual: "dashboard" | "informes" | "documentos" | "asuntos-pendientes" = "dashboard";
  let viendoFormulario = false; 
  let mostrarHistorial = false;
  
  let observacionesPorCongregacion: Record<string, string> = {}; 
  let historialSesion: Record<string, VisitaHistorial[]> = {};
  let historialVisitas: VisitaHistorial[] = [];
  let datosParaEditar: any = null;

  // Lista local para evitar errores de TS
  let lista: Congregacion[] = [];
  
  // --- DATOS ---
  // Inicializamos VACÍO, sin "Holguín-14" ni nada prefabricado
  let datos: Record<string, Congregacion[]> = {}; 
  const store = new LazyStore('registro_circuito_v1.json');

  // --- HELPERS HISTORIAL ---
  const clavesHistorial = ['opinionGeneral', 'ministerio', 'territorio', 'atencionTerritorio', 'precursoresMetas', 'reuniones', 'pastoreo', 'crecimiento', 'superServicio', 'publicaciones', 'metas', 'cuerpoAncianos', 'local', 'miscelaneos', 'irregulares', 'potencial', 'analisisPrecursores', 'contabilidad', 'seguimiento'];

  function generarMapeoInverso() {
    const mapeo: Record<string, string> = {};
    clavesHistorial.forEach(clave => {
      let nombreModulo = clave.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).replace('Cuerpo Ancianos', 'Cuerpo de Ancianos');
      mapeo[nombreModulo] = clave;
    });
    return mapeo;
  }
  const mapeoInverso = generarMapeoInverso();

  function parsearContenidoHistorial(contenido: string): any {
    const resultado: any = {};
    if (!contenido) return resultado;
    const lineas = contenido.split('\n\n');
    lineas.forEach(linea => {
      const separadorIndex = linea.indexOf(': ');
      if (separadorIndex > 0) {
        const nombreModulo = linea.substring(0, separadorIndex);
        const valor = linea.substring(separadorIndex + 2);
        const clave = mapeoInverso[nombreModulo];
        if (clave) resultado[clave] = valor === 'Sin observaciones' ? '' : valor;
      }
    });
    return resultado;
  }

  async function persistirDatos() {
    try {
      await store.set('observaciones', observacionesPorCongregacion);
      await store.set('historial_sesion', historialSesion);
      // Aquí guardamos TODO el objeto de datos (todos los circuitos)
      // Pero primero nos aseguramos que el circuito actual esté actualizado en el objeto 'datos'
      if (circuitoNombre) {
          datos[circuitoNombre] = lista;
      }
      // Iteramos sobre las claves de 'datos' para guardar cada circuito en el Store
      for (const [key, value] of Object.entries(datos)) {
          await store.set(key, value);
      }
      await store.save();
    } catch (err) { console.error("Error al guardar:", err); }
  }

  async function cargarDatosGuardados() {
    try {
      // 1. Cargar datos auxiliares
      const obs = await store.get<Record<string, string>>('observaciones');
      const hist = await store.get<Record<string, VisitaHistorial[]>>('historial_sesion');
      
      if (obs) observacionesPorCongregacion = obs;
      if (hist) historialSesion = hist;

      // 2. Cargar TODAS las entradas (circuitos) del archivo
      const entries = await store.entries();
      datos = {}; // Reiniciamos limpio
      
      for (const [key, value] of entries) {
        // Filtramos las claves que no son de configuración
        if (key !== 'observaciones' && key !== 'historial_sesion' && key !== 'datos_congregaciones') {
            datos[key] = value as Congregacion[];
        }
      }

      // 3. Sincronizar con el circuito activo actual
      sincronizarConCircuitoActivo();

    } catch (err) { console.log("Datos por defecto o archivo nuevo."); }
  }

  // Función reactiva para actualizar la vista cuando cambia el store global
  function sincronizarConCircuitoActivo() {
    circuitoNombre = $circuitoActivo;
    
    if (circuitoNombre && datos[circuitoNombre]) {
        lista = datos[circuitoNombre];
    } else {
        lista = [];
    }

    // Resetear selección al cambiar de circuito
    seleccionado = "";
    if (lista.length > 0) {
        seleccionado = lista[0].nombre;
    }
    
    cargarHistorialReal();
  }

  onMount(cargarDatosGuardados);

  // --- ACCIONES ---
  function resetearEstadoFormulario() { viendoFormulario = false; datosParaEditar = null; }
  function abrirModal() { datosEdicion = null; mostrarModal = true; }
  
  function editarCongregacion() {
    const actual = lista.find(c => c.nombre === seleccionado);
    if (!actual) return;
    datosEdicion = { ...actual };
    mostrarModal = true;
    mostrarMenuConfig = false;
  }

  async function eliminarCongregacion() {
    if(!confirm(`¿Eliminar la congregación ${seleccionado}?`)) return;
    
    // Filtramos la lista local
    lista = lista.filter(c => c.nombre !== seleccionado);
    
    // Actualizamos el objeto global de datos
    if (circuitoNombre) {
        datos[circuitoNombre] = lista;
    }

    if (lista.length > 0) seleccionado = lista[0].nombre;
    else seleccionado = "";
    
    await persistirDatos();
    mostrarMenuConfig = false;
  }

  async function seleccionarCongregacion(nombre: string) {
    if (vistaActual !== "dashboard" && vistaActual !== "informes") return;
    if (seleccionado === nombre) return;
    if (viendoFormulario) resetearEstadoFormulario();
    seleccionado = nombre;
    if (!historialSesion[nombre]) historialSesion[nombre] = [];
    if (!(nombre in observacionesPorCongregacion)) observacionesPorCongregacion[nombre] = "";
    cargarHistorialReal();
    mostrarMenuConfig = false;
  }

  // --- HISTORIAL & PDF ---
  function editarRegistro(visita: VisitaHistorial) {
    const datosParseados = parsearContenidoHistorial(visita.contenido || "");
    datosParseados.fechaVisita = visita.fecha;
    datosParaEditar = datosParseados;
    fechaPorCongregacion.update(f => ({ ...f, [seleccionado]: visita.fecha }));
    viendoFormulario = true;
    mostrarHistorial = false;
  }

  async function exportarHistorialPDF(visita: VisitaHistorial) {
    const contenido = visita.contenido || "";
    if (!contenido.trim()) { alert("Sin contenido."); return; }

    let firmaUsuario = "";
    let textoPiePagina = "Informe generado por Asistente de Visitas"; 
    
    try {
      const existe = await exists('config_usuario.json', { baseDir: BaseDirectory.AppData });
      if (existe) {
        const raw = await readTextFile('config_usuario.json', { baseDir: BaseDirectory.AppData });
        const cfg = JSON.parse(raw);
        if (cfg.nombre) { firmaUsuario = `Generado por: ${cfg.nombre}`; if (cfg.rol) firmaUsuario += ` (${cfg.rol})`; }
        if (cfg.piePagina) textoPiePagina = cfg.piePagina;
      }
    } catch (e) {}

    const doc = new jsPDF();
    let y = 20;
    doc.setFontSize(18); doc.setTextColor(40, 40, 40); doc.text(`Informe de Análisis`, 10, y);
    doc.setFontSize(14); doc.setTextColor(100, 100, 100); doc.text(seleccionado, 10, y + 8);
    y += 20;
    doc.setFontSize(11); doc.setTextColor(0, 0, 0); doc.text(`Fecha: ${visita.fecha}`, 10, y);
    y += 10; doc.setDrawColor(200); doc.line(10, y, 200, y); y += 10;
    doc.setFontSize(12); doc.text(doc.splitTextToSize(contenido, 180), 10, y);

    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(9); doc.setTextColor(150);
    if (firmaUsuario) doc.text(firmaUsuario, 10, pageHeight - 15);
    const ancho = doc.getTextWidth(textoPiePagina);
    doc.text(textoPiePagina, 200 - ancho, pageHeight - 15);

    const nombreSeguro = seleccionado.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9\s]/g, "_");
    const ruta = await save({ title: "Guardar PDF", filters: [{ name: "PDF", extensions: ["pdf"] }], defaultPath: `Informe_${nombreSeguro}_${visita.fecha.replace(/\//g, "-")}.pdf` });
    if (!ruta) return;
    await writeFile(ruta, new Uint8Array(doc.output("arraybuffer")));
    alert("✓ PDF guardado con éxito.");
  }

  async function eliminarRegistro(id: number) {
    if (!confirm("¿Eliminar registro?")) return;
    historialSesion[seleccionado] = historialSesion[seleccionado].filter(v => v.id !== id);
    await persistirDatos();
    cargarHistorialReal();
  }

  function cargarHistorialReal() {
    if (!seleccionado) { historialVisitas = []; return; }
    historialVisitas = historialSesion[seleccionado] || [];
  }

  // --- NAVEGACIÓN ---
  function irAInformes() { vistaActual = "informes"; viendoFormulario = false; mostrarHistorial = false; cargarHistorialReal(); $mostrarCircuitBar = false; }
  function irADocumentos() { vistaActual = "documentos"; $mostrarCircuitBar = false; seleccionado = ""; }
  function irAAsuntosPendientes() { vistaActual = "asuntos-pendientes"; $mostrarCircuitBar = false; seleccionado = ""; }
  
  function volverAlDashboard() {
    vistaActual = "dashboard"; viendoFormulario = false; mostrarHistorial = false; $mostrarCircuitBar = true;
    if (lista.length > 0 && (!seleccionado || seleccionado === "")) seleccionado = lista[0].nombre;
  }

  function abrirHistorial() { mostrarHistorial = true; viendoFormulario = false; cargarHistorialReal(); }
  function cerrarHistorial() { mostrarHistorial = false; viendoFormulario = false; datosParaEditar = null; }

  let mostrarModal = false;
  let mostrarMenuConfig = false;
  let datosEdicion: Congregacion | null = null;

  const tarjetaInforme = { titulo: "Informes y Análisis", icon: FileText, action: irAInformes, desc: "Gestionar visitas" };
  
  const tarjetasGlobales = [
    { titulo: "Documentos", icon: Folder, action: irADocumentos, desc: "Biblioteca del circuito" },
    { titulo: "Asuntos pendientes", icon: ListChecks, action: irAAsuntosPendientes, desc: "Tareas y recordatorios" }
  ];

  // --- REACTIVIDAD MAESTRA ---
  // Escuchamos cambios en el store global del circuito activo
  $: if ($circuitoActivo !== circuitoNombre) {
      // Si cambia el circuito en la barra lateral, recargamos los datos
      cargarDatosGuardados();
  }

  // Sincronización con el store global de lista para el contador
  $: {
    listaCongregaciones.set(lista as any);
  }
</script>

<div class="dashboard">
  {#if vistaActual === "dashboard" || vistaActual === "informes"}
    <aside class="sidebar-cong">
      <div class="label-box">
        <MapPin size={12} /> <span>CONGREGACIONES</span>
      </div>
      <div class="scroll-area">
        <div class="items">
          {#if lista.length > 0}
            {#each lista as cong}
                <button 
                class="item {seleccionado === cong.nombre ? 'active' : ''}" 
                on:click={() => seleccionarCongregacion(cong.nombre)}
                >
                <div class="item-text">
                    <strong>{cong.nombre}</strong>
                    <p class="fecha">{$fechaPorCongregacion[cong.nombre] || "—"}</p>
                </div>
                <ChevronRight size={14} />
                </button>
            {/each}
          {:else}
             <div class="empty-list-msg">
                {#if !circuitoNombre}
                    <p>Selecciona o crea un circuito.</p>
                {:else}
                    <p>Sin congregaciones.</p>
                {/if}
             </div>
          {/if}
        </div>
      </div>
      <button class="add-btn" on:click={abrirModal} disabled={!circuitoNombre} style={!circuitoNombre ? "opacity: 0.5; cursor: not-allowed;" : ""}>
        <Plus size={16} /> Nueva
      </button>
    </aside>
  {/if}

  <main class="main-panel {vistaActual === 'documentos' || vistaActual === 'asuntos-pendientes' ? 'full-width' : ''}">
    {#if vistaActual === "dashboard"}
      
      <div class="header-cong">
        {#if seleccionado}
            <h2>{seleccionado}</h2>
            {#if lista.find(c => c.nombre === seleccionado)?.enVisita}
                <span class="badge">EN VISITA</span>
            {/if}
            <div class="config-wrapper">
                <button class="config-btn" on:click={() => mostrarMenuConfig = !mostrarMenuConfig}>
                    <Settings size={14} /> Configuración
                </button>
                {#if mostrarMenuConfig}
                    <div class="config-menu">
                    <button on:click={editarCongregacion}><Pencil size={14} /> Editar</button>
                    <button class="danger" on:click={eliminarCongregacion}><Trash2 size={14} /> Eliminar</button>
                    </div>
                {/if}
            </div>
        {:else}
            <h2>Panel General</h2>
        {/if}
      </div>

      {#if seleccionado}
          <div class="grid-section">
            <h4 class="section-title">Gestión de Congregación</h4>
            <div class="grid">
              <button class="card highlight" on:click={tarjetaInforme.action}>
                <div class="icon-wrap highlight">
                  <svelte:component this={tarjetaInforme.icon} size={30} />
                </div>
                <div class="text">
                  <h3>{tarjetaInforme.titulo}</h3>
                  <span>{tarjetaInforme.desc}</span>
                </div>
              </button>
            </div>
          </div>
          <div class="divider-dash"></div>
      {/if}

      <div class="grid-section">
        <h4 class="section-title">Herramientas Globales</h4>
        <div class="grid">
          {#each tarjetasGlobales as s}
            <button class="card highlight" on:click={s.action}>
              <div class="icon-wrap highlight">
                <svelte:component this={s.icon} size={30} />
              </div>
              <div class="text">
                <h3>{s.titulo}</h3>
                <span>{s.desc}</span>
              </div>
            </button>
          {/each}
        </div>
      </div>

      {#if !seleccionado}
        <div class="guide-msg">
            {#if !circuitoNombre}
                <AlertCircle size={40} color="#e11d48" />
                <p><strong>Bienvenido.</strong><br>Para comenzar, crea un nuevo Circuito en la barra lateral izquierda.</p>
            {:else}
                <LayoutGrid size={40} color="#cbd5e1" />
                <p>Selecciona una congregación del menú para acceder a sus informes.</p>
            {/if}
        </div>
      {/if}

    {:else if vistaActual === "informes"}
      <div class="report-view">
        <header class="report-header">
          <button class="back-link" on:click={volverAlDashboard}><ArrowLeft size={18} /> Volver</button>
          <div class="report-title"><h1>Análisis</h1><p>{seleccionado}</p></div>
          <div style="width: 100px;"></div>
        </header>
        
        <div class="report-content-scroll">
          {#if viendoFormulario}
            <AnalisisCongregacion 
              nombreCongregacion={seleccionado}
              datosEdicion={datosParaEditar}
              on:guardarEnHistorial={async (e) => {
                const { congregacion, fecha, contenido } = e.detail;
                const nueva = { id: Date.now(), fecha, tipo: "Análisis", completado: true, contenido };
                if (!historialSesion[congregacion]) historialSesion[congregacion] = [];
                historialSesion[congregacion] = [nueva, ...historialSesion[congregacion]];
                await persistirDatos(); cargarHistorialReal();
              }}
              on:limpiarFormulario={() => { datosParaEditar = null; viendoFormulario = false; }}
            />
          {:else if mostrarHistorial}
            <div class="history-page-container">
              <div class="history-header">
                <button class="back-btn-modern" on:click={cerrarHistorial}><ArrowLeft size={18}/><span>Atrás</span></button>
                <h2>Historial</h2>
              </div>
              <div class="full-history-list">
                {#each historialVisitas as visita}
                  <div class="history-row">
                    <div class="row-left">
                      <div class="icon-circle"><Clock size={20} /></div>
                      <div class="row-info"><span class="row-date">{visita.fecha}</span><span class="row-type">{visita.tipo}</span></div>
                    </div>
                    <div class="row-actions">
                      <button class="h-edit-btn" on:click={() => editarRegistro(visita)}>
                        <Pencil size={14}/>
                        <span>Editar</span>
                      </button>
                      <button class="h-edit-btn pdf" on:click={() => exportarHistorialPDF(visita)}>
                        <FileText size={14}/>
                        <span>PDF</span>
                      </button>
                      <button class="h-delete-btn" on:click={() => eliminarRegistro(visita.id)}><Trash2 size={16}/></button>
                    </div>
                  </div>
                {:else}
                  <div class="history-empty-state"><History size={48} strokeWidth={1} /><p>Sin registros.</p></div>
                {/each}
              </div>
            </div>
          {:else}
            <div class="action-center-container">
              <div class="action-card-main">
                <div class="icon-header">
                  <div class="icon-ring">
                    <ClipboardList size={40} color="#e11d48" strokeWidth={1.5} />
                  </div>
                </div>
                <h2>Análisis de Congregación</h2>
                {#if historialSesion[seleccionado] && historialSesion[seleccionado].length > 0}
                  <p class="last-visit-text">Última visita registrada: <strong>{historialSesion[seleccionado][0].fecha}</strong></p>
                {:else}
                  <p class="last-visit-text">Aún no hay registros para esta congregación.</p>
                {/if}
                <div class="main-actions">
                  <button class="btn-primary-large" on:click={() => viendoFormulario = true}>
                    <Plus size={20} /> <span>COMENZAR NUEVO ANÁLISIS</span>
                  </button>
                  <button class="btn-secondary-large" on:click={abrirHistorial}>
                    <History size={20} /> <span>VER TODOS LOS REGISTROS</span>
                  </button>
                </div>
              </div>
              
              {#if historialSesion[seleccionado] && historialSesion[seleccionado].length > 0}
                <div class="recent-preview">
                  <h4>Recientes</h4>
                  <div class="preview-list">
                    {#each historialSesion[seleccionado].slice(0, 3) as visita}
                      <div class="preview-item" on:click={() => editarRegistro(visita)} role="button" tabindex="0" on:keydown={() => {}}>
                        <div class="p-left"><Clock size={14} class="p-icon"/><span class="p-date">{visita.fecha}</span></div>
                        <span class="p-action">Ver informe <ChevronRight size={12}/></span>
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}
            </div>
          {/if}
        </div>
      </div>

    {:else if vistaActual === "documentos"}
      <Documentos on:volver={volverAlDashboard} on:cerrar={volverAlDashboard} />
    {:else if vistaActual === "asuntos-pendientes"}
      <AsuntosPendientes on:volver={volverAlDashboard} on:cerrar={volverAlDashboard} />
    {/if}
  </main>
</div>

{#if mostrarModal}
  <NuevaCongregacionModal 
    {datosEdicion}
    on:close={() => { mostrarModal = false; datosEdicion = null; }}
    on:save={async (e) => {
      const nueva = e.detail;
      // Guardamos en el objeto global usando el circuitoNombre activo
      if (circuitoNombre) {
          datos[circuitoNombre] = [...(datos[circuitoNombre] || []), { ...nueva, nombre: nueva.nombre.toUpperCase(), enVisita: false }];
          lista = datos[circuitoNombre];
          seleccionado = nueva.nombre.toUpperCase();
          if (!(seleccionado in observacionesPorCongregacion)) observacionesPorCongregacion[seleccionado] = "";
          await persistirDatos(); 
          mostrarModal = false; 
          datosEdicion = null;
      }
    }}
    on:update={async (e) => {
      const editada = e.detail;
      if (circuitoNombre) {
          datos[circuitoNombre] = datos[circuitoNombre].map(c => c.nombre === (datosEdicion?.nombre ?? "") ? { ...c, ...editada, nombre: editada.nombre.toUpperCase() } : c);
          lista = datos[circuitoNombre];
          seleccionado = editada.nombre.toUpperCase();
          await persistirDatos(); 
          mostrarModal = false; 
          datosEdicion = null;
      }
    }}
  />
{/if}

<style>
  :global(body, html) { margin: 0; padding: 0; height: 100%; width: 100%; overflow: hidden !important; font-family: 'Inter', sans-serif; }
  .dashboard { display: flex; gap: 20px; padding: 20px; background: #f8fafc; height: calc(100vh - 65px); width: 100vw; box-sizing: border-box; overflow: hidden; }
  .sidebar-cong { width: 260px; background: white; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; height: 100%; box-sizing: border-box; }
  .label-box { flex: 0 0 auto; display: flex; align-items: center; gap: 5px; color: #94a3b8; font-size: 10px; font-weight: bold; margin-bottom: 15px; }
  .scroll-area { flex: 1 1 auto; overflow-y: auto; padding-right: 5px; }
  .items { display: flex; flex-direction: column; gap: 5px; }
  .item { width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 10px; border: none; background: none; border-radius: 8px; color: #64748b; font-weight: 600; cursor: pointer; transition: 0.2s; }
  .item:hover { background: #f1f5f9; }
  .item.active { background: #fff1f2; color: #e11d48; }
  .item-text { display: flex; flex-direction: column; align-items: flex-start; }
  .fecha { font-size: 11px; opacity: 0.7; margin: 2px 0 0 0; }
  .add-btn { flex: 0 0 auto; width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; color: #e11d48; background: none; border: 1px dashed #fecaca; padding: 12px; border-radius: 10px; cursor: pointer; font-weight: 600; margin-top: 10px; }
  .empty-list-msg { padding: 20px; text-align: center; color: #94a3b8; font-size: 13px; }
  .main-panel { flex: 1; height: 100%; overflow-y: auto; }
  .main-panel.full-width { width: 100%; margin-left: 0; }
  .header-cong { display: flex; align-items: center; gap: 15px; margin-bottom: 10px; min-height: 40px; }
  .badge { background: #e11d48; color: white; font-size: 10px; font-weight: 800; padding: 4px 8px; border-radius: 4px; }
  
  /* GRID Y SECCIONES */
  .grid-section { margin-bottom: 30px; }
  .section-title { font-size: 0.8rem; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px; }
  .divider-dash { height: 1px; background: #e2e8f0; margin: 10px 0 20px 0; }
  .guide-msg { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 40px; background: white; border: 2px dashed #e2e8f0; border-radius: 16px; margin-top: 20px; text-align: center; color: #94a3b8; }

  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 15px; }
  .card { background: white; padding: 30px; border-radius: 16px; display: flex; align-items: center; gap: 20px; border: 1px solid #e2e8f0; cursor: pointer; transition: 0.2s; text-align: left; }
  .card:hover { border-color: #94a3b8; transform: translateY(-3px); box-shadow: 0 5px 15px rgba(0,0,0,0.05); }
  .card.highlight { border-color: #fecaca; background: #fff1f2; }
  .card.highlight:hover { border-color: #e11d48; background: #ffe4e6; }
  .icon-wrap { background: #f1f5f9; padding: 12px; border-radius: 12px; color: #64748b; }
  .icon-wrap.highlight { background: #fecaca; color: #e11d48; }
  .text h3 { margin: 0; font-size: 16px; color: #1e293b; }
  .text span { font-size: 13px; color: #64748b; }

  .report-view { background: white; height: 100%; border-radius: 20px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; overflow: hidden; }
  .report-header { padding: 20px 30px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
  .back-link { display: flex; align-items: center; gap: 8px; background: none; border: none; color: #64748b; font-weight: 600; cursor: pointer; font-size: 14px; }
  .report-title { text-align: center; }
  .report-title h1 { margin: 0; font-size: 1.25rem; color: #1e293b; }
  .report-title p { margin: 0; font-size: 0.85rem; color: #64748b; }
  .report-content-scroll { flex: 1; overflow-y: auto; padding: 20px; background: #fdfdfd; }

  .history-page-container { padding: 24px; animation: fadeIn 0.3s ease-out; display: flex; flex-direction: column; gap: 24px; }
  .history-header { display: flex; align-items: center; gap: 16px; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0; }
  .full-history-list { display: flex; flex-direction: column; gap: 12px; }
  .history-row { display: flex; align-items: center; justify-content: space-between; background: white; padding: 16px 20px; border-radius: 12px; border: 1px solid #e2e8f0; transition: all 0.2s; }
  .row-left { display: flex; align-items: center; gap: 16px; }
  .icon-circle { background: #f8fafc; color: #64748b; padding: 10px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
  .row-info { display: flex; flex-direction: column; gap: 2px; }
  .row-date { font-weight: 700; color: #1e293b; font-size: 14px; }
  .row-type { font-size: 12px; color: #64748b; }
  .row-actions { display: flex; align-items: center; gap: 10px; }
  .h-edit-btn { display: flex; align-items: center; justify-content: center; background: #eff6ff; color: #2563eb; border: 1px solid #dbeafe; padding: 8px 12px; border-radius: 8px; cursor: pointer; gap: 6px; font-weight: 600; font-size: 0.8rem; }
  .h-edit-btn.pdf { background: #fff7ed; color: #c2410c; border-color: #ffedd5; }
  .h-delete-btn { display: flex; align-items: center; justify-content: center; background: #fff1f2; color: #e11d48; border: 1px solid #ffe4e6; padding: 8px; border-radius: 8px; cursor: pointer; }
  .config-wrapper { position: relative; margin-left: auto; }
  .config-btn { display: flex; align-items: center; gap: 8px; background: white; color: #64748b; border: 1px solid #e2e8f0; padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; }
  .config-menu { position: absolute; top: 40px; right: 0; background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 6px; width: 150px; z-index: 1000; display: flex; flex-direction: column; gap: 4px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
  .config-menu button { display: flex; align-items: center; gap: 10px; background: none; border: none; padding: 8px 12px; cursor: pointer; font-size: 13px; color: #475569; border-radius: 6px; text-align: left; }
  .config-menu button:hover { background: #f1f5f9; }
  .config-menu .danger { color: #dc2626; }
  
  .back-btn-modern { display: flex; align-items: center; gap: 8px; background: #ffffff; border: 1px solid #e2e8f0; padding: 8px 14px; border-radius: 10px; color: #475569; font-size: 0.9rem; font-weight: 500; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
  .back-btn-modern:hover { background: #f1f5f9; color: #1e293b; border-color: #cbd5e1; transform: translateX(-2px); }

  /* ESTILOS DEL CENTRO DE ACCIÓN */
  .action-center-container { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; width: 100%; padding: 40px 20px; gap: 30px; }
  .action-card-main { background: white; padding: 40px; border-radius: 20px; box-shadow: 0 10px 30px -10px rgba(0,0,0,0.08); border: 1px solid #f1f5f9; text-align: center; width: 100%; max-width: 450px; display: flex; flex-direction: column; align-items: center; }
  .icon-ring { background: #fff1f2; padding: 18px; border-radius: 50%; display: inline-flex; margin-bottom: 20px; box-shadow: 0 0 0 8px #fff9fa; }
  .action-card-main h2 { margin: 0 0 8px 0; font-size: 1.5rem; color: #1e293b; letter-spacing: -0.02em; }
  .last-visit-text { color: #64748b; font-size: 0.9rem; margin: 0 0 30px 0; }
  .last-visit-text strong { color: #e11d48; font-weight: 600; }
  .main-actions { display: flex; flex-direction: column; gap: 12px; width: 100%; }
  
  .btn-primary-large { background: #e11d48; color: white; border: none; padding: 16px; border-radius: 12px; font-weight: 700; font-size: 1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; transition: all 0.2s; box-shadow: 0 4px 12px rgba(225, 29, 72, 0.25); }
  .btn-primary-large:hover { transform: translateY(-2px); background: #be123c; box-shadow: 0 6px 15px rgba(225, 29, 72, 0.35); }
  .btn-secondary-large { background: white; color: #475569; border: 1px solid #e2e8f0; padding: 14px; border-radius: 12px; font-weight: 600; font-size: 0.95rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; transition: all 0.2s; }
  .btn-secondary-large:hover { background: #f8fafc; border-color: #cbd5e1; color: #1e293b; }

  /* MINI HISTORIAL */
  .recent-preview { width: 100%; max-width: 450px; }
  .recent-preview h4 { font-size: 0.75rem; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.05em; margin-bottom: 10px; text-align: center; }
  .preview-list { display: flex; flex-direction: column; gap: 8px; }
  .preview-item { display: flex; justify-content: space-between; align-items: center; background: white; padding: 12px 16px; border-radius: 10px; border: 1px solid #f1f5f9; cursor: pointer; transition: 0.2s; }
  .preview-item:hover { border-color: #e2e8f0; transform: translateX(5px); box-shadow: 0 2px 5px rgba(0,0,0,0.03); }
  .p-left { display: flex; align-items: center; gap: 8px; color: #334155; font-weight: 600; font-size: 0.9rem; }
  .p-action { font-size: 0.75rem; color: #e11d48; display: flex; align-items: center; gap: 2px; font-weight: 600; opacity: 0; transition: 0.2s; }
  .preview-item:hover .p-action { opacity: 1; }
</style>

