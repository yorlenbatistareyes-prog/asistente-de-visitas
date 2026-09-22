<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { MapPin, Calendar, Clock, CheckCircle, ArrowRight, BookOpen, Users, Trash2 } from "lucide-svelte";
  import { ask } from '@tauri-apps/plugin-dialog'; // <-- AÑADE ESTA LÍNEA
  
  import { 
    obtenerVisitasPorCircuito, 
    eliminarVisitaProgramada,
    type VisitaVista 
  } from '$lib/services/db';

  $: idCircuito = Number($page.params.id);
  $: rutaFiltro = $page.url.searchParams.get('ruta'); 

  let pestanaActiva: 'visitas' | 'pastoreo' = 'visitas';
  let filtroEstado: 'todas' | 'pendiente' | 'en_progreso' | 'completada' = 'todas';

  let visitas: VisitaVista[] = [];
  let cargando = true;

  // Lógica reactiva: se actualiza automáticamente al cambiar el filtro o la lista principal
  $: visitasFiltradas = visitas.filter(v => filtroEstado === 'todas' || v.estado === filtroEstado);

  async function cargarVisitas() {
    cargando = true;
    try {
      if (idCircuito) {
        let datos = await obtenerVisitasPorCircuito(idCircuito);
        visitas = datos;
      }
    } catch (error) {
      console.error("Error al cargar las visitas reales:", error);
    } finally {
      cargando = false;
    }
  }

  onMount(cargarVisitas);

  $: if (idCircuito) {
    cargarVisitas();
  }

  function abrirVisita(visitaId: number) {
    goto(`/circuito/${idCircuito}/visitas/${visitaId}`);
  }

  // Función para eliminar con paso por el embudo db.ts y diálogo NATIVO
  async function confirmarEliminarVisita(id: number) {
    // ask() pausa la ejecución de Svelte hasta que el usuario haga clic en Sí o No
    const confirmado = await ask('¿Estás seguro de que deseas eliminar esta visita programada?', {
      title: 'Eliminar Visita',
      kind: 'warning'
    });

    if (confirmado) {
      try {
        await eliminarVisitaProgramada(id); 
        // Actualizamos la lista local inmediatamente solo si se confirmó
        visitas = visitas.filter(v => v.id !== id);
      } catch (error) {
        console.error("Error al eliminar la visita:", error);
      }
    }
  }
</script>

