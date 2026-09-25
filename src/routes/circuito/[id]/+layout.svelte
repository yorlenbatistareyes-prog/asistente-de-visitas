<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { Users, UserSquare, ArrowLeft, Map, Briefcase, BarChart2, Globe } from 'lucide-svelte';
  
  import { obtenerCircuitoPorId, type Circuito } from '$lib/services/db';

  $: idCircuito = Number($page.params.id);
  
  let circuito: Circuito | null = null;

  async function cargarDatos() {
    if (!idCircuito) return;
    
    // Solo cargamos el circuito. Las congregaciones ahora se cargan en la pestaña "registros"
    circuito = await obtenerCircuitoPorId(idCircuito);
  }

  onMount(cargarDatos);

  $: if (idCircuito) {
    cargarDatos();
  }

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

    <nav class="tabs-container">
      <a 
        href={`/circuito/${idCircuito}/congregaciones`} 
        class="tab" 
        class:active={$page.url.pathname.includes('/congregaciones')}
      >
        <Users size={16} /> <span>Congregaciones</span>
      </a>
      
      <a 
        href={`/circuito/${idCircuito}/personas`} 
        class="tab" 
        class:active={$page.url.pathname.includes('/personas')}
      >
        <UserSquare size={16} /> <span>Personas</span>
      </a>

      <a 
        href={`/circuito/${idCircuito}/rutas`} 
        class="tab" 
        class:active={$page.url.pathname.includes('/rutas')}
      >
        <Map size={16} /> <span>Rutas</span>
      </a>

      <a 
        href={`/circuito/${idCircuito}/visitas`} 
        class="tab" 
        class:active={$page.url.pathname.includes('/visitas')}
      >
        <Briefcase size={16} /> <span>Visitas</span>
      </a>

      <a 
        href={`/circuito/${idCircuito}/registros`} 
        class="tab" 
        class:active={$page.url.pathname.includes('/registros')}
      >
        <BarChart2 size={16} /> <span>Registros e Informes</span>
      </a>
      
      <a 
        href={`/circuito/${idCircuito}/mapa`} 
        class="tab" 
        class:active={$page.url.pathname.includes('/mapa')}
      >
        <Globe size={16} /> <span>Mapa</span>
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
    height: 100%;
    min-height: 0;
  }

    .circuito-header {
    padding: 20px 30px 0 30px; 
    display: flex;
    flex-direction: column;
    gap: 15px;
    flex-shrink: 0;
  }

.btn-back {
    display: inline-flex; 
    align-items: center; 
    gap: 6px;
    text-decoration: none; 
    color: var(--text-main); 
    background-color: rgba(100, 116, 139, 0.15); /* Gris más fuerte y visible */
    padding: 6px 14px; 
    border-radius: 20px; 
    font-weight: 700;
    font-size: 0.85rem; 
    transition: all 0.2s ease;
    border: 1px solid rgba(100, 116, 139, 0.3); /* Borde sutil para enmarcarlo */
    width: fit-content;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05); /* Sombra ligera de profundidad */
  }
  
  .btn-back:hover { 
    background-color: rgba(100, 116, 139, 0.25); 
    border-color: rgba(100, 116, 139, 0.4);
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .title-area {
    display: flex; align-items: center; gap: 15px; margin-bottom: 15px;
  }
  .title-area h2 { margin: 0; font-size: 1.8rem; color: var(--text-main); }
  
  .badge {
    background: #f1f5f9; color: #475569; font-size: 0.75rem; font-weight: 700;
    padding: 4px 10px; border-radius: 20px;
  }

  /* Contenedor de pestañas con scroll horizontal oculto para móviles */
  .tabs-container {
    display: flex; gap: 20px; border-bottom: 2px solid var(--border-color);
    overflow-x: auto;
    scrollbar-width: none;
  }
  .tabs-container::-webkit-scrollbar { display: none; }

  .tab {
    display: flex; align-items: center; gap: 8px;
    text-decoration: none; color: var(--text-muted); font-weight: 600;
    font-size: 0.95rem; padding: 12px 0; border-bottom: 3px solid transparent;
    margin-bottom: -2px; transition: all 0.2s;
    white-space: nowrap; /* Evita que el texto se parta en dos líneas */
  }

  .tab:hover { color: var(--text-main); }

  .tab.active {
    color: var(--primary);
    border-bottom-color: var(--primary);
  }

    .circuito-content {
    padding-top: 10px;
    flex: 1;
    overflow-y: auto;
    min-height: 0;
    padding-bottom: 30px;
  }

  @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }

  /* =============================================
     DISEÑO RESPONSIVO MÓVIL OPTIMIZADO
     ============================================= */

  @media (max-width: 768px) {
    /* 1. Reducir padding global de la tarjeta blanca */
    .circuito-header {
      padding: 12px 15px 0 15px !important; 
      margin-bottom: 5px !important;
      gap: 0px !important; /* Quitamos gap para controlar márgenes manualmente */
    }

    /* 2. Reducir margen del botón de volver, pero manteniendo su forma */
    .btn-back {
      padding: 6px 12px !important;
      font-size: 0.8rem;
      margin-bottom: 4px !important;
    }

    /* 3. Alinear Título y Etiqueta en la misma fila */
    .title-area {
      flex-direction: row !important; /* Forzamos horizontal */
      align-items: center !important; /* Centrados verticalmente */
      gap: 10px !important;
      margin-bottom: 8px !important; /* Reducimos espacio antes de pestañas */
    }

    .title-area h2 {
      font-size: 1.4rem; 
      line-height: 1.1;
      margin: 0 !important;
    }
    
    .badge {
      margin: 0 !important;
      padding: 3px 8px;
    }

    /* 4. Ajustar pestañas para que sean más compactas */
    .tabs-container {
      gap: 15px; 
      justify-content: flex-start;
      margin-top: 0 !important;
    }

    .tab {
      padding: 10px 4px 8px 4px !important; 
      font-size: 0.85rem;
    }
  }

  @media (max-width: 480px) {
    .title-area h2 {
      font-size: 1.25rem;
    }
  }

</style>