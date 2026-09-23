// src/lib/services/db.ts
import Database from '@tauri-apps/plugin-sql';
import { invoke } from '@tauri-apps/api/core';

// 🛑 ELIMINAMOS la importación de autoSyncStore para romper la Dependencia Circular
// import { dispararSincronizacionLocal } from '$lib/stores/autoSyncStore';

let dbInstance: Database | null = null;

// 🛡️ EL SEMÁFORO (Evita bucles al restaurar desde la nube)
let estaRestaurando = false;

export function iniciarRestauracion() { estaRestaurando = true; }
export function terminarRestauracion() { estaRestaurando = false; }
export function isRestaurando() { return estaRestaurando; }

// 📢 EL AVISADOR
function notificarCambioLocal() {
  if (estaRestaurando) {
      console.log("🔄 Restauración en curso, ignorando cambios locales.");
      return;
  }
  
  if (typeof window !== 'undefined') {
      console.log("📢 [DB] Cambio detectado. Emitiendo señal para sincronizar...");
      window.dispatchEvent(new CustomEvent('db_local_cambiada'));
  }
}

// --- INTERFACES ---
export interface Circuito {
  id?: number;
  nombre: string;
  etiquetas?: string; 
  fechaCreacion?: string;
  fechaInicio?: string; 
  fechaFin?: string;    
}

export interface Congregacion {
  id?: number;
  circuito: string;
  nombre: string;
  enVisita: boolean;
  ciudad?: string;
  provincia?: string;
  pais?: string;
  idioma?: string;
  esLenguaSenas?: boolean;
  telefono?: string;
  horaSemana?: string;
  horaFinSemana?: string;
  diaSemana?: string;
  diaFinSemana?: string;
}
export interface Persona {
  id?: number;
  circuito_id: number; 
  nombre: string;
  segundo_nombre?: string;
  apellidos: string;
  privilegio?: string;
  congregacion?: string;
  direccion?: string;
  telefono_celular?: string;
  telefono_fijo?: string;
  email?: string;
}

export interface VisitaHistorial {
  id?: number;
  congregacion_id: number;
  fecha: string;
  tipo: string;
  completado: boolean;
  contenido: string;
}

export interface Ruta {
  id?: number;
  circuitoId: number;
  congregacionId?: number;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  completada: boolean;
}

export interface VisitaProgramada {
  id?: number;
  rutaId: number;
  congregacionId: number;
  fechaSemana: string;    // Ej. "Lunes 26 Oct - Domingo 1 Nov"
  estado: string;         // "pendiente", "en_progreso", "completada"
  notas?: string;
}

