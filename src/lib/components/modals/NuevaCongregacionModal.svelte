<script lang="ts">
  import { circuitoActivo } from '$lib/stores/appStore';
  import { X, Clock } from "lucide-svelte";
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  let nombre = "";
  let numero = "";
  let ciudad = "";
  let provincia = "";
  let pais = "Cuba";
  let idioma = "Español";
  let esLenguaSenas = false;
  let telefono = "";
  let horaSemana = "";
  let horaFinSemana = "";

  function cerrar() {
    console.log("Modal: cerrar()");
    dispatch('close');
  }

  function guardar() {
    const nuevaCong = {
      circuito: $circuitoActivo,
      nombre,
      numero,
      ciudad,
      provincia,
      pais,
      idioma,
      esLenguaSenas,
      telefono,
      horaSemana,
      horaFinSemana
    };

    console.log("Modal: dispatch save =>", nuevaCong);
    dispatch('save', nuevaCong);
    cerrar();
  }
</script>

<div class="modal-overlay" on:click|self={cerrar}>
  <div class="modal-content">
    <header>
      <h3>Nueva Congregación</h3>
      <button class="close-btn" on:click={cerrar}><X size={20} /></button>
    </header>

    <div class="form-grid">
      <div class="field full">
        <label>Nombre de Congregación *</label>
        <input type="text" bind:value={nombre} placeholder="Ej. Aeropuerto" />
      </div>
      
      <div class="field">
        <label>Número</label>
        <input type="text" bind:value={numero} placeholder="Número de congregación" />
      </div>

      <div class="field">
        <label>Ciudad *</label>
        <input type="text" bind:value={ciudad} />
      </div>

      <div class="field">
        <label>Estado/Provincia</label>
        <input type="text" bind:value={provincia} />
      </div>

      <div class="field">
        <label>País</label>
        <select bind:value={pais}>
          <option>Cuba</option>
        </select>
      </div>

      <div class="field">
        <label>Idioma</label>
        <select bind:value={idioma}>
          <option>Español</option>
        </select>
      </div>

      <div class="field checkbox">
        <label>
          <input type="checkbox" bind:checked={esLenguaSenas} /> 
          Lengua de señas
        </label>
      </div>

      <div class="field">
        <label>Núm. de Teléfono Principal</label>
        <input type="text" bind:value={telefono} />
      </div>

      <div class="field">
        <label><Clock size={14}/> Reunión entre semana</label>
        <input type="time" bind:value={horaSemana} />
      </div>

      <div class="field">
        <label><Clock size={14}/> Reunión de fin de semana</label>
        <input type="time" bind:value={horaFinSemana} />
      </div>
    </div>

    <footer>
      <button class="btn-sec" on:click={cerrar}>Cancelar</button>
      <button class="btn-pri" on:click={guardar}>Guardar Congregación</button>
    </footer>
  </div>
</div>

<style>
  .modal-overlay { 
    position: fixed; 
    top: 0; 
    left: 0; 
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.7);
    display: flex; 
    align-items: center; 
    justify-content: center; 
    z-index: 99999;
  }
  
  .modal-content { 
    background: white; 
    width: 90%; 
    max-width: 700px; 
    border-radius: 16px; 
    padding: 24px; 
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); 
    position: relative;
  }

  header { 
    display: flex; 
    justify-content: space-between; 
    margin-bottom: 20px; 
    border-bottom: 1px solid #eee; 
    padding-bottom: 15px; 
  }

  .form-grid { 
    display: grid; 
    grid-template-columns: 1fr 1fr; 
    gap: 15px; 
  }

  .field { 
    display: flex; 
    flex-direction: column; 
    gap: 5px; 
  }

  .field.full { 
    grid-column: span 2; 
  }

  label { 
    font-size: 12px; 
    font-weight: 600; 
    color: #64748b; 
    display: flex; 
    align-items: center; 
    gap: 5px; 
  }

  input, select { 
    padding: 10px; 
    border: 1px solid #e2e8f0; 
    border-radius: 8px; 
    font-size: 14px; 
  }

  .checkbox { 
    flex-direction: row; 
    align-items: center; 
    padding-top: 25px; 
  }

  footer { 
    display: flex; 
    justify-content: flex-end; 
    gap: 10px; 
    margin-top: 30px; 
  }

  .btn-pri { 
    background: #e11d48; 
    color: white; 
    border: none; 
    padding: 10px 20px; 
    border-radius: 8px; 
    cursor: pointer; 
    font-weight: 600; 
  }

  .btn-sec { 
    background: #f1f5f9; 
    color: #64748b; 
    border: none; 
    padding: 10px 20px; 
    border-radius: 8px; 
    cursor: pointer; 
  }
</style>