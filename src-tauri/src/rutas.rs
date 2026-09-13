use serde::{Deserialize, Serialize};
use crate::database::establecer_conexion;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Ruta {
    pub id: Option<i64>,
    pub circuito_id: i64,
    pub congregacion_id: Option<i64>,
    pub nombre: String,
    pub fecha_inicio: String,
    pub fecha_fin: String,
    pub completada: bool,
}

#[tauri::command]
pub fn obtener_rutas_rust(circuito_id: i64) -> Result<Vec<Ruta>, String> {
    let conn = establecer_conexion().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT id, circuito_id, congregacion_id, nombre, fechaInicio, fechaFin, completada FROM rutas WHERE circuito_id = ? ORDER BY fechaInicio DESC").map_err(|e| e.to_string())?;
    
    let rutas_iter = stmt.query_map([circuito_id], |row| {
        Ok(Ruta {
            id: row.get(0)?,
            circuito_id: row.get(1)?,
            congregacion_id: row.get(2)?,
            nombre: row.get(3)?,
            fecha_inicio: row.get(4)?,
            fecha_fin: row.get(5)?,
            completada: row.get(6)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut rutas = Vec::new();
    for r in rutas_iter {
        rutas.push(r.map_err(|e| e.to_string())?);
    }
    Ok(rutas)
}

#[tauri::command]
pub fn guardar_ruta_rust(ruta: Ruta) -> Result<(), String> {
    let conn = establecer_conexion().map_err(|e| e.to_string())?;
    if let Some(id) = ruta.id {
        conn.execute(
            "UPDATE rutas SET congregacion_id = ?1, nombre = ?2, fechaInicio = ?3, fechaFin = ?4, completada = ?5 WHERE id = ?6",
            rusqlite::params![ruta.congregacion_id, ruta.nombre, ruta.fecha_inicio, ruta.fecha_fin, ruta.completada, id],
        ).map_err(|e| e.to_string())?;
    } else {
        conn.execute(
            "INSERT INTO rutas (circuito_id, congregacion_id, nombre, fechaInicio, fechaFin, completada) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            rusqlite::params![ruta.circuito_id, ruta.congregacion_id, ruta.nombre, ruta.fecha_inicio, ruta.fecha_fin, ruta.completada],
        ).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn eliminar_ruta_rust(id: i64) -> Result<(), String> {
    let conn = establecer_conexion().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM rutas WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}