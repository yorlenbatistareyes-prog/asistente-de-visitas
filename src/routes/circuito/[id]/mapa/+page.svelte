<script lang="ts">
  import { page } from '$app/stores';
  import { onMount, onDestroy } from 'svelte';
  import { Map, MapStyle, config, Marker, Popup, NavigationControl, GeoJSONSource } from '@maptiler/sdk';
  import '@maptiler/sdk/dist/maptiler-sdk.css';
  import { MapPin, AlertCircle, Settings } from 'lucide-svelte';
  import { goto } from '$app/navigation';

  import { 
    obtenerCircuitoPorId, 
    obtenerCongregaciones, 
    cargarConfig,
    type Circuito, 
    type Congregacion 
  } from '$lib/services/db';

  $: idCircuito = Number($page.params.id);

  let circuito: Circuito | null = null;
  let congregacionesConCoords: Congregacion[] = [];
  let congregacionesSinCoords: Congregacion[] = [];
  let todasLasCongregaciones: Congregacion[] = [];
  let cargando = true;
  let hayClave = false;

  let mapContainer: HTMLDivElement;
  let map: Map | null = null;
  let marcadores: Marker[] = [];

  async function cargarDatos() {
    cargando = true;
    if (!idCircuito) return;

    // 1. Verificamos que hay clave configurada
    const claveGuardada = await cargarConfig('maptiler_key');
    if (!claveGuardada || !claveGuardada.trim()) {
      hayClave = false;
      cargando = false;
      return;
    }

    hayClave = true;
    config.apiKey = claveGuardada.trim();

    // 2. Cargamos datos del circuito y congregaciones
    circuito = await obtenerCircuitoPorId(idCircuito);
    if (circuito) {
      const todas = await obtenerCongregaciones(circuito.nombre);
      todasLasCongregaciones = todas;
      congregacionesConCoords = todas.filter(
        c => c.latitud != null && c.longitud != null
      );
      congregacionesSinCoords = todas.filter(
        c => c.latitud == null || c.longitud == null
      );
    }

    cargando = false;

    // 3. Inicializamos el mapa tras el render
    setTimeout(inicializarMapa, 100);
  }

  function inicializarMapa() {
    if (!mapContainer || map) return;

    let centerLng = -76.2631;
    let centerLat = 20.8871;
    let zoom = 7;

    if (congregacionesConCoords.length > 0) {
      const sumaLat = congregacionesConCoords.reduce((acc, c) => acc + (c.latitud || 0), 0);
      const sumaLng = congregacionesConCoords.reduce((acc, c) => acc + (c.longitud || 0), 0);
      centerLat = sumaLat / congregacionesConCoords.length;
      centerLng = sumaLng / congregacionesConCoords.length;
      zoom = 9;
    }

    map = new Map({
      container: mapContainer,
      style: MapStyle.STREETS,
      center: [centerLng, centerLat],
      zoom: zoom
    });

    map.on('load', () => {
    dibujarMarcadores();
    dibujarLimites();
    });
  }

  function dibujarMarcadores() {
    if (!map) return;

    marcadores.forEach(m => m.remove());
    marcadores = [];

    congregacionesConCoords.forEach(cong => {
      if (cong.latitud == null || cong.longitud == null) return;

            const popup = new Popup({ offset: 25 })
        .setHTML(`
          <div style="font-family: Inter, sans-serif; padding: 4px; min-width: 200px;">
            <strong style="font-size: 0.95rem; color: #0f172a; display: block; margin-bottom: 4px;">
              ${cong.nombre}
            </strong>
            <div style="font-size: 0.8rem; color: #64748b;">
              ${cong.ciudad || ''}${cong.provincia ? ', ' + cong.provincia : ''}
            </div>
            ${cong.direccion_salon 
              ? `<div style="font-size: 0.75rem; color: #64748b; margin-top: 6px;">${cong.direccion_salon}</div>` 
              : ''}
            <div style="font-size: 0.7rem; color: #94a3b8; margin-top: 6px;">
              ${cong.latitud.toFixed(4)}, ${cong.longitud.toFixed(4)}
            </div>
            <a 
              href="https://www.google.com/maps?q=${cong.latitud},${cong.longitud}" 
              target="_blank" 
              rel="noopener noreferrer"
              style="
                display: inline-flex; 
                align-items: center; 
                gap: 4px; 
                margin-top: 10px; 
                padding: 6px 10px; 
                background: #2563eb; 
                color: white; 
                border-radius: 6px; 
                font-size: 0.75rem; 
                font-weight: 600; 
                text-decoration: none;
              "
            >
              📍 Ver en Google Maps
            </a>
          </div>
        `);

      const marcador = new Marker({ color: '#e11d48' })
        .setLngLat([cong.longitud, cong.latitud])
        .setPopup(popup)
        .addTo(map!);

      marcadores.push(marcador);
    });

    // Ajustamos el zoom para ver todos los pines
    if (marcadores.length > 1 && map) {
      const lngs = congregacionesConCoords.map(c => c.longitud!);
      const lats = congregacionesConCoords.map(c => c.latitud!);
      const bounds: [[number, number], [number, number]] = [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)]
      ];
      map.fitBounds(bounds, { padding: 60, maxZoom: 13, duration: 800 });
    }
  }

  
  function dibujarLimites() {
    if (!map) return;

    // Recopilamos todos los GeoJSON de congregaciones que tengan límite
      const features = todasLasCongregaciones
      .filter(c => c.limite_geojson)
      .map(c => {
        try {
          const geo = JSON.parse(c.limite_geojson!);
          // Añadimos el nombre de la congregación a las propiedades
          return {
            ...geo,
              properties: {
              ...(geo.properties || {}),
              congregacion: c.nombre,
              congregacionId: c.id,
              color: c.color_poligono || '#e11d48',
            }
          };
        } catch (e) {
          console.warn(`Error parseando GeoJSON de ${c.nombre}:`, e);
          return null;
        }
      })
      .filter((f): f is NonNullable<typeof f> => f !== null);

    if (features.length === 0) return;

    // Creamos la fuente GeoJSON
    const geojsonData = {
      type: 'FeatureCollection',
      features: features,
    };

    // Si ya existe la fuente, la actualizamos
    if (map.getSource('limites')) {
      (map.getSource('limites') as GeoJSONSource).setData(geojsonData as any);
    } else {
      // Si no existe, la creamos
      map.addSource('limites', {
        type: 'geojson',
        data: geojsonData as any,
      });

            // Relleno del polígono (usa el color de cada congregación)
      map.addLayer({
        id: 'limites-fill',
        type: 'fill',
        source: 'limites',
        paint: {
          'fill-color': ['get', 'color'] as any,
          'fill-opacity': 0.15,
        },
      });

      // Borde del polígono (mismo color, más opaco)
      map.addLayer({
        id: 'limites-line',
        type: 'line',
        source: 'limites',
        paint: {
          'line-color': ['get', 'color'] as any,
          'line-width': 2,
          'line-opacity': 0.7,
        },
      });
    }
  }

  onMount(cargarDatos);

  onDestroy(() => {
    if (map) {
      map.remove();
      map = null;
    }
  });
