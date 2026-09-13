<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { Plus, Users, Upload, Edit, Trash2, Search } from "lucide-svelte"; 
  import Papa from 'papaparse'; 
  
  import { save as saveDialog, open as openDialog, confirm as confirmDialog, message as messageDialog } from '@tauri-apps/plugin-dialog';
  import { readFile } from '@tauri-apps/plugin-fs';

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

    const confirmacionOficial = await confirmDialog(
      `¿Seguro que deseas eliminar a la congregación "${nombre}"? Toda su información se perderá de forma permanente.`, 
      { title: 'Eliminar Congregación', kind: 'warning' }
    );

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

      let datosParaGuardar: any = {
        circuito: circuitoActual.nombre,
        nombre: nueva.nombre.trim().toUpperCase(),
        enVisita: Boolean(nueva.enVisita),
        ciudad: nueva.ciudad || "",
        provincia: nueva.provincia || "",
        pais: nueva.pais || "",
        telefono: nueva.telefono || "",
        idioma: "Español",
        esLenguaSenas: Boolean(nueva.esLenguaSenas)
      };

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

  async function importarCSV() {
    if (!circuitoActual) {
      alert("Error: No se ha cargado el circuito actual.");
      return;
    }

    try {
      const esAndroid = navigator.userAgent.toLowerCase().includes('android');
      const opcionesDialogo: any = {
        title: 'Seleccionar archivo CSV',
        multiple: false,
        directory: false
      };

      if (!esAndroid) {
        opcionesDialogo.filters = [{ name: 'Documentos CSV', extensions: ['csv'] }];
      }

      const seleccion = await openDialog(opcionesDialogo);
      if (!seleccion) return;

      const rutaOrigen = Array.isArray(seleccion) ? seleccion[0] : seleccion;

      if (!esAndroid && !rutaOrigen.toLowerCase().endsWith('.csv')) {
        alert("❌ Formato incorrecto. Por favor selecciona un archivo .csv");
        return;
      }

      const csvBytes = await readFile(rutaOrigen as string);
      const textoCSV = new TextDecoder().decode(csvBytes);

      Papa.parse(textoCSV, {
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
        }
      });

    } catch (error) {
      console.error("Error al importar CSV:", error);
      alert("❌ Error al leer el archivo.");
    }
  }

  async function borrarTodo() {
    if (lista.length === 0) {
      await messageDialog("No hay congregaciones para eliminar en este circuito.", { title: 'Información', kind: 'info' });
      return;
    }

    if (!circuitoActual) return;

    const confirmado = await confirmDialog(
      "⚠️ PELIGRO: ¿Estás seguro de que deseas eliminar TODAS las congregaciones de este circuito?\n\n¡Esta acción borrará también todo el historial de visitas asociado a ellas de forma permanente!",
      { title: 'Vaciar Congregaciones', kind: 'warning' }
    );

    if (!confirmado) return;

    try {
      await eliminarTodasLasCongregaciones(circuitoActual.nombre);
      await cargarDatos(); 
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
    
    <div class="toolbar-botones">
      <button class="btn-importar" on:click={importarCSV}>
        <Upload size={18} /> <span>Importar CSV</span>
      </button>

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

  <div class="table-wrapper card-global">
    <table class="data-table">
      <thead>
        <tr>
          <th class="col-icon"></th>
          <th>Nombre ↑</th>
          <th>Ciudad</th>
          <th>Estado/Provincia</th>
          <th>Última Visita</th>
          <th class="text-center">Acciones</th>
        </tr>
      </thead>
      <tbody>
        {#each listaFiltrada as cong (cong.id || cong.nombre)}
          <tr 
            class="clickable-row"
            on:click={(e) => {
              if ((e.target as HTMLElement)?.closest('button')) return; 
              entrarACongregacion(cong.nombre);
            }}
          >
            <!-- Ícono Verde Oscuro tipo Referencia -->
            <td class="col-icon">
              <div class="icon-box">
                <Users size={18} strokeWidth={2.5} />
              </div>
            </td>
            
            <td class="font-bold">{cong.nombre}</td>
            <td>{cong.ciudad || '-'}</td>
            <td>{cong.provincia || '-'}</td>
            
            <td>
              <span class="badge-fecha {$fechaPorCongregacion[cong.nombre] ? 'has-date' : 'no-date'}">
                {$fechaPorCongregacion[cong.nombre] || "Sin registrar"}
              </span>
            </td>

            <!-- Acciones -->
            <td>
              <div class="action-buttons">
                <button 
                   type="button" 
                   class="btn-icon-edit action-btn" 
                   title="Editar" 
                   on:click={(e) => { e.preventDefault(); e.stopPropagation(); editarCongregacion(cong); }}
                >
                   <Edit size={16} />
                </button>
        
                <button 
                   type="button" 
                   class="btn-icon-delete action-btn" 
                   title="Eliminar" 
                   on:click={(e) => { e.preventDefault(); e.stopPropagation(); borrar(cong.id, cong.nombre); }}
                >
                   <Trash2 size={16} />
                </button>
              </div>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>

    <!-- Estado vacío -->
    {#if listaFiltrada.length === 0}
      <div class="empty-state">
        <Users size={40} color="var(--text-muted)" style="margin-bottom: 15px; opacity: 0.5;" />
        <p>
          {#if busqueda}
            No se encontraron resultados para "<strong>{busqueda}</strong>".
          {:else}
            Aún no hay congregaciones en este circuito.<br>Haz clic en "Añadir Congregación" o "Importar CSV" para comenzar.
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

  .toolbar-botones {
    display: flex; gap: 10px;
  }

  .btn-primary { background-color: #5c0a1f !important; color: white !important; border: none; height: 38px; padding: 0 24px; border-radius: 30px; display: flex; align-items: center; gap: 8px; cursor: pointer; font-weight: 700; font-size: 0.85rem; transition: all 0.2s ease; box-shadow: 0 2px 4px rgba(92, 10, 31, 0.2); }
  .btn-primary:hover { background-color: #3a0411 !important; transform: translateY(-1px); box-shadow: 0 4px 8px rgba(92, 10, 31, 0.3); }
  
  .btn-importar { background-color: #14532d; color: white; border: none; height: 38px; padding: 0 24px; border-radius: 30px; display: flex; align-items: center; gap: 8px; cursor: pointer; font-weight: 700; font-size: 0.85rem; transition: all 0.2s ease; box-shadow: 0 2px 4px rgba(20, 83, 45, 0.2); }
  .btn-importar:hover { background-color: #052e16; transform: translateY(-1px); box-shadow: 0 4px 8px rgba(20, 83, 45, 0.3); }
  
  .btn-danger-fino { background-color: transparent; color: #ef4444; border: 1px solid #ef4444; height: 38px; padding: 0 16px; border-radius: 30px; display: flex; align-items: center; gap: 8px; cursor: pointer; font-weight: 700; font-size: 0.85rem; transition: all 0.2s ease; }
  .btn-danger-fino:hover { background-color: #ef4444; color: white; box-shadow: 0 4px 8px rgba(239, 68, 68, 0.3); }

  /* BARRA DE BÚSQUEDA */
  .search-bar { display: flex; align-items: center; gap: 10px; background: var(--bg-panel); border: 1px solid var(--border-color); border-radius: 12px; padding: 0 16px; height: 44px; margin-bottom: 24px; color: var(--text-muted); max-width: 1200px; }
  .search-bar input { border: none; background: transparent; outline: none; font-size: 0.9rem; color: var(--text-main); width: 100%; }
  .search-bar input::placeholder { color: var(--text-muted); }

  /* =========================================
     TABLA ESTILO DATA-GRID
     ========================================= */
  .table-wrapper {
    overflow-x: auto;
    padding: 0;
    border-radius: 10px;
    background: var(--bg-panel);
    border: 1px solid var(--border-color);
  }

  .data-table {
    width: 100%;
    border-collapse: collapse;
    white-space: nowrap;
    text-align: left;
    font-size: 0.85rem;
  }

  .data-table thead tr {
    background-color: var(--bg-subtle, #f8fafc);
    border-bottom: 2px solid var(--border-color);
  }

  .data-table th {
    padding: 12px 16px;
    font-weight: 700;
    color: var(--text-muted);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .data-table td {
    padding: 10px 16px;
    border-bottom: 1px solid var(--border-color);
    color: var(--text-main);
    vertical-align: middle;
  }

  .clickable-row { cursor: pointer; transition: background-color 0.2s ease; }
  .clickable-row:hover { background-color: rgba(92, 10, 31, 0.03); }

  .col-icon { width: 40px; padding-right: 0 !important; }
  
  .icon-box {
    width: 32px; height: 32px; background-color: #1b4d3e; color: white;
    border-radius: 6px; display: flex; justify-content: center; align-items: center;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }

  .font-bold { font-weight: 700; font-size: 0.9rem; }
  .badge-fecha { font-size: 0.8rem; font-weight: 600; }
  .badge-fecha.no-date { color: var(--text-muted); font-style: italic; }
  .text-center { text-align: center; }

  .action-buttons { display: flex; justify-content: center; gap: 12px; }
  .action-btn { background: transparent; border: none; cursor: pointer; opacity: 0.5; transition: all 0.2s; padding: 4px; border-radius: 6px; display: flex; align-items: center; justify-content: center; }
  .btn-icon-edit { color: var(--primary); }
  .btn-icon-delete { color: #ef4444; }
  .action-btn:hover { opacity: 1; transform: scale(1.1); background-color: var(--bg-subtle, #f1f5f9); }

  .empty-state { padding: 60px 20px; text-align: center; color: var(--text-muted); font-size: 0.95rem; }

  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

  /* =============================================
     DISEÑO RESPONSIVO (Tablets y Móviles)
     ============================================= */
  @media (max-width: 768px) {
    .header-section {
      flex-direction: column;
      align-items: flex-start;
      gap: 15px;
    }

    /* 1. Contenedor de botones: EL SECRETO ES FLEX-WRAP: WRAP */
    .toolbar-botones {
      width: 100% !important;
      display: flex !important;
      flex-direction: row !important;
      flex-wrap: wrap !important;
      gap: 10px !important;
    }

    /* 2. Botones de Acción (Importar y Añadir) se quedan al 50% arriba */
    .toolbar-botones .btn-primary,
    .toolbar-botones .btn-importar {
      flex: 1 1 45% !important;
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
      flex: 1 1 100% !important;
      height: 44px !important;
      justify-content: center !important;
      margin-top: 5px;
    }
    
    .texto-btn-danger { display: inline !important; }
    
    .search-bar {
      width: 100%;
      box-sizing: border-box;
      height: 48px;
      border-radius: 12px;
    }
    
    .search-bar input { font-size: 1rem; }
  }

  @media (max-width: 480px) {
    .header-section h3 { font-size: 1.4rem; }
  }
</style>