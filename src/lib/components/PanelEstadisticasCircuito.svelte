<script lang="ts">
  import { Activity, Users, Star, UserCheck, BookOpen, AlertTriangle, ChevronUp, 
    ChevronDown, TrendingUp, Settings2, Map } from "lucide-svelte"; 
  import { initDB, type Congregacion } from '$lib/services/db';
  import { page } from '$app/stores';
  import { actualizacionHistorial, circuitoActivo } from '$lib/stores/appStore';
  import { onMount } from "svelte";

  // 1. EL MOLDE CON TODOS LOS CAMPOS
  interface DesgloseVisita {
    nombre_congregacion: string;
    fecha_visita: string;
    datos: {
      total: number;
      bautizados: number;
      mayores65: number;
      nuevos: number;
      readmitidos: number;
      reactivados: number;
      sacados: number;
      precursoresRegulares: number;
      precursoresAuxiliares: number;
      ancianos: number;
      siervosMinisteriales: number;
      irregulares: number;
      inactivos: number;
      sinCursos: number;
      // --- NUEVOS ---
      totalTerritorios: number;
      territoriosSinTrabajar6Meses: number;
      territoriosSinTrabajar1Ano: number;
    };
  }

  export let listaCongregaciones: Congregacion[] = [];
  let panelVisible = true;
  let mostrarDetalle = false; 
  let desgloseVisitas: DesgloseVisita[] = []; 
  let congregacionesAnalizadas = 0;

  // NUEVO: Control del menú de columnas
  let mostrarMenuColumnas = false;

  // NUEVO: Estado de visibilidad de cada columna (Por defecto, todas encendidas)
  let configColumnas = {
    total: true, bautizados: true, mayores65: true,
    nuevos: true, readmitidos: true, reactivados: true, sacados: true,
    precursoresRegulares: true, precursoresAuxiliares: true,
    ancianos: true, siervosMinisteriales: true,
    irregulares: true, inactivos: true, sinCursos: true,
    // --- NUEVOS ---
    totalTerritorios: true, 
    territoriosSinTrabajar6Meses: true, 
    territoriosSinTrabajar1Ano: true
  };

  let metricasGlobales = {
    total: 0, bautizados: 0, mayores65: 0, nuevos: 0, readmitidos: 0, reactivados: 0, sacados: 0,
    precursoresRegulares: 0, precursoresAuxiliares: 0, ancianos: 0, siervosMinisteriales: 0,
    irregulares: 0, inactivos: 0, sinCursos: 0,
    // --- NUEVOS ---
    totalTerritorios: 0, 
    territoriosSinTrabajar6Meses: 0, 
    territoriosSinTrabajar1Ano: 0
  };

  async function calcularMetricas() {
    if (!listaCongregaciones || listaCongregaciones.length === 0) return;
    try {
      const db = await initDB();
      let t = { total: 0, bautizados: 0, mayores65: 0, nuevos: 0, readmitidos: 0, reactivados: 0, sacados: 0, precursoresRegulares: 0, precursoresAuxiliares: 0, ancianos: 0, siervosMinisteriales: 0, irregulares: 0, inactivos: 0, sinCursos: 0, totalTerritorios: 0, territoriosSinTrabajar6Meses: 0, territoriosSinTrabajar1Ano: 0 };
      let contador = 0;
      
      // NUEVO: Array temporal para construir la tabla del desglose
      let tablaDesglose: DesgloseVisita[] = [];

      for (const cong of listaCongregaciones) {
        const resCong = await db.select<{id: number}[]>('SELECT id FROM congregaciones WHERE nombre = $1 LIMIT 1', [cong.nombre]);
        if (resCong.length > 0) {
          // AÑADIDO: Seleccionamos la 'fecha' además del contenido y tipo
          const res = await db.select<{fecha: string, contenido: string, tipo: string}[]>(
            "SELECT fecha, contenido, tipo FROM historial_visitas WHERE congregacion_id = $1 ORDER BY fecha DESC",
            [resCong[0].id]
          );
          
          const revisiones = res.filter(v => v.tipo.includes('Revisi'));
          if (revisiones.length > 0) {
            try {
              const visitaReciente = revisiones[0];
              let snapshot = JSON.parse(visitaReciente.contenido);
              if (typeof snapshot === 'string') snapshot = JSON.parse(snapshot);
              
              contador++;
              const val = (k: string) => {
                const d = snapshot[k];
                if (d && typeof d === 'object' && 'valor' in d) return Number(d.valor) || 0;
                return Number(d) || 0;
              };

              // 1. Llenamos las métricas globales
              t.total += val('total');
              t.bautizados += val('bautizados');
              t.mayores65 += val('mayores65');
              t.nuevos += val('nuevos');
              t.readmitidos += val('readmitidos');
              t.reactivados += val('reactivados');
              t.sacados += val('sacados');
              t.precursoresRegulares += val('precursoresRegulares');
              t.precursoresAuxiliares += val('precursoresAuxiliares');
              t.ancianos += val('ancianos');
              t.siervosMinisteriales += val('siervosMinisteriales');
              t.irregulares += val('irregulares');
              t.inactivos += val('inactivos');
              t.sinCursos += val('sinCursos');
              t.totalTerritorios += val('totalTerritorios');
              t.territoriosSinTrabajar6Meses += val('territoriosSinTrabajar6Meses');
              t.territoriosSinTrabajar1Ano += val('territoriosSinTrabajar1Ano');

              // 2. EXTRAEMOS ABSOLUTAMENTE TODO PARA LA TABLA
              tablaDesglose.push({
                nombre_congregacion: cong.nombre,
                fecha_visita: visitaReciente.fecha,
                datos: {
                  total: val('total'),
                  bautizados: val('bautizados'),
                  mayores65: val('mayores65'),
                  nuevos: val('nuevos'),
                  readmitidos: val('readmitidos'),
                  reactivados: val('reactivados'),
                  sacados: val('sacados'),
                  precursoresRegulares: val('precursoresRegulares'),
                  precursoresAuxiliares: val('precursoresAuxiliares'),
                  ancianos: val('ancianos'),
                  siervosMinisteriales: val('siervosMinisteriales'),
                  irregulares: val('irregulares'),
                  inactivos: val('inactivos'),
                  sinCursos: val('sinCursos'),
                  // --- NUEVOS ---
                  totalTerritorios: val('totalTerritorios'),
                  territoriosSinTrabajar6Meses: val('territoriosSinTrabajar6Meses'),
                  territoriosSinTrabajar1Ano: val('territoriosSinTrabajar1Ano')
                }
              });

            } catch (e) {
              console.error("Error procesando JSON para:", cong.nombre, e);
            }
          }
        }
      }
      
      metricasGlobales = { ...t };
      congregacionesAnalizadas = contador;
      
      // Asignamos la tabla terminada a la variable reactiva
      desgloseVisitas = tablaDesglose;

    } catch (e) { console.error("Error crítico en cálculos:", e); }
  }

  function togglePanel() { panelVisible = !panelVisible; }

  // Reactividad
  $: if ($actualizacionHistorial || listaCongregaciones.length >= 0 || $page.url.pathname) {
    setTimeout(() => {
      calcularMetricas();
    }, 300);
  }

  onMount(() => {
    calcularMetricas();
  });
