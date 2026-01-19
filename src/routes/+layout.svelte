<script lang="ts">
  import { onMount } from 'svelte';
  import { circuitoActivo, listaCongregaciones, mostrarCircuitBar } from '$lib/stores/appStore';
  import { cargarDatos } from '$lib/persistencia';
  
  // Componentes de Layout
  import TopBar from '$lib/components/layout/TopBar.svelte';
  import CircuitBar from '$lib/components/layout/CircuitBar.svelte';

  // --- CORRECCIÓN DE LA RUTA ---
  // Antes: import ... from '$lib/modals/...' (Mal)
  // Ahora: Agregamos '/components/' a la ruta
  import ConfiguracionGlobalModal from '$lib/components/modals/ConfiguracionGlobalModal.svelte';

  let mostrarConfig = false;

  onMount(async () => {
    try {
      await cargarDatos();
      console.log("Datos cargados.");
    } catch (e) {
      console.error("Error persistencia:", e);
    }
  });
</script>

<div class="app-container">
  <TopBar on:abrirConfig={() => mostrarConfig = true} />

  {#if $mostrarCircuitBar}
    <CircuitBar />
  {/if}

  <main class="main-content">
    <slot />
  </main>

  {#if mostrarConfig}
    <ConfiguracionGlobalModal on:close={() => mostrarConfig = false} />
  {/if}
</div>

<style>
  :global(body, html) {
    margin: 0;
    padding: 0;
    height: 100vh;
    overflow: hidden; 
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    color: #1a1a1a;
  }

  :global(input, button, select, textarea) {
    font-family: inherit;
  }

  .app-container {
    display: flex;
    flex-direction: column;
    height: 100vh; 
    width: 100%;
    position: relative; /* Importante para que el modal se posicione bien */
  }

  .main-content {
    flex: 1;
    background: #f4f4f4;
    overflow-y: auto; 
    display: flex;
    flex-direction: column;
  }
</style>