<script lang="ts">
  import { onMount } from 'svelte';
  import { 
    Briefcase, Utensils, Users, User, BookOpen, Pencil, 
    FileUp, Plus, Trash2, Clock, Phone, MapPin, X 
  } from 'lucide-svelte';
  
  // Importamos las funciones y tipos de nuestro db.ts
  import { 
    obtenerPredicacion, guardarPredicacion,
    obtenerHospitalidad, guardarHospitalidad,
    obtenerPastoreo, guardarPastoreo,
    obtenerAgenda, guardarAgenda,
    eliminarRegistroPrograma,
    initDB,
    type Predicacion, type Hospitalidad, type Pastoreo, type Agenda 
  } from '$lib/services/db';

  export let idVisita: number;

  let subPestana: 'predicacion' | 'hospitalidad' | 'pastoreo' | 'agenda' = 'predicacion';
  let procesandoPDF = false;
  let cargandoDatos = true;

  // ==========================================
  // ESTADO DE LOS DATOS
  // ==========================================
  let salidas: Predicacion[] = [];
  let comidas: Hospitalidad[] = [];
  let pastoreos: Pastoreo[] = [];
  let textoAgenda = '';
  
  // Lista de personas para el autocompletado (Datalist)
  let listaPersonas: string[] = [];

  // ==========================================
  // ESTADO DE LOS MODALES MANUALES
  // ==========================================
  let modalActivo: 'ninguno' | 'predicacion' | 'hospitalidad' | 'pastoreo' = 'ninguno';

  // Variables temporales para los formularios
  let formPredicacion: Partial<Predicacion> = { dia: 'Martes', hora: '09:00', acomp_esposo: '', acomp_esposa: '', tipo_arreglo: 'Predicar en grupo' };
  let formHospitalidad: Partial<Hospitalidad> = { dia: 'Martes', tipo_comida: 'Almuerzo', anfitrion: '', direccion: '', telefono: '' };
  let formPastoreo: Partial<Pastoreo> & { dia_temp?: string, hora_temp?: string } = { dia_temp: 'Jueves', hora_temp: '16:00', familia: '', direccion: '', telefono: '', anciano: '', notas: '' };

  const diasSemana = ['Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

 // ==========================================
  // CARGA DE DATOS
  // ==========================================
  async function cargarPrograma() {
    cargandoDatos = true;
    try {
      const db = await initDB();
      salidas = await obtenerPredicacion(idVisita);
      comidas = await obtenerHospitalidad(idVisita);
      pastoreos = await obtenerPastoreo(idVisita);
      
      const agendaDB = await obtenerAgenda(idVisita);
      textoAgenda = agendaDB?.puntos || '';

      // 🌟 NUEVO: Cargamos las personas filtradas correctamente
      try {
        // 1. Obtenemos la visita actual
        const visitas = await db.select<any[]>("SELECT * FROM visitas_programadas WHERE id = $1", [idVisita]);
        
        if (visitas.length > 0) {
          const congId = visitas[0].congregacion_id;

          // 2. Buscamos el nombre en texto de la congregación
          const congResult = await db.select<any[]>("SELECT nombre FROM congregaciones WHERE id = $1", [congId]);
          
          if (congResult.length > 0) {
            const nombreCong = congResult[0].nombre;

            // 3. Traemos a las personas cuyo campo 'congregacion' coincida con ese nombre
            const personasResult = await db.select<{nombre: string, apellidos: string}[]>(
              "SELECT nombre, apellidos FROM personas WHERE congregacion = $1 ORDER BY nombre ASC",
              [nombreCong]
            );

            // Si hay hermanos en esa congregación, llenamos la lista
            if (personasResult.length > 0) {
              listaPersonas = personasResult.map(p => p.apellidos ? `${p.nombre} ${p.apellidos}`.trim() : p.nombre);
            } else {
              // Salvavidas: si la congregación no tiene hermanos registrados, traemos a todos
              const todos = await db.select<{nombre: string, apellidos: string}[]>("SELECT nombre, apellidos FROM personas ORDER BY nombre ASC");
              listaPersonas = todos.map(p => p.apellidos ? `${p.nombre} ${p.apellidos}`.trim() : p.nombre);
            }
          }
        }
      } catch (errorDb) {
        console.warn("Error cargando lista de personas:", errorDb);
      }

    } catch (error) {
      console.error("Error cargando programa:", error);
    } finally {
      cargandoDatos = false;
    }
  }

  onMount(cargarPrograma);

  // ==========================================
  // CONVERSORES DE HORA
  // ==========================================
  function convertirA12Horas(hora24: string) {
    if (!hora24 || !hora24.includes(':')) return hora24;
    const [h, m] = hora24.split(':');
    let hora = parseInt(h, 10);
    const ampm = hora >= 12 ? 'pm' : 'am';
    hora = hora % 12;
    if (hora === 0) hora = 12;
    const horaStr = hora < 10 ? '0' + hora : hora.toString();
    return `${horaStr}:${m} ${ampm}`;
  }

  function revertirA24Horas(horaAmPm: string) {
    if (!horaAmPm) return '09:00';
    const match = horaAmPm.match(/(\d+):(\d+)\s*(am|pm)/i);
    if (match) {
      let h = parseInt(match[1]);
      let m = match[2];
      let ampm = match[3].toLowerCase();
      
      if (ampm === 'pm' && h < 12) h += 12;
      if (ampm === 'am' && h === 12) h = 0;
      
      return `${h.toString().padStart(2, '0')}:${m}`;
    }
    return horaAmPm;
  }

  // ==========================================
  // FUNCIONES PARA ABRIR MODALES DE EDICIÓN
  // ==========================================
  function editarPredicacion(salida: Predicacion) {
    formPredicacion = { ...salida, hora: revertirA24Horas(salida.hora) };
    modalActivo = 'predicacion';
  }

  function editarHospitalidad(comida: Hospitalidad) {
    formHospitalidad = { ...comida };
    modalActivo = 'hospitalidad';
  }

  function editarPastoreo(pastoreo: Pastoreo) {
    let dia = 'Jueves';
    let hora24 = '16:00';

    if (pastoreo.dia_hora && pastoreo.dia_hora.includes('•')) {
      const partes = pastoreo.dia_hora.split('•').map(s => s.trim());
      dia = partes[0];
      hora24 = revertirA24Horas(partes[1]);
    }

    formPastoreo = { ...pastoreo, dia_temp: dia, hora_temp: hora24 };
    modalActivo = 'pastoreo';
  }

  // ==========================================
  // FUNCIONES DE GUARDADO Y ELIMINADO
  // ==========================================
  async function guardarManualPredicacion() {
    try {
      let datosGuardar = { ...formPredicacion, visita_id: idVisita };
      if (datosGuardar.hora) {
        datosGuardar.hora = convertirA12Horas(datosGuardar.hora);
      }
      
      await guardarPredicacion(datosGuardar as Predicacion);
      modalActivo = 'ninguno';
      await cargarPrograma();
    } catch (error) {
      console.error("Error al guardar predicación:", error);
      alert("Error al guardar en base de datos: " + error);
    }
  }

  async function guardarManualHospitalidad() {
    try {
      await guardarHospitalidad({ ...formHospitalidad, visita_id: idVisita } as Hospitalidad);
      modalActivo = 'ninguno';
      await cargarPrograma();
    } catch (error) {
      console.error("Error al guardar hospitalidad:", error);
      alert("Error al guardar en base de datos: " + error);
    }
  }

  async function guardarManualPastoreo() {
    try {
      let datosGuardar = { ...formPastoreo, visita_id: idVisita };
      
      if (datosGuardar.dia_temp && datosGuardar.hora_temp) {
        const horaAmPm = convertirA12Horas(datosGuardar.hora_temp);
        datosGuardar.dia_hora = `${datosGuardar.dia_temp} • ${horaAmPm}`;
      }

      delete datosGuardar.dia_temp;
      delete datosGuardar.hora_temp;

      await guardarPastoreo(datosGuardar as Pastoreo);
      modalActivo = 'ninguno';
      await cargarPrograma();
    } catch (error) {
      console.error("Error al guardar pastoreo:", error);
      alert("Error al guardar en base de datos: " + error);
    }
  }

  async function guardarTextoAgenda() {
    try {
      await guardarAgenda({ visita_id: idVisita, puntos: textoAgenda });
      alert("Agenda guardada correctamente");
    } catch (error) {
      console.error("Error al guardar agenda:", error);
      alert("Error al guardar agenda: " + error);
    }
  }

  async function borrarRegistro(tabla: 'predicacion' | 'hospitalidad' | 'pastoreo', id: number) {
    if (confirm("¿Seguro que deseas eliminar este registro?")) {
      try {
        await eliminarRegistroPrograma(tabla, id);
        await cargarPrograma();
      } catch (error) {
        console.error("Error al eliminar registro:", error);
        alert("Error al eliminar: " + error);
      }
    }
  }

  // ==========================================
  // SIMULACIÓN PDF
  // ==========================================
  async function importarPDF() {
    procesandoPDF = true;
    setTimeout(() => {
      alert("La lógica de extracción PDF se programará aquí.");
      procesandoPDF = false;
    }, 1000);
  }
</script>

<div class="programa-container">
  
  <div class="header-programa">
    <div class="info-texto">
      <h4>Programa Semanal</h4>
      <p>Organiza tus salidas, comidas y visitas de pastoreo.</p>
    </div>
    <button class="btn-importar" on:click={importarPDF} disabled={procesandoPDF}>
      {#if procesandoPDF}
        <Clock size={18} class="spin" /> Extrayendo...
      {:else}
        <FileUp size={18} /> Importar PDF
      {/if}
    </button>
  </div>

  <div class="sub-tabs">
    <button class="sub-tab {subPestana === 'predicacion' ? 'activo' : ''}" on:click={() => subPestana = 'predicacion'}><Briefcase size={16} /> Predicación</button>
    <button class="sub-tab {subPestana === 'hospitalidad' ? 'activo' : ''}" on:click={() => subPestana = 'hospitalidad'}><Utensils size={16} /> Hospitalidad</button>
    <button class="sub-tab {subPestana === 'pastoreo' ? 'activo' : ''}" on:click={() => subPestana = 'pastoreo'}><Users size={16} /> Pastoreo</button>
    <button class="sub-tab {subPestana === 'agenda' ? 'activo' : ''}" on:click={() => subPestana = 'agenda'}><BookOpen size={16} /> Agenda</button>
  </div>

  {#if cargandoDatos}
    <div style="padding: 40px; text-align:center; color: var(--text-muted);">Cargando programa...</div>
  {:else}
    <div class="contenido-sub-pestana">
      
      <!-- PREDICACIÓN -->
      {#if subPestana === 'predicacion'}
        <div class="seccion-header">
          <h5>Salidas al Ministerio</h5>
          <button class="btn-anadir" on:click={() => { formPredicacion = { dia: 'Martes', hora: '09:00', tipo_arreglo: 'Predicar en grupo' }; modalActivo = 'predicacion'; }}><Plus size={14} /> Añadir Salida</button>
        </div>
        <div class="timeline-container">
          {#if salidas.length === 0}
            <p class="empty-txt">No hay salidas registradas.</p>
          {/if}
          {#each salidas as salida}
            <div class="timeline-item">
              <div class="timeline-hora">
                <span class="dia">{salida.dia.substring(0,3)}</span>
                <span class="hora">{salida.hora}</span>
              </div>
              <div class="timeline-card">
                <div class="card-top-row">
                  <div class="acomp-grupo">
                    {#if salida.acomp_esposo}<div class="acomp-item"><strong>Conmigo:</strong> {salida.acomp_esposo}</div>{/if}
                    {#if salida.acomp_esposa}<div class="acomp-item"><strong>Con mi esposa:</strong> {salida.acomp_esposa}</div>{/if}
                  </div>
                  <div class="acciones-tarjeta">
                    <button class="btn-editar-sm" on:click={() => editarPredicacion(salida)} title="Editar"><Pencil size={14} /></button>
                    <button class="btn-borrar-sm" on:click={() => borrarRegistro('predicacion', salida.id!)} title="Eliminar"><Trash2 size={14} /></button>
                  </div>
                </div>
                <div class="info-extra">
                  {#if salida.tipo_arreglo}<span><Briefcase size={12}/> {salida.tipo_arreglo}</span>{/if}
                </div>
              </div>
            </div>
          {/each}
        </div>

      <!-- HOSPITALIDAD -->
      {:else if subPestana === 'hospitalidad'}
        <div class="seccion-header">
          <h5>Arreglos de Comidas</h5>
          <button class="btn-anadir" on:click={() => { formHospitalidad = { dia: 'Martes', tipo_comida: 'Almuerzo' }; modalActivo = 'hospitalidad'; }}><Plus size={14} /> Añadir Comida</button>
        </div>
        <div class="grid-tarjetas">
          {#if comidas.length === 0} <p class="empty-txt">No hay comidas registradas.</p> {/if}
          {#each comidas as comida}
            <div class="tarjeta">
              <div class="tarjeta-header">
                <div>
                  <span class="badge-dia">{comida.dia}</span>
                  <span class="badge-tipo {comida.tipo_comida.toLowerCase()}">{comida.tipo_comida}</span>
                </div>
                <div class="acciones-tarjeta">
                  <button class="btn-editar-sm" on:click={() => editarHospitalidad(comida)} title="Editar"><Pencil size={14} /></button>
                  <button class="btn-borrar-sm" on:click={() => borrarRegistro('hospitalidad', comida.id!)} title="Eliminar"><Trash2 size={14} /></button>
                </div>
              </div>
              <p class="nombre-principal">{comida.anfitrion}</p>
              {#if comida.direccion}<div class="tarjeta-info"><MapPin size={12} /> {comida.direccion}</div>{/if}
              {#if comida.telefono}<div class="tarjeta-info"><Phone size={12} /> {comida.telefono}</div>{/if}
            </div>
          {/each}
        </div>

      <!-- PASTOREO -->
      {:else if subPestana === 'pastoreo'}
        <div class="seccion-header">
          <h5>Visitas de Pastoreo</h5>
          <button class="btn-anadir" on:click={() => { formPastoreo = { dia_temp: 'Jueves', hora_temp: '16:00' }; modalActivo = 'pastoreo'; }}><Plus size={14} /> Añadir Visita</button>
        </div>
        <div class="grid-tarjetas pastoreo">
          {#if pastoreos.length === 0} <p class="empty-txt">No hay pastoreos registrados.</p> {/if}
          {#each pastoreos as pastoreo}
            <div class="tarjeta">
              
              <!-- 1. Cabecera con Fecha, Hora y Botones -->
              <div class="tarjeta-header">
                <div>
                  <span class="badge-dia">{pastoreo.dia_hora || 'Sin fecha'}</span>
                </div>
                <div class="acciones-tarjeta">
                  <button class="btn-editar-sm" on:click={() => editarPastoreo(pastoreo)} title="Editar"><Pencil size={14} /></button>
                  <button class="btn-borrar-sm" on:click={() => borrarRegistro('pastoreo', pastoreo.id!)} title="Eliminar"><Trash2 size={14} /></button>
                </div>
              </div>
              
              <!-- 2. Acompañante justo debajo de la fecha -->
              {#if pastoreo.anciano}
                <div class="tarjeta-info anciano-info"><User size={13} /> Acompaña: {pastoreo.anciano}</div>
              {/if}
              
              <!-- 3. Nombre de la familia debajo del acompañante -->
              <p class="nombre-principal">{pastoreo.familia}</p>
              
              <!-- 4. Teléfono y Notas -->
              {#if pastoreo.telefono}
                <div class="tarjeta-info"><Phone size={13} /> {pastoreo.telefono}</div>
              {/if}
              <textarea class="notas-rapidas" placeholder="Notas (solo visibles para ti)..." bind:value={pastoreo.notas} on:blur={() => guardarPastoreo(pastoreo)} rows="2"></textarea>
              
            </div>
          {/each}
        </div>

      <!-- AGENDA -->
      {:else if subPestana === 'agenda'}
        <div class="seccion-header">
          <h5>Puntos para la reunión de ancianos</h5>
        </div>
        <div class="agenda-container">
          <textarea bind:value={textoAgenda} placeholder="Escribe aquí los puntos de la agenda..." rows="10" class="textarea-agenda"></textarea>
          <div class="accion-flotante">
            <button class="btn-guardar-agenda" on:click={guardarTextoAgenda}>Guardar Agenda</button>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<!-- ========================================== -->
<!-- MODALES PARA ENTRADA MANUAL -->
<!-- ========================================== -->

<!-- DATALIST GLOBAL PARA TODA LA APP -->
<datalist id="lista-personas">
  {#each listaPersonas as persona}
    <option value={persona}></option>
  {/each}
</datalist>

{#if modalActivo !== 'ninguno'}
  <div class="modal-overlay" on:click|self={() => modalActivo = 'ninguno'}>
    <div class="modal-content">
      <div class="modal-header">
        <h4>{formPredicacion.id || formHospitalidad.id || formPastoreo.id ? 'Editar' : 'Añadir'} {modalActivo === 'predicacion' ? 'Salida' : modalActivo === 'hospitalidad' ? 'Comida' : 'Visita'}</h4>
        <button class="btn-close" on:click={() => modalActivo = 'ninguno'}><X size={18}/></button>
      </div>
      
      <div class="modal-body">
        
        {#if modalActivo === 'predicacion'}
          <div class="form-row">
            <label>Día:</label> 
            <select bind:value={formPredicacion.dia}>
              {#each diasSemana as d}<option>{d}</option>{/each}
            </select>
          </div>

          <div class="form-row">
            <label>Hora:</label> 
            <input type="time" bind:value={formPredicacion.hora}>
          </div>

          <div class="form-row">
            <label>Acompañante (Esposo):</label> 
            <input type="text" bind:value={formPredicacion.acomp_esposo} list="lista-personas" placeholder="Escribe o selecciona...">
          </div>
          <div class="form-row">
            <label>Acompañante (Esposa):</label> 
            <input type="text" bind:value={formPredicacion.acomp_esposa} list="lista-personas" placeholder="Escribe o selecciona...">
          </div>
          <div class="form-row">
            <label>Tipo de arreglo:</label> 
            <select bind:value={formPredicacion.tipo_arreglo}>
              <option>Predicar en grupo</option>
              <option>Revisitas</option>
              <option>Curso bíblico</option>
            </select>
          </div>
          <button class="btn-submit" on:click={guardarManualPredicacion}>Guardar Salida</button>
        {/if}

        {#if modalActivo === 'hospitalidad'}
          <div class="form-row"><label>Día:</label> <select bind:value={formHospitalidad.dia}>{#each diasSemana as d}<option>{d}</option>{/each}</select></div>
          <div class="form-row"><label>Tipo:</label> <select bind:value={formHospitalidad.tipo_comida}><option>Almuerzo</option><option>Comida</option></select></div>
          <div class="form-row">
            <label>Familia Anfitriona:</label> 
            <input type="text" bind:value={formHospitalidad.anfitrion} list="lista-personas" placeholder="Escribe o selecciona...">
          </div>
          <div class="form-row"><label>Dirección:</label> <input type="text" bind:value={formHospitalidad.direccion}></div>
          <div class="form-row"><label>Teléfono:</label> <input type="text" bind:value={formHospitalidad.telefono}></div>
          <button class="btn-submit" on:click={guardarManualHospitalidad}>Guardar Comida</button>
        {/if}

        {#if modalActivo === 'pastoreo'}
          <div class="form-row">
            <label>Día:</label> 
            <select bind:value={formPastoreo.dia_temp}>
              {#each diasSemana as d}<option>{d}</option>{/each}
            </select>
          </div>
          <div class="form-row">
            <label>Hora:</label> 
            <input type="time" bind:value={formPastoreo.hora_temp}>
          </div>
          <div class="form-row">
            <label>Familia/Publicador:</label> 
            <input type="text" bind:value={formPastoreo.familia} list="lista-personas" placeholder="Escribe o selecciona...">
          </div>
          <div class="form-row">
            <label>Anciano / SM que acompaña:</label> 
            <input type="text" bind:value={formPastoreo.anciano} list="lista-personas" placeholder="Escribe o selecciona...">
          </div>
          <div class="form-row"><label>Teléfono:</label> <input type="text" bind:value={formPastoreo.telefono}></div>
          <button class="btn-submit" on:click={guardarManualPastoreo}>Guardar Pastoreo</button>
        {/if}

      </div>
    </div>
  </div>
{/if}

<style>
  .programa-container { background: var(--bg-panel); border: 1px solid var(--border-color); border-radius: 12px; padding: 25px; box-shadow: var(--shadow-sm); animation: fadeIn 0.3s; position: relative; }
  
  .header-programa { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 15px; }
  .info-texto h4 { margin: 0 0 4px 0; font-size: 1.2rem; color: var(--text-main); font-weight: 800; }
  .info-texto p { margin: 0; font-size: 0.85rem; color: var(--text-muted); }
  
  .btn-importar { background: #10b981; color: white; border: none; padding: 10px 20px; border-radius: 20px; font-weight: 700; font-size: 0.9rem; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: 0.2s; }
  .btn-importar:hover:not(:disabled) { background: #059669; }

  .sub-tabs { display: flex; gap: 10px; border-bottom: 1px solid var(--border-color); padding-bottom: 10px; margin-bottom: 20px; overflow-x: auto; }
  .sub-tab { background: transparent; border: 1px solid transparent; color: var(--text-muted); font-weight: 600; font-size: 0.85rem; padding: 8px 16px; border-radius: 20px; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: 0.2s; white-space: nowrap; }
  .sub-tab.activo { background: rgba(92, 10, 31, 0.1); color: var(--primary); border: 1px solid rgba(92, 10, 31, 0.2); }

  .seccion-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
  .seccion-header h5 { margin: 0; font-size: 1.05rem; color: var(--text-main); }
  .btn-anadir { background: transparent; border: 1px dashed var(--border-color); color: var(--text-muted); padding: 6px 12px; border-radius: 12px; font-size: 0.8rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 4px; }
  .btn-anadir:hover { border-color: var(--primary); color: var(--primary); }

  .empty-txt { color: var(--text-muted); font-size: 0.9rem; font-style: italic; }

  .grid-tarjetas { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 15px; }
  .tarjeta { border: 1px solid var(--border-color); background: var(--bg-app); border-radius: 10px; padding: 15px; position: relative; }
  .tarjeta-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
  .badge-dia { font-size: 0.75rem; font-weight: 700; color: var(--text-muted); background: var(--bg-panel); padding: 2px 8px; border-radius: 10px; border: 1px solid var(--border-color); }
  .badge-tipo { font-size: 0.7rem; font-weight: 700; padding: 2px 8px; border-radius: 10px; text-transform: uppercase; margin-left: 5px; }
  .badge-tipo.almuerzo { background: #fef9c3; color: #a16207; }
  .badge-tipo.comida { background: #e0e7ff; color: #4338ca; }
  .anciano-badge { font-size: 0.75rem; color: var(--primary); font-weight: 600; margin-left: 5px; }
  .nombre-principal { margin: 0 0 10px 0; font-weight: 800; font-size: 1.1rem; color: var(--text-main); }
  .tarjeta-info { display: flex; align-items: center; gap: 6px; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 4px; }
  .anciano-info { color: var(--primary); font-weight: 600; margin-bottom: 12px; }
  
  .notas-rapidas { width: 100%; box-sizing: border-box; margin-top: 10px; padding: 8px; border: 1px dashed var(--border-color); border-radius: 6px; font-size: 0.85rem; background: var(--bg-panel); color: var(--text-main); font-family: inherit; resize: vertical; }

  .timeline-item { display: flex; gap: 15px; margin-bottom: 15px; }
  .timeline-hora { display: flex; flex-direction: column; align-items: flex-end; min-width: 60px; padding-top: 5px; }
  .timeline-hora .dia { font-size: 0.8rem; font-weight: 800; color: var(--primary); text-transform: uppercase; }
  .timeline-hora .hora { font-size: 0.8rem; color: var(--text-muted); font-weight: 600; }
  .timeline-card { flex: 1; border: 1px solid var(--border-color); background: var(--bg-app); padding: 12px 15px; border-radius: 10px; border-left: 4px solid var(--primary); }
  .card-top-row { display: flex; justify-content: space-between; align-items: flex-start; }
  .acomp-grupo { display: flex; flex-direction: column; gap: 5px; margin-bottom: 8px; font-size: 0.9rem; color: var(--text-main); }
  .info-extra { font-size: 0.8rem; color: var(--text-muted); display: flex; gap: 10px; }

  .agenda-container { position: relative; }
  .textarea-agenda { width: 100%; padding: 15px; border-radius: 10px; border: 1px solid var(--border-color); background: var(--bg-app); color: var(--text-main); font-size: 0.95rem; resize: vertical; box-sizing: border-box; }
  .accion-flotante { display: flex; justify-content: flex-end; margin-top: 10px; }
  .btn-guardar-agenda { background: var(--primary); color: white; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; }

  /* ESTILOS DE BOTONES DE ACCIÓN */
  .acciones-tarjeta { display: flex; gap: 5px; }
  .btn-editar-sm { background: transparent; border: none; color: #3b82f6; cursor: pointer; padding: 4px; border-radius: 4px; opacity: 0.5; transition: 0.2s; }
  .btn-editar-sm:hover { opacity: 1; background: #eff6ff; }
  .btn-borrar-sm { background: transparent; border: none; color: #ef4444; cursor: pointer; padding: 4px; border-radius: 4px; opacity: 0.5; transition: 0.2s; }
  .btn-borrar-sm:hover { opacity: 1; background: #fee2e2; }

  /* ESTILOS DEL MODAL (NUEVO) */
  .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(2px); }
  .modal-content { background: var(--bg-panel); border-radius: 12px; width: 90%; max-width: 400px; padding: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); animation: scaleIn 0.2s; border: 1px solid var(--border-color); }
  .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
  .modal-header h4 { margin: 0; color: var(--text-main); }
  .btn-close { background: transparent; border: none; color: var(--text-muted); cursor: pointer; }
  .form-row { display: flex; flex-direction: column; gap: 5px; margin-bottom: 12px; }
  .form-row label { font-size: 0.85rem; font-weight: 600; color: var(--text-muted); }
  .form-row input, .form-row select { padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-app); color: var(--text-main); font-family: inherit; }
  .btn-submit { width: 100%; background: var(--primary); color: white; border: none; padding: 12px; border-radius: 8px; font-weight: 700; cursor: pointer; margin-top: 10px; }
  
  @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
</style>