<script lang="ts">
  import TopBar from '$lib/TopBar.svelte';
</script>

<div class="app-container">
  <TopBar />
  <main class="main-content">
    <slot />
  </main>
</div>

<style>
  /* ELIMINA MÁRGENES DE TODA LA WEB */
  :global(body, html) {
    margin: 0 !important;
    padding: 0 !important;
    width: 100%;
    height: 100%;
    overflow: hidden;
    /* Fuente profesional: Inter, luego Segoe UI (Windows), luego San Francisco (Mac) */
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    /* Esto hace que las letras se vean más finas y definidas */
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
    background: #f4f4f4;
    overflow-y: auto;
  }
</style>