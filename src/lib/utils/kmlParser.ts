// src/lib/utils/kmlParser.ts
// Convierte un archivo KML con <Polygon> a un objeto GeoJSON.
// Solo se queda con el primer polígono encontrado (suficiente para límites de congregación).

export interface GeoJSONPolygon {
  type: 'Feature';
  properties: Record<string, any>;
  geometry: {
    type: 'Polygon';
    coordinates: number[][][]; // Array de anillos, cada anillo es array de [lng, lat]
  };
}

/**
 * Parsea un string de KML y devuelve un GeoJSON Polygon (o null si no encuentra polígono).
 */
export function parseKMLToGeoJSON(kmlText: string): GeoJSONPolygon | null {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(kmlText, 'text/xml');

    // Verificar errores de parseo
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      console.error('Error parseando KML:', parserError.textContent);
      return null;
    }

    // Buscar el primer <Polygon>
    const polygon = xmlDoc.querySelector('Polygon');
    if (!polygon) {
      console.warn('No se encontró ningún <Polygon> en el KML');
      return null;
    }

    // Extraer el anillo exterior
    const outerRing = polygon.querySelector('outerBoundaryIs LinearRing coordinates');
    if (!outerRing || !outerRing.textContent) {
      console.warn('No se encontró el anillo exterior (outerBoundaryIs)');
      return null;
    }

    // Las coordenadas vienen como: "lng,lat,alt lng,lat,alt lng,lat,alt"
    const coordenadasTexto = outerRing.textContent.trim();
    const puntos = coordenadasTexto
      .split(/\s+/)
      .filter(p => p.trim() !== '')
      .map(punto => {
        const [lng, lat] = punto.split(',').map(Number);
        return [lng, lat];
      });

    if (puntos.length < 3) {
      console.warn('El polígono tiene menos de 3 puntos, no es válido');
      return null;
    }

    // Aseguramos que el anillo esté cerrado (primer punto = último punto)
    const primero = puntos[0];
    const ultimo = puntos[puntos.length - 1];
    if (primero[0] !== ultimo[0] || primero[1] !== ultimo[1]) {
      puntos.push([primero[0], primero[1]]);
    }

    // Extraer el nombre del Placemark si existe (por si lo queremos usar)
    const nombre = xmlDoc.querySelector('Placemark > name')?.textContent || '';

    return {
      type: 'Feature',
      properties: {
        nombre: nombre.trim(),
      },
      geometry: {
        type: 'Polygon',
        coordinates: [puntos], // GeoJSON espera un array de anillos
      },
    };
  } catch (error) {
    console.error('Error parseando KML:', error);
    return null;
  }
}

/**
 * Cuenta los puntos del polígono (útil para mostrar info al usuario).
 */
export function contarPuntosKML(kmlText: string): number {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(kmlText, 'text/xml');
    const outerRing = xmlDoc.querySelector('outerBoundaryIs LinearRing coordinates');
    if (!outerRing || !outerRing.textContent) return 0;
    return outerRing.textContent.trim().split(/\s+/).filter(p => p.trim() !== '').length;
  } catch {
    return 0;
  }
}