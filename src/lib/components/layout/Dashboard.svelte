<script lang="ts">
  import { 
    MapPin, ChevronRight, Plus, FileText, Users, Folder, ListChecks, Settings, Pencil, Trash2 
  } from "lucide-svelte";
  import NuevaCongregacionModal from "../modals/NuevaCongregacionModal.svelte";

  // 1. IMPORTAMOS EL STORE (Solo para enviar el número)
  import { listaCongregaciones } from '$lib/stores/appStore';

  interface Congregacion { 
    nombre: string; 
    enVisita: boolean; 
    ciudad?: string;
    provincia?: string;
    pais?: string;
    idioma?: string;
    esLenguaSenas?: boolean;
    telefono?: string;
    horaSemana?: string;
    horaFinSemana?: string;
    diaSemana?: string;
    diaFinSemana?: string;
  }

  export let circuitoNombre: string = "Holguín-14";

  // TUS DATOS ORIGINALES (No los toques, esto garantiza que el Dashboard NO desaparezca)
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
  let mostrarMenuConfig = false;
  let datosEdicion: Congregacion | null = null;

  const secciones = [
    { titulo: "Informes", icon: FileText },
    { titulo: "Documentos", icon: Folder },
    { titulo: "Asuntos pendientes", icon: ListChecks }
  ];

  // Lista de congregaciones del circuito actual
  $: lista = datos[circuitoNombre] || [];

  // 2. EL TRUCO PARA EL CONTADOR:
  // Engañamos al store enviando un array vacío pero con el tamaño de tu lista.
  // Así el contador lee .length y funciona, pero no rompemos tus datos.
  $: {
    if (lista) {
      listaCongregaciones.set(new Array(lista.length).fill({}));
    }
  }

  function abrirModal() {
    datosEdicion = null;
    mostrarModal = true;
  }

  function editarCongregacion() {
    const actual = lista.find(c => c.nombre === seleccionado);
    if (!actual) return;
    datosEdicion = { ...actual };
    mostrarModal = true;
    mostrarMenuConfig = false;
  }

  function eliminarCongregacion() {
    datos[circuitoNombre] = datos[circuitoNombre].filter(
      c => c.nombre !== seleccionado
    );
    seleccionado = datos[circuitoNombre][0]?.nombre || "";
    mostrarMenuConfig = false;
  }
</script>

