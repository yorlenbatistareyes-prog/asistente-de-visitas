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
  /* CONTENEDOR PRINCIPAL */
  .app-container { 
    display: flex; 
    flex-direction: column; 
    height: 100vh; /* Respaldo para navegadores antiguos */
    height: 100dvh; /* ¡CLAVE MÓVIL! Se adapta si el teclado o la barra de URL aparecen */
    width: 100%; 
    overflow-x: hidden; /* Evita que la pantalla se mueva hacia los lados por error */
  }

  /* ÁREA DE CONTENIDO */
  .main-content { 
    flex: 1; 
    overflow-y: auto; 
    overflow-x: hidden;
    background: var(--bg-app); 
    padding: 30px; 
    box-sizing: border-box;
    width: 100%;
    
    /* Centra el contenido en pantallas ultra anchas para que no se estire de más */
    margin: 0 auto; 
    max-width: 1600px;
  }

  /* =============================================
     DISEÑO RESPONSIVO (Tablets y Móviles)
     ============================================= */

  /* Tablets en horizontal y Laptops pequeñas (hasta 1024px) */
  @media (max-width: 1024px) {
    .main-content {
      padding: 25px 20px; /* Reducimos un poco los lados */
    }
  }

  /* Móviles y Tablets en vertical (hasta 768px) */
  @media (max-width: 768px) {
    .main-content {
      padding: 15px; /* Aprovechamos más el ancho de la pantalla */
    }
  }

  /* Móviles pequeños (hasta 480px) */
  @media (max-width: 480px) {
    .main-content {
      padding: 10px 8px; /* Al límite de los bordes para ganar espacio valioso */
    }
  }
</style>
