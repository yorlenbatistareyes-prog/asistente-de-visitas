<script lang="ts">
  import { 
    MapPin, ChevronRight, Plus, FileText, Folder, ListChecks, 
    Settings, Pencil, Trash2, ArrowLeft, Save, ClipboardList 
  } from "lucide-svelte";
  import NuevaCongregacionModal from "../modals/NuevaCongregacionModal.svelte";

  // 1. IMPORTAMOS EL STORE (Solo para enviar el número)
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

  export let circuitoNombre: string = "Holguín-14";

  // TUS DATOS ORIGINALES
  let datos: Record<string, Congregacion[]> = {
    "Holguín-14": [
      { nombre: "AEROPUERTO", enVisita: true }, 
      { nombre: "CACOCUM", enVisita: false }
    ],
    "Holguín-15": [
      { nombre: "Pueblo Nuevo", enVisita: false }
    ]
  };

  // --- LÓGICA DE NAVEGACIÓN Y PERSISTENCIA ---
  let seleccionado = "AEROPUERTO";
  let vistaActual: "dashboard" | "informes" = "dashboard";
  
  // Diccionario para que cada congregación tenga sus propias notas
  let observacionesPorCongregacion: Record<string, string> = {
    "AEROPUERTO": "",
    "CACOCUM": ""
  };

  let textoAnalisis = "";

  // Sincronizar el texto cuando cambia la congregación o se entra a informes
  $: {
    textoAnalisis = observacionesPorCongregacion[seleccionado] || "";
  }

  function guardarYVolver() {
    observacionesPorCongregacion[seleccionado] = textoAnalisis;
    vistaActual = "dashboard";
  }

  function irAInformes() {
    vistaActual = "informes";
  }
  // ------------------------------------------

  let mostrarModal = false;
  let mostrarMenuConfig = false;
  let datosEdicion: Congregacion | null = null;

  const secciones = [
    { titulo: "Informes", icon: FileText, action: irAInformes },
    { titulo: "Documentos", icon: Folder, action: () => {} },
    { titulo: "Asuntos pendientes", icon: ListChecks, action: () => {} }
  ];

  $: lista = datos[circuitoNombre] || [];

  $: {
    if (lista) {
      listaCongregaciones.set(new Array(lista.length).fill({}));
    }
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
    datos[circuitoNombre] = datos[circuitoNombre].filter(
      c => c.nombre !== seleccionado
    );
    seleccionado = datos[circuitoNombre][0]?.nombre || "";
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
            on:click={() => { seleccionado = cong.nombre; if(vistaActual !== 'dashboard') vistaActual = 'dashboard'; }}
          >
            {cong.nombre} 
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
          <button class="back-link" on:click={() => vistaActual = 'dashboard'}>
            <ArrowLeft size={18} /> Volver al panel
          </button>
          
          <div class="report-title">
            <h1>Análisis de congregación</h1>
            <p>Registrando informe para <strong>{seleccionado}</strong></p>
          </div>

          <button class="save-button" on:click={guardarYVolver}>
            <Save size={18} /> Guardar cambios
          </button>
        </header>

        <AnalisisCongregacion nombreCongregacion={seleccionado} />

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

  /* 5. VISTA DE INFORMES (Página Completa) */
  .report-view { background: white; height: 100%; border-radius: 20px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; animation: fadeIn 0.2s ease-out; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

  .report-header { padding: 25px 30px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; }
  .back-link { display: flex; align-items: center; gap: 8px; background: none; border: none; color: #64748b; font-weight: 600; cursor: pointer; font-size: 14px; }
  .back-link:hover { color: #1e293b; }
  .report-title { text-align: center; }
  .report-title h1 { margin: 0; font-size: 1.25rem; color: #1e293b; }
  .report-title p { margin: 0; font-size: 0.85rem; color: #64748b; }
  .save-button { background: #e11d48; color: white; border: none; padding: 10px 20px; border-radius: 10px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: 0.2s; }
  .save-button:hover { background: #be123c; transform: scale(1.02); }

  .report-footer { padding: 15px 30px; border-top: 1px solid #f1f5f9; }
  .status-indicator { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #94a3b8; }
  .pulse-dot { width: 8px; height: 8px; background: #10b981; border-radius: 50%; animation: pulse 2s infinite; }
  @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }

  /* Config Menu */
  .config-wrapper { position: relative; margin-left: auto; }
  .config-btn { display: flex; align-items: center; gap: 8px; background: white; color: #64748b; border: 1px solid #e2e8f0; padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; }
  .config-menu { position: absolute; top: 40px; right: 0; background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 6px; width: 190px; z-index: 1000; display: flex; flex-direction: column; gap: 4px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
  .config-menu button { display: flex; align-items: center; gap: 10px; background: none; border: none; padding: 8px 12px; cursor: pointer; font-size: 13px; color: #475569; border-radius: 6px; text-align: left; }
  .config-menu button:hover { background: #f1f5f9; }
  .config-menu .danger { color: #dc2626; }
</style>