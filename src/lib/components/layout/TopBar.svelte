<script lang="ts">
  import { Settings, Home, Monitor } from "lucide-svelte";
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();
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
        <a href="/" class="top-btn">
          <Home size={16} /> <span>Inicio</span>
        </a>
        <button class="icon-btn"><Monitor size={18} /></button>
        <button class="icon-btn" on:click={() => dispatch('abrirConfig')}><Settings size={18} /></button>
      </div>
    </div>
  </div>
</header>

<style>
  .topbar-container {
    position: relative; width: calc(100% - 30px); height: 100px;
    margin: 10px auto 0 auto; border-radius: 12px 12px 0 0; 
    overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1); z-index: 100;
  }
  .background-layers { position: absolute; width: 100%; height: 100%; display: flex; flex-direction: column; }
  .white-row { background: #fff; height: 65px; }
  .gray-row { background: #373737; height: 35px; }
  .content-overlay { position: relative; display: flex; height: 100%; z-index: 2; }
  .logo-box { background: #e11d48; color: white; width: 85px; height: 82px; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; font-weight: 600; }
  .info-area { flex: 1; height: 65px; display: flex; align-items: center; padding: 0 20px; justify-content: space-between; }
  .text-group h1 { margin: 0; font-size: 1.4rem; color: #000; font-weight: 700; }
  .text-group p { margin: 0; font-size: 0.8rem; color: #666; }
  .right-actions { display: flex; gap: 8px; }
  .top-btn { display: flex; align-items: center; gap: 6px; background: white; border: 1px solid #e2e8f0; padding: 5px 12px; border-radius: 6px; color: #0f172a; font-weight: 600; font-size: 0.85rem; text-decoration: none; }
  .icon-btn { background: none; border: none; cursor: pointer; color: #64748b; padding: 8px; border-radius: 50%; display: flex; }
  .icon-btn:hover { background: #f1f5f9; color: #000; }
</style>