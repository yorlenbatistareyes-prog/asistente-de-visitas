<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { slide } from 'svelte/transition';
  import { Phone, Mail, Edit, Trash2, ArrowLeft, User } from 'lucide-svelte';
  import { confirm as confirmDialog } from '@tauri-apps/plugin-dialog';
  import { abrirWhatsApp, abrirCorreoJWPub } from '$lib/utils/contacto';
  
  import { obtenerPersonasPorCircuito, eliminarPersona, guardarPersona, type Persona } from '$lib/services/db';
  import NuevaPersonaModal from '$lib/components/modals/NuevaPersonaModal.svelte';

  $: circuitoId = Number($page.params.id);
  $: nombreCongregacion = decodeURIComponent($page.params.congregacion || '');

  let personasCongregacion: Persona[] = [];
  let mostrandoModalPersona = false;
  let datosEdicion: Persona | null = null;

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

  <div class="lista-hermanos card-global">
    {#each personasCongregacion as p}
      <div class="persona-row">
        <div class="p-info" role="button" tabindex="0" on:click={() => abrirEdicion(p)}>
          <span class="p-nombre">{p.apellidos}, {p.nombre}</span>
          <span class="p-meta">{p.privilegio || 'Publicador'}</span>
        </div>
        
        <div class="p-contacto" style="flex: 2.5; gap: 10px;">
          {#if p.telefono_celular}
            <span class="clickable-contact" role="button" tabindex="0" on:click={() => abrirWhatsApp(p.telefono_celular, "Hola hermano...")}>
              <Phone size={14}/> {p.telefono_celular}
            </span>
          {/if}

          {#if p.telefono_fijo}
            <span><Phone size={14} style="opacity: 0.5;"/> {p.telefono_fijo}</span>
          {/if}

          {#if p.email}
            <span class="clickable-contact" role="button" tabindex="0" on:click={() => abrirCorreoJWPub(p.email, "Asunto", "Mensaje...")}>
              <Mail size={14}/> {p.email}
            </span>
          {/if}
          
        </div>
        
        <div class="p-acciones">
           <button class="btn-icon-edit" title="Editar" on:click|stopPropagation={() => abrirEdicion(p)}><Edit size={16} /></button>
           <button class="btn-icon-delete" title="Eliminar" on:click|stopPropagation={() => borrar(p.id, p.nombre)}><Trash2 size={16} /></button>
        </div>
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
  
  .lista-hermanos { overflow: hidden; }
  .persona-row { display: flex; align-items: center; padding: 15px 25px; border-bottom: 1px solid var(--border-color); }
  .persona-row:hover { background: rgba(100, 116, 139, 0.05); }
  .p-info { flex: 1.5; display: flex; flex-direction: column; cursor: pointer; }
  .p-nombre { font-weight: 700; color: var(--text-main); font-size: 1rem; }
  .p-meta { font-size: 0.8rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; margin-top: 3px; }
  .p-contacto { flex: 2; display: flex; flex-wrap: wrap; gap: 15px; color: var(--text-muted); font-size: 0.85rem; }
  .p-contacto span { display: flex; align-items: center; gap: 6px; }
  .clickable-contact { cursor: pointer; transition: color 0.15s; }
  .clickable-contact:hover { color: #2563eb; text-decoration: underline; }
  
  .p-acciones { display: flex; gap: 8px; margin-left: 15px; }
  .btn-icon-edit, .btn-icon-delete { background: #f8fafc; border: 1px solid #e2e8f0; cursor: pointer; padding: 6px; border-radius: 50%; display: flex; }
  .btn-icon-edit { color: #2563eb; }
  .btn-icon-delete { color: #ef4444; }
  
  .vacio { padding: 60px; text-align: center; color: var(--text-muted); display: flex; flex-direction: column; align-items: center; justify-content: center; }

  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

  @media (max-width: 768px) {
    .persona-row { flex-direction: column; align-items: flex-start; position: relative; gap: 12px; }
    .p-info { padding-right: 60px; } 
    .p-contacto { flex-direction: column; gap: 8px; width: 100%; }
    .p-acciones { position: absolute; top: 15px; right: 15px; margin-left: 0; }
  }
</style>