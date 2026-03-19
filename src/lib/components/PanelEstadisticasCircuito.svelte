<script lang="ts">
  import { Activity, Users, Star, BookOpen, AlertTriangle, ChevronUp, ChevronDown, TrendingUp } from "lucide-svelte"; 
  import { initDB, type Congregacion } from '$lib/services/db';
  import { page } from '$app/stores';
  import { actualizacionHistorial } from '$lib/stores/appStore';

  export let listaCongregaciones: Congregacion[] = [];
  let panelVisible = true;

  let metricasGlobales = {
    total: 0, bautizados: 0, mayores65: 0, nuevos: 0, readmitidos: 0, reactivados: 0, sacados: 0,
    precursoresRegulares: 0, precursoresAuxiliares: 0, ancianos: 0, siervosMinisteriales: 0,
    irregulares: 0, inactivos: 0, sinCursos: 0
  };
  
  let congregacionesAnalizadas = 0;

  // REACTIVIDAD ANTI-CARRERAS: Escucha los cambios, pero espera 300ms 
  // para que SQLite termine de guardar la visita antes de calcular todo.
  $: if ($actualizacionHistorial || listaCongregaciones.length >= 0 || $page.url.pathname) {
    setTimeout(() => {
      calcularMetricas();
    }, 300);
  }

  async function calcularMetricas() {
    if (!listaCongregaciones || listaCongregaciones.length === 0) return;

    try {
      const db = await initDB();
      let t = { total: 0, bautizados: 0, mayores65: 0, nuevos: 0, readmitidos: 0, reactivados: 0, sacados: 0, precursoresRegulares: 0, precursoresAuxiliares: 0, ancianos: 0, siervosMinisteriales: 0, irregulares: 0, inactivos: 0, sinCursos: 0 };
      let contador = 0;
      
      // Creamos un registro para la consola
      let tablaDebug = [];

      for (const cong of listaCongregaciones) {
        let registro = { 
          Congregacion: cong.nombre, 
          ID_SQLite: "No encontrado", 
          Historiales: 0, 
          TotalExtraido: 0,
          Estado: "Sin datos"
        };

        const resCong = await db.select<{id: number}[]>('SELECT id FROM congregaciones WHERE nombre = $1 LIMIT 1', [cong.nombre]);

        if (resCong.length > 0) {
          const idRealSQLite = resCong[0].id;
          registro.ID_SQLite = idRealSQLite;

          const res = await db.select<{contenido: string, tipo: string}[]>(
            "SELECT contenido, tipo FROM historial_visitas WHERE congregacion_id = $1 ORDER BY fecha DESC",
            [idRealSQLite]
          );
          
          const revisiones = res.filter(v => v.tipo.includes('Revisi'));
          registro.Historiales = revisiones.length;

          if (revisiones.length > 0) {
            try {
              const revision = revisiones[0]; // Tomamos la más reciente
              let snapshot = JSON.parse(revision.contenido);
              if (typeof snapshot === 'string') snapshot = JSON.parse(snapshot);
              
              contador++;
              registro.Estado = "OK";

              const val = (k: string) => {
                const d = snapshot[k];
                if (d && typeof d === 'object' && 'valor' in d) return Number(d.valor) || 0;
                return Number(d) || 0;
              };

              // Extraemos el total para la tabla de diagnóstico
              const publicadores = val('total');
              registro.TotalExtraido = publicadores;

              t.total += publicadores;
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
            } catch (e) { 
              registro.Estado = "Error de JSON"; 
            }
          }
        }
        tablaDebug.push(registro);
      }

      // IMPRIMIMOS LA TABLA EN LA CONSOLA
      console.table(tablaDebug);

      metricasGlobales = { ...t };
      congregacionesAnalizadas = contador;
      
    } catch (e) { console.error("Error crítico:", e); }
  }
  
  function togglePanel() { panelVisible = !panelVisible; }
</script>

<div class="panel-global {panelVisible ? '' : 'colapsado'}">
  <div class="panel-header" on:click={togglePanel} role="button" tabindex="0">
    <div class="header-left">
      <h4><Activity size={16} color="var(--primary)"/> Salud Global del Circuito</h4>
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
        <div class="group-title"><Users size={12}/> Base</div>
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
        <div class="group-title"><BookOpen size={12}/> Liderazgo</div>
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

    </div>
  {/if}
</div>

<style>
  .panel-global { 
    background: var(--bg-panel); border: var(--border-thin); border-radius: 8px; 
    padding: 10px 14px; margin-bottom: 15px; box-shadow: var(--shadow-sm); 
    border-left: 4px solid var(--primary);
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

  /* MAGIA AQUÍ: Usamos flexbox en lugar de grid para que se adapten al contenido */
  .panel-grid { 
    display: flex; 
    flex-wrap: wrap; 
    gap: 12px; 
    animation: slideDown 0.3s ease-out; 
  }
  
  .stats-group { 
    background: var(--bg-app); border: var(--border-thin); border-radius: 6px; 
    padding: 6px 12px; border-top: 2px solid transparent; 
    flex: 1 1 max-content; /* Permite que la tarjeta sea tan ancha como necesite, pero rellena el espacio extra */
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
</style>