use serde::{Deserialize, Serialize};
use crate::database::establecer_conexion;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VisitaProgramada {
    pub id: Option<i64>,
    pub ruta_id: i64,
    pub congregacion_id: i64,
    pub fecha_semana: String,
    pub estado: String,
    pub notas: Option<String>,
}

#[tauri::command]
pub fn obtener_visitas_programadas_rust(ruta_id: i64) -> Result<Vec<VisitaProgramada>, String> {
    let conn = establecer_conexion().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT id, ruta_id, congregacion_id, fechaSemana, estado, notas FROM visitas_programadas WHERE ruta_id = ? ORDER BY fechaSemana ASC").map_err(|e| e.to_string())?;
    
    let visitas_iter = stmt.query_map([ruta_id], |row| {
        Ok(VisitaProgramada {
            id: row.get(0)?,
            ruta_id: row.get(1)?,
            congregacion_id: row.get(2)?,
            fecha_semana: row.get(3)?,
            estado: row.get(4)?,
            notas: row.get(5)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut visitas = Vec::new();
    for v in visitas_iter {
        visitas.push(v.map_err(|e| e.to_string())?);
    }
    Ok(visitas)
}

#[tauri::command]
pub fn guardar_visita_programada_rust(visita: VisitaProgramada) -> Result<(), String> {
    let conn = establecer_conexion().map_err(|e| e.to_string())?;
    if let Some(id) = visita.id {
        conn.execute(
            "UPDATE visitas_programadas SET ruta_id = ?1, congregacion_id = ?2, fechaSemana = ?3, estado = ?4, notas = ?5 WHERE id = ?6",
            rusqlite::params![visita.ruta_id, visita.congregacion_id, visita.fecha_semana, visita.estado, visita.notas, id],
        ).map_err(|e| e.to_string())?;
    } else {
        conn.execute(
            "INSERT INTO visitas_programadas (ruta_id, congregacion_id, fechaSemana, estado, notas) VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![visita.ruta_id, visita.congregacion_id, visita.fecha_semana, visita.estado, visita.notas],
        ).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn eliminar_visita_programada_rust(id: i64) -> Result<(), String> {
    let conn = establecer_conexion().map_err(|e| e.to_string())?;
    conn.execute(
        "DELETE FROM visitas_programadas WHERE id = ?1",
        rusqlite::params![id],
    ).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub fn obtener_visita_por_id_rust(id: i64) -> Result<Option<VisitaProgramada>, String> {
    let conn = crate::database::establecer_conexion().map_err(|e| e.to_string())?;
    
    let mut stmt = conn.prepare(
        "SELECT id, ruta_id, congregacion_id, fechaSemana, estado, notas FROM visitas_programadas WHERE id = ?1"
    ).map_err(|e| e.to_string())?;
    
    let mut visitas_iter = stmt.query_map([id], |row| {
        Ok(VisitaProgramada {
            id: row.get(0)?,
            ruta_id: row.get(1)?,
            congregacion_id: row.get(2)?,
            fecha_semana: row.get(3)?,
            estado: row.get(4)?,
            notas: row.get(5)?,
        })
    }).map_err(|e| e.to_string())?;

    // Devolvemos el primer resultado si existe, o None si no hay coincidencias
    if let Some(visita_result) = visitas_iter.next() {
        Ok(Some(visita_result.map_err(|e| e.to_string())?))
    } else {
        Ok(None)
    }
}