import Database from '@tauri-apps/plugin-sql';

// Instancia global en memoria
let dbInstance: Database | null = null;

// --- INTERFACES ---
export interface Circuito {
  id?: number;
  nombre: string;
  etiquetas?: string; 
  fechaCreacion?: string;
}

export interface Congregacion {
  id?: number;
  circuito: string; // Opcionalmente en el futuro podemos cambiar esto a circuito_id, por ahora lo dejamos como texto para no romper tu formulario actual
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
    
    // NUEVA TABLA: Circuitos reales
    await dbInstance.execute(`
      CREATE TABLE IF NOT EXISTS circuitos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL UNIQUE,
        etiquetas TEXT,
        fechaCreacion TEXT
      );
    `);

    // Crear tabla de congregaciones
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

    // Crear tabla para el historial de análisis
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

    // Tabla para configuraciones sueltas
    await dbInstance.execute(`
      CREATE TABLE IF NOT EXISTS configuracion (
        clave TEXT PRIMARY KEY,
        valor TEXT
      );
    `);

    console.log("✅ Motor SQLite inicializado con éxito.");
    return dbInstance;
  } catch (error) {
    console.error("❌ Error inicializando SQLite:", error);
    throw error;
  }
}

// --- 2. GESTIÓN DE CIRCUITOS ---

export async function crearCircuito(nombre: string, etiquetas: string = "") {
  const db = await initDB();
  const fecha = new Date().toISOString().split('T')[0]; // Guarda la fecha actual YYYY-MM-DD
  
  try {
    await db.execute(
      'INSERT INTO circuitos (nombre, etiquetas, fechaCreacion) VALUES ($1, $2, $3)',
      [nombre.toUpperCase(), etiquetas, fecha]
    );
    console.log(`✅ Circuito ${nombre} creado.`);
  } catch (error) {
    console.error("Error creando circuito:", error);
    throw error;
  }
}

export async function obtenerTodosLosCircuitos(): Promise<Circuito[]> {
  const db = await initDB();
  try {
    return await db.select<Circuito[]>('SELECT * FROM circuitos ORDER BY nombre ASC');
  } catch (error) {
    console.error("Error obteniendo circuitos:", error);
    return [];
  }
}

export async function obtenerCircuitoPorId(id: number): Promise<Circuito | null> {
  const db = await initDB();
  try {
    const resultado = await db.select<Circuito[]>('SELECT * FROM circuitos WHERE id = $1', [id]);
    return resultado.length > 0 ? resultado[0] : null;
  } catch (error) {
    console.error("Error obteniendo circuito:", error);
    return null;
  }
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
