use crate::database::establecer_conexion;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct VisitaHistorialRust {
    pub id: Option<i64>,
    pub congregacion_id: i64,
    pub fecha: String,
    pub tipo: String,
    pub completado: bool,
    pub contenido: String,
}

#[tauri::command]
pub fn obtener_historial_rust(congregacion_id: i64) -> Result<Vec<VisitaHistorialRust>, String> {
    let conn = establecer_conexion().map_err(|e| e.to_string())?;
    
    // Ordenamos por fecha DESC para que los análisis más recientes salgan primero en el muro
    let mut stmt = conn.prepare(
        "SELECT id, congregacion_id, fecha, tipo, completado, contenido 
         FROM historial_visitas WHERE congregacion_id = ?1 ORDER BY fecha DESC"
    ).map_err(|e| e.to_string())?;
    
    let historial_iter = stmt.query_map(rusqlite::params![congregacion_id], |row| {
        Ok(VisitaHistorialRust {
            id: row.get(0)?,
            congregacion_id: row.get(1)?,
            fecha: row.get(2)?,
            tipo: row.get(3)?,
            completado: row.get(4)?,
            contenido: row.get(5)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut historial = Vec::new();
    for h in historial_iter {
        historial.push(h.map_err(|e| e.to_string())?);
    }
    
    Ok(historial)
}

#[tauri::command]
pub fn guardar_historial_rust(visita: VisitaHistorialRust) -> Result<(), String> {
    let conn = establecer_conexion().map_err(|e| e.to_string())?;
    
    // SQLite guarda booleanos como 1 o 0
    let completado_int = if visita.completado { 1 } else { 0 };

    if let Some(id_existente) = visita.id {
        // ACTUALIZAR ANÁLISIS EXISTENTE
        conn.execute(
            "UPDATE historial_visitas SET 
             fecha = ?1, tipo = ?2, completado = ?3, contenido = ?4 
             WHERE id = ?5",
            rusqlite::params![
                visita.fecha, visita.tipo, completado_int, visita.contenido, id_existente
            ],
        ).map_err(|e| e.to_string())?;
    } else {
        // INSERTAR NUEVO ANÁLISIS
        conn.execute(
            "INSERT INTO historial_visitas 
             (congregacion_id, fecha, tipo, completado, contenido) 
             VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![
                visita.congregacion_id, visita.fecha, visita.tipo, completado_int, visita.contenido
            ],
        ).map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

#[tauri::command]
pub fn eliminar_historial_rust(id: i64) -> Result<(), String> {
    let conn = establecer_conexion().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM historial_visitas WHERE id = ?1", rusqlite::params![id]).map_err(|e| e.to_string())?;
    Ok(())
}