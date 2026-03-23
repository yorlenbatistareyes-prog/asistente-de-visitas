<script lang="ts">
  import TopBar from '$lib/components/layout/TopBar.svelte';
  import BarraDeEstado from '$lib/components/layout/BarraDeEstado.svelte';
  import '../app.css';
</script>

<div class="app-container">
  <TopBar />
  
  <main class="main-content">
    <slot />
  </main>

  <BarraDeEstado />

</div>

<style>
  /* 1. EL MARCO DE LA APP: No se mueve nunca */
  .app-container { 
    display: flex; 
    flex-direction: column; 
    height: 100dvh; /* Altura dinámica para móviles */
    width: 100vw;   /* Ancho exacto de la ventana */
    overflow: hidden; /* 🌟 EVITA EL SCROLL LATERAL DE LAS BARRAS */
    position: relative;
  }

  /* 2. EL CONTENIDO: Es el único que tiene permiso de hacer scroll */
  .main-content { 
    flex: 1; /* Ocupa todo el espacio disponible entre las barras */
    overflow-y: auto; /* Scroll vertical normal */
    overflow-x: auto; /* 🌟 SI ALGO ES MUY ANCHO, EL SCROLL SUCEDE AQUÍ DENTRO */
    background: var(--bg-app); 
    width: 100%;
    box-sizing: border-box;
    
    /* Espacio inferior para que la barra de estado no tape el contenido final */
    padding-bottom: 40px; 
  }

  /* Opcional: Centrado del contenido en pantallas gigantes */
  :global(.main-content > slot) {
    display: block;
    width: 100%;
    max-width: 1600px;
    margin: 0 auto;
  }

  /* Ajustes de padding para el contenido según el dispositivo */
  @media (max-width: 768px) {
    .main-content { padding: 15px 15px 50px 15px; }
  }
</style>