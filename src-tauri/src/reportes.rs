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
    
    // Estrategia: por cada congregación, tomamos la revisión más reciente
    // Prioridad 1: revision_visitas (nuevas)
    // Prioridad 2: historial_visitas tipo "Revisión de Archivos" (viejas)
    let mut stmt = conn.prepare(
        "WITH todas_revisiones AS (
            -- Revisiones NUEVAS (prioridad 1)
            SELECT 
                c.id as congregacion_id,
                c.nombre as congregacion_nombre,
                rv.visita_id as visita_id,
                rv.fecha as fecha,
                rv.contadores as contadores,
                1 as prioridad
            FROM congregaciones c
            INNER JOIN circuitos ci ON c.circuito = ci.nombre
            INNER JOIN visitas_programadas vp ON vp.congregacion_id = c.id
            INNER JOIN revision_visitas rv ON rv.visita_id = vp.id
            WHERE ci.id = ?1
            
            UNION ALL
            
            -- Revisiones VIEJAS (prioridad 2)
            SELECT 
                c.id as congregacion_id,
                c.nombre as congregacion_nombre,
                0 as visita_id,
                hv.fecha as fecha,
                hv.contenido as contadores,
                2 as prioridad
            FROM congregaciones c
            INNER JOIN circuitos ci ON c.circuito = ci.nombre
            INNER JOIN historial_visitas hv ON hv.congregacion_id = c.id
            WHERE ci.id = ?1 AND hv.tipo LIKE '%Revisi%'
        ),
        ranking AS (
            SELECT *,
                ROW_NUMBER() OVER (
                    PARTITION BY congregacion_id 
                    ORDER BY prioridad ASC, fecha DESC
                ) as rn
            FROM todas_revisiones
        )
        SELECT congregacion_id, congregacion_nombre, visita_id, fecha, contadores
        FROM ranking
        WHERE rn = 1
        ORDER BY congregacion_nombre ASC"
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