// --- 1. INICIALIZACIÓN Y CREACIÓN DE TABLAS ---
export async function initDB(): Promise<Database> {
  if (dbInstance) return dbInstance;

  try {
    dbInstance = await Database.load('sqlite:av_database.db');
    
    // TABLA CIRCUITOS
    await dbInstance.execute(`
      CREATE TABLE IF NOT EXISTS circuitos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL UNIQUE,
        etiquetas TEXT,
        fechaCreacion TEXT,
        fechaInicio TEXT,
        fechaFin TEXT
      );
    `);

    try {
      await dbInstance.execute(`ALTER TABLE circuitos ADD COLUMN fechaInicio TEXT;`);
      await dbInstance.execute(`ALTER TABLE circuitos ADD COLUMN fechaFin TEXT;`);
    } catch (e) {}

    // TABLA CONGREGACIONES
    await dbInstance.execute(`
      CREATE TABLE IF NOT EXISTS congregaciones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        circuito TEXT NOT NULL,
        nombre TEXT NOT NULL,
        enVisita BOOLEAN DEFAULT 0,
        ciudad TEXT,
        provincia TEXT,
        pais TEXT,
        idioma TEXT,
        esLenguaSenas BOOLEAN DEFAULT 0,
        telefono TEXT,
        horaSemana TEXT,
        horaFinSemana TEXT,
        diaSemana TEXT,
        diaFinSemana TEXT,
        UNIQUE(circuito, nombre)
      );
    `);

    // TABLA PERSONAS
    await dbInstance.execute(`
      CREATE TABLE IF NOT EXISTS personas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        circuito_id INTEGER,
        nombre TEXT NOT NULL,
        segundo_nombre TEXT,
        apellidos TEXT NOT NULL,
        privilegio TEXT,
        congregacion TEXT,
        direccion TEXT,
        telefono_celular TEXT,
        telefono_fijo TEXT,
        email TEXT,
        FOREIGN KEY(circuito_id) REFERENCES circuitos(id) ON DELETE CASCADE
      );
    `);

    await dbInstance.execute(`
      CREATE TABLE IF NOT EXISTS historial_visitas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        congregacion_id INTEGER,
        fecha TEXT NOT NULL,
        tipo TEXT NOT NULL,
        completado BOOLEAN DEFAULT 0,
        contenido TEXT,
        FOREIGN KEY(congregacion_id) REFERENCES congregaciones(id) ON DELETE CASCADE
      );
    `);

    // TABLA RUTAS (Agrupador principal del calendario)
    await dbInstance.execute(`
      CREATE TABLE IF NOT EXISTS rutas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        circuito_id INTEGER NOT NULL,
        nombre TEXT NOT NULL,
        fechaInicio TEXT NOT NULL,
        fechaFin TEXT NOT NULL,
        completada BOOLEAN DEFAULT 0,
        FOREIGN KEY(circuito_id) REFERENCES circuitos(id) ON DELETE CASCADE
      );
    `);

    // TABLA VISITAS PROGRAMADAS (Vincula una congregación a una ruta específica)
    await dbInstance.execute(`
      CREATE TABLE IF NOT EXISTS visitas_programadas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ruta_id INTEGER NOT NULL,
        congregacion_id INTEGER NOT NULL,
        fechaSemana TEXT NOT NULL,
        estado TEXT DEFAULT 'pendiente',
        notas TEXT,
        FOREIGN KEY(ruta_id) REFERENCES rutas(id) ON DELETE CASCADE,
        FOREIGN KEY(congregacion_id) REFERENCES congregaciones(id) ON DELETE CASCADE
      );
    `);

    // ----------------------------------------------------
    // --- TABLAS PARA EL PROGRAMA DE LA VISITA ---
    // ----------------------------------------------------

    await dbInstance.execute(`
      CREATE TABLE IF NOT EXISTS visita_predicacion (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        visita_id INTEGER NOT NULL,
        dia TEXT NOT NULL,
        hora TEXT NOT NULL,
        acomp_esposo TEXT,
        acomp_esposa TEXT,
        publicador TEXT,
        telefono TEXT,
        tipo_arreglo TEXT,
        FOREIGN KEY(visita_id) REFERENCES visitas_programadas(id) ON DELETE CASCADE
      );
    `);

    await dbInstance.execute(`
      CREATE TABLE IF NOT EXISTS visita_hospitalidad (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        visita_id INTEGER NOT NULL,
        dia TEXT NOT NULL,
        tipo_comida TEXT NOT NULL,
        anfitrion TEXT NOT NULL,
        direccion TEXT,
        telefono TEXT,
        FOREIGN KEY(visita_id) REFERENCES visitas_programadas(id) ON DELETE CASCADE
      );
    `);

    await dbInstance.execute(`
      CREATE TABLE IF NOT EXISTS visita_pastoreo (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        visita_id INTEGER NOT NULL,
        dia_hora TEXT,
        familia TEXT NOT NULL,
        direccion TEXT,
        telefono TEXT,
        anciano TEXT,
        notas TEXT,
        FOREIGN KEY(visita_id) REFERENCES visitas_programadas(id) ON DELETE CASCADE
      );
    `);

    await dbInstance.execute(`
      CREATE TABLE IF NOT EXISTS visita_agenda (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        visita_id INTEGER NOT NULL UNIQUE,
        puntos TEXT,
        FOREIGN KEY(visita_id) REFERENCES visitas_programadas(id) ON DELETE CASCADE
      );
    `);

    await dbInstance.execute(`
      CREATE TABLE IF NOT EXISTS configuracion (
        clave TEXT PRIMARY KEY,
        valor TEXT
      );
    `);

    return dbInstance;
  } catch (error) {
    console.error("❌ Error inicializando SQLite:", error);
    throw error;
  }
}

