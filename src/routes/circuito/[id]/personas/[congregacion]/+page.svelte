<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { slide } from 'svelte/transition';
  import { Phone, Mail, Edit, Trash2, ArrowLeft, User, ChevronDown, ChevronUp } from 'lucide-svelte';
  import { confirm as confirmDialog } from '@tauri-apps/plugin-dialog';
  import { abrirWhatsApp, abrirCorreoJWPub } from '$lib/utils/contacto';
  
  import { obtenerPersonasPorCircuito, eliminarPersona, guardarPersona, type Persona } from '$lib/services/db';
  import NuevaPersonaModal from '$lib/components/modals/NuevaPersonaModal.svelte';

  $: circuitoId = Number($page.params.id);
  $: nombreCongregacion = decodeURIComponent($page.params.congregacion || '');

  let personasCongregacion: Persona[] = [];
  let mostrandoModalPersona = false;
  let datosEdicion: Persona | null = null;

  // --- CONTROL DEL ACORDEÓN ---
  let expandidos: Record<number, boolean> = {};

  function toggleExpandir(id: number | undefined) {
    if (!id) return;
    expandidos[id] = !expandidos[id];
  }

  // Extrae y formatea los privilegios para las etiquetas
  function obtenerEtiquetas(privilegio: string | undefined) {
    if (!privilegio) return [];
    return privilegio.split(',').map(p => {
      let texto = p.trim();
      if (texto.length > 3) {
        return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
      }
      return texto; 
    });
  }

  async function cargar() {
    if (!circuitoId) return;
    try {
      const todas = await obtenerPersonasPorCircuito(circuitoId);
      personasCongregacion = todas.filter(p => 
        (p.congregacion || '').trim().toUpperCase() === nombreCongregacion.trim().toUpperCase() ||
        (nombreCongregacion === 'SIN CONGREGACIÓN ASIGNADA' && !(p.congregacion || '').trim())
      );
    } catch (error) { console.error("Error al cargar:", error); }
  }

  $: if (circuitoId && nombreCongregacion) { cargar(); }

  function volver() { goto(`/circuito/${circuitoId}/personas`); }

  function abrirEdicion(persona: Persona) {
    datosEdicion = { ...persona }; 
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
    const confirmado = await confirmDialog(`¿Seguro que deseas eliminar a "${nombre}"?`, { title: 'Eliminar Persona', kind: 'warning' });
    if (confirmado) {
      try { await eliminarPersona(id); await cargar(); } 
      catch (e) { alert("Error al eliminar."); }
    }
  }
</script>

