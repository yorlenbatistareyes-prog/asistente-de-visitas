<script lang="ts">

  import { 
     CloudSync, FolderInput, User, Database, Globe, Save, ArrowLeft,  AlertTriangle, X, ArchiveRestore, DownloadCloud
  } from 'lucide-svelte';
  import { onMount } from 'svelte';

  import { save as saveDialog, open as openDialog } from '@tauri-apps/plugin-dialog';
  import { exists, readFile, writeFile, remove, stat, readDir, BaseDirectory } from '@tauri-apps/plugin-fs';
  import { invoke } from '@tauri-apps/api/core';
  import { listen } from '@tauri-apps/api/event';
  // IMPORTAMOS TUS FUNCIONES DESDE db.ts
  import { guardarConfig, cargarConfig, initDB } from '$lib/services/db';
  
  // IMPORTAMOS TUS FUNCIONES DESDE db.ts
  import Sincronizacion from '$lib/components/Sincronizacion.svelte';

  import { verificarActualizacion, irA_Descarga } from '$lib/services/updater';

  // --- VARIABLES DE ESTADO GLOBALES ---
  let nombreUsuario = "";
  let cargoUsuario = "Superintendente de Circuito";
  let nombreCircuito = "";
  let piePagina = "Informe generado por Asistente de Visitas";
  let idioma = "Español";
  
  let mostrarModalReset = false;
  let palabraConfirmacion = "";

  // 🌟 NUEVAS VARIABLES PARA EL MODAL DE RESTAURACIÓN 🌟
  let mostrarModalRestaurar = false;
  let rutaArchivoSeleccionado = "";
  let infoArchivo = { fecha: "Desconocida", dispositivo: "Desconocido" };
  let dispositivoActual = "Este dispositivo"; // Opcional: Podrías traer este nombre de Rust también

  // Función auxiliar para obtener la fecha y hora actual con buen formato
  function obtenerFechaActual() {
    return new Date().toLocaleString();
  }
   
  // --- CARGAR DATOS AL INICIAR ---
  onMount(() => {
    // 2. 🕒 CARGA DE DATOS (En una función interna asíncrona)
    const cargarTodo = async () => {
      try {
        nombreUsuario = await cargarConfig('nombreUsuario') || "";
        cargoUsuario = await cargarConfig('cargoUsuario') || "Superintendente de Circuito";
        nombreCircuito = await cargarConfig('nombreCircuito') || "";
        piePagina = await cargarConfig('piePagina') || "Informe generado por Asistente de Visitas";
        idioma = await cargarConfig('idioma') || "Español";

      } catch (error) {
        console.error("No se pudo cargar la configuración de SQLite:", error);
      }

      // 🌟 RECOGER ARCHIVO DE LA CAJA FUERTE DE RUST
      // Le preguntamos a Rust si la app se abrió con un doble clic
      // 🌟 REVISAR EL BUZÓN DE ANDROID
      try {
        // Buscamos si Android nos dejó el archivo en la caché
        const existeBuzon = await exists('importacion_pendiente.avisits', { baseDir: BaseDirectory.AppCache });
        
        if (existeBuzon) {
          console.log("📂 ¡Archivo detectado por doble clic en Android!");
          rutaArchivoSeleccionado = "BUZON_ANDROID"; // Usamos esto como señal secreta

          // Llenamos la información visual de tu tarjeta
          infoArchivo.fecha = "Archivo externo";
          infoArchivo.dispositivo = "Toque rápido en Android";

          // Abrimos tu modal
          setTimeout(() => {
            mostrarModalRestaurar = true;
          }, 300);
        }
      } catch (e) {
        console.log("No hay archivos en el buzón o no es Android");
      }

      // También verificar si vino desde el evento global
      const archivoDesdeEvento = sessionStorage.getItem('archivoPendiente');
      if (archivoDesdeEvento) {
        sessionStorage.removeItem('archivoPendiente'); // consumir
        console.log("📂 Archivo recibido desde evento:", archivoDesdeEvento);
        rutaArchivoSeleccionado = archivoDesdeEvento;

        const partesRuta = rutaArchivoSeleccionado.split(/[/\\]/);
        const nombreSinExtension = partesRuta[partesRuta.length - 1].replace('.avisits', '');
        const trozos = nombreSinExtension.split('_');

        if (trozos.length >= 3) {
          infoArchivo.fecha = trozos[1];
          infoArchivo.dispositivo = trozos.slice(2).join('_');
        } else {
          infoArchivo.fecha = "Desconocida";
          infoArchivo.dispositivo = "Origen desconocido";
        }

        setTimeout(() => {
          mostrarModalRestaurar = true;
        }, 300);
      }
    };

    cargarTodo();
  });

