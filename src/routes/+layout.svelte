<script lang="ts">
  import TopBar from '$lib/components/layout/TopBar.svelte';
  import '../app.css';
</script>

<div class="app-container">
  <TopBar />

  <main class="main-content">
    <slot />
  </main>
</div>

<style>
  .app-container { 
    display: flex; 
    flex-direction: column; 
    height: 100vh; 
    width: 100%; 
  }

  .main-content { 
    flex: 1; 
    overflow-y: auto; 
    /* Usamos la variable global que definimos para el tema claro/oscuro */
    background: var(--bg-app); 
    padding: 30px; 
    box-sizing: border-box;
  }
</style>
