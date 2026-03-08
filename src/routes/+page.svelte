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
    <button class="btn-global btn-primary" on:click={() => mostrandoModal = true}>
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

<style>
  .dashboard-circuitos { max-width: 1200px; margin: 0 auto; }
  .header-section { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 40px; }
  .header-section h1 { margin: 0; font-size: 2rem; font-weight: 800; color: #0f172a; }
  .btn-primary { background-color: #1d4ed8; color: white; border: none; padding: 10px 20px; }
  
  .grid-circuitos { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 30px; }

  .rassembly-card { 
    display: flex; 
    flex-direction: column; 
    padding: 0; 
    overflow: hidden; 
    min-height: 300px;
    transition: all 0.3s ease;
    border: 1px solid #e2e8f0;
    /* BORDE SUPERIOR COLOREADO */
    border-top: 4px solid var(--primary); 
  }
  
  .rassembly-card:hover { 
    transform: translateY(-8px);
    box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1);
    border-color: #cbd5e1;
    border-top-color: #be123c; /* Tono un poco más oscuro al hacer hover */
  }

  /* ESTILO DEL ENCABEZADO */
  .card-header { padding: 25px 30px 0 30px; }
  .top-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
  .header-divider { height: 1px; background-color: #e2e8f0; width: 100%; }

  .card-content { padding: 10px 30px 30px 30px; flex: 1; display: flex; flex-direction: column; }

  .circuit-icon { color: var(--primary); opacity: 0.8; }

  .badge-status { display: inline-block; padding: 6px 16px; border-radius: 20px; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; }
  .badge-actual { background: #1e3a8a; color: white; }
  .badge-futuro { background: #f59e0b; color: white; }
  .badge-anterior { background: #64748b; color: white; }

  .circuit-title { margin: 15px 0 20px 0; font-size: 1.6rem; font-weight: 900; color: #0f172a; text-transform: uppercase; }
  
  .info-container { display: flex; flex-direction: column; gap: 12px; }
  .meta-row { display: flex; align-items: center; gap: 10px; font-size: 0.95rem; color: #475569; font-weight: 500; }

  .actions-wrapper {
    height: 75px; background: #f8fafc; border-top: 1px solid #f1f5f9;
    display: flex; align-items: center; padding: 0 30px; opacity: 0; transition: opacity 0.3s ease;
  }

  .rassembly-card:hover .actions-wrapper { opacity: 1; }

  .card-actions { display: flex; gap: 15px; width: 100%; }
  
  .btn-delete { 
    width: 48px; height: 48px; border-radius: 12px; border: none; 
    background: #fee2e2; color: #ef4444; cursor: pointer; 
    display: flex; align-items: center; justify-content: center;
  }

  .btn-manage { 
    flex: 1; height: 48px; border-radius: 12px; border: none; 
    background: #1d4ed8; color: white; font-weight: 800;
    cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px;
  }
</style>
