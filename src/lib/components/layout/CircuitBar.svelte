<script lang="ts">
  import { onMount } from 'svelte';
  import { listaCongregaciones, circuitoActivo } from '$lib/stores/appStore';
  import { Globe, Search, LayoutGrid, ChevronDown, X, Plus } from "lucide-svelte";
  import { slide, fade, scale } from 'svelte/transition';
  import { LazyStore } from '@tauri-apps/plugin-store';

  interface CircuitoItem { nombre: string; idioma: string; pais: string; }

  let listaCircuitos: CircuitoItem[] = [];
  let mostrarModal = false;
  let mostrarDropdown = false;

  let nuevoNombre = "";
  let nuevoIdioma = "";
  let nuevoPais = "";

  const store = new LazyStore('registro_circuito_v1.json');

  // LISTA NEGRA: Estas claves son del sistema, NO son circuitos.
  const CLAVES_SISTEMA = ['observaciones', 'historial_sesion', 'datos_congregaciones', 'config'];

  onMount(async () => {
    await cargarCircuitosExistentes();
  });

  async function cargarCircuitosExistentes() {
    try {
      const entries = await store.entries(); 
      
      // FILTRO CORREGIDO: Solo mostramos lo que NO esté en la lista negra
      listaCircuitos = entries
        .filter(([key, _]) => !CLAVES_SISTEMA.includes(key))
        .map(([key, _]) => ({
          nombre: key,
          idioma: "General", 
          pais: "Registrado"
        }));

      if (listaCircuitos.length > 0) {
        if (!$circuitoActivo || !listaCircuitos.find(c => c.nombre === $circuitoActivo)) {
          seleccionarCircuito(listaCircuitos[0]);
        }
      } else {
        $circuitoActivo = "";
        $listaCongregaciones = [];
      }

    } catch (error) {
      console.error("Error cargando circuitos:", error);
      $circuitoActivo = "";
      $listaCongregaciones = [];
    }
  }

  async function seleccionarCircuito(c: CircuitoItem) {
    $circuitoActivo = c.nombre;
    $listaCongregaciones = []; 

    try {
      const datosDelCircuito = await store.get(c.nombre);
      if (Array.isArray(datosDelCircuito)) {
        $listaCongregaciones = datosDelCircuito as any;
      }
    } catch (e) { console.log("Error al cargar datos"); }

    mostrarDropdown = false;
  }

  async function guardar() {
    if (nuevoNombre.trim()) {
      const nombreFinal = nuevoNombre.trim().toUpperCase();

      // Validación extra: No permitir nombres reservados
      if (CLAVES_SISTEMA.includes(nombreFinal.toLowerCase())) {
        alert("Este nombre está reservado por el sistema.");
        return;
      }

      if (listaCircuitos.find(c => c.nombre === nombreFinal)) {
        alert("Este circuito ya existe.");
        return;
      }

      const nuevoCircuito = {
        nombre: nombreFinal,
        idioma: nuevoIdioma.trim() || "General",
        pais: nuevoPais.trim() || "Global"
      };

      listaCircuitos = [...listaCircuitos, nuevoCircuito];

      await store.set(nombreFinal, []); 
      await store.save(); 

      await seleccionarCircuito(nuevoCircuito);

      nuevoNombre = ""; nuevoIdioma = ""; nuevoPais = "";
      mostrarModal = false;
    }
  }
</script>

