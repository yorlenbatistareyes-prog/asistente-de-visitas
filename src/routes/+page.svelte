<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { Plus, MapPin, Calendar, Users, Trash2, ArrowRight, Map, Search } from "lucide-svelte";
  
  import { 
    obtenerTodosLosCircuitos, 
    crearCircuito, 
    obtenerCongregaciones, 
    eliminarCircuito, 
    type Circuito 
  } from '$lib/services/db';

  interface CircuitoVisual extends Circuito {
    numCongregaciones?: number;
  }

  let circuitos: CircuitoVisual[] = [];
  let mostrandoModal = false;

  // NUEVAS VARIABLES PARA BÚSQUEDA Y FILTRO
  let busqueda = "";
  let filtroEstado = "todos";
  let ordenamiento = "recientes"; // <--- NUEVO: Variable para controlar el orden
  
  let nuevoNombre = "";
  let nuevasEtiquetas = "";
  let nuevaFechaInicio = "";
  let nuevaFechaFin = "";

  // LÓGICA REACTIVA DE FILTRADO Y ORDENAMIENTO
  // Esta lista se actualiza sola cada vez que escribes, cambias el filtro o el orden
  $: circuitosFiltrados = (circuitos || [])
    .filter(c => {
      const nombre = c.nombre?.toLowerCase() || "";
      const etiquetas = c.etiquetas?.toLowerCase() || "";
      const textoBusqueda = busqueda.toLowerCase();
      
      // Filtro por nombre o ubicación
      const coincideTexto = nombre.includes(textoBusqueda) || etiquetas.includes(textoBusqueda);
      
      // Filtro por estado (Actual, Futuro, Anterior)
      if (filtroEstado === "todos") return coincideTexto;
      const estadoActual = obtenerEstado(c).texto.toLowerCase(); 
      return coincideTexto && estadoActual === filtroEstado.toLowerCase();
    })
    .sort((a, b) => {
      // NUEVO: Lógica matemática para ordenar las tarjetas
      if (ordenamiento === "recientes") {
        return (b.fechaInicio || "").localeCompare(a.fechaInicio || "");
      } else if (ordenamiento === "antiguos") {
        return (a.fechaInicio || "").localeCompare(b.fechaInicio || "");
      } else if (ordenamiento === "nombre") {
        return (a.nombre || "").localeCompare(b.nombre || "");
      }
      return 0;
    });

  async function cargarCircuitos() {
    try {
      const circs_db = await obtenerTodosLosCircuitos();
      let circs_visuales = [];
      for (let c of circs_db) {
        const congs = await obtenerCongregaciones(c.nombre);
        circs_visuales.push({
          ...c,
          numCongregaciones: congs.length
        });
      }
      circuitos = circs_visuales;
    } catch (e) {
      console.error("Error cargando circuitos:", e);
    }
  }

  onMount(cargarCircuitos);

  async function guardarNuevoCircuito() {
    if (!nuevoNombre.trim()) return;
    try {
      await crearCircuito(nuevoNombre, nuevasEtiquetas, nuevaFechaInicio, nuevaFechaFin);
      mostrandoModal = false;
      nuevoNombre = ""; nuevasEtiquetas = ""; nuevaFechaInicio = ""; nuevaFechaFin = "";
      await cargarCircuitos();
    } catch (error) {
      alert("❌ Error al guardar el circuito:\n" + error);
    }
  }

  function entrarAlCircuito(id: number) {
    goto(`/circuito/${id}/congregaciones`);
  }

  async function eliminar(id: number, nombre: string) {
    if (confirm(`¿Estás seguro de eliminar el circuito "${nombre}" y TODAS sus congregaciones?`)) {
      try {
        await eliminarCircuito(id, nombre);
        await cargarCircuitos();
      } catch (error) {
        alert("Error al eliminar: " + error);
      }
    }
  }

  function obtenerEstado(circuito: CircuitoVisual) {
    if (!circuito.fechaInicio || !circuito.fechaFin) return { texto: "SIN FECHA", clase: "badge-anterior" };
    const hoy = new Date().toISOString().split('T')[0];
    if (hoy < circuito.fechaInicio) return { texto: "FUTURO", clase: "badge-futuro" };
    if (hoy > circuito.fechaFin) return { texto: "ANTERIOR", clase: "badge-anterior" };
    return { texto: "ACTUAL", clase: "badge-actual" };
  }

  function textoFecha(circuito: CircuitoVisual) {
    if (!circuito.fechaInicio || !circuito.fechaFin) return "Fechas pendientes";
    return `${circuito.fechaInicio} a ${circuito.fechaFin}`;
  }
</script>

