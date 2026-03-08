<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { Plus, Map, Calendar } from "lucide-svelte";
  import { obtenerTodosLosCircuitos, crearCircuito, type Circuito } from '$lib/services/db';

  let circuitos: Circuito[] = [];
  let mostrandoModal = false;
  
  // Variables para el formulario del nuevo circuito
  let nuevoNombre = "";
  let nuevasEtiquetas = "";

  async function cargarCircuitos() {
    circuitos = await obtenerTodosLosCircuitos();
  }

  onMount(cargarCircuitos);

  async function guardarNuevoCircuito() {
    if (!nuevoNombre.trim()) return;
    
    try {
      await crearCircuito(nuevoNombre, nuevasEtiquetas);
      
      // Limpiamos y cerramos el modal
      mostrandoModal = false;
      nuevoNombre = "";
      nuevasEtiquetas = "";
      
      // Recargamos la lista para ver la nueva tarjeta
      await cargarCircuitos();

    } catch (error) {
      // 🚨 EL CHIVATO: Esto nos dirá exactamente qué está fallando
      alert("❌ Error al guardar el circuito:\n" + error);
      console.error("Detalle del error:", error);
    }
  }

  function entrarAlCircuito(id: number) {
    // Aquí es donde ocurre la magia de la navegación Maestro-Detalle
    goto(`/circuito/${id}/congregaciones`);
  }
</script>

<div class="dashboard-circuitos">
  <div class="header-section">
    <div>
      <h1>Tus Circuitos</h1>
      <p>Selecciona un circuito para gestionar sus congregaciones e informes.</p>
    </div>
    <button class="btn-global btn-primary" on:click={() => mostrandoModal = true}>
      <Plus size={18} /> Nuevo Circuito
    </button>
  </div>

  <div class="grid-circuitos">
    {#each circuitos as circuito}
      <button class="card-global circuito-card" on:click={() => entrarAlCircuito(circuito.id!)}>
        <div class="card-icon">
          <Map size={32} />
        </div>
        <div class="card-info">
          <h3>{circuito.nombre}</h3>
          {#if circuito.etiquetas}
            <span class="badge">{circuito.etiquetas}</span>
          {/if}
          <div class="date-row">
            <Calendar size={12} /> Creado el {circuito.fechaCreacion}
          </div>
        </div>
      </button>
    {/each}

    {#if circuitos.length === 0}
      <div class="card-global empty-state">
        <Map size={48} color="#cbd5e1" />
        <p>Aún no tienes circuitos registrados.<br>Haz clic en "Nuevo Circuito" para comenzar.</p>
      </div>
    {/if}
  </div>
</div>

{#if mostrandoModal}
  <div class="modal-backdrop">
    <div class="card-global modal-content">
      <h2>Crear Nuevo Circuito</h2>
      
      <div class="form-group">
        <label for="nombre">Nombre del Circuito</label>
        <input 
          id="nombre"
          type="text" 
          class="input-global" 
          placeholder="Ej: Holguín-14" 
          bind:value={nuevoNombre}
        />
      </div>

      <div class="form-group">
        <label for="etiquetas">Etiqueta o Identificador (Opcional)</label>
        <input 
          id="etiquetas"
          type="text" 
          class="input-global" 
          placeholder="Ej: Zona Norte" 
          bind:value={nuevasEtiquetas}
        />
      </div>

      <div class="modal-actions">
        <button class="btn-global" on:click={() => mostrandoModal = false}>Cancelar</button>
        <button class="btn-global btn-primary" on:click={guardarNuevoCircuito}>Guardar</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .dashboard-circuitos {
    max-width: 1200px;
    margin: 0 auto;
    animation: fadeIn 0.3s ease-out;
  }

  .header-section {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 40px;
  }

  .header-section h1 { margin: 0 0 5px 0; font-size: 2rem; color: var(--text-main); }
  .header-section p { margin: 0; color: var(--text-muted); }

  .btn-primary {
    background-color: var(--primary);
    color: white;
    border: none;
  }
  .btn-primary:hover { background-color: #be123c; color: white; }

  .grid-circuitos {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 25px;
  }

  .circuito-card {
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 25px;
    text-align: left;
    cursor: pointer;
    border: 2px solid transparent;
  }

  .circuito-card:hover {
    border-color: #fecaca;
  }

  .card-icon {
    background: #fff1f2;
    color: var(--primary);
    padding: 15px;
    border-radius: 12px;
  }

  .card-info h3 { margin: 0 0 8px 0; font-size: 1.3rem; color: var(--text-main); }
  
  .badge {
    display: inline-block;
    background: #f1f5f9;
    color: #475569;
    font-size: 0.75rem;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 20px;
    margin-bottom: 10px;
  }

  .date-row {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .empty-state {
    grid-column: 1 / -1;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 60px;
    border-style: dashed;
    color: var(--text-muted);
  }

  /* ESTILOS DEL MODAL */
  .modal-backdrop {
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(4px);
    display: flex; justify-content: center; align-items: center; z-index: 1000;
  }

  .modal-content {
    width: 100%; max-width: 450px; padding: 30px;
  }

  .modal-content h2 { margin: 0 0 20px 0; font-size: 1.5rem; }

  .form-group { margin-bottom: 20px; }
  .form-group label { display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-muted); margin-bottom: 8px; }

  .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 30px; }

  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>
