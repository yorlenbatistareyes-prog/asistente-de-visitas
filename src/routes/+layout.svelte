<script lang="ts">
  import { onMount } from 'svelte'; // Importamos onMount para ejecutar al iniciar
  import { circuitoActivo, listaCongregaciones } from '$lib/stores/appStore';
  import { cargarDatos } from '$lib/persistencia'; // Importamos la función de carga
  import TopBar from '$lib/components/layout/TopBar.svelte';
  import CircuitBar from '$lib/components/layout/CircuitBar.svelte';

  // Al montar el layout (cuando se abre la app en Windows)
  onMount(async () => {
    try {
      await cargarDatos(); // Leemos el archivo JSON del sistema
      console.log("Datos de visitas cargados correctamente");
    } catch (e) {
      console.error("Error al cargar persistencia:", e);
    }
  });
</script>

<div class="app-container">
  <TopBar />

  <CircuitBar bind:circuitoNombre={$circuitoActivo} />

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
    /* ESTA LÍNEA RECUPERA EL ESTILO ORIGINAL */
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    color: #1a1a1a;
  }

  /* Asegura que los botones y entradas de texto también usen la misma letra */
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