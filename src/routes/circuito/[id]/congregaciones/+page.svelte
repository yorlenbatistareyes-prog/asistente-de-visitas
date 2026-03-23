<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { Plus, Users, MapPin, Calendar, Upload, Edit, Trash2, Search } from "lucide-svelte"; 
  import Papa from 'papaparse'; 
  
  import { save as saveDialog, open as openDialog, confirm as confirmDialog, message as messageDialog } from '@tauri-apps/plugin-dialog';

  import { fechaPorCongregacion } from '$lib/stores/appStore'; 
  import NuevaCongregacionModal from "$lib/components/modals/NuevaCongregacionModal.svelte";
  
  import { 
    obtenerCircuitoPorId, 
    obtenerCongregaciones, 
    guardarCongregacion,
    eliminarCongregacion,
    eliminarTodasLasCongregaciones,
    initDB,
    type Circuito,
    type Congregacion 
  } from '$lib/services/db'; 

  $: idCircuito = Number($page.params.id);

  // --- ESTADO LOCAL ---
  let circuitoActual: Circuito | null = null;
  let lista: Congregacion[] = [];
  let mostrarModal = false;
  let datosEdicion: Congregacion | null = null;
  let busqueda = "";

  // --- FILTRADO REACTIVO ---
  $: listaFiltrada = lista.filter(cong =>
    cong.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (cong.ciudad || "").toLowerCase().includes(busqueda.toLowerCase())
  );

  // --- CARGA DE DATOS Y FECHAS (SQLITE) ---
  async function cargarDatos() {
    circuitoActual = await obtenerCircuitoPorId(idCircuito);
    
    if (circuitoActual) {
      const resultados = await obtenerCongregaciones(circuitoActual.nombre);
      lista = [...resultados];

      try {
        const db = await initDB();
        let fechasActualizadas: Record<string, string> = {};
        
        for (const cong of lista) {
          if (cong.id) {
            const res = await db.select<{fecha: string}[]>(
              'SELECT fecha FROM historial_visitas WHERE congregacion_id = $1 ORDER BY fecha DESC LIMIT 1',
              [cong.id]
            );
            if (res.length > 0) {
              fechasActualizadas[cong.nombre] = res[0].fecha;
            }
          }
        }
        fechaPorCongregacion.set(fechasActualizadas);
      } catch (e) {
        console.error("Error al cargar fechas del historial:", e);
      }
    }
  }

  onMount(cargarDatos);

  $: if (idCircuito) {
    cargarDatos();
  }

  // --- ACCIONES ---
  function abrirModal() {
    datosEdicion = null;
    mostrarModal = true;
  }

  function entrarACongregacion(nombre: string) {
    goto(`/congregacion/${nombre}`);
  }

  function editarCongregacion(cong: Congregacion) {
    datosEdicion = { ...cong };
    mostrarModal = true;
  }

  async function borrar(id: number | undefined, nombre: string) {
    if (!id) {
      alert(`Error: La congregación "${nombre}" no tiene un ID válido.`);
      return;
    }

    // 🌟 Usamos el diálogo NATIVO de Tauri (Asíncrono), no el del navegador (Síncrono)
    const confirmacionOficial = await confirmDialog(
      `¿Seguro que deseas eliminar a la congregación "${nombre}"? Toda su información se perderá de forma permanente.`, 
      { title: 'Eliminar Congregación', kind: 'warning' }
    );

    // Si el usuario pulsa 'Cancelar', la variable es false y salimos sin hacer nada
    if (!confirmacionOficial) {
      console.log("Borrado cancelado por el usuario.");
      return;
    }

    console.log("Ejecutando eliminación...");
    try {
      await eliminarCongregacion(id);
      await cargarDatos();
      console.log(`✅ ${nombre} eliminada correctamente.`);
    } catch (error) {
      console.error("Error crítico al eliminar:", error);
      alert("❌ Ocurrió un error en la base de datos al intentar eliminar la congregación.");
    }
  }

  async function handleGuardarCongregacion(e: CustomEvent) {
    try {
      const nueva = e.detail;
      if (!circuitoActual) return;

      // EL CLON EXACTO DEL CSV: Mismos campos, mismo orden, sin horarios.
      let datosParaGuardar: any = {
        circuito: circuitoActual.nombre,
        nombre: nueva.nombre.trim().toUpperCase(),
        enVisita: Boolean(nueva.enVisita), // Forzamos a que sea un booleano estricto
        ciudad: nueva.ciudad || "",
        provincia: nueva.provincia || "",
        pais: nueva.pais || "",
        telefono: nueva.telefono || "",
        idioma: "Español",
        esLenguaSenas: Boolean(nueva.esLenguaSenas) // Forzamos booleano estricto
      };

      // Agregamos el ID solo si es una edición
      if (nueva.id && String(nueva.id).trim() !== "") {
        datosParaGuardar.id = Number(nueva.id);
      }

      await guardarCongregacion(datosParaGuardar);
      
      mostrarModal = false;
      await cargarDatos(); 
      alert("✅ Congregación manual guardada correctamente.");
    } catch (err) {
      console.error("Error guardando la congregación manualmente:", err);
      alert("Ocurrió un error al guardar.");
    }
  }

  async function importarCSV(e: any) {
    if (!circuitoActual) {
      alert("Error: No se ha cargado el circuito actual.");
      return;
    }

    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const datosCSV = results.data as Record<string, string>[];
        let importadas = 0;

        for (const fila of datosCSV) {
          if (!fila["Congregación"]) continue;

          try {
            await guardarCongregacion({
              circuito: circuitoActual!.nombre, 
              nombre: fila["Congregación"],
              enVisita: false,
              ciudad: fila["Ciudad (Correspondencia)"] || "",
              provincia: fila["Estado o provincia (Correspondencia)"] || "",
              pais: fila["País (Correspondencia)"] || "",
              telefono: fila["Teléfono (Teléfono 1)"] || "",
              idioma: "Español",
              esLenguaSenas: false
            });
            importadas++;
          } catch (err) {
            console.error("Error guardando congregación:", fila["Congregación"], err);
          }
        }
        
        await cargarDatos(); 
        alert(`✅ Importación completada: ${importadas} congregaciones añadidas.`);
        e.target.value = ""; 
      }
    });
  }

  async function borrarTodo() {
    if (lista.length === 0) {
      await messageDialog("No hay congregaciones para eliminar en este circuito.", { title: 'Información', kind: 'info' });
      return;
    }

    if (!circuitoActual) return;

    // Diálogo nativo
    const confirmado = await confirmDialog(
      "⚠️ PELIGRO: ¿Estás seguro de que deseas eliminar TODAS las congregaciones de este circuito?\n\n¡Esta acción borrará también todo el historial de visitas asociado a ellas de forma permanente!",
      { title: 'Vaciar Congregaciones', kind: 'warning' }
    );

    if (!confirmado) return;

    try {
      await eliminarTodasLasCongregaciones(circuitoActual.nombre);
      await cargarDatos(); // Refrescamos la lista para que quede en blanco
      console.log("✅ Todas las congregaciones han sido eliminadas.");
    } catch (error) {
      console.error("Error al vaciar las congregaciones:", error);
      await messageDialog("Ocurrió un error al intentar vaciar el registro.", { title: 'Error', kind: 'error' });
    }
  }
