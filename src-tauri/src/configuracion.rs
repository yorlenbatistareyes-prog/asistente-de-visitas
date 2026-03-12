use crate::database::establecer_conexion; // Importamos la conexión del núcleo

#[tauri::command]
pub fn guardar_config_rust(clave: String, valor: String) -> Result<(), String> {
    let conn = establecer_conexion().map_err(|e| e.to_string())?;
    
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
        Ok(None)
    }
}