// --- CERRAR CONEXIÓN (Liberar candado de Windows) ---
export async function cerrarConexionDB() {
  if (dbInstance) {
    try {
      await dbInstance.close();
      dbInstance = null;
      console.log("🔒 [DB] Conexión cerrada para permitir el cambiazo.");
    } catch (e) {
      console.error("Error al cerrar la base de datos:", e);
    }
  }
}

// --- 2. GESTIÓN DE CIRCUITOS ---

export async function crearCircuito(nombre: string, etiquetas: string = "", fechaInicio: string = "", fechaFin: string = "") {
  const fechaCreacion = new Date().toISOString().split('T')[0]; 
  try {
    await invoke('crear_circuito_rust', { nombre, etiquetas, fechaCreacion, fechaInicio, fechaFin });
    notificarCambioLocal(); // ⏰ AVISAMOS MEDIANTE EVENTO
  } catch (error) {
    console.error("Error creando circuito en Rust:", error);
    throw error;
  }
}

export async function obtenerTodosLosCircuitos(): Promise<Circuito[]> {
  try {
    return await invoke<Circuito[]>('obtener_todos_los_circuitos_rust');
  } catch (error) {
    console.error("Error obteniendo circuitos desde Rust:", error);
    return [];
  }
}

export async function obtenerCircuitoPorId(id: number): Promise<Circuito | null> {
  try {
    return await invoke<Circuito | null>('obtener_circuito_por_id_rust', { id });
  } catch (error) {
    console.error(`Error obteniendo el circuito ${id} desde Rust:`, error);
    return null;
  }
}

export async function eliminarCircuito(id: number, nombre: string) {
  try {
    await invoke('eliminar_circuito_rust', { id, nombre });
    notificarCambioLocal(); // ⏰ AVISAMOS MEDIANTE EVENTO
  } catch (error) {
    console.error("Error eliminando circuito en Rust:", error);
    throw error;
  }
}

// --- 3. GESTIÓN DE CONGREGACIONES ---

export async function obtenerCongregaciones(circuito: string): Promise<Congregacion[]> {
  try {
    return await invoke<Congregacion[]>('obtener_congregaciones_rust', { circuito });
  } catch (error) {
    console.error("Error obteniendo congregaciones:", error);
    return [];
  }
}

export async function guardarCongregacion(cong: Congregacion) {
  try {
    await invoke('guardar_congregacion_rust', { cong });
    notificarCambioLocal(); // ⏰ AVISAMOS MEDIANTE EVENTO
  } catch (error) {
    console.error("Error guardando congregación en Rust:", error);
    throw error;
  }
}

export async function eliminarCongregacion(id: number) {
  try {
    await invoke('eliminar_congregacion_rust', { id });
    notificarCambioLocal(); // ⏰ AVISAMOS MEDIANTE EVENTO
  } catch (error) {
    console.error("Error eliminando congregación en Rust:", error);
    throw error;
  }
}

// --- 4. GESTIÓN DE CONFIGURACIÓN GLOBAL ---
export async function guardarConfig(clave: string, valor: string) {
  try {
    await invoke('guardar_config_rust', { clave, valor });
    
    // 🧠 LA INTELIGENCIA: Dispara la sincronización SOLO si no es el reloj interno
    if (clave !== 'last_synced_at') {
      notificarCambioLocal();
    }
    
  } catch (error) {
    console.error("Error guardando config en Rust:", error);
    throw error;
  }
}

export async function cargarConfig(clave: string): Promise<string | null> {
  try {
    return await invoke<string | null>('cargar_config_rust', { clave });
  } catch (error) {
    console.error("Error cargando config de Rust:", error);
    return null;
  }
}

