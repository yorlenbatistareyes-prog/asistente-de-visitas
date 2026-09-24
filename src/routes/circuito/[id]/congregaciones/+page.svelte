<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { Plus, Upload, Edit, Trash2, Search, MapPin, Clock, ExternalLink, Phone, Mail } from "lucide-svelte"; 
  import Papa from 'papaparse'; 
  import { invoke } from '@tauri-apps/api/core';
  import { save as saveDialog, open as openDialog, confirm as confirmDialog, message as messageDialog } from '@tauri-apps/plugin-dialog';
  import { readFile } from '@tauri-apps/plugin-fs';
  import { fechaPorCongregacion } from '$lib/stores/appStore'; 
  import NuevaCongregacionModal from "$lib/components/modals/NuevaCongregacionModal.svelte";
  
  import { abrirWhatsApp, abrirCorreoJWPub } from '$lib/utils/contacto';

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

  // 🌟 AQUÍ GUARDAREMOS LOS CÁLCULOS AUTOMÁTICOS DE PERSONAS
  let estadisticas: Record<string, any> = {};

  $: listaFiltrada = lista.filter(cong =>
    cong.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (cong.ciudad || "").toLowerCase().includes(busqueda.toLowerCase()) ||
    (cong.numero_congregacion || "").includes(busqueda)
  );

  async function cargarDatos() {
  circuitoActual = await obtenerCircuitoPorId(idCircuito);

  if (circuitoActual && circuitoActual.id) {
    const resultados = await obtenerCongregaciones(circuitoActual.nombre);
    lista = [...resultados];

    // 🌟 LLAMADA AL CEREBRO DE RUST PARA LAS ESTADÍSTICAS Y DIRECTIVOS
    try {
      estadisticas = await invoke('obtener_estadisticas_congregaciones_rust', { 
        circuitoId: circuitoActual.id 
      });
    } catch (e) {
      console.error("Error cargando estadísticas de congregaciones:", e);
    }

    // Carga del historial de fechas (tu código anterior)...
    try {
      const db = await initDB();
      let fechasActualizadas: Record<string, string> = {};
      for (const cong of lista) {
        if (cong.id) {
          const res = await db.select<{fecha: string}[]>('SELECT fecha FROM historial_visitas WHERE congregacion_id = $1 ORDER BY fecha DESC LIMIT 1', [cong.id]);
          if (res.length > 0) fechasActualizadas[cong.nombre] = res[0].fecha;
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

  function abrirModal() { datosEdicion = null; mostrarModal = true; }
  function editarCongregacion(cong: Congregacion) { datosEdicion = { ...cong }; mostrarModal = true; }

  async function borrar(id: number | undefined, nombre: string) {
    if (!id) return;
    const confirmado = await confirmDialog(`¿Seguro que deseas eliminar a "${nombre}"?`, { title: 'Eliminar Congregación', kind: 'warning' });
    if (!confirmado) return;
    try { await eliminarCongregacion(id); await cargarDatos(); } 
    catch (error) { alert("❌ Error al eliminar la congregación."); }
  }

    async function handleGuardarCongregacion(e: CustomEvent) {
    try {
      const nueva = e.detail;
      if (!circuitoActual) return;
      let datosParaGuardar: any = {
        circuito: circuitoActual.nombre, nombre: nueva.nombre.trim().toUpperCase(),
        enVisita: Boolean(nueva.enVisita), numero_congregacion: nueva.numero_congregacion || "",
        ciudad: nueva.ciudad || "", provincia: nueva.provincia || "", pais: nueva.pais || "Cuba",
        telefono: nueva.telefono || "", direccion_salon: nueva.direccion_salon || "", enlace_mapa: nueva.enlace_mapa || "",
        diaSemana: nueva.diaSemana || "", horaSemana: nueva.horaSemana || "", diaFinSemana: nueva.diaFinSemana || "", horaFinSemana: nueva.horaFinSemana || "",
        idioma: "Español", esLenguaSenas: Boolean(nueva.esLenguaSenas),
        latitud: (nueva.latitud !== null && nueva.latitud !== undefined && nueva.latitud !== "") 
          ? parseFloat(nueva.latitud) 
          : null,
        longitud: (nueva.longitud !== null && nueva.longitud !== undefined && nueva.longitud !== "") 
          ? parseFloat(nueva.longitud) 
          : null,
        limite_geojson: nueva.limite_geojson || null,
        color_poligono: nueva.color_poligono || null
      };
      if (nueva.id && String(nueva.id).trim() !== "") datosParaGuardar.id = Number(nueva.id);
      await guardarCongregacion(datosParaGuardar);
      mostrarModal = false; await cargarDatos(); 
    } catch (err) { alert("Ocurrió un error al guardar."); }
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
        header: true, skipEmptyLines: true,
        complete: async (results) => {
          const datosCSV = results.data as Record<string, string>[];
          let importadas = 0;
          for (const fila of datosCSV) {
            if (!fila["Congregación"]) continue;
            try {
              await guardarCongregacion({
                circuito: circuitoActual!.nombre, nombre: fila["Congregación"], numero_congregacion: fila["Número de congregación"] || "",
                enVisita: false, ciudad: fila["Ciudad (Correspondencia)"] || "", provincia: fila["Estado o provincia (Correspondencia)"] || "",
                pais: fila["País (Correspondencia)"] || "", telefono: fila["Teléfono (Teléfono 1)"] || "", idioma: "Español", esLenguaSenas: false
              });
              importadas++;
            } catch (err) {}
          }
          await cargarDatos(); alert(`✅ Importación completada: ${importadas} congregaciones añadidas.`);
        }
      });
    } catch (error) { alert("❌ Error al leer el archivo."); }
  }

  async function borrarTodo() {
    if (lista.length === 0 || !circuitoActual) return;
    const confirmado = await confirmDialog("⚠️ PELIGRO: ¿Eliminar TODAS las congregaciones?", { title: 'Vaciar Congregaciones', kind: 'warning' });
    if (!confirmado) return;
    try { await eliminarTodasLasCongregaciones(circuitoActual.nombre); await cargarDatos(); } 
    catch (error) { alert("Ocurrió un error."); }
  }
</script>

<div class="congregaciones-layout">
  <div class="header-section">
    <div>
      <h3>Congregaciones</h3>
      <p>Añade y gestiona las congregaciones de tu circuito.</p>
    </div>
    <div class="toolbar-botones">
      <button class="btn-importar" on:click={importarCSV}><Upload size={18} /> <span>Importar CSV</span></button>
      <button class="btn-global btn-primary" on:click={abrirModal}><Plus size={18} /> Añadir Congregación</button>
      <button class="btn-danger-fino" on:click={borrarTodo} title="Limpiar"><Trash2 size={18} /> <span class="texto-btn-danger">Limpiar</span></button>
    </div>
  </div>

  <div class="search-bar">
    <Search size={16} />
    <input type="text" placeholder="Buscar por nombre, número o ciudad..." bind:value={busqueda} />
  </div>

  <div class="grid-tarjetas">
    {#each listaFiltrada as cong (cong.id || cong.nombre)}
      <div class="tarjeta-congregacion card-global">
        
        <div class="tarjeta-header">
          <div class="numero-badge">{cong.numero_congregacion || 'S/N'}</div>
          <div class="action-buttons">
            <button type="button" class="btn-icon-edit action-btn" on:click={() => editarCongregacion(cong)}><Edit size={16} /></button>
            <button type="button" class="btn-icon-delete action-btn" on:click={() => borrar(cong.id, cong.nombre)}><Trash2 size={16} /></button>
          </div>
        </div>

        <div class="tarjeta-body">
          <h4 class="nombre-congregacion">{cong.nombre}</h4>
          
          <div class="info-bloque">
            <Clock size={14} class="info-icon" />
            <div class="text-sm">
            <span class="etiqueta-gris" style="text-transform: none;">Reuniones:</span>
              <div>{cong.diaSemana || 'Miércoles'}, {cong.horaSemana || '--:--'}</div>
              <div>{cong.diaFinSemana || 'Domingo'}, {cong.horaFinSemana || '--:--'}</div>
            </div>
          </div>

          <div class="info-bloque direccion-bloque">
            <MapPin size={14} class="info-icon" style="margin-top: 3px;" />
            <div class="text-sm">
              <span class="etiqueta-gris" style="text-transform: none;">Lugar de reunión:</span><br>
              {#if cong.enlace_mapa}
                <a href={cong.enlace_mapa} target="_blank" class="enlace-mapa">{cong.direccion_salon || 'Abrir en Google Maps'} <ExternalLink size={12}/></a>
              {:else}
                <span>{cong.direccion_salon || 'Sin dirección registrada'}</span>
              {/if}
            </div>
          </div>

          <!-- DIRECTIVOS (Preparados para las estadísticas automáticas) -->
          <div class="directivos-grid">
            <div class="dir-card">
              <span class="dir-rol">Coordinador</span>
              <span class="dir-nombre">{estadisticas[cong.nombre]?.cca?.nombre || 'No asignado'}</span>
              <span class="dir-contacto clickable-contact" role="button" tabindex="0" on:click={() => abrirWhatsApp(estadisticas[cong.nombre]?.cca?.tel, "Hola hermano...")} on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && abrirWhatsApp(estadisticas[cong.nombre]?.cca?.tel, "Hola hermano...")}><Phone size={10}/> {estadisticas[cong.nombre]?.cca?.tel || '--'}</span>
              <span class="dir-contacto clickable-contact" role="button" tabindex="0" on:click={() => abrirCorreoJWPub(estadisticas[cong.nombre]?.cca?.email, "Asunto", "Mensaje...")} on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && abrirCorreoJWPub(estadisticas[cong.nombre]?.cca?.email, "Asunto", "Mensaje...")}><Mail size={10}/> {estadisticas[cong.nombre]?.cca?.email || '--'}</span>
            </div>
            <div class="dir-card">
              <span class="dir-rol">Secretario</span>
              <span class="dir-nombre">{estadisticas[cong.nombre]?.sec?.nombre || 'No asignado'}</span>
              <span class="dir-contacto clickable-contact" role="button" tabindex="0" on:click={() => abrirWhatsApp(estadisticas[cong.nombre]?.sec?.tel, "Hola hermano...")} on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && abrirWhatsApp(estadisticas[cong.nombre]?.sec?.tel, "Hola hermano...")}><Phone size={10}/> {estadisticas[cong.nombre]?.sec?.tel || '--'}</span>
              <span class="dir-contacto clickable-contact" role="button" tabindex="0" on:click={() => abrirCorreoJWPub(estadisticas[cong.nombre]?.sec?.email, "Asunto", "Mensaje...")} on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && abrirCorreoJWPub(estadisticas[cong.nombre]?.sec?.email, "Asunto", "Mensaje...")}><Mail size={10}/> {estadisticas[cong.nombre]?.sec?.email || '--'}</span>
            </div>
            <div class="dir-card">
              <span class="dir-rol">S. de Servicio</span>
              <span class="dir-nombre">{estadisticas[cong.nombre]?.ss?.nombre || 'No asignado'}</span>
              <span class="dir-contacto clickable-contact" role="button" tabindex="0" on:click={() => abrirWhatsApp(estadisticas[cong.nombre]?.ss?.tel, "Hola hermano...")} on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && abrirWhatsApp(estadisticas[cong.nombre]?.ss?.tel, "Hola hermano...")}><Phone size={10}/> {estadisticas[cong.nombre]?.ss?.tel || '--'}</span>
              <span class="dir-contacto clickable-contact" role="button" tabindex="0" on:click={() => abrirCorreoJWPub(estadisticas[cong.nombre]?.ss?.email, "Asunto", "Mensaje...")} on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && abrirCorreoJWPub(estadisticas[cong.nombre]?.ss?.email, "Asunto", "Mensaje...")}><Mail size={10}/> {estadisticas[cong.nombre]?.ss?.email || '--'}</span>
            </div>
          </div>
        </div>

        <!-- CONTADORES -->
        <div class="tarjeta-footer">
          <div class="pill-badge pill-pub"><span>{estadisticas[cong.nombre]?.publicadores || '--'}</span> publicadores</div>
          <div class="pill-badge pill-anc"><span>{estadisticas[cong.nombre]?.ancianos || '--'}</span> ancianos</div>
          <div class="pill-badge pill-sm"><span>{estadisticas[cong.nombre]?.sm || '--'}</span> SM</div>
          <div class="pill-badge pill-pre"><span>{estadisticas[cong.nombre]?.precursores || '--'}</span> precursores</div>
        </div>
        
      </div>
    {/each}
  </div>

  {#if listaFiltrada.length === 0}
    <div class="empty-state"><p>Aún no hay congregaciones o no hay resultados para tu búsqueda.</p></div>
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

  .btn-primary { background-color: #5c0a1f !important; color: white !important; border: none; height: 38px; padding: 0 24px; border-radius: 30px; display: flex; align-items: center; gap: 8px; cursor: pointer; font-weight: 700; font-size: 0.85rem; box-shadow: 0 2px 4px rgba(92, 10, 31, 0.2); }
  .btn-importar { background-color: #14532d; color: white; border: none; height: 38px; padding: 0 24px; border-radius: 30px; display: flex; align-items: center; gap: 8px; cursor: pointer; font-weight: 700; font-size: 0.85rem; box-shadow: 0 2px 4px rgba(20, 83, 45, 0.2); }
  .btn-danger-fino { background-color: transparent; color: #ef4444; border: 1px solid #ef4444; height: 38px; padding: 0 16px; border-radius: 30px; display: flex; align-items: center; gap: 8px; cursor: pointer; font-weight: 700; font-size: 0.85rem; }

  .search-bar { display: flex; align-items: center; gap: 10px; background: var(--bg-panel); border: 1px solid var(--border-color); border-radius: 12px; padding: 0 16px; height: 44px; margin-bottom: 24px; color: var(--text-muted); }
  .search-bar input { border: none; background: transparent; outline: none; font-size: 0.9rem; color: var(--text-main); width: 100%; }

  .grid-tarjetas { 
    display: grid; 
    grid-template-columns: repeat(auto-fill, minmax(480px, 1fr)); 
    gap: 20px; 
    margin-bottom: 30px; 
  }
  .tarjeta-congregacion { background: var(--bg-panel); border: 1px solid var(--border-color); border-radius: 14px; padding: 18px; display: flex; flex-direction: column; transition: all 0.2s ease; }
  .tarjeta-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
  .numero-badge { background: #f1ebd5; color: #785a28; padding: 4px 10px; border-radius: 8px; font-weight: 800; font-size: 0.85rem; border: 1px solid #e2d7ba; }
  
  .action-buttons { display: flex; gap: 5px; }
  .action-btn { background: transparent; border: none; cursor: pointer; opacity: 0.5; padding: 4px; border-radius: 6px; }
  .btn-icon-edit { color: var(--primary); }
  .btn-icon-delete { color: #ef4444; }

  .tarjeta-body { display: flex; flex-direction: column; gap: 10px; flex-grow: 1; }
  .nombre-congregacion { margin: 0 0 5px 0; font-size: 1.15rem; font-weight: 800; color: var(--text-main); line-height: 1.2; text-transform: uppercase; }

  .info-bloque { display: flex; align-items: flex-start; gap: 8px; color: var(--text-main); }
  .info-icon { color: var(--text-muted); opacity: 0.7; flex-shrink: 0; }
  .text-sm { font-size: 0.85rem; line-height: 1.4; }
  .etiqueta-gris { color: var(--text-muted); font-size: 0.75rem; font-weight: 600; text-transform: uppercase; }
  
  .direccion-bloque { margin-top: 5px; padding-top: 10px; border-top: 1px dashed var(--border-color); }
  .enlace-mapa { color: #2563eb; text-decoration: none; display: flex; align-items: center; gap: 4px; font-weight: 500; }

  /* DISEÑO DIRECTIVOS COMPACTO 3 COLUMNAS */
  .directivos-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 10px; margin-top: 15px; background: var(--bg-app); padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); }
  .dir-card { display: flex; flex-direction: column; gap: 2px; }
  .dir-rol { font-size: 0.7rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; }
  .dir-nombre { font-size: 0.85rem; font-weight: 600; color: var(--text-main); margin-bottom: 2px; line-height: 1.1; }
  .dir-contacto { font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; gap: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

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

  .clickable-contact {
    cursor: pointer;
    transition: color 0.15s ease;
  }
  .clickable-contact:hover {
    color: #2563eb; /* Azul elegante de enlaces */
    text-decoration: underline;
  }
</style>