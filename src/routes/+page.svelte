<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  // Añadimos Search a las importaciones
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
  
  let nuevoNombre = "";
  let nuevasEtiquetas = "";
  let nuevaFechaInicio = "";
  let nuevaFechaFin = "";

  // LÓGICA REACTIVA DE FILTRADO
  // Esta lista se actualiza sola cada vez que escribes o cambias el filtro
  $: circuitosFiltrados = (circuitos || []).filter(c => {
    const nombre = c.nombre?.toLowerCase() || "";
    const etiquetas = c.etiquetas?.toLowerCase() || "";
    const textoBusqueda = busqueda.toLowerCase();
    
    // Filtro por nombre o ubicación
    const coincideTexto = nombre.includes(textoBusqueda) || etiquetas.includes(textoBusqueda);
    
    // Filtro por estado (Actual, Futuro, Anterior)
    if (filtroEstado === "todos") return coincideTexto;
    const estadoActual = obtenerEstado(c).texto.toLowerCase(); 
    return coincideTexto && estadoActual === filtroEstado.toLowerCase();
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
      <select class="minimal-select">
        <option>Fecha (Recientes primero)</option>
        <option>Fecha (Antiguos primero)</option>
        <option>Nombre (A-Z)</option>
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
              <Map size={22} strokeWidth={1.5} />
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
            <button class="btn-delete" on:click={() => eliminar(circuito.id, circuito.nombre)} title="Eliminar">
              <Trash2 size={18} />
            </button>
            <button class="btn-manage" on:click={() => entrarAlCircuito(circuito.id)}>
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
    background-color: var(--primary); 
    color: white; 
    border: none; 
    padding: 10px 24px; 
    font-weight: 700;
  }
  
  .grid-circuitos { 
    display: grid; 
    grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); 
    gap: 30px; 
  }

  /* --- TARJETA PRINCIPAL --- */
  .rassembly-card { 
    display: flex; 
    flex-direction: column; 
    padding: 0; 
    overflow: hidden; 
    min-height: 320px;
    position: relative; /* Clave para el posicionamiento de los botones */
    transition: all 0.3s ease;
    border: 1px solid var(--border-color);
    border-top: 4px solid var(--primary); 
    background: var(--bg-panel);
    border-radius: var(--radius-lg);
  }
  
  .rassembly-card:hover { 
    transform: translateY(-8px);
    box-shadow: var(--shadow-3d);
    border-color: var(--border-color);
  }

  /* --- ENCABEZADO DE TARJETA --- */
  .card-header { padding: 25px 30px 0 30px; }
  
  .top-row { 
    display: flex; 
    justify-content: space-between; 
    align-items: center; 
    margin-bottom: 15px; 
  }

  .header-divider { 
    height: 1px; 
    background-color: var(--border-color); 
    width: 100%; 
  }

  .card-content { 
    padding: 10px 30px 30px 30px; 
    flex: 1; 
    display: flex; 
    flex-direction: column; 
  }

  .circuit-icon { color: var(--primary); opacity: 0.8; }

  /* --- ETIQUETAS DE ESTADO --- */
  .badge-status { 
    display: inline-block; 
    padding: 6px 16px; 
    border-radius: 20px; 
    font-size: 0.75rem; 
    font-weight: 800; 
    text-transform: uppercase; 
  }
  .badge-actual { background: #1e3a8a; color: white; }
  .badge-futuro { background: #f59e0b; color: white; }
  .badge-anterior { background: #64748b; color: white; }

  /* --- TEXTOS (MODO OSCURO FIX) --- */
  .circuit-title { 
    margin: 15px 0 20px 0; 
    font-size: 1.6rem; 
    font-weight: 900; 
    color: var(--text-main); 
    text-transform: uppercase; 
  }
  
  .info-container { display: flex; flex-direction: column; gap: 12px; }

  .meta-row { 
    display: flex; 
    align-items: center; 
    gap: 10px; 
    font-size: 0.95rem; 
    color: var(--text-muted); 
    font-weight: 500; 
  }

  /* --- BARRA DE ACCIONES DESLIZANTE (RASSEMBLY STYLE) --- */
  .actions-wrapper {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 85px; 
    background: var(--bg-panel);
    border-top: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    padding: 0 25px;
    
    /* Efecto de aparición */
    opacity: 0; 
    transform: translateY(20px);
    transition: all 0.3s ease;
    pointer-events: none;
    z-index: 10;
  }

  .rassembly-card:hover .actions-wrapper {
    opacity: 1; 
    transform: translateY(0);
    pointer-events: auto;
  }

  .card-actions { 
    display: flex; 
    gap: 12px; 
    width: 100%; 
  }
  
  /* --- BOTONES --- */
  .btn-delete { 
    width: 50px; 
    height: 50px; 
    border-radius: 12px; 
    border: none; 
    background: #fee2e2; 
    color: #ef4444; 
    cursor: pointer; 
    display: flex; 
    align-items: center; 
    justify-content: center;
    transition: background 0.2s;
  }

  :global(.dark) .btn-delete {
    background: rgba(239, 68, 68, 0.15);
  }

  .btn-delete:hover { background: #fecaca; }

  .btn-manage { 
    flex: 1; 
    height: 50px; 
    border-radius: 12px; 
    border: none; 
    background: var(--primary); 
    color: white; 
    font-weight: 800;
    font-size: 1rem;
    cursor: pointer; 
    display: flex; 
    align-items: center; 
    justify-content: center; 
    gap: 10px;
  }

  .btn-manage:hover {
    filter: brightness(1.1);
    box-shadow: 0 4px 12px rgba(225, 29, 72, 0.3);
  }

  /* EL FONDO OSCURO: Debe cubrir TODA la pantalla */
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(15, 23, 42, 0.7); /* Oscurecemos más el fondo */
  backdrop-filter: blur(4px); /* Efecto de desenfoque */
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000; /* Por encima de todo */
  padding: 20px;
}

/* EL CONTENEDOR: Debe tener un tamaño controlado */
.modal-content {
  width: 100%;
  max-width: 500px; /* Evita que se estire como en la imagen */
  background: var(--bg-panel);
  border-radius: var(--radius-lg);
  padding: 35px;
  box-shadow: var(--shadow-3d);
  animation: scaleIn 0.2s ease-out;
  border-top: 5px solid var(--primary); /* El toque rojizo */
}

.modal-content h2 {
  margin: 0 0 25px 0;
  font-size: 1.5rem;
  color: var(--text-main);
  font-weight: 800;
}

/* LOS CAMPOS: Espaciado vertical */
.form-group {
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-muted);
}

/* FILA DE FECHAS: Una al lado de la otra */
.form-row {
  display: flex;
  gap: 15px;
  margin-bottom: 25px;
}

.form-group.half {
  flex: 1;
}

/* ACCIONES: Botones alineados a la derecha */
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 10px;
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

/* --- ESTILOS DE LA BARRA DE BÚSQUEDA --- */
  .toolbar-circuitos {
    display: flex;
    gap: 20px;
    padding: 15px 25px;
    margin-bottom: 30px;
    align-items: center;
    background: var(--bg-panel);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
  }

  .search-box {
    flex: 1;
    display: flex;
    align-items: center;
    background: var(--bg-app);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    padding: 0 15px;
    transition: all 0.2s ease;
  }

  .search-box:focus-within {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(225, 29, 72, 0.1);
  }

  .search-icon {
    color: var(--text-muted);
    margin-right: 12px;
  }

  .search-input {
    width: 100%;
    border: none;
    background: transparent;
    padding: 12px 0;
    color: var(--text-main);
    outline: none;
    font-size: 0.95rem;
  }

  .filter-group {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .filter-label {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .filter-select {
    background: var(--bg-app);
    color: var(--text-main);
    border: 1px solid var(--border-color);
    padding: 10px 15px;
    border-radius: var(--radius-sm);
    font-size: 0.9rem;
    font-weight: 600;
    outline: none;
    cursor: pointer;
    transition: border-color 0.2s;
  }

  .filter-select:hover {
    border-color: var(--primary);
  }

  /* Contenedor padre para alinear ambos bloques */
  .controles-circuitos {
    display: flex;
    gap: 15px; /* Espacio entre los dos bloques */
    margin-bottom: 35px;
    align-items: stretch;
  }

  /* BLOQUE DE BÚSQUEDA INDEPENDIENTE */
  .search-container {
    flex: 1; /* Toma todo el espacio disponible */
    display: flex;
    align-items: center;
    padding: 0 20px;
    background: var(--bg-panel);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    transition: all 0.2s ease;
  }

  .search-container:focus-within {
    border-color: var(--primary);
    box-shadow: var(--shadow-md);
  }

  .search-icon { color: var(--text-muted); margin-right: 12px; }

  .search-input {
    width: 100%;
    border: none;
    background: transparent;
    padding: 14px 0;
    color: var(--text-main);
    outline: none;
    font-size: 1rem;
  }

  /* BLOQUE DE FILTRO INDEPENDIENTE */
  .filter-container {
    display: flex;
    flex-direction: column; /* Apilamos la etiqueta sobre el select para un look más Pro */
    justify-content: center;
    padding: 8px 20px;
    background: var(--bg-panel);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    min-width: 160px;
  }

  .filter-label {
    font-size: 0.65rem;
    font-weight: 800;
    color: var(--primary);
    text-transform: uppercase;
    letter-spacing: 0.8px;
    margin-bottom: 2px;
  }

  .filter-select {
    background: transparent;
    color: var(--text-main);
    border: none;
    font-size: 0.9rem;
    font-weight: 700;
    outline: none;
    cursor: pointer;
    padding: 0;
  }

  .toolbar-modular {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 20px;
    margin-bottom: 35px;
  }

  /* Buscador tipo Píldora */
  .search-pill {
    flex: 1;
    display: flex;
    align-items: center;
    padding: 0 20px;
    height: 50px;
    background: var(--bg-panel);
    border: 1px solid var(--border-color);
    border-radius: 50px; /* Forma de píldora como en la imagen */
    transition: all 0.2s ease;
  }

  .search-pill:focus-within {
    border-color: var(--primary);
    box-shadow: var(--shadow-md);
  }

  .search-icon { color: var(--text-muted); margin-right: 12px; }

  .search-input {
    width: 100%;
    border: none;
    background: transparent;
    color: var(--text-main);
    outline: none;
    font-size: 0.95rem;
  }

  /* Contenedor de filtros a la derecha */
  .filters-aside {
    display: flex;
    gap: 12px;
  }

  .filter-item {
    background: var(--bg-panel);
    border: 1px solid var(--border-color);
    border-radius: 12px; /* Redondeado más suave */
    padding: 0 15px;
    height: 50px;
    display: flex;
    align-items: center;
    transition: border-color 0.2s;
  }

  .filter-item:hover {
    border-color: var(--primary);
  }

  .minimal-select {
    background: transparent;
    color: var(--text-main);
    border: none;
    font-size: 0.9rem;
    font-weight: 600;
    outline: none;
    cursor: pointer;
    padding-right: 10px;
  }
</style>
