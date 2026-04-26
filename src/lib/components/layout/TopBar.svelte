<script lang="ts">
  import { Settings, Home, Monitor, Sun, Moon, HelpCircle, Clock, Loader2, CheckCircle, AlertTriangle, CloudOff } from "lucide-svelte";
  import { onMount } from 'svelte';
  import { currentTheme, applyTheme, type Theme } from '$lib/stores/themeStore';
  import { goto } from '$app/navigation';

  // 🌟 NUEVO: Importamos la sesión y el cerebro automático
  import { sesionApp } from '$lib/stores/authStore';
  import { estadoSincronizacion } from '$lib/stores/autoSyncStore';

  // Función para rotar entre los 3 estados: Sistema -> Claro -> Oscuro
  function cambiarTema() {
    currentTheme.update(t => {
      let nuevo: Theme = t === 'system' ? 'light' : t === 'light' ? 'dark' : 'system';
      applyTheme(nuevo);
      return nuevo;
    });
  }

  // Si hay un conflicto, este botón lleva al usuario directo a la configuración para resolverlo
  function manejarClickEstado() {
    if ($estadoSincronizacion.estado === 'conflicto') {
      goto('/configuracion');
    }
  }

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
        <h1>AVisits</h1>
        
      </div>

      <div class="right-actions">
        
        {#if $sesionApp.isLoggedIn && $estadoSincronizacion.estado !== 'inactivo'}
          <div 
            class="sync-badge state-{$estadoSincronizacion.estado}" 
            title={$estadoSincronizacion.mensaje}
            on:click={manejarClickEstado}
          >
            {#if $estadoSincronizacion.estado === 'esperando'}
              <Clock size={16} class="pulse-icon" />
              <span class="badge-text">{$estadoSincronizacion.mensaje}</span>
            
            {:else if $estadoSincronizacion.estado === 'sincronizando'}
              <Loader2 size={16} class="spin-icon" />
              <span class="badge-text">{$estadoSincronizacion.mensaje}</span>
            
            {:else if $estadoSincronizacion.estado === 'al_dia'}
              <CheckCircle size={16} />
              <span class="badge-text">{$estadoSincronizacion.mensaje}</span>
            
            {:else if $estadoSincronizacion.estado === 'conflicto'}
              <AlertTriangle size={16} />
              <span class="badge-text">{$estadoSincronizacion.mensaje}</span>
            
            {:else if $estadoSincronizacion.estado === 'error'}
              <CloudOff size={16} />
              <span class="badge-text">{$estadoSincronizacion.mensaje}</span>
            {/if}
          </div>
        {/if}

        <button class="top-btn" on:click={() => goto('/')}>
          <Home size={16} /> <span class="btn-text-hide">Inicio</span>
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

        <button class="icon-btn" on:click={() => goto('/ayuda')} title="Temas de Ayuda">
           <HelpCircle size={18} />
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
    min-height: 100px; 
    margin: 10px auto 0 auto;
    border-radius: 12px 12px 0 0;
    overflow: hidden;
    box-shadow: var(--shadow-md);
    z-index: 100;
  }

  .background-layers {
    position: absolute; width: 100%; height: 100%; display: flex; flex-direction: column;
  }

  .white-row {
    background: var(--bg-panel); flex: 1; 
  }

  .gray-row {
    background: #373737; height: 35px; flex-shrink: 0; 
  }

  :global(.dark) .gray-row {
    background: #111827;
  }

  .content-overlay {
    position: relative; display: flex; align-items: flex-start; width: 100%; z-index: 2;
  }

  .logo-box {
    background: var(--primary); color: white; width: 85px; height: 82px;
    display: flex; align-items: center; justify-content: center;
    font-size: 2.5rem; font-weight: 600; flex-shrink: 0;
  }

  .info-area {
    flex: 1; min-height: 65px; display: flex; align-items: center;
    padding: 10px 20px; justify-content: space-between; box-sizing: border-box;
    gap: 15px; margin-bottom: 35px; 
  }

  .text-group {
    display: flex; flex-direction: column; justify-content: center; flex: 1; min-width: 0; line-height: 1.2;
  }

  .text-group h1 {
    margin: 0; font-size: 1.4rem; color: var(--text-main); font-weight: 800;
    white-space: normal; word-wrap: break-word; line-height: 1.2;
  }

  .right-actions {
    display: flex; align-items: center; gap: 8px; flex-shrink: 0;
  }

  .top-btn {
    display: flex; align-items: center; gap: 6px; background: var(--bg-panel);
    border: 1px solid var(--border-color); padding: 6px 14px; border-radius: 8px;
    color: var(--text-main); font-weight: 600; font-size: 0.85rem; cursor: pointer;
    transition: 0.2s; white-space: nowrap;
  }

  .top-btn:hover {
    background: var(--bg-app); border-color: var(--primary);
  }

  .icon-btn {
    background: none; border: 1px solid transparent; cursor: pointer; color: var(--text-muted);
    padding: 8px; border-radius: 50%; display: flex; transition: 0.2s;
  }

  .icon-btn:hover {
    background: var(--bg-app); color: var(--primary);
  }

  /* =============================================
     🌟 ESTILOS DEL INDICADOR DE SINCRONIZACIÓN
     ============================================= */
  .sync-badge {
    display: flex; align-items: center; gap: 6px; padding: 6px 12px;
    border-radius: 20px; font-size: 0.8rem; font-weight: 700;
    transition: all 0.3s ease; border: 1px solid transparent;
  }

  /* COLORES DE LOS ESTADOS */
  .state-esperando { background: rgba(234, 179, 8, 0.15); color: #ca8a04; border-color: rgba(234, 179, 8, 0.3); }
  .state-sincronizando { background: rgba(59, 130, 246, 0.15); color: #2563eb; border-color: rgba(59, 130, 246, 0.3); }
  .state-al_dia { background: rgba(34, 197, 94, 0.15); color: #16a34a; border-color: rgba(34, 197, 94, 0.3); }
  .state-error { background: rgba(107, 114, 128, 0.15); color: #4b5563; border-color: rgba(107, 114, 128, 0.3); }
  
  .state-conflicto { 
    background: rgba(239, 68, 68, 0.15); color: #dc2626; border-color: rgba(239, 68, 68, 0.4); 
    cursor: pointer; box-shadow: 0 0 10px rgba(239, 68, 68, 0.2);
  }
  .state-conflicto:hover { background: rgba(239, 68, 68, 0.25); transform: scale(1.05); }

  /* MODO OSCURO (Ajustes de contraste para la píldora) */
  :global(.dark) .state-esperando { color: #fde047; }
  :global(.dark) .state-sincronizando { color: #60a5fa; }
  :global(.dark) .state-al_dia { color: #4ade80; }
  :global(.dark) .state-conflicto { color: #f87171; }
  :global(.dark) .state-error { color: #9ca3af; }

  /* ANIMACIONES */
  .spin-icon { animation: spin 1.5s linear infinite; }
  .pulse-icon { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }

  @keyframes spin { 100% { transform: rotate(360deg); } }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

  /* =============================================
     RESPONSIVE
     ============================================= */
  @media (max-width: 1024px) {
    .topbar-container { width: calc(100% - 20px); }
    .info-area { padding: 10px 15px; }
    .text-group h1 { font-size: 1.3rem; }
  }

  @media (max-width: 768px) {
    .topbar-container { width: 100%; margin: 0; border-radius: 0; min-height: 85px; }
    .logo-box { width: 70px; height: 70px; font-size: 1.8rem; }
    .info-area { padding: 10px 12px; min-height: 50px; margin-bottom: 35px; gap: 10px; }
    .text-group h1 { font-size: 1.15rem; }
    
    .btn-text-hide { display: none; }
    .top-btn { padding: 8px; border-radius: 50%; }
    .icon-btn { padding: 8px; }

    /* En móviles, la píldora de sincronización solo muestra el ícono para ahorrar espacio */
    .sync-badge { padding: 8px; border-radius: 50%; }
    .badge-text { display: none; }
  }

  @media (max-width: 480px) {
    .logo-box { width: 55px; height: 55px; font-size: 1.4rem; }
    .info-area { padding: 8px 10px; gap: 5px; }
    .text-group h1 { font-size: 1.05rem; }
    .right-actions { gap: 4px; }
  }
</style>