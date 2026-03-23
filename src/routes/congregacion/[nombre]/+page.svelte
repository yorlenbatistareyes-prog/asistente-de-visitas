<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { ArrowLeft, History, ClipboardEdit, Calendar, ChevronRight, Play, CheckCircle2, Clock,
    LayoutDashboard, FolderOpen, Archive } from "lucide-svelte";
  
  import { initDB, cargarConfig } from '$lib/services/db';
  import AnalisisCongregacion from '$lib/components/AnalisisCongregacion.svelte';
  import HistorialCongregacion from '$lib/components/HistorialCongregacion.svelte';
  import RevisionArchivos from '$lib/components/RevisionArchivos.svelte';
  import { notificarCambioHistorial } from '$lib/stores/appStore';

  $: idCircuito = $page.params.id;
  $: nombreCongregacion = $page.params.nombre || "";

  let modo: 'dashboard' | 'nuevo' | 'historial' = 'dashboard';
  let pestanaActiva: 'analisis' | 'archivos' = 'analisis';
  let idVisitaSeleccionada: number | null = null; 
  
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
    'recomendaciones', 'localReunion' 
  ];

  // LA OPCIÓN NUCLEAR: Borra todo lo que no sea una letra de la A a la Z o un número.
  const normalizarExtremo = (texto: string) => {
    return decodeURIComponent(texto).toUpperCase().replace(/[^A-Z0-9]/g, '');
  };

  async function cargarDatosDashboard() {
    cargando = true;
    try {
      const claveBorrador = `borrador_${nombreCongregacion}`;
      const valor = await cargarConfig(claveBorrador);

      if (valor && valor !== "{}" && valor !== "") {
        const borrador = typeof valor === 'string' ? JSON.parse(valor) : valor;
        let llenos = 0;
        camposMuro.forEach(c => { if (borrador[c] && typeof borrador[c] === 'string' && borrador[c].trim() !== '') llenos++; });
        progreso = llenos;
        hayBorrador = llenos > 0 || (borrador.fechaVisita && borrador.fechaVisita.trim() !== '');
        fechaBorrador = borrador.fechaVisita || 'Sin fecha asignada';
      } else {
        progreso = 0; hayBorrador = false; fechaBorrador = '';
      }

      // BÚSQUEDA EXTREMA PARA EL HISTORIAL
      const db = await initDB();
      const congregacionesDB = await db.select<{id: number, nombre: string}[]>('SELECT id, nombre FROM congregaciones');
      const nombreLimpio = normalizarExtremo(nombreCongregacion);
      
      const congEncontrada = congregacionesDB.find(c => normalizarExtremo(c.nombre) === nombreLimpio);

      if (congEncontrada) {
        historialReciente = await db.select<any[]>(
          'SELECT * FROM historial_visitas WHERE congregacion_id = $1 ORDER BY fecha DESC LIMIT 6',
          [congEncontrada.id]
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
    pestanaActiva = 'analisis'; 
    datosParaEditar = null;
    cargarDatosDashboard(); 
  }

  // --- FUNCIÓN QUE ATRAPA EL INFORME FINALIZADO Y LO GUARDA ---
  async function handleGuardarEnHistorial(e: CustomEvent) {
    const { congregacion, fecha, contenido, tipo } = e.detail;
    const tipoVisita = tipo ? tipo : 'Análisis'; 

    try {
      const db = await initDB();
      const congregacionesDB = await db.select<{id: number, nombre: string}[]>('SELECT id, nombre FROM congregaciones');
      
      // Aplicamos la limpieza extrema
      const nombreBusqueda = normalizarExtremo(congregacion);
      
      console.log("🕵️‍♂️ DIAGNÓSTICO DE GUARDADO:");
      console.log(`Intentando guardar para: [${nombreBusqueda}]`);

      // Buscamos coincidencia exacta de caracteres alfanuméricos
      let congEncontrada = null;
      for (const c of congregacionesDB) {
        const nombreDB = normalizarExtremo(c.nombre);
        console.log(`Comparando con DB: [${nombreDB}]`);
        if (nombreDB === nombreBusqueda) {
          congEncontrada = c;
          break;
        }
      }

      if (congEncontrada) {
        await db.execute(
          `INSERT INTO historial_visitas (congregacion_id, fecha, tipo, completado, contenido) 
           VALUES ($1, $2, $3, $4, $5)`,
          [congEncontrada.id, fecha, tipoVisita, 1, contenido] 
        );

        notificarCambioHistorial();
        cargarDatosDashboard(); 
        
        alert(`✅ ¡Revisión archivada con éxito para ${congEncontrada.nombre}!`);
      } else {
        alert(`Error: No logré emparejar la congregación. Abre la consola (F12) para ver el diagnóstico.`);
      }
    } catch (error) {
      console.error("Error al guardar en SQLite:", error);
      alert("Error al guardar el informe.");
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
      
      <div class="tabs-container">
        <button 
          class="tab-btn {pestanaActiva === 'analisis' ? 'active' : ''}" 
          on:click={() => pestanaActiva = 'analisis'}>
          <LayoutDashboard size={18} />
          <span>Análisis de Congregación</span>
        </button>
        <button 
          class="tab-btn {pestanaActiva === 'archivos' ? 'active' : ''}" 
          on:click={() => pestanaActiva = 'archivos'}>
          <FolderOpen size={18} />
          <span>Revisión de Archivos</span>
        </button>
      </div>

      <div class="dashboard-layout">
        
        {#if pestanaActiva === 'analisis'}
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
                            <div class="historial-info">
                              {#if visita.tipo === 'Revisión de Archivos'}
                                <Archive size={16} color="#10b981" />
                                <span>Revisión del <strong>{visita.fecha}</strong></span>
                              {:else}
                                <Clock size={16} color="#64748b" />
                                <span>Visita del <strong>{visita.fecha}</strong></span>
                              {/if}
                            </div>
                            <button class="btn-icon" title="Ver detalles" on:click={() => { idVisitaSeleccionada = visita.id; modo = 'historial'; }}>
                               <ChevronRight size={18} />
                            </button>
                          </li>
                        {/each}
                      </ul>
                  {:else}
                    <div class="estado-vacio"><History size={40} color="#cbd5e1" style="margin-bottom: 10px;" /><p>No hay visitas guardadas.</p></div>
                  {/if}
                  <button class="btn-accion btn-outline" on:click={() => { idVisitaSeleccionada = null; modo = 'historial'; }}>
                     Ver Todo el Historial
                  </button>
                </div>
              </div>
            </div>
          {/if}
        
        {:else if pestanaActiva === 'archivos'}
          
          <RevisionArchivos 
            {nombreCongregacion} 
            on:guardarEnHistorial={handleGuardarEnHistorial} 
          />

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
        <HistorialCongregacion {nombreCongregacion} visitaResaltada={idVisitaSeleccionada} />
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

  /* 4. Ajuste del botón "Volver atrás" (Elegante y visible) */
    .btn-back {
      width: auto !important; /* Le quitamos el ancho completo */
      min-height: 40px; /* Altura cómoda para el dedo */
      padding: 0 16px; 
      justify-content: flex-start; /* Todo alineado a la izquierda */
      border-radius: 30px; /* Le damos forma redondita de píldora */
      background: var(--bg-panel);
      box-shadow: 0 2px 5px rgba(0,0,0,0.08); /* Una sombrita para que resalte y no se pierda */
      border: 1px solid var(--border-color);
    }

  .btn-back:hover { 
    background: var(--bg-app); 
    color: var(--text-main); 
  }

  .title-group h1 { margin: 0; font-size: 1.8rem; color: var(--text-main); font-weight: 800; }
  .title-group p { margin: 0; color: var(--text-muted); font-size: 0.9rem; }
  .focus-content { flex: 1; padding: 40px; overflow-y: auto; }

  /* NUEVO: ESTILOS DE LAS PESTAÑAS */
  .tabs-container {
    display: flex;
    gap: 30px;
    border-bottom: 2px solid var(--border-color);
    margin-bottom: 30px;
    padding-bottom: 0;
  }

  .tab-btn {
    background: transparent;
    border: none;
    padding: 10px 5px;
    font-size: 1.05rem;
    font-weight: 600;
    color: var(--text-muted);
    cursor: pointer;
    border-bottom: 3px solid transparent; 
    margin-bottom: -2px; 
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .tab-btn:hover {
    color: var(--primary);
  }

  .tab-btn.active {
    color: var(--primary);
    border-bottom: 3px solid var(--primary); 
  }

  @media (max-width: 768px) {
    .tabs-container { gap: 15px; }
    .tab-btn { font-size: 0.95rem; flex: 1; }
  }

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

  .card-body { 
    padding: 25px; 
    flex: 1; 
    display: flex; 
    flex-direction: column; 
    justify-content: space-between; 
    gap: 20px; 
    
    /* AÑADE ESTO PARA CENTRAR HORIZONTALMENTE */
    align-items: center; /* Centra los hijos (los botones) horizontalmente */
    text-align: center; /* Centra los textos internos si los hay */
  }

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

  /* BOTÓN PRINCIPAL (Rojo Vino - Corto y Redondeado) */
  .btn-primary { 
    background-color: #5c0a1f !important; /* Rojo vino oscuro */
    color: white !important; 
    border-radius: 30px !important; /* Forma de píldora */
    padding: 8px 24px !important; /* Padding vertical y horizontal ajustado */
    font-weight: 700 !important;
    font-size: 0.85rem !important; /* Un poco más pequeña la letra */
    box-shadow: 0 2px 4px rgba(92, 10, 31, 0.3) !important;
    border: none;
    transition: all 0.2s ease;
    
    /* ESTO ES LO NUEVO PARA ACORTARLO */
    width: auto !important; /* Deja de ocupar todo el ancho */
    margin: 0 auto; /* Lo centra horizontalmente */
    display: inline-flex; /* Permite que el ancho sea según el contenido */
  }

  .btn-primary:hover { 
    background-color: #3a0411 !important; /* Rojo casi negro al pasar el ratón */
    transform: translateY(-2px) !important; 
    box-shadow: 0 6px 12px rgba(92, 10, 31, 0.4) !important;
  }
  .btn-primary:active {
    transform: scale(0.97) !important;
  }
  
  /* BOTÓN SECUNDARIO (Esquema - Corto y Redondeado) */
  /* BOTÓN SECUNDARIO: Ver Todo el Historial (Más resaltado pero elegante) */
  .btn-outline { 
    background-color: #f1f5f9; /* Un fondo gris azulado muy tenue */
    color: #1e3a8a; /* Azul marino oscuro para el texto */
    border: 1px solid #cbd5e1; /* Borde sutil */
    border-radius: 30px; /* Forma de píldora moderna */
    padding: 8px 24px; /* Padding vertical y horizontal ajustado */
    font-size: 0.85rem;
    font-weight: 700; /* Texto en negrita para que se lea mejor */
    transition: all 0.2s ease;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05); /* Sombra muy suave */

    /* Mantenemos el centrado y ancho corto */
    width: auto; 
    margin: 0 auto; 
    display: inline-flex; 
  }

  .btn-outline:hover { 
    background-color: #e2e8f0; /* Un gris un poco más oscuro al pasar el ratón */
    color: #1e40af; /* Azul un poquito más brillante en hover */
    border-color: #1e3a8a; 
    transform: translateY(-1px);
    box-shadow: 0 4px 6px rgba(30, 64, 175, 0.1);
  }

  .btn-outline:active {
    transform: scale(0.97); /* Efecto orgánico al presionar */
  }

  .form-container { max-width: 1200px; margin: 0 auto; background: transparent; }
  .btn-text { 
    background: none; border: none; color: var(--primary); font-weight: 700; 
    cursor: pointer; display: flex; align-items: center; gap: 6px; margin-bottom: 20px; 
  }
  .btn-text:hover { color: #be123c; text-decoration: underline; }
  
  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

  /* =============================================
     DISEÑO RESPONSIVO (Solo lo específico de esta vista)
     Nota: Paddings, cuadrículas y botones se heredan de app.css
     ============================================= */

  @media (max-width: 768px) {
    /* 1. Cabecera (Apilamos el botón de volver y el título) */
    .focus-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 15px;
    }

    /* 2. Pestañas (Las volvemos botones apilados) */
    .tabs-container {
      gap: 10px;
      margin-bottom: 20px;
      flex-direction: column;
      border-bottom: none;
    }
    
    .tab-btn {
      width: 100%;
      border-bottom: none;
      border-left: 3px solid transparent; /* El indicador pasa a la izquierda */
      justify-content: flex-start;
      padding: 12px 15px;
      background: var(--bg-panel);
      border-radius: var(--radius-md);
      margin-bottom: 5px;
    }
    
    .tab-btn.active {
      border-bottom: none;
      border-left: 3px solid var(--primary); /* Respeta tu variable global */
      background: var(--bg-app);
      box-shadow: var(--shadow-sm);
    }

    /* 3. Ajuste de la lista del historial para que no choque la flecha */
    .historial-item {
      flex-direction: column;
      align-items: flex-start;
      position: relative;
      padding-right: 40px; /* Dejamos un hueco a la derecha */
    }
    
    .btn-icon {
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%); /* Centramos la flecha verticalmente */
    }
  }


</style>