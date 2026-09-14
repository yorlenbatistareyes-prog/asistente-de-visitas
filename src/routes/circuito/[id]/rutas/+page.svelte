<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { goto, afterNavigate } from '$app/navigation';
  import { Calendar, Plus, Briefcase, ArrowRight, Map } from "lucide-svelte";
  import { confirm } from '@tauri-apps/plugin-dialog';

  import { 
    obtenerRutasPorCircuito, 
    guardarRuta,
    eliminarRuta, 
    obtenerCircuitoPorId,
    obtenerCongregaciones,
    guardarVisitaProgramada,
    obtenerVisitasPorCircuito,
    type Ruta,
    type Congregacion,
    type VisitaVista
  } from '$lib/services/db';

  $: idCircuito = Number($page.params.id);

  let rutas: Ruta[] = [];
  let congregaciones: Congregacion[] = [];
  let visitasProgramadas: VisitaVista[] = [];
  let cargando = true;

  // --- CONTROL DE MODALES ---
  let mostrarModalNuevoEvento = false;
  let mostrarModalCambiar = false;

   // --- DATOS PARA CAMBIAR CONGREGACIÓN ---
    // --- DATOS PARA EDICIÓN ---
  let rutaEnEdicion: Ruta | null = null;

  // --- DATOS DEL NUEVO EVENTO ---
  let fechaSeleccionada = "";
  let tipoVisita = "Visita normal";

  // --- DATOS PARA ASIGNAR CONGREGACIÓN ---
  let congregacionSeleccionadaId: number | "" = "";

     // Función auxiliar: obtiene el nombre de la congregación asignada a una ruta
  function obtenerNombreCongregacion(ruta: Ruta): string | null {
    if (!ruta.congregacionId) return null;
    const cong = congregaciones.find(c => c.id === ruta.congregacionId);
    return cong ? cong.nombre : null;
  }

  async function cargarDatos() {
  cargando = true;
  if (idCircuito) {
    const rutasObtenidas = await obtenerRutasPorCircuito(idCircuito);
    rutas = rutasObtenidas.sort((a, b) => {
      return new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime();
    });
    
    const circuito = await obtenerCircuitoPorId(idCircuito);
    if (circuito) {
      congregaciones = await obtenerCongregaciones(circuito.nombre);
    }

    // NUEVO: Consultamos las visitas ya creadas en este circuito
    visitasProgramadas = await obtenerVisitasPorCircuito(idCircuito);
  }
  cargando = false;
}

onMount(cargarDatos);

  $: if (idCircuito) {
    cargarDatos();
  }

  // NUEVO: Forzamos recarga al usar el botón "Atrás" del móvil
  afterNavigate(() => {
    cargarDatos();
  });

  // NUEVO: Variable 100% reactiva y más rápida
  $: rutasConVisita = new Set(visitasProgramadas.map(v => v.rutaId || (v as any).ruta_id));

    function abrirModalNuevoEvento() {
    // Modo creación: limpia todos los campos
    rutaEnEdicion = null;
    fechaSeleccionada = new Date().toISOString().split('T')[0];
    tipoVisita = "Visita normal";
    congregacionSeleccionadaId = "";
    mostrarModalNuevoEvento = true;
  }

      async function agregarRuta() {
    if (!fechaSeleccionada) {
      alert("Por favor, selecciona una fecha de inicio.");
      return;
    }

    if (!congregacionSeleccionadaId) {
      alert("Por favor, selecciona una congregación.");
      return;
    }

    // Calculamos el final de la semana (domingo)
    const fechaIn = new Date(fechaSeleccionada + 'T12:00:00');
    const fechaFin = new Date(fechaIn);
    fechaFin.setDate(fechaFin.getDate() + 5);
    const fechaFinString = fechaFin.toISOString().split('T')[0];

    const datosRuta: Ruta = {
      id: rutaEnEdicion?.id,
      circuitoId: idCircuito,
      congregacionId: Number(congregacionSeleccionadaId),
      nombre: tipoVisita,
      fechaInicio: fechaSeleccionada,
      fechaFin: fechaFinString,
      completada: rutaEnEdicion?.completada ?? false
    };

    try {
      await guardarRuta(datosRuta);
      mostrarModalNuevoEvento = false;
      rutaEnEdicion = null;
      fechaSeleccionada = "";
      tipoVisita = "Visita normal";
      congregacionSeleccionadaId = "";
      await cargarDatos();
    } catch (error) {
      alert("Ocurrió un error al guardar el evento.");
      console.error(error);
    }
  }

