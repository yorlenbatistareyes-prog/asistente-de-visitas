<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores'; 
  import { Search, Upload, Plus, Trash2, Phone, Mail, User, MapPin, Edit, Users } from "lucide-svelte";
  import Papa from 'papaparse';
  import { save as saveDialog, open as openDialog, confirm as confirmDialog, message as messageDialog } from '@tauri-apps/plugin-dialog';
  import { 
    obtenerPersonasPorCircuito, 
    guardarPersona, 
    eliminarPersona,
    eliminarTodasLasPersonas,
    type Persona 
  } from '$lib/services/db';

  $: circuitoId = Number($page.params.id);

  let personas: Persona[] = [];
  let busqueda = "";
  let mostrandoModalPersona = false;

  const resetForm = () => {
    nuevaP = {
      circuito_id: circuitoId,
      nombre: "", segundo_nombre: "", apellidos: "",
      privilegio: "", congregacion: "", direccion: "",
      telefono_celular: "", telefono_fijo: "", email: ""
    };
  };

  let nuevaP: Persona;

  $: if (circuitoId) {
    resetForm();
    cargar();
  }

  async function cargar() {
    if (!circuitoId) return;
    try {
      const resultados = await obtenerPersonasPorCircuito(circuitoId);
      personas = [...resultados]; 
    } catch (error) {
      console.error("Error al cargar personas:", error);
    }
  }

  // --- FILTRADO Y AGRUPACIÓN POR CONGREGACIÓN ---
  
  // 1. Primero filtramos según la búsqueda
  $: filtradas = personas.filter(p => 
    `${p.nombre} ${p.apellidos}`.toLowerCase().includes(busqueda.toLowerCase()) ||
    (p.congregacion || "").toLowerCase().includes(busqueda.toLowerCase())
  );

  // 2. Luego agrupamos las filtradas
  $: personasAgrupadas = filtradas.reduce((grupos, persona) => {
    const nombreCongregacion = persona.congregacion || 'Sin Congregación Asignada';
    if (!grupos[nombreCongregacion]) {
      grupos[nombreCongregacion] = [];
    }
    grupos[nombreCongregacion].push(persona);
    return grupos;
  }, {} as Record<string, Persona[]>);

  // 3. Obtenemos las llaves (nombres de congregaciones) ordenadas alfabéticamente
  $: congregacionesOrdenadas = Object.keys(personasAgrupadas).sort((a, b) => {
    if (a === 'Sin Congregación Asignada') return 1;
    if (b === 'Sin Congregación Asignada') return -1;
    return a.localeCompare(b);
  });


  async function importarCSV(e: any) {
    if (!circuitoId) {
      alert("Error: No se pudo detectar el ID del circuito.");
      return;
    }

    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const datosCSV = results.data as Record<string, string>[];
        for (const fila of datosCSV) {
          if (!fila["Nombre"]) continue;
          try {
            await guardarPersona({
              circuito_id: circuitoId, 
              nombre: fila["Nombre"] || "",
              segundo_nombre: fila["Segundo nombre"] || "",
              apellidos: fila["Apellidos"] || "",
              privilegio: fila["Tipo de privilegio"] || "",
              congregacion: fila["Congregación"] || "",
              direccion: fila["Dirección completa (Postal)"] || "",
              telefono_celular: fila["Teléfono (Celular)"] || "",
              telefono_fijo: fila["Teléfono"] || "",
              email: fila["Correo electrónico (Correo electrónico (jw.org))"] || ""
            });
          } catch (err) {
            console.error("Error guardando a:", fila["Nombre"], err);
          }
        }
        await cargar(); 
        alert("✅ Importación completada");
        e.target.value = ""; 
      }
    });
  }

  function abrirEdicion(persona: Persona) {
    nuevaP = { ...persona }; 
    mostrandoModalPersona = true;
  }

  async function guardarManual() {
    if (!nuevaP.nombre.trim() || !nuevaP.apellidos.trim()) {
      alert("El nombre y los apellidos son obligatorios");
      return;
    }
    
    try {
      nuevaP.circuito_id = circuitoId;
      await guardarPersona(nuevaP);
      mostrandoModalPersona = false;
      resetForm();
      await cargar(); 
    } catch (err) {
      console.error("Error al guardar manual:", err);
    }
  }

  async function borrar(id: number | undefined, nombre: string) {
    if (!id) return;

    // Usamos confirmDialog tal como lo hicimos en congregaciones
    const confirmado = await confirmDialog(
      `¿Estás seguro de que deseas eliminar a "${nombre}" del directorio?`,
      { title: 'Eliminar Persona', kind: 'warning' }
    );

    // Si pulsas cancelar, salimos inmediatamente
    if (!confirmado) return;

    try {
      await eliminarPersona(id);
      await cargar(); // Refrescamos la lista
      console.log("✅ Persona eliminada correctamente.");
    } catch (error) {
      console.error("Error al eliminar persona:", error);
      alert("No se pudo eliminar el registro.");
    }
  }

  async function borrarTodo() {
    if (personas.length === 0) {
      // Alerta nativa informativa
      await messageDialog("El registro de personas ya está vacío.", { title: 'Información', kind: 'info' });
      return;
    }

    // Cuadro de confirmación NATIVO del sistema operativo (Windows / Android)
    const confirmado = await confirmDialog(
      "⚠️ ATENCIÓN: ¿Estás ABSOLUTAMENTE SEGURO de que deseas eliminar a TODAS las personas de este circuito?\n\nEsta acción no se puede deshacer.",
      { title: 'Vaciar Directorio', kind: 'warning' }
    );

    if (!confirmado) return;

    try {
      await eliminarTodasLasPersonas(circuitoId);
      await cargar(); // Refrescamos la lista para que quede en blanco
      console.log("✅ Todas las personas han sido eliminadas.");
    } catch (error) {
      console.error("Error al vaciar el registro:", error);
      // Alerta nativa de error
      await messageDialog("Ocurrió un error al intentar vaciar el registro.", { title: 'Error', kind: 'error' });
    }
  }
