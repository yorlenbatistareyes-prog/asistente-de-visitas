<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { slide } from 'svelte/transition'; 
  import { Filter, Search, Upload, Plus, Trash2, Phone, Mail, User, Edit, Users, ChevronDown, ChevronUp } from "lucide-svelte";
  import Papa from 'papaparse';
  import { open as openDialog, confirm as confirmDialog, message as messageDialog } from '@tauri-apps/plugin-dialog';
  import { readFile } from '@tauri-apps/plugin-fs';
  
  import { abrirWhatsApp, abrirCorreoJWPub } from '$lib/utils/contacto';

  import { 
    obtenerPersonasPorCircuito, 
    guardarPersona, 
    eliminarPersona,
    eliminarTodasLasPersonas,
    type Persona 
  } from '$lib/services/db';

  // 🌟 IMPORTAMOS EL MODAL SEPARADO
  import NuevaPersonaModal from '$lib/components/modals/NuevaPersonaModal.svelte';

  $: circuitoId = Number($page.params.id);

  let personas: Persona[] = [];
  let busqueda = "";
  let mostrandoModalPersona = false;
  let datosEdicion: Persona | null = null; 

  // --- FILTRO AVANZADO ---
  let filtrosSeleccionados: string[] = []; 
  let mostrarMenuFiltros = false;
  let categoriasFiltroExpandidas: Record<string, boolean> = {};

  const categoriasFiltro = [
    { nombre: 'Designaciones', opciones: ['PUBLICADOR', 'BETEL', 'VOLUNTARIO A DISTANCIA', 'LDC - SIERVO CONSTRUCCIÓN', 'LDC - VOLUNTARIO CONSTRUCCIÓN', 'PE', 'PET', 'PR'] },
    { nombre: 'Hermanos Nombrados', opciones: ['ANCIANO', 'SM'] },
    { nombre: 'Privilegios', opciones: ['CCA', 'SEC', 'SS', 'SG', 'GA', 'CEH', 'GVP', 'SA', 'SAA'] },
    { nombre: 'Solicitudes Vigentes', opciones: ['A-19', 'A-2'] }
  ];

  function toggleCategoriaFiltro(nombre: string) { categoriasFiltroExpandidas[nombre] = !categoriasFiltroExpandidas[nombre]; }
  
  function toggleFiltroCheckbox(priv: string) {
    if (filtrosSeleccionados.includes(priv)) filtrosSeleccionados = filtrosSeleccionados.filter(p => p !== priv);
    else filtrosSeleccionados = [...filtrosSeleccionados, priv];
  }

  $: if (circuitoId) cargar();

  async function cargar() {
    if (!circuitoId) return;
    try {
      const resultados = await obtenerPersonasPorCircuito(circuitoId);
      personas = [...resultados]; 
    } catch (error) { console.error("Error al cargar personas:", error); }
  }

 // --- FILTRADO Y AGRUPACIÓN POR CONGREGACIÓN ---
  $: filtradas = personas.filter(p => {
    const coincideBusqueda = `${p.nombre} ${p.apellidos}`.toLowerCase().includes(busqueda.toLowerCase()) || (p.congregacion || "").toLowerCase().includes(busqueda.toLowerCase());
    const privilegiosPersona = p.privilegio ? p.privilegio.toUpperCase().split(',').map(x => x.trim()) : [];
    const coincideFiltro = filtrosSeleccionados.length === 0 || filtrosSeleccionados.some(filtro => privilegiosPersona.includes(filtro));
    return coincideBusqueda && coincideFiltro;
  });

  $: personasAgrupadas = filtradas.reduce((grupos, persona) => {
    const nombreCongregacion = (persona.congregacion || '').trim().toUpperCase() || 'SIN CONGREGACIÓN ASIGNADA';
    if (!grupos[nombreCongregacion]) grupos[nombreCongregacion] = [];
    grupos[nombreCongregacion].push(persona);
    return grupos;
  }, {} as Record<string, Persona[]>);

  $: congregacionesOrdenadas = Object.keys(personasAgrupadas).sort((a, b) => {
    if (a === 'SIN CONGREGACIÓN ASIGNADA') return 1;
    if (b === 'SIN CONGREGACIÓN ASIGNADA') return -1;
    return a.localeCompare(b);
  });

  let expandidas: Record<string, boolean> = {};
  function toggleExpandir(nombre: string) { expandidas[nombre] = !expandidas[nombre]; }

  $: if (busqueda.trim() !== '' || filtrosSeleccionados.length > 0) {
    const todas: Record<string, boolean> = {};
    congregacionesOrdenadas.forEach(c => todas[c] = true);
    expandidas = todas;
  }

  async function importarCSV() {
    if (!circuitoId) return;
    try {
      const esAndroid = navigator.userAgent.toLowerCase().includes('android');
      const opcionesDialogo: any = { title: 'Seleccionar archivo CSV JW Hub', multiple: false, directory: false };
      if (!esAndroid) opcionesDialogo.filters = [{ name: 'Documentos CSV', extensions: ['csv'] }];

      const seleccion = await openDialog(opcionesDialogo);
      if (!seleccion) return;

      const rutaOrigen = Array.isArray(seleccion) ? seleccion[0] : seleccion;
      if (!esAndroid && !rutaOrigen.toLowerCase().endsWith('.csv')) { alert("❌ Formato incorrecto."); return; }

      const csvBytes = await readFile(rutaOrigen as string);
      const textoCSV = new TextDecoder().decode(csvBytes);

      Papa.parse(textoCSV, {
        header: true, skipEmptyLines: true,
        complete: async (results) => {
          const datosCSV = results.data as Record<string, string>[];
          let importadas = 0;
          for (const fila of datosCSV) {
            if (!fila["Nombre"]) continue;
            try {
              await guardarPersona({
                circuito_id: circuitoId, 
                nombre: fila["Nombre"] || "", 
                segundo_nombre: fila["Segundo nombre"] || "",
                apellidos: fila["Apellidos"] || "", 
                privilegio: (fila["Tipo de privilegio"] || "").toUpperCase(), 
                // Corta el "AEROPUERTO - HOLGUÍN, HOGUÍN" para dejarlo solo como "AEROPUERTO - HOLGUÍN"
                congregacion: fila["Congregación"] ? fila["Congregación"].trim().toUpperCase() : "",
                direccion: fila["Dirección completa (Postal)"] || "",
                telefono_celular: fila["Teléfono (Celular)"] || "", 
                telefono_fijo: fila["Teléfono"] || "",
                email: fila["Correo electrónico (Correo electrónico (jw.org))"] || ""
              });
              importadas++;
            } catch (err) {}
          }
          await cargar(); alert(`✅ Importación completada: ${importadas} ancianos añadidos.`);
        }
      });
    } catch (error) { alert("❌ Error al leer el archivo."); }
  }

  function abrirEdicion(persona: Persona | null = null) {
    datosEdicion = persona ? { ...persona } : null; 
    mostrandoModalPersona = true;
  }

  async function handleGuardarPersona(e: CustomEvent<Persona>) {
    try {
      await guardarPersona(e.detail);
      mostrandoModalPersona = false;
      await cargar(); 
    } catch (err) { console.error("Error al guardar:", err); }
  }

  async function borrar(id: number | undefined, nombre: string) {
    if (!id) return;
    const confirmado = await confirmDialog(`¿Estás seguro de que deseas eliminar a "${nombre}" del directorio?`, { title: 'Eliminar Persona', kind: 'warning' });
    if (!confirmado) return;
    try { await eliminarPersona(id); await cargar(); } 
    catch (error) { alert("No se pudo eliminar el registro."); }
  }

  async function borrarTodo() {
    if (personas.length === 0) return;
    const confirmado = await confirmDialog("⚠️ ATENCIÓN: ¿Estás ABSOLUTAMENTE SEGURO de eliminar a TODAS las personas?", { title: 'Vaciar Directorio', kind: 'warning' });
    if (!confirmado) return;
    try { await eliminarTodasLasPersonas(circuitoId); await cargar(); } 
    catch (error) { await messageDialog("Ocurrió un error.", { title: 'Error', kind: 'error' }); }
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

    <div class="filter-select card-global relativo">
      <button class="btn-abrir-filtro-main" on:click={() => mostrarMenuFiltros = !mostrarMenuFiltros}>
        <Filter size={18} color="var(--text-muted)" />
        <span class="texto-filtro">{filtrosSeleccionados.length === 0 ? 'Filtrar...' : filtrosSeleccionados.length === 1 ? filtrosSeleccionados[0] : `Filtros (${filtrosSeleccionados.length})`}</span>
        <ChevronDown size={16} color="var(--text-muted)" />
      </button>

      {#if mostrarMenuFiltros}
        <div class="menu-flotante-checkboxes menu-filtros">
          <div class="header-menu-filtros">
            <span class="titulo-f">Filtros</span>
            {#if filtrosSeleccionados.length > 0}<button class="btn-limpiar-filtros" on:click={() => filtrosSeleccionados = []}>Limpiar</button>{/if}
          </div>
          <div class="scroll-filtros">
            {#each categoriasFiltro as cat}
              <div class="categoria-privilegio">
                <div class="categoria-header" role="button" tabindex="0" on:click={() => toggleCategoriaFiltro(cat.nombre)}>
                  <span class="cat-titulo">{cat.nombre}</span>
                  {#if categoriasFiltroExpandidas[cat.nombre]}<ChevronUp size={16} />{:else}<ChevronDown size={16} />{/if}
                </div>
                {#if categoriasFiltroExpandidas[cat.nombre]}
                  <div class="categoria-opciones" transition:slide={{ duration: 200 }}>
                    {#each cat.opciones as priv}
                      <label class="opcion-checkbox">
                        <input type="checkbox" checked={filtrosSeleccionados.includes(priv)} on:change={() => toggleFiltroCheckbox(priv)} />
                        <span class="check-texto">{priv}</span>
                      </label>
                    {/each}
                  </div>
                {/if}
              </div>
            {/each}
          </div>
          <button type="button" class="btn-cerrar-menu" on:click={() => mostrarMenuFiltros = false}>Aplicar y cerrar</button>
        </div>
      {/if}
    </div>

    <div class="filters-aside">
      <button class="btn-importar card-global" on:click={importarCSV}><Upload size={18} /> <span>Importar CSV</span></button>
      <button class="btn-primary-fino" on:click={() => abrirEdicion(null)}><Plus size={18} /> Añadir Persona</button>
      <button class="btn-danger-fino" on:click={borrarTodo} title="Limpiar todo"><Trash2 size={18} /> <span class="texto-btn-danger">Limpiar</span></button>
    </div>
  </div>

  <div class="lista-agrupada">
    {#each congregacionesOrdenadas as nombreCongregacion}
      <div class="grupo-congregacion card-global">
        
        <div class="header-congregacion" role="button" tabindex="0" on:click={() => toggleExpandir(nombreCongregacion)}>
          <div class="titulo-cong"><Users size={20} color="var(--primary)" /><h2>{nombreCongregacion}</h2></div>
          <div class="header-acciones">
            <span class="badge-conteo">{personasAgrupadas[nombreCongregacion].length} personas</span>
            {#if expandidas[nombreCongregacion]}<ChevronUp size={20} color="var(--text-muted)" />{:else}<ChevronDown size={20} color="var(--text-muted)" />{/if}
          </div>
        </div>

        {#if expandidas[nombreCongregacion]}
          <div class="tabla-personas" transition:slide={{ duration: 250 }}>
            {#each personasAgrupadas[nombreCongregacion] as p}
              <div class="persona-row">
                <div class="p-info" role="button" tabindex="0" on:click={() => abrirEdicion(p)}>
                  <span class="p-nombre">{p.apellidos}, {p.nombre}</span>
                  <span class="p-meta">{p.privilegio || 'Publicador'}</span>
                </div>
                
                <div class="p-contacto" style="flex: 2.5; gap: 10px;">
                  
                  {#if p.telefono_celular}
                    <span class="clickable-contact" role="button" tabindex="0" title="Celular (WhatsApp)" on:click={() => abrirWhatsApp(p.telefono_celular, "Hola hermano...")} on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && abrirWhatsApp(p.telefono_celular, "Hola hermano...")}>
                      <Phone size={14}/> {p.telefono_celular}
                    </span>
                  {/if}

                  {#if p.telefono_fijo}<span title="Fijo"><Phone size={14} style="opacity: 0.5;"/> {p.telefono_fijo}</span>{/if}
                  
                  {#if p.email}
                    <span class="clickable-contact" role="button" tabindex="0" title="Correo jwpub" on:click={() => abrirCorreoJWPub(p.email, "Asunto", "Mensaje...")} on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && abrirCorreoJWPub(p.email, "Asunto", "Mensaje...")}>
                      <Mail size={14}/> {p.email}
                    </span>
                  {/if}
                </div>
                
                <div class="p-acciones">
                   <button class="btn-icon-edit" title="Editar" on:click|stopPropagation={() => abrirEdicion(p)}><Edit size={16} /></button>
                   <button class="btn-icon-delete" title="Eliminar" on:click|stopPropagation={() => borrar(p.id, p.nombre)}><Trash2 size={16} /></button>
                </div>
              </div>
            {/each}
          </div>
        {/if}

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
  <NuevaPersonaModal 
    {datosEdicion} 
    {circuitoId}
    {congregacionesOrdenadas} 
    on:close={() => mostrandoModalPersona = false} 
    on:save={handleGuardarPersona} 
  />
{/if}

<style>
  .seccion-personas { padding: 10px; animation: fadeIn 0.3s ease-out; }
  .header-registro { margin-bottom: 30px; }
  .header-registro h1 { font-size: 2.2rem; font-weight: 850; color: var(--text-main); margin: 0; }
  .header-registro p { color: var(--text-muted); margin-top: 5px; }

  .toolbar-modular { display: flex; gap: 15px; align-items: center; margin-bottom: 25px; }
  .search-pill { flex: 1; height: 44px; border-radius: 50px; display: flex; align-items: center; padding: 0 20px; background: var(--bg-panel); border: 1px solid var(--border-color); box-sizing: border-box; }
  .search-input { background: transparent; border: none; outline: none; color: var(--text-main); width: 100%; margin-left: 10px; font-size: 0.9rem; }
  
  .filter-select { height: 44px; border-radius: 50px; display: flex; align-items: center; background: var(--bg-panel); border: 1px solid var(--border-color); flex: 0.7; min-width: 220px; padding: 0; cursor: pointer; position: relative !important; z-index: 99 !important; }
  .btn-abrir-filtro-main { background: transparent; border: none; width: 100%; height: 100%; display: flex; align-items: center; justify-content: space-between; padding: 0 15px; cursor: pointer; border-radius: 50px; }
  .texto-filtro { flex: 1; text-align: left; margin-left: 10px; font-size: 0.9rem; color: var(--text-main); font-weight: 600; }
  .filters-aside { display: flex; gap: 10px; }

  .btn-primary-fino { height: 38px; padding: 0 24px; border-radius: 30px; display: flex; align-items: center; gap: 8px; cursor: pointer; font-weight: 700; font-size: 0.85rem; border: none; background-color: #5c0a1f !important; color: white !important; box-shadow: 0 2px 4px rgba(92, 10, 31, 0.2); }
  .btn-primary-fino:hover { background-color: #3a0411 !important; transform: translateY(-1px); }
  .btn-importar { background-color: #14532d; color: white; border: none; height: 38px; padding: 0 24px; border-radius: 30px; display: flex; align-items: center; gap: 8px; cursor: pointer; font-weight: 700; font-size: 0.85rem; box-shadow: 0 2px 4px rgba(20, 83, 45, 0.2); }
  .btn-danger-fino { background-color: transparent; color: #ef4444; border: 1px solid #ef4444; height: 38px; padding: 0 16px; border-radius: 30px; display: flex; align-items: center; gap: 8px; cursor: pointer; font-weight: 700; font-size: 0.85rem; }

  .lista-agrupada { display: flex; flex-direction: column; gap: 25px; }
  .grupo-congregacion { background: var(--bg-panel); border-radius: var(--radius-lg); border: 1px solid var(--border-color); overflow: hidden; }
  .header-congregacion { background: rgba(100, 116, 139, 0.05); padding: 15px 25px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; cursor: pointer; }
  .titulo-cong { display: flex; align-items: center; gap: 10px; }
  .titulo-cong h2 { margin: 0; font-size: 1.15rem; color: var(--text-main); font-weight: 800; }
  .header-acciones { display: flex; align-items: center; gap: 15px; }
  .badge-conteo { background: var(--bg-app); color: var(--text-muted); padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 700; border: 1px solid var(--border-color); }

  .persona-row { display: flex; align-items: center; padding: 15px 25px; border-bottom: 1px solid var(--border-color); }
  .persona-row:hover { background: rgba(100, 116, 139, 0.05); }
  .p-info { flex: 1.5; display: flex; flex-direction: column; cursor: pointer; }
  .p-nombre { font-weight: 700; color: var(--text-main); font-size: 1rem; }
  .p-meta { font-size: 0.8rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; margin-top: 3px;}
  .p-contacto { flex: 2; display: flex; flex-wrap: wrap; gap: 15px; color: var(--text-muted); font-size: 0.85rem; }
  .p-contacto span { display: flex; align-items: center; gap: 6px; }
  .p-acciones { display: flex; gap: 8px; margin-left: 15px;}
  .btn-icon-edit, .btn-icon-delete { background: #f8fafc; border: 1px solid #e2e8f0; cursor: pointer; opacity: 0.8; padding: 6px; border-radius: 50%; display: flex; }
  .btn-icon-edit { color: var(--primary); }
  .btn-icon-delete { color: #ef4444; }

  /* Menú de filtros */
  .menu-filtros { position: absolute; top: 50px; right: 0; width: 280px; background: var(--bg-panel); border: 1px solid var(--border-color); border-radius: var(--radius-md); box-shadow: 0 10px 25px rgba(0,0,0,0.3); z-index: 99999; display: flex; flex-direction: column; padding: 5px; }
  .scroll-filtros { max-height: 400px; overflow-y: auto; }
  .header-menu-filtros { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border-bottom: 1px solid var(--border-color); }
  .titulo-f { font-weight: 800; font-size: 0.9rem; color: var(--text-main); }
  .btn-limpiar-filtros { background: transparent; border: none; color: #ef4444; font-size: 0.8rem; font-weight: 700; cursor: pointer; }
  .categoria-privilegio { border-bottom: 1px solid var(--border-color); }
  .categoria-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; cursor: pointer; background: rgba(100, 116, 139, 0.05); }
  .cat-titulo { font-size: 0.75rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; }
  .opcion-checkbox { display: flex; align-items: center; gap: 10px; padding: 10px 12px; cursor: pointer; }
  .check-texto { font-size: 0.85rem; color: var(--text-main); font-weight: 600; }
  .btn-cerrar-menu { margin-top: 5px; background: #f8fafc; border: 1px solid var(--border-color); padding: 8px; border-radius: var(--radius-sm); font-weight: 700; color: var(--text-main); cursor: pointer; text-align: center; }
  .vacio { padding: 60px; text-align: center; color: var(--text-muted); display: flex; flex-direction: column; align-items: center; justify-content: center; border: 1px dashed var(--border-color); }

  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
@media (max-width: 768px) {
    .toolbar-modular { 
        flex-direction: column; 
        align-items: stretch; 
        gap: 12px; 
    }
    .search-pill, .filter-select { 
        width: 100% !important; 
        height: 48px !important; 
        min-height: 48px !important; 
        border-radius: 24px !important; 
    }
    .filters-aside { 
        width: 100%; 
        flex-direction: column; /* Cambiamos a columna para que se apilen bien */
        gap: 10px; /* Separación clara entre botones */
        margin-bottom: 10px; /* Separación con la lista de abajo */
    }
    .filters-aside .btn-importar, 
    .filters-aside .btn-primary-fino, 
    .filters-aside .btn-danger-fino { 
        width: 100%; /* Todos los botones del mismo ancho */
        height: 44px !important; 
        justify-content: center; /* Texto centrado */
        border-radius: 22px;
    }
    
    /* Ajustes para las filas de personas en móvil */
    .persona-row { 
        flex-direction: column; 
        align-items: flex-start; 
        position: relative; 
        padding: 15px; 
        gap: 12px; 
    }
    .p-info { padding-right: 60px; } /* Deja espacio para los botones de editar/borrar */
    .p-contacto { 
        flex-direction: column; 
        gap: 8px; 
        width: 100%; 
    }
    .p-acciones { 
        position: absolute; 
        top: 15px; 
        right: 15px; 
        margin-left: 0; 
        gap: 8px; 
    }
  }

  .clickable-contact {
    cursor: pointer;
    transition: color 0.15s ease;
  }
  .clickable-contact:hover {
    color: #2563eb;
    text-decoration: underline;
  }
</style>