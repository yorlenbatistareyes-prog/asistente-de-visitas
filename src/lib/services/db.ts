import Database from '@tauri-apps/plugin-sql';
import { invoke } from '@tauri-apps/api/core'; // <--- NUEVO: El mensajero de Rust

let dbInstance: Database | null = null;

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

// --- 1. INICIALIZACIÓN Y CREACIÓN DE TABLAS ---
export async function initDB(): Promise<Database> {
  if (dbInstance) return dbInstance;

  try {
    dbInstance = await Database.load('sqlite:av_database.db');
    
    // TABLA CIRCUITOS (Actualizada con fechas)
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

    // Truco de migración: Si la tabla vieja ya existe, le añadimos las columnas nuevas sin borrar datos
    try {
      await dbInstance.execute(`ALTER TABLE circuitos ADD COLUMN fechaInicio TEXT;`);
      await dbInstance.execute(`ALTER TABLE circuitos ADD COLUMN fechaFin TEXT;`);
    } catch (e) {
      // Si da error es porque las columnas ya existen, lo ignoramos en silencio
    }

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

    // TABLA PERSONAS (Compatible con CSV de JW)
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

// --- 2. GESTIÓN DE CIRCUITOS (MIGRADA A RUST PURO) ---

export async function crearCircuito(nombre: string, etiquetas: string = "", fechaInicio: string = "", fechaFin: string = "") {
  const fechaCreacion = new Date().toISOString().split('T')[0]; 
  try {
    // Nota: Tauri convierte automáticamente camelCase (fechaCreacion) a snake_case (fecha_creacion) para Rust
    await invoke('crear_circuito_rust', { 
      nombre, 
      etiquetas, 
      fechaCreacion, 
      fechaInicio, 
      fechaFin 
    });
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
  } catch (error) {
    console.error("Error eliminando circuito en Rust:", error);
    throw error;
  }
}

// --- 3. GESTIÓN DE CONGREGACIONES (MIGRADA A RUST PURO) ---

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
    // Le pasamos el objeto completo a Rust para que él decida si inserta o actualiza
    await invoke('guardar_congregacion_rust', { cong });
  } catch (error) {
    console.error("Error guardando congregación en Rust:", error);
    throw error;
  }
}

export async function eliminarCongregacion(id: number) {
  try {
    await invoke('eliminar_congregacion_rust', { id });
  } catch (error) {
    console.error("Error eliminando congregación en Rust:", error);
    throw error;
  }
}

// --- 4. GESTIÓN DE CONFIGURACIÓN GLOBAL (AHORA EN RUST PURO) ---

export async function guardarConfig(clave: string, valor: string) {
  try {
    await invoke('guardar_config_rust', { clave, valor });
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

// --- 5. GESTIÓN DE PERSONAS (MIGRADA A RUST PURO) ---

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
  } catch (error) {
    console.error("Error guardando persona en Rust:", error);
    throw error;
  }
}

export async function eliminarPersona(id: number) {
  try {
    await invoke('eliminar_persona_rust', { id });
  } catch (error) {
    console.error("Error eliminando persona en Rust:", error);
    throw error;
  }
}

// --- 6. GESTIÓN DE HISTORIAL / ANÁLISIS DE CONGREGACIÓN (RUST PURO) ---

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
  } catch (error) {
    console.error("Error guardando historial en Rust:", error);
    throw error;
  }
}

export async function eliminarHistorial(id: number) {
  try {
    await invoke('eliminar_historial_rust', { id });
  } catch (error) {
    console.error("Error eliminando historial en Rust:", error);
    throw error;
  }
}