async function borrarRuta(ruta: Ruta) {
  if (!ruta.id) return;
  
  // Diálogo nativo de Tauri v2 (es asíncrono, requiere await)
  const confirmado = await confirm(`¿Eliminar el evento de la semana del ${ruta.fechaInicio}?`, {
    title: 'Confirmar eliminación',
    kind: 'warning'
  });
  
  if (!confirmado) return;

  try {
    await eliminarRuta(ruta.id);
    await cargarDatos();
  } catch (error) {
    console.error(error);
  }
}

   async function iniciarCreacionVisita(ruta: Ruta) {
    if (!ruta.id || !ruta.congregacionId) {
      alert("Esta ruta no tiene congregación asignada.");
      return;
    }

    try {
      await guardarVisitaProgramada({
        rutaId: ruta.id,
        congregacionId: ruta.congregacionId,
        fechaSemana: ruta.fechaInicio,
        estado: 'pendiente'
      });

      goto(`/circuito/${idCircuito}/visitas?ruta=${ruta.id}`);
    } catch (error) {
      console.error("Error al crear la visita:", error);
      alert("Hubo un error al guardar la visita.");
    }
  }

    // Abre el modal para cambiar congregación
    function abrirModalEdicion(ruta: Ruta) {
    // Modo edición: carga los datos actuales
    rutaEnEdicion = ruta;
    fechaSeleccionada = ruta.fechaInicio;
    tipoVisita = ruta.nombre;
    congregacionSeleccionadaId = ruta.congregacionId || "";
    mostrarModalNuevoEvento = true;
  }

</script>