</script>

<div class="congregaciones-layout">
  <div class="header-section">
    <div>
      <h3>Congregaciones</h3>
      <p>Añade y selecciona una congregación para gestionar sus informes.</p>
    </div>
    
    <div class="toolbar-botones" style="display: flex; gap: 10px;">

      <label class="btn-importar">
         <Upload size={18} /> <span>Importar CSV</span>
         <input type="file" accept=".csv" on:change={importarCSV} hidden />
      </label>

      <button class="btn-global btn-primary" on:click={abrirModal}>
        <Plus size={18} /> Añadir Congregación
      </button>

      <button class="btn-danger-fino" on:click={borrarTodo} title="Limpiar todas las congregaciones">
        <Trash2 size={18} /> <span class="texto-btn-danger">Limpiar</span>
      </button>
    </div>
  </div>

  <div class="search-bar">
    <Search size={16} />
    <input
      type="text"
      placeholder="Buscar congregación o ciudad..."
      bind:value={busqueda}
    />
  </div>

  <div class="grid-congregaciones">
    {#each listaFiltrada as cong (cong.id || cong.nombre)}
      
      <div 
        class="card-global cong-card" 
        role="button" 
        tabindex="0"
        on:click={(e) => {
          if ((e.target as HTMLElement)?.closest('button')) return; // Si tocaste un botón, cancela la entrada a la congregación
          entrarACongregacion(cong.nombre);
        }}
        on:keydown={(e) => {
          if ((e.target as HTMLElement)?.closest('button')) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault(); // Evita que la página salte si presionan la barra espaciadora
            entrarACongregacion(cong.nombre);
          }
        }}
      >
        
        <div class="card-icon">
          <Users size={30} />
        </div>
        <div class="card-info">
          <h4>{cong.nombre}</h4>
          
          <div class="meta-row">
            <MapPin size={12} /> 
            <span>{cong.ciudad || 'Ciudad no especificada'}</span>
          </div>
          
          <div class="meta-row">
            <Calendar size={12} /> 
            <span>Última visita: {$fechaPorCongregacion[cong.nombre] || "Sin registrar"}</span>
          </div>
        </div>

        <div class="card-actions">
          <button 
             type="button" 
             class="btn-icon-edit" 
             title="Editar" 
             on:click={(e) => { e.preventDefault(); e.stopPropagation(); editarCongregacion(cong); }}
          >
             <Edit size={18} />
          </button>
  
          <button 
             type="button" 
             class="btn-icon-delete" 
             title="Eliminar" 
             on:click={(e) => { e.preventDefault(); e.stopPropagation(); borrar(cong.id, cong.nombre); }}
          >
             <Trash2 size={18} />
          </button>
        </div>
      </div>
    {/each}

    {#if listaFiltrada.length === 0}
      <div class="card-global empty-state">
        <Users size={48} color="var(--text-muted)" />
        <p>
          {#if busqueda}
            No se encontraron resultados para "<strong>{busqueda}</strong>".
          {:else}
            Aún no hay congregaciones en este circuito.<br>Haz clic en "Añadir Congregación" o "Importar JW" para comenzar.
          {/if}
        </p>
      </div>
    {/if}
  </div>
</div>

{#if mostrarModal}
  <NuevaCongregacionModal 
    {datosEdicion}
    on:close={() => { mostrarModal = false; }}
    on:save={handleGuardarCongregacion}
  />
{/if}

<style>
  .congregaciones-layout {
    animation: fadeIn 0.3s ease-out;
  }

  .header-section {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 30px;
    margin-top: 10px;
  }

  .header-section h3 { margin: 0 0 5px 0; font-size: 1.5rem; color: var(--text-main); font-weight: 800; }
  .header-section p { margin: 0; color: var(--text-muted); font-size: 0.9rem; }

  .btn-primary {
    background-color: #5c0a1f !important; /* Rojo vino intenso */
    color: white !important;
    border: none;
    height: 38px; /* Más fino */
    padding: 0 24px; /* Más ancho para compensar la altura */
    border-radius: 30px; /* Forma de píldora */
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-weight: 700;
    font-size: 0.85rem;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px rgba(92, 10, 31, 0.2);
  }

  .btn-primary:hover { 
    background-color: #3a0411 !important; 
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(92, 10, 31, 0.3);
  }

  /* BARRA DE BÚSQUEDA */
  .search-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    background: var(--bg-panel);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 0 16px;
    height: 44px;
    margin-bottom: 24px;
    color: var(--text-muted);
    max-width: 1200px;
  }

  .search-bar input {
    border: none;
    background: transparent;
    outline: none;
    font-size: 0.9rem;
    color: var(--text-main);
    width: 100%;
  }

  .search-bar input::placeholder {
    color: var(--text-muted);
  }

  .grid-congregaciones {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
  }

  .cong-card {
    display: flex;
    align-items: center;
    gap: 15px;
    padding: 20px;
    text-align: left;
    cursor: pointer;
    border: 1px solid var(--border-color);
    background: var(--bg-panel); 
    position: relative;
  }

  .cong-card:hover { border-color: var(--primary); }

  .card-icon {
    background: rgba(100, 116, 139, 0.1); 
    color: var(--text-muted);
    padding: 15px;
    border-radius: 12px;
    transition: all 0.2s;
  }

  .cong-card:hover .card-icon {
    background: rgba(225, 29, 72, 0.1);
    color: var(--primary);
  }

  .card-info { flex: 1; }
  .card-info h4 { margin: 0 0 10px 0; font-size: 1.15rem; color: var(--text-main); font-weight: 800; }

  .meta-row {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.8rem;
    color: var(--text-muted);
    margin-bottom: 5px;
  }

  .card-actions {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-left: auto;
    padding-left: 10px;
    border-left: 1px solid var(--border-color);
  }

  .btn-icon-edit, .btn-icon-delete {
    background: transparent;
    border: none;
    cursor: pointer;
    opacity: 0.4;
    transition: all 0.2s;
    padding: 2px;
  }

  .btn-icon-edit { color: var(--primary); }
  .btn-icon-delete { color: #ef4444; }

  .btn-icon-edit:hover, .btn-icon-delete:hover {
    opacity: 1;
    transform: scale(1.1);
  }

  .empty-state {
    grid-column: 1 / -1;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 60px;
    border-style: dashed;
    border-color: var(--border-color);
    color: var(--text-muted);
    background: transparent;
  }

  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

  .btn-importar {
    background-color: #14532d; /* Verde bosque profundo */
    color: white;
    border: none;
    height: 38px; /* Más fino, igual al rojo */
    padding: 0 24px;
    border-radius: 30px; /* Forma de píldora */
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-weight: 700;
    font-size: 0.85rem;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px rgba(20, 83, 45, 0.2);
  }

  .btn-importar:hover { 
    background-color: #052e16; /* Verde casi negro al pasar el ratón */
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(20, 83, 45, 0.3);
  }

  /* =============================================
     DISEÑO RESPONSIVO (Tablets y Móviles)
     ============================================= */

  /* Tablets (hasta 1024px) */
  @media (max-width: 1024px) {
    .grid-congregaciones {
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    }
  }

  /* Móviles (hasta 768px) */
  @media (max-width: 768px) {
    /* 1. Cabecera y Títulos */
    .header-section {
      flex-direction: column;
      align-items: flex-start;
      gap: 15px;
    }

    /* 2. Contenedor de botones: FORZAR LADO A LADO */
    .header-section > div:last-child {
      width: 100%;
      display: flex !important;
      flex-direction: row !important; /* Obliga a que estén en la misma línea */
      flex-wrap: nowrap !important; /* Prohibido saltar a la línea de abajo */
      gap: 10px !important; /* Separación entre ellos */
    }

    /* 🌟 EL TRUCO PARA IGUALAR LOS BOTONES (Ancho y Alto) 🌟 */
    /* 3. Botones: Mitad y mitad exactos */
    .header-section > div:last-child .btn-primary,
    .header-section > div:last-child .btn-importar {
      flex: 1 !important; /* Cada botón toma exactamente el 50% del espacio */
      width: 100% !important;
      height: 44px !important; /* Altura elegante y táctil */
      padding: 0 5px !important; /* Reducimos un poco el relleno lateral para que quepa el texto */
      font-size: 0.8rem !important; /* Letra un pelín más pequeña para pantallas estrechas */
      
      /* Centrado perfecto de icono y texto */
      display: flex !important;
      justify-content: center !important;
      align-items: center !important;
      
      /* Si la pantalla es ultra-pequeña, evita que el texto se rompa feo */
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
    }

    /* 3. Buscador anti-desbordamiento */
    .search-bar {
      width: 100%;
      box-sizing: border-box; /* Esto evita que se salga de la pantalla */
      height: 48px; /* Altura cómoda pero no exagerada */
      border-radius: 12px;
    }
    
    .search-bar input {
      font-size: 1rem;
    }

    /* 4. Cuadrícula a una sola columna */
    .grid-congregaciones {
      grid-template-columns: 1fr;
    }

    /* 5. Tarjetas de Congregación */
    .cong-card {
      padding: 15px; 
    }

    .card-info h4 {
      font-size: 1.1rem; 
    }

    /* 6. Iconos de acción (Editar y Eliminar) */
    .card-actions {
      gap: 15px; /* Los separamos un poco para no tocarlos por error */
    }

    .btn-icon-edit, .btn-icon-delete {
      padding: 8px; /* Área táctil más grande */
    }
  }

  /* Móviles muy pequeños (hasta 480px) */
  @media (max-width: 480px) {
    .header-section h3 {
      font-size: 1.4rem;
    }

    /* Achicamos un poco el icono de la izquierda para que el texto respire */
    .card-icon {
      padding: 10px;
    }
    
    .card-icon :global(svg) {
      width: 24px !important;
      height: 24px !important;
    }
  }

  /* Estilo del botón de Limpiar */
  .btn-danger-fino {
    background-color: transparent;
    color: #ef4444;
    border: 1px solid #ef4444;
    height: 38px;
    padding: 0 16px;
    border-radius: 30px;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-weight: 700;
    font-size: 0.85rem;
    transition: all 0.2s ease;
  }

  .btn-danger-fino:hover {
    background-color: #ef4444;
    color: white;
    box-shadow: 0 4px 8px rgba(239, 68, 68, 0.3);
  }

  /* --- AJUSTES PARA MÓVILES (Actualizamos tus reglas anteriores) --- */
  @media (max-width: 768px) {
    .header-section {
      flex-direction: column;
      align-items: flex-start;
      gap: 15px;
    }

    /* 1. Contenedor de botones: EL SECRETO ES FLEX-WRAP: WRAP */
    .header-section > div:last-child,
    .toolbar-botones {
      width: 100% !important;
      display: flex !important;
      flex-direction: row !important;
      flex-wrap: wrap !important; /* Esto permite que el botón rojo salte abajo */
      gap: 10px !important;
    }

    /* 2. Botones de Acción (Importar y Añadir) se quedan al 50% arriba */
    .toolbar-botones .btn-primary,
    .toolbar-botones .btn-importar {
      flex: 1 1 45% !important; /* 45% asegura que quepan los dos con el gap */
      height: 44px !important;
      padding: 0 5px !important;
      font-size: 0.8rem !important;
      display: flex !important;
      justify-content: center !important;
      align-items: center !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
    }

    /* 3. El botón Rojo (Limpiar) se va abajo a ocupar todo el ancho */
    .toolbar-botones .btn-danger-fino {
      flex: 1 1 100% !important; /* 100% lo obliga a estar solo en su línea */
      height: 44px !important;
      justify-content: center !important;
      margin-top: 5px;
    }
    
    .texto-btn-danger {
      display: inline !important;
    }
  }
</style>