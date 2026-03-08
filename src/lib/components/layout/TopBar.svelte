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
  .topbar-container {
    position: relative; width: calc(100% - 30px); height: 100px;
    margin: 10px auto 0 auto; border-radius: 12px 12px 0 0; 
    overflow: hidden; box-shadow: var(--shadow-md); z-index: 100;
  }
  
  .background-layers { position: absolute; width: 100%; height: 100%; display: flex; flex-direction: column; }
  
  /* Ajustamos los colores de las filas para que respeten el tema */
  .white-row { background: var(--bg-panel); height: 65px; }
  .gray-row { background: #373737; height: 35px; }
  :global(.dark) .gray-row { background: #111827; }

  .content-overlay { position: relative; display: flex; height: 100%; z-index: 2; }
  
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
  }

  .info-area { flex: 1; height: 65px; display: flex; align-items: center; padding: 0 20px; justify-content: space-between; }
  
  .text-group h1 { margin: 0; font-size: 1.4rem; color: var(--text-main); font-weight: 700; }
  .text-group p { margin: 0; font-size: 0.8rem; color: var(--text-muted); }

  .right-actions { display: flex; gap: 8px; }

  .top-btn { 
    display: flex; align-items: center; gap: 6px; 
    background: var(--bg-panel); border: 1px solid var(--border-color); 
    padding: 5px 12px; border-radius: 6px; color: var(--text-main); 
    font-weight: 600; font-size: 0.85rem; cursor: pointer;
    transition: 0.2s;
  }
  .top-btn:hover { background: var(--bg-app); border-color: var(--primary); }

  .icon-btn { 
    background: none; border: none; cursor: pointer; 
    color: var(--text-muted); padding: 8px; border-radius: 50%; 
    display: flex; transition: 0.2s;
  }
  .icon-btn:hover { background: var(--bg-app); color: var(--primary); }
</style>
