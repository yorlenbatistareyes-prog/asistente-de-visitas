<script lang="ts">
  import { 
    MapPin, ChevronRight, Plus, Calendar, 
    FileText, Users, Folder, Clock, Settings 
  } from "lucide-svelte";

  import NuevaCongregacionModal from "../modals/NuevaCongregacionModal.svelte";

  interface Congregacion { 
    nombre: string; 
    enVisita: boolean; 
  }

  export let circuitoNombre: string = "Holguín-14";

  let datos: Record<string, Congregacion[]> = {
    "Holguín-14": [
      { nombre: "AEROPUERTO", enVisita: true }, 
      { nombre: "CACOCUM", enVisita: false }
    ],
    "Holguín-15": [
      { nombre: "Pueblo Nuevo", enVisita: false }
    ]
  };

  let seleccionado = "AEROPUERTO";
  let mostrarModal = false;

  function abrirModal() {
    console.log("Dashboard: abrirModal()");
    mostrarModal = true;
  }

  const secciones = [
    { titulo: "Programación", icon: Calendar },
    { titulo: "Informes", icon: FileText },
    { titulo: "Registro de personas", icon: Users },
    { titulo: "Documentos", icon: Folder },
    { titulo: "Asuntos pendientes", icon: Clock }
  ];

  $: lista = datos[circuitoNombre] || [];
</script>

<div class="dashboard">
  <aside class="sidebar-cong">
    <div class="label-box">
      <MapPin size={12} /> 
      <span>CONGREGACIONES</span>
    </div>

    <div class="items">
      {#each lista as cong}
        <button 
          class="item {seleccionado === cong.nombre ? 'active' : ''}" 
          on:click={() => seleccionado = cong.nombre}
        >
          {cong.nombre} 
          <ChevronRight size={14} />
        </button>
      {/each}

      <button class="add-btn" on:click={abrirModal}>
        <Plus size={16} /> Nueva Congregación
      </button>
    </div>
  </aside>

  <main class="main-panel">
    <div class="header-cong">
      <h2>Congregación <strong>{seleccionado}</strong></h2>

      {#if lista.find(c => c.nombre === seleccionado)?.enVisita}
        <span class="badge">EN VISITA</span>
      {/if}

      <button class="config-btn">
        <Settings size={14} /> Configuración
      </button>
    </div>

    <div class="grid">
      {#each secciones as s}
        <div class="card">
          <div class="icon-wrap">
            <svelte:component this={s.icon} size={20} />
          </div>

          <div class="text">
            <h3>{s.titulo}</h3>
            <span>Acceder a sección</span>
          </div>
        </div>
      {/each}
    </div>
  </main>
</div>

{#if mostrarModal}
  <NuevaCongregacionModal 
    on:close={() => {
      console.log("Dashboard: on:close recibido");
      mostrarModal = false;
    }}
    on:save={(e) => {
      console.log("Dashboard: on:save recibido =>", e.detail);
      const nueva = e.detail;

      datos[circuitoNombre] = [
        ...(datos[circuitoNombre] || []),
        {
          nombre: nueva.nombre.toUpperCase(),
          enVisita: false
        }
      ];

      mostrarModal = false;
    }}
  />
{/if}

<style>
  .dashboard { display: flex; gap: 20px; padding: 20px; background: #f8fafc; height: 100%; }
  .sidebar-cong { width: 240px; background: white; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; }
  .label-box { display: flex; align-items: center; gap: 5px; color: #94a3b8; font-size: 10px; font-weight: bold; margin-bottom: 15px; }
  .items { display: flex; flex-direction: column; gap: 5px; }
  .item { width: 100%; display: flex; justify-content: space-between; padding: 10px; border: none; background: none; border-radius: 8px; color: #64748b; font-weight: 600; cursor: pointer; text-align: left; transition: 0.2s; }
  .item:hover { background: #f1f5f9; }
  .item.active { background: #fff1f2; color: #e11d48; }
  .add-btn { width: 100%; margin-top: 15px; display: flex; align-items: center; justify-content: center; gap: 8px; color: #e11d48; background: none; border: 1px dashed #fecaca; padding: 10px; border-radius: 10px; cursor: pointer; font-weight: 600; font-size: 13px; transition: 0.2s; }
  .add-btn:hover { background: #fff1f2; border-color: #e11d48; }
  .main-panel { flex: 1; }
  .header-cong { display: flex; align-items: center; gap: 15px; margin: 25px 0; }
  .badge { background: #dcfce7; color: #16a34a; padding: 3px 10px; border-radius: 15px; font-size: 11px; font-weight: bold; }
  .config-btn { display: flex; align-items: center; gap: 5px; background: white; border: 1px solid #e2e8f0; padding: 5px 12px; border-radius: 8px; color: #64748b; font-size: 12px; cursor: pointer; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 15px; }
  .card { background: white; padding: 24px; border-radius: 16px; display: flex; align-items: center; gap: 15px; border: 1px solid #f1f5f9; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); cursor: pointer; transition: 0.2s; }
  .card:hover { border-color: #e11d48; transform: translateY(-2px); }
  .icon-wrap { background: #f1f5f9; padding: 12px; border-radius: 12px; color: #64748b; display: flex; align-items: center; justify-content: center; }
  .text h3 { margin: 0; font-size: 16px; color: #1e293b; font-weight: 700; }
  .text span { font-size: 13px; color: #94a3b8; }
</style>