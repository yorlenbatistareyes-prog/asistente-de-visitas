<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores'; // SvelteKit nos da acceso a la URL
  import { Search, Upload, Plus, Trash2, Phone, Mail, User, MapPin } from "lucide-svelte";
  import Papa from 'papaparse';
  import { 
    obtenerPersonasPorCircuito, 
    guardarPersona, 
    eliminarPersona, 
    type Persona 
  } from '$lib/services/db';

  // 1. CAPTURAMOS EL ID DIRECTAMENTE DE LA URL (Ej: /circuito/3 -> ID = 3)
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

  // 2. REACTIVIDAD: Si el ID cambia, recargamos la lista automáticamente
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

  $: filtradas = personas.filter(p => 
    `${p.nombre} ${p.apellidos}`.toLowerCase().includes(busqueda.toLowerCase()) ||
    (p.congregacion || "").toLowerCase().includes(busqueda.toLowerCase())
  );

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
              circuito_id: circuitoId, // Guardado con el ID robusto
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

  async function guardarManual() {
    if (!nuevaP.nombre.trim() || !nuevaP.apellidos.trim()) {
      alert("El nombre y los apellidos son obligatorios");
      return;
    }
    
    try {
      nuevaP.circuito_id = circuitoId; // Aseguramos el ID antes de guardar
      await guardarPersona(nuevaP);
      mostrandoModalPersona = false;
      resetForm();
      await cargar(); 
    } catch (err) {
      console.error("Error al guardar manual:", err);
    }
  }

  async function borrar(id: number | undefined, nombre: string) {
    if (id && confirm(`¿Eliminar a ${nombre}?`)) {
      await eliminarPersona(id);
      await cargar();
    }
  }
</script>