// --- 5. GESTIÓN DE PERSONAS ---

export async function obtenerPersonasPorCircuito(circuitoId: number): Promise<Persona[]> {
  try {
    return await invoke<Persona[]>('obtener_personas_por_circuito_rust', { circuitoId });
  } catch (error) {
    console.error("Error obteniendo personas:", error);
    return [];
  }
}

export async function guardarPersona(p: Persona) {
  try {
    await invoke('guardar_persona_rust', { p });
    notificarCambioLocal(); // ⏰ AVISAMOS MEDIANTE EVENTO
  } catch (error) {
    console.error("Error guardando persona en Rust:", error);
    throw error;
  }
}

export async function eliminarPersona(id: number) {
  try {
    await invoke('eliminar_persona_rust', { id });
    notificarCambioLocal(); // ⏰ AVISAMOS MEDIANTE EVENTO
  } catch (error) {
    console.error("Error eliminando persona en Rust:", error);
    throw error;
  }
}

// --- 6. GESTIÓN DE HISTORIAL ---

export async function obtenerHistorialPorCongregacion(congregacion_id: number): Promise<VisitaHistorial[]> {
  try {
    return await invoke<VisitaHistorial[]>('obtener_historial_rust', { congregacionId: congregacion_id });
  } catch (error) {
    console.error("Error obteniendo historial:", error);
    return [];
  }
}

export async function guardarHistorial(visita: VisitaHistorial) {
  try {
    await invoke('guardar_historial_rust', { visita });
    notificarCambioLocal(); // ⏰ AVISAMOS MEDIANTE EVENTO
  } catch (error) {
    console.error("Error guardando historial en Rust:", error);
    throw error;
  }
}

export async function eliminarHistorial(id: number) {
  try {
    await invoke('eliminar_historial_rust', { id });
    notificarCambioLocal(); // ⏰ AVISAMOS MEDIANTE EVENTO
  } catch (error) {
    console.error("Error eliminando historial en Rust:", error);
    throw error;
  }
}

export async function eliminarTodasLasPersonas(circuitoId: number) {
  const db = await Database.load('sqlite:av_database.db');
  await db.execute('DELETE FROM personas WHERE circuito_id = $1', [circuitoId]);
  notificarCambioLocal(); // ⏰ AVISAMOS MEDIANTE EVENTO
}

export async function eliminarTodasLasCongregaciones(circuito: string) {
  const db = await Database.load('sqlite:av_database.db');
  await db.execute('DELETE FROM congregaciones WHERE circuito = $1', [circuito]);
  notificarCambioLocal(); // ⏰ AVISAMOS MEDIANTE EVENTO
}

// ==================================================
// --- 7. GESTIÓN DE RUTAS Y VISITAS PROGRAMADAS ---
// ==================================================

export async function obtenerRutasPorCircuito(circuitoId: number): Promise<Ruta[]> {
  try {
    return await invoke<Ruta[]>('obtener_rutas_rust', { circuitoId });
  } catch (error) {
    console.error("Error obteniendo rutas:", error);
    return [];
  }
}

export async function guardarRuta(ruta: Ruta) {
  try {
    await invoke('guardar_ruta_rust', { ruta });
    notificarCambioLocal(); // ⏰ EL EMBUDO DE SINCRONIZACIÓN
  } catch (error) {
    console.error("Error guardando ruta:", error);
    throw error;
  }
}
export async function eliminarRuta(id: number) {
  try {
    await invoke('eliminar_ruta_rust', { id });
    notificarCambioLocal(); // ⏰ EL EMBUDO DE SINCRONIZACIÓN
  } catch (error) {
    console.error("Error eliminando ruta:", error);
    throw error;
  }
}

export async function obtenerVisitasPorRuta(rutaId: number): Promise<VisitaProgramada[]> {
  try {
    return await invoke<VisitaProgramada[]>('obtener_visitas_programadas_rust', { rutaId });
  } catch (error) {
    console.error("Error obteniendo visitas programadas:", error);
    return [];
  }
}