// --- LÓGICA DE ACTUALIZACIONES ---
  let buscandoUpdate = false;
  let updateInfo: any = null;

  async function buscarActualizaciones() {
    buscandoUpdate = true;
    updateInfo = await verificarActualizacion();
    buscandoUpdate = false;
    
    if (!updateInfo.hayNueva) {
      alert("¡Estás al día! Tienes la última versión instalada.");
    }
  }

  function volver() {
    window.history.back();
  }

  // --- GUARDAR CONFIGURACIÓN GLOBAL ---
  async function guardarCambios() {
    try {
      await guardarConfig('nombreUsuario', nombreUsuario);
      await guardarConfig('cargoUsuario', cargoUsuario);
      await guardarConfig('nombreCircuito', nombreCircuito);
      await guardarConfig('piePagina', piePagina);
      await guardarConfig('idioma', idioma);
      // Las variables de sincronización ya se guardan solas al tocarlas
      
      alert("✅ Configuración guardada en SQLite correctamente.");
      volver();
    } catch (error) {
      console.error("Error guardando en SQLite:", error);
      alert("❌ Hubo un error al guardar en la base de datos.");
    }
  }

  // --- LÓGICA DE BACKUPS MANUALES (.avisits) ---
  async function exportarCopia() {
    try {
      // 1. Pedimos a Rust el nombre inteligente
      const nombreSugerido = await invoke<string>("generar_nombre_respaldo");

      // 2. Abrir ventana para elegir dónde guardar
      const rutaDestino = await saveDialog({
        title: 'Exportar Copia de Seguridad',
        defaultPath: nombreSugerido,
        filters: [{ name: 'Respaldo Asistente', extensions: ['avisits'] }]
      });
      
      if (!rutaDestino) return; 

      // 3. 🌟 LA MAGIA (Estilo Deepseek): Leemos la BD y escribimos directo desde el frontend
      const dbBytes = await readFile('av_database.db', { baseDir: BaseDirectory.AppData });
      await writeFile(rutaDestino as string, dbBytes);
      
      alert("✅ Copia de seguridad guardada con éxito en:\n\n" + rutaDestino);
    } catch (error) {
      console.error("Error crítico al exportar:", error);
      alert("❌ Ocurrió un error al guardar la copia manual: " + error);
    }
  }

