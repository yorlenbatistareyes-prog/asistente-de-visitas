<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { Plus, Upload, Edit, Trash2, Search, MapPin, Calendar, Clock, ExternalLink, User } from "lucide-svelte"; 
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

  let circuitoActual: Circuito | null = null;
  let lista: Congregacion[] = [];
  let mostrarModal = false;
  let datosEdicion: Congregacion | null = null;
  let busqueda = "";

  $: listaFiltrada = lista.filter(cong =>
    cong.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (cong.ciudad || "").toLowerCase().includes(busqueda.toLowerCase()) ||
    (cong.numero_congregacion || "").includes(busqueda)
  );

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
  $: if (idCircuito) cargarDatos();

  function abrirModal() {
    datosEdicion = null;
    mostrarModal = true;
  }

  function editarCongregacion(cong: Congregacion) {
    datosEdicion = { ...cong };
    mostrarModal = true;
  }

  async function borrar(id: number | undefined, nombre: string) {
    if (!id) return;
    const confirmacionOficial = await confirmDialog(
      `¿Seguro que deseas eliminar a la congregación "${nombre}"? Toda su información se perderá de forma permanente.`, 
      { title: 'Eliminar Congregación', kind: 'warning' }
    );

    if (!confirmacionOficial) return;

    try {
      await eliminarCongregacion(id);
      await cargarDatos();
    } catch (error) {
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
        numero_congregacion: nueva.numero_congregacion || "",
        ciudad: nueva.ciudad || "",
        provincia: nueva.provincia || "",
        pais: nueva.pais || "Cuba",
        telefono: nueva.telefono || "",
        direccion_salon: nueva.direccion_salon || "",
        enlace_mapa: nueva.enlace_mapa || "",
        diaSemana: nueva.diaSemana || "",
        horaSemana: nueva.horaSemana || "",
        diaFinSemana: nueva.diaFinSemana || "",
        horaFinSemana: nueva.horaFinSemana || "",
        idioma: "Español",
        esLenguaSenas: Boolean(nueva.esLenguaSenas)
      };

      if (nueva.id && String(nueva.id).trim() !== "") datosParaGuardar.id = Number(nueva.id);

      await guardarCongregacion(datosParaGuardar);
      mostrarModal = false;
      await cargarDatos(); 
    } catch (err) {
      alert("Ocurrió un error al guardar.");
    }
  }

  async function importarCSV() {
    if (!circuitoActual) return;
    try {
      const esAndroid = navigator.userAgent.toLowerCase().includes('android');
      const opcionesDialogo: any = { title: 'Seleccionar archivo CSV', multiple: false, directory: false };
      if (!esAndroid) opcionesDialogo.filters = [{ name: 'Documentos CSV', extensions: ['csv'] }];

      const seleccion = await openDialog(opcionesDialogo);
      if (!seleccion) return;

      const rutaOrigen = Array.isArray(seleccion) ? seleccion[0] : seleccion;
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
                numero_congregacion: fila["Número de congregación"] || "",
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
              console.error("Error guardando congregación:", err);
            }
          }
          await cargarDatos(); 
          alert(`✅ Importación completada: ${importadas} congregaciones añadidas.`);
        }
      });
    } catch (error) {
      alert("❌ Error al leer el archivo.");
    }
  }

  async function borrarTodo() {
    if (lista.length === 0) return;
    if (!circuitoActual) return;
    const confirmado = await confirmDialog(
      "⚠️ PELIGRO: ¿Estás seguro de que deseas eliminar TODAS las congregaciones de este circuito?",
      { title: 'Vaciar Congregaciones', kind: 'warning' }
    );
    if (!confirmado) return;
    try {
      await eliminarTodasLasCongregaciones(circuitoActual.nombre);
      await cargarDatos(); 
    } catch (error) {
      alert("Ocurrió un error al intentar vaciar el registro.");
    }
  }
</script>

