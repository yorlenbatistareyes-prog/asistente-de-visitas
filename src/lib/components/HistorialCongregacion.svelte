<script lang="ts">
  import { onMount } from 'svelte';
  import { LazyStore } from '@tauri-apps/plugin-store';
  import { Calendar, ChevronDown, ChevronUp, Trash2, FileText, Clock } from 'lucide-svelte';
  import jsPDF from 'jspdf';
  import { save } from '@tauri-apps/plugin-dialog';
  import { writeFile } from '@tauri-apps/plugin-fs';

  export let nombreCongregacion: string;
  const store = new LazyStore('registro_circuito_v1.json');

  let historial: any[] = [];
  let cargando = true;
  
  // Controla qué tarjetas están abiertas (por su índice)
  let expandidos: Record<number, boolean> = {};

  async function cargarHistorial() {
    cargando = true;
    try {
      const histStore = await store.get<Record<string, any>>('historial') || {};
      const datos = histStore[nombreCongregacion] || [];
      
      // Ordenamos para que la visita más reciente salga arriba
      historial = datos.sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      
      // Expandimos automáticamente la visita más reciente
      if (historial.length > 0) {
        expandidos[0] = true;
      }
    } catch (e) {
      console.error(e);
    } finally {
      cargando = false;
    }
  }

  onMount(cargarHistorial);

  function toggleExpandir(index: number) {
    expandidos[index] = !expandidos[index];
  }

  async function eliminarVisita(index: number) {
    if (!confirm("¿Seguro que deseas eliminar este registro del historial? Esta acción no se puede deshacer.")) return;
    
    try {
      const histStore = await store.get<Record<string, any>>('historial') || {};
      histStore[nombreCongregacion] = historial.filter((_, i) => i !== index);
      
      await store.set('historial', histStore);
      await store.save();
      
      await cargarHistorial(); // Recargamos la lista visual
    } catch(e) {
      alert("Error al eliminar del historial.");
    }
  }

  async function exportarPDF(visita: any) {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.text(`Historial: ${nombreCongregacion}`, 14, 20);
    
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    doc.text(`Visita de la semana: ${visita.fecha}`, 14, 27);
    
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    
    // Divide el texto largo en líneas para que quepa en el ancho del PDF
    const lineas = doc.splitTextToSize(visita.contenido, 180);
    doc.text(lineas, 14, 40);
    
    const nombreSeguro = nombreCongregacion.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9\s]/g, "_");
    const res = await save({ defaultPath: `Historial_${nombreSeguro}_${visita.fecha}.pdf`, filters: [{ name: 'PDF', extensions: ['pdf'] }] });
    
    if (res) {
      await writeFile(res, new Uint8Array(doc.output('arraybuffer')));
      alert("✅ PDF del historial exportado.");
    }
  }
</script>

<div class="historial-layout">
  {#if cargando}
    <div class="estado-vacio">
      <p>Cargando historial...</p>
    </div>
  {:else if historial.length === 0}
    <div class="estado-vacio">
      <Clock size={48} color="#cbd5e1" />
      <h3>Historial Vacío</h3>
      <p>Aún no has finalizado ninguna visita para {nombreCongregacion}.</p>
    </div>
  {:else}
    <div class="timeline">
      {#each historial as visita, i}
        <div class="historial-card {expandidos[i] ? 'expandida' : ''}">
          <div class="card-header" on:click={() => toggleExpandir(i)}>
            <div class="header-info">
              <Calendar size={18} color="#2563eb" />
              <span class="fecha">Semana del <strong>{visita.fecha}</strong></span>
            </div>
            <div class="header-actions">
              {#if expandidos[i]}
                <ChevronUp size={20} color="#64748b" />
              {:else}
                <ChevronDown size={20} color="#64748b" />
              {/if}
            </div>
          </div>

          {#if expandidos[i]}
            <div class="card-body">
              <div class="contenido-texto">
                {#each visita.contenido.split('\n\n') as parrafo}
                   <p style="margin-bottom: 10px;">
                     {@html parrafo.replace(/^([^:]+):/, '<strong style="color: #1e293b; font-weight: 800;">$1:</strong>')}
                   </p>
                {/each}
              </div>
              
              <div class="card-footer">
                <button class="btn-accion btn-outline" on:click={() => exportarPDF(visita)}>
                  <FileText size={16} /> Exportar PDF
                </button>
                <button class="btn-accion btn-danger" on:click={() => eliminarVisita(i)}>
                  <Trash2 size={16} /> Eliminar
                </button>
              </div>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .historial-layout { max-width: 900px; margin: 0 auto; animation: fadeIn 0.3s ease; }
  
  .estado-vacio { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; color: #64748b; text-align: center; background: white; border-radius: 16px; border: 1px dashed #cbd5e1; }
  .estado-vacio h3 { margin: 15px 0 5px; color: #1e293b; font-size: 1.2rem; }
  .estado-vacio p { margin: 0; font-size: 0.95rem; }

  .timeline { display: flex; flex-direction: column; gap: 15px; }

  .historial-card { background: white; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; transition: all 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.02); }
  .historial-card:hover { border-color: #cbd5e1; }
  .historial-card.expandida { border-color: #93c5fd; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }

  .card-header { display: flex; justify-content: space-between; align-items: center; padding: 18px 20px; background: #f8fafc; cursor: pointer; user-select: none; }
  .header-info { display: flex; align-items: center; gap: 10px; font-size: 1.05rem; color: #334155; }
  .header-info strong { color: #0f172a; }

  .card-body { padding: 25px 20px; border-top: 1px solid #e2e8f0; animation: slideDown 0.2s ease-out; }
  
  /* ESTO ES MAGIA: Respeta los saltos de línea del texto guardado */
  .contenido-texto { 
    white-space: pre-wrap; 
    font-size: 0.95rem; 
    line-height: 1.8; 
    color: #334155; 
    margin-bottom: 25px;
    background: #f1f5f9; /* Fondo gris muy suave para el área de texto */
    padding: 20px;
    border-radius: 12px;
    border-left: 4px solid #2563eb; /* Una línea azul que le da elegancia */
  }

  .card-footer { display: flex; justify-content: flex-end; gap: 10px; padding-top: 15px; border-top: 1px dashed #e2e8f0; }
  
  .btn-accion { display: flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: 0.2s; border: none; }
  .btn-outline { background: white; border: 1px solid #cbd5e1; color: #475569; }
  .btn-outline:hover { background: #f1f5f9; color: #0f172a; }
  .btn-danger { background: #fff1f2; color: #e11d48; }
  .btn-danger:hover { background: #ffe4e6; color: #be123c; }

  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes slideDown { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
</style>