<div class="dashboard-circuitos">
  <div class="header-section">
    <div>
      <h1>Listas de circuitos</h1>
      <p>Administrar todos los circuitos en un solo lugar.</p>
    </div>
    <button class="btn-global btn-primary" on:click={() => (mostrandoModal = true)}>
      <Plus size={18} /> Nuevo Circuito
    </button>
  </div>

  <div class="toolbar-modular">
    <div class="search-pill card-global">
      <Search size={18} class="search-icon" />
      <input 
        type="text" 
        placeholder="Buscar circuitos por nombre, ubicación o fecha..." 
        bind:value={busqueda}
        class="search-input"
      />
    </div>

    <div class="filters-aside">
      <div class="filter-item card-global">
        <select bind:value={filtroEstado} class="minimal-select">
          <option value="todos">Todos los circuitos</option>
          <option value="actual">Actuales</option>
          <option value="futuro">Futuros</option>
          <option value="anterior">Pasados</option>
        </select>
      </div>

      <div class="filter-item card-global">
        <select bind:value={ordenamiento} class="minimal-select">
          <option value="recientes">Fecha (Recientes primero)</option>
          <option value="antiguos">Fecha (Antiguos primero)</option>
          <option value="nombre">Nombre (A-Z)</option>
        </select>
      </div>
    </div>
  </div>

  <div class="grid-circuitos">
    {#each circuitosFiltrados as circuito}
      <div class="rassembly-card card-global">
        <div class="card-header">
          <div class="top-row">
            <div class="badge-status {obtenerEstado(circuito).clase}">
              {obtenerEstado(circuito).texto}
            </div>
            <div class="circuit-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="47" height="47" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="3.0" r="2.2" />
                <path d="M8.5 10.0 v-1.5 l1.5 -1.5 h4 l1.5 1.5 v1.5" />
                <line x1="12" y1="7.0" x2="12" y2="10.0" />

                <line x1="6.5" y1="11.5" x2="17.5" y2="11.5" />
                <path d="M8.5 11.5 L9.5 14 h5 L15.5 11.5" />

                <path d="M6.2 19.5 A 1.6 1.9 0 1 1 9.0 19.5" />
                <path d="M10.6 19.5 A 1.6 1.9 0 1 1 13.4 19.5" />
                <path d="M15.0 19.5 A 1.6 1.9 0 1 1 17.8 19.5" />

                <path d="M4.0 22.5 A 1.6 1.9 0 1 1 6.8 22.5" />
                <path d="M8.4 22.5 A 1.6 1.9 0 1 1 11.2 22.5" />
                <path d="M12.8 22.5 A 1.6 1.9 0 1 1 15.6 22.5" />
                <path d="M17.2 22.5 A 1.6 1.9 0 1 1 20.0 22.5" />
              </svg>
            </div>
          </div>
          <div class="header-divider"></div>
        </div>

        <div class="card-content">
          <h3 class="circuit-title">"{circuito.nombre}"</h3>
          <div class="info-container">
            <div class="meta-row">
              <MapPin size={16} />
              <span>{circuito.etiquetas || 'Ubicación'}</span>
            </div>
            <div class="meta-row">
              <Users size={16} />
              <span>{circuito.numCongregaciones} Congregaciones registradas</span>
            </div>
            <div class="meta-row">
              <Calendar size={16} />
              <span class="fecha-texto">{textoFecha(circuito)}</span>
            </div>
          </div>
        </div>

        <div class="actions-wrapper">
          <div class="card-actions">
            <button class="btn-delete" on:click={() => eliminar(circuito.id!, circuito.nombre)} title="Eliminar">
              <Trash2 size={18} />
            </button>
            
            <button class="btn-manage" on:click={() => entrarAlCircuito(circuito.id!)}>
              Gestionar Circuito <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    {/each}
  </div>
</div>

{#if mostrandoModal}
  <div class="modal-backdrop">
    <div class="card-global modal-content">
      <h2>Crear Nuevo Circuito</h2>
      
      <div class="form-group">
        <label for="nombre">Nombre del Circuito *</label>
        <input id="nombre" type="text" class="input-global" placeholder="Ej: HG-06" bind:value={nuevoNombre} />
      </div>

      <div class="form-group">
        <label for="etiquetas">Ubicación / Etiqueta</label>
        <input id="etiquetas" type="text" class="input-global" placeholder="Ej: San Rafael, Holguín" bind:value={nuevasEtiquetas} />
      </div>

      <div class="form-row">
          <div class="form-group half">
             <label for="inicio">Fecha de Inicio</label>
             <input id="inicio" type="date" class="input-global" bind:value={nuevaFechaInicio} />
          </div>
          <div class="form-group half">
              <label for="fin">Fecha de Fin</label>
              <input id="fin" type="date" class="input-global" bind:value={nuevaFechaFin} />
          </div>
      </div>

      <div class="modal-actions">
        <button class="btn-global" on:click={() => (mostrandoModal = false)}>Cancelar</button>
        <button class="btn-global btn-primary" on:click={guardarNuevoCircuito}>Guardar</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .dashboard-circuitos { 
    max-width: 1200px; 
    margin: 0 auto; 
    padding-top: 20px;
  }

  /* --- CABECERA --- */
  .header-section { 
    display: flex; 
    justify-content: space-between; 
    align-items: flex-end; 
    margin-bottom: 40px; 
  }
  
  .header-section h1 { 
    margin: 0; 
    font-size: 2rem; 
    font-weight: 800; 
    color: var(--text-main); 
  }

  .btn-primary { 
    background-color: #5c0a1f !important; /* Rojo vino intenso */
    color: white !important; 
    border: none; 
    padding: 10px 24px; 
    font-weight: 700;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px rgba(92, 10, 31, 0.2);
  }

  .btn-primary:hover { 
    background-color: #3a0411 !important; /* Rojo casi negro */
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(92, 10, 31, 0.3);
  }

  /* --- BARRA DE HERRAMIENTAS MODULAR --- */
  .toolbar-modular {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 15px;
    margin-bottom: 35px;
  }

  .search-pill {
    flex: 1;
    display: flex;
    align-items: center;
    padding: 0 20px;
    height: 44px; 
    background: var(--bg-panel);
    border: 1px solid var(--border-color);
    border-radius: 50px;
    transition: all 0.2s ease;
  }

  .search-pill:focus-within {
    border-color: #5c0a1f; /* Acento vino */
    box-shadow: 0 0 0 3px rgba(92, 10, 31, 0.1);
  }

  .search-input {
    width: 100%;
    border: none;
    background: transparent;
    color: var(--text-main);
    outline: none;
    font-size: 0.9rem;
    margin-left: 10px;
  }

  .filters-aside {
    display: flex;
    gap: 12px;
  }

  .filter-item {
    background: var(--bg-panel);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 0 15px;
    height: 44px;
    display: flex;
    align-items: center;
  }

  .filter-item:hover { border-color: #5c0a1f; } /* Hover vino */

  .minimal-select {
    background: transparent;
    color: var(--text-main);
    border: none;
    font-size: 0.85rem;
    font-weight: 600;
    outline: none;
    cursor: pointer;
  }

  /* --- GRID Y TARJETAS --- */
  .grid-circuitos { 
    display: grid; 
    grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); 
    gap: 30px; 
  }

  .rassembly-card { 
    display: flex; 
    flex-direction: column; 
    padding: 0; 
    overflow: hidden; 
    min-height: 320px;
    position: relative; 
    transition: all 0.3s ease;
    border: 1px solid var(--border-color);
    border-top: 4px solid #5c0a1f; /* Borde superior vino */
    background: var(--bg-panel);
    border-radius: var(--radius-lg);
  }
  
  .rassembly-card:hover { 
    transform: translateY(-8px);
    box-shadow: var(--shadow-3d);
  }

  .card-header { padding: 25px 30px 0 30px; }
  .top-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
  .header-divider { height: 1px; background-color: var(--border-color); width: 100%; }
  .card-content { padding: 10px 30px 30px 30px; flex: 1; display: flex; flex-direction: column; }
  .circuit-icon { color: var(--text-main); opacity: 0.8; }

  /* --- ESTADOS --- */
  .badge-status { 
    display: inline-block; padding: 6px 16px; border-radius: 20px; 
    font-size: 0.75rem; font-weight: 800; text-transform: uppercase; 
  }
  .badge-actual { background: #1e3a8a; color: white; }
  .badge-futuro { background: #f59e0b; color: white; }
  .badge-anterior { background: #64748b; color: white; }

  .circuit-title { 
    margin: 15px 0 20px 0; font-size: 1.6rem; font-weight: 900; 
    color: var(--text-main); text-transform: uppercase; 
  }
  
  .meta-row { display: flex; align-items: center; gap: 10px; font-size: 0.95rem; color: var(--text-muted); font-weight: 500; }

  /* --- ACCIONES --- */
  .actions-wrapper {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 70px;
    background: var(--bg-panel);
    border-top: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    padding: 0 20px;
    opacity: 0;
    transform: translateY(10px);
    transition: all 0.3s ease;
    pointer-events: none;
    z-index: 10;
  }

  .rassembly-card:hover .actions-wrapper { opacity: 1; transform: translateY(0); pointer-events: auto; }
  .card-actions { display: flex; gap: 12px; width: 100%; }
  
  .btn-delete { 
    width: 40px;
    height: 40px; 
    border-radius: 10px; 
    border: none; 
    background: #fee2e2; 
    color: #ef4444; 
    cursor: pointer; 
    display: flex; 
    align-items: center; 
    justify-content: center;
    flex-shrink: 0; 
  }

  :global(.dark) .btn-delete { background: rgba(239, 68, 68, 0.15); }

  .btn-manage { 
    flex: 1; 
    height: 40px;
    border-radius: 10px; 
    border: none; 
    background: #5c0a1f; /* Rojo vino */
    color: white; 
    font-weight: 700;
    font-size: 0.85rem; 
    cursor: pointer; 
    display: flex; 
    align-items: center; 
    justify-content: center; 
    gap: 8px;
  }
  
  .btn-manage:hover {
    background: #3a0411;
  }

  /* --- MODAL --- */
  .modal-backdrop {
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(4px);
    display: flex; justify-content: center; align-items: center; z-index: 2000; padding: 20px;
  }

  .modal-content {
    width: 100%; max-width: 500px; background: var(--bg-panel);
    border-radius: var(--radius-lg); padding: 35px; box-shadow: var(--shadow-3d);
    animation: scaleIn 0.2s ease-out; border-top: 5px solid #5c0a1f; /* Borde superior vino */
  }

  .form-group { margin-bottom: 20px; display: flex; flex-direction: column; gap: 8px; }
  .form-group label { font-size: 0.85rem; font-weight: 700; color: var(--text-muted); }
  .form-row { display: flex; gap: 15px; margin-bottom: 25px; }
  .form-group.half { flex: 1; }
  .modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 10px; }

  @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }

  /* =============================================
     DISEÑO RESPONSIVO (Tablets y Móviles)
     ============================================= */

  /* Pantallas medianas y Tablets (hasta 1024px) */
  @media (max-width: 1024px) {
    .grid-circuitos { 
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); 
    }
  }

  /* Móviles (hasta 768px) */
  @media (max-width: 768px) {
    /* 1. Cabecera */
    .header-section {
      flex-direction: column;
      align-items: flex-start;
      gap: 15px;
      margin-bottom: 25px;
    }
    .header-section button {
      width: 100%;
      justify-content: center;
      min-height: 52px !important; /* Más altura forzada */
    }

    /* 2. Barra de Herramientas */
    .toolbar-modular {
      flex-direction: column;
      align-items: stretch;
      gap: 12px;
      width: 100%;
      box-sizing: border-box; 
    }
    
    .search-pill {
      width: 100%;
      box-sizing: border-box; 
      min-height: 52px !important; /* Altura imponente para el buscador */
      padding: 0 20px; /* Asegura buen espacio interior */
      border-radius: 12px; /* Alineamos la curva a los botones de abajo */
    }

    .search-input {
      font-size: 1rem; /* Texto un poquito más grande para leer bien en el sol */
    }

    .filters-aside {
      flex-direction: column; 
      width: 100%;
      gap: 12px;
    }
    
    .filter-item {
      width: 100%;
      box-sizing: border-box; 
      min-height: 52px !important; /* Igual que el buscador */
    }
    
    .minimal-select {
      width: 100%;
      font-size: 0.95rem; /* Texto más legible */
    }

    /* 3. Tarjetas de Circuitos */
    .grid-circuitos {
      grid-template-columns: 1fr; 
    }
    .rassembly-card {
      min-height: auto; 
    }
    .card-content {
      padding-bottom: 10px; 
    }
    
    /* Contenedor de acciones SIEMPRE VISIBLE */
    .actions-wrapper {
      position: static; 
      opacity: 1; 
      transform: translateY(0);
      pointer-events: auto;
      height: auto;
      padding: 0 25px 25px 25px;
      border-top: none;
      background: transparent;
    }

    /* 4. SOLUCIÓN A LOS BOTONES ESTRECHITOS */
    .card-actions {
      flex-direction: column; /* Apila "Eliminar" y "Gestionar" uno encima del otro */
      gap: 12px;
      width: 100%;
      box-sizing: border-box;
    }

    .btn-delete, .btn-manage {
      width: 100%;
      min-height: 52px !important; /* Usamos min-height forzado con !important para vencer cualquier global */
      padding: 12px 20px !important; /* Relleno generoso */
      justify-content: center;
      border-radius: 12px !important; 
      font-size: 1rem !important; /* Texto claro y grande */
    }
  }

  /* Móviles muy pequeños (hasta 480px) */
  @media (max-width: 480px) {
    .header-section h1 {
      font-size: 1.6rem;
    }
    
    /* Aseguramos que el contenido de la tarjeta no choque con los bordes */
    .card-header, .card-content, .actions-wrapper {
      padding-left: 20px;
      padding-right: 20px;
    }

    /* Modal */
    .modal-content {
      padding: 20px;
    }
    .form-row {
      flex-direction: column; 
      gap: 15px;
      margin-bottom: 15px;
    }
    .modal-actions {
      flex-direction: column-reverse; 
      gap: 10px;
    }
    .modal-actions button {
      width: 100%;
      min-height: 52px !important;
    }
  }
</style>