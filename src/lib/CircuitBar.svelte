<script lang="ts">
  import { Globe, Search, LayoutGrid, ChevronDown, X, Plus } from "lucide-svelte";
  import { fade, scale, slide } from 'svelte/transition';

  // Cada circuito es un objeto completo
  let listaCircuitos = [
    { nombre: "Holguín-14", idioma: "Español", pais: "Cuba" }
  ];

  export let circuitoNombre = listaCircuitos[0].nombre;
  export let totalCongregaciones = 2;

  let mostrarModal = false;
  let mostrarDropdown = false;

  // Campos del formulario
  let nuevoNombre = "";
  let nuevoIdioma = "";
  let nuevoPais = "";

  function guardar() {
    if (nuevoNombre.trim() && nuevoIdioma.trim() && nuevoPais.trim()) {

      const nuevoCircuito = {
        nombre: nuevoNombre.trim(),
        idioma: nuevoIdioma.trim(),
        pais: nuevoPais.trim()
      };

      listaCircuitos = [...listaCircuitos, nuevoCircuito];

      circuitoNombre = nuevoCircuito.nombre;

      nuevoNombre = "";
      nuevoIdioma = "";
      nuevoPais = "";

      mostrarModal = false;
    }
  }
</script>

<nav class="circuit-bar">
  <div class="container">

    <div class="selector-wrapper">
      <button type="button" class="chip-circuit" on:click={() => (mostrarDropdown = !mostrarDropdown)}>
        <Globe size={18} color="#c62828" />
        <span>Circuito: <strong>{circuitoNombre}</strong></span>
        <ChevronDown size={14} class="icon-chevron {mostrarDropdown ? 'rotate' : ''}" />
      </button>

      {#if mostrarDropdown}
        <div class="dropdown-menu" transition:slide>
          {#each listaCircuitos as c}
            <button 
              type="button" 
              class="dropdown-item" 
              on:click={() => { circuitoNombre = c.nombre; mostrarDropdown = false; }}
            >
              {c.nombre} — {c.idioma} — {c.pais}
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <div class="search-wrapper">
      <Search size={18} class="search-icon" />
      <input type="text" placeholder="Buscar en documentos, personas o notas..." />
    </div>

    <div class="actions">
      <div class="btn-secondary">
        <span class="badge">{totalCongregaciones}</span>
        <span>Congregaciones</span>
      </div>

      <button type="button" class="btn-primary" on:click={() => (mostrarModal = true)}>
        <LayoutGrid size={18} />
        <span>Gestionar Circuitos</span>
      </button>
    </div>
  </div>
</nav>

<!-- MODAL COMPLETO -->
{#if mostrarModal}
  <div 
    class="modal-overlay" 
    transition:fade 
    on:click|self={() => (mostrarModal = false)}
    on:keydown={(e) => e.key === 'Escape' && (mostrarModal = false)}
    role="button"
    tabindex="-1"
  >
    <div class="modal-card" transition:scale>
      <header>
        <h3>Gestionar Circuitos</h3>
        <button type="button" class="close-btn" on:click={() => (mostrarModal = false)}>
          <X size={20} />
        </button>
      </header>

      <div class="modal-body">

        <!-- Nombre -->
        <label for="c-name">Nombre del nuevo circuito</label>
        <div class="input-with-icon">
          <Plus size={18} class="plus-icon" />
          <input 
            id="c-name"
            bind:value={nuevoNombre} 
            placeholder="Ej: Holguín-15"
            on:keydown={(e) => e.key === 'Enter' && guardar()}
          />
        </div>

        <!-- Idioma -->
        <label for="c-lang" style="margin-top: 18px;">Idioma</label>
        <div class="input-with-icon">
          <input 
            id="c-lang"
            bind:value={nuevoIdioma} 
            placeholder="Ej: Español"
          />
        </div>

        <!-- País -->
        <label for="c-country" style="margin-top: 18px;">País</label>
        <div class="input-with-icon">
          <input 
            id="c-country"
            bind:value={nuevoPais} 
            placeholder="Ej: Cuba"
          />
        </div>

      </div>

      <footer>
        <button type="button" class="btn-text" on:click={() => (mostrarModal = false)}>
          Cancelar
        </button>

        <button 
          type="button" 
          class="btn-save" 
          on:click={guardar}
          disabled={!nuevoNombre.trim() || !nuevoIdioma.trim() || !nuevoPais.trim()}
        >
          Guardar
        </button>
      </footer>
    </div>
  </div>
{/if}

<style>
  :global(.circuit-bar) {
    margin-top: 10px;
  }

  .circuit-bar {
    max-width: 1400px;
    margin-left: auto;
    margin-right: auto;
    width: 95%;
    background: white;
    padding: 12px 20px;
    border-radius: 12px;
    border: 1px solid rgba(0, 0, 0, 0.05);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    position: relative;
    z-index: 10;
  }

  .container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 15px;
  }

  .selector-wrapper { position: relative; }

  .chip-circuit {
    display: flex;
    align-items: center;
    gap: 8px;
    background: white;
    border: 1px solid #fee2e2;
    padding: 8px 14px;
    border-radius: 10px;
    color: #334155;
    cursor: pointer;
    white-space: nowrap;
  }

  .icon-chevron {
    transition: 0.2s;
    opacity: 0.5;
    margin-left: 4px;
  }

  .rotate {
    transform: rotate(180deg);
  }

  .dropdown-menu {
    position: absolute;
    top: 125%;
    left: 0;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    min-width: 180px;
    box-shadow: 0 10px 15px rgba(0,0,0,0.1);
    z-index: 100;
    overflow: hidden;
  }

  .dropdown-item {
    width: 100%;
    padding: 10px 15px;
    text-align: left;
    border: none;
    background: none;
    cursor: pointer;
    font-size: 0.9rem;
  }

  .dropdown-item:hover {
    background: #fff5f5;
    color: #c62828;
  }

  .search-wrapper {
    flex: 1;
    position: relative;
    display: flex;
    align-items: center;
  }

  :global(.search-icon) {
    position: absolute;
    left: 14px;
    color: #94a3b8;
  }

  .search-wrapper input {
    width: 100%;
    padding: 10px 15px 10px 42px;
    border-radius: 10px;
    border: 1px solid #fee2e2;
    outline: none;
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .btn-secondary {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 16px;
    border: 1px solid #fca5a5;
    border-radius: 10px;
    color: #c62828;
    font-weight: 700;
    font-size: 0.85rem;
  }

  .badge {
    background: #c62828;
    color: white;
    padding: 2px 7px;
    border-radius: 6px;
    font-size: 0.75rem;
  }

  .btn-primary {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 18px;
    background: #1e293b;
    color: white;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    font-weight: 600;
    font-size: 0.85rem;
    transition: all 0.3s;
  }

  .btn-primary:hover {
    background: #c62828;
  }

  /* MODAL */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.4);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 999;
  }

  .modal-card {
    background: white;
    padding: 24px;
    border-radius: 16px;
    width: 90%;
    max-width: 400px;
    box-shadow: 0 20px 25px rgba(0,0,0,0.2);
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .close-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: #94a3b8;
  }

  .modal-body label {
    display: block;
    font-size: 0.85rem;
    font-weight: 600;
    color: #475569;
    margin-bottom: 8px;
  }

  .input-with-icon {
    position: relative;
    display: flex;
    align-items: center;
  }

  :global(.plus-icon) {
    position: absolute;
    left: 12px;
    color: #c62828;
  }

  .input-with-icon input {
    width: 100%;
    padding: 12px 12px 12px 42px;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    outline: none;
  }

  footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 24px;
  }

  .btn-text {
    background: none;
    border: none;
    color: #64748b;
    font-weight: 600;
    cursor: pointer;
  }

  .btn-save {
    background: #c62828;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 10px;
    font-weight: 600;
    cursor: pointer;
  }

  .btn-save:disabled {
    background: #e2e8f0;
    cursor: not-allowed;
  }
</style>