</script>

<div class="seccion-personas">
  <div class="header-registro">
    <h1>Directorio</h1>
    <p>{personas.length} hermanos registrados en este circuito</p>
  </div>

  <div class="toolbar-modular">
    <div class="search-pill card-global">
      <Search size={18} class="search-icon" />
      <input type="text" placeholder="Buscar por nombre o congregación..." bind:value={busqueda} class="search-input" />
    </div>

    <div class="filters-aside">
      <label class="btn-importar card-global">
           <Upload size={18} /> <span>Importar CSV</span>
           <input type="file" accept=".csv" on:change={importarCSV} hidden />
      </label>
      
      <button class="btn-primary-fino" on:click={() => { resetForm(); mostrandoModalPersona = true; }}>
        <Plus size={18} /> Añadir Persona
      </button>

      <button class="btn-danger-fino" on:click={borrarTodo} title="Limpiar todo el registro">
        <Trash2 size={18} /> <span class="texto-btn-danger">Limpiar</span>
      </button>
    </div>
  </div>

  <div class="lista-agrupada">
    {#each congregacionesOrdenadas as nombreCongregacion}
      <div class="grupo-congregacion card-global">
        
        <div class="header-congregacion">
          <div class="titulo-cong">
            <Users size={20} color="var(--primary)" />
            <h2>{nombreCongregacion}</h2>
          </div>
          <span class="badge-conteo">{personasAgrupadas[nombreCongregacion].length} personas</span>
        </div>

        <div class="tabla-personas">
          {#each personasAgrupadas[nombreCongregacion] as p}
            <div class="persona-row">
              <div class="p-info" role="button" tabindex="0" on:click={() => abrirEdicion(p)}
                on:keydown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {e.preventDefault();
                    abrirEdicion(p);
                  }
                }}>
                <span class="p-nombre">{p.apellidos}, {p.nombre}</span>
                <span class="p-meta">{p.privilegio || 'Publicador'}</span>
              </div>
              
              <div class="p-contacto">
                {#if p.telefono_celular}<span title="Celular"><Phone size={14}/> {p.telefono_celular}</span>{/if}
                {#if p.email}<span title="Email"><Mail size={14}/> {p.email}</span>{/if}
              </div>
              
              <div class="p-acciones">
                 <button 
                    class="btn-icon-edit" 
                    title="Editar" 
                    on:click|preventDefault|stopPropagation={() => abrirEdicion(p)}
                 >
                    <Edit size={16} />
                 </button>
  
                 <button 
                    class="btn-icon-delete" 
                    title="Eliminar" 
                    on:click|preventDefault|stopPropagation={() => borrar(p.id, p.nombre)}
                 >
                    <Trash2 size={16} />
                 </button>
              </div>
            </div>
          {/each}
        </div>

      </div>
    {:else}
      <div class="vacio card-global">
        <User size={48} color="var(--border-color)" style="margin-bottom: 15px;" />
        <p>No hay personas registradas o que coincidan con la búsqueda.</p>
      </div>
    {/each}
  </div>
</div>

{#if mostrandoModalPersona}
  <div class="modal-backdrop">
    <div class="card-global modal-content persona-modal">
      
      <h2>{nuevaP.id ? 'Editar Persona' : 'Registrar Nueva Persona'}</h2>
      
      <div class="form-grid">
        <div class="col">
          <div class="form-group">
            <label for="nombre_input">Nombre *</label>
            <input id="nombre_input" type="text" class="input-global" bind:value={nuevaP.nombre} />
          </div>
          <div class="form-group">
            <label for="segundo_nombre_input">Segundo Nombre</label>
            <input id="segundo_nombre_input" type="text" class="input-global" bind:value={nuevaP.segundo_nombre} />
          </div>
          <div class="form-group">
            <label for="apellidos_input">Apellidos *</label>
            <input id="apellidos_input" type="text" class="input-global" bind:value={nuevaP.apellidos} />
          </div>
          <div class="form-group">
            <label for="congregacion_input">Congregación</label>
            <input id="congregacion_input" type="text" class="input-global" bind:value={nuevaP.congregacion} />
          </div>
        </div>

        <div class="col">
          <div class="form-group">
            <label for="privilegio_input">Privilegio</label>
            <input id="privilegio_input" type="text" class="input-global" bind:value={nuevaP.privilegio} placeholder="Ej: Anciano" />
          </div>
          <div class="form-group">
            <label for="telefono_celular_input">Teléfono Celular</label>
            <input id="telefono_celular_input" type="text" class="input-global" bind:value={nuevaP.telefono_celular} />
          </div>
          <div class="form-group">
            <label for="email_input">Correo Electrónico</label>
            <input id="email_input" type="email" class="input-global" bind:value={nuevaP.email} />
          </div>
          <div class="form-group">
            <label for="direccion_input">Dirección Completa</label>
            <textarea id="direccion_input" class="input-global" bind:value={nuevaP.direccion} rows="2"></textarea>
          </div>
        </div>
      </div>

      <div class="modal-actions">
        <button class="btn-global" on:click={() => { mostrandoModalPersona = false; resetForm(); }}>Cancelar</button>
        
        <button class="btn-global btn-primary" on:click={guardarManual}>
          {nuevaP.id ? 'Actualizar Datos' : 'Guardar Persona'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .seccion-personas { padding: 10px; animation: fadeIn 0.3s ease-out; }
  .header-registro { margin-bottom: 30px; }
  .header-registro h1 { font-size: 2.2rem; font-weight: 850; color: var(--text-main); margin: 0; }
  .header-registro p { color: var(--text-muted); margin-top: 5px; }

  .toolbar-modular { display: flex; gap: 15px; align-items: center; margin-bottom: 25px; }
  
  .search-pill { 
    flex: 1; height: 44px; border-radius: 50px; display: flex; align-items: center; 
    padding: 0 20px; background: var(--bg-panel); border: 1px solid var(--border-color);
  }
  
  .search-input { background: transparent; border: none; outline: none; color: var(--text-main); width: 100%; margin-left: 10px; font-size: 0.9rem; }
  .search-input::placeholder { color: var(--text-muted); }

  .filters-aside { display: flex; gap: 10px; }
  
  .btn-primary-fino {
    height: 38px; /* Más fino y elegante */
    padding: 0 24px; 
    border-radius: 30px; /* Forma de píldora */
    display: flex; 
    align-items: center; 
    gap: 8px; 
    cursor: pointer; 
    font-weight: 700; 
    font-size: 0.85rem; 
    border: none;
    background-color: #5c0a1f !important; /* Rojo vino intenso */
    color: white !important; 
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px rgba(92, 10, 31, 0.2);
  }

  .btn-primary-fino:hover { 
    background-color: #3a0411 !important; 
    transform: translateY(-1px); 
    box-shadow: 0 4px 8px rgba(92, 10, 31, 0.3);
  }

  .btn-importar {
    background-color: #14532d; /* Verde bosque profundo */
    color: white; 
    border: none; 
    height: 38px; /* Altura igualada al botón rojo */
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
    background-color: #052e16; /* Verde casi negro */
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(20, 83, 45, 0.3);
  }

  /* ESTILOS DE LA VISTA AGRUPADA */
  .lista-agrupada { display: flex; flex-direction: column; gap: 25px; }
  
  .grupo-congregacion { 
    background: var(--bg-panel); 
    border-radius: var(--radius-lg); 
    border: 1px solid var(--border-color); 
    overflow: hidden; 
  }

  .header-congregacion {
    background: rgba(100, 116, 139, 0.05);
    padding: 15px 25px;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .titulo-cong { display: flex; align-items: center; gap: 10px; }
  .titulo-cong h2 { margin: 0; font-size: 1.15rem; color: var(--text-main); font-weight: 800; }
  
  .badge-conteo {
    background: var(--bg-app);
    color: var(--text-muted);
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 700;
    border: 1px solid var(--border-color);
  }

  .tabla-personas { width: 100%; }
  
  .persona-row { 
    display: flex; align-items: center; padding: 15px 25px; 
    border-bottom: 1px solid var(--border-color); transition: background 0.2s;
  }
  .persona-row:last-child { border-bottom: none; }
  .persona-row:hover { background: rgba(100, 116, 139, 0.05); }
  
  .p-info { flex: 1.5; display: flex; flex-direction: column; cursor: pointer; }
  .p-nombre { font-weight: 700; color: var(--text-main); font-size: 1rem; transition: color 0.2s;}
  .p-info:hover .p-nombre { color: var(--primary); }
  .p-meta { font-size: 0.8rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; margin-top: 3px;}
  
  .p-contacto { flex: 2; display: flex; flex-wrap: wrap; gap: 15px; color: var(--text-muted); font-size: 0.85rem; }
  .p-contacto span { display: flex; align-items: center; gap: 6px; }

  .p-acciones { display: flex; gap: 8px; align-items: center; margin-left: 15px;}
  
  .btn-icon-edit, .btn-icon-delete { 
    background: #f8fafc; 
    border: 1px solid #e2e8f0;
    cursor: pointer; 
    opacity: 0.8; 
    transition: all 0.2s; 
    padding: 6px; 
    border-radius: 50%; /* Iconos circulares */
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .btn-icon-edit { color: var(--primary); }
  .btn-icon-delete { color: #ef4444; }
  
  .btn-icon-edit:hover { 
    opacity: 1; 
    background: #5c0a1f; 
    color: white !important; 
  }

  .btn-icon-delete:hover { 
    opacity: 1; 
    background: #ef4444; 
    color: white !important; 
  }

  .vacio { padding: 60px; text-align: center; color: var(--text-muted); display: flex; flex-direction: column; align-items: center; justify-content: center; border: 1px dashed var(--border-color); background: transparent;}

  /* MODAL */
  .modal-backdrop {
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(4px);
    display: flex; justify-content: center; align-items: center; z-index: 9999; padding: 20px;
  }

  .persona-modal {
    position: relative; width: 100%; max-width: 700px; background: var(--bg-panel);
    border-radius: var(--radius-lg); padding: 30px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
    border-top: 5px solid var(--primary); animation: scaleIn 0.2s ease-out;
  }

  .persona-modal h2 { margin-top: 0; color: var(--text-main); font-size: 1.5rem; }

  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 25px; margin: 25px 0; text-align: left; }
  .col { display: flex; flex-direction: column; gap: 15px; }
  
  .form-group { display: flex; flex-direction: column; gap: 6px; }
  .form-group label { font-size: 0.75rem; color: var(--text-muted); font-weight: 800; text-transform: uppercase; }
  
  .input-global { 
    height: 40px; font-size: 0.95rem; padding: 0 12px; width: 100%; 
    border-radius: 8px; border: 1px solid var(--border-color); 
    background: var(--bg-app); color: var(--text-main); transition: border-color 0.2s;
  }
  .input-global:focus { border-color: var(--primary); outline: none; }
  textarea.input-global { height: auto; padding: 10px; resize: vertical; }

  .modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 25px; border-top: 1px solid var(--border-color); padding-top: 20px; }
  
  .btn-global { 
    padding: 0 20px; height: 42px; border-radius: 8px; font-weight: 700; cursor: pointer; 
    border: none; font-size: 0.9rem; transition: all 0.2s;
  }
  .btn-global:not(.btn-primary) { background: transparent; color: var(--text-muted); }
  .btn-global:not(.btn-primary):hover { background: var(--bg-app); color: var(--text-main); }
  
  .btn-primary { 
    background-color: #5c0a1f !important; /* Rojo vino intenso */
    color: white !important; 
    border-radius: 30px !important; /* Forma de píldora */
    padding: 0 24px !important;
    height: 42px; /* Un poquito más alto para el modal */
    font-weight: 700;
    border: none;
    transition: all 0.2s ease;
  }

  .btn-primary:hover { 
    background-color: #3a0411 !important; 
    transform: translateY(-1px); 
    box-shadow: var(--shadow-sm); 
  }

  @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

  @media (max-width: 600px) { .form-grid { grid-template-columns: 1fr; } }

  /* =============================================
     DISEÑO RESPONSIVO (Tablets y Móviles)
     ============================================= */

  /* Móviles (hasta 768px) */
  @media (max-width: 768px) {
    /* 1. Cabecera */
    .header-registro h1 { font-size: 1.8rem; }

    /* 2. Barra de Herramientas y Botones */
    .toolbar-modular { 
      flex-direction: column; 
      align-items: stretch; 
      gap: 15px; 
    }
    
    .search-pill { 
      width: 100%; 
      box-sizing: border-box; 
      height: 48px; 
    }

    /* Mantenemos los botones 50/50 igual que en Congregaciones */
    .filters-aside { 
      width: 100%;
      display: flex !important;
      flex-direction: row !important;
      flex-wrap: nowrap !important;
      gap: 10px !important;
    }

    .filters-aside .btn-importar,
    .filters-aside .btn-primary-fino {
      flex: 1 !important;
      width: 100% !important;
      height: 44px !important;
      padding: 0 5px !important;
      font-size: 0.8rem !important;
      justify-content: center !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      border-radius: 30px !important;
    }

    /* 3. Filas de Personas (Evitamos que se aplaste el texto) */
    .persona-row {
      flex-direction: column; /* Apilamos la info hacia abajo */
      align-items: flex-start;
      position: relative; /* Para poder colocar los botones en la esquina */
      padding: 15px;
      gap: 10px;
    }

    .p-info {
      padding-right: 70px; /* Dejamos un hueco para que el texto no pise los botones */
    }

    .p-contacto {
      flex-direction: column; /* Teléfono y correo uno debajo del otro */
      gap: 8px;
      width: 100%;
    }

    /* Movemos los botones de Editar y Borrar a la esquina superior derecha */
    .p-acciones {
      position: absolute;
      top: 15px;
      right: 15px;
      margin-left: 0;
      gap: 8px;
    }

    .btn-icon-edit, .btn-icon-delete {
      padding: 8px; /* Iconos más gorditos para el dedo */
    }

    /* 4. Ajustes del Modal */
    .persona-modal { padding: 20px; }
    
    .modal-actions {
      flex-direction: column-reverse; /* El botón de cancelar queda abajo */
      gap: 10px;
    }
    
    .modal-actions button {
      width: 100%;
      height: 48px !important; /* Botones de guardar fáciles de tocar */
    }
  }

  /* Móviles muy pequeños (hasta 480px) */
  @media (max-width: 480px) {
    .filters-aside .btn-importar,
    .filters-aside .btn-primary-fino {
      font-size: 0.75rem !important; /* Achicamos letra si la pantalla es enana */
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

  /* --- AJUSTE VITAL PARA MÓVILES (Sobrescribe tu regla anterior) --- */
  @media (max-width: 768px) {
    .filters-aside { 
      flex-wrap: wrap !important; /* Ahora sí permitimos que envuelvan */
    }
    
    .filters-aside .btn-danger-fino {
      flex: 1 1 100% !important; /* Obliga al botón rojo a saltar a una nueva línea entera abajo */
      height: 44px !important;
      justify-content: center;
    }

    .texto-btn-danger {
      display: inline !important; /* Aseguramos que se lea "Limpiar" en el móvil */
    }
  }

</style>