</script>

<div class="mapa-layout">
  <div class="header-section">
    <div>
      <h3>Mapa del Circuito</h3>
      <p>Vista geográfica de las congregaciones.</p>
    </div>
    {#if hayClave && !cargando}
      <div class="contador-badge">
        <MapPin size={14} /> 
        {congregacionesConCoords.length} de {congregacionesConCoords.length + congregacionesSinCoords.length} ubicadas
      </div>
    {/if}
  </div>

  {#if cargando}
    <div class="empty-state">Cargando mapa...</div>

  {:else if !hayClave}
    <div class="card-global empty-state">
      <Settings size={48} color="var(--text-muted)" style="margin-bottom: 15px; opacity: 0.5;" />
      <p><strong>Aún no has configurado tu clave de MapTiler.</strong></p>
      <p class="hint">Para usar el mapa, necesitas una clave gratuita de MapTiler.</p>
      <button class="btn-configurar" on:click={() => goto('/configuracion')}>
        Ir a Configuración
      </button>
    </div>

  {:else if congregacionesConCoords.length === 0}
    <div class="card-global empty-state">
      <AlertCircle size={48} color="var(--text-muted)" style="margin-bottom: 15px; opacity: 0.5;" />
      <p>Ninguna congregación tiene coordenadas todavía.</p>
      <p class="hint">Edita cada congregación en la pestaña "Congregaciones" y añade latitud y longitud.</p>
    </div>

  {:else}
    <div class="mapa-wrapper card-global">
      <div bind:this={mapContainer} class="mapa-container"></div>
    </div>

    {#if congregacionesSinCoords.length > 0}
      <div class="alerta-sin-coords card-global">
        <AlertCircle size={18} color="#f59e0b" />
        <div>
          <strong>{congregacionesSinCoords.length} congregación(es) sin coordenadas:</strong>
          <div class="lista-sin-coords">
            {congregacionesSinCoords.map(c => c.nombre).join(' · ')}
          </div>
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .mapa-layout {
    animation: fadeIn 0.3s ease-out;
    padding: 15px 20px;
    max-width: 1200px;
    margin: 0 auto;
    box-sizing: border-box;
  }

  .header-section {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 20px;
    gap: 15px;
    flex-wrap: wrap;
  }

  .header-section h3 {
    margin: 0 0 5px 0;
    font-size: 1.5rem;
    color: var(--text-main);
    font-weight: 800;
  }

  .header-section p {
    margin: 0;
    color: var(--text-muted);
    font-size: 0.9rem;
  }

  .contador-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #f1ebd5;
    color: #785a28;
    padding: 6px 14px;
    border-radius: 20px;
    font-weight: 700;
    font-size: 0.8rem;
    border: 1px solid #e2d7ba;
    white-space: nowrap;
  }

  .mapa-wrapper {
    padding: 0;
    overflow: hidden;
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
  }

  .mapa-container {
    width: 100%;
    height: 600px;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 60px 20px;
    color: var(--text-muted);
  }

  .empty-state .hint {
    font-size: 0.85rem;
    opacity: 0.8;
    margin-top: 5px;
  }

  .btn-configurar {
    margin-top: 20px;
    padding: 10px 20px;
    background: var(--primary);
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 700;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .btn-configurar:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(225, 29, 72, 0.3);
  }

  .alerta-sin-coords {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 15px 20px;
    margin-top: 20px;
    background: #fffbeb;
    border-color: #fde68a;
    color: #92400e;
    font-size: 0.85rem;
  }

  .lista-sin-coords {
    margin-top: 6px;
    font-size: 0.78rem;
    color: #b45309;
    line-height: 1.4;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(5px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @media (max-width: 768px) {
    .header-section {
      flex-direction: column;
      align-items: flex-start;
    }
    .mapa-container {
      height: 450px;
    }
  }
</style>