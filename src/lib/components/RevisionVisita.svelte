<script lang="ts">
  import { CheckCircle2, Save, Calendar, TrendingUp, TrendingDown, Minus, Users, Star, UserCheck, AlertTriangle, Map, BookOpen, UserX, Presentation } from 'lucide-svelte';
  import { onMount } from 'svelte';
  import { 
    obtenerRevisionPorVisita,
    obtenerContadoresRevisionAnterior, 
    guardarRevisionVisita, 
    type RevisionVisita 
  } from '$lib/services/db';

  // Props
  export let visitaId: number;
  export let nombreCongregacion: string = "";
  export let fechaVisita: string = "";

  // Estado de los contadores
  let contadores: Record<string, number> = {
    // S-21 (Publicadores y actividad)
    total: 0, bautizados: 0, mayores65: 0, nuevos: 0,
    readmitidos: 0, reactivados: 0, irregulares: 0, inactivos: 0,
    totalInactivos: 0,
    tarjetasSacadas: 0, sacados: 0,
    precursoresRegulares: 0, precursoresAuxiliares: 0, precursoresAuxiliaresPermanentes: 0,
    ancianos: 0, siervosMinisteriales: 0,
    sinCursos: 0, totalCursosBiblicos: 0,
    // S-13 (Territorios)
    totalTerritorios: 0, territoriosSinTrabajar6Meses: 0, territoriosSinTrabajar1Ano: 0,
    // S-88 (Asistencia a reuniones)
    asistenciaEntreSemana: 0, asistenciaFinSemana: 0
  };

  // Memoria para tendencias
  let datosAnteriores: Record<string, number> | null = null;

  // Estados visuales
  let revisionId: number | null = null;
  let guardando = false;
  let exito = false;
  let cargando = true;

  // Pestañas de formularios JW
  let pestanaActiva: 's21' | 's13' | 's88' = 's21';

  $: totalPubs = Number(contadores.total) || 0;
  $: totalTerr = Number(contadores.totalTerritorios) || 0;

  // ═══════════════════════════════════════════════
  // S-21: PUBLICADORES Y ACTIVIDAD
  // ═══════════════════════════════════════════════
    const tarjetasS21 = [
    { id: 'total', titulo: 'Total de publicadores', color: 'blue', icono: 'users' },
    { id: 'mayores65', titulo: 'Mayores de 65 años', color: 'blue', icono: 'users' },
    { id: 'totalCursosBiblicos', titulo: 'Total cursos bíblicos', color: 'green', icono: 'book' },
    { id: 'sinCursos', titulo: 'Sin cursos bíblicos', color: 'slate', icono: 'alert' },
    { id: 'nuevos', titulo: 'Nuevos publicadores', color: 'green', icono: 'star' },
    { id: 'bautizados', titulo: 'Bautizados', color: 'green', icono: 'star' },
    { id: 'readmitidos', titulo: 'Readmitidos', color: 'green', icono: 'star' },
    { id: 'reactivados', titulo: 'Reactivados', color: 'green', icono: 'star' },
    { id: 'irregulares', titulo: 'Irregulares', color: 'orange', icono: 'alert' },
    { id: 'inactivos', titulo: 'Inactivos (6 meses)', color: 'red', icono: 'alert' },
    { id: 'totalInactivos', titulo: 'Total de inactivos', color: 'red', icono: 'userx' },
    { id: 'tarjetasSacadas', titulo: 'Tarjetas sacadas', color: 'slate', icono: 'users' },
    { id: 'sacados', titulo: 'Sacados', color: 'slate', icono: 'users' },
    { id: 'precursoresRegulares', titulo: 'Precursores Regulares', color: 'blue', icono: 'star' },
    { id: 'precursoresAuxiliares', titulo: 'Precursores Auxiliares', color: 'blue', icono: 'star' },
    { id: 'precursoresAuxiliaresPermanentes', titulo: 'Prec. Auxiliares Permanentes', color: 'blue', icono: 'star' },
    { id: 'ancianos', titulo: 'Ancianos', color: 'slate', icono: 'usercheck' },
    { id: 'siervosMinisteriales', titulo: 'Siervos Ministeriales', color: 'slate', icono: 'usercheck' }
  ];

  // ═══════════════════════════════════════════════
  // S-13: TERRITORIOS
  // ═══════════════════════════════════════════════
  const tarjetasS13 = [
    { id: 'totalTerritorios', titulo: 'Total de Territorios', color: 'slate', icono: 'map' },
    { id: 'territoriosSinTrabajar6Meses', titulo: 'Sin trabajar 6 meses', color: 'orange', icono: 'alert' },
    { id: 'territoriosSinTrabajar1Ano', titulo: 'Sin trabajar 1 año', color: 'red', icono: 'alert' }
  ];

  // ═══════════════════════════════════════════════
  // S-88: ASISTENCIA A REUNIONES
  // ═══════════════════════════════════════════════
    const tarjetasS88 = [
    { id: 'asistenciaEntreSemana', titulo: 'Entre semana', color: 'blue', icono: 'presentation' },
    { id: 'asistenciaFinSemana', titulo: 'Fin de Semana', color: 'blue', icono: 'presentation' }
  ];

  function iconoPorNombre(nombre: string) {
    switch(nombre) {
      case 'users': return Users;
      case 'star': return Star;
      case 'usercheck': return UserCheck;
      case 'userx': return UserX;
      case 'alert': return AlertTriangle;
      case 'map': return Map;
      case 'book': return BookOpen;
            case 'presentation': return Presentation;
      default: return Users;
    }
  }

  // Calcular tendencia comparando con datos anteriores
  function obtenerTendencia(clave: string, valorActual: number) {
    if (!datosAnteriores || datosAnteriores[clave] === undefined) return null;

    const valorAnterior = Number(datosAnteriores[clave]);
    const actual = Number(valorActual);
    if (valorAnterior === 0 && actual === 0) return null;

    const diferencia = actual - valorAnterior;
    if (diferencia === 0) return { color: 'gris', texto: 'Igual', icono: 'minus' };

    let porcentaje = 0;
    if (valorAnterior > 0) porcentaje = (Math.abs(diferencia) / valorAnterior) * 100;

    const invertidos = ['sinCursos', 'irregulares', 'inactivos', 'totalInactivos', 'tarjetasSacadas', 'sacados', 'territoriosSinTrabajar1Ano', 'territoriosSinTrabajar6Meses'];
    const esMaloSubir = invertidos.includes(clave);

    let color = 'gris';
    if (diferencia > 0) color = esMaloSubir ? 'rojo' : 'verde';
    else color = esMaloSubir ? 'verde' : 'rojo';

    const signo = diferencia > 0 ? '+' : '-';
    const textoPct = valorAnterior > 0 ? `${porcentaje.toFixed(1)}%` : 'Nuevo';

    return { color, icono: diferencia > 0 ? 'up' : 'down', texto: `${signo}${Math.abs(diferencia)} (${textoPct})` };
  }

  // 🌟 NUEVO: Color dinámico del porcentaje en S-88
  // Verde si es >= 100%, rojo si es < 100%
  function colorPorcentajeAsistencia(porcentaje: number): string {
    return porcentaje >= 100 ? 'verde' : 'rojo';
  }

    // Cargar la revisión al montar
  onMount(async () => {
    if (!visitaId) {
      cargando = false;
      return;
    }
    try {
      // 1. Cargamos la revisión de la visita actual
      const existente = await obtenerRevisionPorVisita(visitaId);
      if (existente) {
        revisionId = existente.id ?? null;
        const datosGuardados = JSON.parse(existente.contadores);
        contadores = { ...contadores, ...datosGuardados };
      }

      // 2. Cargamos los contadores de la visita anterior (para tendencias)
      const anteriores = await obtenerContadoresRevisionAnterior(visitaId);
      if (anteriores) {
        datosAnteriores = JSON.parse(anteriores);
      }
    } catch (e) {
      console.error("Error cargando revisión:", e);
    }
    cargando = false;
  });

  // Guardar cambios
  async function guardarCambios() {
    if (!visitaId) return;
    guardando = true;
    try {
      const revision: RevisionVisita = {
        id: revisionId ?? undefined,
        visitaId,
        fecha: fechaVisita || new Date().toISOString().split('T')[0],
        contadores: JSON.stringify(contadores),
        completado: false
      };

      const nuevoId = await guardarRevisionVisita(revision);
      if (!revisionId) revisionId = nuevoId;

      exito = true;
      setTimeout(() => exito = false, 2000);
    } catch (error) {
      console.error("Error guardando revisión:", error);
    } finally {
      guardando = false;
    }
  }

  function incrementar(id: string) {
    contadores[id] = (contadores[id] || 0) + 1;
    contadores = contadores;
    guardarCambios();
  }

  function decrementar(id: string) {
    if ((contadores[id] || 0) > 0) {
      contadores[id] = contadores[id] - 1;
      contadores = contadores;
      guardarCambios();
    }
  }

  function resetearContadores() {
    if (confirm("¿Estás seguro de poner todos los contadores a cero?")) {
      Object.keys(contadores).forEach(k => contadores[k] = 0);
      contadores = contadores;
      guardarCambios();
    }
  }
