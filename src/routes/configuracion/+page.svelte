<script lang="ts">
  import { User, Database, Globe, Bell, Save, ArrowLeft } from 'lucide-svelte';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  
  // Variables de estado (Luego conectaremos con SQLite)
  let nombreUsuario = "Yorlen";
  let idioma = "Español";
  let notificaciones = true;

  function volver() {
    // Regresa a la página anterior
    window.history.back();
  }

  async function guardarCambios() {
    // Aquí irá la lógica para guardar en la tabla 'configuracion' de db.ts
    console.log("Guardando configuración...");
    volver();
  }
</script>

<div class="config-page">
  <header class="config-header">
    <button class="btn-back" on:click={volver}>
      <ArrowLeft size={20} /> Volver
    </button>
    <h1>Configuración Global</h1>
  </header>

  <div class="config-grid">
    <section class="card-global config-section">
      <div class="section-icon"><User size={24} /></div>
      <div class="section-content">
        <h3>Perfil de Usuario</h3>
        <p>Personaliza cómo apareces en los informes.</p>
        
        <div class="form-group">
          <label for="username">Nombre de Usuario</label>
          <input id="username" type="text" class="input-global" bind:value={nombreUsuario} />
        </div>
      </div>
    </section>

    <section class="card-global config-section">
      <div class="section-icon"><Globe size={24} /></div>
      <div class="section-content">
        <h3>Preferencias de la App</h3>
        <p>Configura el idioma y comportamiento general.</p>
        
        <div class="form-group">
          <label for="lang">Idioma Predeterminado</label>
          <select id="lang" class="input-global" bind:value={idioma}>
            <option value="Español">Español</option>
            <option value="English">English</option>
          </select>
        </div>
      </div>
    </section>

    <section class="card-global config-section">
      <div class="section-icon"><Database size={24} /></div>
      <div class="section-content">
        <h3>Base de Datos</h3>
        <p>Estado del motor SQLite y almacenamiento.</p>
        
        <div class="db-status">
          <span class="status-dot"></span> 
          <span>Conectado a <code>av_database.db</code></span>
        </div>
        
        <button class="btn-global danger-btn">Resetear Aplicación (Cuidado)</button>
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

<style>
  .config-page { max-width: 900px; margin: 0 auto; padding-bottom: 50px; animation: fadeIn 0.3s ease-out; }

  .config-header { display: flex; align-items: center; gap: 20px; margin-bottom: 40px; }
  .config-header h1 { margin: 0; font-size: 2rem; color: var(--text-main); }
  
  .btn-back { background: none; border: none; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; gap: 8px; font-weight: 600; }
  .btn-back:hover { color: var(--primary); }

  .config-grid { display: flex; flex-direction: column; gap: 25px; }

  .config-section { display: flex; gap: 25px; padding: 30px; }
  .section-icon { color: var(--primary); background: var(--bg-app); padding: 15px; border-radius: 15px; height: fit-content; }
  
  .section-content { flex: 1; }
  .section-content h3 { margin: 0 0 5px 0; font-size: 1.3rem; }
  .section-content p { margin: 0 0 20px 0; color: var(--text-muted); font-size: 0.9rem; }

  .form-group label { display: block; font-size: 0.85rem; font-weight: 700; margin-bottom: 8px; color: var(--text-muted); }

  .db-status { display: flex; align-items: center; gap: 10px; font-size: 0.9rem; margin-bottom: 15px; }
  .status-dot { width: 10px; height: 10px; background: #22c55e; border-radius: 50%; }

  .danger-btn { border-color: #ef4444; color: #ef4444; margin-top: 10px; }
  .danger-btn:hover { background: #fee2e2; }

  .config-footer { margin-top: 40px; display: flex; justify-content: flex-end; gap: 15px; border-top: 1px solid var(--border-color); padding-top: 25px; }
  .btn-primary { background: var(--primary); color: white; border: none; }

  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>
