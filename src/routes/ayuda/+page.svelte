<script lang="ts">
  import { slide } from 'svelte/transition';
  // Importamos los nuevos iconos necesarios (BarChart2 y FileText)
  import { ArrowLeft, HelpCircle, ChevronDown, ChevronUp, Database, Map, Users, Settings, BarChart2, FileText } from 'lucide-svelte';

  function volver() {
    window.history.back();
  }

  // Controla qué sección está abierta
  let seccionAbierta: string | null = null;

  function toggle(id: string) {
    seccionAbierta = seccionAbierta === id ? null : id;
  }

  // Aquí está toda tu nueva lógica de ayuda detallada
  const faqs = [
    {
      id: "inicio_circuitos",
      icono: Map,
      pregunta: "1. Inicio y Gestión de Circuitos",
      respuesta: "En la pantalla de inicio puedes <strong>Añadir un circuito</strong>. Un circuito es tu espacio de trabajo principal. Al entrar a un circuito, accederás a la gestión completa de sus congregaciones, estadísticas y personas. Si eliminas un circuito, también se borrará su historial."
    },
    {
      id: "congregaciones_estadisticas",
      icono: BarChart2,
      pregunta: "2. Congregaciones y Estadísticas",
      respuesta: "Dentro del circuito, puedes añadir congregaciones manualmente o <strong>importar una lista mediante un archivo CSV</strong> (descargado de jw.org). <br><br>En la parte superior verás un <strong>Panel Estadístico</strong> que consolida los datos tomando como base la <em>última visita</em> realizada a cada congregación. Este panel te permite usar un botón para seleccionar qué datos específicos deseas ver, y muestra una lista desglosada de las congregaciones que han aportado registros."
    },
    {
      id: "visita_analisis",
      icono: FileText,
      pregunta: "3. Análisis y Revisión de Archivos",
      respuesta: "Al entrar a una congregación, encontrarás dos paneles principales:<br><br>• <strong>Análisis de Congregación:</strong> Te permite tomar notas detalladas de los aspectos de la visita. Al guardar, esta información pasa al Historial, desde donde puedes exportarla como un documento PDF para futuras consultas.<br>• <strong>Revisión de Archivos:</strong> Un contador rápido para auditar las tarjetas de los publicadores (S-21), registros de territorios, etc. Al finalizar y guardar, los datos pasan al Historial (desde donde también puedes generar un PDF) y alimentan automáticamente las estadísticas generales del circuito."
    },
    {
      id: "registro_personas",
      icono: Users,
      pregunta: "4. Registro de Personas (Ancianos)",
      respuesta: "Dentro del circuito, cuentas con un panel llamado <strong>Registro de personas</strong>. Aquí puedes importar rápidamente una lista de ancianos utilizando un archivo CSV descargado de jw.org. También tienes la opción de añadir nombres de forma manual según lo necesites."
    },
    {
      id: "configuracion_perfil",
      icono: Settings,
      pregunta: "5. Configuración, Sincronización y Topbar",
      respuesta: "En la barra superior (Topbar) encontrarás botones rápidos para cambiar el tema visual (claro/oscuro), acceder a esta ayuda y entrar a Configuración. En la Configuración puedes gestionar:<br><br>• <strong>Perfil:</strong> Ajustar tu nombre y el texto de pie de página que aparecerá impreso en tus documentos PDF.<br>• <strong>Base de datos y respaldos:</strong> Crear copias de seguridad manuales de toda tu información y restaurarlas cuando lo necesites.<br>• <strong>Carpeta de sincronización:</strong> Configurar una ruta en la nube para mantener tu aplicación sincronizada con otros de tus dispositivos."
    }
  ];
</script>

<div class="ayuda-page">
  <div class="header-section">
    <div>
      <button class="btn-back" on:click={volver}>
        <ArrowLeft size={20} /> Volver
      </button>
      <h1>Centro de Ayuda</h1>
      <p>Guía de uso del Asistente de Visitas</p>
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
              <p>{@html faq.respuesta}</p>
            </div>
          </div>
        {/if}
      </div>
    {/each}
  </div>

  <div class="soporte-extra card-global">
    <HelpCircle size={24} class="icono-soporte" />
    <div class="texto-soporte">
      <h3>¿Todo listo?</h3>
      <p>Recuerda realizar respaldos periódicos de tu base de datos desde la configuración para asegurar tu información.</p>
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

  /* --- ACORDEÓN (CON EL TOQUE AMARILLO ELEGANTE) --- */
  .acordeon-container {
    display: flex;
    flex-direction: column;
    gap: 15px;
    margin-bottom: 40px;
  }

  .acordeon-item {
    padding: 0; 
    transition: all 0.2s ease;
    border-top: 4px solid transparent;
    /* Amarillo crema muy sutil y elegante */
    background: #fffdeb; 
    border: 1px solid #fde08b; 
    border-radius: var(--radius-lg, 12px);
  }

  /* Adaptación automática para el Modo Oscuro */
  :global(.dark) .acordeon-item {
    background: rgba(253, 224, 71, 0.04); /* Un velo dorado casi invisible */
    border: 1px solid rgba(253, 224, 71, 0.1);
  }

  .acordeon-item.abierto {
    border-top: 4px solid #5c0a1f; /* El contraste crema/rojo vino es brutal */
    box-shadow: 0 4px 15px rgba(253, 224, 71, 0.3);
  }

  :global(.dark) .acordeon-item.abierto {
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
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
    padding: 0 25px 25px 62px; 
    color: var(--text-muted);
    line-height: 1.6;
    font-size: 0.95rem;
  }

  .contenido-interno p {
    margin: 0;
  }

  /* --- TARJETA EXTRA --- */
  .soporte-extra {
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 25px;
    border-radius: var(--radius-lg, 12px);
    /* Mismo amarillo crema pero con borde punteado en rojo vino */
    background: #fffdeb;
    border: 1px dashed #5c0a1f;
  }

  :global(.dark) .soporte-extra {
    background: rgba(253, 224, 71, 0.04);
    border: 1px dashed rgba(253, 224, 71, 0.3);
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
    .header-section { margin-bottom: 30px; }
    .header-section h1 { font-size: 1.6rem; }
    .acordeon-trigger { padding: 15px 20px; min-height: 52px; }
    .titulo-wrapper { font-size: 1rem; gap: 12px; }
    .contenido-interno { padding: 0 20px 20px 54px; }
    .soporte-extra { flex-direction: column; text-align: center; padding: 20px; gap: 15px; }
  }

  @media (max-width: 480px) {
    .ayuda-page { padding-top: 10px; }
    .acordeon-trigger { padding: 15px; }
    .contenido-interno { padding: 0 15px 15px 15px; }
  }
</style>