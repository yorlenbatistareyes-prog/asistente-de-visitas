<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  // Tipos explícitos para evitar errores TypeScript
  interface Task {
    id: number;
    title: string;
    date: string;
    time: string;
    completed: boolean;
  }
  
  interface TaskForm {
    title: string;
    date: string;
    time: string;
  }
  
  // Importaciones de lucide-svelte
  import { Calendar, Clock, PlusCircle, CheckCircle, Circle, Trash2, Edit2, X } from 'lucide-svelte';
  
  // Crear dispatcher para eventos
  const dispatch = createEventDispatcher();
  
  // Estado con tipos explícitos
  let tasks: Task[] = [
    { id: 1, title: 'Revisar sistema de seguridad', date: '2024-10-05', time: '10:00', completed: false },
    { id: 2, title: 'Actualizar base de datos', date: '2024-10-06', time: '14:00', completed: false },
    { id: 3, title: 'Contactar proveedor', date: '2024-10-04', time: '16:00', completed: true },
  ];
  
  let showModal: boolean = false;
  let newTask: TaskForm = { title: '', date: '', time: '' };
  let editingTask: Task | null = null;
  
  // Declarar las variables primero
  let pendingCount: number;
  let todayCount: number;
  
  // Luego definir las declaraciones reactivas (sin anotaciones de tipo aquí)
  $: pendingCount = tasks.filter(t => !t.completed).length;
  
  $: todayCount = tasks.filter(t => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    return !t.completed && t.date === todayStr;
  }).length;
  
  // Función para agregar/editar tarea
  function saveTask(): void {
    if (editingTask) {
      // Actualizar tarea existente
      tasks = tasks.map(t => {
        if (t.id === editingTask!.id) {
          return { 
            ...t, 
            title: newTask.title, 
            date: newTask.date, 
            time: newTask.time 
          };
        }
        return t;
      });
      editingTask = null;
    } else {
      // Crear nueva tarea
      tasks = [...tasks, {
        id: Date.now(),
        title: newTask.title,
        date: newTask.date,
        time: newTask.time,
        completed: false
      }];
    }
    
    // Resetear formulario y cerrar modal
    newTask = { title: '', date: '', time: '' };
    showModal = false;
  }
  
  // Función para eliminar tarea
  function deleteTask(id: number): void {
    tasks = tasks.filter(t => t.id !== id);
  }
  
  // Función para marcar como completada
  function toggleComplete(task: Task): void {
    tasks = tasks.map(t => {
      if (t.id === task.id) {
        return { ...t, completed: !t.completed };
      }
      return t;
    });
  }
  
  // Función para editar tarea
  function editTask(task: Task): void {
    editingTask = task;
    newTask = { 
      title: task.title, 
      date: task.date, 
      time: task.time 
    };
    showModal = true;
  }
  
  // Función para formatear fecha
  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  }
  
  // Función para volver al dashboard
  function volverAlDashboard(): void {
    dispatch('volver');
  }
</script>

<div class="asuntos-pendientes">
  <!-- Header con botón de volver -->
  <div class="header" style="display: flex; justify-content: space-between; align-items: center;">
    <div style="display: flex; align-items: center; gap: 10px;">
      <Calendar size={24} />
      <h1>Asuntos Pendientes</h1>
    </div>
    
    <button 
      class="btn-volver" 
      on:click={volverAlDashboard}
    >
      ← Volver al Dashboard
    </button>
  </div>
  
  <!-- Contadores -->
  <div class="contadores">
  <div class="contador">
    <div class="numero">{pendingCount}</div>
    <div class="label">Pendientes</div>
  </div>
  <div class="contador">
    <div class="numero">{todayCount}</div>
    <div class="label">Para hoy</div>
  </div>
