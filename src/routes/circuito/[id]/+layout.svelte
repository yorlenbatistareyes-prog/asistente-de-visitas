<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { Users, UserSquare, ArrowLeft } from 'lucide-svelte';
  
  import { obtenerCircuitoPorId, obtenerCongregaciones, type Circuito, type Congregacion } from '$lib/services/db';
  import PanelEstadisticasCircuito from "$lib/components/PanelEstadisticasCircuito.svelte";

  $: idCircuito = Number($page.params.id);
  
  let circuito: Circuito | null = null;
  let listaCongregaciones: Congregacion[] = []; 

  async function cargarDatos() {
    if (!idCircuito) return;
    
    // 1. Cargamos el circuito
    circuito = await obtenerCircuitoPorId(idCircuito);
    
    if (circuito) {
      // 2. Cargamos las congregaciones directo desde Rust, ¡sin mapeos raros!
      listaCongregaciones = await obtenerCongregaciones(circuito.nombre);
      console.log("Datos listos para el Panel:", listaCongregaciones);
    }
  }

  onMount(cargarDatos);

  // Si el ID de la URL cambia (ej. cambias de circuito), recargamos todo
  $: if (idCircuito) {
    cargarDatos();
  }

  // Si detectamos que entramos a una congregación y volvemos (cambio de ruta), 
  // refrescamos la lista para captar nuevas revisiones archivadas.
  $: if ($page.url.pathname) {
     cargarDatos();
  }
</script>

<div class="circuito-layout">
  <header class="card-global circuito-header">
    <div class="top-area">
      <a href="/" class="btn-back">
        <ArrowLeft size={16} /> Volver a Circuitos
      </a>
    </div>

    <div class="title-area">
      <h2>{circuito ? circuito.nombre : 'Cargando...'}</h2>
      {#if circuito?.etiquetas}
        <span class="badge">{circuito.etiquetas}</span>
      {/if}
    </div>

    <div class="panel-wrapper">
      <PanelEstadisticasCircuito {listaCongregaciones} />
    </div>

    <nav class="tabs-container">
      <a 
        href={`/circuito/${idCircuito}/congregaciones`} 
        class="tab" 
        class:active={$page.url.pathname.includes('/congregaciones')}
      >
        <Users size={16} /> Congregaciones
      </a>
      
      <a 
        href={`/circuito/${idCircuito}/personas`} 
        class="tab" 
        class:active={$page.url.pathname.includes('/personas')}
      >
        <UserSquare size={16} /> Registro de Personas
      </a>
    </nav>
  </header>

  <main class="circuito-content">
    <slot />
  </main>
</div>

<style>
  .circuito-layout {
    display: flex;
    flex-direction: column;
    gap: 20px;
    animation: fadeIn 0.3s ease-out;
    max-width: 1200px;
    margin: 0 auto;
    width: 100%;
  }

  .circuito-header {
    padding: 20px 30px 0 30px; 
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .btn-back {
    display: inline-flex; align-items: center; gap: 6px;
    text-decoration: none; color: var(--text-muted); font-weight: 600;
    font-size: 0.85rem; transition: 0.2s;
  }
  .btn-back:hover { color: var(--text-main); }

  .title-area {
    display: flex; align-items: center; gap: 15px; margin-bottom: 5px;
  }
  .title-area h2 { margin: 0; font-size: 1.8rem; color: var(--text-main); }
  
  .badge {
    background: #f1f5f9; color: #475569; font-size: 0.75rem; font-weight: 700;
    padding: 4px 10px; border-radius: 20px;
  }

  /* Contenedor para darle respiro al panel dentro de la cabecera */
  .panel-wrapper {
    margin-bottom: 5px;
  }

  .tabs-container {
    display: flex; gap: 20px; border-bottom: 2px solid var(--border-color);
  }

  .tab {
    display: flex; align-items: center; gap: 8px;
    text-decoration: none; color: var(--text-muted); font-weight: 600;
    font-size: 0.95rem; padding: 12px 0; border-bottom: 3px solid transparent;
    margin-bottom: -2px; 
    transition: all 0.2s;
  }

  .tab:hover { color: var(--text-main); }

  .tab.active {
    color: var(--primary);
    border-bottom-color: var(--primary);
  }

  .circuito-content {
    padding-top: 10px;
  }

  @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
</style>