// 🌟 LÓGICA DE RESTAURACIÓN (Para copias locales y desde Google Drive) 🌟
  async function restaurarCopia() {
    try {
      // 1. Abrimos el selector nativo 
      // (En Android esto abre tus Archivos/Google Drive, en PC el explorador)
      const rutaOrigen = await openDialog({
        title: 'Seleccionar Copia de Seguridad',
        filters: [{ name: 'Respaldo Asistente', extensions: ['avisits'] }],
        multiple: false,
        directory: false
      });
      
      if (!rutaOrigen) return; // Si cancelas, no pasa nada
      
      rutaArchivoSeleccionado = rutaOrigen as string;

      // 2. Extraemos el nombre del archivo de la ruta larga
      const partesRuta = rutaArchivoSeleccionado.split(/[/\\]/);
      const nombreArchivo = partesRuta[partesRuta.length - 1]; 

      // 3. Cortamos el nombre para sacar los datos: Respaldo_FECHA_HORA_DISPOSITIVO
      const nombreSinExtension = nombreArchivo.replace('.avisits', '');
      const trozos = nombreSinExtension.split('_');

      // Si el archivo tiene el formato NUEVO (con hora y AM/PM)
      if (trozos.length >= 4) {
        // Transformamos "08-33-PM" en "08:33 PM"
        const horaFormateada = trozos[2].replace('-', ':').replace('-', ' ');
        infoArchivo.fecha = `${trozos[1]} a las ${horaFormateada}`;
        infoArchivo.dispositivo = trozos.slice(3).join('_');
      } 
      // Por si alguna vez cargas un archivo con el formato VIEJO (sin hora)
      else if (trozos.length === 3) {
        infoArchivo.fecha = trozos[1];
        infoArchivo.dispositivo = trozos[2];
      } 
      // Formato irreconocible
      else {
        infoArchivo.fecha = "Desconocida";
        infoArchivo.dispositivo = "Origen desconocido";
      }

      // 4. Levantamos las defensas: Mostramos tu modal de advertencia
      mostrarModalRestaurar = true;

    } catch (error) {
      console.error("Error al seleccionar respaldo:", error);
      alert("❌ Error al intentar leer el archivo.");
    }
  }

  // Esta función se ejecuta cuando presionas "Restaurar" en el modal
  async function confirmarRestauracion() {
    try {
      mostrarModalRestaurar = false;
      
      let backupBytes;
      
      // 1. Verificamos de dónde viene el archivo
      if (rutaArchivoSeleccionado === "BUZON_ANDROID") {
        // Viene del doble clic en Android: Leemos del buzón
        backupBytes = await readFile('importacion_pendiente.avisits', { baseDir: BaseDirectory.AppCache });
        // ¡SÚPER IMPORTANTE! Lo borramos para que no te vuelva a salir el modal al reiniciar
        await remove('importacion_pendiente.avisits', { baseDir: BaseDirectory.AppCache });
      } else {
        // Viene del botón "Restaurar" manual: Leemos la ruta normal
        backupBytes = await readFile(rutaArchivoSeleccionado);
      }

      // 2. Lo guardamos directamente sobrescribiendo nuestra base de datos activa
      await writeFile('av_database.db', backupBytes, { baseDir: BaseDirectory.AppData });

      // 3. Limpiamos los archivos temporales de SQLite
      try { await remove('av_database.db-wal', { baseDir: BaseDirectory.AppData }); } catch (e) {}
      try { await remove('av_database.db-shm', { baseDir: BaseDirectory.AppData }); } catch (e) {}

      alert("✅ Datos restaurados correctamente. La aplicación se recargará para aplicar los cambios.");
      
      // 4. Recargamos la interfaz
      window.location.reload();
      
    } catch (error) {
      console.error("Error al aplicar la restauración:", error);
      alert("❌ Error crítico al sobrescribir la base de datos: " + error);
    }
  }

  // --- LÓGICA DE RESETEO (ZONA DE PELIGRO) ---
  function abrirModalReset() { mostrarModalReset = true; palabraConfirmacion = ""; }
  function cerrarModalReset() { mostrarModalReset = false; palabraConfirmacion = ""; }

  async function confirmarReset() {
    if (palabraConfirmacion === "ELIMINAR") {
      try {
        const db = await initDB();
        await db.execute('DELETE FROM historial_visitas'); 
        await db.execute('DELETE FROM personas');
        await db.execute('DELETE FROM congregaciones');
        await db.execute('DELETE FROM circuitos');
        
        alert("✅ La base de datos ha sido limpiada exitosamente.");
        cerrarModalReset();
      } catch (error) {
        alert("❌ Error al limpiar la base de datos.");
      }
    }
  }

  function cerrarModalBackdrop(event: MouseEvent) {
  // Solo cierra si se hizo clic directamente en el backdrop, no en el contenido
  if (event.target === event.currentTarget) {
    cerrarModalReset();
  }
}

function handleModalKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    cerrarModalReset();
  }
}
</script>

