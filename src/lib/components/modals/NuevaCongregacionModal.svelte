<script lang="ts">
import { createEventDispatcher, onMount } from 'svelte';
import { X, Save, MapPin, ExternalLink, FileUp, Trash2, CheckCircle } from 'lucide-svelte';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { parseKMLToGeoJSON, contarPuntosKML } from '$lib/utils/kmlParser';

  export let datosEdicion: any = null;

  const dispatch = createEventDispatcher();

  // Estructura actualizada con los nuevos campos
  let formData = {
    id: undefined,
    nombre: '',
    numero_congregacion: '',
    ciudad: '',
    provincia: '',
    pais: 'Cuba',
    idioma: 'Español',
    esLenguaSenas: false,
    telefono: '',
    direccion_salon: '',
    enlace_mapa: '',
    diaSemana: '',
    horaSemana: '',
    diaFinSemana: '',
    horaFinSemana: '',
    enVisita: false,
    latitud: null as number | null,
    longitud: null as number | null,
    limite_geojson: null as string | null
  };

    // --- ESTADO DEL KML ---
  let tieneLimite = false;
  let puntosLimite = 0;
  let cargandoKml = false;


    onMount(() => {
    if (datosEdicion) {
      formData = { 
        ...datosEdicion,
        esLenguaSenas: Boolean(datosEdicion.esLenguaSenas || datosEdicion.es_lengua_senas),
        enVisita: Boolean(datosEdicion.enVisita || datosEdicion.en_visita)
      };
      // 🗺️ ¿Ya tiene límite guardado?
      if (formData.limite_geojson) {
        tieneLimite = true;
        try {
          const geo = JSON.parse(formData.limite_geojson);
          puntosLimite = geo?.geometry?.coordinates?.[0]?.length || 0;
        } catch (e) {
          puntosLimite = 0;
        }
      }
    }
  });

  function guardar() {
    if (!formData.nombre.trim()) {
      alert("El nombre de la congregación es obligatorio.");
      return;
    }
    dispatch('save', formData);
  }

  function cerrar() {
    dispatch('close');
  }

  
  // --- IMPORTAR KML ---
  async function importarKML() {
    try {
      cargandoKml = true;

      const seleccion = await openDialog({
        title: 'Seleccionar archivo KML',
        multiple: false,
        directory: false,
        filters: [{ name: 'Google Earth', extensions: ['kml'] }]
      });

      if (!seleccion) {
        cargandoKml = false;
        return;
      }

      const rutaOrigen = Array.isArray(seleccion) ? seleccion[0] : seleccion;
      const kmlTexto = await readTextFile(rutaOrigen as string);

      const geojson = parseKMLToGeoJSON(kmlTexto);
      if (!geojson) {
        alert('❌ No se pudo leer el KML. Asegúrate de que contiene un polígono (Polygon).');
        cargandoKml = false;
        return;
      }

      formData.limite_geojson = JSON.stringify(geojson);
      tieneLimite = true;
      puntosLimite = contarPuntosKML(kmlTexto);
      cargandoKml = false;

    } catch (error) {
      console.error('Error importando KML:', error);
      alert('❌ Error al leer el archivo KML: ' + error);
      cargandoKml = false;
    }
  }

  // --- ELIMINAR LÍMITE ---
  function eliminarLimite() {
    if (!confirm('¿Eliminar el límite de esta congregación?')) return;
    formData.limite_geojson = null;
    tieneLimite = false;
    puntosLimite = 0;
  }
</script>