export async function guardarVisitaProgramada(visita: VisitaProgramada) {
  try {
    await invoke('guardar_visita_programada_rust', { visita });
    notificarCambioLocal(); // ⏰ EL EMBUDO DE SINCRONIZACIÓN
  } catch (error) {
    console.error("Error guardando visita programada:", error);
    throw error;
  }
}


export interface VisitaVista {
  id: number;
  rutaId: number;
  congregacionId: number;
  fechaSemana: string;
  estado: 'pendiente' | 'en_progreso' | 'completada';
  nombreCongregacion: string;
  nombreRuta: string;
}

export async function obtenerVisitasPorCircuito(circuitoId: number): Promise<VisitaVista[]> {
  try {
    const db = await Database.load('sqlite:av_database.db');
    
    const query = `
      SELECT 
        v.id, 
        v.ruta_id as rutaId, 
        v.congregacion_id as congregacionId, 
        v.fechaSemana, 
        v.estado,
        c.nombre as nombreCongregacion,
        r.nombre as nombreRuta
      FROM visitas_programadas v
      INNER JOIN congregaciones c ON v.congregacion_id = c.id
      INNER JOIN rutas r ON v.ruta_id = r.id
      WHERE r.circuito_id = $1
      ORDER BY v.fechaSemana ASC
    `;
    
    return await db.select<VisitaVista[]>(query, [circuitoId]);
  } catch (error) {
    console.error("Error obteniendo visitas para la vista:", error);
    return [];
  }
}

export async function eliminarVisitaProgramada(id: number) {
  try {
    await invoke('eliminar_visita_programada_rust', { id });
    notificarCambioLocal(); // ⏰ EL EMBUDO DE SINCRONIZACIÓN
  } catch (error) {
    console.error("Error eliminando visita programada:", error);
    throw error;
  }
}

export async function obtenerVisitaPorId(id: number): Promise<VisitaProgramada | null> {
  try {
    return await invoke<VisitaProgramada | null>('obtener_visita_por_id_rust', { id });
  } catch (error) {
    console.error(`Error obteniendo la visita ${id} desde Rust:`, error);
    return null;
  }
}

// ==================================================
// --- 8. GESTIÓN DE ANÁLISIS DE VISITAS ---
// ==================================================

export interface AnalisisVisita {
  id?: number;
  visitaId: number;
  fecha: string;
  contenido: string;
  checklist?: string;
  completado: boolean;
}

export async function obtenerAnalisisPorVisita(visitaId: number): Promise<AnalisisVisita | null> {
  try {
    return await invoke<AnalisisVisita | null>('obtener_analisis_por_visita_rust', { visitaId });
  } catch (error) {
    console.error(`Error obteniendo análisis de la visita ${visitaId}:`, error);
    return null;
  }
}

export async function guardarAnalisisVisita(analisis: AnalisisVisita): Promise<number> {
  try {
    const id = await invoke<number>('guardar_analisis_visita_rust', { analisis });
    notificarCambioLocal(); // ⏰ EL EMBUDO DE SINCRONIZACIÓN
    return id;
  } catch (error) {
    console.error("Error guardando análisis de visita:", error);
    throw error;
  }
}

export async function eliminarAnalisisVisita(id: number) {
  try {
    await invoke('eliminar_analisis_visita_rust', { id });
    notificarCambioLocal(); // ⏰ EL EMBUDO DE SINCRONIZACIÓN
  } catch (error) {
    console.error("Error eliminando análisis de visita:", error);
    throw error;
  }
}

// ==================================================
// --- 9. GESTIÓN DE REVISIÓN DE VISITAS ---
// ==================================================

export interface RevisionVisita {
  id?: number;
  visitaId: number;
  fecha: string;
  contadores: string;
  completado: boolean;
}