<div class="dashboard">
  <aside class="sidebar-cong">
    <div class="label-box">
      <MapPin size={12} /> 
      <span>CONGREGACIONES</span>
    </div>

    <div class="scroll-area">
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
      </div>
    </div>

    <button class="add-btn" on:click={abrirModal}>
      <Plus size={16} /> Nueva Congregación
    </button>
  </aside>

  <main class="main-panel">
    <div class="header-cong">
      <h2>Congregación <strong>{seleccionado}</strong></h2>

      {#if lista.find(c => c.nombre === seleccionado)?.enVisita}
        <span class="badge">EN VISITA</span>
      {/if}

      <div class="config-wrapper">
        <button 
          class="config-btn"
          on:click={() => mostrarMenuConfig = !mostrarMenuConfig}
        >
          <Settings size={14} /> Configuración
        </button>

        {#if mostrarMenuConfig}
          <div class="config-menu">
            <button on:click={editarCongregacion}>
              <Pencil size={14} /> Editar congregación
            </button>

            <button class="danger" on:click={eliminarCongregacion}>
              <Trash2 size={14} /> Eliminar congregación
            </button>
          </div>
        {/if}
      </div>
    </div>

    <div class="grid">
      {#each secciones as s}
        <div class="card">
          <div class="icon-wrap">
            <svelte:component this={s.icon} size={30} />
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
    {datosEdicion}
    on:close={() => {
      mostrarModal = false;
      datosEdicion = null;
    }}

    on:save={(e) => {
      const nueva = e.detail;

      // Guardamos TODOS los datos que vienen del modal
      datos[circuitoNombre] = [
        ...(datos[circuitoNombre] || []),
        {
          ...nueva,
          nombre: nueva.nombre.toUpperCase(),
          enVisita: false
        }
      ];

      seleccionado = nueva.nombre.toUpperCase();
      mostrarModal = false;
      datosEdicion = null;
    }}

    on:update={(e) => {
      const editada = e.detail;

      // Actualizamos TODOS los campos de esa congregación
      datos[circuitoNombre] = datos[circuitoNombre].map(c =>
        c.nombre === (datosEdicion?.nombre ?? "")
          ? { 
              ...c, 
              ...editada,
              nombre: editada.nombre.toUpperCase()
            }
          : c
      );

      seleccionado = editada.nombre.toUpperCase();
      mostrarModal = false;
      datosEdicion = null;
    }}
  />
{/if}

<style>
  /* 1. Limpieza global y bloqueo de scroll externo */
  :global(body, html) {
    margin: 0;
    padding: 0;
    height: 100%;
    width: 100%;
    overflow: hidden !important; /* Mantiene la pantalla fija */
  }

  /* 2. El Contenedor Maestro */
  .dashboard { 
    display: flex; 
    gap: 20px; 
    padding: 20px; 
    background: #f8fafc; 
    /* Restamos el espacio de la barra superior para que el botón no se pierda */
    height: calc(100vh - 65px); 
    width: 100vw;
    box-sizing: border-box;
    overflow: hidden;
  }

  /* 3. Sidebar (Columna izquierda) */
  .sidebar-cong { 
    width: 260px; 
    background: white; 
    border-radius: 12px; 
    padding: 20px; 
    border: 1px solid #e2e8f0; 
    display: flex;
    flex-direction: column; 
    height: 100%; 
    max-height: 100%;
    box-sizing: border-box;
    overflow: hidden; 
  }

  .label-box { 
    flex: 0 0 auto; 
    display: flex; 
    align-items: center; 
    gap: 5px; 
    color: #94a3b8; 
    font-size: 10px; 
    font-weight: bold; 
    margin-bottom: 15px; 
  }

  /* LISTA CON SCROLL INTERNO */
  .scroll-area {
    flex: 1 1 auto; 
    overflow-y: auto; 
    min-height: 0; 
    padding-right: 5px;
    margin-bottom: 10px;
  }

  .scroll-area::-webkit-scrollbar { width: 4px; }
  .scroll-area::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }

  .items { display: flex; flex-direction: column; gap: 5px; }

  .item { 
    width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 10px; 
    border: none; background: none; border-radius: 8px; color: #64748b; font-weight: 600; 
    cursor: pointer; transition: 0.2s; 
  }
  .item:hover { background: #f1f5f9; }
  .item.active { background: #fff1f2; color: #e11d48; }

  /* BOTÓN FIJO AL FINAL */
  .add-btn { 
    flex: 0 0 auto; 
    width: 100%; 
    display: flex; align-items: center; justify-content: center; gap: 8px; 
    color: #e11d48; background: none; border: 1px dashed #fecaca; 
    padding: 12px; border-radius: 10px; cursor: pointer; font-weight: 600; 
  }

  /* 4. Panel derecho (Tarjetas) */
  .main-panel { 
    flex: 1; 
    height: 100%; 
    overflow-y: auto; 
    padding-right: 10px; 
  }

  .header-cong { 
    display: flex; 
    align-items: center; 
    gap: 15px; 
    margin-bottom: 25px; 
  }

  /* EL BOTÓN RECUPERADO CON ESTILO PROFESIONAL */
  .config-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    background: white;
    color: #64748b; /* Gris profesional */
    border: 1px solid #e2e8f0;
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  }

  /* Efecto al pasar el puntero */
  .config-btn:hover {
    background: #f8fafc;
    color: #1e293b;
    border-color: #cbd5e1;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  }

  /* Efecto cuando se hace clic */
  .config-btn:active {
    transform: scale(0.98);
    background: #f1f5f9;
  }

  /* Icono de Settings sutil */
  .config-btn :global(svg) {
    color: #94a3b8;
    transition: color 0.2s;
  }

  .config-btn:hover :global(svg) {
    color: #64748b;
  }

  /* MEJORA DEL MENÚ DESPLEGABLE */
  .config-menu { 
    position: absolute; 
    top: 40px; 
    right: 0; 
    background: white; 
    border: 1px solid #e2e8f0; 
    border-radius: 10px; 
    padding: 6px; 
    width: 190px; 
    z-index: 1000; 
    display: flex; 
    flex-direction: column; 
    gap: 4px;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); /* Sombra elegante */
  }

  .config-menu button { 
    display: flex; 
    align-items: center; 
    gap: 10px; 
    background: none; 
    border: none; 
    padding: 8px 12px; 
    cursor: pointer; 
    font-size: 13px; 
    color: #475569; 
    width: 100%; 
    border-radius: 6px; 
    text-align: left; 
    transition: background 0.2s;
  }

  .config-menu button:hover { 
    background: #f1f5f9; 
  }

  .config-menu .danger { 
    color: #dc2626; 
  }

  .config-menu .danger:hover {
    background: #fef2f2;
  }
  
  
  .grid { 
    display: grid; 
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); 
    gap: 15px; 
  }

  /* ESTILO DE TARJETA CON EFECTO HOVER */
  .card { 
    background: white; 
    padding: 40px; 
    border-radius: 20px; 
    display: flex; 
    align-items: center; 
    gap: 30px; 
    border: 2px solid #f1f5f9; 
    cursor: pointer; 
    transition: all 0.3s ease; /* Transición suave para el hover */
  }

  /* Recuperamos el estilo profesional al pasar el puntero */
  .card:hover { 
    border-color: #e11d48; /* Borde rojizo */
    transform: translateY(-5px); /* Elevación */
    box-shadow: 0 10px 20px rgba(225, 29, 72, 0.08); /* Sombra suave */
  }

  .card:hover .icon-wrap {
    background: #fff1f2;
    color: #e11d48;
  }

  .icon-wrap { 
    background: #f1f5f9; 
    padding: 12px; 
    border-radius: 12px; 
    color: #64748b; 
    transition: 0.3s;
  }

  .text h3 { margin: 0; font-size: 18px; color: #1e293b; }

  /* Estilos adicionales para el menú de configuración */
  .config-wrapper { position: relative; }
  .config-menu { 
    position: absolute; top: 35px; right: 0; background: white; 
    border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px; 
    width: 170px; z-index: 1000; display: flex; flex-direction: column; gap: 6px; 
  }
  .config-menu button { 
    display: flex; align-items: center; gap: 8px; background: none; 
    border: none; padding: 6px 10px; cursor: pointer; font-size: 13px; 
    color: #475569; width: 100%; border-radius: 6px; text-align: left; 
  }
  .config-menu button:hover { background: #f1f5f9; }
  .config-menu .danger { color: #dc2626; }
</style>