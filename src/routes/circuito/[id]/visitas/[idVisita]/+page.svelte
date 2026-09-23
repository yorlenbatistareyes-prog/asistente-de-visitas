<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { ArrowLeft, Save, CheckCircle, Clock, MapPin, LayoutDashboard, FolderOpen, Info, Calendar } from "lucide-svelte";
  
  import { obtenerVisitaPorId, guardarVisitaProgramada, initDB, type VisitaProgramada } from '$lib/services/db';
  
  // 🌟 NUEVO: Importamos el cerebro de sincronización
  import { dispararSincronizacionLocal } from '$lib/stores/autoSyncStore';

  import AnalisisVisita from '$lib/components/AnalisisVisita.svelte';
  import RevisionVisita from '$lib/components/RevisionVisita.svelte';
  import ProgramaVisita from '$lib/components/ProgramaVisita.svelte'; // 🌟 AÑADIR ESTO

  $: idCircuito = Number($page.params.id);
  $: idVisita = Number($page.params.idVisita);

  let visita: VisitaProgramada | null = null;
  let nombreCongregacion = "Cargando..."; 
  let cargando = true;
  
  // 🌟 NUEVO: Estados del botón
  let guardando = false;
  let exito = false;

  let pestanaActiva: 'estado' | 'analisis' | 'revision' | 'programa' = 'estado';

  async function cargarDatos() {
    cargando = true;
    if (idVisita) {
      visita = await obtenerVisitaPorId(idVisita);
      if (visita && !visita.notas) visita.notas = '';

      if (visita) {
        
        // --- AUTOMATIZACIÓN HÍBRIDA DE ESTADOS ---
        const fechaVisita = visita.fechaSemana || (visita as any).fecha_semana;
        
        const hoy = new Date();
        hoy.setMinutes(hoy.getMinutes() - hoy.getTimezoneOffset());
        const hoyStr = hoy.toISOString().split('T')[0];

        if (visita.estado === 'pendiente' && hoyStr >= fechaVisita) {
          visita.estado = 'en_progreso';
          await guardarVisitaProgramada(visita); 
          dispararSincronizacionLocal(); // Disparamos si se auto-actualiza
        }
        // ------------------------------------------

        try {
          const db = await initDB();
          const congregacionId = (visita as any).congregacion_id || (visita as any).congregacionId;
          const result = await db.select<{nombre: string}[]>(
            "SELECT nombre FROM congregaciones WHERE id = $1", 
            [congregacionId]
          );
          if (result && result.length > 0) {
            nombreCongregacion = result[0].nombre;
          } else {
            nombreCongregacion = "Congregación Desconocida";
          }
        } catch (error) {
          console.error("Error buscando el nombre de la congregación:", error);
        }
      }
    }
    cargando = false;
  }

  onMount(cargarDatos);

  function cambiarEstado(nuevoEstado: string) {
    if (visita) visita.estado = nuevoEstado;
  }

  async function guardarEstadoGeneral() {
    if (!visita) return;
    guardando = true;
    try {
      await guardarVisitaProgramada(visita);
      
      // 🌟 APRETAMOS EL GATILLO DE SINCRONIZACIÓN
      dispararSincronizacionLocal();
      
      // 🌟 EFECTO VISUAL DE ÉXITO EN EL BOTÓN (sin alertas molestas)
      exito = true;
      setTimeout(() => exito = false, 2500);

    } catch (error) {
      console.error("Error al guardar:", error);
    } finally {
      guardando = false;
    }
  }

  function volver() {
    goto(`/circuito/${idCircuito}/visitas`);
  }
</script>

