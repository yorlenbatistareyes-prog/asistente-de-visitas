<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/core'; // O '@tauri-apps/api/tauri'
  import { Calendar, Plus, CheckCircle2, Check, Trash2, Edit3, X, ArrowLeft, AlertTriangle, Briefcase, Clock } from 'lucide-svelte';
  import { slide, fade, fly } from 'svelte/transition';

  const dispatch = createEventDispatcher();

  // --- 1. TIPOS ---
  interface Task {
    id: number;
    title: string;
    date: string; // YYYY-MM-DD
    priority: 'Alta' | 'Normal';
    completed: boolean;
  }

  interface TaskForm {
    title: string;
    date: string;
    priority: 'Alta' | 'Normal';
  }

  // --- 2. ESTADO ---
  let tasks: Task[] = [];
  let showModal = false;
  
  // Por defecto, la fecha de hoy al abrir el modal
  const getTodayStr = () => new Date().toISOString().split('T')[0];
  
  let newTask: TaskForm = { title: '', date: getTodayStr(), priority: 'Normal' };
  let editingTask: Task | null = null;

  $: pendingCount = tasks.filter(t => !t.completed).length;

  // --- 3. LÓGICA DE AGRUPACIÓN POR FECHA ---
  
  // Obtenemos todas las fechas únicas de las tareas pendientes, ordenadas
  $: uniqueDates = [...new Set(tasks.filter(t => !t.completed).map(t => t.date))].sort();

  // Función para formatear fecha bonita (Ej: "Lunes, 25 de Octubre")
  function formatDateNice(dateStr: string) {
    if (!dateStr) return 'Sin fecha';
    const date = new Date(dateStr + 'T12:00:00'); // T12 para evitar problemas de zona horaria
    return new Intl.DateTimeFormat('es-ES', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long' 
    }).format(date);
  }

  // Helper para saber si una fecha es HOY (para resaltarla)
  function isToday(dateStr: string) {
      return dateStr === getTodayStr();
  }

  // --- 4. CICLO DE VIDA ---
  onMount(async () => {
    try {
      tasks = await invoke('get_personal_agenda');
    } catch (error) {
      console.log("Iniciando agenda limpia.");
      tasks = []; 
    }
  });

  // --- 5. FUNCIONES ---
  async function saveTask() {
    if (editingTask) {
      tasks = tasks.map(t => t.id === editingTask!.id ? { ...t, ...newTask } : t);
      editingTask = null;
    } else {
      try {
        await invoke('add_personal_task', { ...newTask });
        const updated = await invoke('get_personal_agenda') as Task[];
        if(updated && updated.length > tasks.length) tasks = updated;
        else tasks = [...tasks, { id: Date.now(), ...newTask, completed: false }];
      } catch (e) {
        tasks = [...tasks, { id: Date.now(), ...newTask, completed: false }];
      }
    }
    closeModal();
  }

  function toggleComplete(id: number) {
    tasks = tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
  }

  function prepareEdit(task: Task) {
    editingTask = task;
    newTask = { title: task.title, date: task.date, priority: task.priority };
    showModal = true;
  }

  function deleteTask(id: number) {
    if(confirm('¿Eliminar este asunto?')) {
        tasks = tasks.filter(t => t.id !== id);
    }
  }

  function closeModal() {
    newTask = { title: '', date: getTodayStr(), priority: 'Normal' };
    showModal = false;
    editingTask = null;
  }

  // ... resto de tu código ...

  // Función para enfocar el input automáticamente sin usar 'autofocus'
  function enfocar(node: HTMLElement) {
    node.focus();
  }
</script>

