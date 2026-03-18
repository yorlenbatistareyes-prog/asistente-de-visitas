<script lang="ts">
  import { CheckCircle2, Save, Archive, Calendar } from 'lucide-svelte';
  import { onMount, createEventDispatcher } from 'svelte';
  import { cargarConfig, guardarConfig } from '$lib/services/db';

  export let nombreCongregacion = '';
  const dispatch = createEventDispatcher();

  let contadores: Record<string, number> = {
    total: 0, mayores65: 0, sinCursos: 0, nuevos: 0,
    bautizados: 0, readmitidos: 0, reactivados: 0,
    irregulares: 0, inactivos: 0, sacados: 0
  };

  let fechaRevision = '';
  let guardando = false;
  let exito = false;

  const tarjetasRevision = [
    { id: 'total', titulo: 'Total de publicadores', color: 'blue' },
    { id: 'mayores65', titulo: 'Mayores de 65 años', color: 'blue' },
    { id: 'sinCursos', titulo: 'Sin cursos bíblicos', color: 'slate' },
    { id: 'nuevos', titulo: 'Nuevos publicadores', color: 'green' },
    { id: 'bautizados', titulo: 'Bautizados', color: 'green' },
    { id: 'readmitidos', titulo: 'Readmitidos', color: 'green' },
    { id: 'reactivados', titulo: 'Reactivados', color: 'green' },
    { id: 'irregulares', titulo: 'Irregulares', color: 'orange' },
    { id: 'inactivos', titulo: 'Inactivos', color: 'red' },
    { id: 'sacados', titulo: 'Tarjetas sacadas', color: 'slate' },
  ];

  async function cargarDatosRevision() {
    try {
      const clave = `revision_${nombreCongregacion}`;
      const valor = await cargarConfig(clave);
      if (valor && valor !== "{}" && valor !== "") {
        const datosGuardados = typeof valor === 'string' ? JSON.parse(valor) : valor;
        if (datosGuardados.contadores) contadores = { ...contadores, ...datosGuardados.contadores };
        if (datosGuardados.fechaRevision) fechaRevision = datosGuardados.fechaRevision;
      }
    } catch (e) {
      console.error("Error cargando la revisión:", e);
    }
  }

  async function guardarRevision() {
    guardando = true;
    try {
      const clave = `revision_${nombreCongregacion}`;
      await guardarConfig(clave, JSON.stringify({ contadores, fechaRevision }));
      
      exito = true;
      setTimeout(() => exito = false, 2500); 
    } catch (error) {
      console.error("Error al guardar la revisión:", error);
    } finally {
      guardando = false;
    }
  }

  function resetearContadores() {
    if (confirm("¿Estás seguro de poner todos los contadores a cero?")) {
      Object.keys(contadores).forEach(k => contadores[k] = 0);
      guardarRevision(); 
    }
  }

  async function finalizarRevision() {
    if (!fechaRevision) {
      alert("Por favor, selecciona la fecha de la revisión arriba antes de finalizar.");
      return;
    }

    if (confirm("¿Finalizar y archivar esta revisión? Se guardará en el historial y los contadores se pondrán a cero para la próxima visita.")) {
      dispatch('guardarEnHistorial', {
        congregacion: nombreCongregacion,
        fecha: fechaRevision,
        tipo: 'Revisión de Archivos',
        contenido: JSON.stringify(contadores)
      });

      Object.keys(contadores).forEach(k => contadores[k] = 0);
      fechaRevision = '';
      await guardarRevision(); 
      alert("¡Revisión archivada con éxito en el historial!");
    }
  }

  onMount(() => { cargarDatosRevision(); });
</script>

