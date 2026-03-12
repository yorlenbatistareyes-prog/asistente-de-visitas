use rusqlite::{Connection, Result};

// Hacemos esta función "pub" para que los demás archivos (.rs) puedan usarla para conectarse
pub fn establecer_conexion() -> Result<Connection> {
    let path = "av_database.db"; 
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

    Ok(())
}