<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { X, ChevronDown, ChevronUp, Save } from 'lucide-svelte';
  import { slide } from 'svelte/transition';
  import type { Persona } from '$lib/services/db';

  export let datosEdicion: Persona | null = null;
  export let congregacionesOrdenadas: string[] = [];
  export let circuitoId: number;

  const dispatch = createEventDispatcher();

  let form: Persona = {
    circuito_id: circuitoId,
    nombre: "", segundo_nombre: "", apellidos: "",
    privilegio: "", congregacion: "", direccion: "",
    telefono_celular: "", telefono_fijo: "", email: ""
  };

  onMount(() => {
    if (datosEdicion) {
      form = { ...datosEdicion };
    }
  });

  // --- LÓGICA DE PRIVILEGIOS ---
  const categoriasPrivilegios = [
    { nombre: 'Designaciones', opciones: ['PUBLICADOR', 'BETEL', 'VOLUNTARIO A DISTANCIA', 'LDC - SIERVO CONSTRUCCIÓN', 'LDC - VOLUNTARIO CONSTRUCCIÓN', 'PE', 'PET', 'PR'] },
    { nombre: 'Hermanos Nombrados', opciones: ['ANCIANO', 'SM'] },
    { nombre: 'Privilegios', opciones: ['CCA', 'SEC', 'SS', 'SG', 'GA', 'CEH', 'GVP', 'SA', 'SAA'] },
    { nombre: 'Solicitudes Vigentes', opciones: ['A-19', 'A-2'] }
  ];

  let mostrarMenuPrivilegios = false;
  let categoriasExpandidas: Record<string, boolean> = {};

  function toggleCategoriaPrivilegio(nombre: string) {
    categoriasExpandidas[nombre] = !categoriasExpandidas[nombre];
  }

  function togglePrivilegio(priv: string) {
    let actuales = form.privilegio ? form.privilegio.split(',').map(p => p.trim()).filter(Boolean) : [];
    if (actuales.includes(priv)) {
      actuales = actuales.filter(p => p !== priv);
    } else {
      actuales.push(priv);
    }
    form.privilegio = actuales.join(', ');
  }

  function guardar() {
    if (!form.nombre.trim() || !form.apellidos.trim()) {
      alert("El nombre y los apellidos son obligatorios");
      return;
    }
    dispatch('save', form);
  }
</script>