<div class="layout-wrapper">
  <header class="main-header">
    <div class="header-content">
      <div class="title-section">
        <button on:click={() => dispatch('volver')} class="btn-back" title="Volver">
          <ArrowLeft size={22} />
        </button>
        <div class="text-info">
          <h1>Agenda del Superintendente</h1>
          <p class="subtitle">Gestión de asuntos por fecha</p>
        </div>
      </div>
      
      <div class="status-indicator {pendingCount > 0 ? 'has-pending' : 'all-done'}">
        <Briefcase size={18} />
        <span>{pendingCount} Pendientes</span>
      </div>
    </div>
  </header>

  <div class="content-body">
    <div class="action-bar">
        <button class="btn-primary-solid" on:click={() => showModal = true}>
            <Plus size={20} strokeWidth={2.5} />
            <span>Nuevo Asunto</span>
        </button>
    </div>

    <div class="tasks-wrapper">
      
      {#if tasks.filter(t => !t.completed).length === 0}
        <div class="empty-state" in:fade>
          <div class="icon-bg">
            <CheckCircle2 size={64} color="#10b981" />
          </div>
          <h3>¡Todo al día!</h3>
          <p>No tienes asuntos programados.</p>
          <button class="btn-text" on:click={() => showModal = true}>Agendar un asunto</button>
        </div>
      {:else}
        
        {#each uniqueDates as dateStr}
          <div class="day-section" transition:slide|local>
            <div class="day-label {isToday(dateStr) ? 'is-today' : ''}">
                <Calendar size={16} />
                {formatDateNice(dateStr)}
                {#if isToday(dateStr)}<span class="badge-today">HOY</span>{/if}
            </div>
            
            <div class="cards-grid">
              {#each tasks.filter(t => t.date === dateStr && !t.completed) as task (task.id)}
                <div class="task-card priority-{task.priority.toLowerCase()}" transition:fly={{y: 10, duration: 300}}>
                  
                  <button class="check-area" on:click={() => toggleComplete(task.id)} aria-label="Marcar tarea como completada">
                      <div class="custom-checkbox"></div>
                  </button>

                  <div class="card-body">
                    <span class="task-text">{task.title}</span>
                    {#if task.priority === 'Alta'}
                        <div class="badge-urgent">
                            <AlertTriangle size={12} /> Urgente
                        </div>
                    {/if}
                  </div>

                  <div class="card-actions">
                    <button class="icon-btn edit" on:click={() => prepareEdit(task)}><Edit3 size={16}/></button>
                    <button class="icon-btn delete" on:click={() => deleteTask(task.id)}><Trash2 size={16}/></button>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/each}
      {/if}

      {#if tasks.some(t => t.completed)}
        <div class="completed-container">
            <div class="divider-line">
                <span>Historial de completados</span>
            </div>
            {#each tasks.filter(t => t.completed) as task}
                <div class="task-row-completed" transition:fade>
                    <div class="check-done">
                        <CheckCircle2 size={18} color="#94a3b8" />
                    </div>
                    <span class="text-done">{task.title}</span>
                    <span class="date-done">{formatDateNice(task.date)}</span>
                    <button class="btn-undo" on:click={() => toggleComplete(task.id)}>Deshacer</button>
                </div>
            {/each}
        </div>
      {/if}
    </div>
  </div>

  {#if showModal}
    <div 
      class="modal-overlay" 
      role="button" 
      tabindex="0"
      on:click={closeModal} 
      on:keydown={(e) => e.key === 'Enter' && closeModal()}
      transition:fade={{duration: 150}}
    >
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <div 
        class="modal-box" 
        role="document"
        on:click|stopPropagation 
        on:keydown|stopPropagation
        transition:fly={{y: 50}}
      >
        <div class="modal-top">
          <h3>{editingTask ? 'Editar' : 'Agendar'} Asunto</h3>
          <button on:click={closeModal} class="btn-close"><X size={20}/></button>
        </div>
        
        <form on:submit|preventDefault={saveTask}>
          <div class="input-group">
            <label for="desc">Descripción</label>
            <input 
              id="desc" 
              bind:value={newTask.title} 
              placeholder="Escribe el asunto..." 
              required 
              use:enfocar 
            />
          </div>

          <div class="row-inputs">
            <div class="input-group">
                <label for="date-picker">Fecha Programada</label>
                <div class="input-wrapper">
                    <input 
                        id="date-picker" 
                        type="date" 
                        bind:value={newTask.date} 
                        required 
                        class="date-input"
                    />
                </div>
            </div>

            <div class="input-group">
                <label for="prio">Prioridad</label>
                <div class="select-wrapper">
                    <AlertTriangle size={16} class="sel-icon"/>
                    <select id="prio" bind:value={newTask.priority}>
                        <option value="Normal">Normal</option>
                        <option value="Alta">Alta</option>
                    </select>
                </div>
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn-flat" on:click={closeModal}>Cancelar</button>
            <button type="submit" class="btn-solid">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  {/if}
</div>

<style>
  /* --- ESTILOS GENERALES --- */
  .layout-wrapper {
    background-color: #f8fafc;
    min-height: 100vh;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #334155;
  }

  .main-header {
    background: white; padding: 15px 30px; border-bottom: 1px solid #e2e8f0;
    display: flex; justify-content: center;
  }
  .header-content { max-width: 1000px; width: 100%; display: flex; justify-content: space-between; align-items: center; }
  .title-section { display: flex; align-items: center; gap: 15px; }
  .btn-back {
    background: white; border: 1px solid #cbd5e1; color: #64748b; width: 40px; height: 40px;
    border-radius: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer;
  }
  .btn-back:hover { background: #f1f5f9; color: #334155; }
  .text-info h1 { font-size: 1.25rem; font-weight: 700; margin: 0; color: #0f172a; }
  .subtitle { font-size: 0.85rem; color: #64748b; margin: 2px 0 0 0; }

  .status-indicator {
    padding: 6px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 600;
    display: flex; align-items: center; gap: 6px;
  }
  .has-pending { background: #fff1f2; color: #e11d48; border: 1px solid #fecdd3; }
  .all-done { background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; }

  .content-body { max-width: 1000px; margin: 0 auto; padding: 30px; }
  .action-bar { margin-bottom: 30px; }
  
  .btn-primary-solid {
    background-color: #e11d48; color: white; border: none; padding: 10px 20px;
    border-radius: 8px; font-weight: 500; display: flex; align-items: center; gap: 8px;
    cursor: pointer; box-shadow: 0 4px 6px -1px rgba(225, 29, 72, 0.2);
    transition: transform 0.1s;
  }
  .btn-primary-solid:active { transform: scale(0.98); }

  /* --- AGRUPACIÓN POR FECHA --- */
  .day-section { margin-bottom: 30px; }
  .day-label {
    font-size: 0.95rem; font-weight: 700; color: #64748b; margin-bottom: 12px;
    text-transform: capitalize; display: flex; align-items: center; gap: 8px;
  }
  .day-label.is-today { color: #e11d48; }
  .badge-today {
    background: #e11d48; color: white; font-size: 0.7rem; padding: 2px 6px;
    border-radius: 4px; text-transform: uppercase;
  }

  .cards-grid { display: flex; flex-direction: column; gap: 10px; }
  .task-card {
    background: white; border: 1px solid #e2e8f0; border-radius: 12px;
    padding: 12px 16px; display: flex; align-items: center; gap: 15px;
    transition: all 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.03);
  }
  .task-card:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }

  .check-area { background: none; border: none; cursor: pointer; padding: 0; }
  .custom-checkbox {
    width: 22px; height: 22px; border: 2px solid #cbd5e1; border-radius: 6px; transition: all 0.2s;
  }
  .check-area:hover .custom-checkbox { border-color: #e11d48; }
  
  .priority-alta { border-left: 4px solid #e11d48; }
  .badge-urgent {
    display: inline-flex; align-items: center; gap: 4px; background: #fff1f2;
    color: #e11d48; font-size: 0.7rem; padding: 2px 8px; border-radius: 4px;
    font-weight: 700; text-transform: uppercase; margin-left: 10px;
  }

  .card-body { flex: 1; display: flex; align-items: center; flex-wrap: wrap; }
  .task-text { font-size: 1rem; color: #1e293b; font-weight: 500; }
  .card-actions { display: flex; gap: 5px; opacity: 0; transition: opacity 0.2s; }
  .task-card:hover .card-actions { opacity: 1; }
  
  .icon-btn {
    background: white; border: 1px solid #e2e8f0; color: #64748b; width: 32px; height: 32px;
    border-radius: 6px; display: flex; align-items: center; justify-content: center; cursor: pointer;
  }
  .icon-btn:hover { background: #f8fafc; color: #334155; }
  .icon-btn.delete:hover { border-color: #fecdd3; color: #e11d48; background: #fff1f2; }

  /* --- MODAL --- */
  .modal-overlay {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(2px);
    display: flex; align-items: center; justify-content: center; z-index: 1000;
  }
  .modal-box {
    background: white; width: 90%; max-width: 450px; border-radius: 16px;
    padding: 25px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  }
  .modal-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
  .modal-top h3 { margin: 0; font-size: 1.2rem; color: #0f172a; }

  .input-group { margin-bottom: 15px; }
  .input-group label { display: block; margin-bottom: 8px; font-weight: 600; font-size: 0.9rem; color: #334155; }
  
  .input-group input, .select-wrapper select, .date-input {
    width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px;
    font-size: 1rem; color: #0f172a; box-sizing: border-box; font-family: inherit;
  }
  
  .row-inputs { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
  .select-wrapper { position: relative; }
  .select-wrapper select { padding-left: 36px; appearance: none; background: white; }
  .sel-icon { position: absolute; left: 10px; top: 12px; color: #64748b; pointer-events: none; }

  .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 25px; }
  .btn-flat { background: white; border: 1px solid #e2e8f0; color: #334155; padding: 10px 20px; border-radius: 8px; cursor: pointer; }
  .btn-solid { background: #e11d48; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 500; cursor: pointer; }

  /* --- EMPTY STATE & COMPLETADOS --- */
  .empty-state {
    text-align: center; padding: 60px 20px; background: white;
    border-radius: 16px; border: 1px dashed #e2e8f0;
  }
  .icon-bg {
    background: #ecfdf5; width: 100px; height: 100px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center; margin: 0 auto 20px auto;
  }
  .btn-text { background: none; border: none; color: #e11d48; font-weight: 600; cursor: pointer; }

  .completed-container { margin-top: 50px; }
  .divider-line {
    display: flex; align-items: center; color: #94a3b8; font-size: 0.85rem; margin-bottom: 15px;
  }
  .divider-line::before, .divider-line::after { content: ''; flex: 1; height: 1px; background: #e2e8f0; }
  .divider-line span { padding: 0 15px; }
  
  .task-row-completed {
    display: flex; align-items: center; gap: 12px; padding: 8px 15px; opacity: 0.6; transition: opacity 0.2s;
  }
  .task-row-completed:hover { opacity: 1; }
  .text-done { text-decoration: line-through; color: #64748b; flex: 1; }
  .date-done { font-size: 0.8rem; color: #94a3b8; margin-right: 10px; }
  .btn-undo { background: none; border: none; color: #3b82f6; font-size: 0.85rem; cursor: pointer; }
  .btn-undo:hover { text-decoration: underline; }
</style>