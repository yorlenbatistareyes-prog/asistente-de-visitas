<script lang="ts">
  import TopBar from '$lib/TopBar.svelte';
  import CircuitBar from '$lib/CircuitBar.svelte'; // Importamos la nueva barra
</script>

<div class="app-container">
  <TopBar />
  
  <CircuitBar /> 
  
  <main class="main-content">
    <slot />
  </main>
</div>

<style>
  /* Mantenemos tus estilos globales intactos para no romper la fuente ni los márgenes */
  :global(body, html) {
    margin: 0 !important;
    padding: 0 !important;
    width: 100%;
    height: 100%;
    overflow: hidden;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    color: #1a1a1a;
  }

  .app-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100%;
  }

  .main-content {
    flex: 1;
    background: #f4f4f4; /* El fondo gris claro que ya tenías */
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }
</style>