<div class="pagina-detalle">
  <div class="header-nav">
    <button class="btn-volver" on:click={volver}>
      <ArrowLeft size={18} /> Volver a Congregaciones
    </button>
  </div>
  
  <div class="cabecera-congregacion card-global">
    <h1>{nombreCongregacion}</h1>
    <p><strong>{personasCongregacion.length}</strong> hermanos registrados en esta lista</p>
  </div>

  <div class="lista-acordeon card-global">
    {#each personasCongregacion as p}
      <div class="persona-row">
        <!-- CABECERA DE LA FILA (Siempre visible) -->
        <div class="persona-header" on:click={() => toggleExpandir(p.id)} role="button" tabindex="0" on:keydown={(e) => e.key === 'Enter' && toggleExpandir(p.id)}>
          
          <div class="p-avatar-nombre">
            <div class="avatar-circulo">
              <User size={24} color="#94a3b8" />
            </div>
            <span class="p-nombre">{p.apellidos}, {p.nombre} {p.segundo_nombre || ''}</span>
          </div>

          <div class="p-etiquetas-flecha">
            <div class="badges-container">
              {#each obtenerEtiquetas(p.privilegio) as etiqueta}
                <span class="badge-privilegio">{etiqueta}</span>
              {/each}
            </div>
            {#if expandidos[p.id]}
              <ChevronUp size={20} color="#64748b" />
            {:else}
              <ChevronDown size={20} color="#64748b" />
            {/if}
          </div>
        </div>

        <!-- DETALLES DESPLEGABLES (Solo visible al hacer clic) -->
        {#if expandidos[p.id]}
          <div class="persona-detalles" transition:slide={{ duration: 200 }}>
            <div class="detalles-grid">
              
              <div class="detalle-item">
                <span class="detalle-label">Correo electrónico</span>
                <span class="detalle-valor">
                  {#if p.email}
                    <span class="clickable-contact" role="button" tabindex="0" on:click={() => abrirCorreoJWPub(p.email, "Asunto", "Mensaje...")}>{p.email}</span>
                  {:else}-{/if}
                </span>
              </div>
              
              <div class="detalle-item">
                <span class="detalle-label">Teléfono celular</span>
                <span class="detalle-valor">
                  {#if p.telefono_celular}
                    <span class="clickable-contact" role="button" tabindex="0" on:click={() => abrirWhatsApp(p.telefono_celular, "Hola hermano...")}>{p.telefono_celular}</span>
                  {:else}-{/if}
                </span>
              </div>

              <div class="detalle-item">
                <span class="detalle-label">Teléfono fijo</span>
                <span class="detalle-valor">{p.telefono_fijo || '-'}</span>
              </div>

              <div class="detalle-item">
                <span class="detalle-label">Dirección postal</span>
                <span class="detalle-valor">{p.direccion || '-'}</span>
              </div>

              <div class="detalle-item">
                <span class="detalle-label">Congregación</span>
                <span class="detalle-valor">{p.congregacion || '-'}</span>
              </div>

            </div>

            <div class="detalles-acciones">
              <button class="btn-editar-detalle" on:click={() => abrirEdicion(p)}><Edit size={16}/> Editar datos</button>
              <button class="btn-borrar-detalle" on:click={() => borrar(p.id, p.nombre)}><Trash2 size={16}/> Eliminar</button>
            </div>
          </div>
        {/if}
      </div>
    {:else}
      <div class="vacio">
        <User size={48} color="var(--border-color)" style="margin-bottom: 15px;" />
        <p>No hay hermanos en esta congregación.</p>
      </div>
    {/each}
  </div>
</div>

{#if mostrandoModalPersona}
  <NuevaPersonaModal 
    {datosEdicion} 
    {circuitoId}
    congregacionesOrdenadas={[nombreCongregacion]} 
    on:close={() => mostrandoModalPersona = false} 
    on:save={handleGuardarPersona} 
  />
{/if}

<style>
  .pagina-detalle { padding: 10px 20px; max-width: 1000px; margin: 0 auto; animation: fadeIn 0.3s ease-out; }
  .header-nav { margin-bottom: 20px; }
  .btn-volver { display: flex; align-items: center; gap: 8px; background: transparent; border: none; font-weight: 700; color: #1e3a8a; cursor: pointer; font-size: 0.95rem; padding: 8px 12px; border-radius: 8px; transition: background 0.2s; }
  .btn-volver:hover { background: rgba(30, 58, 138, 0.1); }
  
  .card-global { background: var(--bg-panel); border: 1px solid var(--border-color); border-radius: 8px; }
  .cabecera-congregacion { padding: 25px 30px; margin-bottom: 25px; border-top: 4px solid #1e3a8a; }
  .cabecera-congregacion h1 { margin: 0 0 10px 0; font-size: 1.8rem; color: var(--text-main); font-weight: 850; text-transform: uppercase; }
  .cabecera-congregacion p { margin: 0; color: var(--text-muted); font-size: 0.95rem; }
  
  .lista-acordeon { overflow: hidden; }
  .persona-row { border-bottom: 1px solid var(--border-color); }
  .persona-row:last-child { border-bottom: none; }

  /* --- CABECERA DE LA FILA --- */
  .persona-header { display: flex; justify-content: space-between; align-items: center; padding: 15px 25px; cursor: pointer; transition: background-color 0.2s ease; outline: none; }
  .persona-header:hover, .persona-header:focus-visible { background-color: rgba(100, 116, 139, 0.05); }

  .p-avatar-nombre { display: flex; align-items: center; gap: 15px; }
  .avatar-circulo { width: 45px; height: 45px; background-color: #e2e8f0; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .p-nombre { font-size: 1.05rem; font-weight: 600; color: var(--text-main); }

  /* --- ETIQUETAS --- */
  .p-etiquetas-flecha { display: flex; align-items: center; gap: 15px; }
  .badges-container { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
  .badge-privilegio { background-color: #f1f5f9; color: #475569; padding: 4px 12px; border-radius: 12px; font-size: 0.8rem; font-weight: 600; border: 1px solid #e2e8f0; }

  /* --- DETALLES DESPLEGABLES --- */
  .persona-detalles { padding: 20px 25px 25px 85px; background-color: transparent; border-top: 1px dashed #e2e8f0; }
  .detalles-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 25px; }
  .detalle-item { display: flex; flex-direction: column; gap: 5px; }
  .detalle-label { font-size: 0.8rem; color: var(--text-muted); font-weight: 600; }
  .detalle-valor { font-size: 0.95rem; color: var(--text-main); }
  
  .clickable-contact { cursor: pointer; color: #1e3a8a; transition: color 0.15s; font-weight: 500; }
  .clickable-contact:hover { color: #2563eb; text-decoration: underline; }

  /* --- BOTONES DE ACCIÓN --- */
  .detalles-acciones { display: flex; gap: 10px; }
  .btn-editar-detalle, .btn-borrar-detalle { display: flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 6px; font-weight: 600; font-size: 0.85rem; cursor: pointer; border: 1px solid transparent; transition: all 0.2s; }
  .btn-editar-detalle { background-color: #f0fdf4; color: #166534; border-color: #bbf7d0; }
  .btn-editar-detalle:hover { background-color: #dcfce3; }
  .btn-borrar-detalle { background-color: #fef2f2; color: #991b1b; border-color: #fecaca; }
  .btn-borrar-detalle:hover { background-color: #fee2e2; }

  .vacio { padding: 60px; text-align: center; color: var(--text-muted); display: flex; flex-direction: column; align-items: center; justify-content: center; }

  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

  @media (max-width: 768px) {
    .persona-header { flex-direction: column; align-items: flex-start; gap: 15px; }
    .p-etiquetas-flecha { width: 100%; justify-content: space-between; padding-left: 60px; }
    .badges-container { justify-content: flex-start; }
    .persona-detalles { padding: 20px; } /* Quita el margen izquierdo en móvil para ganar espacio */
    .detalles-acciones { flex-direction: column; }
    .btn-editar-detalle, .btn-borrar-detalle { justify-content: center; width: 100%; }
  }
</style>