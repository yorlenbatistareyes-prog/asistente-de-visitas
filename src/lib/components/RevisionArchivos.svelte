<script lang="ts">
  import { CheckCircle2, Save, Archive, Calendar, TrendingUp, TrendingDown, Minus } from 'lucide-svelte';
  import { onMount, createEventDispatcher } from 'svelte';
  import { cargarConfig, guardarConfig, initDB } from '$lib/services/db';
  import { notificarCambioHistorial } from '$lib/stores/appStore';

  export let nombreCongregacion = '';
  const dispatch = createEventDispatcher();

  let contadores: Record<string, number> = {
    total: 0, mayores65: 0, sinCursos: 0, nuevos: 0,
    bautizados: 0, readmitidos: 0, reactivados: 0,
    irregulares: 0, inactivos: 0, sacados: 0,
    precursoresAuxiliares: 0, precursoresRegulares: 0, 
    ancianos: 0, siervosMinisteriales: 0,
    // --- NUEVO ---
    totalTerritorios: 0, 
    territoriosSinTrabajar1Ano: 0, 
    territoriosSinTrabajar6Meses: 0
  };

  // Memoria para guardar los datos de la visita anterior
  let datosAnteriores: Record<string, number> | null = null;

  let fechaRevision = '';
  let guardando = false;
  let exito = false;

  $: totalPubs = Number(contadores.total) || 0;

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
    { id: 'precursoresAuxiliares', titulo: 'Precursores Auxiliares', color: 'blue' },
    { id: 'precursoresRegulares', titulo: 'Precursores Regulares', color: 'blue' },
    { id: 'ancianos', titulo: 'Ancianos', color: 'slate' },
    { id: 'siervosMinisteriales', titulo: 'Siervos Ministeriales', color: 'slate' },
    // --- NUEVO ---
    { id: 'totalTerritorios', titulo: 'Total de Territorios', color: 'slate' },
    { id: 'territoriosSinTrabajar6Meses', titulo: 'Sin trabajar en 6 meses', color: 'orange' },
    { id: 'territoriosSinTrabajar1Ano', titulo: 'Sin trabajar en 1 año', color: 'red' }
  ];

  async function cargarDatosRevision() {
    try {
      // 1. Cargamos el borrador actual
      const clave = `revision_${nombreCongregacion}`;
      const valor = await cargarConfig(clave);
      if (valor && valor !== "{}" && valor !== "") {
        const datosGuardados = typeof valor === 'string' ? JSON.parse(valor) : valor;
        if (datosGuardados.contadores) contadores = { ...contadores, ...datosGuardados.contadores };
        if (datosGuardados.fechaRevision) fechaRevision = datosGuardados.fechaRevision;
      }

      // 2. Buscamos la última revisión en SQLite para poder comparar en vivo
      const db = await initDB();
      const resCong = await db.select<{id: number}[]>(
         'SELECT id FROM congregaciones WHERE TRIM(UPPER(nombre)) = TRIM(UPPER($1)) LIMIT 1', 
         [nombreCongregacion]
      );
      
      if (resCong.length > 0) {
        const congregacionId = resCong[0].id;
        const resHistorial = await db.select<any[]>(
          "SELECT contenido FROM historial_visitas WHERE congregacion_id = $1 AND tipo = 'Revisión de Archivos' ORDER BY fecha DESC LIMIT 1",
          [congregacionId]
        );
        
        if (resHistorial.length > 0) {
          const contenidoViejo = JSON.parse(resHistorial[0].contenido);
          // Si el contenido viejo es un Snapshot (tiene formato nuevo), extraemos solo los valores numéricos
          if (contenidoViejo.total && typeof contenidoViejo.total === 'object') {
            datosAnteriores = {};
            for (const key in contenidoViejo) {
              datosAnteriores[key] = contenidoViejo[key].valor;
            }
          } else {
            // Si es formato viejo (solo números), lo pasamos directo
            datosAnteriores = contenidoViejo;
          }
        }
      }
    } catch (e) { console.error("Error cargando la revisión:", e); }
  }

  // CEREBRO MATEMÁTICO: Calcula si subió o bajó en tiempo real
  function obtenerTendencia(clave: string, valorActual: number) {
    if (!datosAnteriores || datosAnteriores[clave] === undefined) return null;
    
    const valorAnterior = Number(datosAnteriores[clave]);
    const actual = Number(valorActual);
    if (valorAnterior === 0 && actual === 0) return null;
    
    const diferencia = actual - valorAnterior;
    if (diferencia === 0) return { color: 'gris', texto: 'Igual', icono: 'minus' };

    let porcentaje = 0;
    if (valorAnterior > 0) porcentaje = (Math.abs(diferencia) / valorAnterior) * 100;

    // Añadimos los territorios sin trabajar, porque si suben es algo negativo (rojo)
    const invertidos = ['sinCursos', 'irregulares', 'inactivos', 'sacados', 'territoriosSinTrabajar1Ano', 'territoriosSinTrabajar6Meses'];
    const esMaloSubir = invertidos.includes(clave);

    let color = 'gris';
    if (diferencia > 0) color = esMaloSubir ? 'rojo' : 'verde';
    else color = esMaloSubir ? 'verde' : 'rojo';

    const signo = diferencia > 0 ? '+' : '-';
    const textoPct = valorAnterior > 0 ? `${porcentaje.toFixed(1)}%` : 'Nuevo';

    return { color, icono: diferencia > 0 ? 'up' : 'down', texto: `${signo}${Math.abs(diferencia)} (${textoPct})` };
  }

  async function guardarRevision() {
    guardando = true;
    try {
      const clave = `revision_${nombreCongregacion}`;
      await guardarConfig(clave, JSON.stringify({ contadores, fechaRevision }));
      exito = true;
      setTimeout(() => exito = false, 2500); 
    } catch (error) { console.error("Error al guardar:", error); } 
    finally { guardando = false; }
  }

  function resetearContadores() {
    if (confirm("¿Estás seguro de poner todos los contadores a cero?")) {
      Object.keys(contadores).forEach(k => contadores[k] = 0);
      guardarRevision(); 
    }
  }

  // EL CREADOR DE SNAPSHOTS: Congela la foto antes de enviarla
  async function finalizarRevision() {
    if (!fechaRevision) { alert("Por favor, selecciona la fecha de la revisión arriba antes de finalizar."); return; }
    
    if (confirm("¿Finalizar y archivar esta revisión? Se guardará en el historial y los contadores se pondrán a cero para la próxima visita.")) {
      
      let snapshot: Record<string, any> = {};
      const tPubs = Number(contadores.total) || 0;
      const tTerr = Number(contadores.totalTerritorios) || 0; // <-- NUEVO

      tarjetasRevision.forEach(tarjeta => {
        const valor = Number(contadores[tarjeta.id]) || 0;
        
        let porcentajeStr = '0.0%';
        if (tarjeta.id !== 'total' && tPubs > 0) {
          porcentajeStr = ((valor / tPubs) * 100).toFixed(1) + '%';
        }

        // --- NUEVO: Lógica condicional para porcentajes ---
        const esTerritorio = tarjeta.id.includes('territorio');
        
        if (esTerritorio && tarjeta.id !== 'totalTerritorios' && tTerr > 0) {
          // Si es territorio, lo divide entre el total de territorios
          porcentajeStr = ((valor / tTerr) * 100).toFixed(1) + '%';
        } else if (!esTerritorio && tarjeta.id !== 'total' && tPubs > 0) {
          // Si son publicadores, lo divide entre el total de publicadores
          porcentajeStr = ((valor / tPubs) * 100).toFixed(1) + '%';
        }
        // --------------------------------------------------

        const tendencia = obtenerTendencia(tarjeta.id, valor);

        snapshot[tarjeta.id] = {
          valor: valor,
          porcentaje: porcentajeStr,
          tendencia: tendencia
        };
      });

      dispatch('guardarEnHistorial', {
        congregacion: nombreCongregacion,
        fecha: fechaRevision,
        tipo: 'Revisión de Archivos',
        contenido: JSON.stringify(snapshot)
      });

      notificarCambioHistorial();

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
      {@const tendencia = obtenerTendencia(tarjeta.id, contadores[tarjeta.id])}
      
      <div class="counter-card theme-{tarjeta.color}">
        <div class="tarjeta-header">
          <h4>{tarjeta.titulo}</h4>
          
          <div class="header-badges">
            {#if tarjeta.id !== 'total' && tarjeta.id !== 'totalTerritorios'}
              {@const esTerritorio = tarjeta.id.includes('territorio')}
              {@const base = esTerritorio ? contadores.totalTerritorios : contadores.total}
              
              <div class="badge-porcentaje {base > 0 ? 'theme-' + tarjeta.color : 'vacio'}">
                {base > 0 ? ((contadores[tarjeta.id] / base) * 100).toFixed(1) : '0.0'}%
              </div>
            {/if}

            {#if tendencia}
              <div class="badge-tendencia color-{tendencia.color}" title="Comparado con la revisión anterior">
                {#if tendencia.icono === 'up'} <TrendingUp size={12} strokeWidth={3} />
                {:else if tendencia.icono === 'down'} <TrendingDown size={12} strokeWidth={3} />
                {:else} <Minus size={12} strokeWidth={3} /> {/if}
                <span>{tendencia.texto}</span>
              </div>
            {/if}
          </div>
        </div>

        <div class="counter-controls">
          <button class="btn-restar" on:click={() => { if(contadores[tarjeta.id] > 0) { contadores[tarjeta.id]--; contadores = contadores; } }}>-</button>
          <input type="number" min="0" bind:value={contadores[tarjeta.id]} on:input={() => contadores = contadores} class="counter-input" />
          <button class="btn-sumar" on:click={() => { contadores[tarjeta.id]++; contadores = contadores; }}>+</button>
        </div>

        {#if tarjeta.id === 'territoriosSinTrabajar1Ano' && contadores.totalTerritorios > 0}
          <div class="info-calculada">
            Trabajados en el año: <strong>{Math.max(0, contadores.totalTerritorios - contadores[tarjeta.id])}</strong>
          </div>
        {/if}
        {#if tarjeta.id === 'territoriosSinTrabajar6Meses' && contadores.totalTerritorios > 0}
          <div class="info-calculada">
            Trabajados en 6 meses: <strong>{Math.max(0, contadores.totalTerritorios - contadores[tarjeta.id])}</strong>
          </div>
        {/if}

      </div>
    {/each}
  </div>
  
  <div class="revision-actions">
    <button class="btn-accion btn-outline" on:click={resetearContadores}>Poner a cero</button>
    <button class="btn-accion {exito ? 'btn-exito' : 'btn-primary'}" on:click={guardarRevision} disabled={guardando}>
      {#if guardando} <Save size={18} class="spin" /> Guardando...
      {:else if exito} <CheckCircle2 size={18} /> ¡Guardado!
      {:else} <Save size={18} /> Guardar Progreso {/if}
    </button>
    <button class="btn-accion btn-azul" on:click={finalizarRevision}>
      <Archive size={18} /> Finalizar y Archivar
    </button>
  </div>
</div>

<style>
  .revision-container { animation: fadeIn 0.3s ease; }
  .revision-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 15px; margin-bottom: 25px; }
  .header-info h3 { margin: 0 0 5px 0; font-size: 1.4rem; color: var(--text-main); }
  .header-info p { margin: 0; color: var(--text-muted); font-size: 0.95rem; }
  .fecha-seccion { display: flex; align-items: center; gap: 10px; background: var(--bg-panel); padding: 10px 15px; border-radius: var(--radius-md); border: var(--border-thin); font-weight: 600; font-size: 0.9rem; }
  .input-fecha { border: none; background: transparent; color: var(--text-main); font-family: inherit; font-size: 0.95rem; outline: none; cursor: pointer; }

  .grid-contadores { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 30px; }
  .counter-card { background: var(--bg-panel); border: var(--border-thin); border-radius: var(--radius-md); padding: 12px 15px; display: flex; flex-direction: column; align-items: center; box-shadow: var(--shadow-sm); border-top: 4px solid var(--border-color); }
  .counter-card.theme-green { border-top-color: #10b981; }
  .counter-card.theme-red { border-top-color: #ef4444; }
  .counter-card.theme-orange { border-top-color: #f59e0b; }
  .counter-card.theme-blue { border-top-color: #3b82f6; }
  .counter-card.theme-slate { border-top-color: #64748b; }

  .tarjeta-header { display: flex; flex-direction: column; align-items: center; gap: 6px; margin-bottom: 12px; min-height: 48px; width: 100%;}
  .counter-card h4 { margin: 0; font-size: 0.85rem; color: var(--text-muted); text-align: center; line-height: 1.2; }
  
  .header-badges { display: flex; gap: 5px; align-items: center; justify-content: center; flex-wrap: wrap; }
  .badge-porcentaje { font-size: 0.75rem; font-weight: 800; padding: 2px 8px; border-radius: 12px; background: var(--bg-app); border: 1px solid transparent; }
  .badge-porcentaje.theme-green { color: #059669; border-color: rgba(16, 185, 129, 0.2); background: rgba(16, 185, 129, 0.05); }
  .badge-porcentaje.theme-red { color: #e11d48; border-color: rgba(225, 29, 72, 0.2); background: rgba(225, 29, 72, 0.05); }
  .badge-porcentaje.theme-orange { color: #d97706; border-color: rgba(245, 158, 11, 0.2); background: rgba(245, 158, 11, 0.05); }
  .badge-porcentaje.theme-blue { color: #2563eb; border-color: rgba(37, 99, 235, 0.2); background: rgba(37, 99, 235, 0.05); }
  .badge-porcentaje.theme-slate { color: #475569; border-color: rgba(100, 116, 139, 0.2); background: rgba(100, 116, 139, 0.05); }
  .badge-porcentaje.vacio { color: #94a3b8; border-color: var(--border-thin); background: transparent; }

  .badge-tendencia { display: flex; align-items: center; gap: 3px; font-size: 0.7rem; font-weight: 800; padding: 2px 6px; border-radius: 6px; }
  .badge-tendencia.color-verde { color: #10b981; background: rgba(16, 185, 129, 0.1); }
  .badge-tendencia.color-rojo { color: #ef4444; background: rgba(239, 68, 68, 0.1); }
  .badge-tendencia.color-gris { color: #64748b; background: rgba(100, 116, 139, 0.1); }

  .counter-controls { display: flex; align-items: center; justify-content: center; gap: 15px; width: 100%; }
  .btn-restar, .btn-sumar { width: 36px; height: 36px; border-radius: 50%; border: none; font-size: 1.4rem; font-weight: bold; cursor: pointer; display: flex; justify-content: center; align-items: center; transition: all 0.1s; padding: 0; }
  .btn-restar { background: var(--bg-app); color: var(--text-muted); border: var(--border-thin); }
  .btn-restar:active { background: #e2e8f0; transform: scale(0.95); }
  .btn-sumar { background: rgba(37, 99, 235, 0.1); color: #2563eb; }
  .btn-sumar:active { background: rgba(37, 99, 235, 0.2); transform: scale(0.95); }
  .counter-input { width: 50px; text-align: center; font-size: 1.3rem; font-weight: 800; color: var(--text-main); background: transparent; border: none; outline: none; padding: 0; -moz-appearance: textfield; }
  .counter-input::-webkit-outer-spin-button, .counter-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }

  /* --- ESTÉTICA MODERNA Y DISCRETA PARA LOS BOTONES --- */
  .revision-actions { 
    display: flex; 
    gap: 12px; 
    justify-content: flex-end; 
    align-items: center;
    flex-wrap: wrap; 
    border-top: 1px solid #e2e8f0; 
    padding-top: 16px; 
    margin-top: 10px;
  }

  .btn-accion { 
    height: 36px; /* Altura más fina */
    padding: 0 18px; 
    border-radius: 30px; /* Forma de píldora redondeada */
    font-weight: 600; 
    font-size: 0.85rem; 
    display: inline-flex; 
    justify-content: center; 
    align-items: center; 
    gap: 6px; 
    cursor: pointer; 
    transition: all 0.2s ease; 
    border: 1px solid transparent; 
    box-shadow: 0 1px 2px rgba(0,0,0,0.05); /* Sombra muy sutil */
  }

  /* Botón: Poner a cero */
  .btn-outline { 
    background: transparent; 
    border-color: #cbd5e1; 
    color: #64748b; 
    box-shadow: none;
  }
  .btn-outline:hover { 
    background: #f8fafc; 
    color: #334155; 
    border-color: #94a3b8;
  }

  /* Botón: Guardar Progreso (Rojo Vino / Burdeos) */
  .btn-primary { 
    background: #881337; /* Un rojo vino profundo y elegante */
    color: white; 
    box-shadow: 0 2px 4px rgba(136, 19, 55, 0.2); 
  }
  .btn-primary:hover { 
    background: #4c0519; /* Más oscuro al pasar el ratón */
    transform: translateY(-1px); 
    box-shadow: 0 4px 6px rgba(136, 19, 55, 0.3);
  }

  /* Botón: Finalizar y Archivar (Azul Marino Oscuro) */
  .btn-azul { 
    background: #1e40af; /* Azul oscuro formal */
    color: white; 
    box-shadow: 0 2px 4px rgba(30, 64, 175, 0.2);
  }
  .btn-azul:hover { 
    background: #1e3a8a; /* Azul marino casi negro al pasar el ratón */
    transform: translateY(-1px); 
    box-shadow: 0 4px 6px rgba(30, 64, 175, 0.3);
  }

  .btn-exito { 
    background: #10b981; 
    color: white; 
  }

  .btn-accion:active {
    transform: scale(0.97); /* Efecto orgánico al presionar */
  }

  .spin { animation: spin 1s linear infinite; }
  @keyframes spin { 100% { transform: rotate(360deg); } }

  .info-calculada {
    font-size: 0.75rem;
    color: var(--primary);
    background: rgba(var(--primary-rgb), 0.05); 
    padding: 4px 10px;
    border-radius: 6px;
    margin-top: 10px;
    font-weight: 500;
    text-align: center;
    width: 100%;
  }

  /* Ajustes para móviles */
  @media (max-width: 768px) {
    .grid-contadores { grid-template-columns: repeat(2, 1fr); gap: 10px; }
    .revision-actions { justify-content: center; } /* Centra los botones en vez de estirarlos al 100% */
    .fecha-seccion { width: 100%; justify-content: space-between; }
  }
</style>