<script lang="ts">
  import { circuitoActivo, mostrarCircuitBar } from '$lib/stores/appStore';
  import Dashboard from '$lib/components/layout/Dashboard.svelte';
  import Documentos from '$lib/components/layout/Documentos.svelte';

  let vistaActual = 'dashboard';

  // Función para cambiar vista y actualizar la visibilidad del CircuitBar
  function cambiarVista(nuevaVista: string) {
    vistaActual = nuevaVista;
    // Mostrar CircuitBar solo en dashboard
    $mostrarCircuitBar = (nuevaVista === 'dashboard');
  }
</script>

{#if vistaActual === 'dashboard'}
  <Dashboard 
    circuitoNombre={$circuitoActivo} 
    on:cambiarVista={(e) => cambiarVista(e.detail)} 
  />
{:else if vistaActual === 'documentos'}
  <Documentos on:volver={() => cambiarVista('dashboard')} />
{/if}