<div class="visitas-layout">
  <div class="header-section">
    <div>
      <h3>Visitas Programadas</h3>
      <p>Documenta y gestiona el progreso de cada semana.</p>
    </div>
  </div>

  <div class="tabs-internas">
    <button 
      class="tab-btn {pestanaActiva === 'visitas' ? 'active' : ''}" 
      on:click={() => pestanaActiva = 'visitas'}
    >
      <BookOpen size={16} /> Visitas Regulares
    </button>
    <button 
      class="tab-btn {pestanaActiva === 'pastoreo' ? 'active' : ''}" 
      on:click={() => pestanaActiva = 'pastoreo'}
    >
      <Users size={16} /> Visitas de Pastoreo
    </button>
  </div>

  <!-- CONTENIDO: VISITAS REGULARES -->
  {#if pestanaActiva === 'visitas'}
    
    <!-- Filtros de estado -->
    <div class="filtros-estado">
      <button class="chip-filtro {filtroEstado === 'todas' ? 'activo' : ''}" on:click={() => filtroEstado = 'todas'}>Todas</button>
      <button class="chip-filtro {filtroEstado === 'pendiente' ? 'activo' : ''}" on:click={() => filtroEstado = 'pendiente'}>Pendientes</button>
      <button class="chip-filtro {filtroEstado === 'en_progreso' ? 'activo' : ''}" on:click={() => filtroEstado = 'en_progreso'}>En Curso</button>
      <button class="chip-filtro {filtroEstado === 'completada' ? 'activo' : ''}" on:click={() => filtroEstado = 'completada'}>Completadas</button>
    </div>

    {#if cargando}
      <div class="empty-state">Cargando visitas...</div>
    {:else if visitasFiltradas.length === 0}
      <div class="empty-state">
        <BookOpen size={48} color="var(--text-muted)" style="margin-bottom: 15px; opacity: 0.5;" />
        <p>No hay visitas que coincidan con este filtro.</p>
      </div>
    {:else}
      <div class="lista-visitas">
        {#each visitasFiltradas as visita}
          <div class="visita-item">
            
            <div class="visita-info">
              <div class="fecha-bloque">
                <span class="dia">{new Date(visita.fechaSemana + 'T12:00:00').getDate()}</span>
                <span class="mes">{new Date(visita.fechaSemana + 'T12:00:00').toLocaleString('es-ES', { month: 'short' }).toUpperCase()}</span>
              </div>
              
              <div class="detalles">
                <h5>{visita.nombreCongregacion}</h5>
                <p class="sub-texto">{visita.nombreRuta}</p>
                
                <div class="estado-badge {visita.estado}">
                  {#if visita.estado === 'pendiente'}
                    <Clock size={12} /> Pendiente
                  {:else if visita.estado === 'en_progreso'}
                    <MapPin size={12} /> En Curso
                  {:else}
                    <CheckCircle size={12} /> Completada
                  {/if}
                </div>
              </div>
            </div>

            <!-- Botones de Acción -->
            <div class="acciones-visita">
              <button class="btn-accion {visita.estado !== 'pendiente' && visita.estado !== 'en_progreso' ? 'btn-completado' : ''}" on:click={() => abrirVisita(visita.id)}>
                {#if visita.estado === 'pendiente'}
                  Documentar <ArrowRight size={14} />
                {:else if visita.estado === 'en_progreso'}
                  Continuar <ArrowRight size={14} />
                {:else}
                  Revisar <ArrowRight size={14} />
                {/if}
              </button>
              <button class="btn-borrar" on:click={() => confirmarEliminarVisita(visita.id)} title="Eliminar visita">
                <Trash2 size={18} />
              </button>
            </div>
            
          </div>
        {/each}
      </div>
    {/if}

  <!-- CONTENIDO: VISITAS DE PASTOREO -->
  {:else if pestanaActiva === 'pastoreo'}
    <div class="empty-state">
      <Users size={48} color="var(--text-muted)" style="margin-bottom: 15px; opacity: 0.5;" />
      <p>Aquí se listarán las visitas de pastoreo programadas.<br>Módulo en construcción.</p>
    </div>
  {/if}

</div>

<style>
  .visitas-layout {
    animation: fadeIn 0.3s ease-out;
    padding: 15px 20px;
    max-width: 900px; 
    margin: 0 auto;
    box-sizing: border-box;
  }

  .header-section { 
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 20px; 
    gap: 15px;
  }
  
  .header-section h3 { margin: 0 0 5px 0; font-size: 1.5rem; color: var(--text-main); font-weight: 800; }
  .header-section p { margin: 0; color: var(--text-muted); font-size: 0.9rem; }

  /* PESTAÑAS (TABS) */
  .tabs-internas {
    display: flex;
    gap: 10px;
    margin-bottom: 15px;
    border-bottom: 2px solid var(--border-color);
    padding-bottom: 15px;
    overflow-x: auto;
  }

  .tab-btn {
    background: transparent;
    border: 1px solid var(--border-color);
    padding: 8px 18px;
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--text-muted);
    cursor: pointer;
    border-radius: 20px;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 8px;
    white-space: nowrap;
  }

  .tab-btn:hover {
    color: var(--primary);
    border-color: var(--primary);
    background: var(--bg-app);
  }

  .tab-btn.active {
    background: var(--primary);
    color: white;
    border-color: var(--primary);
    box-shadow: 0 2px 6px rgba(92, 10, 31, 0.2);
  }

  /* FILTROS (CHIPS) */
  .filtros-estado {
    display: flex;
    gap: 8px;
    margin-bottom: 15px;
    overflow-x: auto;
    padding-bottom: 5px;
  }
  
  .chip-filtro {
    background: transparent;
    border: 1px solid var(--border-color);
    border-radius: 16px;
    padding: 6px 14px;
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--text-muted);
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }
  
  .chip-filtro:hover {
    border-color: var(--primary);
    color: var(--primary);
  }
  
  .chip-filtro.activo {
    background: var(--primary);
    color: white;
    border-color: var(--primary);
  }

  /* LISTA DE VISITAS - MODO OSCURO CORREGIDO */
  .lista-visitas { display: flex; flex-direction: column; gap: 12px; }

  .visita-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 16px;
    border: 1px solid var(--border-color);
    border-radius: 12px;
    background: var(--bg-panel) !important; /* 🔥 MODO OSCURO */
    color: var(--text-main) !important;
    transition: all 0.2s;
    box-sizing: border-box;
  }
  .visita-item:hover { border-color: var(--primary); transform: translateY(-2px); box-shadow: var(--shadow-sm); }

  .visita-info { display: flex; align-items: center; gap: 15px; flex: 1; min-width: 0; }

  .fecha-bloque {
    background: var(--bg-app) !important; /* 🔥 ADAPTATIVO */
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 6px 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 55px;
    flex-shrink: 0;
  }
  .fecha-bloque .dia { font-size: 1.3rem; font-weight: 800; color: var(--text-main); line-height: 1; }
  .fecha-bloque .mes { font-size: 0.7rem; font-weight: 700; color: var(--primary); margin-top: 2px; }

  .detalles { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; align-items: flex-start; }
  .detalles h5 { margin: 0; font-size: 1.05rem; color: var(--text-main) !important; font-weight: 800; line-height: 1.2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
  .sub-texto { margin: 0; font-size: 0.8rem; color: var(--text-muted) !important; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }

  /* INSIGNIAS DE ESTADO ADAPTADAS */
  .estado-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .estado-badge.pendiente { background: rgba(234, 179, 8, 0.15); color: #eab308; border: 1px solid rgba(234, 179, 8, 0.3); }
  .estado-badge.en_progreso { background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); }
  .estado-badge.completada { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }

  /* BOTONES DE ACCIÓN */
  .acciones-visita { 
    display: flex; 
    align-items: center; 
    gap: 10px; 
    flex-shrink: 0; 
  }

  .btn-accion {
    background: var(--primary); border: none; color: white;
    height: 38px; padding: 0 20px; border-radius: 20px; display: inline-flex; align-items: center; justify-content: center;
    gap: 8px; cursor: pointer; font-weight: 700; font-size: 0.85rem; transition: all 0.2s;
    white-space: nowrap; box-shadow: 0 2px 4px rgba(92, 10, 31, 0.2);
  }
  .btn-accion:hover { background: #3a0411; transform: translateY(-1px); box-shadow: 0 4px 8px rgba(92, 10, 31, 0.3); }

/* Variante para botón de visita completada */
  .btn-accion.btn-completado {
    background: transparent !important;
    border: 1px solid var(--border-color) !important;
    color: var(--text-muted) !important;
    box-shadow: none !important;
  }
  .btn-accion.btn-completado:hover {
    border-color: var(--primary) !important;
    color: var(--primary) !important;
    transform: translateY(-1px);
  }
  .btn-borrar {
    background: transparent; border: 1px solid #fecaca; color: #ef4444; 
    width: 38px; height: 38px; border-radius: 8px; display: flex; 
    align-items: center; justify-content: center; cursor: pointer; 
    transition: all 0.2s; flex-shrink: 0;
  }
  .btn-borrar:hover { 
    background: #ef4444; color: white; border-color: #ef4444; 
  }

  .empty-state { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 60px 20px; border-style: dashed; border-color: var(--border-color); color: var(--text-muted); background: transparent; border-radius: 12px; }

  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

  /* DISEÑO RESPONSIVO (MÓVILES) */
  @media (max-width: 768px) {
    .visitas-layout { padding: 15px !important; }
    
    .tabs-internas { padding-bottom: 10px; }
    .tab-btn { flex: 1; justify-content: center; }

    .visita-item { 
      flex-direction: column; 
      align-items: flex-start; 
      gap: 15px; 
      padding: 16px;
    }
    .visita-info { width: 100%; align-items: flex-start; }
    
    .acciones-visita { 
      width: 100%; 
      display: grid; 
      grid-template-columns: 1fr auto; 
      gap: 10px; 
    }
    .btn-accion { 
      grid-column: 1;
      width: 100%; 
      justify-content: center; 
      height: 42px; 
    }
    .btn-borrar {
      grid-column: 2;
      width: 42px;
      height: 42px;
    }
  }
</style>