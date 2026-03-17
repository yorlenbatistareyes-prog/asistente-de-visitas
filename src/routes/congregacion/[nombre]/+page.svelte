<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { ArrowLeft, History, ClipboardEdit, Calendar, ChevronRight, Play, CheckCircle2, Clock } from "lucide-svelte";
  
  // IMPORTAMOS SQLITE EN VEZ DE LAZYSTORE
  import { initDB, cargarConfig } from '$lib/services/db';
  
  // TUS DOS COMPONENTES HIJOS
  import AnalisisCongregacion from '$lib/components/AnalisisCongregacion.svelte';
  import HistorialCongregacion from '$lib/components/HistorialCongregacion.svelte';

  $: idCircuito = $page.params.id;
  $: nombreCongregacion = $page.params.nombre || "";

  let modo: 'dashboard' | 'nuevo' | 'historial' = 'dashboard';
  let datosParaEditar: any = null;

  let progreso = 0;
  let hayBorrador = false;
  let fechaBorrador = '';
  let historialReciente: any[] = [];
  let cargando = true;

  const camposMuro = [
    'opinionAncianos', 'ministerioCristiano', 'reunionesCongregacion', 
    'pastoreo', 'precursores', 'irregularesInactivos', 
    'responsabilidades', 'contabilidad', 'miscelaneos', 'seguimiento',
    'recomendaciones', 'localReunion' // <-- Añadimos los dos nuevos
  ];

  async function cargarDatosDashboard() {
    cargando = true;
    try {

      // ¡AQUÍ ESTÁ LA CLAVE! Usamos cargarConfig, igual que lo hace el formulario
      const claveBorrador = `borrador_${nombreCongregacion}`;
      const valor = await cargarConfig(claveBorrador);

      if (valor && valor !== "{}" && valor !== "") {
        // Si hay datos, los procesamos
        const borrador = typeof valor === 'string' ? JSON.parse(valor) : valor;
        let llenos = 0;
        
        camposMuro.forEach(c => {
          if (borrador[c] && typeof borrador[c] === 'string' && borrador[c].trim() !== '') {
            llenos++;
          }
        });
        
        progreso = llenos;
        hayBorrador = llenos > 0 || (borrador.fechaVisita && borrador.fechaVisita.trim() !== '');
        fechaBorrador = borrador.fechaVisita || 'Sin fecha asignada';
      } else {
        // Si está vacío, apagamos la barra
        progreso = 0; 
        hayBorrador = false;
        fechaBorrador = '';
      }

      // 3. CARGAMOS EL HISTORIAL RECIENTE
      const db = await initDB();
      const resCong = await db.select<{id: number}[]>(
        'SELECT id FROM congregaciones WHERE nombre = $1 LIMIT 1', 
        [nombreCongregacion]
      );
      
      if (resCong.length > 0) {
        const congregacionId = resCong[0].id;
        historialReciente = await db.select<any[]>(
          'SELECT * FROM historial_visitas WHERE congregacion_id = $1 ORDER BY fecha DESC LIMIT 6',
          [congregacionId]
        );
      } else {
        historialReciente = [];
      }

    } catch (e) {
      console.error("❌ Error cargando dashboard:", e);
    } finally {
      cargando = false;
    }
  }

  $: if (browser && nombreCongregacion && modo === 'dashboard') {
    cargarDatosDashboard();
  }

  function volverAlMenu() {
    modo = 'dashboard';
    datosParaEditar = null;
    cargarDatosDashboard(); 
  }

  // --- FUNCIÓN QUE ATRAPA EL INFORME FINALIZADO Y LO GUARDA ---
  async function handleGuardarEnHistorial(e: CustomEvent) {
    const { congregacion, fecha, contenido } = e.detail;
    try {
      const db = await initDB();
      const resCong = await db.select<{id: number}[]>(
        'SELECT id FROM congregaciones WHERE nombre = $1 LIMIT 1', 
        [congregacion]
      );

      if (resCong.length > 0) {
        const congregacionId = resCong[0].id;
        await db.execute(
          `INSERT INTO historial_visitas (congregacion_id, fecha, tipo, completado, contenido) 
           VALUES ($1, $2, $3, $4, $5)`,
          [congregacionId, fecha, 'Visita Regular', 1, contenido]
        );
      }
    } catch (error) {
      console.error("Error al guardar en el historial SQLite:", error);
      alert("Error al guardar el informe en la base de datos.");
    }
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
                      <div class="progreso-text">
                        <span>Progreso del informe</span>
                        <strong>{progreso} de 12 secciones</strong>
                      </div>
                      <div class="progreso-barra-fondo">
                        <div class="progreso-barra-llena" style="width: {(progreso / 12) * 100}%"></div>
                      </div>
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
          on:guardarEnHistorial={handleGuardarEnHistorial}
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
  .focus-view { 
    display: flex; 
    flex-direction: column; 
    height: 100%; 
    background: var(--bg-app); 
    color: var(--text-main); 
    font-family: var(--font-family); 
  }
  
  .focus-header { 
    background: var(--bg-panel); 
    padding: 20px 40px; 
    border-bottom: var(--border-thin); 
    display: flex; 
    align-items: center; 
    gap: 30px; 
  }

  .btn-back { 
    display: flex; 
    align-items: center; 
    gap: 8px; 
    background: var(--bg-panel); 
    color: var(--text-main); 
    font-weight: 600; 
    font-size: 0.9rem; 
    padding: 8px 16px; 
    border: var(--border-thin); 
    border-radius: var(--radius-md); 
    cursor: pointer; 
    transition: all 0.2s; 
  }

  .btn-back:hover { 
    background: var(--bg-app); 
    color: var(--text-main); 
  }

  .title-group h1 { margin: 0; font-size: 1.8rem; color: var(--text-main); font-weight: 800; }
  .title-group p { margin: 0; color: var(--text-muted); font-size: 0.9rem; }
  .focus-content { flex: 1; padding: 40px; overflow-y: auto; }

  /* ESTILOS DEL DASHBOARD */
  .dashboard-layout { max-width: 1000px; margin: 0 auto; animation: fadeIn 0.3s ease; }
  .loading { color: var(--text-muted); font-style: italic; text-align: center; margin-top: 50px; }
  .grid-dashboard { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 25px; }
  
  .dash-card { 
    background: var(--bg-panel); 
    border-radius: var(--radius-lg); 
    border: var(--border-thin); 
    box-shadow: var(--shadow-sm); 
    display: flex; 
    flex-direction: column; 
    overflow: hidden; 
  }

  .card-header { 
    display: flex; 
    align-items: center; 
    gap: 15px; 
    padding: 20px 25px; 
    border-bottom: var(--border-thin); 
  }

  .card-header h3 { margin: 0; font-size: 1.2rem; color: var(--text-main); font-weight: 700; }
  
  .icon-box { 
    width: 45px; height: 45px; 
    border-radius: var(--radius-md); 
    display: flex; justify-content: center; align-items: center; 
  }
  .icon-box.red { background: rgba(225, 29, 72, 0.1); color: var(--primary); }
  .icon-box.blue { background: rgba(37, 99, 235, 0.1); color: #2563eb; }

  .card-body { padding: 25px; flex: 1; display: flex; flex-direction: column; justify-content: space-between; gap: 20px; }

  .estado-borrador { display: flex; flex-direction: column; gap: 15px; }
  .fecha-label { margin: 0; display: flex; align-items: center; gap: 8px; color: var(--text-main); font-size: 0.95rem; }
  
  .progreso-container { 
    background: var(--bg-app); 
    padding: 15px; 
    border-radius: var(--radius-md); 
    border: var(--border-thin);
  }

  .progreso-text { display: flex; justify-content: space-between; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 8px; }
  .progreso-text strong { color: var(--text-main); }
  
  .progreso-barra-fondo { background: var(--border-color); height: 8px; border-radius: 10px; overflow: hidden; }
  .progreso-barra-llena { background: #10b981; height: 100%; border-radius: 10px; transition: width 0.5s ease-out; }

  .lista-historial { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
  
  .historial-item { 
    display: flex; 
    justify-content: space-between; 
    align-items: center; 
    padding: 12px 15px; 
    background: var(--bg-app); 
    border-radius: var(--radius-md); 
    border: var(--border-thin); 
  }

  .historial-info { display: flex; align-items: center; gap: 10px; font-size: 0.95rem; color: var(--text-main); }
  .btn-icon { background: transparent; border: none; color: var(--text-muted); cursor: pointer; padding: 5px; }
  .btn-icon:hover { color: var(--primary); }

  .estado-vacio { display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--text-muted); text-align: center; padding: 20px 0; }
  .estado-vacio p { margin: 0; font-size: 0.95rem; }

  .btn-accion { 
    width: 100%; 
    height: 40px; 
    border-radius: var(--radius-md); 
    font-weight: 600; 
    font-size: 0.95rem; 
    display: flex; justify-content: center; align-items: center; 
    gap: 8px; cursor: pointer; transition: all 0.2s; border: none; 
  }

  .btn-primary { background: var(--primary); color: white; }
  .btn-primary:hover { background: #be123c; transform: translateY(-2px); box-shadow: var(--shadow-md); }
  
  .btn-outline { 
    background: var(--bg-panel); 
    border: var(--border-thin); 
    color: var(--text-main); 
  }
  .btn-outline:hover { background: var(--bg-app); border-color: var(--primary); color: var(--primary); }

  .form-container { max-width: 1200px; margin: 0 auto; background: transparent; }
  .btn-text { 
    background: none; border: none; color: var(--primary); font-weight: 700; 
    cursor: pointer; display: flex; align-items: center; gap: 6px; margin-bottom: 20px; 
  }
  .btn-text:hover { color: #be123c; text-decoration: underline; }
  
  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>