<div class="congregaciones-layout">
  <div class="header-section">
    <div>
      <h3>Congregaciones</h3>
      <p>Añade y gestiona las congregaciones de tu circuito.</p>
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
    <input type="text" placeholder="Buscar por nombre, número o ciudad..." bind:value={busqueda} />
  </div>

  <!-- GRILLA DE TARJETAS -->
  <div class="grid-tarjetas">
    {#each listaFiltrada as cong (cong.id || cong.nombre)}
      <div class="tarjeta-congregacion card-global">
        
        <!-- CABECERA: Número de congregación y botones -->
        <div class="tarjeta-header">
          <div class="numero-badge">
            {cong.numero_congregacion || 'S/N'}
          </div>
          <div class="action-buttons">
            <button type="button" class="btn-icon-edit action-btn" on:click={() => editarCongregacion(cong)}><Edit size={16} /></button>
            <button type="button" class="btn-icon-delete action-btn" on:click={() => borrar(cong.id, cong.nombre)}><Trash2 size={16} /></button>
          </div>
        </div>

        <!-- CUERPO: Título (Sin la etiqueta de ciudad repetida) -->
        <div class="tarjeta-body">
          <h4 class="nombre-congregacion">{cong.nombre}</h4>
          
          <div class="info-bloque">
            <Clock size={14} class="info-icon" />
            <div class="text-sm">
              <div>{cong.diaSemana || 'Miércoles'}, {cong.horaSemana || '--:--'}</div>
              <div>{cong.diaFinSemana || 'Domingo'}, {cong.horaFinSemana || '--:--'}</div>
            </div>
          </div>

          <div class="info-bloque direccion-bloque">
            <MapPin size={14} class="info-icon" style="margin-top: 3px;" />
            <div class="text-sm">
              <span class="etiqueta-gris">Lugar de reunión:</span><br>
              {#if cong.enlace_mapa}
                <a href={cong.enlace_mapa} target="_blank" class="enlace-mapa">{cong.direccion_salon || 'Abrir en Google Maps'} <ExternalLink size={12}/></a>
              {:else}
                <span>{cong.direccion_salon || 'Sin dirección registrada'}</span>
              {/if}
            </div>
          </div>

          <!-- DIRECTIVOS (Cálculo automático futuro) -->
          <div class="directivos-bloque">
            <div class="directivo-item">
              <span class="etiqueta-gris">Coordinador</span>
              <div class="directivo-nombre"><User size={12}/> Automático desde Personas</div>
            </div>
            <div class="directivo-item">
              <span class="etiqueta-gris">Secretario</span>
              <div class="directivo-nombre"><User size={12}/> Automático desde Personas</div>
            </div>
          </div>
        </div>

        <!-- PIE: Contadores (Cálculo automático futuro) -->
        <div class="tarjeta-footer">
          <div class="pill-badge pill-pub"><span>--</span> publicadores</div>
          <div class="pill-badge pill-anc"><span>--</span> ancianos</div>
          <div class="pill-badge pill-sm"><span>--</span> SM</div>
          <div class="pill-badge pill-pre"><span>--</span> precursores</div>
        </div>
        
      </div>
    {/each}
  </div>

  {#if listaFiltrada.length === 0}
    <div class="empty-state">
      <p>Aún no hay congregaciones o no hay resultados para tu búsqueda.</p>
    </div>
  {/if}
</div>

{#if mostrarModal}
  <NuevaCongregacionModal {datosEdicion} on:close={() => mostrarModal = false} on:save={handleGuardarCongregacion} />
{/if}

<style>
  .congregaciones-layout { animation: fadeIn 0.3s ease-out; }
  .header-section { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 30px; margin-top: 10px; }
  .header-section h3 { margin: 0 0 5px 0; font-size: 1.5rem; color: var(--text-main); font-weight: 800; }
  .header-section p { margin: 0; color: var(--text-muted); font-size: 0.9rem; }
  .toolbar-botones { display: flex; gap: 10px; }

  .btn-primary { background-color: #5c0a1f !important; color: white !important; border: none; height: 38px; padding: 0 24px; border-radius: 30px; display: flex; align-items: center; gap: 8px; cursor: pointer; font-weight: 700; font-size: 0.85rem; transition: all 0.2s ease; box-shadow: 0 2px 4px rgba(92, 10, 31, 0.2); }
  .btn-primary:hover { background-color: #3a0411 !important; transform: translateY(-1px); box-shadow: 0 4px 8px rgba(92, 10, 31, 0.3); }
  .btn-importar { background-color: #14532d; color: white; border: none; height: 38px; padding: 0 24px; border-radius: 30px; display: flex; align-items: center; gap: 8px; cursor: pointer; font-weight: 700; font-size: 0.85rem; transition: all 0.2s ease; box-shadow: 0 2px 4px rgba(20, 83, 45, 0.2); }
  .btn-importar:hover { background-color: #052e16; transform: translateY(-1px); box-shadow: 0 4px 8px rgba(20, 83, 45, 0.3); }
  .btn-danger-fino { background-color: transparent; color: #ef4444; border: 1px solid #ef4444; height: 38px; padding: 0 16px; border-radius: 30px; display: flex; align-items: center; gap: 8px; cursor: pointer; font-weight: 700; font-size: 0.85rem; transition: all 0.2s ease; }
  .btn-danger-fino:hover { background-color: #ef4444; color: white; box-shadow: 0 4px 8px rgba(239, 68, 68, 0.3); }

  .search-bar { display: flex; align-items: center; gap: 10px; background: var(--bg-panel); border: 1px solid var(--border-color); border-radius: 12px; padding: 0 16px; height: 44px; margin-bottom: 24px; color: var(--text-muted); }
  .search-bar input { border: none; background: transparent; outline: none; font-size: 0.9rem; color: var(--text-main); width: 100%; }

  /* TARJETAS HÍBRIDAS */
  .grid-tarjetas { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 20px; margin-bottom: 30px; }
  
  .tarjeta-congregacion { background: var(--bg-panel); border: 1px solid var(--border-color); border-radius: 14px; padding: 18px; display: flex; flex-direction: column; transition: all 0.2s ease; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
  .tarjeta-congregacion:hover { transform: translateY(-3px); box-shadow: 0 8px 16px rgba(0,0,0,0.06); border-color: rgba(92, 10, 31, 0.2); }

  .tarjeta-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
  .numero-badge { background: #f1ebd5; color: #785a28; padding: 4px 10px; border-radius: 8px; font-weight: 800; font-size: 0.85rem; letter-spacing: 0.5px; border: 1px solid #e2d7ba; }
  
  .action-buttons { display: flex; gap: 5px; }
  .action-btn { background: transparent; border: none; cursor: pointer; opacity: 0.5; transition: all 0.2s; padding: 4px; border-radius: 6px; }
  .btn-icon-edit { color: var(--primary); }
  .btn-icon-delete { color: #ef4444; }
  .action-btn:hover { opacity: 1; background-color: var(--bg-subtle, #f1f5f9); }

  .tarjeta-body { display: flex; flex-direction: column; gap: 10px; flex-grow: 1; }
  
  /* Reduje el margen inferior del título ya que eliminamos el badge */
  .nombre-congregacion { margin: 0 0 5px 0; font-size: 1.15rem; font-weight: 800; color: var(--text-main); line-height: 1.2; text-transform: uppercase; }

  .info-bloque { display: flex; align-items: flex-start; gap: 8px; color: var(--text-main); }
  .info-icon { color: var(--text-muted); opacity: 0.7; flex-shrink: 0; }
  .text-sm { font-size: 0.85rem; line-height: 1.4; }
  .etiqueta-gris { color: var(--text-muted); font-size: 0.75rem; font-weight: 600; text-transform: uppercase; }
  
  .direccion-bloque { margin-top: 5px; padding-top: 10px; border-top: 1px dashed var(--border-color); }
  .enlace-mapa { color: #2563eb; text-decoration: none; display: flex; align-items: center; gap: 4px; font-weight: 500; }
  .enlace-mapa:hover { text-decoration: underline; }

  .directivos-bloque { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; background: var(--bg-app); padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); }
  .directivo-item { display: flex; flex-direction: column; gap: 2px; }
  .directivo-nombre { font-size: 0.8rem; font-weight: 500; display: flex; align-items: center; gap: 4px; font-style: italic; color: var(--text-muted); }

  .tarjeta-footer { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--border-color); }
  .pill-badge { display: flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; }
  .pill-badge span { font-weight: 800; font-size: 0.85rem; }
  
  .pill-pub { background: #e0f2fe; color: #0369a1; }
  .pill-anc { background: #f3f4f6; color: #4b5563; }
  .pill-sm  { background: #f3f4f6; color: #4b5563; }
  .pill-pre { background: #f0fdf4; color: #166534; }

  .empty-state { padding: 40px; text-align: center; color: var(--text-muted); }

  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

  @media (max-width: 768px) {
    .header-section { flex-direction: column; align-items: flex-start; gap: 15px; }
    .toolbar-botones { width: 100%; display: flex; flex-wrap: wrap; gap: 10px; }
    .toolbar-botones .btn-primary, .toolbar-botones .btn-importar { flex: 1 1 45%; justify-content: center; }
    .toolbar-botones .btn-danger-fino { flex: 1 1 100%; justify-content: center; }
    .grid-tarjetas { grid-template-columns: 1fr; }
  }
</style>