</div>
  
  <!-- Botón agregar -->
  <button class="btn-agregar" on:click={() => { 
    newTask = { title: '', date: '', time: '' };
    editingTask = null;
    showModal = true;
  }}>
    <PlusCircle size={20} />
    Agregar Asunto
  </button>
  
  <!-- Lista de tareas -->
  <div class="lista-tareas">
    {#each tasks.filter(t => !t.completed) as task (task.id)}
      <div class="tarea">
        <div class="tarea-check" on:click={() => toggleComplete(task)}>
          {#if task.completed}
            <CheckCircle size={20} color="green" />
          {:else}
            <Circle size={20} color="#ccc" />
          {/if}
        </div>
        
        <div class="tarea-info">
          <div class="tarea-titulo">{task.title}</div>
          <div class="tarea-fecha">
            <Calendar size={14} />
            {formatDate(task.date)}
            {#if task.time}
              <span class="tarea-hora">
                <Clock size={14} />
                {task.time}
              </span>
            {/if}
          </div>
        </div>
        
        <div class="tarea-acciones">
          <button class="btn-icon" on:click={() => editTask(task)} title="Editar">
            <Edit2 size={16} />
          </button>
          <button class="btn-icon" on:click={() => deleteTask(task.id)} title="Eliminar">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    {:else}
      <div class="lista-vacia">
        <p>🎉 ¡No tienes asuntos pendientes!</p>
      </div>
    {/each}
    
    <!-- Tareas completadas (colapsables) -->
    {#if tasks.filter(t => t.completed).length > 0}
      <details class="seccion-completadas">
        <summary>
          <CheckCircle size={16} />
          Completadas ({tasks.filter(t => t.completed).length})
        </summary>
        
        <div class="tareas-completadas">
          {#each tasks.filter(t => t.completed) as task (task.id)}
            <div class="tarea completada">
              <div class="tarea-check" on:click={() => toggleComplete(task)}>
                <CheckCircle size={20} color="green" />
              </div>
              
              <div class="tarea-info">
                <div class="tarea-titulo">{task.title}</div>
                <div class="tarea-fecha">
                  <Calendar size={14} />
                  {formatDate(task.date)}
                </div>
              </div>
              
              <div class="tarea-acciones">
                <button class="btn-icon" on:click={() => deleteTask(task.id)} title="Eliminar">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          {/each}
        </div>
      </details>
    {/if}
  </div>
  
  <!-- Modal para agregar/editar -->
  {#if showModal}
    <div class="modal-overlay" on:click={() => showModal = false}>
      <div class="modal" on:click|stopPropagation>
        <div class="modal-header">
          <h2>{editingTask ? 'Editar Asunto' : 'Nuevo Asunto'}</h2>
          <button class="btn-cerrar" on:click={() => showModal = false} title="Cerrar">
            <X size={24} />
          </button>
        </div>
        
        <form on:submit|preventDefault={saveTask}>
          <div class="form-group">
            <label for="titulo">Título *</label>
            <input 
              id="titulo" 
              type="text" 
              bind:value={newTask.title}
              placeholder="¿Qué necesitas hacer?"
              required
              autofocus
            />
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="fecha">
                <Calendar size={16} />
                Fecha
              </label>
              <input 
                id="fecha" 
                type="date" 
                bind:value={newTask.date}
                required
              />
            </div>
            
            <div class="form-group">
              <label for="hora">
                <Clock size={16} />
                Hora (opcional)
              </label>
              <input 
                id="hora" 
                type="time" 
                bind:value={newTask.time}
              />
            </div>
          </div>
          
          <div class="modal-acciones">
            <button type="button" class="btn-secundario" on:click={() => showModal = false}>
              Cancelar
            </button>
            <button type="submit" class="btn-primario">
              {editingTask ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  {/if}
</div>

<style>
  .asuntos-pendientes {
    padding: 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    max-width: 800px;
    margin: 0 auto;
  }
  
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;
    padding-bottom: 15px;
    border-bottom: 2px solid #e5e7eb;
  }
  
  .header h1 {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 24px;
    color: #1f2937;
    margin: 0;
  }
  
  .btn-volver {
    background: #f1f5f9;
    color: #475569;
    border: 1px solid #cbd5e1;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
  }
  
  .btn-volver:hover {
    background: #e2e8f0;
  }
  
  .contadores {
    display: flex;
    gap: 20px;
    margin-bottom: 20px;
  }
  
  .contador {
    text-align: center;
    padding: 10px 20px;
    background: #f9fafb;
    border-radius: 10px;
    min-width: 100px;
    border: 2px solid #e5e7eb;
  }
  
  .contador .numero {
    font-size: 32px;
    font-weight: bold;
    color: #3b82f6;
  }
  
  .contador .label {
    font-size: 14px;
    color: #6b7280;
    margin-top: 5px;
  }
  
  .btn-agregar {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #3b82f6;
    color: white;
    border: none;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 16px;
    cursor: pointer;
    margin-bottom: 20px;
    transition: all 0.2s;
  }
  
  .btn-agregar:hover {
    background: #2563eb;
    transform: translateY(-2px);
    box-shadow: 0 4px 6px rgba(37, 99, 235, 0.2);
  }
  
  .lista-tareas {
    background: white;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
  
  .tarea {
    display: flex;
    align-items: center;
    padding: 15px;
    border-bottom: 1px solid #f3f4f6;
    transition: all 0.2s;
  }
  
  .tarea:hover {
    background: #f9fafb;
  }
  
  .tarea.completada {
    opacity: 0.7;
  }
  
  .tarea.completada .tarea-titulo {
    text-decoration: line-through;
    color: #888;
  }
  
  .tarea-check {
    margin-right: 15px;
    cursor: pointer;
    transition: transform 0.2s;
  }
  
  .tarea-check:hover {
    transform: scale(1.1);
  }
  
  .tarea-info {
    flex: 1;
  }
  
  .tarea-titulo {
    font-weight: 500;
    color: #1f2937;
    margin-bottom: 5px;
  }
  
  .tarea-fecha {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: #6b7280;
  }
  
  .tarea-hora {
    display: flex;
    align-items: center;
    gap: 5px;
    margin-left: 15px;
  }
  
  .tarea-acciones {
    display: flex;
    gap: 8px;
    opacity: 0;
    transition: opacity 0.2s;
  }
  
  .tarea:hover .tarea-acciones {
    opacity: 1;
  }
  
  .btn-icon {
    background: none;
    border: none;
    padding: 8px;
    border-radius: 6px;
    cursor: pointer;
    color: #6b7280;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .btn-icon:hover {
    background: #f3f4f6;
    color: #374151;
  }
  
  .lista-vacia {
    text-align: center;
    padding: 40px 20px;
    color: #6b7280;
  }
  
  .lista-vacia p {
    font-size: 18px;
    margin: 0;
  }
  
  .seccion-completadas {
    margin-top: 20px;
  }
  
  .seccion-completadas summary {
    padding: 15px;
    font-weight: 500;
    color: #6b7280;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    border-bottom: 1px solid #f3f4f6;
    list-style: none;
  }
  
  .seccion-completadas summary::-webkit-details-marker {
    display: none;
  }
  
  .seccion-completadas[open] summary {
    border-bottom: none;
  }
  
  .tareas-completadas {
    padding: 10px;
  }
  
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.2s ease-out;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  .modal {
    background: white;
    border-radius: 12px;
    padding: 30px;
    width: 90%;
    max-width: 500px;
    animation: slideUp 0.3s ease-out;
  }
  
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 25px;
  }
  
  .modal-header h2 {
    margin: 0;
    color: #1f2937;
  }
  
  .btn-cerrar {
    background: none;
    border: none;
    padding: 5px;
    cursor: pointer;
    color: #6b7280;
    transition: color 0.2s;
  }
  
  .btn-cerrar:hover {
    color: #374151;
  }
  
  .form-group {
    margin-bottom: 20px;
  }
  
  .form-group label {
    display: block;
    margin-bottom: 8px;
    color: #374151;
    font-weight: 500;
  }
  
  .form-group input {
    width: 100%;
    padding: 10px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 16px;
    transition: border-color 0.2s;
  }
  
  .form-group input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }
  
  .modal-acciones {
    display: flex;
    justify-content: flex-end;
    gap: 15px;
    margin-top: 30px;
  }
  
  .btn-primario {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 6px;
    font-size: 16px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .btn-primario:hover {
    background: #2563eb;
    transform: translateY(-1px);
  }
  
  .btn-secundario {
    background: #f3f4f6;
    color: #374151;
    border: 1px solid #d1d5db;
    padding: 12px 24px;
    border-radius: 6px;
    font-size: 16px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .btn-secundario:hover {
    background: #e5e7eb;
  }
  
  /* Responsive */
  @media (max-width: 640px) {
    .header {
      flex-direction: column;
      align-items: flex-start;
      gap: 15px;
    }
    
    .contadores {
      width: 100%;
      justify-content: space-between;
    }
    
    .contador {
      flex: 1;
      min-width: auto;
    }
    
    .form-row {
      grid-template-columns: 1fr;
      gap: 15px;
    }
    
    .modal {
      padding: 20px;
      margin: 10px;
    }
  }
</style>