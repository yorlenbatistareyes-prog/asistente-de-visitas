<script lang="ts">
  import { Globe, Search, LayoutGrid } from "lucide-svelte";
  
  export let circuitoNombre = "Holguín-14";
  export let totalCongregaciones = 2;

  function manejarGestion() {
    console.log("Abriendo gestor de circuitos...");
  }
</script>

<nav class="circuit-bar">
  <div class="container">
    
    <div class="chip-circuit">
      <Globe size={18} color="#c62828" />
      <span>Circuito: <strong>{circuitoNombre}</strong></span>
    </div>

    <div class="search-wrapper">
      <div class="search-icon">
        <Search size={18} />
      </div>
      <input type="text" placeholder="Buscar en documentos, personas o notas..." />
    </div>

    <div class="actions">
      <div class="btn-secondary">
        <span class="badge">{totalCongregaciones}</span>
        <span>Congregaciones</span>
      </div>
      
      <button class="btn-primary" on:click={manejarGestion}>
        <LayoutGrid size={18} />
        <span>Gestionar Circuitos</span>
      </button>
    </div>

  </div>
</nav>

<style>
  .circuit-bar {
    margin: 15px 20px 10px 20px; 
    background: white; 
    padding: 12px 20px;
    border-radius: 12px;
    border: 1px solid rgba(0, 0, 0, 0.05);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    position: relative;
    z-index: 50;
  }

  .container {
    display: flex;
    align-items: center;
    justify-content: space-between; 
    gap: 20px; 
    width: 100%;
  }

  /* --- Chip de Circuito --- */
  .chip-circuit {
    display: flex;
    align-items: center;
    gap: 8px;
    background: white;
    border: 1px solid #fee2e2; 
    padding: 8px 14px;
    border-radius: 10px;
    color: #334155;
    white-space: nowrap;
    flex-shrink: 0;
  }

  /* --- Buscador --- */
  .search-wrapper {
    flex: 1; 
    position: relative;
    display: flex;
    align-items: center;
    max-width: 600px;
  }

  .search-icon {
    position: absolute;
    left: 14px;
    color: #94a3b8;
    display: flex;
  }

  .search-wrapper input {
    width: 100%;
    padding: 10px 15px 10px 42px;
    border-radius: 10px;
    border: 1px solid #fee2e2;
    background: #ffffff;
    outline: none;
  }

  .search-wrapper input:focus {
    border-color: #c62828;
    box-shadow: 0 0 0 3px rgba(198, 40, 40, 0.1);
  }

  /* --- Acciones (Lado derecho) --- */
  .actions {
    display: flex;
    align-items: center;
    gap: 12px; /* Mantiene la separación entre los dos elementos */
    flex-shrink: 0;
  }

  /* Contador de Congregaciones (Estático) */
  .btn-secondary {
    background: white;
    color: #c62828;
    border: 1px solid #fca5a5; 
    padding: 8px 16px;
    border-radius: 10px;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 0.85rem;
    /* Eliminado el hover que invertía colores */
  }

  .badge {
    background: #c62828;
    color: white;
    padding: 2px 7px;
    border-radius: 6px;
    font-size: 0.75rem;
  }

  /* Botón Gestionar Circuitos (Con Hover Rojo) */
  .btn-primary {
    background: #1e293b; 
    color: white;
    padding: 10px 18px;
    font-weight: 600;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.85rem;
    transition: all 0.3s ease;
  }

  .btn-primary:hover {
    background: #c62828; 
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(198, 40, 40, 0.3);
  }

  .btn-primary:active {
    transform: scale(0.95);
  }
</style>