use serde::{Deserialize, Serialize};
use crate::database::establecer_conexion;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalisisVisita {
    pub id: Option<i64>,
    pub visita_id: i64,
    pub fecha: String,
    pub contenido: String,
    pub checklist: Option<String>,
    pub completado: bool,
}

#[tauri::command]
pub fn obtener_analisis_por_visita_rust(visita_id: i64) -> Result<Option<AnalisisVisita>, String> {
    let conn = establecer_conexion().map_err(|e| e.to_string())?;
    
    let mut stmt = conn.prepare(
        "SELECT id, visita_id, fecha, contenido, checklist, completado 
         FROM analisis_visitas 
         WHERE visita_id = ?1 
         ORDER BY id DESC LIMIT 1"
    ).map_err(|e| e.to_string())?;

    let mut iter = stmt.query_map([visita_id], |row| {
        Ok(AnalisisVisita {
            id: row.get(0)?,
            visita_id: row.get(1)?,
            fecha: row.get(2)?,
            contenido: row.get(3)?,
            checklist: row.get(4)?,
            completado: row.get(5)?,
        })
    }).map_err(|e| e.to_string())?;

    if let Some(resultado) = iter.next() {
        Ok(Some(resultado.map_err(|e| e.to_string())?))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub fn guardar_analisis_visita_rust(analisis: AnalisisVisita) -> Result<i64, String> {
    let conn = establecer_conexion().map_err(|e| e.to_string())?;
    
    if let Some(id) = analisis.id {
        // UPDATE
        conn.execute(
            "UPDATE analisis_visitas 
             SET visita_id = ?1, fecha = ?2, contenido = ?3, checklist = ?4, completado = ?5 
             WHERE id = ?6",
            rusqlite::params![
                analisis.visita_id,
                analisis.fecha,
                analisis.contenido,
                analisis.checklist,
                analisis.completado,
                id
            ],
        ).map_err(|e| e.to_string())?;
        Ok(id)
    } else {
        // INSERT
        conn.execute(
            "INSERT INTO analisis_visitas (visita_id, fecha, contenido, checklist, completado) 
             VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![
                analisis.visita_id,
                analisis.fecha,
                analisis.contenido,
                analisis.checklist,
                analisis.completado
            ],
        ).map_err(|e| e.to_string())?;
        
        let nuevo_id = conn.last_insert_rowid();
        Ok(nuevo_id)
    }
}

#[tauri::command]
pub fn eliminar_analisis_visita_rust(id: i64) -> Result<(), String> {
    let conn = establecer_conexion().map_err(|e| e.to_string())?;
    conn.execute(
        "DELETE FROM analisis_visitas WHERE id = ?1",
        rusqlite::params![id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}