<script lang="ts">
  import { Settings } from "lucide-svelte";
</script>

<header class="header-fixed" data-tauri-drag-region>
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
      <button class="settings-btn">
        <Settings size={22} strokeWidth={1.5} />
      </button>
    </div>
  </div>
</header>

<style>
  .circuit-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    
    /* Separación precisa: 8px debajo de la franja gris y separado de los lados */
    margin: 8px 15px; 
    padding: 10px 20px;
    background: #ffffff;
    
    /* Bordes redondeados y sombra para que parezca un panel flotante */
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    
    gap: 20px;
    z-index: 10; /* Asegura que esté sobre el fondo gris claro */
  }
  /* Contenedor raíz: nada de márgenes ni paddings */
  .header-fixed {
    position: relative;
    width: 100%;
    height: 100px;
    margin: 0;
    padding: 0;
    overflow: hidden;
  }

  /* CAPA DE FONDO: Aquí la franja gris llega al borde sí o sí */
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

  .white-row {
    background: #ffffff;
    height: 65px;
    width: 100%;
  }

  .gray-row {
    background: #373737; /* Gris oscuro extremo a extremo */
    height: 35px;
    width: 100%;
  }

  /* CAPA DE CONTENIDO: Encima del fondo */
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
    height: 82px; /* Mitad de la franja gris */
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.8rem;
    font-weight: 800;
    box-shadow: 2px 0 5px rgba(0,0,0,0.2);
  }

  .info-area {
    flex: 1;
    height: 65px; /* Solo la altura de la franja blanca */
    display: flex;
    align-items: center;
    padding-left: 20px;
    padding-right: 20px;
  }

  .text-group h1 {
    margin: 0;
    font-size: 1.3rem;
    color: #000000; /* Negro */
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
  }
</style>