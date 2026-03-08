<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { Plus, MapPin, Calendar, Users, Trash2, ArrowRight, Map } from "lucide-svelte";
  
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
  
  let nuevoNombre = "";
  let nuevasEtiquetas = "";
  let nuevaFechaInicio = "";
  let nuevaFechaFin = "";

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

  <div class="grid-circuitos">
    {#each circuitos as circuito}
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
</style>