<div class="modal-backdrop">
  <div class="card-global modal-content">
    
    <div class="modal-header">
      <h2>{datosEdicion ? 'Editar Congregación' : 'Añadir Congregación'}</h2>
      <button class="close-btn" on:click={cerrar} title="Cerrar">
        <X size={20} />
      </button>
    </div>

    <div class="modal-body">
      
      <!-- Fila superior: Nombre y Número JW -->
      <div class="form-group-row mb-15">
        <div class="form-group" style="flex: 3; margin-bottom: 0;">
          <label for="nombre">Nombre de la Congregación *</label>
          <input 
            id="nombre" type="text" 
            class="input-global" 
            placeholder="Ej: AEROPUERTO - HOLGUÍN" 
            bind:value={formData.nombre} 
          />
        </div>
        <div class="form-group" style="flex: 1; margin-bottom: 0;">
          <label for="numero">Número JW</label>
          <input 
            id="numero" type="text" 
            class="input-global" 
            placeholder="Ej: 15636" 
            bind:value={formData.numero_congregacion} 
          />
        </div>
      </div>

      <div class="form-grid">
        <!-- COLUMNA 1: Ubicación -->
        <div class="form-column">
          <h4 class="section-title">Ubicación y Contacto</h4>
          
          <div class="form-group-row" style="margin-bottom: 15px;">
            <div class="form-group half">
              <label for="ciudad">Ciudad</label>
              <input id="ciudad" type="text" class="input-global" bind:value={formData.ciudad} />
            </div>
            <div class="form-group half">
              <label for="provincia">Provincia</label>
              <input id="provincia" type="text" class="input-global" bind:value={formData.provincia} />
            </div>
          </div>

          <div class="form-group">
            <label for="direccion">Dirección del Salón</label>
            <textarea id="direccion" class="input-global" rows="2" placeholder="Dirección completa..." bind:value={formData.direccion_salon}></textarea>
          </div>

          <div class="form-group">
            <label for="mapa">Enlace de Google Maps</label>
            <input id="mapa" type="url" class="input-global" placeholder="https://maps.google.com/..." bind:value={formData.enlace_mapa} />
          </div>

          <div class="form-group">
             <label>Coordenadas (para el mapa del circuito)</label>
             <div class="coords-row">
                <input 
                  type="number" 
                  step="0.000001"
                  class="input-global" 
                  placeholder="Latitud (ej: 20.8871)" 
                  bind:value={formData.latitud} 
                />
                <input 
                  type="number" 
                  step="0.000001"
                  class="input-global" 
                  placeholder="Longitud (ej: -76.2631)" 
                  bind:value={formData.longitud} 
                />
             </div>
             <small class="hint-coords">
                Pega el enlace de Google Maps arriba y extrae los dos números, o usa el botón de abajo.
             </small>
          </div>

          {#if formData.latitud != null && formData.longitud != null}
            <div class="form-group">
               <a 
                 href={`https://www.google.com/maps?q=${formData.latitud},${formData.longitud}`} 
                 target="_blank" 
                 rel="noopener noreferrer"
                 class="btn-ver-mapa"
              >
                <MapPin size={14} /> Verificar ubicación en Google Maps <ExternalLink size={12} />
              </a>
            </div>
          {/if}

          
<div class="form-group">
  <label>Límite del territorio (KML)</label>
  
  {#if !tieneLimite}
    <button 
      type="button" 
      class="btn-importar-kml" 
      on:click={importarKML}
      disabled={cargandoKml}
    >
      <FileUp size={14} /> 
      {cargandoKml ? 'Cargando...' : 'Importar archivo KML'}
    </button>
    <small class="hint-coords">
      Dibuja el territorio en Google Earth y guarda el archivo .kml. Luego impórtalo aquí.
    </small>
  {:else}
    <div class="kml-cargado">
      <div class="kml-info">
        <CheckCircle size={16} color="#16a34a" />
        <div>
          <strong>Límite cargado</strong>
          <div class="kml-detalle">{puntosLimite} puntos</div>
        </div>
      </div>
      <button 
        type="button" 
        class="btn-eliminar-kml" 
        on:click={eliminarLimite}
        title="Eliminar límite"
      >
        <Trash2 size={14} />
      </button>
    </div>
  {/if}
</div>
          
          <div class="form-group">
            <label for="telefono">Teléfono del Salón</label>
            <input id="telefono" type="text" class="input-global" placeholder="Ej: +53..." bind:value={formData.telefono} />
          </div>
        </div>

        <!-- COLUMNA 2: Reuniones -->
        <div class="form-column">
          <h4 class="section-title">Reuniones e Idioma</h4>
          
          <div class="form-group-row">
            <div class="form-group half">
              <label for="diaSemana">Día (Semana)</label>
              <select id="diaSemana" class="input-global" bind:value={formData.diaSemana}>
                <option value="">Seleccionar...</option>
                <option value="Lunes">Lunes</option>
                <option value="Martes">Martes</option>
                <option value="Miércoles">Miércoles</option>
                <option value="Jueves">Jueves</option>
                <option value="Viernes">Viernes</option>
              </select>
            </div>
            <div class="form-group half">
              <label for="horaSemana">Hora</label>
              <input id="horaSemana" type="time" class="input-global" bind:value={formData.horaSemana} />
            </div>
          </div>

          <div class="form-group-row">
            <div class="form-group half">
              <label for="diaFinSemana">Día (Fin de Sem.)</label>
              <select id="diaFinSemana" class="input-global" bind:value={formData.diaFinSemana}>
                <option value="">Seleccionar...</option>
                <option value="Sábado">Sábado</option>
                <option value="Domingo">Domingo</option>
              </select>
            </div>
            <div class="form-group half">
              <label for="horaFinSemana">Hora</label>
              <input id="horaFinSemana" type="time" class="input-global" bind:value={formData.horaFinSemana} />
            </div>
          </div>

          <div class="form-group checkbox-group mt-10">
            <label class="checkbox-label">
              <input type="checkbox" bind:checked={formData.esLenguaSenas} />
              <span>Es congregación de Lengua de Señas</span>
            </label>
          </div>
        </div>
      </div>
    </div>

    <div class="modal-actions">
      <button class="btn-global" on:click={cerrar}>Cancelar</button>
      <button class="btn-global btn-primary" on:click={guardar}>
        <Save size={16} /> Guardar
      </button>
    </div>

  </div>
</div>

<style>
  /* FONDO OSCURO BORROSO */
  .modal-backdrop {
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(4px);
    display: flex; justify-content: center; align-items: center; z-index: 1000;
  }

  /* CONTENEDOR DEL MODAL */
  .modal-content {
    width: 90%; max-width: 750px;
    max-height: 90vh; display: flex; flex-direction: column;
    padding: 0; overflow: hidden; animation: scaleIn 0.2s ease-out;
  }

  /* CABECERA */
  .modal-header {
    display: flex; justify-content: space-between; align-items: center;
    padding: 20px 25px; border-bottom: 1px solid var(--border-color);
    background: var(--bg-panel);
  }
  .modal-header h2 { margin: 0; font-size: 1.4rem; color: var(--text-main); }
  
  .close-btn {
    background: none; border: none; color: var(--text-muted);
    cursor: pointer; padding: 5px; border-radius: 5px; transition: 0.2s;
  }
  .close-btn:hover { background: var(--bg-app); color: var(--text-main); }

  /* CUERPO Y SCROLL */
  .modal-body {
    padding: 25px; overflow-y: auto; background: var(--bg-app);
  }

  .section-title {
    font-size: 0.85rem; color: var(--primary); text-transform: uppercase;
    letter-spacing: 0.5px; border-bottom: 1px solid var(--border-color);
    padding-bottom: 5px; margin-bottom: 15px; margin-top: 0;
  }

  /* GRILLA DEL FORMULARIO */
  .form-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 30px;
  }

  .form-group { margin-bottom: 15px; display: flex; flex-direction: column; }
  .mb-15 { margin-bottom: 20px; }
  
  .form-group-row { display: flex; gap: 15px; margin-bottom: 15px; }
  .form-group.half { margin-bottom: 0; flex: 1; }

  label {
    font-size: 0.85rem; font-weight: 600; color: var(--text-muted); margin-bottom: 6px;
  }

  /* ELEMENTOS DE FORMULARIO (Se apoyan en tu .input-global) */
  textarea.input-global { resize: vertical; min-height: 42px; font-family: inherit; }

  /* CHECKBOX PERSONALIZADO */
  .checkbox-group { flex-direction: row; align-items: center; }
  .mt-10 { margin-top: 10px; }
  .checkbox-label {
    display: flex; align-items: center; gap: 10px; cursor: pointer; color: var(--text-main); font-weight: 500;
  }
  .checkbox-label input[type="checkbox"] {
    width: 18px; height: 18px; accent-color: var(--primary); cursor: pointer;
  }

  /* ACCIONES (BOTONES) */
  .modal-actions {
    padding: 20px 25px; border-top: 1px solid var(--border-color);
    background: var(--bg-panel); display: flex; justify-content: flex-end; gap: 12px;
  }

  .btn-primary { background: var(--primary); color: white; border: none; }
  .btn-primary:hover { background: #be123c; color: white; }

  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }

  @media (max-width: 600px) {
    .form-grid { grid-template-columns: 1fr; gap: 15px; }
    .form-group-row { flex-direction: column; gap: 15px; }
  }

  /* === COORDENADAS LAT/LNG === */
.coords-row {
  display: flex;
  gap: 10px;
}

.coords-row .input-global {
  flex: 1;
  min-width: 0; /* Evita que el input se desborde */
}

/* Ocultar las flechitas del input[type=number] para que se vea más limpio */
.coords-row input[type=number]::-webkit-outer-spin-button,
.coords-row input[type=number]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.coords-row input[type=number] {
  -moz-appearance: textfield;
  appearance: textfield;
}

.hint-coords {
  font-size: 0.72rem;
  color: var(--text-muted);
  margin-top: 4px;
  font-style: italic;
  line-height: 1.3;
}

.btn-ver-mapa {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 8px 12px;
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-main);
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 600;
  transition: all 0.2s ease;
}