export async function obtenerRevisionPorVisita(visitaId: number): Promise<RevisionVisita | null> {
  try {
    return await invoke<RevisionVisita | null>('obtener_revision_por_visita_rust', { visitaId });
  } catch (error) {
    console.error(`Error obteniendo revisión de la visita ${visitaId}:`, error);
    return null;
  }
}

export async function guardarRevisionVisita(revision: RevisionVisita): Promise<number> {
  try {
    const id = await invoke<number>('guardar_revision_visita_rust', { revision });
    notificarCambioLocal(); // ⏰ EL EMBUDO DE SINCRONIZACIÓN
    return id;
  } catch (error) {
    console.error("Error guardando revisión de visita:", error);
    throw error;
  }
}

export async function eliminarRevisionVisita(id: number) {
  try {
    await invoke('eliminar_revision_visita_rust', { id });
    notificarCambioLocal(); // ⏰ EL EMBUDO DE SINCRONIZACIÓN
  } catch (error) {
    console.error("Error eliminando revisión de visita:", error);
    throw error;
  }
}

export async function obtenerContadoresRevisionAnterior(visitaId: number): Promise<string | null> {
  try {
    return await invoke<string | null>('obtener_contadores_revision_anterior_rust', { visitaId });
  } catch (error) {
    console.error(`Error obteniendo contadores de la revisión anterior:`, error);
    return null;
  }
}

// ==================================================
// --- 10. GESTIÓN DE REPORTES / HISTORIAL ---
// ==================================================

export interface FilaHistorial {
  visitaId: number;
  congregacionNombre: string;
  fechaSemana: string;
  contadores: string | null;
}

export async function obtenerHistorialRevisiones(circuitoId: number): Promise<FilaHistorial[]> {
  try {
    return await invoke<FilaHistorial[]>('obtener_historial_revisiones_rust', { circuitoId });
  } catch (error) {
    console.error("Error obteniendo historial de revisiones:", error);
    return [];
  }
}

// ==================================================
// --- 11. ÚLTIMAS REVISIONES POR CIRCUITO ---
// ==================================================

export interface UltimaRevisionPorCongregacion {
  congregacionId: number;
  congregacionNombre: string;
  visitaId: number;
  fecha: string;
  contadores: string;
}

export async function obtenerUltimasRevisionesPorCircuito(circuitoId: number): Promise<UltimaRevisionPorCongregacion[]> {
  try {
    return await invoke<UltimaRevisionPorCongregacion[]>('obtener_ultimas_revisiones_por_circuito_rust', { circuitoId });
  } catch (error) {
    console.error("Error obteniendo últimas revisiones del circuito:", error);
    return [];
  }
}

// ==========================================
// MÓDULO: PROGRAMA DE LA SEMANA
// ==========================================

export interface Predicacion { id?: number; visita_id: number; dia: string; hora: string; acomp_esposo?: string; acomp_esposa?: string; tipo_arreglo?: string; }
export interface Hospitalidad { id?: number; visita_id: number; dia: string; tipo_comida: 'Almuerzo' | 'Comida'; anfitrion: string; direccion?: string; telefono?: string; }
export interface Pastoreo { id?: number; visita_id: number; dia_hora?: string; familia: string; direccion?: string; telefono?: string; anciano?: string; notas?: string; }
export interface Agenda { id?: number; visita_id: number; puntos?: string; }

// --- PREDICACIÓN ---
export async function obtenerPredicacion(visitaId: number): Promise<Predicacion[]> {
    const db = await initDB();
    return await db.select<Predicacion[]>("SELECT * FROM visita_predicacion WHERE visita_id = $1 ORDER BY id ASC", [visitaId]);
}
export async function guardarPredicacion(datos: Predicacion) {
    const db = await initDB();
    if (datos.id) {
        await db.execute("UPDATE visita_predicacion SET dia=$1, hora=$2, acomp_esposo=$3, acomp_esposa=$4, tipo_arreglo=$5 WHERE id=$6", 
        [datos.dia, datos.hora, datos.acomp_esposo, datos.acomp_esposa, datos.tipo_arreglo, datos.id]);
    } else {
        await db.execute("INSERT INTO visita_predicacion (visita_id, dia, hora, acomp_esposo, acomp_esposa, tipo_arreglo) VALUES ($1, $2, $3, $4, $5, $6)", 
        [datos.visita_id, datos.dia, datos.hora, datos.acomp_esposo, datos.acomp_esposa, datos.tipo_arreglo]);
    }
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('db_local_cambiada'));
}