<div class="revision-container">
  
  <div class="revision-header">
    <div class="header-info">
      <h3>Conteo Rápido: {nombreCongregacion}</h3>
      <p>Usa los botones para contar rápidamente mientras revisas los archivos físicos.</p>
    </div>
    <div class="fecha-seccion">
      <label for="fechaRev"><Calendar size={16} /> Fecha de Revisión:</label>
      <input type="date" id="fechaRev" bind:value={fechaRevision} on:change={guardarRevision} class="input-fecha" />
    </div>
  </div>

  <div class="grid-contadores">
    {#each tarjetasRevision as tarjeta}
      <div class="counter-card theme-{tarjeta.color}">
        <h4>{tarjeta.titulo}</h4>
        <div class="counter-controls">
          <button class="btn-restar" on:click={() => { if(contadores[tarjeta.id] > 0) contadores[tarjeta.id]-- }}>-</button>
          
          <input type="number" min="0" bind:value={contadores[tarjeta.id]} class="counter-input" />
          
          <button class="btn-sumar" on:click={() => contadores[tarjeta.id]++}>+</button>
        </div>
      </div>
    {/each}
  </div>
  
  <div class="revision-actions">
    <button class="btn-accion btn-outline" on:click={resetearContadores}>Poner a cero</button>
    
    <button class="btn-accion {exito ? 'btn-exito' : 'btn-primary'}" on:click={guardarRevision} disabled={guardando}>
      {#if guardando}
        <Save size={18} class="spin" /> Guardando...
      {:else if exito}
        <CheckCircle2 size={18} /> ¡Guardado!
      {:else}
        <Save size={18} /> Guardar Progreso
      {/if}
    </button>

    <button class="btn-accion btn-azul" on:click={finalizarRevision}>
      <Archive size={18} /> Finalizar y Archivar
    </button>
  </div>
</div>

<style>
  .revision-container { animation: fadeIn 0.3s ease; }

  /* --- CABECERA --- */
  .revision-header { 
    display: flex; justify-content: space-between; align-items: flex-start; 
    flex-wrap: wrap; gap: 15px; margin-bottom: 25px; 
  }
  .header-info h3 { margin: 0 0 5px 0; font-size: 1.4rem; color: var(--text-main); }
  .header-info p { margin: 0; color: var(--text-muted); font-size: 0.95rem; }

  .fecha-seccion { 
    display: flex; align-items: center; gap: 10px; 
    background: var(--bg-panel); padding: 10px 15px; 
    border-radius: var(--radius-md); border: var(--border-thin); 
    font-weight: 600; font-size: 0.9rem; 
  }
  .input-fecha { 
    border: none; background: transparent; color: var(--text-main); 
    font-family: inherit; font-size: 0.95rem; outline: none; cursor: pointer; 
  }

  /* --- TARJETAS --- */
  .grid-contadores { 
    display: grid; 
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); 
    gap: 12px; 
    margin-bottom: 30px;
  }

  .counter-card {
    background: var(--bg-panel);
    border: var(--border-thin);
    border-radius: var(--radius-md);
    padding: 12px 15px; 
    display: flex;
    flex-direction: column;
    align-items: center;
    box-shadow: var(--shadow-sm);
    border-top: 4px solid var(--border-color); 
  }

  .counter-card.theme-green { border-top-color: #10b981; }
  .counter-card.theme-red { border-top-color: #ef4444; }
  .counter-card.theme-orange { border-top-color: #f59e0b; }
  .counter-card.theme-blue { border-top-color: #3b82f6; }
  .counter-card.theme-slate { border-top-color: #64748b; }

  .counter-card h4 { 
    margin: 0 0 10px 0; font-size: 0.85rem; color: var(--text-muted); 
    text-align: center; line-height: 1.2;
  }

  /* --- CONTROLES (+ / -) --- */
  .counter-controls {
    display: flex; align-items: center; justify-content: center; 
    gap: 15px; width: 100%;
  }

  .btn-restar, .btn-sumar {
    width: 36px; height: 36px; border-radius: 50%; border: none;
    font-size: 1.4rem; font-weight: bold; cursor: pointer;
    display: flex; justify-content: center; align-items: center;
    transition: all 0.1s; padding: 0;
  }

  .btn-restar { background: var(--bg-app); color: var(--text-muted); border: var(--border-thin); }
  .btn-restar:active { background: #e2e8f0; transform: scale(0.95); }

  .btn-sumar { background: rgba(37, 99, 235, 0.1); color: #2563eb; }
  .btn-sumar:active { background: rgba(37, 99, 235, 0.2); transform: scale(0.95); }

  .counter-input {
    width: 50px; text-align: center; font-size: 1.3rem; font-weight: 800;
    color: var(--text-main); background: transparent; border: none;
    outline: none; padding: 0; -moz-appearance: textfield;
  }
  .counter-input::-webkit-outer-spin-button,
  .counter-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }

  /* --- BOTONES DE ACCIÓN INFERIORES --- */
  .revision-actions {
    display: flex; gap: 15px; justify-content: flex-end; flex-wrap: wrap;
    border-top: var(--border-thin); padding-top: 20px;
  }

  .btn-accion { 
    height: 40px; padding: 0 20px; border-radius: var(--radius-md); 
    font-weight: 600; font-size: 0.95rem; display: inline-flex; 
    justify-content: center; align-items: center; gap: 8px; 
    cursor: pointer; transition: all 0.2s; border: none; 
  }
  
  .btn-primary { background: var(--primary); color: white; }
  .btn-primary:hover { background: #be123c; transform: translateY(-2px); box-shadow: var(--shadow-md); }
  
  .btn-outline { background: var(--bg-panel); border: var(--border-thin); color: var(--text-main); }
  .btn-outline:hover { background: var(--bg-app); border-color: var(--primary); color: var(--primary); }

  .btn-azul { background: #2563eb; color: white; }
  .btn-azul:hover { background: #1d4ed8; transform: translateY(-2px); box-shadow: var(--shadow-md); }

  .btn-exito { background: #10b981; color: white; }
  
  .spin { animation: spin 1s linear infinite; }
  @keyframes spin { 100% { transform: rotate(360deg); } }

  /* --- RESPONSIVO --- */
  @media (max-width: 768px) {
    .grid-contadores { grid-template-columns: repeat(2, 1fr); gap: 10px; }
    .revision-actions { flex-direction: column; }
    .btn-accion { width: 100%; }
    .fecha-seccion { width: 100%; justify-content: space-between; }
  }
</style>