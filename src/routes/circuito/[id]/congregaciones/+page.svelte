<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { Plus, Users, MapPin, Calendar, Upload, Edit, Trash2 } from "lucide-svelte"; 
  import Papa from 'papaparse'; 
  
  import { fechaPorCongregacion } from '$lib/stores/appStore'; 
  import NuevaCongregacionModal from "$lib/components/modals/NuevaCongregacionModal.svelte";

  import { 
    obtenerCircuitoPorId, 
    obtenerCongregaciones, 
    guardarCongregacion,
    eliminarCongregacion,
    type Circuito,
    type Congregacion 
  } from '$lib/services/db';

  $: idCircuito = Number($page.params.id);

  // --- ESTADO LOCAL ---
  let circuitoActual: Circuito | null = null;
  let lista: Congregacion[] = [];
  let mostrarModal = false;
  let datosEdicion: Congregacion | null = null;

  // --- CARGA DE DATOS ---
  async function cargarDatos() {
    circuitoActual = await obtenerCircuitoPorId(idCircuito);
    if (circuitoActual) {
      // Forzamos reactividad creando un nuevo array
      const resultados = await obtenerCongregaciones(circuitoActual.nombre);
      lista = [...resultados];
    }
  }

  onMount(cargarDatos);

  $: if (idCircuito) {
    cargarDatos();
  }

  // --- ACCIONES ---
  function abrirModal() {
    datosEdicion = null;
    mostrarModal = true;
  }

  function entrarACongregacion(nombre: string) {
    goto(`/congregacion/${nombre}`);
  }

  function editarCongregacion(cong: Congregacion) {
    datosEdicion = { ...cong }; // Copiamos los datos al modal
    mostrarModal = true;
  }

  async function borrar(id: number | undefined, nombre: string) {
    // Usamos window.confirm para bloquear la ejecución obligatoriamente
    if (id && window.confirm(`¿Estás seguro de que deseas eliminar la congregación "${nombre}"?`)) {
      await eliminarCongregacion(id);
      await cargarDatos(); // Recarga la cuadrícula
    }
  }

  // --- IMPORTACIÓN CSV ---
  async function importarCSV(e: any) {
    if (!circuitoActual) {
      alert("Error: No se ha cargado el circuito actual.");
      return;
    }

    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
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
            console.error("Error guardando congregación:", fila["Congregación"], err);
          }
        }
        
        await cargarDatos(); 
        alert(`✅ Importación completada: ${importadas} congregaciones añadidas.`);
        e.target.value = ""; 
      }
    });
  }
</script>