// --- HOSPITALIDAD ---
export async function obtenerHospitalidad(visitaId: number): Promise<Hospitalidad[]> {
    const db = await initDB();
    return await db.select<Hospitalidad[]>("SELECT * FROM visita_hospitalidad WHERE visita_id = $1", [visitaId]);
}
export async function guardarHospitalidad(datos: Hospitalidad) {
    const db = await initDB();
    if (datos.id) {
        await db.execute("UPDATE visita_hospitalidad SET dia=$1, tipo_comida=$2, anfitrion=$3, direccion=$4, telefono=$5 WHERE id=$6", 
        [datos.dia, datos.tipo_comida, datos.anfitrion, datos.direccion, datos.telefono, datos.id]);
    } else {
        await db.execute("INSERT INTO visita_hospitalidad (visita_id, dia, tipo_comida, anfitrion, direccion, telefono) VALUES ($1, $2, $3, $4, $5, $6)", 
        [datos.visita_id, datos.dia, datos.tipo_comida, datos.anfitrion, datos.direccion, datos.telefono]);
    }
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('db_local_cambiada'));
}

// --- PASTOREO ---
export async function obtenerPastoreo(visitaId: number): Promise<Pastoreo[]> {
    const db = await initDB();
    return await db.select<Pastoreo[]>("SELECT * FROM visita_pastoreo WHERE visita_id = $1", [visitaId]);
}
export async function guardarPastoreo(datos: Pastoreo) {
    const db = await initDB();
    if (datos.id) {
        await db.execute("UPDATE visita_pastoreo SET dia_hora=$1, familia=$2, direccion=$3, telefono=$4, anciano=$5, notas=$6 WHERE id=$7", 
        [datos.dia_hora, datos.familia, datos.direccion, datos.telefono, datos.anciano, datos.notas, datos.id]);
    } else {
        await db.execute("INSERT INTO visita_pastoreo (visita_id, dia_hora, familia, direccion, telefono, anciano, notas) VALUES ($1, $2, $3, $4, $5, $6, $7)", 
        [datos.visita_id, datos.dia_hora, datos.familia, datos.direccion, datos.telefono, datos.anciano, datos.notas]);
    }
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('db_local_cambiada'));
}

// --- AGENDA ---
export async function obtenerAgenda(visitaId: number): Promise<Agenda | null> {
    const db = await initDB();
    const result = await db.select<Agenda[]>("SELECT * FROM visita_agenda WHERE visita_id = $1", [visitaId]);
    return result.length > 0 ? result[0] : null;
}
export async function guardarAgenda(datos: Agenda) {
    const db = await initDB();
    await db.execute("INSERT INTO visita_agenda (visita_id, puntos) VALUES ($1, $2) ON CONFLICT(visita_id) DO UPDATE SET puntos=excluded.puntos", 
    [datos.visita_id, datos.puntos]);
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('db_local_cambiada'));
}

// --- ELIMINAR GENÉRICO ---
export async function eliminarRegistroPrograma(tabla: 'predicacion' | 'hospitalidad' | 'pastoreo', id: number) {
    const db = await initDB();
    let query = "";
    if (tabla === 'predicacion') query = "DELETE FROM visita_predicacion WHERE id = $1";
    else if (tabla === 'hospitalidad') query = "DELETE FROM visita_hospitalidad WHERE id = $1";
    else if (tabla === 'pastoreo') query = "DELETE FROM visita_pastoreo WHERE id = $1";
    
    if (query) {
        await db.execute(query, [id]);
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('db_local_cambiada'));
    }
}