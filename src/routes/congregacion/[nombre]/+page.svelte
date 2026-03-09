<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { ArrowLeft, History, ClipboardEdit, Calendar, ChevronRight, Play, CheckCircle2, Clock } from "lucide-svelte";
  import { LazyStore } from '@tauri-apps/plugin-store';
  
  // TUS DOS COMPONENTES HIJOS
  import AnalisisCongregacion from '$lib/components/AnalisisCongregacion.svelte';
  import HistorialCongregacion from '$lib/components/HistorialCongregacion.svelte';

  $: idCircuito = $page.params.id;
  $: nombreCongregacion = $page.params.nombre || "";

  let modo: 'dashboard' | 'nuevo' | 'historial' = 'dashboard';
  let datosParaEditar: any = null;

  const store = new LazyStore('registro_circuito_v1.json');

  let progreso = 0;
  let hayBorrador = false;
  let fechaBorrador = '';
  let historialReciente: any[] = [];
  let cargando = true;

  const camposMuro = [
    'opinionAncianos', 'ministerioCristiano', 'reunionesCongregacion', 
    'pastoreo', 'precursores', 'irregularesInactivos', 
    'responsabilidades', 'contabilidad', 'miscelaneos', 'seguimiento'
  ];

  async function cargarDatosDashboard() {
    cargando = true;
    try {
      // Borrador actual
      const obs = await store.get<Record<string, any>>('observaciones') || {};
      const borrador = obs[nombreCongregacion];
      
      if (borrador) {
        let llenos = 0;
        camposMuro.forEach(c => {
          if (borrador[c] && borrador[c].trim() !== '') llenos++;
        });
        progreso = llenos;
        hayBorrador = llenos > 0 || (borrador.fechaVisita && borrador.fechaVisita !== '');
        fechaBorrador = borrador.fechaVisita || 'Sin fecha asignada';
      } else {
        progreso = 0; hayBorrador = false;
      }

      // Historial reciente
      const histStore = await store.get<Record<string, any>>('historial') || {};
      const historialCong = histStore[nombreCongregacion] || [];
      historialReciente = historialCong
        .sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
        .slice(0, 3);

    } catch (e) {
      console.error("Error cargando dashboard:", e);
    } finally {
      cargando = false;
    }
  }

  $: if (nombreCongregacion && modo === 'dashboard') {
    cargarDatosDashboard();
  }

  function volverAlMenu() {
    modo = 'dashboard';
    datosParaEditar = null;
    cargarDatosDashboard(); 
  }
</script>

