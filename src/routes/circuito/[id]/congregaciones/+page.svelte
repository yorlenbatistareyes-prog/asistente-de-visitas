<h1>Congregaciones</h1>
<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { 
    MapPin, ChevronRight, Plus, FileText, Settings, 
    Pencil, Trash2, AlertCircle, LayoutGrid 
  } from "lucide-svelte";
  
  import { fechaPorCongregacion } from '$lib/stores/appStore';
  import NuevaCongregacionModal from "$lib/components/modals/NuevaCongregacionModal.svelte";

  import { 
    obtenerCircuitoPorId, 
    obtenerCongregaciones, 
    guardarCongregacion, 
    eliminarCongregacion,
    type Circuito,
    type Congregacion 
  } from '$lib/services/db';

  // Extraemos el ID del circuito de la URL
  $: idCircuito = Number($page.params.id);

  // --- ESTADO LOCAL ---
  let circuitoActual: Circuito | null = null;
  let seleccionado = ""; 
  let lista: Congregacion[] = [];
  let mostrarModal = false;
  let mostrarMenuConfig = false;
  let datosEdicion: Congregacion | null = null;

  // --- CARGA DE DATOS ---
  async function cargarDatos() {
    // 1. Buscamos el circuito real en la base de datos
    circuitoActual = await obtenerCircuitoPorId(idCircuito);
    
    if (circuitoActual) {
      // 2. Buscamos solo las congregaciones de este circuito
      lista = await obtenerCongregaciones(circuitoActual.nombre);

      // 3. Auto-seleccionar la primera congregación si la lista no está vacía
      if (lista.length > 0 && !lista.find(c => c.nombre === seleccionado)) {
        seleccionado = lista[0].nombre;
      } else if (lista.length === 0) {
        seleccionado = "";
      }
    }
  }

  onMount(cargarDatos);

  // Reactividad: Si la URL cambia, recargamos los datos
  $: if (idCircuito) {
    cargarDatos();
  }

  // --- ACCIONES ---
  function seleccionarCongregacion(nombre: string) {
    seleccionado = nombre;
    mostrarMenuConfig = false;
  }

  function abrirModal() {
    datosEdicion = null;
    mostrarModal = true;
  }

  function irAAnálisis() {
    if (seleccionado) {
      // Te lleva a la vista de "Enfoque" a pantalla completa
      goto(`/congregacion/${seleccionado}`);
    }
  }

  async function borrarCongregacionActual() {
    const cong = lista.find(c => c.nombre === seleccionado);
    if (cong && cong.id) {
      if (confirm(`¿Estás seguro de eliminar ${cong.nombre}? Se perderá su historial.`)) {
        await eliminarCongregacion(cong.id);
        seleccionado = "";
        await cargarDatos();
        mostrarMenuConfig = false;
      }
    }
  }
</script>