<div class="config-page">
  <header class="config-header">
    <button class="btn-back" on:click={volver}>
      <ArrowLeft size={20} /> Volver
    </button>
    <h1>Configuración de la aplicación</h1>
    <p>Preferencias de la aplicación y usuario</p>
  </header>

  <div class="config-grid">
    
    <section class="card-global config-section">
      <div class="section-icon"><User size={24} /></div>
      <div class="section-content">
        <h3>Perfil y Firma Oficial</h3>
        <p>Personaliza cómo aparecen tus datos en los informes PDF.</p>
        
        <div class="form-row">
          <div class="form-group half">
            <label for="username">Nombre Completo</label>
            <input id="username" type="text" class="input-global" bind:value={nombreUsuario} />
          </div>
          <div class="form-group half">
            <label for="cargo">Asignación</label>
            <input id="cargo" type="text" class="input-global" bind:value={cargoUsuario} />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group half">
            <label for="circuito">Nombre del Circuito</label>
            <input id="circuito" type="text" class="input-global" bind:value={nombreCircuito} />
          </div>
          <div class="form-group half">
            <label for="lang">Idioma Predeterminado</label>
            <select id="lang" class="input-global" bind:value={idioma}>
              <option value="Español">Español</option>
              <option value="English">English</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label for="pie">Pie de Página (Impresión)</label>
          <input id="pie" type="text" class="input-global" bind:value={piePagina} />
        </div>
      </div>
    </section>

    <section class="card-global config-section">
      <div class="section-icon">
        <div class="section-icon">
          <CloudSync size={28} />
        </div>
      </div>

      <div class="section-content">
        <h3>Sincronización Cloud Segura</h3>
        <p>Respalda tu información en el servidor de forma automática e inteligente, sin usar contraseñas.</p>
        
        <Sincronizacion />
      </div>
    </section>

    <section class="card-global config-section">
      <div class="section-icon"><Database size={24} /></div>
      <div class="section-content">
        <h3>Base de Datos y Respaldo</h3>
        <p>Gestiona el motor SQLite y mantén tus datos seguros.</p>
        
        <div class="db-status">
          <span class="status-dot"></span> 
          <span>Conectado a <code>av_database.db</code></span>
        </div>
        
        <div class="backup-cards">
          <button class="backup-card" on:click={exportarCopia}>
            <div class="icon-box save-box">
              <Save size={24} />
            </div>
            <div class="card-text">
              <h4>Crear Respaldo</h4>
              <span>Guardar TODO</span>
            </div>
          </button>

          <button class="backup-card" on:click={restaurarCopia}>
            <div class="icon-box restore-box">
              <FolderInput size={24} />
            </div>
            <div class="card-text">
              <h4>Restaurar Datos</h4>
              <span>Recuperar desde archivo</span>
            </div>
          </button>
        </div>
        
        <div class="danger-zone">
          <p class="danger-text">Zona de peligro: Esta acción no se puede deshacer.</p>
          <button class="btn-global danger-btn" on:click={abrirModalReset}>
            <AlertTriangle size={16} /> Resetear Aplicación
          </button>
        </div>
      </div>
    </section>
  </div>

  <footer class="config-footer">
    <button class="btn-global" on:click={volver}>Cancelar</button>
    <button class="btn-global btn-primary" on:click={guardarCambios}>
      <Save size={18} /> Guardar Cambios
    </button>
  </footer>
</div>