<nav class="circuit-bar">
  <div class="container">
    <div class="selector-wrapper">
      <button type="button" class="chip-circuit" on:click={() => (mostrarDropdown = !mostrarDropdown)}>
        <Globe size={18} color="#c62828" />
        <span>
            {#if $circuitoActivo}
                Circuito: <strong>{$circuitoActivo}</strong>
            {:else}
                <span style="opacity: 0.6; font-style: italic;">Sin Circuito</span>
            {/if}
        </span>
        <span class="icon-chevron" class:rotate={mostrarDropdown}><ChevronDown size={14} /></span>
      </button>

      {#if mostrarDropdown}
        <div class="dropdown-menu" transition:slide>
          {#each listaCircuitos as c}
            <button type="button" class="dropdown-item" on:click={() => seleccionarCircuito(c)}>
              <strong>{c.nombre}</strong>
              <span class="meta-info">{c.idioma} • {c.pais}</span>
            </button>
          {/each}
          {#if listaCircuitos.length === 0}
             <div class="empty-drop">No hay circuitos creados</div>
          {/if}
        </div>
      {/if}
    </div>

    <div class="search-wrapper">
      <Search size={18} class="search-icon" />
      <input type="text" placeholder="Buscar..." />
    </div>

    <div class="actions">
      <div class="btn-secondary">
        <span class="badge">{$listaCongregaciones.length}</span>
        <span>Congregaciones</span>
      </div>
      <button type="button" class="btn-primary" on:click={() => (mostrarModal = true)}>
        <LayoutGrid size={18} />
        <span>Gestionar Circuitos</span>
      </button>
    </div>
  </div>
</nav>

{#if mostrarModal}
  <div class="modal-overlay" transition:fade on:click|self={() => (mostrarModal = false)} role="button" tabindex="-1">
    <div class="modal-card" transition:scale>
      <header>
        <h3>Nuevo Circuito</h3>
        <button type="button" class="close-btn" on:click={() => (mostrarModal = false)}><X size={20} /></button>
      </header>
      <div class="modal-body">
        <div class="info-banner">Se creará un nuevo registro de circuito vacío.</div>
        <label for="c-name">Identificador</label>
        <div class="input-with-icon">
          <Plus size={18} class="plus-icon" />
          <input id="c-name" bind:value={nuevoNombre} placeholder="Ej: HOLGUÍN-15" on:keydown={(e) => e.key === 'Enter' && guardar()}/>
        </div>
        <div class="row-cols">
          <div class="col">
            <label for="c-lang">Idioma</label>
            <div class="input-with-icon"><input id="c-lang" bind:value={nuevoIdioma} placeholder="Opcional" /></div>
          </div>
          <div class="col">
            <label for="c-country">País</label>
            <div class="input-with-icon"><input id="c-country" bind:value={nuevoPais} placeholder="Opcional" /></div>
          </div>
        </div>
      </div>
      <footer>
        <button type="button" class="btn-text" on:click={() => (mostrarModal = false)}>Cancelar</button>
        <button type="button" class="btn-save" on:click={guardar} disabled={!nuevoNombre.trim()}>Crear</button>
      </footer>
    </div>
  </div>
{/if}

<style>
  :global(.circuit-bar) { margin-top: 10px; }
  .circuit-bar { max-width: 1400px; margin: 0 auto; width: 95%; background: white; padding: 12px 20px; border-radius: 12px; border: 1px solid rgba(0, 0, 0, 0.05); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); position: relative; z-index: 10; }
  .container { display: flex; align-items: center; justify-content: space-between; gap: 15px; }
  .selector-wrapper { position: relative; }
  .chip-circuit { display: flex; align-items: center; gap: 8px; background: white; border: 1px solid #fee2e2; padding: 8px 14px; border-radius: 10px; color: #334155; cursor: pointer; white-space: nowrap; transition: 0.2s; }
  .chip-circuit:hover { border-color: #c62828; }
  .icon-chevron { transition: 0.2s; opacity: 0.5; margin-left: 4px; }
  .rotate { transform: rotate(180deg); }
  .dropdown-menu { position: absolute; top: 125%; left: 0; background: white; border: 1px solid #e2e8f0; border-radius: 10px; min-width: 220px; box-shadow: 0 10px 15px rgba(0,0,0,0.1); z-index: 100; overflow: hidden; display: flex; flex-direction: column; }
  .dropdown-item { width: 100%; padding: 12px 15px; text-align: left; border: none; background: none; cursor: pointer; display: flex; flex-direction: column; gap: 2px; border-bottom: 1px solid #f1f5f9; }
  .dropdown-item:last-child { border-bottom: none; }
  .dropdown-item strong { color: #1e293b; font-size: 0.9rem; }
  .dropdown-item .meta-info { color: #64748b; font-size: 0.75rem; }
  .dropdown-item:hover { background: #fff1f2; }
  .dropdown-item:hover strong { color: #c62828; }
  .empty-drop { padding: 15px; font-size: 0.8rem; color: #94a3b8; text-align: center; font-style: italic; }
  .search-wrapper { flex: 1; position: relative; display: flex; align-items: center; }
  :global(.search-icon) { position: absolute; left: 14px; color: #94a3b8; }
  .search-wrapper input { width: 100%; padding: 10px 15px 10px 42px; border-radius: 10px; border: 1px solid #fee2e2; outline: none; }
  .search-wrapper input:focus { border-color: #c62828; box-shadow: 0 0 0 3px rgba(198, 40, 40, 0.1); }
  .actions { display: flex; align-items: center; gap: 12px; }
  .btn-secondary { display: flex; align-items: center; gap: 10px; padding: 8px 16px; border: 1px solid #fca5a5; border-radius: 10px; color: #c62828; font-weight: 700; font-size: 0.85rem; }
  .badge { background: #c62828; color: white; padding: 2px 7px; border-radius: 6px; font-size: 0.75rem; }
  .btn-primary { display: flex; align-items: center; gap: 8px; padding: 10px 18px; background: #1e293b; color: white; border: none; border-radius: 10px; cursor: pointer; font-weight: 600; font-size: 0.85rem; transition: all 0.3s; }
  .btn-primary:hover { background: #c62828; }
  /* MODAL */
  .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.4); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 999; }
  .modal-card { background: white; padding: 24px; border-radius: 16px; width: 90%; max-width: 420px; box-shadow: 0 20px 25px rgba(0,0,0,0.2); }
  header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
  h3 { margin: 0; color: #1e293b; font-size: 1.1rem; }
  .close-btn { background: none; border: none; cursor: pointer; color: #94a3b8; }
  .modal-body label { display: block; font-size: 0.8rem; font-weight: 600; color: #475569; margin-bottom: 6px; }
  .info-banner { background: #eff6ff; color: #1e40af; padding: 10px; border-radius: 8px; font-size: 0.8rem; margin-bottom: 20px; border: 1px solid #dbeafe; }
  .input-with-icon { position: relative; display: flex; align-items: center; }
  :global(.plus-icon) { position: absolute; left: 12px; color: #c62828; }
  .input-with-icon input { width: 100%; padding: 12px; border: 1px solid #e2e8f0; border-radius: 10px; outline: none; font-size: 0.95rem; }
  .input-with-icon input:focus { border-color: #c62828; }
  #c-name { padding-left: 42px; font-weight: 700; color: #1e293b; }
  .row-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px; }
  footer { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; }
  .btn-text { background: none; border: none; color: #64748b; font-weight: 600; cursor: pointer; }
  .btn-save { background: #c62828; color: white; border: none; padding: 10px 20px; border-radius: 10px; font-weight: 600; cursor: pointer; transition: 0.2s; }
  .btn-save:disabled { background: #e2e8f0; cursor: not-allowed; color: #94a3b8; }
  .btn-save:not(:disabled):hover { background: #b91c1c; transform: translateY(-1px); }
</style>