</script>

<div class="panel-global {panelVisible ? '' : 'colapsado'}">
  <div class="panel-header" on:click={togglePanel} role="button" tabindex="0">
    <div class="header-left">
      <h4><Activity size={16} color="var(--primary)"/> Estadística del Circuito</h4>
      <span class="badge-info">
        {#if congregacionesAnalizadas > 0}
          Analizadas: {congregacionesAnalizadas} / {listaCongregaciones.length}
        {:else}
          Sin datos
        {/if}
      </span>
    </div>
    
    <button class="btn-toggle" title={panelVisible ? "Ocultar panel" : "Mostrar panel"}>
      {#if panelVisible}
        <ChevronUp size={18} />
      {:else}
        <ChevronDown size={18} />
      {/if}
    </button>
  </div>
  
  {#if panelVisible}
    <div class="panel-grid">
      
      <div class="stats-group theme-blue">
        <div class="group-title"><Users size={12}/> Publicadores</div>
        <div class="stat-items">
          <div class="stat-box">
            <span class="val">{metricasGlobales.total}</span><span class="lbl">Total</span>
          </div>
          <div class="stat-box">
            <span class="val">{metricasGlobales.bautizados}</span><span class="lbl">Bauts.</span>
            <span class="pct">{metricasGlobales.total > 0 ? ((metricasGlobales.bautizados / metricasGlobales.total)*100).toFixed(1) : '0.0'}%</span>
          </div>
          <div class="stat-box">
            <span class="val">{metricasGlobales.mayores65}</span><span class="lbl">+65 Años</span>
            <span class="pct">{metricasGlobales.total > 0 ? ((metricasGlobales.mayores65 / metricasGlobales.total)*100).toFixed(1) : '0.0'}%</span>
          </div>
        </div>
      </div>

      <div class="stats-group theme-orange">
        <div class="group-title"><TrendingUp size={12}/> Movimiento</div>
        <div class="stat-items">
          <div class="stat-box">
            <span class="val">{metricasGlobales.nuevos}</span><span class="lbl">Nuevos</span>
            <span class="pct">{metricasGlobales.total > 0 ? ((metricasGlobales.nuevos / metricasGlobales.total)*100).toFixed(1) : '0.0'}%</span>
          </div>
          <div class="stat-box">
            <span class="val">{metricasGlobales.readmitidos}</span><span class="lbl">Readm.</span>
            <span class="pct">{metricasGlobales.total > 0 ? ((metricasGlobales.readmitidos / metricasGlobales.total)*100).toFixed(1) : '0.0'}%</span>
          </div>
          <div class="stat-box">
            <span class="val">{metricasGlobales.reactivados}</span><span class="lbl">React.</span>
            <span class="pct">{metricasGlobales.total > 0 ? ((metricasGlobales.reactivados / metricasGlobales.total)*100).toFixed(1) : '0.0'}%</span>
          </div>
          <div class="stat-box">
            <span class="val">{metricasGlobales.sacados}</span><span class="lbl">Sacadas</span>
            <span class="pct">{metricasGlobales.total > 0 ? ((metricasGlobales.sacados / metricasGlobales.total)*100).toFixed(1) : '0.0'}%</span>
          </div>
        </div>
      </div>

      <div class="stats-group theme-green">
        <div class="group-title"><Star size={12}/> Precursores</div>
        <div class="stat-items">
          <div class="stat-box">
            <span class="val">{metricasGlobales.precursoresRegulares}</span><span class="lbl">Reg.</span>
            <span class="pct">{metricasGlobales.total > 0 ? ((metricasGlobales.precursoresRegulares / metricasGlobales.total)*100).toFixed(1) : '0.0'}%</span>
          </div>
          <div class="stat-box">
            <span class="val">{metricasGlobales.precursoresAuxiliares}</span><span class="lbl">Aux.</span>
            <span class="pct">{metricasGlobales.total > 0 ? ((metricasGlobales.precursoresAuxiliares / metricasGlobales.total)*100).toFixed(1) : '0.0'}%</span>
          </div>
        </div>
      </div>

      <div class="stats-group theme-slate">
        <div class="group-title"><UserCheck size={12}/> Hermanos Nombrados</div>
        <div class="stat-items">
          <div class="stat-box">
            <span class="val">{metricasGlobales.ancianos}</span><span class="lbl">Ancianos</span>
            <span class="pct">{metricasGlobales.total > 0 ? ((metricasGlobales.ancianos / metricasGlobales.total)*100).toFixed(1) : '0.0'}%</span>
          </div>
          <div class="stat-box">
            <span class="val">{metricasGlobales.siervosMinisteriales}</span><span class="lbl">Siervos M.</span>
            <span class="pct">{metricasGlobales.total > 0 ? ((metricasGlobales.siervosMinisteriales / metricasGlobales.total)*100).toFixed(1) : '0.0'}%</span>
          </div>
        </div>
      </div>

      <div class="stats-group theme-red">
        <div class="group-title"><AlertTriangle size={12}/> Prioridad</div>
        <div class="stat-items">
          <div class="stat-box">
            <span class="val">{metricasGlobales.irregulares}</span><span class="lbl">Irreg.</span>
            <span class="pct">{metricasGlobales.total > 0 ? ((metricasGlobales.irregulares / metricasGlobales.total)*100).toFixed(1) : '0.0'}%</span>
          </div>
          <div class="stat-box">
            <span class="val">{metricasGlobales.inactivos}</span><span class="lbl">Inact.</span>
            <span class="pct">{metricasGlobales.total > 0 ? ((metricasGlobales.inactivos / metricasGlobales.total)*100).toFixed(1) : '0.0'}%</span>
          </div>
          <div class="stat-box">
            <span class="val">{metricasGlobales.sinCursos}</span><span class="lbl">Sin Curso</span>
            <span class="pct">{metricasGlobales.total > 0 ? ((metricasGlobales.sinCursos / metricasGlobales.total)*100).toFixed(1) : '0.0'}%</span>
          </div>
        </div>
      </div>

      <div class="stats-group theme-slate">
        <div class="group-title"><Map size={12}/> Territorios</div>
        <div class="stat-items">
          <div class="stat-box">
            <span class="val">{metricasGlobales.totalTerritorios}</span><span class="lbl">Total</span>
          </div>
          <div class="stat-box" title="Sin trabajar en 6 meses">
            <span class="val">{metricasGlobales.territoriosSinTrabajar6Meses}</span><span class="lbl">Sin 6 Meses</span>
            <span class="pct" style="color:#f59e0b; background: rgba(245,158,11,0.1)">{metricasGlobales.totalTerritorios > 0 ? ((metricasGlobales.territoriosSinTrabajar6Meses / metricasGlobales.totalTerritorios)*100).toFixed(1) : '0.0'}%</span>
          </div>
          <div class="stat-box" title="Sin trabajar en 1 año">
            <span class="val">{metricasGlobales.territoriosSinTrabajar1Ano}</span><span class="lbl">Sin 1 Año</span>
            <span class="pct" style="color:#ef4444; background: rgba(239,68,68,0.1)">{metricasGlobales.totalTerritorios > 0 ? ((metricasGlobales.territoriosSinTrabajar1Ano / metricasGlobales.totalTerritorios)*100).toFixed(1) : '0.0'}%</span>
          </div>
        </div>
      </div>

    </div> <div class="desglose-container">
      <div class="divider"></div>
      
      <div class="desglose-actions" style="display: flex; justify-content: space-between; align-items: center; position: relative; margin-bottom: 10px;">
        <button type="button" class="btn-detalle" on:click={() => mostrarDetalle = !mostrarDetalle}>
          {#if mostrarDetalle}
            <ChevronUp size={14} /> Ocultar desglose detallado
          {:else}
            <ChevronDown size={14} /> Ver desglose por congregación
          {/if}
        </button>

        {#if mostrarDetalle}
          <div>
            <button type="button" class="btn-detalle" style="border-color: var(--primary); color: var(--primary);" on:click={() => mostrarMenuColumnas = !mostrarMenuColumnas}>
              <Settings2 size={14} /> Columnas
            </button>

            {#if mostrarMenuColumnas}
              <div class="menu-columnas fade-in">
                
                <div class="menu-header">Mostrar u Ocultar</div>

                <div class="menu-seccion">Publicadores</div>
                <label class="toggle-container"><input type="checkbox" bind:checked={configColumnas.total}><span class="toggle-slider"></span><span class="toggle-label">Publicadores</span></label>
                <label class="toggle-container"><input type="checkbox" bind:checked={configColumnas.bautizados}><span class="toggle-slider"></span><span class="toggle-label">Bautizados</span></label>
                <label class="toggle-container"><input type="checkbox" bind:checked={configColumnas.mayores65}><span class="toggle-slider"></span><span class="toggle-label">+65 Años</span></label>
                
                <div class="menu-seccion">Movimiento</div>
                <label class="toggle-container"><input type="checkbox" bind:checked={configColumnas.nuevos}><span class="toggle-slider"></span><span class="toggle-label">Nuevos</span></label>
                <label class="toggle-container"><input type="checkbox" bind:checked={configColumnas.readmitidos}><span class="toggle-slider"></span><span class="toggle-label">Readmitidos</span></label>
                <label class="toggle-container"><input type="checkbox" bind:checked={configColumnas.reactivados}><span class="toggle-slider"></span><span class="toggle-label">Reactivados</span></label>
                <label class="toggle-container"><input type="checkbox" bind:checked={configColumnas.sacados}><span class="toggle-slider"></span><span class="toggle-label">Sacados</span></label>

                <div class="menu-seccion">Precursores y Nombrados</div>
                <label class="toggle-container"><input type="checkbox" bind:checked={configColumnas.precursoresRegulares}><span class="toggle-slider"></span><span class="toggle-label">Prec. Regulares</span></label>
                <label class="toggle-container"><input type="checkbox" bind:checked={configColumnas.precursoresAuxiliares}><span class="toggle-slider"></span><span class="toggle-label">Prec. Auxiliares</span></label>
                <label class="toggle-container"><input type="checkbox" bind:checked={configColumnas.ancianos}><span class="toggle-slider"></span><span class="toggle-label">Ancianos</span></label>
                <label class="toggle-container"><input type="checkbox" bind:checked={configColumnas.siervosMinisteriales}><span class="toggle-slider"></span><span class="toggle-label">Siervos Min.</span></label>

                <div class="menu-seccion">Prioridad</div>
                <label class="toggle-container"><input type="checkbox" bind:checked={configColumnas.irregulares}><span class="toggle-slider"></span><span class="toggle-label">Irregulares</span></label>
                <label class="toggle-container"><input type="checkbox" bind:checked={configColumnas.inactivos}><span class="toggle-slider"></span><span class="toggle-label">Inactivos</span></label>
                <label class="toggle-container"><input type="checkbox" bind:checked={configColumnas.sinCursos}><span class="toggle-slider"></span><span class="toggle-label">Sin Curso</span></label>
                
                <div class="menu-seccion">Territorios</div>
                <label class="toggle-container"><input type="checkbox" bind:checked={configColumnas.totalTerritorios}><span class="toggle-slider"></span><span class="toggle-label">Total Territorios</span></label>
                <label class="toggle-container"><input type="checkbox" bind:checked={configColumnas.territoriosSinTrabajar6Meses}><span class="toggle-slider"></span><span class="toggle-label">Sin Trab. (6 Meses)</span></label>
                <label class="toggle-container"><input type="checkbox" bind:checked={configColumnas.territoriosSinTrabajar1Ano}><span class="toggle-slider"></span><span class="toggle-label">Sin Trab. (1 Año)</span></label>
              </div>
            {/if}
          </div>
        {/if}
      </div>

      {#if mostrarDetalle}
        <div class="tabla-scroll-wrapper fade-in" style="overflow-x: auto; max-width: 100%;">
          <table class="tabla-timothy" style="width: 100%; white-space: nowrap; text-align: center;">
            <thead>
              <tr style="border-bottom: 2px solid #e2e8f0;">
                <th class="txt-left" style="padding: 8px;">Congregación</th>
                <th style="padding: 8px;">Fecha Visita</th>
                
                {#if configColumnas.total}<th title="Total">Pub.</th>{/if}
                {#if configColumnas.bautizados}<th title="Bautizados">Baut.</th>{/if}
                {#if configColumnas.mayores65}<th title="Mayores de 65">+65</th>{/if}
                
                {#if configColumnas.nuevos}<th title="Nuevos">Nvos.</th>{/if}
                {#if configColumnas.readmitidos}<th title="Readmitidos">Rdm.</th>{/if}
                {#if configColumnas.reactivados}<th title="Reactivados">Rct.</th>{/if}
                {#if configColumnas.sacados}<th title="Sacados">Sac.</th>{/if}
                
                {#if configColumnas.precursoresRegulares}<th title="Precursores Regulares">P.Reg.</th>{/if}
                {#if configColumnas.precursoresAuxiliares}<th title="Precursores Auxiliares">P.Aux.</th>{/if}
                
                {#if configColumnas.ancianos}<th title="Ancianos">Anc.</th>{/if}
                {#if configColumnas.siervosMinisteriales}<th title="Siervos Ministeriales">S.M.</th>{/if}
                
                {#if configColumnas.irregulares}<th title="Irregulares">Irr.</th>{/if}
                {#if configColumnas.inactivos}<th title="Inactivos">Ina.</th>{/if}
                {#if configColumnas.sinCursos}<th title="Sin Curso">S/Curso</th>{/if}
                {#if configColumnas.totalTerritorios}<th title="Total de Territorios">Terr.</th>{/if}
                {#if configColumnas.territoriosSinTrabajar6Meses}<th title="Sin Trabajar (6 Meses)">S/Trab 6M</th>{/if}
                {#if configColumnas.territoriosSinTrabajar1Ano}<th title="Sin Trabajar (1 Año)">S/Trab 1A</th>{/if}
              </tr>
            </thead>
            <tbody>
              {#each desgloseVisitas as item}
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td class="txt-left" style="padding: 8px; color: var(--primary);"><strong>{item.nombre_congregacion}</strong></td>
                  <td style="padding: 8px;">{item.fecha_visita}</td>
                  
                  {#if configColumnas.total}<td>{item.datos.total}</td>{/if}
                  {#if configColumnas.bautizados}<td>{item.datos.bautizados}</td>{/if}
                  {#if configColumnas.mayores65}<td>{item.datos.mayores65}</td>{/if}
                  
                  {#if configColumnas.nuevos}<td>{item.datos.nuevos}</td>{/if}
                  {#if configColumnas.readmitidos}<td>{item.datos.readmitidos}</td>{/if}
                  {#if configColumnas.reactivados}<td>{item.datos.reactivados}</td>{/if}
                  {#if configColumnas.sacados}<td>{item.datos.sacados}</td>{/if}
                  
                  {#if configColumnas.precursoresRegulares}<td>{item.datos.precursoresRegulares}</td>{/if}
                  {#if configColumnas.precursoresAuxiliares}<td>{item.datos.precursoresAuxiliares}</td>{/if}
                  
                  {#if configColumnas.ancianos}<td>{item.datos.ancianos}</td>{/if}
                  {#if configColumnas.siervosMinisteriales}<td>{item.datos.siervosMinisteriales}</td>{/if}
                  
                  {#if configColumnas.irregulares}<td>{item.datos.irregulares}</td>{/if}
                  {#if configColumnas.inactivos}<td>{item.datos.inactivos}</td>{/if}
                  {#if configColumnas.sinCursos}<td>{item.datos.sinCursos}</td>{/if}
                  {#if configColumnas.totalTerritorios}<td>{item.datos.totalTerritorios}</td>{/if}
                  {#if configColumnas.territoriosSinTrabajar6Meses}<td>{item.datos.territoriosSinTrabajar6Meses}</td>{/if}
                  {#if configColumnas.territoriosSinTrabajar1Ano}<td>{item.datos.territoriosSinTrabajar1Ano}</td>{/if}
                </tr>
              {/each}
              
              {#if desgloseVisitas.length === 0}
                <tr>
                  <td colspan="16" style="padding: 30px; color: #94a3b8; text-align: center;">
                    No hay informes guardados en este circuito.
                  </td>
                </tr>
              {/if}
            </tbody>
          </table>
        </div>
      {/if}
      </div> 
      {/if} 
    </div>

<style>
  .panel-global { 
    background: var(--bg-stats); 
    border: var(--border-thin); 
    border-radius: 8px; 
    padding: 10px 14px; 
    margin-bottom: 15px; 
    box-shadow: var(--shadow-sm); 
    border-left: 4px solid var(--panel-accent);  /* ← ANTES: #5c0a1f */
    animation: fadeIn 0.3s ease-out;
    transition: all 0.3s ease;
  }

  .panel-global.colapsado {
    padding-bottom: 10px; 
  }
  
  .panel-header { 
    display: flex; justify-content: space-between; align-items: center; 
    cursor: pointer; user-select: none; margin-bottom: 0;
  }
  
  .panel-global:not(.colapsado) .panel-header {
    margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px dashed var(--border-color);
  }

  .header-left { display: flex; align-items: center; gap: 10px; }
  .header-left h4 { display: flex; align-items: center; gap: 6px; margin: 0; font-size: 0.9rem; font-weight: 800; color: var(--text-main); }
  .badge-info { background: var(--bg-app); border: var(--border-thin); padding: 2px 8px; border-radius: 10px; font-size: 0.65rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;}
  
  .btn-toggle {
    background: transparent; border: none; color: var(--text-muted); 
    display: flex; align-items: center; justify-content: center;
    padding: 4px; border-radius: 6px; cursor: pointer; transition: 0.2s;
  }
  .panel-header:hover .btn-toggle { background: var(--bg-app); color: var(--primary); }

  .panel-grid { 
    display: flex; 
    flex-wrap: wrap; 
    gap: 12px; 
    animation: slideDown 0.3s ease-out; 
  }
  
  /* Fondo de las tarjetas de métricas */
  .stats-group { 
    background: var(--bg-panel);  /* ← ANTES: #ffffff */
    border: var(--border-thin); 
    border-radius: 6px; 
    padding: 6px 12px; 
    border-top: 2px solid transparent; 
    flex: 1 1 max-content;
    box-shadow: 0 1px 2px rgba(0,0,0,0.02); /* Podrías usar var(--shadow-sm) si quieres */
  }
  
  .stats-group.theme-blue { border-top-color: #3b82f6; }
  .stats-group.theme-green { border-top-color: #10b981; }
  .stats-group.theme-slate { border-top-color: #64748b; }
  .stats-group.theme-red { border-top-color: #ef4444; }
  .stats-group.theme-orange { border-top-color: #f59e0b; }
  
  .group-title { display: flex; align-items: center; gap: 4px; font-size: 0.65rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px; }
  
  .stat-items { display: flex; justify-content: space-around; gap: 12px; }
  .stat-box { display: flex; flex-direction: column; align-items: center; text-align: center; }
  .stat-box .val { font-size: 1.15rem; font-weight: 800; color: var(--text-main); line-height: 1; }
  .stat-box .lbl { font-size: 0.6rem; color: var(--text-muted); font-weight: 600; margin-top: 2px; }
  .stat-box .pct { background: rgba(16, 185, 129, 0.1); color: #059669; font-size: 0.55rem; padding: 1px 4px; border-radius: 4px; font-weight: 800; margin-top: 2px; }

  @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes slideDown { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }

  /* --- ESTILOS DEL DESGLOSE --- */

  .desglose-container {
    padding: 0 15px 15px 15px;
    background: var(--bg-stats);  /* ← ANTES: #fffdf0 */
    border-bottom-left-radius: 12px;
    border-bottom-right-radius: 12px;
  }

  .divider {
    height: 1px;
    background: linear-gradient(to right, transparent, var(--border-color), transparent); /* ← ANTES: #e2e8f0 */
    margin: 10px 0 20px 0;
  }

  .desglose-actions {
    display: flex;
    justify-content: center;
    margin-bottom: 15px;
  }

  .btn-detalle {
    background: var(--bg-panel);  /* ← ANTES: #ffffff */
    border: 1px solid var(--border-color);  /* ← ANTES: #e2e8f0 */
    color: var(--text-muted);  /* ← ANTES: #475569 */
    padding: 8px 20px;
    border-radius: 30px;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s ease;
    box-shadow: var(--shadow-sm);  /* ← ANTES: 0 2px 4px rgba(0,0,0,0.05) */
  }

  .btn-detalle:hover {
    background: var(--bg-panel);
    border-color: var(--primary);
    color: var(--primary);
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);  /* ← ANTES: 0 4px 6px rgba(0,0,0,0.1) */
  }

  .tabla-scroll-wrapper {
    overflow-x: auto;
    border: 1px solid var(--border-color);  /* ← ANTES: #e2e8f0 */
    border-radius: 10px;
    box-shadow: inset 0 2px 4px rgba(0,0,0,0.02); /* Puedes dejarlo o usar una variable */
  }

  .tabla-timothy {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
    min-width: 600px;
  }

  .tabla-timothy th {
    background: var(--bg-subtle);  /* ← ANTES: #f1f5f9 */
    color: var(--text-muted);  /* ← ANTES: #475569 */
    font-weight: 700;
    text-transform: uppercase;
    font-size: 0.7rem;
    letter-spacing: 0.05em;
    padding: 12px 10px;
    border-bottom: 2px solid var(--border-color);  /* ← ANTES: #e2e8f0 */
    position: sticky;
    top: 0;
  }

  .tabla-timothy td {
    padding: 12px 10px;
    border-bottom: 1px solid var(--border-color);  /* ← ANTES: #f1f5f9 */
    color: var(--text-main);  /* ← ANTES: #1e293b */
    text-align: center;
  }

  .tabla-timothy tr:hover {
    background-color: var(--row-hover);  /* ← ANTES: #f8fafc */
  }

  .tabla-timothy .txt-left {
    text-align: left;
    padding-left: 20px;
  }

  .tabla-timothy strong {
    color: var(--primary);
    font-weight: 600;
  }

  /* Animación de entrada suave */
  .fade-in {
    animation: slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes slideDown {
    from { 
      opacity: 0; 
      transform: translateY(-20px); 
    }
    to { 
      opacity: 1; 
      transform: translateY(0); 
    }
  }

  .panel-global.colapsado .desglose-container {
    display: none;
  }

  .menu-columnas {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 8px;
    background: var(--bg-panel);  /* ← ANTES: white */
    border: 1px solid var(--border-color);  /* ← ANTES: #e2e8f0 */
    border-radius: 8px;
    box-shadow: var(--shadow-md);  /* ← ANTES: 0 10px 15px -3px rgb(0 0 0 / 0.1)... */
    padding: 16px;
    width: 250px;
    z-index: 50;
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-height: 350px;
    overflow-y: auto;
  }

  .menu-header {
    font-size: 13px;
    font-weight: 700;
    color: var(--text-main);  /* ← ANTES: #1e293b */
    margin-bottom: 4px;
    padding-bottom: 8px;
    border-bottom: 2px solid var(--primary);
  }

  .menu-seccion {
    font-size: 10px;
    font-weight: 800;
    color: var(--text-muted);  /* ← ANTES: #94a3b8 */
    text-transform: uppercase;
    margin-top: 10px;
    border-bottom: 1px solid var(--border-color);  /* ← ANTES: #f1f5f9 */
    padding-bottom: 4px;
    letter-spacing: 0.5px;
  }

  .toggle-container {
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;
    user-select: none;
  }

  .toggle-container input[type="checkbox"] {
    opacity: 0;
    width: 0;
    height: 0;
    position: absolute;
  }

  .toggle-slider {
    position: relative;
    display: inline-block;
    width: 34px;
    height: 20px;
    background-color: var(--toggle-bg);  /* ← ANTES: #cbd5e1 */
    border-radius: 20px;
    transition: background-color 0.3s ease-in-out;
    flex-shrink: 0;
  }

  .toggle-slider::before {
    content: "";
    position: absolute;
    height: 16px;
    width: 16px;
    left: 2px;
    bottom: 2px;
    background-color: white;  /* La bolita blanca puede quedarse así */
    border-radius: 50%;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  }

  .toggle-container input:checked + .toggle-slider {
    background-color: var(--primary); 
  }

  .toggle-container input:checked + .toggle-slider::before {
    transform: translateX(14px);
  }

  .toggle-label {
    font-size: 0.8rem;
    color: var(--text-main);  /* ← ANTES: #334155 */
    font-weight: 500;
  }
</style>