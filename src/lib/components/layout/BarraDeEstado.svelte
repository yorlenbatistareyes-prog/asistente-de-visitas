<script lang="ts">
  import { onMount } from 'svelte';
  import { getVersion } from '@tauri-apps/api/app';

  let versionActual = "v0.0.0";

  onMount(async () => {
    try {
      // Ahora con el permiso core:app:allow-version ya no fallará
      versionActual = await getVersion();
    } catch (e) {
      console.warn("Fallo al leer versión:", e);
      versionActual = "v2.1.0"; 
    }
  });
</script>

<div class="barra-sistema-footer">
  <div class="contenido-centro">
    <span class="version-info">{versionActual} | ¡Asistente de Visitas está actualizado!</span>
    <span class="separador">•</span>
    <span class="copyright">© 2026 Todos los derechos Reservados</span>
  </div>
</div>

<style>
  .barra-sistema-footer {
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 32px; 
    
    /* 🌟 COLOR PREDETERMINADO (MODO CLARO): Gris sólido y visible */
    background: #e2e8f0; 
    border-top: 1px solid #cbd5e1; 
    
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0 20px;
    box-sizing: border-box;
    z-index: 9999;
    user-select: none;
    transition: background 0.3s ease, border-color 0.3s ease;
  }

  /* 🌟 COMPORTAMIENTO PARA MODO OSCURO */
  /* Forzamos que cambie solo cuando detecte la clase dark-mode en el body o html */
  :global(body.dark-mode) .barra-sistema-footer,
  :global(.dark) .barra-sistema-footer {
    background: #1e293b !important; /* Gris azulado muy oscuro */
    border-top: 1px solid #334155 !important;
  }

  .contenido-centro {
    display: flex;
    align-items: center;
    gap: 12px;
    font-family: 'Inter', system-ui, sans-serif;
  }

  .version-info, .copyright {
    font-size: 11px; 
    font-weight: 700;
    /* Gris oscuro para el modo claro */
    color: #475569; 
    letter-spacing: 0.3px;
  }

  /* 🌟 TEXTO EN MODO OSCURO */
  :global(body.dark-mode) .version-info,
  :global(body.dark-mode) .copyright,
  :global(.dark) .version-info,
  :global(.dark) .copyright {
    color: #94a3b8; /* Gris plata suave */
  }

  .separador {
    color: #94a3b8;
    font-size: 12px;
    opacity: 0.5;
  }

  @media (max-width: 600px) {
    .version-info, .copyright { font-size: 10px; }
  }
</style>