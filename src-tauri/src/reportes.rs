use serde::{Deserialize, Serialize};
use crate::database::establecer_conexion;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FilaHistorial {
    pub visita_id: i64,
    pub congregacion_nombre: String,
    pub fecha_semana: String,
    pub contadores: Option<String>,
}

#[tauri::command]
pub fn obtener_historial_revisiones_rust(circuito_id: i64) -> Result<Vec<FilaHistorial>, String> {
    let conn = establecer_conexion().map_err(|e| e.to_string())?;
    
    let mut stmt = conn.prepare(
        "SELECT 
            vp.id as visita_id,
            c.nombre as congregacion_nombre,
            vp.fechaSemana,
            rv.contadores
         FROM visitas_programadas vp
         INNER JOIN congregaciones c ON vp.congregacion_id = c.id
         INNER JOIN circuitos ci ON c.circuito = ci.nombre
         LEFT JOIN revision_visitas rv ON rv.visita_id = vp.id
         WHERE ci.id = ?1
           AND rv.id IS NOT NULL
         ORDER BY vp.fechaSemana DESC"
    ).map_err(|e| e.to_string())?;

    let iter = stmt.query_map([circuito_id], |row| {
        Ok(FilaHistorial {
            visita_id: row.get(0)?,
            congregacion_nombre: row.get(1)?,
            fecha_semana: row.get(2)?,
            contadores: row.get(3)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut historial = Vec::new();
    for fila in iter {
        historial.push(fila.map_err(|e| e.to_string())?);
    }
    Ok(historial)
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UltimaRevisionPorCongregacion {
    pub congregacion_id: i64,
    pub congregacion_nombre: String,
    pub visita_id: i64,
    pub fecha: String,
    pub contadores: String,
}

#[tauri::command]
pub fn obtener_ultimas_revisiones_por_circuito_rust(circuito_id: i64) -> Result<Vec<UltimaRevisionPorCongregacion>, String> {
    let conn = establecer_conexion().map_err(|e| e.to_string())?;
    
    // Para cada congregación del circuito, obtenemos su revisión más reciente
    let mut stmt = conn.prepare(
        "SELECT 
            c.id as congregacion_id,
            c.nombre as congregacion_nombre,
            rv.visita_id,
            rv.fecha,
            rv.contadores
         FROM congregaciones c
         INNER JOIN circuitos ci ON c.circuito = ci.nombre
         INNER JOIN visitas_programadas vp ON vp.congregacion_id = c.id
         INNER JOIN revision_visitas rv ON rv.visita_id = vp.id
         WHERE ci.id = ?1
           AND rv.id IN (
               SELECT rv2.id
               FROM revision_visitas rv2
               INNER JOIN visitas_programadas vp2 ON rv2.visita_id = vp2.id
               WHERE vp2.congregacion_id = c.id
               ORDER BY rv2.fecha DESC
               LIMIT 1
           )
         ORDER BY c.nombre ASC"
    ).map_err(|e| e.to_string())?;

    let iter = stmt.query_map([circuito_id], |row| {
        Ok(UltimaRevisionPorCongregacion {
            congregacion_id: row.get(0)?,
            congregacion_nombre: row.get(1)?,
            visita_id: row.get(2)?,
            fecha: row.get(3)?,
            contadores: row.get(4)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut resultado = Vec::new();
    for fila in iter {
        resultado.push(fila.map_err(|e| e.to_string())?);
    }
    Ok(resultado)
}