<div class="congregaciones-layout">
  <div class="header-section">
    <div>
      <h3>Congregaciones</h3>
      <p>Añade y selecciona una congregación para gestionar sus informes.</p>
    </div>
    
    <div style="display: flex; gap: 10px;">
      <label class="btn-secundario">
        <Upload size={18} /> <span>Importar JW</span>
        <input type="file" accept=".csv" on:change={importarCSV} hidden />
      </label>

      <button class="btn-global btn-primary" on:click={abrirModal}>
        <Plus size={18} /> Añadir Congregación
      </button>
    </div>
  </div>

  <div class="grid-congregaciones">
    {#each lista as cong}
      <div class="card-global cong-card" on:click={() => entrarACongregacion(cong.nombre)}>
        <div class="card-icon">
          <Users size={30} />
        </div>
        <div class="card-info">
          <h4>{cong.nombre}</h4>
          
          <div class="meta-row">
            <MapPin size={12} /> 
            <span>{cong.ciudad || 'Ciudad no especificada'}</span>
          </div>
          
          <div class="meta-row">
            <Calendar size={12} /> 
            <span>Última visita: {$fechaPorCongregacion[cong.nombre] || "Sin registrar"}</span>
          </div>
        </div>

        <div class="card-actions">
          <button type="button" class="btn-icon-edit" title="Editar" on:click|preventDefault|stopPropagation={() => editarCongregacion(cong)}>
            <Edit size={18} />
          </button>
          <button type="button" class="btn-icon-delete" title="Eliminar" on:click|preventDefault|stopPropagation={() => borrar(cong.id, cong.nombre)}>
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    {/each}

    {#if lista.length === 0}
      <div class="card-global empty-state">
        <Users size={48} color="#cbd5e1" />
        <p>Aún no hay congregaciones en este circuito.<br>Haz clic en "Añadir Congregación" o "Importar JW" para comenzar.</p>
      </div>
    {/if}
  </div>
</div>

{#if mostrarModal}
  <NuevaCongregacionModal 
    {datosEdicion}
    on:close={() => { mostrarModal = false; }}
    on:save={async (e) => {
      try {
        const nueva = e.detail;
        
        if (circuitoActual) {
          await guardarCongregacion({
            id: nueva.id, 
            circuito: circuitoActual.nombre,
            nombre: nueva.nombre,
            enVisita: nueva.enVisita || false,
            ciudad: nueva.ciudad || "",
            provincia: nueva.provincia || "",
            pais: nueva.pais || "",
            idioma: nueva.idioma || "Español",
            esLenguaSenas: nueva.esLenguaSenas || false,
            telefono: nueva.telefono || "",
            horaSemana: nueva.horaSemana || "",
            horaFinSemana: nueva.horaFinSemana || "",
            diaSemana: nueva.diaSemana || "",
            diaFinSemana: nueva.diaFinSemana || ""
          });
          
          mostrarModal = false;
          await cargarDatos(); 
        }
      } catch (err) {
        console.error("❌ Error guardando la congregación manualmente:", err);
        alert("Ocurrió un error al guardar. Revisa que el nombre no esté duplicado.");
      }
    }}
  />
{/if}

<style>
  .congregaciones-layout {
    animation: fadeIn 0.3s ease-out;
  }

  .header-section {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 30px;
    margin-top: 10px;
  }

  .header-section h3 { margin: 0 0 5px 0; font-size: 1.5rem; color: var(--text-main); font-weight: 800; }
  .header-section p { margin: 0; color: var(--text-muted); font-size: 0.9rem; }

  /* Estilos para los botones principales */
  .btn-primary {
    background-color: var(--primary);
    color: white;
    border: none;
    height: 44px;
    padding: 0 18px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-weight: 700;
    font-size: 0.85rem;
  }
  .btn-primary:hover { background-color: #be123c; color: white; }

  .btn-secundario {
    background: var(--bg-panel);
    color: var(--text-main);
    border: 1px solid var(--border-color);
    height: 44px;
    padding: 0 18px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-weight: 700;
    font-size: 0.85rem;
  }

  .grid-congregaciones {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
  }

  /* La tarjeta ahora es un div en lugar de un button para permitir botones internos */
  .cong-card {
    display: flex;
    align-items: center;
    gap: 15px;
    padding: 20px;
    text-align: left;
    cursor: pointer;
    border: 2px solid var(--border-color);
    background: var(--bg-panel); 
    position: relative; /* Importante para organizar su contenido */
  }

  .cong-card:hover { border-color: #fecaca; }

  .card-icon {
    background: #f1f5f9;
    color: var(--text-muted);
    padding: 15px;
    border-radius: 12px;
    transition: all 0.2s;
  }

  .cong-card:hover .card-icon {
    background: #fff1f2;
    color: var(--primary);
  }

  .card-info { flex: 1; }
  .card-info h4 { margin: 0 0 10px 0; font-size: 1.15rem; color: var(--text-main); font-weight: 800; }

  .meta-row {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.8rem;
    color: var(--text-muted);
    margin-bottom: 5px;
  }

  /* Estilos para las acciones de la tarjeta */
  .card-actions {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-left: auto;
    padding-left: 10px;
    border-left: 1px solid var(--border-color);
  }

  .btn-icon-edit, .btn-icon-delete {
    background: transparent;
    border: none;
    cursor: pointer;
    opacity: 0.4;
    transition: all 0.2s;
    padding: 2px;
  }

  .btn-icon-edit { color: var(--primary); }
  .btn-icon-delete { color: #ef4444; }

  .btn-icon-edit:hover, .btn-icon-delete:hover {
    opacity: 1;
    transform: scale(1.1);
  }

  .empty-state {
    grid-column: 1 / -1;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 60px;
    border-style: dashed;
    border-color: var(--border-color);
    color: var(--text-muted);
    background: transparent;
  }

  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>