</script>

{#if cargando}
  <div class="cargando">Cargando revisión...</div>
{:else}
  <div class="revision-container">

    <div class="revision-header">
      <div class="header-info">
        <h3>Revisión de Archivos</h3>
        <p>Congregación: <strong>{nombreCongregacion}</strong> · Semana: <strong>{fechaVisita}</strong></p>
      </div>
      <div class="fecha-seccion">
        <Calendar size={16} />
        <span>{fechaVisita || 'Sin fecha'}</span>
      </div>
    </div>

    <!-- ═══════════════════════════════════════ -->
    <!-- PESTAÑAS DE FORMULARIOS JW -->
    <!-- ═══════════════════════════════════════ -->
    <div class="tabs-container">
      <button class="tab-btn {pestanaActiva === 's21' ? 'active' : ''}" on:click={() => pestanaActiva = 's21'}>
        <Users size={16} /> <span>S-21 · Publicadores</span>
      </button>
      <button class="tab-btn {pestanaActiva === 's13' ? 'active' : ''}" on:click={() => pestanaActiva = 's13'}>
        <Map size={16} /> <span>S-13 · Territorios</span>
      </button>
      <button class="tab-btn {pestanaActiva === 's88' ? 'active' : ''}" on:click={() => pestanaActiva = 's88'}>
        <Presentation size={16} /> <span>S-88 · Asistencia</span>
      </button>
    </div>

    <div class="contenido-pestana">
      <!-- ═══════════════════════════════════════ -->
      <!-- S-21: PUBLICADORES -->
      <!-- ═══════════════════════════════════════ -->
      {#if pestanaActiva === 's21'}
        <div class="grid-contadores animar-entrada">
          {#each tarjetasS21 as tarjeta}
            {@const tendencia = obtenerTendencia(tarjeta.id, contadores[tarjeta.id])}
            
            <div class="counter-card theme-{tarjeta.color}">
              <div class="tarjeta-header">
                <div class="icono-tarjeta theme-{tarjeta.color}">
                  <svelte:component this={iconoPorNombre(tarjeta.icono)} size={14} />
                </div>
                <h4>{tarjeta.titulo}</h4>
                
                <div class="header-badges">
                  {#if tarjeta.id !== 'total'}
                    <div class="badge-porcentaje {totalPubs > 0 ? 'theme-' + tarjeta.color : 'vacio'}">
                      {totalPubs > 0 ? ((contadores[tarjeta.id] / totalPubs) * 100).toFixed(1) : '0.0'}%
                    </div>
                  {/if}

                  {#if tendencia}
                    <div class="badge-tendencia color-{tendencia.color}">
                      {#if tendencia.icono === 'up'} <TrendingUp size={12} strokeWidth={3} />
                      {:else if tendencia.icono === 'down'} <TrendingDown size={12} strokeWidth={3} />
                      {:else} <Minus size={12} strokeWidth={3} /> {/if}
                      <span>{tendencia.texto}</span>
                    </div>
                  {/if}
                </div>
              </div>

              <div class="counter-controls">
                <button class="btn-restar" on:click={() => decrementar(tarjeta.id)}>−</button>
                <input 
                  type="number" 
                  min="0" 
                  bind:value={contadores[tarjeta.id]} 
                  on:change={() => { contadores = contadores; guardarCambios(); }} 
                  class="counter-input" 
                />
                <button class="btn-sumar" on:click={() => incrementar(tarjeta.id)}>+</button>
              </div>
            </div>
          {/each}
        </div>

      <!-- ═══════════════════════════════════════ -->
      <!-- S-13: TERRITORIOS -->
      <!-- ═══════════════════════════════════════ -->
      {:else if pestanaActiva === 's13'}
        <div class="grid-contadores animar-entrada">
          {#each tarjetasS13 as tarjeta}
            {@const tendencia = obtenerTendencia(tarjeta.id, contadores[tarjeta.id])}
            
            <div class="counter-card theme-{tarjeta.color}">
              <div class="tarjeta-header">
                <div class="icono-tarjeta theme-{tarjeta.color}">
                  <svelte:component this={iconoPorNombre(tarjeta.icono)} size={14} />
                </div>
                <h4>{tarjeta.titulo}</h4>
                
                <div class="header-badges">
                  {#if tarjeta.id !== 'totalTerritorios'}
                    <div class="badge-porcentaje {totalTerr > 0 ? 'theme-' + tarjeta.color : 'vacio'}">
                      {totalTerr > 0 ? ((contadores[tarjeta.id] / totalTerr) * 100).toFixed(1) : '0.0'}%
                    </div>
                  {/if}

                  {#if tendencia}
                    <div class="badge-tendencia color-{tendencia.color}">
                      {#if tendencia.icono === 'up'} <TrendingUp size={12} strokeWidth={3} />
                      {:else if tendencia.icono === 'down'} <TrendingDown size={12} strokeWidth={3} />
                      {:else} <Minus size={12} strokeWidth={3} /> {/if}
                      <span>{tendencia.texto}</span>
                    </div>
                  {/if}
                </div>
              </div>

              <div class="counter-controls">
                <button class="btn-restar" on:click={() => decrementar(tarjeta.id)}>−</button>
                <input 
                  type="number" 
                  min="0" 
                  bind:value={contadores[tarjeta.id]} 
                  on:change={() => { contadores = contadores; guardarCambios(); }} 
                  class="counter-input" 
                />
                <button class="btn-sumar" on:click={() => incrementar(tarjeta.id)}>+</button>
              </div>

              {#if tarjeta.id === 'territoriosSinTrabajar1Ano' && totalTerr > 0}
                <div class="info-calculada">
                  Trabajados en el año: <strong>{Math.max(0, totalTerr - contadores[tarjeta.id])}</strong>
                </div>
              {/if}
              {#if tarjeta.id === 'territoriosSinTrabajar6Meses' && totalTerr > 0}
                <div class="info-calculada">
                  Trabajados en 6 meses: <strong>{Math.max(0, totalTerr - contadores[tarjeta.id])}</strong>
                </div>
              {/if}
            </div>
          {/each}
        </div>

      <!-- ═══════════════════════════════════════ -->
      <!-- S-88: ASISTENCIA (con color dinámico) -->
      <!-- ═══════════════════════════════════════ -->
      {:else if pestanaActiva === 's88'}
        <div class="grid-contadores animar-entrada">
          {#each tarjetasS88 as tarjeta}
            {@const tendencia = obtenerTendencia(tarjeta.id, contadores[tarjeta.id])}
            {@const porcentajeNum = totalPubs > 0 ? (contadores[tarjeta.id] / totalPubs) * 100 : 0}
            {@const porcentajeTexto = porcentajeNum.toFixed(1)}
            {@const colorPct = colorPorcentajeAsistencia(porcentajeNum)}
            
            <div class="counter-card theme-{tarjeta.color} asistencia-card">
              <div class="tarjeta-header">
                <div class="icono-tarjeta theme-{tarjeta.color}">
                  <svelte:component this={iconoPorNombre(tarjeta.icono)} size={14} />
                </div>
                <h4>{tarjeta.titulo}</h4>
                
                <div class="header-badges">
                  <!-- 🌟 BADGE DE PORCENTAJE CON COLOR DINÁMICO -->
                  <div class="badge-porcentaje-asistencia {colorPct}">
                    {porcentajeTexto}%
                  </div>

                  {#if tendencia}
                    <div class="badge-tendencia color-{tendencia.color}">
                      {#if tendencia.icono === 'up'} <TrendingUp size={12} strokeWidth={3} />
                      {:else if tendencia.icono === 'down'} <TrendingDown size={12} strokeWidth={3} />
                      {:else} <Minus size={12} strokeWidth={3} /> {/if}
                      <span>{tendencia.texto}</span>
                    </div>
                  {/if}
                </div>
              </div>

              <div class="counter-controls">
                <button class="btn-restar" on:click={() => decrementar(tarjeta.id)}>−</button>
                <input 
                  type="number" 
                  min="0" 
                  bind:value={contadores[tarjeta.id]} 
                  on:change={() => { contadores = contadores; guardarCambios(); }} 
                  class="counter-input" 
                />
                <button class="btn-sumar" on:click={() => incrementar(tarjeta.id)}>+</button>
              </div>

              <div class="info-calculada">
                {#if totalPubs > 0}
                  Asistencia vs <strong>{totalPubs}</strong> publicadores
                {:else}
                  <span class="aviso">Registra primero el total de publicadores en S-21</span>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <div class="revision-actions">
      <button class="btn-accion btn-outline" on:click={resetearContadores}>
        Poner a cero
      </button>
      <button class="btn-accion {exito ? 'btn-exito' : 'btn-primary'}" on:click={guardarCambios} disabled={guardando}>
        {#if guardando} 
          <Save size={18} class="spin" /> Guardando...
        {:else if exito} 
          <CheckCircle2 size={18} /> ¡Guardado!
        {:else} 
          <Save size={18} /> Guardar Progreso
        {/if}
      </button>
    </div>

  </div>
{/if}

<style>
  .revision-container { padding: 20px; animation: fadeIn 0.3s ease; font-family: var(--font-family); }
  .cargando { padding: 40px; text-align: center; color: var(--text-muted); }

  .revision-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 15px; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid var(--border-color); }
  .header-info h3 { margin: 0 0 5px 0; font-size: 1.4rem; color: var(--text-main); font-weight: 800; }
  .header-info p { margin: 0; color: var(--text-muted); font-size: 0.9rem; }
  .header-info strong { color: var(--text-main); }

  .fecha-seccion { display: flex; align-items: center; gap: 8px; background: var(--bg-panel); padding: 8px 14px; border-radius: var(--radius-md); border: 1px solid var(--border-color); font-weight: 600; font-size: 0.85rem; color: var(--text-main); }

  /* PESTAÑAS (TABS) */
  .tabs-container { display: flex; gap: 20px; border-bottom: 2px solid var(--border-color); margin-bottom: 25px; padding-bottom: 0; overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
  .tabs-container::-webkit-scrollbar { display: none; }
  .tab-btn { background: transparent; border: none; padding: 12px 5px; font-size: 0.9rem; font-weight: 700; color: var(--text-muted); cursor: pointer; border-bottom: 3px solid transparent; margin-bottom: -2px; transition: all 0.2s ease; display: flex; align-items: center; gap: 8px; white-space: nowrap; }
  .tab-btn:hover { color: var(--primary); }
  .tab-btn.active { color: var(--primary); border-bottom: 3px solid var(--primary); }

  .contenido-pestana { min-height: 200px; }
  .animar-entrada { animation: fadeIn 0.3s ease-out; }

  .grid-contadores { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; margin-bottom: 30px; }

  .counter-card { background: var(--bg-panel); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 12px 15px; display: flex; flex-direction: column; align-items: center; box-shadow: var(--shadow-sm); border-top: 4px solid var(--border-color); }
  .counter-card.theme-green { border-top-color: #10b981; }
  .counter-card.theme-red { border-top-color: #ef4444; }
  .counter-card.theme-orange { border-top-color: #f59e0b; }
  .counter-card.theme-blue { border-top-color: #3b82f6; }
  .counter-card.theme-slate { border-top-color: #64748b; }

  .tarjeta-header { display: flex; flex-direction: column; align-items: center; gap: 6px; margin-bottom: 12px; min-height: 48px; width: 100%; }

  /* ÍCONO PEQUEÑO EN CADA TARJETA */
  .icono-tarjeta { width: 24px; height: 24px; border-radius: 6px; display: flex; align-items: center; justify-content: center; }
  .icono-tarjeta.theme-green { background: rgba(16, 185, 129, 0.1); color: #10b981; }
  .icono-tarjeta.theme-red { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
  .icono-tarjeta.theme-orange { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
  .icono-tarjeta.theme-blue { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
  .icono-tarjeta.theme-slate { background: rgba(100, 116, 139, 0.1); color: #64748b; }

  .counter-card h4 { margin: 0; font-size: 0.85rem; color: var(--text-muted); text-align: center; line-height: 1.2; }

  .header-badges { display: flex; gap: 5px; align-items: center; justify-content: center; flex-wrap: wrap; }
  .badge-porcentaje { font-size: 0.75rem; font-weight: 800; padding: 2px 8px; border-radius: 12px; background: var(--bg-app); border: 1px solid transparent; }
  .badge-porcentaje.theme-green { color: #059669; border-color: rgba(16, 185, 129, 0.2); background: rgba(16, 185, 129, 0.05); }
  .badge-porcentaje.theme-red { color: #e11d48; border-color: rgba(225, 29, 72, 0.2); background: rgba(225, 29, 72, 0.05); }
  .badge-porcentaje.theme-orange { color: #d97706; border-color: rgba(245, 158, 11, 0.2); background: rgba(245, 158, 11, 0.05); }
  .badge-porcentaje.theme-blue { color: #2563eb; border-color: rgba(37, 99, 235, 0.2); background: rgba(37, 99, 235, 0.05); }
  .badge-porcentaje.theme-slate { color: #475569; border-color: rgba(100, 116, 139, 0.2); background: rgba(100, 116, 139, 0.05); }
  .badge-porcentaje.vacio { color: #94a3b8; border-color: var(--border-color); background: transparent; }

  /* 🌟 BADGE DE PORCENTAJE ESPECIAL PARA S-88 (COLOR DINÁMICO) */
  .badge-porcentaje-asistencia {
    font-size: 0.8rem;
    font-weight: 800;
    padding: 3px 10px;
    border-radius: 12px;
    border: 1px solid transparent;
    transition: all 0.2s ease;
  }
  .badge-porcentaje-asistencia.verde {
    color: #059669;
    border-color: rgba(16, 185, 129, 0.3);
    background: rgba(16, 185, 129, 0.1);
  }
  .badge-porcentaje-asistencia.rojo {
    color: #e11d48;
    border-color: rgba(225, 29, 72, 0.3);
    background: rgba(225, 29, 72, 0.1);
  }

  .badge-tendencia { display: flex; align-items: center; gap: 3px; font-size: 0.7rem; font-weight: 800; padding: 2px 6px; border-radius: 6px; }
  .badge-tendencia.color-verde { color: #10b981; background: rgba(16, 185, 129, 0.1); }
  .badge-tendencia.color-rojo { color: #ef4444; background: rgba(239, 68, 68, 0.1); }
  .badge-tendencia.color-gris { color: #64748b; background: rgba(100, 116, 139, 0.1); }

  .counter-controls { display: flex; align-items: center; justify-content: center; gap: 15px; width: 100%; }
  .btn-restar, .btn-sumar { width: 36px; height: 36px; border-radius: 50%; border: none; font-size: 1.4rem; font-weight: bold; cursor: pointer; display: flex; justify-content: center; align-items: center; transition: all 0.1s; padding: 0; }
  .btn-restar { background: var(--bg-app); color: var(--text-muted); border: 1px solid var(--border-color); }
  .btn-restar:active { background: #e2e8f0; transform: scale(0.95); }
  .btn-sumar { background: rgba(37, 99, 235, 0.1); color: #2563eb; }
  .btn-sumar:active { background: rgba(37, 99, 235, 0.2); transform: scale(0.95); }
  .counter-input { width: 50px; text-align: center; font-size: 1.3rem; font-weight: 800; color: var(--text-main); background: transparent; border: none; outline: none; padding: 0; -moz-appearance: textfield; }
  .counter-input::-webkit-outer-spin-button, .counter-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }

  .info-calculada { font-size: 0.75rem; color: var(--primary); background: rgba(92, 10, 31, 0.05); padding: 4px 10px; border-radius: 6px; margin-top: 10px; font-weight: 500; text-align: center; width: 100%; }
  .info-calculada .aviso { color: #d97706; font-style: italic; }

  .revision-actions { display: flex; gap: 12px; justify-content: flex-end; align-items: center; flex-wrap: wrap; border-top: 1px solid var(--border-color); padding-top: 16px; margin-top: 10px; }

  .btn-accion { height: 38px; padding: 0 20px; border-radius: 30px; font-weight: 600; font-size: 0.85rem; display: inline-flex; justify-content: center; align-items: center; gap: 6px; cursor: pointer; transition: all 0.2s ease; border: 1px solid transparent; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
  .btn-outline { background: transparent; border-color: #cbd5e1; color: #64748b; box-shadow: none; }
  .btn-outline:hover { background: #f8fafc; color: #334155; border-color: #94a3b8; }
  .btn-primary { background: #5c0a1f; color: white; }
  .btn-primary:hover:not(:disabled) { background: #3a0411; transform: translateY(-1px); }
  .btn-exito { background: #10b981; color: white; }
  .btn-exito:hover { background: #059669; }

  .spin { animation: spin 1s linear infinite; }
  @keyframes spin { 100% { transform: rotate(360deg); } }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

  /* En S-88 las tarjetas son más anchas para mostrar bien el porcentaje */
  .asistencia-card { min-height: 180px; }

  @media (max-width: 768px) {
    .revision-container { padding: 15px; }
    .revision-header { flex-direction: column; align-items: stretch; }
    .fecha-seccion { justify-content: center; }
    .tabs-container { gap: 15px; }
    .tab-btn { padding: 10px 5px; font-size: 0.85rem; }
    .grid-contadores { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
    .counter-card { padding: 10px 5px; }
    .counter-card h4 { font-size: 0.75rem; }
    .header-badges { flex-direction: column; gap: 4px; }
    .counter-controls { gap: 4px; }
    .btn-restar, .btn-sumar { width: 32px; height: 32px; border-radius: 8px; font-size: 1.2rem; }
    .counter-input { width: 30px; font-size: 1.1rem; }
    .revision-actions { flex-direction: column; align-items: stretch; }
    .btn-accion { width: 100%; height: 48px; justify-content: center; border-radius: 12px; }
  }
</style>