<section class="card-global config-section">
      <div class="section-icon"><DownloadCloud size={24} /></div>
      <div class="section-content">
        <h3>Actualizaciones de la App</h3>
        <p>Busca e instala la última versión de Asistente de Visitas.</p>
        
        <button class="btn-global btn-outline" on:click={buscarActualizaciones} disabled={buscandoUpdate}>
          {#if buscandoUpdate}
            Buscando en el servidor...
          {:else}
            <DownloadCloud size={16} /> Buscar Actualizaciones
          {/if}
        </button>

        {#if updateInfo?.hayNueva}
          <div class="alerta-update">
            <div class="alerta-texto">
              <h4>¡Nueva versión v{updateInfo.version} disponible!</h4>
              <p>Hay una actualización lista para instalar.</p>
            </div>
            <button class="btn-global btn-primary" on:click={irA_Descarga}>
              Actualizar Ahora
            </button>
          </div>
        {/if}
      </div>
    </section>

{#if mostrarModalRestaurar}
  <div class="modal-backdrop" role="button" tabindex="0">
    <div class="modal-content restore-modal">
      <div class="modal-header">
        <div class="header-title-restore">
          <ArchiveRestore size={24} color="#2563eb" />
          <h3>Restaurar copia de seguridad</h3>
        </div>
        <button class="btn-close" on:click={() => mostrarModalRestaurar = false}><X size={20}/></button>
      </div>

      <p class="modal-warning">
        Esta acción reemplazará <strong>todas las personas, congregaciones e historial</strong> de este dispositivo por los datos de la copia de seguridad.
      </p>

      <div class="comparacion-container">
        <div class="info-card origen">
          <span class="etiqueta-badge">Copia de seguridad</span>
          <span class="fecha-texto">{infoArchivo.fecha}</span>
          <span class="dispositivo-texto">{infoArchivo.dispositivo}</span>
        </div>

        <div class="flecha-centro">
          <span>&rarr;</span>
        </div>

        <div class="info-card destino">
          <span class="etiqueta-badge">Este equipo</span>
          <span class="fecha-texto">Datos actuales</span>
          <span class="dispositivo-texto">Serán reemplazados</span>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-global" on:click={() => mostrarModalRestaurar = false}>Cancelar</button>
        <button class="btn-global btn-primary" on:click={confirmarRestauracion}>
          Restaurar
        </button>
      </div>
    </div>
  </div>
{/if}

{#if mostrarModalReset}
  <div
  class="modal-backdrop"
  role="button"
  tabindex="0"
  aria-label="Cerrar modal"
  on:click={cerrarModalBackdrop}
  on:keydown={handleModalKeydown}
>
  <div class="modal-content danger-modal">
    <div class="modal-header">
      <div class="header-title-danger">
        <AlertTriangle size={24} color="#ef4444" />
        <h3>¿Estás completamente seguro?</h3>
      </div>
      <button class="btn-close" on:click={cerrarModalReset}><X size={20}/></button>
    </div>

    <p class="modal-warning">
      Estás a punto de borrar <strong>todas las congregaciones, personas y el historial de análisis</strong>. 
      Esta acción destruirá los datos permanentemente.
    </p>

    <div class="form-group">
      <label for="confirm">Para continuar, escribe <strong>ELIMINAR</strong> en el recuadro:</label>
      <input 
        id="confirm" 
        type="text" 
        class="input-global" 
        bind:value={palabraConfirmacion} 
        placeholder="Escribe ELIMINAR"
        autocomplete="off"
      />
    </div>

    <div class="modal-footer">
      <button class="btn-global" on:click={cerrarModalReset}>Cancelar</button>
      <button 
        class="btn-global danger-btn-solid" 
        disabled={palabraConfirmacion !== 'ELIMINAR'}
        on:click={confirmarReset}
      >
        Borrar Todo
      </button>
    </div>
  </div>
</div>
{/if}

<style>
  .config-page { max-width: 900px; margin: 0 auto; padding-bottom: 50px; animation: fadeIn 0.3s ease-out; }

  .config-header { display: flex; align-items: center; gap: 20px; margin-bottom: 40px; }
  .config-header h1 { margin: 0; font-size: 2rem; color: var(--text-main); }
  
  .btn-back { background: none; border: none; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; gap: 8px; font-weight: 600; transition: color 0.2s;}
  .btn-back:hover { color: var(--primary); }

  .config-grid { display: flex; flex-direction: column; gap: 25px; }

  .config-section { display: flex; gap: 25px; padding: 30px; }
  .section-icon { color: var(--primary); background: var(--bg-app); padding: 15px; border-radius: 15px; height: fit-content; }
  
  .section-content { flex: 1; }
  .section-content h3 { margin: 0 0 5px 0; font-size: 1.3rem; color: var(--text-main); }
  .section-content p { margin: 0 0 20px 0; color: var(--text-muted); font-size: 0.9rem; }

  /* ESTRUCTURA DE FORMULARIOS */
  .form-row { display: flex; gap: 20px; margin-bottom: 15px; }
  .form-group { margin-bottom: 15px; }
  .form-group.half { flex: 1; margin-bottom: 0; }
  .form-group label { display: block; font-size: 0.85rem; font-weight: 700; margin-bottom: 8px; color: var(--text-muted); }

  /* SECCIÓN BASE DE DATOS */
  .db-status { display: flex; align-items: center; gap: 10px; font-size: 0.9rem; margin-bottom: 20px; color: var(--text-main); }
  .status-dot { width: 10px; height: 10px; background: #22c55e; border-radius: 50%; box-shadow: 0 0 8px rgba(34, 197, 94, 0.4); }

  /* NUEVOS BOTONES DE RESPALDO (Estilo Tarjeta) */
  .backup-cards { 
    display: flex; 
    gap: 15px; 
    margin-bottom: 30px; 
  }

  .backup-card {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 15px;
    padding: 15px;
    background: var(--bg-app);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left; /* Para que el texto no se centre como en botones normales */
  }

  .backup-card:hover {
    background: var(--bg-panel);
    border-color: var(--primary);
    box-shadow: 0 4px 10px rgba(0,0,0,0.05);
    transform: translateY(-2px);
  }

  /* Cajas de color para los iconos */
  .icon-box {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 48px;
    height: 48px;
    border-radius: 12px; /* Cuadro con bordes suaves */
  }

  /* Azul para Guardar */
  .save-box {
    background: #eff6ff;
    color: #2563eb;
  }

  /* Verde para Restaurar */
  .restore-box {
    background: #f0fdf4;
    color: #16a34a;
  }

  /* Adaptación al Modo Oscuro */
  :global(body.dark-mode) .save-box, :global(.dark) .save-box {
    background: rgba(37, 99, 235, 0.15);
    color: #60a5fa;
  }
  :global(body.dark-mode) .restore-box, :global(.dark) .restore-box {
    background: rgba(22, 163, 74, 0.15);
    color: #4ade80;
  }

  /* Textos de la tarjeta */
  .card-text {
    display: flex;
    flex-direction: column;
  }

  .card-text h4 {
    margin: 0;
    font-size: 1rem;
    color: var(--text-main);
    font-weight: 700;
  }

  .card-text span {
    font-size: 0.8rem;
    color: var(--text-muted);
    margin-top: 2px;
  }

  .btn-outline { background: var(--bg-app); color: var(--text-main); border: var(--border-thin); }
  .btn-outline:hover { background: var(--bg-panel); border-color: var(--primary); color: var(--primary); }

  .danger-zone { border-top: 1px dashed var(--border-color); padding-top: 20px; }
  .danger-text { color: var(--text-muted); font-size: 0.85rem; margin-bottom: 10px; }
  
  .danger-btn { border-color: #ef4444; color: #ef4444; background: transparent; }
  .danger-btn:hover { background: rgba(239, 68, 68, 0.1); }

  .config-footer { margin-top: 40px; display: flex; justify-content: flex-end; gap: 15px; border-top: var(--border-thin); padding-top: 25px; }
  .btn-primary { background: var(--primary); color: white; border: none; }
  .btn-primary:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }

  /* ESTILOS DEL MODAL DE RESET */
  .modal-backdrop {
    position: fixed; inset: 0;
    background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(4px);
    display: flex; justify-content: center; align-items: center; z-index: 9999; padding: 20px;
  }

  .danger-modal {
    box-sizing: border-box;
    background: var(--bg-panel); width: 88%; max-width: 450px;
    border-radius: var(--radius-lg); padding: 30px; border: 1px solid #ef4444;
    box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2);
    display: flex; flex-direction: column; gap: 15px; animation: zoomIn 0.2s ease-out;
    /* 🌟 REGLAS PARA CENTRADO PERFECTO EN MÓVILES */
    max-height: 90vh; /* Nunca será más alto que la pantalla */
    overflow-y: auto; /* Agrega scroll interno si la pantalla es muy bajita */
    margin: auto; /* Refuerzo para el centrado vertical y horizontal */
  }

  .modal-header { display: flex; justify-content: space-between; align-items: center; }
  .header-title-danger { display: flex; align-items: center; gap: 10px; }
  .header-title-danger h3 { margin: 0; font-size: 1.2rem; color: var(--text-main); }
  
  .btn-close { background: transparent; padding: 5px; color: var(--text-muted); border: none; cursor: pointer; }
  .btn-close:hover { color: var(--text-main); }

  .modal-warning { color: var(--text-muted); font-size: 0.95rem; line-height: 1.5; margin: 10px 0; }
  .modal-warning strong { color: var(--text-main); }

  .modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
  
  .danger-btn-solid { background: #ef4444; color: white; border: none; opacity: 1; transition: opacity 0.2s; }
  .danger-btn-solid:disabled { opacity: 0.4; cursor: not-allowed; }
  .danger-btn-solid:not(:disabled):hover { background: #dc2626; }

  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes zoomIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }

  /* =============================================
     DISEÑO RESPONSIVO (Configuración Global)
     ============================================= */

  @media (max-width: 768px) {
    .config-page {
      padding: 15px;
    }

    /* 1. Cabecera: Título más compacto */
    .config-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 10px;
      margin-bottom: 25px;
    }
    
    .config-header h1 {
      font-size: 1.6rem;
    }

    /* 2. Secciones: El icono pasa arriba para dar espacio */
    .config-section {
      flex-direction: column;
      padding: 20px;
      gap: 15px;
    }

    .section-icon {
      width: 45px;
      height: 45px;
      padding: 10px;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    /* 3. Formularios: Todo a una sola columna */
    .form-row {
      flex-direction: column;
      gap: 15px;
      margin-bottom: 0;
    }

    .form-group.half {
      width: 100%;
    }

    /* 4. Botones de Backup: Uno debajo del otro en móvil */
    .backup-cards {
      flex-direction: column;
      gap: 12px;
    }

    /* 5. Zona de Peligro */
    .danger-btn {
      width: 100%;
      height: 48px;
      justify-content: center;
    }

    /* 6. Footer de la página fijo o más grande */
    .config-footer {
      flex-direction: column-reverse; /* El botón principal queda arriba */
      gap: 10px;
    }

    .config-footer .btn-global {
      width: 100%;
      height: 50px;
      font-size: 1rem;
    }
  }

  /* Ajustes para el Modal de Reset en móvil */
  @media (max-width: 480px) {
    .danger-modal, .restore-modal {
      width: 90%; /* Ancho perfecto con sus márgenes a los lados */
      padding: 20px; /* Relleno cómodo */
      gap: 15px;
    }

    .modal-footer {
      flex-direction: column-reverse;
      gap: 10px;
    }

    .modal-footer .btn-global {
      width: 100%;
      height: 48px;
    }
  
    /* 🌟 APILAMOS LAS TARJETAS PARA QUE NO SE APLASTEN */
    .comparacion-container {
      flex-direction: column;
      padding: 15px;
      gap: 5px;
    }

    .flecha-centro {
      transform: rotate(90deg); /* Voltea la flechita hacia abajo */
      padding: 5px 0;
    }
  }

  /* --- ESTILOS DE SINCRONIZACIÓN (ESTILO EZRA) --- */
  .sync-info-box {
    border: 1px dashed var(--border-color);
    background: rgba(0,0,0,0.02); /* Fondo súper tenue */
    padding: 15px 20px;
    border-radius: 8px;
    margin-bottom: 20px;
    min-height: 60px;
    display: flex;
    align-items: center;
  }

  :global(body.dark-mode) .sync-info-box { background: rgba(255,255,255,0.02); }

  .sync-details p { margin: 4px 0 !important; color: var(--text-main) !important; font-size: 0.9rem !important; }
  .sync-details strong { color: var(--text-muted); font-weight: 600; width: 140px; display: inline-block; }
  .ruta-path { font-family: monospace; color: var(--primary); background: var(--bg-app); padding: 2px 6px; border-radius: 4px; border: 1px solid var(--border-color);}

  /* Botones Principales de Sincronización */
  .sync-actions-primary { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px; }
  
  .btn-sync-primary {
    background: #e11d48; /* Color rosa/rojo vibrante similar a Ezra */
    color: white;
    border: none;
    font-weight: 700;
  }
  .btn-sync-primary:hover { background: #be123c; transform: translateY(-1px); }

  /* Los botones outline se apagan solos si tienen el atributo disabled */
  .btn-global:disabled { opacity: 0.5; cursor: not-allowed; pointer-events: none; }

  /* Checkbox personalizado */
  .sync-auto-option { margin-bottom: 25px; border-bottom: 1px solid var(--border-color); padding-bottom: 20px;}
  .checkbox-label { display: flex; align-items: center; gap: 10px; cursor: pointer; color: var(--text-main); font-size: 0.95rem; }
  .checkbox-label.disabled { opacity: 0.5; cursor: not-allowed; }
  
  /* Botones secundarios */
  .sync-actions-secondary { display: flex; gap: 10px; }
  
  .btn-outline-warning { color: #d97706; border: 1px solid #fcd34d; background: transparent; }
  .btn-outline-warning:hover:not(:disabled) { background: #fffbeb; }
  
  .btn-outline-danger { color: #dc2626; border: 1px solid #fca5a5; background: transparent; }
  .btn-outline-danger:hover:not(:disabled) { background: #fef2f2; }

  /* 🌟 ESTILOS DE LA TARJETA DE SINCRONIZACIÓN FÍSICA */
  .sync-status-card {
    background: rgba(37, 99, 235, 0.05);
    border: 1px solid rgba(37, 99, 235, 0.2);
    border-radius: 8px;
    padding: 15px;
    margin-bottom: 20px;
    margin-top: 10px;
  }

  .sync-header h4 {
    margin: 0 0 10px 0;
    font-size: 0.95rem;
    color: #1e3a8a;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .sync-descripcion {
    font-size: 0.8rem;
    color: #475569;
    margin: 0 0 12px 0;
    line-height: 1.4;
  }

  .sync-body {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .sync-dato {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.9rem;
  }

  .sync-dato .etiqueta {
    color: var(--text-muted);
    font-weight: 600;
  }

  .sync-dato .valor {
    color: var(--text-main);
    font-weight: 800;
  }

  .btn-sync-drive {
    background: #4285F4; /* Azul de Google */
    color: white;
    border: none;
    font-weight: 700;
  }
  .btn-sync-drive:hover { background: #3367D6; transform: translateY(-1px); }

  /* =============================================
     ESTILOS DEL MODAL DE RESTAURACIÓN
     ============================================= */
  .restore-modal {
    box-sizing: border-box;
    background: var(--bg-panel); /* Esto le quita lo transparente */
    width: 88%;
    max-width: 500px;
    border-radius: var(--radius-lg);
    padding: 25px; /* Espaciado para que no se vea apretado */
    border: 1px solid #2563eb;
    box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2);
    display: flex;
    flex-direction: column;
    gap: 15px;
    animation: zoomIn 0.2s ease-out;
    /* 🌟 AGREGA ESTO PARA ASEGURAR EL CENTRADO VERTICAL: */
    max-height: 90vh; /* Nunca será más alto que la pantalla */
    overflow-y: auto; /* Si el celular es muy bajito, crea un mini-scroll interior */
    margin: auto; /* Refuerzo para el centrado absoluto */
  }

  .header-title-restore { display: flex; align-items: center; gap: 10px; }
  .header-title-restore h3 { margin: 0; font-size: 1.2rem; color: var(--text-main); }
  
  .comparacion-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--bg-app);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 20px;
    margin: 15px 0;
  }

  .info-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    flex: 1;
  }

  .etiqueta-badge {
    background: var(--bg-panel);
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--text-muted);
    margin-bottom: 10px;
    border: 1px solid var(--border-color);
  }

  /* Colores para diferenciar Origen y Destino */
  .info-card.origen .etiqueta-badge { background: #eff6ff; color: #2563eb; border-color: #bfdbfe; }
  .info-card.destino .etiqueta-badge { background: #fef2f2; color: #dc2626; border-color: #fecaca; }

  .fecha-texto {
    font-size: 1rem;
    font-weight: 800;
    color: var(--text-main);
    margin-bottom: 4px;
  }

  .dispositivo-texto {
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .flecha-centro {
    font-size: 2rem;
    color: var(--text-muted);
    padding: 0 15px;
    opacity: 0.5;
  }

/* === ESTILOS DEL BLOQUE INFERIOR COMPACTO (Google Drive + Mantenimiento) === */
  .sync-divider {
    border: 0;
    border-top: 1px solid var(--border-color);
    margin: 25px 0 15px 0;
  }

  .advanced-sync-grid {
    display: grid;
    grid-template-columns: 180px 1fr; /* Fija el ancho del botón azul a 180px */
    gap: 15px;
    align-items: flex-start;
  }

  .mobile-auth-container {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .btn-sync-drive {
    background: transparent !important;
    color: #2563eb !important;
    border: 1px solid #2563eb !important;
    padding: 8px 10px !important;
    font-size: 0.85rem !important;
    justify-content: center;
  }
  
  .btn-sync-drive:hover {
    background: rgba(37, 99, 235, 0.05) !important;
  }

  .mobile-notice {
    font-size: 0.65rem;
    color: var(--text-muted);
    text-align: center;
    margin: 0;
  }

  .maintenance-actions {
    display: flex;
    gap: 10px;
  }

  .btn-sm {
    flex: 1; /* Hace que Restablecer y Limpiar midan lo mismo */
    padding: 8px 10px !important;
    font-size: 0.85rem !important;
    justify-content: center;
  }

  .drive-status-text {
    font-size: 0.8rem;
    color: #2563eb;
    text-align: center;
    margin-top: 10px;
    font-weight: 600;
  }

  /* === RESPONSIVO: Bloque inferior compacto === */
  @media (max-width: 768px) {
    .advanced-sync-grid {
      grid-template-columns: 1fr; /* Pasa de 2 columnas a 1 sola */
      gap: 15px;
    }

    .mobile-auth-container {
      width: 100%;
    }

    .btn-sync-drive {
      width: 100%; /* El botón azul ocupará todo el ancho en móvil */
    }

    .maintenance-actions {
      flex-direction: column; /* Pone Restablecer y Limpiar uno debajo del otro */
      width: 100%;
    }

    .btn-sm {
      width: 100%; /* Los botones de mantenimiento ocupan todo el ancho */
      padding: 12px !important; /* Un poco más altos para tocarlos fácil con el dedo */
    }
  }

  /* --- ESTILOS DEL AVISO DE ACTUALIZACIÓN --- */
  .alerta-update {
    margin-top: 20px;
    padding: 15px 20px;
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.4);
    border-radius: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 15px;
    animation: fadeIn 0.3s ease-out;
  }

  .alerta-texto h4 {
    margin: 0 0 5px 0;
    color: #16a34a;
    font-size: 1rem;
    font-weight: 700;
  }

  .alerta-texto p {
    margin: 0;
    color: var(--text-main);
    font-size: 0.85rem;
  }

  :global(.dark) .alerta-texto h4 { color: #4ade80; }

  @media (max-width: 600px) {
    .alerta-update {
      flex-direction: column;
      align-items: flex-start;
    }
    .alerta-update button {
      width: 100%;
      justify-content: center;
    }
  }
</style>