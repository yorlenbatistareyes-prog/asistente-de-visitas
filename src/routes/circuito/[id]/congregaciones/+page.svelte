<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { Plus, Users, MapPin, Calendar } from "lucide-svelte";
  
  import { fechaPorCongregacion } from '$lib/stores/appStore';
  import NuevaCongregacionModal from "$lib/components/modals/NuevaCongregacionModal.svelte";

  import { 
    obtenerCircuitoPorId, 
    obtenerCongregaciones, 
    guardarCongregacion, 
    type Circuito,
    type Congregacion 
  } from '$lib/services/db';

  $: idCircuito = Number($page.params.id);

  // --- ESTADO LOCAL ---
  let circuitoActual: Circuito | null = null;
  let lista: Congregacion[] = [];
  let mostrarModal = false;
  let datosEdicion: Congregacion | null = null;

  // --- CARGA DE DATOS ---
  async function cargarDatos() {
    circuitoActual = await obtenerCircuitoPorId(idCircuito);
    if (circuitoActual) {
      lista = await obtenerCongregaciones(circuitoActual.nombre);
    }
  }

  onMount(cargarDatos);

  $: if (idCircuito) {
    cargarDatos();
  }

  // --- ACCIONES ---
  function abrirModal() {
    datosEdicion = null;
    mostrarModal = true;
  }

  function entrarACongregacion(nombre: string) {
    // Al hacer clic en la tarjeta, nos vamos a la vista de Enfoque
    goto(`/congregacion/${nombre}`);
  }
</script>

<div class="congregaciones-layout">
  <div class="header-section">
    <div>
      <h3>Congregaciones</h3>
      <p>Añade y selecciona una congregación para gestionar sus informes.</p>
    </div>
    <button class="btn-global btn-primary" on:click={abrirModal}>
      <Plus size={18} /> Añadir Congregación
    </button>
  </div>

  <div class="grid-congregaciones">
    {#each lista as cong}
      <button class="card-global cong-card" on:click={() => entrarACongregacion(cong.nombre)}>
        <div class="card-icon">
          <Users size={30} />
        </div>
        <div class="card-info">
          <h4>{cong.nombre}</h4>
          
          <div class="meta-row">
            <MapPin size={12} /> 
            <span>{cong.ciudad || 'Ciudad no especificada'}</span>
          </div>
          
          <div class="meta-row">
            <Calendar size={12} /> 
            <span>Última visita: {$fechaPorCongregacion[cong.nombre] || "Sin registrar"}</span>
          </div>
        </div>
      </button>
    {/each}

    {#if lista.length === 0}
      <div class="card-global empty-state">
        <Users size={48} color="#cbd5e1" />
        <p>Aún no hay congregaciones en este circuito.<br>Haz clic en "Añadir Congregación" para crear la primera.</p>
      </div>
    {/if}
  </div>
</div>

{#if mostrarModal}
  <NuevaCongregacionModal 
    {datosEdicion}
    on:close={() => { mostrarModal = false; }}
    on:save={async (e) => {
      const nuevaCongregacion = e.detail;
      
      if (circuitoActual) {
        nuevaCongregacion.circuito = circuitoActual.nombre;
        await guardarCongregacion(nuevaCongregacion);
        
        mostrarModal = false;
        await cargarDatos(); // Recarga la cuadrícula al instante
      }
    }}
  />
{/if}

<style>
  .congregaciones-layout {
    animation: fadeIn 0.3s ease-out;
  }

  .header-section {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 30px;
    margin-top: 10px;
  }

  .header-section h3 { margin: 0 0 5px 0; font-size: 1.5rem; color: var(--text-main); }
  .header-section p { margin: 0; color: var(--text-muted); font-size: 0.9rem; }

  .btn-primary {
    background-color: var(--primary);
    color: white;
    border: none;
  }
  .btn-primary:hover { background-color: #be123c; color: white; }

  .grid-congregaciones {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
  }

  .cong-card {
    display: flex;
    align-items: center;
    gap: 15px;
    padding: 20px;
    text-align: left;
    cursor: pointer;
    border: 2px solid transparent;
  }

  .cong-card:hover { border-color: #fecaca; }

  .card-icon {
    background: #f1f5f9;
    color: var(--text-muted);
    padding: 15px;
    border-radius: 12px;
    transition: all 0.2s;
  }

  .cong-card:hover .card-icon {
    background: #fff1f2;
    color: var(--primary);
  }

  .card-info { flex: 1; }
  .card-info h4 { margin: 0 0 10px 0; font-size: 1.15rem; color: var(--text-main); }

  .meta-row {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.8rem;
    color: var(--text-muted);
    margin-bottom: 5px;
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

  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>
