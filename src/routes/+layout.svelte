<script lang="ts">
  import { onMount } from 'svelte';
  // Importamos los stores necesarios, incluyendo mostrarCircuitBar
  import { circuitoActivo, listaCongregaciones, mostrarCircuitBar } from '$lib/stores/appStore';
  import { cargarDatos } from '$lib/persistencia';
  import TopBar from '$lib/components/layout/TopBar.svelte';
  import CircuitBar from '$lib/components/layout/CircuitBar.svelte';

  // Al montar el layout (cuando se abre la app en Windows)
  onMount(async () => {
    try {
      await cargarDatos();
      console.log("Datos de visitas cargados correctamente");
    } catch (e) {
      console.error("Error al cargar persistencia:", e);
    }
  });
</script>

<div class="app-container">
  <TopBar />

  <!-- CONDICIÓN: Solo mostrar CircuitBar si mostrarCircuitBar es true -->
  {#if $mostrarCircuitBar}
    <CircuitBar />
  {/if}

  <main class="main-content">
    <slot />
  </main>
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
  }

  .main-content {
    flex: 1;
    background: #f4f4f4;
    overflow-y: auto; 
    display: flex;
    flex-direction: column;
  }
</style>