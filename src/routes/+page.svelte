<script lang="ts">
  import { circuitoActivo } from '$lib/stores/appStore';
  import Dashboard from '$lib/components/layout/Dashboard.svelte';
  import Documentos from '$lib/components/layout/Documentos.svelte';

  let vistaActual = 'dashboard';
</script>

{#if vistaActual === 'dashboard'}
  <Dashboard 
    circuitoNombre={$circuitoActivo} 
    on:cambiarVista={(e) => vistaActual = e.detail} 
  />
{:else if vistaActual === 'documentos'}
  <Documentos on:volver={() => vistaActual = 'dashboard'} />
{/if}