<div class="documentar-layout">
  
  <header class="header-compacto">
    <button class="btn-icon-back" on:click={volver} title="Volver a la lista">
      <ArrowLeft size={20} />
    </button>
    
    {#if visita && !cargando}
      <div class="header-info">
        <h2>{nombreCongregacion}</h2>
        <span class="badge-fecha">Semana del: {visita.fechaSemana || (visita as any).fecha_semana}</span>
      </div>
    {:else}
      <div class="header-info">
        <h2>Cargando visita...</h2>
      </div>
    {/if}
  </header>

  {#if cargando}
    <div class="empty-state">Preparando módulo de visita...</div>
  {:else if !visita}
    <div class="empty-state">No se encontró la visita.</div>
  {:else}
    
    <div class="tabs-container">
      <button class="tab-btn {pestanaActiva === 'estado' ? 'active' : ''}" on:click={() => pestanaActiva = 'estado'}><Info size={18} /> <span>Estado General</span></button>
      <button class="tab-btn {pestanaActiva === 'analisis' ? 'active' : ''}" on:click={() => pestanaActiva = 'analisis'}><LayoutDashboard size={18} /> <span>Análisis</span></button>
      <button class="tab-btn {pestanaActiva === 'revision' ? 'active' : ''}" on:click={() => pestanaActiva = 'revision'}><FolderOpen size={18} /> <span>Revisión Archivos</span></button>
      <button class="tab-btn {pestanaActiva === 'programa' ? 'active' : ''}" on:click={() => pestanaActiva = 'programa'}><Calendar size={18} /> <span>Programa</span></button>
    </div>

    <div class="contenido-pestana">
      
      {#if pestanaActiva === 'estado'}
        <div class="tarjeta-formulario animar-entrada">
          <div class="form-group">
            <label>Estado actual de la visita</label>
            <div class="selector-estado">
              <button class="btn-estado pendiente {visita.estado === 'pendiente' ? 'activo' : ''}" on:click={() => cambiarEstado('pendiente')}><Clock size={16} /> Pendiente</button>
              <button class="btn-estado en_progreso {visita.estado === 'en_progreso' ? 'activo' : ''}" on:click={() => cambiarEstado('en_progreso')}><MapPin size={16} /> En Curso</button>
              <button class="btn-estado completada {visita.estado === 'completada' ? 'activo' : ''}" on:click={() => cambiarEstado('completada')}><CheckCircle size={16} /> Completada</button>
            </div>
          </div>

          <div class="form-group">
            <label for="notas">Notas Generales (Privadas)</label>
            <textarea id="notas" bind:value={visita.notas} placeholder="Anotaciones rápidas sobre esta visita que no van en el informe oficial..." rows="6"></textarea>
          </div>

          <div class="acciones-formulario">
            <!-- 🌟 BOTÓN INTELIGENTE CON ESTADOS -->
            <button class="btn-primary {exito ? 'btn-exito' : ''}" on:click={guardarEstadoGeneral} disabled={guardando}>
              {#if guardando} 
                <Save size={18} class="spin" /> Guardando... 
              {:else if exito} 
                <CheckCircle size={18} /> ¡Guardado!
              {:else} 
                <Save size={18} /> Guardar Estado 
              {/if}
            </button>
          </div>
        </div>
      
      {:else if pestanaActiva === 'analisis'}
        <div class="animar-entrada">
          <AnalisisVisita 
            visitaId={idVisita}
            {nombreCongregacion}
            fechaVisita={visita.fechaSemana || (visita as any).fecha_semana || ''}
          />
        </div>

        {:else if pestanaActiva === 'revision'}
        <div class="animar-entrada">
          <RevisionVisita 
            visitaId={idVisita}
            {nombreCongregacion}
            fechaVisita={visita.fechaSemana || (visita as any).fecha_semana || ''}
          />
        </div>

      {:else if pestanaActiva === 'programa'}
        <div class="animar-entrada">
           <ProgramaVisita {idVisita} /> <!-- 🌟 REEMPLAZAMOS EL PLACEHOLDER -->
        </div>
      {/if}

    </div>
  {/if}
</div>

<style>
  .documentar-layout { padding: 20px; max-width: 1000px; margin: 0 auto; box-sizing: border-box; animation: fadeIn 0.3s ease-out; }

  .header-compacto { display: flex; align-items: center; gap: 15px; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 1px solid var(--border-color); }
  .btn-icon-back { background: var(--bg-panel, #ffffff); border: 1px solid var(--border-color); color: var(--text-muted); width: 42px; height: 42px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; box-shadow: var(--shadow-sm); flex-shrink: 0; }
  .btn-icon-back:hover { background: var(--primary); color: white; border-color: var(--primary); transform: translateX(-2px); }
  .header-info { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .header-info h2 { margin: 0; font-size: 1.5rem; color: var(--text-main); font-weight: 800; line-height: 1; }
  .badge-fecha { font-size: 0.8rem; font-weight: 700; background: var(--bg-subtle, #f8fafc); color: var(--text-muted); padding: 4px 10px; border-radius: 12px; border: 1px solid var(--border-color); }

  .tabs-container { display: flex; gap: 30px; border-bottom: 2px solid var(--border-color); margin-bottom: 25px; padding-bottom: 0; overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
  .tabs-container::-webkit-scrollbar { display: none; }
  .tab-btn { background: transparent; border: none; padding: 12px 5px; font-size: 0.95rem; font-weight: 700; color: var(--text-muted); cursor: pointer; border-bottom: 3px solid transparent; margin-bottom: -2px; transition: all 0.2s ease; display: flex; align-items: center; gap: 8px; white-space: nowrap; }
  .tab-btn:hover { color: var(--primary); }
  .tab-btn.active { color: var(--primary); border-bottom: 3px solid var(--primary); }

  .tarjeta-formulario { background: var(--bg-panel); border: 1px solid var(--border-color); border-radius: 12px; padding: 25px; box-shadow: var(--shadow-sm); }
  .form-group { margin-bottom: 25px; display: flex; flex-direction: column; gap: 10px; }
  .form-group label { font-size: 0.9rem; font-weight: 700; color: var(--text-muted); }

  .selector-estado { display: flex; gap: 12px; flex-wrap: wrap; }
  .btn-estado { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 18px; border-radius: 20px; border: 1px solid var(--border-color); background: var(--bg-app, #f8fafc); cursor: pointer; font-weight: 600; font-size: 0.85rem; color: var(--text-muted); transition: all 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.03); }
  .btn-estado:hover { border-color: #cbd5e1; background: #ffffff; }
  .btn-estado.pendiente.activo { border-color: #facc15; background: #fef9c3; color: #854d0e; }
  .btn-estado.en_progreso.activo { border-color: #60a5fa; background: #eff6ff; color: #1e40af; }
  .btn-estado.completada.activo { border-color: #4ade80; background: #f0fdf4; color: #166534; }

  textarea { width: 100%; padding: 15px; border-radius: 10px; border: 1px solid var(--border-color); background: var(--bg-subtle, #f8fafc); color: var(--text-main); font-family: inherit; font-size: 0.95rem; resize: vertical; box-sizing: border-box; transition: border-color 0.2s; }
  textarea:focus { outline: none; border-color: var(--primary); background: #ffffff; }

  .acciones-formulario { display: flex; justify-content: flex-end; margin-top: 20px; }
  
  /* 🌟 ESTILOS DEL BOTÓN INTELIGENTE */
  .btn-primary { background: #5c0a1f; color: white; border: none; height: 44px; padding: 0 24px; border-radius: 30px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; font-weight: 700; font-size: 0.9rem; transition: all 0.3s; box-shadow: 0 4px 6px rgba(92, 10, 31, 0.2); }
  .btn-primary:hover:not(:disabled) { background: #3a0411; transform: translateY(-2px); box-shadow: 0 6px 12px rgba(92, 10, 31, 0.3); }
  
  .btn-exito { background: #10b981 !important; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3) !important; }
  
  .spin { animation: spin 1s linear infinite; }
  @keyframes spin { 100% { transform: rotate(360deg); } }

  .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; color: var(--text-muted); text-align: center; }
  .placeholder-box { border: 1px dashed var(--border-color); border-radius: 12px; background: rgba(0,0,0,0.01); }
  
  .animar-entrada { animation: fadeIn 0.3s ease-out; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

  @media (max-width: 768px) {
    .documentar-layout { padding: 15px; }
    .header-compacto { flex-direction: column; align-items: flex-start; gap: 15px; }
    .header-info h2 { font-size: 1.3rem; }
    .tabs-container { gap: 15px; margin-bottom: 20px; flex-direction: row; }
    .tab-btn { padding: 10px 5px; width: auto; border-left: none; border-bottom: 3px solid transparent; background: transparent; border-radius: 0; margin-bottom: -2px; }
    .tab-btn.active { border-left: none; border-bottom: 3px solid var(--primary); background: transparent; box-shadow: none; }
    .selector-estado { flex-direction: column; }
    .btn-estado { flex-direction: row; justify-content: flex-start; padding: 14px 20px; min-width: 100px; }
    .acciones-formulario { justify-content: stretch; }
    .btn-primary { width: 100%; }
  }
</style>