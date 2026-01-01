<script lang="ts">
  import TopBar from '$lib/TopBar.svelte';
  import CircuitBar from '$lib/CircuitBar.svelte';
</script>

<div class="app-container">
  <TopBar />

  <CircuitBar />

  <main class="main-content">
    <slot />
  </main>
</div>

<style>
  /* --- AJUSTE CRÍTICO: permitir que los modales se muestren --- */
  :global(body, html) {
    margin: 0 !important;
    padding: 0 !important;
    width: 100%;
    height: 100%;
    overflow-x: hidden;   /* ← evita cortes horizontales */
    overflow-y: auto;     /* ← permite que el modal se muestre */
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    color: #1a1a1a;
  }

  /* --- AJUSTE: permitir que el modal salga del contenedor --- */
  .app-container {
    display: flex;
    flex-direction: column;
    min-height: 100vh;   /* ← permite crecer si el modal lo necesita */
    width: 100%;
    overflow: visible;   /* ← CLAVE: deja que el modal flote encima */
  }

  .main-content {
    flex: 1;
    background: #f4f4f4;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }
</style>