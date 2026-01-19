<script lang="ts">
  import { Settings } from "lucide-svelte";
  // 1. Importamos el despachador de eventos
  import { createEventDispatcher } from 'svelte';

  // 2. Inicializamos el despachador
  const dispatch = createEventDispatcher();

  // 3. Función que avisa al padre (App o Layout) que se hizo clic
  function clicEnConfiguracion() {
    console.log("⚙️ Botón de configuración presionado");
    dispatch('abrirConfig');
  }
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
      
      <button 
        class="settings-btn" 
        on:click={clicEnConfiguracion}
        title="Abrir Configuración Global"
      >
        <Settings size={22} strokeWidth={1.5} />
      </button>
    </div>
  </div>
</header>

<style>
  .topbar-container {
    position: relative;
    width: calc(100% - 30px);
    height: 100px;
    margin: 10px auto 5px auto;
    
    /* MODIFICACIÓN: Redondeo solo arriba (izq, der, abajo-der, abajo-izq) */
    border-radius: 12px 12px 0 0; 
    
    overflow: hidden;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    z-index: 100;
  }

  .background-layers {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    z-index: 1;
  }

  .white-row { background: #ffffff; height: 65px; width: 100%; }

  .gray-row { 
    background: #373737; 
    height: 35px; 
    width: 100%;
    /* Aseguramos que la franja gris no herede redondeos */
    border-radius: 0; 
  }

  .content-overlay {
    position: relative;
    display: flex;
    width: 100%;
    height: 100%;
    z-index: 2;
  }

  .logo-box {
    background: #c62828;
    color: white;
    width: 85px;
    height: 82px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2.8rem;
    font-weight: 450;
    box-shadow: 2px 0 5px rgba(0,0,0,0.2);
    /* El logo también debe ser recto en su base inferior */
    border-radius: 0; 
  }

  .info-area {
    flex: 1;
    height: 65px;
    display: flex;
    align-items: center;
    padding: 0 20px;
  }

  .text-group h1 {
    margin: 0;
    font-size: 1.8rem;
    color: #000000;
    font-weight: 700;
  }

  .text-group p {
    margin: 0;
    font-size: 0.85rem;
    color: #666;
  }

  .settings-btn {
    margin-left: auto;
    background: none;
    border: none;
    cursor: pointer;
    color: #444;
    display: flex;
    transition: transform 0.2s;
    padding: 8px; /* Un poco de padding para facilitar el clic */
    border-radius: 50%;
  }

  .settings-btn:hover {
    transform: rotate(30deg);
    background-color: rgba(0,0,0,0.05); /* Sutil fondo al pasar el mouse */
  }
</style>