<div class="rutas-layout">
  <div class="header-section">
    <div>
      <h3>Ruta</h3>
      <p>Organiza tu calendario de visitas.</p>
    </div>
    
    <button class="btn-global btn-primary" on:click={abrirModalNuevoEvento}>
      <Plus size={14} /> Nuevo Evento
    </button>
  </div>

  {#if cargando}
    <div class="empty-state">Cargando itinerario...</div>
  {:else if rutas.length === 0}
    <div class="card-global empty-state">
      <Map size={48} color="var(--text-muted)" style="margin-bottom: 15px; opacity: 0.5;" />
      <p>Aún no has planificado ninguna semana.<br>Haz clic en "Añadir Nuevo Evento" para comenzar.</p>
    </div>
  {:else}
    <div class="lista-rutas">
      {#each rutas as ruta}
        <div class="ruta-item card-global">
          <div class="ruta-info">

            <div class="fecha-bloque">
              <span class="dia">{new Date(ruta.fechaInicio + 'T12:00:00').getDate()}</span>
              <span class="mes">{new Date(ruta.fechaInicio + 'T12:00:00').toLocaleString('es-ES', { month: 'short' }).toUpperCase()}</span>
            </div>

            <div class="detalles">
              <h5>{ruta.nombre}</h5>
            </div>

          </div>

          <div class="acciones-ruta">
            {#if obtenerNombreCongregacion(ruta)}
              <div class="asignacion-bloque">
               
                <span class="asignado-nombre">{obtenerNombreCongregacion(ruta)}</span>
                
                <button class="btn-mini" on:click={() => abrirModalEdicion(ruta)} title="Editar evento">
                  Cambiar
                </button>

              </div>
            {/if}

            {#if rutasConVisita.has(ruta.id)}
              <button class="btn-accion btn-disabled" disabled title="Esta visita ya fue creada">
                 Visita Creada
              </button>
            {:else}
              <button class="btn-accion" on:click={() => iniciarCreacionVisita(ruta)}>
                 Crear Visita <ArrowRight size={14} />
              </button>
            {/if}

            <button class="btn-borrar" on:click={() => borrarRuta(ruta)} title="Eliminar evento">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
              </svg>
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- ==========================================
     MODAL 1: AÑADIR NUEVO EVENTO (ESTILO IMAGEN)
     ========================================== -->
{#if mostrarModalNuevoEvento}
  <div class="modal-backdrop">
    <div class="card-global modal-content">
      <div class="modal-header-banner">
                <h2>{rutaEnEdicion ? 'Editar Evento' : 'Añadir Nuevo Evento'}</h2>
      </div>

      <div class="form-group" style="margin-top: 20px;">
        <label for="fecha">Fecha de inicio del evento</label>
        <div class="input-calendar-wrapper">
          <Calendar size={18} class="calendar-icon" />
          <input type="date" id="fecha" class="input-global calendar-input" bind:value={fechaSeleccionada} />
        </div>
      </div>

      <div class="form-group">
        <label for="tipo">Evento</label>
        <select id="tipo" class="input-global" bind:value={tipoVisita}>
          <option value="Visita a una congregación">Visita a una congregación</option>
          <option value="Hacer visita de pastoreo">Hacer Visita de Pastoreo</option>
          <option value="Recibir visita de pastoreo">Recibir Visita de Pastoreo</option>
          <option value="Asamblea de Circuito">Asamblea de Circuito</option>
          <option value="Semana de Descanso">Semana de Descanso</option>
        </select>
      </div>

      <div class="form-group">
        <label for="cong">Congregación *</label>
        <select id="cong" class="input-global" bind:value={congregacionSeleccionadaId}>
          <option value="">-- Selecciona una congregación --</option>
          {#each congregaciones as cong}
            {#if cong.id}
              <option value={cong.id}>{cong.nombre}</option>
            {/if}
          {/each}
        </select>
      </div>

      <div class="modal-actions">
        <button class="btn-global" on:click={() => (mostrarModalNuevoEvento = false)}>Cancelar</button>
        <button class="btn-global btn-primary" on:click={agregarRuta}>
          {rutaEnEdicion ? 'Actualizar Evento' : 'Guardar Evento'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  /* 1. CONTENEDOR PRINCIPAL - Añadimos padding para despegarlo de los bordes */
  .rutas-layout {
    animation: fadeIn 0.3s ease-out;
    padding: 15px 20px; /* Espacio horizontal vital para móviles */
    max-width: 900px; 
    margin: 0 auto;
    box-sizing: border-box;
  }

  .header-section { 
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 25px; 
    gap: 15px;
  }
  
  .header-section h3 { margin: 0 0 5px 0; font-size: 1.5rem; color: var(--text-main); font-weight: 800; }
  .header-section p { margin: 0; color: var(--text-muted); font-size: 0.9rem; }

  /* BOTÓN NUEVO EVENTO */
  .btn-primary {
    background-color: #5c0a1f !important; color: white !important;
    border: none; height: 38px; padding: 0 20px; border-radius: 30px;
    display: inline-flex; align-items: center; gap: 8px; cursor: pointer;
    font-weight: 700; font-size: 0.85rem; transition: all 0.2s ease;
    box-shadow: 0 2px 4px rgba(92, 10, 31, 0.2);
    white-space: nowrap; /* Evita que se rompa en dos líneas */
  }
  .btn-primary:hover { background-color: #3a0411 !important; transform: translateY(-1px); box-shadow: 0 4px 8px rgba(92, 10, 31, 0.3); }

  /* LISTA DE RUTAS */
  .lista-rutas { display: flex; flex-direction: column; gap: 12px; }

  .ruta-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 16px;
    border: 1px solid var(--border-color);
    border-radius: 12px;
    background: #ffffff;
    transition: all 0.2s;
    box-sizing: border-box;
  }
  .ruta-item:hover { border-color: var(--primary); transform: translateY(-2px); box-shadow: var(--shadow-sm); }

  /* CONTENIDO IZQUIERDO DE LA TARJETA (Fecha + Título) */
  .ruta-info { display: flex; align-items: center; gap: 15px; flex: 1; min-width: 0; }

  .fecha-bloque {
    background: var(--bg-subtle, #f1f5f9);
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

  .detalles { flex: 1; min-width: 0; }
  .detalles h5 { 
    margin: 0;
    font-size: 1.05rem; 
    color: var(--text-main); 
    font-weight: 700; 
    line-height: 1.2;
    white-space: normal;
  }

  /* BLOQUE DE ASIGNACIÓN (Verde) */
  .asignacion-bloque {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 20px;
    padding: 6px 12px;
    box-sizing: border-box;
  }

  .asignado-label { font-size: 0.7rem; color: #15803d; font-weight: 600; white-space: nowrap; }
  .asignado-nombre {
    font-size: 0.8rem;
    color: #166534;
    font-weight: 800;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 160px;
  }

  .btn-mini {
    height: 26px; padding: 0 12px; font-size: 0.7rem; font-weight: 700; border-radius: 13px; background: white; border: 1px solid #16a34a; color: #16a34a; cursor: pointer; transition: all 0.2s; white-space: nowrap; flex-shrink: 0;
  }
  .btn-mini:hover { background: #16a34a; color: white; }

  /* CONTENEDOR DE ACCIONES (Botones de la derecha) */
  .acciones-ruta {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  }

  .btn-accion {
    background: transparent; border: 1px solid var(--primary); color: var(--primary);
    height: 36px; padding: 0 16px; border-radius: 20px; display: inline-flex; align-items: center; justify-content: center;
    gap: 6px; cursor: pointer; font-weight: 700; font-size: 0.8rem; transition: all 0.2s;
    white-space: nowrap; flex-shrink: 0;
  }
  .btn-accion:hover { background: var(--primary); color: white; }

  .btn-borrar {
    background: transparent; border: 1px solid #fecaca; color: #ef4444; width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; flex-shrink: 0;
  }
  .btn-borrar:hover { background: #ef4444; color: white; border-color: #ef4444; }

  /* ESTADOS VACÍOS Y MODALES */
  .empty-state { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 40px 20px; border-style: dashed; border-color: var(--border-color); color: var(--text-muted); background: transparent; border-radius: 12px; }
  .modal-backdrop { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(4px); display: flex; justify-content: center; align-items: center; z-index: 2000; padding: 20px; box-sizing: border-box; }
  .modal-content { width: 100%; max-width: 440px; background: var(--bg-panel); border-radius: var(--radius-lg); padding: 0; overflow: hidden; box-shadow: var(--shadow-3d); animation: scaleIn 0.2s ease-out; }
  .modal-header-banner { background-color: #1e293b; color: white; padding: 15px 20px; }
  .modal-header-banner h2 { margin: 0; font-size: 1.15rem; font-weight: 700; }
  .modal-content .form-group { padding: 0 20px; margin-bottom: 15px; display: flex; flex-direction: column; gap: 6px; }
  .modal-content .form-group:first-of-type { margin-top: 20px; }
  .form-group label { font-size: 0.85rem; font-weight: 700; color: var(--text-muted); }
  .input-calendar-wrapper { position: relative; display: flex; align-items: center; }
  .calendar-icon { position: absolute; left: 12px; color: var(--text-muted); pointer-events: none; }
  .calendar-input { padding-left: 40px !important; }
  .modal-actions { display: flex; justify-content: flex-end; gap: 10px; padding: 15px 20px; background: var(--bg-subtle, #f8fafc); border-top: 1px solid var(--border-color); }

  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }

      /* =========================================
     DISEÑO RESPONSIVO (MÓVILES) - LIMPIO
     ========================================= */
  @media (max-width: 768px) {
    .rutas-layout {
      padding: 15px !important;
    }

    .header-section {
      flex-direction: column;
      align-items: stretch;
      gap: 15px;
    }

        .header-section > button.btn-global.btn-primary {
      align-self: flex-end;
      width: auto;
      max-width: max-content;
      height: 26px !important;
      min-height: 26px !important;
      max-height: 26px !important;
      padding: 0 10px !important;
      font-size: 0.75rem;
      line-height: 26px !important;
      gap: 4px;
      box-sizing: border-box;
    }

    /* ===== TARJETA EN MÓVIL ===== */
    .ruta-item {
      flex-direction: column;
      align-items: stretch;
      gap: 14px;
      padding: 16px;
    }

    /* Cabecera: Fecha + Título */
    .ruta-info {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border-color, #e2e8f0);
    }

    .fecha-bloque {
      min-width: 52px;
      padding: 6px 10px;
    }
    .fecha-bloque .dia { font-size: 1.2rem; }
    .fecha-bloque .mes { font-size: 0.65rem; }

    .detalles h5 {
      font-size: 0.95rem;
      line-height: 1.3;
    }

    /* Contenedor de acciones con wrap */
    .acciones-ruta {
      display: flex;
      flex-wrap: wrap;
      width: 100%;
      gap: 10px;
    }

    /* Fila 1: Badge verde a todo el ancho */
    .acciones-ruta > .asignacion-bloque {
      flex: 1 1 100%;
      width: 100%;
      justify-content: space-between;
      padding: 10px 14px;
      border-radius: 10px;
      gap: 10px;
    }

    .asignado-nombre {
      flex: 1;
      max-width: none;
      font-size: 0.8rem;
    }

    .btn-mini { flex-shrink: 0; }

        /* Fila 2: Crear Visita (crece) + Eliminar (mismo alto que Nuevo Evento) */
       .acciones-ruta > .btn-accion {
      flex: 0 0 auto !important;
      height: 26px !important;
      min-height: 26px !important;
      max-height: 26px !important;
      width: fit-content !important;
      min-width: 0 !important;
      max-width: fit-content !important;
      justify-content: center;
      font-size: 0.75rem;
      line-height: 26px !important;
      padding: 0 12px !important;
      box-sizing: border-box;
      gap: 4px;
    }

    .acciones-ruta > .btn-borrar {
      flex: 0 0 26px;
      width: 26px;
      height: 26px !important;
      min-height: 26px !important;
      max-height: 26px !important;
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    /* Modal */
    .modal-actions { flex-direction: column-reverse; }
    .modal-actions button { width: 100%; height: 44px; }
  }

  .btn-disabled {
  background: #f1f5f9 !important;
  border: 1px solid #cbd5e1 !important;
  color: #94a3b8 !important;
  cursor: not-allowed !important;
  opacity: 0.8;
  box-shadow: none !important;
}
</style>