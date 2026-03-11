use rusqlite::{Connection, Result};

// Función para conectar a la base de datos
pub fn establecer_conexion() -> Result<Connection> {
    // Por ahora, para desarrollo, lo creará en la raíz de src-tauri.
    // Más adelante lo apuntaremos a la carpeta oficial de datos de la app.
    let path = "av_database.db"; 
    Connection::open(path)
}

// Inicializamos las tablas (Equivalente a tu antiguo initDB)
pub fn inicializar_bd() -> Result<()> {
    let conn = establecer_conexion()?;

    // Tabla Configuración
    conn.execute(
        "CREATE TABLE IF NOT EXISTS configuracion (
            clave TEXT PRIMARY KEY,
            valor TEXT
        )",
        [],
    )?;

    // Tabla Circuitos
    conn.execute(
        "CREATE TABLE IF NOT EXISTS circuitos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL UNIQUE,
            etiquetas TEXT,
            fechaCreacion TEXT,
            fechaInicio TEXT,
            fechaFin TEXT
        )",
        [],
    )?;

    // Tabla Congregaciones
    conn.execute(
        "CREATE TABLE IF NOT EXISTS congregaciones (
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
        )",
        [],
    )?;

    // Tabla Personas
    conn.execute(
        "CREATE TABLE IF NOT EXISTS personas (
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
        )",
        [],
    )?;

    // Tabla Historial
    conn.execute(
        "CREATE TABLE IF NOT EXISTS historial_visitas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            congregacion_id INTEGER,
            fecha TEXT NOT NULL,
            tipo TEXT NOT NULL,
            completado BOOLEAN DEFAULT 0,
            contenido TEXT,
            FOREIGN KEY(congregacion_id) REFERENCES congregaciones(id) ON DELETE CASCADE
        )",
        [],
    )?;

    Ok(())
}

// Asegúrate de que la primera línea de tu archivo tenga "params":
// use rusqlite::{params, Connection, Result};

// --- AÑADE ESTO AL FINAL DEL ARCHIVO ---

#[tauri::command]
pub fn guardar_config_rust(clave: String, valor: String) -> Result<(), String> {
    let conn = establecer_conexion().map_err(|e| e.to_string())?;
    
    // Ejecutamos el INSERT. El ?1 y ?2 son los reemplazos seguros de Rust (equivalentes a $1 y $2)
    conn.execute(
        "INSERT INTO configuracion (clave, valor) VALUES (?1, ?2) ON CONFLICT(clave) DO UPDATE SET valor = ?2",
        rusqlite::params![clave, valor],
    ).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub fn cargar_config_rust(clave: String) -> Result<Option<String>, String> {
    let conn = establecer_conexion().map_err(|e| e.to_string())?;
    
    let mut stmt = conn.prepare("SELECT valor FROM configuracion WHERE clave = ?1").map_err(|e| e.to_string())?;
    let mut rows = stmt.query(rusqlite::params![clave]).map_err(|e| e.to_string())?;
    
    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        let valor: String = row.get(0).map_err(|e| e.to_string())?;
        Ok(Some(valor))
    } else {
        Ok(None) // Si no hay configuración guardada, devuelve null a Svelte
    }
}