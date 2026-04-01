<script lang="ts">
  import { slide } from 'svelte/transition';
  import { ArrowLeft, HelpCircle, ChevronDown, ChevronUp, Database, Map, Users, Settings } from 'lucide-svelte';

  function volver() {
    window.history.back();
  }

  // Controla qué sección está abierta
  let seccionAbierta: string | null = null;

  function toggle(id: string) {
    seccionAbierta = seccionAbierta === id ? null : id;
  }

  const faqs = [
    {
      id: "circuitos",
      icono: Map,
      pregunta: "Gestión de Circuitos",
      respuesta: "En la pantalla principal puedes crear, ver y eliminar circuitos. Un circuito es el contenedor principal. Si eliminas un circuito, ten en cuenta que también se borrarán permanentemente todas las congregaciones y el historial de visitas asociado a él."
    },
    {
      id: "congregaciones",
      icono: Users,
      pregunta: "Añadir y administrar Congregaciones",
      respuesta: "Dentro de cada circuito puedes añadir congregaciones. Aquí registrarás datos como la ubicación, el idioma y los horarios de reunión."
    },
    {
      id: "respaldos",
      icono: Database,
      pregunta: "Copias de Seguridad (Importante)",
      respuesta: "Ve a Configuración > Crear Respaldo para generar un archivo .avisits. Este archivo contiene toda tu información. Si necesitas recuperar datos, usa 'Restaurar Datos' y selecciona ese archivo."
    },
    {
      id: "configuracion",
      icono: Settings,
      pregunta: "Configuración y Perfil",
      respuesta: "Ajusta tu nombre y responsabilidad o asignación para los informes. También puedes gestionar la sincronización en la nube si deseas compartir datos entre dispositivos."
    }
  ];
</script>

<div class="ayuda-page">
  <div class="header-section">
    <div>
      <button class="btn-back" on:click={volver}>
        <ArrowLeft size={20} /> Volver
      </button>
      <h1>Temas de Ayuda</h1>
      <p>Guía rápida para utilizar la aplicación</p>
    </div>
  </div>

  <div class="acordeon-container">
    {#each faqs as faq}
      <div class="acordeon-item card-global" class:abierto={seccionAbierta === faq.id}>
        <button class="acordeon-trigger" on:click={() => toggle(faq.id)}>
          <div class="titulo-wrapper">
            <svelte:component this={faq.icono} size={22} class="icono-seccion" />
            <span>{faq.pregunta}</span>
          </div>
          <div class="icono-accion">
            {#if seccionAbierta === faq.id}
              <ChevronUp size={20} />
            {:else}
              <ChevronDown size={20} />
            {/if}
          </div>
        </button>

        {#if seccionAbierta === faq.id}
          <div class="acordeon-content" transition:slide={{ duration: 250 }}>
            <div class="contenido-interno">
              <p>{faq.respuesta}</p>
            </div>
          </div>
        {/if}
      </div>
    {/each}
  </div>

  <div class="soporte-extra card-global">
    <HelpCircle size={24} class="icono-soporte" />
    <div class="texto-soporte">
      <h3>¿Necesitas más ayuda?</h3>
      <p>Asegúrate de mantener siempre una copia de seguridad reciente de tus datos para evitar pérdidas de información.</p>
    </div>
  </div>
</div>

<style>
  .ayuda-page {
    max-width: 800px;
    margin: 0 auto;
    padding-top: 20px;
  }

  /* --- CABECERA --- */
  .header-section {
    margin-bottom: 40px;
  }
  
  .btn-back {
    display: flex;
    align-items: center;
    gap: 8px;
    background: transparent;
    border: none;
    color: var(--text-muted);
    font-weight: 600;
    cursor: pointer;
    margin-bottom: 15px;
    padding: 0;
    transition: color 0.2s ease;
  }
  
  .btn-back:hover {
    color: #5c0a1f;
  }

  .header-section h1 {
    margin: 0;
    font-size: 2rem;
    font-weight: 800;
    color: var(--text-main);
  }

  .header-section p {
    color: var(--text-muted);
    margin-top: 5px;
    font-size: 1rem;
  }

  /* --- ACORDEÓN --- */
  .acordeon-container {
    display: flex;
    flex-direction: column;
    gap: 15px;
    margin-bottom: 40px;
  }

  /* Aprovechamos card-global pero ajustamos bordes internos */
  .acordeon-item {
    padding: 0; /* Quitamos el padding default de card-global */
    transition: all 0.2s ease;
    border-top: 4px solid transparent;
  }

  .acordeon-item.abierto {
    border-top: 4px solid #5c0a1f;
    box-shadow: var(--shadow-3d);
  }

  .acordeon-trigger {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 25px;
    background: transparent;
    border: none;
    cursor: pointer;
    text-align: left;
    color: var(--text-main);
  }

  .titulo-wrapper {
    display: flex;
    align-items: center;
    gap: 15px;
    font-size: 1.1rem;
    font-weight: 700;
  }

  .icono-seccion {
    color: #5c0a1f; 
    flex-shrink: 0;
  }

  .icono-accion {
    color: var(--text-muted);
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }

  .contenido-interno {
    padding: 0 25px 25px 62px; /* Alineado con el texto del título */
    color: var(--text-muted);
    line-height: 1.6;
    font-size: 0.95rem;
  }

  /* --- TARJETA EXTRA --- */
  .soporte-extra {
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 25px;
    background: var(--bg-panel);
    border: 1px dashed #5c0a1f;
  }

  .icono-soporte {
    color: #5c0a1f;
    flex-shrink: 0;
  }

  .texto-soporte h3 {
    margin: 0 0 5px 0;
    color: var(--text-main);
    font-weight: 700;
  }
  
  .texto-soporte p {
    margin: 0;
    color: var(--text-muted);
    font-size: 0.95rem;
  }

  /* =============================================
     DISEÑO RESPONSIVO (Tablets y Móviles)
     ============================================= */

  @media (max-width: 768px) {
    .header-section {
      margin-bottom: 30px;
    }
    
    .header-section h1 {
      font-size: 1.6rem;
    }

    .acordeon-trigger {
      padding: 15px 20px;
      min-height: 52px; /* Área táctil ampliada para dedos */
    }

    .titulo-wrapper {
      font-size: 1rem;
      gap: 12px;
    }

    .contenido-interno {
      padding: 0 20px 20px 54px; /* Ajuste del padding izquierdo */
    }

    .soporte-extra {
      flex-direction: column;
      text-align: center;
      padding: 20px;
      gap: 15px;
    }
  }

  @media (max-width: 480px) {
    .ayuda-page {
      padding-top: 10px;
    }

    .acordeon-trigger {
      padding: 15px;
    }

    .contenido-interno {
      padding: 0 15px 15px 15px; /* Quitamos el indentado en pantallas muy pequeñas */
    }
  }
</style>