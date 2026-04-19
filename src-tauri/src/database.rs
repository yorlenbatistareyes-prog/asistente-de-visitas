use rusqlite::{Connection, Result};
use std::sync::OnceLock; // <--- NUEVO: Para guardar la ruta globalmente de forma segura

// Bóveda segura donde guardaremos la ruta oficial del sistema
pub static DB_PATH: OnceLock<String> = OnceLock::new();

// Hacemos esta función "pub" para que los demás archivos (.rs) puedan usarla
pub fn establecer_conexion() -> Result<Connection> {
    // Leemos la ruta de la bóveda
    let path = DB_PATH
        .get()
        .expect("La ruta de la base de datos no ha sido configurada");
    Connection::open(path)
}

// Inicializamos las tablas
pub fn inicializar_bd() -> Result<()> {
    let conn = establecer_conexion()?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS configuracion (clave TEXT PRIMARY KEY, valor TEXT)",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS circuitos (
            id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL UNIQUE, etiquetas TEXT, 
            fechaCreacion TEXT, fechaInicio TEXT, fechaFin TEXT)",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS congregaciones (
            id INTEGER PRIMARY KEY AUTOINCREMENT, circuito TEXT NOT NULL, nombre TEXT NOT NULL, 
            enVisita BOOLEAN DEFAULT 0, ciudad TEXT, provincia TEXT, pais TEXT, idioma TEXT, 
            esLenguaSenas BOOLEAN DEFAULT 0, telefono TEXT, horaSemana TEXT, horaFinSemana TEXT, 
            diaSemana TEXT, diaFinSemana TEXT, UNIQUE(circuito, nombre))",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS personas (
            id INTEGER PRIMARY KEY AUTOINCREMENT, circuito_id INTEGER, nombre TEXT NOT NULL, 
            segundo_nombre TEXT, apellidos TEXT NOT NULL, privilegio TEXT, congregacion TEXT, 
            direccion TEXT, telefono_celular TEXT, telefono_fijo TEXT, email TEXT,
            FOREIGN KEY(circuito_id) REFERENCES circuitos(id) ON DELETE CASCADE)",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS historial_visitas (
            id INTEGER PRIMARY KEY AUTOINCREMENT, congregacion_id INTEGER, fecha TEXT NOT NULL, 
            tipo TEXT NOT NULL, completado BOOLEAN DEFAULT 0, contenido TEXT,
            FOREIGN KEY(congregacion_id) REFERENCES congregaciones(id) ON DELETE CASCADE)",
        [],
    )?;

    // --- NUEVO: CREACIÓN DE LA VISTA PARA LAS ESTADÍSTICAS ---
    // Esta vista filtra automáticamente la última visita finalizada de cada congregación
    conn.execute(
        "CREATE VIEW IF NOT EXISTS vista_ultima_visita_congregacion AS
        SELECT hv.*
        FROM historial_visitas hv
        JOIN (
            SELECT congregacion_id, MAX(fecha) as max_fecha
            FROM historial_visitas
            WHERE completado = 1
            GROUP BY congregacion_id
        ) hv2 ON hv.congregacion_id = hv2.congregacion_id AND hv.fecha = hv2.max_fecha",
        [],
    )?;

    // --- MIGRACIÓN AUTOMÁTICA DE ABREVIATURAS PARA LOS FILTROS ---
    let migraciones = [
        "UPDATE personas SET privilegio = REPLACE(privilegio, 'PRECURSOR ESPECIAL TEMPORAL', 'PET')",
        "UPDATE personas SET privilegio = REPLACE(privilegio, 'PRECURSOR ESPECIAL', 'PE')",
        "UPDATE personas SET privilegio = REPLACE(privilegio, 'PRECURSOR REGULAR', 'PR')",
        "UPDATE personas SET privilegio = REPLACE(privilegio, 'SIERVO MINISTERIAL', 'SM')",
        "UPDATE personas SET privilegio = REPLACE(privilegio, 'COORDINADOR', 'CCA')",
        "UPDATE personas SET privilegio = REPLACE(privilegio, 'SECRETARIO', 'SEC')",
        "UPDATE personas SET privilegio = REPLACE(privilegio, 'SUPERINTENDENTE DE SERVICIO', 'SS')",
        "UPDATE personas SET privilegio = REPLACE(privilegio, 'SUPERINTENDENTE DE GRUPO', 'SG')",
        "UPDATE personas SET privilegio = REPLACE(privilegio, 'AUXILIAR DE GRUPO', 'GA')",
    ];

    for query in migraciones.iter() {
        let _ = conn.execute(query, []);
    }
    
    Ok(())
}