<div class="modal-backdrop" on:click|self={() => dispatch('close')}>
  <div class="card-global modal-content persona-modal">
    
    <div class="modal-header">
      <h2>{form.id ? 'Editar Persona' : 'Registrar Nueva Persona'}</h2>
      <button class="close-btn" on:click={() => dispatch('close')} title="Cerrar"><X size={20} /></button>
    </div>
    
    <div class="modal-body">
      <div class="form-grid">
        <!-- COLUMNA 1: Datos Personales -->
        <div class="col">
          <div class="form-group">
            <label for="nombre_input">Nombre *</label>
            <input id="nombre_input" type="text" class="input-global" bind:value={form.nombre} />
          </div>
          <div class="form-group">
            <label for="segundo_nombre_input">Segundo Nombre</label>
            <input id="segundo_nombre_input" type="text" class="input-global" bind:value={form.segundo_nombre} />
          </div>
          <div class="form-group">
            <label for="apellidos_input">Apellidos *</label>
            <input id="apellidos_input" type="text" class="input-global" bind:value={form.apellidos} />
          </div>
          <div class="form-group">
            <label for="congregacion_input">Congregación</label>
            <input id="congregacion_input" type="text" class="input-global" bind:value={form.congregacion} list="lista-congs" autocomplete="off" />
            <datalist id="lista-congs">
              {#each congregacionesOrdenadas as cong}
                {#if cong !== 'SIN CONGREGACIÓN ASIGNADA'}
                  <option value={cong}></option>
                {/if}
              {/each}
            </datalist>
          </div>
        </div>

        <!-- COLUMNA 2: Privilegios y Contacto -->
        <div class="col">
          <div class="form-group relativo">
            <label for="privilegio_input">Privilegios</label>
            <div class="input-con-desplegable">
              <input id="privilegio_input" type="text" class="input-global" bind:value={form.privilegio} placeholder="Ej: ANCIANO, PRECURSOR..." />
              <button type="button" class="btn-abrir-menu" on:click={() => mostrarMenuPrivilegios = !mostrarMenuPrivilegios}>
                <ChevronDown size={18} />
              </button>
            </div>

            {#if mostrarMenuPrivilegios}
              <div class="menu-flotante-checkboxes">
                {#each categoriasPrivilegios as cat}
                  <div class="categoria-privilegio">
                    <div class="categoria-header" role="button" tabindex="0" on:click={() => toggleCategoriaPrivilegio(cat.nombre)}>
                      <span class="cat-titulo">{cat.nombre}</span>
                      {#if categoriasExpandidas[cat.nombre]} <ChevronUp size={16} /> {:else} <ChevronDown size={16} /> {/if}
                    </div>
                    {#if categoriasExpandidas[cat.nombre]}
                      <div class="categoria-opciones" transition:slide={{ duration: 200 }}>
                        {#each cat.opciones as priv}
                          <label class="opcion-checkbox">
                            <input type="checkbox" checked={(form.privilegio || '').split(',').map(p => p.trim()).includes(priv)} on:change={() => togglePrivilegio(priv)} />
                            <span class="check-texto">{priv}</span>
                          </label>
                        {/each}
                      </div>
                    {/if}
                  </div>
                {/each}
                <button type="button" class="btn-cerrar-menu" on:click={() => mostrarMenuPrivilegios = false}>Cerrar lista</button>
              </div>
            {/if}
          </div>

          <div class="form-group" style="margin-top: 5px;">
            <label for="telefono_celular_input">Teléfono Celular / WhatsApp</label>
            <input id="telefono_celular_input" type="text" class="input-global" bind:value={form.telefono_celular} placeholder="+53..." />
          </div>
          <div class="form-group">
            <label for="telefono_fijo_input">Teléfono Fijo (Opcional)</label>
            <input id="telefono_fijo_input" type="text" class="input-global" bind:value={form.telefono_fijo} />
          </div>
          <div class="form-group">
            <label for="email_input">Correo jwpub.org</label>
            <input id="email_input" type="email" class="input-global" bind:value={form.email} placeholder="hermano@jwpub.org" />
          </div>
          <div class="form-group">
            <label for="direccion_input">Dirección Completa</label>
            <textarea id="direccion_input" class="input-global" bind:value={form.direccion} rows="2"></textarea>
          </div>
        </div>
      </div>
    </div>

    <div class="modal-actions">
      <button class="btn-global" on:click={() => dispatch('close')}>Cancelar</button>
      <button class="btn-global btn-primary" on:click={guardar}>
        <Save size={16} /> {form.id ? 'Actualizar Datos' : 'Guardar Persona'}
      </button>
    </div>
  </div>
</div>

<style>
  .modal-backdrop { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(4px); display: flex; justify-content: center; align-items: center; z-index: 9999; padding: 20px; }
  .modal-content { position: relative; width: 100%; max-width: 750px; background: var(--bg-panel); border-radius: var(--radius-lg); display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); border-top: 5px solid var(--primary); animation: scaleIn 0.2s ease-out; max-height: 90vh; }
  .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 25px; border-bottom: 1px solid var(--border-color); }
  .modal-header h2 { margin: 0; color: var(--text-main); font-size: 1.4rem; }
  .close-btn { background: none; border: none; color: var(--text-muted); cursor: pointer; transition: 0.2s; }
  .close-btn:hover { color: #ef4444; }
  
  .modal-body { padding: 25px; overflow-y: auto; }
  
  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 25px; }
  .col { display: flex; flex-direction: column; gap: 15px; }
  .form-group { display: flex; flex-direction: column; gap: 6px; }
  .form-group label { font-size: 0.75rem; color: var(--text-muted); font-weight: 800; text-transform: uppercase; }
  
  .input-global { height: 42px; font-size: 0.95rem; padding: 0 12px; width: 100%; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-app); color: var(--text-main); transition: border-color 0.2s; }
  .input-global:focus { border-color: var(--primary); outline: none; }
  textarea.input-global { height: auto; padding: 10px; min-height: 60px; resize: vertical; font-family: inherit; }

  /* Menú desplegable */
  .relativo { position: relative; }
  .input-con-desplegable { display: flex; align-items: center; position: relative; }
  .btn-abrir-menu { position: absolute; right: 5px; background: transparent; border: none; cursor: pointer; color: var(--text-muted); padding: 5px; border-radius: 50%; display: flex; transition: background 0.2s; }
  .btn-abrir-menu:hover { background: rgba(0,0,0,0.05); color: var(--text-main); }
  
  .menu-flotante-checkboxes { position: absolute; top: 100%; left: 0; width: 100%; background: var(--bg-panel); border: 1px solid var(--border-color); border-radius: var(--radius-md); box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3); z-index: 99999 !important; margin-top: 5px; max-height: 250px; overflow-y: auto; display: flex; flex-direction: column; padding: 5px; }
  .categoria-privilegio { border-bottom: 1px solid var(--border-color); }
  .categoria-privilegio:last-of-type { border-bottom: none; }
  .categoria-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; cursor: pointer; background: rgba(100, 116, 139, 0.05); transition: background 0.2s; }
  .categoria-header:hover { background: rgba(100, 116, 139, 0.1); }
  .cat-titulo { font-size: 0.75rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
  .opcion-checkbox { display: flex; align-items: center; gap: 10px; padding: 10px 12px; cursor: pointer; border-radius: var(--radius-sm); transition: background 0.2s; }
  .opcion-checkbox:hover { background: rgba(100, 116, 139, 0.05); }
  .opcion-checkbox input[type="checkbox"] { width: 16px; height: 16px; accent-color: #5c0a1f; cursor: pointer; }
  .check-texto { font-size: 0.85rem; color: var(--text-main); font-weight: 600; }
  .btn-cerrar-menu { margin-top: 5px; background: #f8fafc; border: 1px solid var(--border-color); padding: 8px; border-radius: var(--radius-sm); font-weight: 700; color: var(--text-main); cursor: pointer; text-align: center; }

  /* Acciones */
  .modal-actions { padding: 20px 25px; border-top: 1px solid var(--border-color); background: var(--bg-panel); display: flex; justify-content: flex-end; gap: 12px; }
  .btn-global { padding: 0 20px; height: 42px; border-radius: 8px; font-weight: 700; cursor: pointer; border: none; font-size: 0.9rem; transition: all 0.2s; display: flex; align-items: center; gap: 8px; }
  .btn-global:not(.btn-primary) { background: transparent; color: var(--text-muted); border: 1px solid var(--border-color); }
  .btn-global:not(.btn-primary):hover { background: var(--bg-app); color: var(--text-main); }
  .btn-primary { background-color: #5c0a1f !important; color: white !important; border-radius: 30px !important; padding: 0 24px !important; }
  .btn-primary:hover { background-color: #3a0411 !important; transform: translateY(-1px); box-shadow: var(--shadow-sm); }

  @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
  @media (max-width: 600px) { .form-grid { grid-template-columns: 1fr; } }
</style>