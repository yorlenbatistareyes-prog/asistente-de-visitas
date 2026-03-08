<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { X, Save } from 'lucide-svelte';

  export let datosEdicion: any = null;

  const dispatch = createEventDispatcher();

  // Estructura de datos basada en tu base de datos SQLite
  let formData = {
    id: undefined,
    nombre: '',
    ciudad: '',
    provincia: '',
    pais: 'Cuba', // Valor por defecto para ahorrar tiempo
    idioma: 'Español',
    esLenguaSenas: false,
    telefono: '',
    diaSemana: '',
    horaSemana: '',
    diaFinSemana: '',
    horaFinSemana: '',
    enVisita: false
  };

  onMount(() => {
    if (datosEdicion) {
      formData = { ...datosEdicion };
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
      <div class="form-group full-width">
        <label for="nombre">Nombre de la Congregación *</label>
        <input 
          id="nombre" type="text" 
          class="input-global" 
          placeholder="Ej: Centro, Norte, etc." 
          bind:value={formData.nombre} 
        />
      </div>

      <div class="form-grid">
        <div class="form-column">
          <h4 class="section-title">Ubicación y Contacto</h4>
          
          <div class="form-group">
            <label for="ciudad">Ciudad / Municipio</label>
            <input id="ciudad" type="text" class="input-global" bind:value={formData.ciudad} />
          </div>
          
          <div class="form-group">
            <label for="provincia">Provincia</label>
            <input id="provincia" type="text" class="input-global" bind:value={formData.provincia} />
          </div>

          <div class="form-group">
            <label for="telefono">Teléfono del Salón</label>
            <input id="telefono" type="text" class="input-global" placeholder="Ej: +53..." bind:value={formData.telefono} />
          </div>
        </div>

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
    width: 90%; max-width: 700px; /* Más ancho para las 2 columnas */
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
  .form-group.full-width { margin-bottom: 25px; }
  
  .form-group-row { display: flex; gap: 10px; margin-bottom: 15px; }
  .form-group.half { margin-bottom: 0; flex: 1; }

  label {
    font-size: 0.85rem; font-weight: 600; color: var(--text-muted); margin-bottom: 6px;
  }

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
</style>
