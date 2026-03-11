<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { Plus, Users, MapPin, Calendar, Upload, Edit, Trash2, Search } from "lucide-svelte"; 
  import Papa from 'papaparse'; 
  
  import { fechaPorCongregacion } from '$lib/stores/appStore'; 
  import NuevaCongregacionModal from "$lib/components/modals/NuevaCongregacionModal.svelte";

  import { 
    obtenerCircuitoPorId, 
    obtenerCongregaciones, 
    guardarCongregacion,
    eliminarCongregacion,
    initDB, // <-- IMPORTANTE: Añadimos initDB para las fechas
    type Circuito,
    type Congregacion 
  } from '$lib/services/db'; // Ajusta la ruta si tu archivo db.ts está en otra carpeta

  $: idCircuito = Number($page.params.id);

  // --- ESTADO LOCAL ---
  let circuitoActual: Circuito | null = null;
  let lista: Congregacion[] = [];
  let mostrarModal = false;
  let datosEdicion: Congregacion | null = null;
  let busqueda = "";

  // --- FILTRADO REACTIVO ---
  $: listaFiltrada = lista.filter(cong =>
    cong.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (cong.ciudad || "").toLowerCase().includes(busqueda.toLowerCase())
  );

  // --- CARGA DE DATOS Y FECHAS (SQLITE) ---
  async function cargarDatos() {
    circuitoActual = await obtenerCircuitoPorId(idCircuito);
    
    if (circuitoActual) {
      const resultados = await obtenerCongregaciones(circuitoActual.nombre);
      lista = [...resultados];

      // NUEVO: Buscar la última visita de cada congregación en el historial real
      try {
        const db = await initDB();
        let fechasActualizadas: Record<string, string> = {};
        
        for (const cong of lista) {
          if (cong.id) {
            // Buscamos solo la fecha más reciente (LIMIT 1)
            const res = await db.select<{fecha: string}[]>(
              'SELECT fecha FROM historial_visitas WHERE congregacion_id = $1 ORDER BY fecha DESC LIMIT 1',
              [cong.id]
            );
            if (res.length > 0) {
              fechasActualizadas[cong.nombre] = res[0].fecha;
            }
          }
        }
        // Llenamos el Store visual con la verdad de la base de datos
        fechaPorCongregacion.set(fechasActualizadas);
      } catch (e) {
        console.error("Error al cargar fechas del historial:", e);
      }
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
    datosEdicion = { ...cong };
    mostrarModal = true;
  }

  async function borrar(id: number | undefined, nombre: string) {
    if (id && window.confirm(`¿Estás seguro de que deseas eliminar la congregación "${nombre}"? Todo su historial también se borrará.`)) {
      await eliminarCongregacion(id);
      await cargarDatos();
    }
  }

  // Lógica del Modal extraída para mayor limpieza
  async function handleGuardarCongregacion(e: CustomEvent) {
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
      <label class="btn-importar">
         <Upload size={18} /> <span>Importar CSV</span>
         <input type="file" accept=".csv" on:change={importarCSV} hidden />
      </label>

      <button class="btn-global btn-primary" on:click={abrirModal}>
        <Plus size={18} /> Añadir Congregación
      </button>
    </div>
  </div>

  <div class="search-bar">
    <Search size={16} />
    <input
      type="text"
      placeholder="Buscar congregación o ciudad..."
      bind:value={busqueda}
    />
  </div>

  <div class="grid-congregaciones">
    {#each listaFiltrada as cong}
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

    {#if listaFiltrada.length === 0}
      <div class="card-global empty-state">
        <Users size={48} color="var(--text-muted)" />
        <p>
          {#if busqueda}
            No se encontraron resultados para "<strong>{busqueda}</strong>".
          {:else}
            Aún no hay congregaciones en este circuito.<br>Haz clic en "Añadir Congregación" o "Importar JW" para comenzar.
          {/if}
        </p>
      </div>
    {/if}
  </div>
</div>

{#if mostrarModal}
  <NuevaCongregacionModal 
    {datosEdicion}
    on:close={() => { mostrarModal = false; }}
    on:save={handleGuardarCongregacion}
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

  /* BARRA DE BÚSQUEDA */
  .search-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    background: var(--bg-panel);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 0 16px;
    height: 44px;
    margin-bottom: 24px;
    color: var(--text-muted);
    max-width: 1200px;
  }

  .search-bar input {
    border: none;
    background: transparent;
    outline: none;
    font-size: 0.9rem;
    color: var(--text-main);
    width: 100%;
  }

  .search-bar input::placeholder {
    color: var(--text-muted);
  }

  .grid-congregaciones {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
  }

  .cong-card {
    display: flex;
    align-items: center;
    gap: 15px;
    padding: 20px;
    text-align: left;
    cursor: pointer;
    border: 1px solid var(--border-color);
    background: var(--bg-panel); 
    position: relative;
  }

  .cong-card:hover { border-color: var(--primary); }

  .card-icon {
    background: rgba(100, 116, 139, 0.1); /* Dinámico para modo oscuro/claro */
    color: var(--text-muted);
    padding: 15px;
    border-radius: 12px;
    transition: all 0.2s;
  }

  .cong-card:hover .card-icon {
    background: rgba(225, 29, 72, 0.1);
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

  .btn-importar {
    background: #16a34a;
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

  .btn-importar:hover { background: #15803d; }
</style>