<script lang="ts">
  import { page } from '$app/stores';
  import { ArrowLeft, History, ClipboardList, LayoutGrid } from "lucide-svelte";
  import AnalisisCongregacion from '$lib/components/AnalisisCongregacion.svelte';
  import { onMount } from 'svelte';

  // SvelteKit captura el nombre de la carpeta dinámica [nombre]
  $: nombreCongregacion = $page.params.nombre;

  let modo: 'menu' | 'nuevo' | 'historial' = 'menu';
  let datosParaEditar: any = null;

  function volverAlMenu() {
    modo = 'menu';
    datosParaEditar = null;
  }
</script>

<div class="focus-view">
  <header class="focus-header">
    <a href="/" class="btn-back">
      <ArrowLeft size={18} />
      <span>Volver al Dashboard</span>
    </a>
    <div class="title-group">
      <h1>{nombreCongregacion}</h1>
      <p>Gestión de Análisis e Informes</p>
    </div>
  </header>

  <main class="focus-content">
    {#if modo === 'menu'}
      <div class="action-grid">
        <button class="action-card primary" on:click={() => modo = 'nuevo'}>
          <div class="icon-box"><ClipboardList size={32} /></div>
          <div class="text">
            <h3>Nuevo Análisis</h3>
            <p>Comenzar a documentar la visita actual</p>
          </div>
        </button>

        <button class="action-card" on:click={() => modo = 'historial'}>
          <div class="icon-box"><History size={32} /></div>
          <div class="text">
            <h3>Historial</h3>
            <p>Consultar registros de visitas anteriores</p>
          </div>
        </button>
      </div>
    {:else if modo === 'nuevo'}
      <div class="form-container">
        <button class="btn-text" on:click={volverAlMenu}>
          <ArrowLeft size={14} /> Cancelar y volver
        </button>
        <AnalisisCongregacion 
          {nombreCongregacion} 
          {datosParaEditar}
          on:limpiarFormulario={volverAlMenu}
        />
      </div>
    {:else}
      <div class="empty-state">
        <History size={48} />
        <p>El módulo de historial se está cargando...</p>
        <button on:click={volverAlMenu} class="btn-pri">Regresar</button>
      </div>
    {/if}
  </main>
</div>

<style>
  .focus-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #f8fafc;
  }

  .focus-header {
    background: white;
    padding: 20px 40px;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    align-items: center;
    gap: 30px;
  }

  .btn-back {
    display: flex;
    align-items: center;
    gap: 8px;
    text-decoration: none;
    color: #64748b;
    font-weight: 600;
    font-size: 0.9rem;
    padding: 8px 16px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    transition: all 0.2s;
  }

  .btn-back:hover { background: #f1f5f9; color: #0f172a; }

  .title-group h1 { margin: 0; font-size: 1.8rem; color: #0f172a; }
  .title-group p { margin: 0; color: #64748b; font-size: 0.9rem; }

  .focus-content {
    flex: 1;
    padding: 40px;
    overflow-y: auto;
  }

  .action-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 25px;
    max-width: 1000px;
    margin: 0 auto;
  }

  .action-card {
    background: white;
    border: 1px solid #e2e8f0;
    padding: 40px;
    border-radius: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 20px;
    cursor: pointer;
    transition: all 0.3s;
  }

  .action-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    border-color: #cbd5e1;
  }

  .action-card.primary {
    border-color: #fecaca;
    background: #fff1f2;
  }

  .icon-box {
    padding: 20px;
    border-radius: 50%;
    background: #f1f5f9;
    color: #64748b;
  }

  .primary .icon-box { background: #e11d48; color: white; }

  .text h3 { margin: 0; font-size: 1.4rem; color: #0f172a; }
  .text p { margin: 10px 0 0; color: #64748b; }

  .form-container {
    max-width: 1100px;
    margin: 0 auto;
    background: white;
    padding: 30px;
    border-radius: 16px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }

  .btn-text {
    background: none; border: none; color: #e11d48; font-weight: 700;
    cursor: pointer; display: flex; align-items: center; gap: 6px;
    margin-bottom: 20px;
  }
</style>
