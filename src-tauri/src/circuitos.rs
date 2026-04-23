use crate::database::establecer_conexion; // Importamos la conexión
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct CircuitoRust {
    pub id: Option<i64>,
    pub nombre: String,
    pub etiquetas: Option<String>,
    #[serde(rename = "fechaCreacion")]
    pub fecha_creacion: Option<String>,
    #[serde(rename = "fechaInicio")]
    pub fecha_inicio: Option<String>,
    #[serde(rename = "fechaFin")]
    pub fecha_fin: Option<String>,
}

#[tauri::command]
pub fn crear_circuito_rust(
    nombre: String,
    etiquetas: String,
    fecha_creacion: String,
    fecha_inicio: String,
    fecha_fin: String,
) -> Result<(), String> {
    let conn = establecer_conexion().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO circuitos (nombre, etiquetas, fechaCreacion, fechaInicio, fechaFin) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![nombre.to_uppercase(), etiquetas, fecha_creacion, fecha_inicio, fecha_fin],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn obtener_todos_los_circuitos_rust() -> Result<Vec<CircuitoRust>, String> {
    let conn = establecer_conexion().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT id, nombre, etiquetas, fechaCreacion, fechaInicio, fechaFin FROM circuitos ORDER BY nombre ASC").map_err(|e| e.to_string())?;

    let circuitos_iter = stmt
        .query_map([], |row| {
            Ok(CircuitoRust {
                id: row.get(0)?,
                nombre: row.get(1)?,
                etiquetas: row.get(2)?,
                fecha_creacion: row.get(3)?,
                fecha_inicio: row.get(4)?,
                fecha_fin: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut circuitos = Vec::new();
    for circ in circuitos_iter {
        circuitos.push(circ.map_err(|e| e.to_string())?);
    }
    Ok(circuitos)
}

#[tauri::command]
pub fn obtener_circuito_por_id_rust(id: i64) -> Result<Option<CircuitoRust>, String> {
    let conn = establecer_conexion().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT id, nombre, etiquetas, fechaCreacion, fechaInicio, fechaFin FROM circuitos WHERE id = ?1").map_err(|e| e.to_string())?;
    let mut rows = stmt
        .query(rusqlite::params![id])
        .map_err(|e| e.to_string())?;

    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        Ok(Some(CircuitoRust {
            id: row.get(0).map_err(|e| e.to_string())?,
            nombre: row.get(1).map_err(|e| e.to_string())?,
            etiquetas: row.get(2).map_err(|e| e.to_string())?,
            fecha_creacion: row.get(3).map_err(|e| e.to_string())?,
            fecha_inicio: row.get(4).map_err(|e| e.to_string())?,
            fecha_fin: row.get(5).map_err(|e| e.to_string())?,
        }))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub fn eliminar_circuito_rust(id: i64, nombre: String) -> Result<(), String> {
    let conn = establecer_conexion().map_err(|e| e.to_string())?;
    conn.execute(
        "DELETE FROM congregaciones WHERE circuito = ?1",
        rusqlite::params![nombre],
    )
    .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM circuitos WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