<div class="focus-view">
 <header class="focus-header">
    <button class="btn-back" on:click={() => window.history.back()}>
      <ArrowLeft size={18} />
      <span>Volver a Congregaciones</span>
    </button>
    <div class="title-group">
      <h1>{nombreCongregacion}</h1>
      <p>Gestión de Análisis e Informes</p>
    </div>
  </header>

  <main class="focus-content">
    
    {#if modo === 'dashboard'}
      <div class="dashboard-layout">
        {#if cargando}
          <div class="loading">Cargando información...</div>
        {:else}
          <div class="grid-dashboard">
            <div class="dash-card card-borrador">
              <div class="card-header">
                <div class="icon-box red"><ClipboardEdit size={24} /></div>
                <h3>Análisis de la Visita Actual</h3>
              </div>
              <div class="card-body">
                {#if hayBorrador}
                  <div class="estado-borrador">
                    <p class="fecha-label"><Calendar size={14}/> Semana: <strong>{fechaBorrador}</strong></p>
                    <div class="progreso-container">
                      <div class="progreso-text"><span>Progreso del informe</span><strong>{progreso} de 10 secciones</strong></div>
                      <div class="progreso-barra-fondo"><div class="progreso-barra-llena" style="width: {(progreso / 10) * 100}%"></div></div>
                    </div>
                  </div>
                  <button class="btn-accion btn-primary" on:click={() => modo = 'nuevo'}><Play size={18} /> Continuar Análisis</button>
                {:else}
                  <div class="estado-vacio"><CheckCircle2 size={40} color="#cbd5e1" style="margin-bottom: 10px;" /><p>No hay ninguna visita en curso.</p></div>
                  <button class="btn-accion btn-primary" on:click={() => modo = 'nuevo'}><Play size={18} /> Iniciar Nuevo Análisis</button>
                {/if}
              </div>
            </div>

            <div class="dash-card card-historial">
              <div class="card-header">
                <div class="icon-box blue"><History size={24} /></div>
                <h3>Historial Reciente</h3>
              </div>
              <div class="card-body">
                {#if historialReciente.length > 0}
                  <ul class="lista-historial">
                    {#each historialReciente as visita}
                      <li class="historial-item">
                        <div class="historial-info"><Clock size={16} color="#64748b" /><span>Visita del <strong>{visita.fecha}</strong></span></div>
                        <button class="btn-icon" title="Ver detalles" on:click={() => modo = 'historial'}><ChevronRight size={18} /></button>
                      </li>
                    {/each}
                  </ul>
                {:else}
                  <div class="estado-vacio"><History size={40} color="#cbd5e1" style="margin-bottom: 10px;" /><p>No hay visitas guardadas.</p></div>
                {/if}
                <button class="btn-accion btn-outline" on:click={() => modo = 'historial'}>Ver Todo el Historial</button>
              </div>
            </div>
          </div>
        {/if}
      </div>

    {:else if modo === 'nuevo'}
      <div class="form-container">
        <button class="btn-text" on:click={volverAlMenu}>
          <ArrowLeft size={14} /> Volver al Panel
        </button>
        <AnalisisCongregacion 
          {nombreCongregacion} 
          datosEdicion={datosParaEditar}
          on:limpiarFormulario={volverAlMenu}
          on:guardarEnHistorial={async (e) => {
            // AQUÍ ATRAPAMOS EL INFORME FINALIZADO Y LO GUARDAMOS EN EL HISTORIAL
            const histStore = await store.get<Record<string, any>>('historial') || {};
            if (!histStore[nombreCongregacion]) {
              histStore[nombreCongregacion] = [];
            }
            
            histStore[nombreCongregacion].push({ 
              fecha: e.detail.fecha, 
              contenido: e.detail.contenido 
            });
            
            await store.set('historial', histStore);
            await store.save();
          }}
        />
      </div>

    {:else if modo === 'historial'}
      <div class="form-container">
        <button class="btn-text" on:click={volverAlMenu}>
          <ArrowLeft size={14} /> Volver al Panel
        </button>
        <HistorialCongregacion {nombreCongregacion} />
      </div>
    {/if}
    
  </main>
</div>

<style>
  /* ESTILOS DEL CONTENEDOR PRINCIPAL */
  .focus-view { display: flex; flex-direction: column; height: 100%; background: #f8fafc; font-family: system-ui; }
  .focus-header { background: white; padding: 20px 40px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; gap: 30px; }
  .btn-back { display: flex; align-items: center; gap: 8px; text-decoration: none; color: #64748b; font-weight: 600; font-size: 0.9rem; padding: 8px 16px; border: 1px solid #e2e8f0; border-radius: 8px; transition: all 0.2s; }
  .btn-back:hover { background: #f1f5f9; color: #0f172a; }
  .title-group h1 { margin: 0; font-size: 1.8rem; color: #0f172a; font-weight: 800; }
  .title-group p { margin: 0; color: #64748b; font-size: 0.9rem; }
  .focus-content { flex: 1; padding: 40px; overflow-y: auto; }

  /* ESTILOS DEL DASHBOARD */
  .dashboard-layout { max-width: 1000px; margin: 0 auto; animation: fadeIn 0.3s ease; }
  .loading { color: #64748b; font-style: italic; text-align: center; margin-top: 50px; }
  .grid-dashboard { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 25px; }
  .dash-card { background: white; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); display: flex; flex-direction: column; overflow: hidden; }
  .card-header { display: flex; align-items: center; gap: 15px; padding: 20px 25px; border-bottom: 1px solid #f1f5f9; }
  .card-header h3 { margin: 0; font-size: 1.2rem; color: #1e293b; font-weight: 700; }
  .icon-box { width: 45px; height: 45px; border-radius: 12px; display: flex; justify-content: center; align-items: center; }
  .icon-box.red { background: #fff1f2; color: #e11d48; }
  .icon-box.blue { background: #eff6ff; color: #2563eb; }
  .card-body { padding: 25px; flex: 1; display: flex; flex-direction: column; justify-content: space-between; gap: 20px; }

  .estado-borrador { display: flex; flex-direction: column; gap: 15px; }
  .fecha-label { margin: 0; display: flex; align-items: center; gap: 8px; color: #475569; font-size: 0.95rem; }
  .progreso-container { background: #f8fafc; padding: 15px; border-radius: 10px; border: 1px solid #f1f5f9;}
  .progreso-text { display: flex; justify-content: space-between; font-size: 0.85rem; color: #64748b; margin-bottom: 8px; }
  .progreso-text strong { color: #0f172a; }
  .progreso-barra-fondo { background: #e2e8f0; height: 8px; border-radius: 10px; overflow: hidden; }
  .progreso-barra-llena { background: #10b981; height: 100%; border-radius: 10px; transition: width 0.5s ease-out; }

  .lista-historial { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
  .historial-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 15px; background: #f8fafc; border-radius: 10px; border: 1px solid #f1f5f9; }
  .historial-info { display: flex; align-items: center; gap: 10px; font-size: 0.95rem; color: #334155; }
  .btn-icon { background: transparent; border: none; color: #94a3b8; cursor: pointer; padding: 5px; }
  .btn-icon:hover { color: #2563eb; }

  .estado-vacio { display: flex; flex-direction: column; align-items: center; justify-content: center; color: #94a3b8; text-align: center; padding: 20px 0; }
  .estado-vacio p { margin: 0; font-size: 0.95rem; }

  .btn-accion { width: 100%; height: 48px; border-radius: 12px; font-weight: 700; font-size: 1rem; display: flex; justify-content: center; align-items: center; gap: 8px; cursor: pointer; transition: all 0.2s; border: none; }
  .btn-primary { background: #e11d48; color: white; }
  .btn-primary:hover { background: #be123c; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(225, 29, 72, 0.2); }
  .btn-outline { background: white; border: 2px solid #cbd5e1; color: #475569; }
  .btn-outline:hover { border-color: #2563eb; color: #2563eb; background: #f8fafc; }

  /* ESTILOS DEL CONTENEDOR DEL FORMULARIO E HISTORIAL */
  .form-container { max-width: 1200px; margin: 0 auto; background: transparent; }
  .btn-text { background: none; border: none; color: #e11d48; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px; margin-bottom: 20px; }
  .btn-text:hover { color: #be123c; text-decoration: underline; }
  
  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

  .btn-back { 
    display: flex; 
    align-items: center; 
    gap: 8px; 
    background: white; /* Fondo blanco */
    color: #64748b; 
    font-weight: 600; 
    font-size: 0.9rem; 
    padding: 8px 16px; 
    border: 1px solid #e2e8f0; 
    border-radius: 8px; 
    cursor: pointer; /* Cambia el cursor a la mano */
    transition: all 0.2s; 
  }

  .btn-back:hover { 
    background: #f1f5f9; 
    color: #0f172a; 
  }

</style>