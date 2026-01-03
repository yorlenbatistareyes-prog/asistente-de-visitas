<script lang="ts">
  import { circuitoActivo } from '$lib/stores/appStore';
  import Dashboard from '$lib/components/layout/Dashboard.svelte';
</script>

<Dashboard circuitoNombre={$circuitoActivo} />