.btn-ver-mapa:hover {
  border-color: var(--primary);
  color: var(--primary);
  background: rgba(225, 29, 72, 0.05);
}

/* En móvil, apilamos los dos inputs */
@media (max-width: 600px) {
  .coords-row {
    flex-direction: column;
    gap: 8px;
  }
}


  /* === IMPORTAR KML === */
  .btn-importar-kml {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 10px 12px;
    background: var(--bg-panel);
    border: 1px dashed var(--border-color);
    border-radius: var(--radius-sm);
    color: var(--text-main);
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .btn-importar-kml:hover:not(:disabled) {
    border-color: var(--primary);
    color: var(--primary);
    background: rgba(225, 29, 72, 0.05);
    border-style: solid;
  }
  .btn-importar-kml:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .kml-cargado {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 10px 12px;
    background: rgba(34, 197, 94, 0.08);
    border: 1px solid rgba(34, 197, 94, 0.3);
    border-radius: var(--radius-sm);
  }

  .kml-info {
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--text-main);
    font-size: 0.85rem;
  }

  .kml-detalle {
    font-size: 0.75rem;
    color: var(--text-muted);
    margin-top: 2px;
  }

  .btn-eliminar-kml {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 6px;
    border: 1px solid rgba(239, 68, 68, 0.4);
    background: transparent;
    color: #ef4444;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .btn-eliminar-kml:hover {
    background: #ef4444;
    color: white;
    border-color: #ef4444;
  }
</style>