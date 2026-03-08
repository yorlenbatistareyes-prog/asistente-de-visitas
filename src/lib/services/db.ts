import Database from '@tauri-apps/plugin-sql';

let dbInstance: Database | null = null;

// --- INTERFACES ---
export interface Circuito {
  id?: number;
  nombre: string;
  etiquetas?: string; 
  fechaCreacion?: string;
  fechaInicio?: string; // NUEVO
  fechaFin?: string;    // NUEVO
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
  circuito_id: number; // Para vincular la persona al circuito actual
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

// --- 2. GESTIÓN DE CIRCUITOS ---

export async function crearCircuito(nombre: string, etiquetas: string = "", fechaInicio: string = "", fechaFin: string = "") {
  const db = await initDB();
  const fecha = new Date().toISOString().split('T')[0]; 
  
  await db.execute(
    'INSERT INTO circuitos (nombre, etiquetas, fechaCreacion, fechaInicio, fechaFin) VALUES ($1, $2, $3, $4, $5)',
    [nombre.toUpperCase(), etiquetas, fecha, fechaInicio, fechaFin]
  );
}

export async function obtenerTodosLosCircuitos(): Promise<Circuito[]> {
  const db = await initDB();
  return await db.select<Circuito[]>('SELECT * FROM circuitos ORDER BY nombre ASC');
}

export async function obtenerCircuitoPorId(id: number): Promise<Circuito | null> {
  const db = await initDB();
  const resultado = await db.select<Circuito[]>('SELECT * FROM circuitos WHERE id = $1', [id]);
  return resultado.length > 0 ? resultado[0] : null;
}

// NUEVA FUNCIÓN: Elimina el circuito y todas las congregaciones que le pertenecen
export async function eliminarCircuito(id: number, nombre: string) {
  const db = await initDB();
  // Borramos las congregaciones que tengan el nombre de este circuito
  await db.execute('DELETE FROM congregaciones WHERE circuito = $1', [nombre]);
  // Borramos el circuito
  await db.execute('DELETE FROM circuitos WHERE id = $1', [id]);
}

// --- 3. GESTIÓN DE CONGREGACIONES ---

export async function obtenerCongregaciones(circuito: string): Promise<Congregacion[]> {
  const db = await initDB();
  try {
    return await db.select<Congregacion[]>(
      'SELECT * FROM congregaciones WHERE circuito = $1 ORDER BY nombre ASC',
      [circuito]
    );
  } catch (error) {
    console.error("Error obteniendo congregaciones:", error);
    return [];
  }
}

export async function guardarCongregacion(cong: Congregacion) {
  const db = await initDB();
  try {
    if (cong.id) {
      await db.execute(
        `UPDATE congregaciones SET 
          nombre = $1, enVisita = $2, ciudad = $3, provincia = $4, pais = $5, 
          idioma = $6, esLenguaSenas = $7, telefono = $8, horaSemana = $9, 
          horaFinSemana = $10, diaSemana = $11, diaFinSemana = $12
         WHERE id = $13`,
        [
          cong.nombre.toUpperCase(), cong.enVisita ? 1 : 0, cong.ciudad, cong.provincia, cong.pais,
          cong.idioma, cong.esLenguaSenas ? 1 : 0, cong.telefono, cong.horaSemana,
          cong.horaFinSemana, cong.diaSemana, cong.diaFinSemana, cong.id
        ]
      );
    } else {
      await db.execute(
        `INSERT INTO congregaciones 
          (circuito, nombre, enVisita, ciudad, provincia, pais, idioma, esLenguaSenas, telefono, horaSemana, horaFinSemana, diaSemana, diaFinSemana) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          cong.circuito, cong.nombre.toUpperCase(), cong.enVisita ? 1 : 0, cong.ciudad, cong.provincia, cong.pais,
          cong.idioma, cong.esLenguaSenas ? 1 : 0, cong.telefono, cong.horaSemana,
          cong.horaFinSemana, cong.diaSemana, cong.diaFinSemana
        ]
      );
    }
  } catch (error) {
    console.error("Error guardando congregación:", error);
    throw error;
  }
}

export async function eliminarCongregacion(id: number) {
  const db = await initDB();
  await db.execute('DELETE FROM congregaciones WHERE id = $1', [id]);
}

// --- 4. GESTIÓN DE CONFIGURACIÓN GLOBAL ---

export async function guardarConfig(clave: string, valor: string) {
  const db = await initDB();
  await db.execute(
    'INSERT INTO configuracion (clave, valor) VALUES ($1, $2) ON CONFLICT(clave) DO UPDATE SET valor = $2',
    [clave, valor]
  );
}

export async function cargarConfig(clave: string): Promise<string | null> {
  const db = await initDB();
  const res = await db.select<{ valor: string }[]>('SELECT valor FROM configuracion WHERE clave = $1', [clave]);
  return res.length > 0 ? res[0].valor : null;
}

// --- 5. GESTIÓN DE PERSONAS ---

export async function obtenerPersonasPorCircuito(circuitoId: number): Promise<Persona[]> {
  const db = await initDB();
  return await db.select<Persona[]>(
    'SELECT * FROM personas WHERE circuito_id = $1 ORDER BY apellidos ASC',
    [circuitoId]
  );
}

export async function guardarPersona(p: Persona) {
  const db = await initDB();
  if (p.id) {
    await db.execute(
      `UPDATE personas SET 
        nombre = $1, segundo_nombre = $2, apellidos = $3, privilegio = $4, 
        congregacion = $5, direccion = $6, telefono_celular = $7, 
        telefono_fijo = $8, email = $9
       WHERE id = $10`,
      [p.nombre, p.segundo_nombre, p.apellidos, p.privilegio, p.congregacion, 
       p.direccion, p.telefono_celular, p.telefono_fijo, p.email, p.id]
    );
  } else {
    await db.execute(
      `INSERT INTO personas 
        (circuito_id, nombre, segundo_nombre, apellidos, privilegio, congregacion, direccion, telefono_celular, telefono_fijo, email) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [p.circuito_id, p.nombre, p.segundo_nombre, p.apellidos, p.privilegio, p.congregacion, 
       p.direccion, p.telefono_celular, p.telefono_fijo, p.email]
    );
  }
}

export async function eliminarPersona(id: number) {
  const db = await initDB();
  await db.execute('DELETE FROM personas WHERE id = $1', [id]);
}