<div class="dashboard-layout">
  <aside class="sidebar-cong card-global">
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
                <p class="fecha">{$fechaPorCongregacion[cong.nombre] || "Sin visitas"}</p>
              </div>
              <ChevronRight size={14} />
            </button>
          {/each}
        {:else}
          <div class="empty-list-msg">
            <p>No hay congregaciones en este circuito.</p>
          </div>
        {/if}
      </div>
    </div>
    <button class="add-btn btn-global" on:click={abrirModal}>
      <Plus size={16} /> Nueva Congregación
    </button>
  </aside>

  <main class="main-panel">
    <div class="header-cong">
      {#if seleccionado}
        <h2>{seleccionado}</h2>
        <div class="config-wrapper">
          <button class="btn-global" on:click={() => mostrarMenuConfig = !mostrarMenuConfig}>
            <Settings size={14} /> Gestión
          </button>
          {#if mostrarMenuConfig}
            <div class="config-menu card-global">
              <button on:click={() => { /* lógica editar */ }}><Pencil size={14} /> Editar Datos</button>
              <button class="danger" on:click={borrarCongregacionActual}><Trash2 size={14} /> Eliminar</button>
            </div>
          {/if}
        </div>
      {:else}
        <h2>Panel del Circuito</h2>
      {/if}
    </div>

    {#if seleccionado}
      <div class="grid-section">
        <h4 class="section-title">Análisis y Seguimiento</h4>
        <div class="grid">
          <button class="card card-global highlight" on:click={irAAnálisis}>
            <div class="icon-wrap highlight">
              <FileText size={30} />
            </div>
            <div class="text">
              <h3>Informes de Visita</h3>
              <span>Realizar análisis o ver historial</span>
            </div>
          </button>
        </div>
      </div>
    {:else}
      <div class="guide-msg card-global">
        {#if lista.length === 0}
          <AlertCircle size={40} color="#e11d48" />
          <p><strong>Circuito Vacío.</strong><br>Añade tu primera congregación usando el botón del panel lateral.</p>
        {:else}
          <LayoutGrid size={40} color="#cbd5e1" />
          <p>Selecciona una congregación del menú izquierdo para gestionar sus informes.</p>
        {/if}
      </div>
    {/if}
  </main>
</div>

{#if mostrarModal}
  <NuevaCongregacionModal 
    {datosEdicion}
    on:close={() => { mostrarModal = false; }}
    on:save={async (e: CustomEvent) => {
      const nuevaCongregacion = e.detail;
      
      // Le inyectamos automáticamente el nombre del circuito actual
      if (circuitoActual) {
        nuevaCongregacion.circuito = circuitoActual.nombre;
        await guardarCongregacion(nuevaCongregacion);
        
        mostrarModal = false;
        await cargarDatos();
        seleccionado = nuevaCongregacion.nombre.toUpperCase();
      }
    }}
  />
{/if}

<style>
  /* Aprovechamos todo el alto restante debajo de las pestañas */
  .dashboard-layout { 
    display: flex; gap: 20px; height: calc(100vh - 200px); box-sizing: border-box; 
  }

  .sidebar-cong { 
    width: 260px; padding: 20px; display: flex; flex-direction: column; height: 100%;
  }

  .label-box { 
    display: flex; align-items: center; gap: 5px; color: var(--text-muted); 
    font-size: 10px; font-weight: 800; margin-bottom: 15px; text-transform: uppercase;
  }

  .scroll-area { flex: 1; overflow-y: auto; padding-right: 5px; }
  
  .item { 
    width: 100%; display: flex; justify-content: space-between; align-items: center; 
    padding: 12px; border: none; background: none; border-radius: 8px; 
    color: var(--text-muted); cursor: pointer; transition: 0.2s; margin-bottom: 4px;
  }

  .item:hover { background: var(--bg-app); }
  .item.active { background: #fff1f2; color: var(--primary); }

  .item-text { text-align: left; }
  .fecha { font-size: 11px; opacity: 0.7; margin: 2px 0 0 0; }

  .add-btn { 
    color: var(--primary); border-style: dashed; border-color: #fecaca; margin-top: 10px; width: 100%;
  }
  .add-btn:hover:not(:disabled) { border-color: var(--primary); }

  .main-panel { flex: 1; background: transparent; }

  .header-cong { display: flex; align-items: center; justify-content: space-between; margin-bottom: 25px; }
  .header-cong h2 { margin: 0; font-size: 1.5rem; color: var(--text-main); }

  .config-wrapper { position: relative; }
  .config-menu {
    position: absolute; top: 110%; right: 0; padding: 5px; display: flex; 
    flex-direction: column; width: 160px; z-index: 10;
  }
  .config-menu button {
    display: flex; align-items: center; gap: 10px; padding: 10px; 
    background: none; border: none; width: 100%; text-align: left; 
    cursor: pointer; border-radius: 6px; font-size: 0.9rem; color: var(--text-muted);
  }
  .config-menu button:hover { background: var(--bg-app); color: var(--text-main); }
  .config-menu button.danger { color: var(--primary); }

  .section-title { font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 15px; }
  
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }

  .card { padding: 24px; display: flex; align-items: center; gap: 20px; text-align: left; }
  .card.highlight { border-color: #fecaca; background: #fff1f2; }
  .card.highlight:hover { border-color: #fda4af; }

  .icon-wrap.highlight { background: #fecaca; color: var(--primary); padding: 12px; border-radius: 12px; }

  .guide-msg { 
    display: flex; flex-direction: column; align-items: center; text-align: center; 
    padding: 60px; color: var(--text-muted); border-style: dashed;
  }
</style>
