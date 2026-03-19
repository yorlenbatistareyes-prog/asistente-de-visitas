<script lang="ts">
  import { Settings, Home, Monitor, Sun, Moon } from "lucide-svelte";
  import { createEventDispatcher, onMount } from 'svelte';
  import { currentTheme, applyTheme, type Theme } from '$lib/stores/themeStore';
  import { goto } from '$app/navigation';

  const dispatch = createEventDispatcher();

  // Función para rotar entre los 3 estados: Sistema -> Claro -> Oscuro
  function cambiarTema() {
    currentTheme.update(t => {
      let nuevo: Theme = t === 'system' ? 'light' : t === 'light' ? 'dark' : 'system';
      applyTheme(nuevo);
      return nuevo;
    });
  }

  // Aseguramos que el tema se aplique al iniciar la app
  onMount(() => {
    const unsubscribe = currentTheme.subscribe(t => applyTheme(t));
    return unsubscribe;
  });
</script>

<header class="topbar-container" data-tauri-drag-region>
  <div class="background-layers">
    <div class="white-row"></div>
    <div class="gray-row"></div>
  </div>

  <div class="content-overlay">
    <div class="logo-box">AV</div>
    
    <div class="info-area">
      <div class="text-group">
        <h1>Asistente de Visitas</h1>
        <p>Documenta todas tus visitas</p>
      </div>

      <div class="right-actions">
        <button class="top-btn" on:click={() => goto('/')}>
          <Home size={16} /> <span>Inicio</span>
        </button>

        <button class="icon-btn" on:click={cambiarTema} title="Cambiar tema">
          {#if $currentTheme === 'system'}
            <Monitor size={18} />
          {:else if $currentTheme === 'light'}
            <Sun size={18} />
          {:else}
            <Moon size={18} />
          {/if}
        </button>

        <button class="icon-btn" on:click={() => goto('/configuracion')}>
           <Settings size={18} />
        </button>
        
      </div>
    </div>
  </div>
</header>

<style>
  /* =============================================
     ESTRUCTURA PRINCIPAL (Elástica)
     ============================================= */
  .topbar-container {
    position: relative;
    width: calc(100% - 30px);
    min-height: 100px; /* Cambiado de height a min-height para que pueda crecer */
    margin: 10px auto 0 auto;
    border-radius: 12px 12px 0 0;
    overflow: hidden;
    box-shadow: var(--shadow-md);
    z-index: 100;
  }

  .background-layers {
    position: absolute;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .white-row {
    background: var(--bg-panel);
    flex: 1; /* Esto hace magia: rellena todo el espacio por encima de la franja gris automáticamente */
  }

  .gray-row {
    background: #373737;
    height: 35px;
    flex-shrink: 0; /* Obligamos a que la franja gris siempre mida 35px, pase lo que pase */
  }

  :global(.dark) .gray-row {
    background: #111827;
  }

  .content-overlay {
    position: relative;
    display: flex;
    align-items: flex-start; /* Evita que los elementos se estiren verticalmente */
    width: 100%;
    z-index: 2;
  }

  .logo-box {
    background: var(--primary);
    color: white;
    width: 85px;
    height: 82px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2.5rem;
    font-weight: 600;
    flex-shrink: 0;
  }

  /* La zona de información empujará el contenedor */
  .info-area {
    flex: 1;
    min-height: 65px; /* Altura mínima de la zona blanca */
    display: flex;
    align-items: center;
    padding: 10px 20px;
    justify-content: space-between;
    box-sizing: border-box;
    gap: 15px;
    margin-bottom: 35px; /* ¡CLAVE! Reserva el espacio exacto para la franja gris de abajo */
  }

  .text-group {
    display: flex;
    flex-direction: column;
    justify-content: center;
    flex: 1;
    min-width: 0;
    line-height: 1.2;
  }

  .text-group h1 {
    margin: 0;
    font-size: 1.4rem;
    color: var(--text-main);
    font-weight: 800;
    white-space: normal;
    word-wrap: break-word; /* Si una palabra es muy larga, la rompe seguro */
    line-height: 1.2;
  }

  .text-group p,
  .text-group .subtitulo {
    margin: 0;
    font-size: 0.85rem;
    color: var(--text-muted);
    white-space: normal;
    line-height: 1.2;
    margin-top: 2px;
  }

  .right-actions {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  }

  .top-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    background: var(--bg-panel);
    border: 1px solid var(--border-color);
    padding: 6px 14px;
    border-radius: 8px;
    color: var(--text-main);
    font-weight: 600;
    font-size: 0.85rem;
    cursor: pointer;
    transition: 0.2s;
    white-space: nowrap;
  }

  .top-btn:hover {
    background: var(--bg-app);
    border-color: var(--primary);
  }

  .icon-btn {
    background: none;
    border: 1px solid transparent;
    cursor: pointer;
    color: var(--text-muted);
    padding: 8px;
    border-radius: 50%;
    display: flex;
    transition: 0.2s;
  }

  .icon-btn:hover {
    background: var(--bg-app);
    color: var(--primary);
  }

  /* =============================================
     RESPONSIVE: ajustes para tablets y móviles
     ============================================= */

  /* Tablets (hasta 1024px) */
  @media (max-width: 1024px) {
    .topbar-container {
      width: calc(100% - 20px);
    }
    .info-area {
      padding: 10px 15px;
    }
    .text-group h1 {
      font-size: 1.3rem;
    }
  }

  /* Móviles (hasta 768px) */
  @media (max-width: 768px) {
    .topbar-container {
      width: 100%;
      margin: 0;
      border-radius: 0;
      min-height: 85px; /* Reducimos la altura base en móviles */
    }
    
    .logo-box {
      width: 70px;
      height: 70px; /* Logo más pequeño */
      font-size: 1.8rem;
    }

    .info-area {
      padding: 10px 12px;
      min-height: 50px;
      margin-bottom: 35px; /* Mantenemos el margen para la franja gris */
      gap: 10px;
    }

    .text-group h1 {
      font-size: 1.15rem;
    }
    
    .text-group p,
    .text-group .subtitulo {
      font-size: 0.75rem;
    }

    .top-btn span {
      display: none; /* Ocultamos la palabra "Inicio", dejamos solo el icono */
    }
    
    .top-btn {
      padding: 8px;
      border-radius: 50%; /* Convertimos el botón Inicio en un círculo como los demás */
    }
    
    .icon-btn {
      padding: 8px;
    }
  }

  /* Móviles pequeños (hasta 480px) */
  @media (max-width: 480px) {
    .logo-box {
      width: 55px;
      height: 55px;
      font-size: 1.4rem;
    }
    
    .info-area {
      padding: 8px 10px;
      gap: 5px;
    }

    .text-group h1 {
      font-size: 1.05rem;
    }
    
    .right-actions {
      gap: 4px; /* Juntamos un poquito más los botones */
    }
  }
</style>