<div class="seccion-personas">
  <div class="header-registro">
    <h1>Personas</h1>
    <p>{filtradas.length} hermanos registrados en este circuito</p>
  </div>

  <div class="toolbar-modular">
    <div class="search-pill card-global">
      <Search size={18} class="search-icon" />
      <input type="text" placeholder="Buscar por nombre o congregación..." bind:value={busqueda} class="search-input" />
    </div>

    <div class="filters-aside">
      <label class="filter-item btn-secundario card-global">
        <Upload size={18} /> <span>Importar JW</span>
        <input type="file" accept=".csv" on:change={importarCSV} hidden />
      </label>
      
      <button class="btn-primary-fino" on:click={() => (mostrandoModalPersona = true)}>
        <Plus size={18} /> Añadir Persona
      </button>
    </div>
  </div>

  <div class="tabla-personas card-global">
    {#each filtradas as p}
      <div class="persona-row">
        <div class="p-info">
          <span class="p-nombre">{p.nombre} {p.apellidos}</span>
          <span class="p-meta">{p.privilegio || 'Publicador'} • {p.congregacion || 'Sin Congregación'}</span>
        </div>
        <div class="p-contacto">
          {#if p.telefono_celular}<span title="Celular"><Phone size={14}/> {p.telefono_celular}</span>{/if}
          {#if p.email}<span title="Email"><Mail size={14}/> {p.email}</span>{/if}
        </div>
        <button class="btn-icon-delete" on:click={() => borrar(p.id, p.nombre)}>
          <Trash2 size={16} />
        </button>
      </div>
    {:else}
      <p class="vacio">No hay personas registradas en este circuito.</p>
    {/each}
  </div>
</div>

{#if mostrandoModalPersona}
  <div class="modal-backdrop">
    <div class="card-global modal-content persona-modal">
      <h2>Registrar Nueva Persona</h2>
      
      <div class="form-grid">
        <div class="col">
          <div class="form-group">
            <label>Nombre *</label>
            <input type="text" class="input-global" bind:value={nuevaP.nombre} />
          </div>
          <div class="form-group">
            <label>Segundo Nombre</label>
            <input type="text" class="input-global" bind:value={nuevaP.segundo_nombre} />
          </div>
          <div class="form-group">
            <label>Apellidos *</label>
            <input type="text" class="input-global" bind:value={nuevaP.apellidos} />
          </div>
          <div class="form-group">
            <label>Congregación</label>
            <input type="text" class="input-global" bind:value={nuevaP.congregacion} />
          </div>
        </div>

        <div class="col">
          <div class="form-group">
            <label>Privilegio</label>
            <input type="text" class="input-global" bind:value={nuevaP.privilegio} placeholder="Ej: Anciano" />
          </div>
          <div class="form-group">
            <label>Teléfono Celular</label>
            <input type="text" class="input-global" bind:value={nuevaP.telefono_celular} />
          </div>
          <div class="form-group">
            <label>Correo Electrónico</label>
            <input type="email" class="input-global" bind:value={nuevaP.email} />
          </div>
          <div class="form-group">
            <label>Dirección Completa</label>
            <textarea class="input-global" bind:value={nuevaP.direccion} rows="2"></textarea>
          </div>
        </div>
      </div>

      <div class="modal-actions">
        <button class="btn-global" on:click={() => (mostrandoModalPersona = false)}>Cancelar</button>
        <button class="btn-global btn-primary" on:click={guardarManual}>Guardar Persona</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .seccion-personas { padding: 10px; }
  .header-registro { margin-bottom: 30px; }
  .header-registro h1 { font-size: 2.2rem; font-weight: 850; color: var(--text-main); margin: 0; }
  .header-registro p { color: var(--text-muted); margin-top: 5px; }

  .toolbar-modular { display: flex; gap: 15px; align-items: center; margin-bottom: 25px; }
  
  .search-pill { 
    flex: 1; height: 44px; border-radius: 50px; display: flex; align-items: center; 
    padding: 0 20px; background: var(--bg-panel); border: 1px solid var(--border-color);
  }
  .search-input { background: transparent; border: none; outline: none; color: var(--text-main); width: 100%; margin-left: 10px; font-size: 0.9rem; }

  .filters-aside { display: flex; gap: 10px; }
  
  .filter-item, .btn-primary-fino {
    height: 44px; padding: 0 18px; border-radius: 12px; display: flex; align-items: center; 
    gap: 8px; cursor: pointer; font-weight: 700; font-size: 0.85rem; border: 1px solid var(--border-color);
  }
  
  .btn-primary-fino { background: var(--primary); color: white; border: none; }
  .btn-secundario { background: var(--bg-panel); color: var(--text-main); }

  .tabla-personas { background: var(--bg-panel); border-radius: var(--radius-lg); overflow: hidden; border: 1px solid var(--border-color); }
  .persona-row { 
    display: flex; align-items: center; padding: 15px 25px; 
    border-bottom: 1px solid var(--border-color); transition: background 0.2s;
  }
  .persona-row:hover { background: rgba(255,255,255,0.02); }
  
  .p-info { flex: 1; display: flex; flex-direction: column; }
  .p-nombre { font-weight: 800; color: var(--text-main); font-size: 1.05rem; }
  .p-meta { font-size: 0.8rem; color: var(--primary); font-weight: 700; text-transform: uppercase; }
  
  .p-contacto { flex: 1; display: flex; gap: 20px; color: var(--text-muted); font-size: 0.85rem; }
  .p-contacto span { display: flex; align-items: center; gap: 6px; }

  .btn-icon-delete { background: transparent; border: none; color: #ef4444; cursor: pointer; opacity: 0.5; }
  .btn-icon-delete:hover { opacity: 1; }

  /* CORRECCIÓN DEL MODAL */
  .modal-backdrop {
    position: fixed; /* Fijo a la pantalla */
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(15, 23, 42, 0.8);
    backdrop-filter: blur(4px);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999; /* Por encima de todo */
    padding: 20px;
  }

  .persona-modal {
    position: relative;
    width: 100%;
    max-width: 700px;
    background: var(--bg-panel);
    border-radius: var(--radius-lg);
    padding: 30px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
    border-top: 5px solid var(--primary);
    animation: scaleIn 0.2s ease-out;
  }

  .form-grid { 
    display: grid; 
    grid-template-columns: 1fr 1fr; 
    gap: 25px; 
    margin: 20px 0; 
    text-align: left; 
  }
  
  .form-group {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .form-group label { font-size: 0.75rem; color: var(--primary); font-weight: 800; text-transform: uppercase; }
  .input-global { height: 38px; font-size: 0.9rem; padding: 0 12px; width: 100%; border-radius: 8px; }
  textarea.input-global { height: auto; padding: 10px; }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 20px;
    border-top: 1px solid var(--border-color);
    padding-top: 15px;
  }

  .vacio { padding: 40px; text-align: center; color: var(--text-muted); font-style: italic; }

  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }

  @media (max-width: 600px) { .form-grid { grid-template-columns: 1fr; } }
</style>