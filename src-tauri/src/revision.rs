use serde::{Deserialize, Serialize};
use crate::database::establecer_conexion;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RevisionVisita {
    pub id: Option<i64>,
    pub visita_id: i64,
    pub fecha: String,
    pub contadores: String,
    pub completado: bool,
}

#[tauri::command]
pub fn obtener_revision_por_visita_rust(visita_id: i64) -> Result<Option<RevisionVisita>, String> {
    let conn = establecer_conexion().map_err(|e| e.to_string())?;
    
    let mut stmt = conn.prepare(
        "SELECT id, visita_id, fecha, contadores, completado 
         FROM revision_visitas 
         WHERE visita_id = ?1 
         ORDER BY id DESC LIMIT 1"
    ).map_err(|e| e.to_string())?;

    let mut iter = stmt.query_map([visita_id], |row| {
        Ok(RevisionVisita {
            id: row.get(0)?,
            visita_id: row.get(1)?,
            fecha: row.get(2)?,
            contadores: row.get(3)?,
            completado: row.get(4)?,
        })
    }).map_err(|e| e.to_string())?;

    if let Some(resultado) = iter.next() {
        Ok(Some(resultado.map_err(|e| e.to_string())?))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub fn guardar_revision_visita_rust(revision: RevisionVisita) -> Result<i64, String> {
    let conn = establecer_conexion().map_err(|e| e.to_string())?;
    
    if let Some(id) = revision.id {
        // UPDATE
        conn.execute(
            "UPDATE revision_visitas 
             SET visita_id = ?1, fecha = ?2, contadores = ?3, completado = ?4 
             WHERE id = ?5",
            rusqlite::params![
                revision.visita_id,
                revision.fecha,
                revision.contadores,
                revision.completado,
                id
            ],
        ).map_err(|e| e.to_string())?;
        Ok(id)
    } else {
        // INSERT
        conn.execute(
            "INSERT INTO revision_visitas (visita_id, fecha, contadores, completado) 
             VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params![
                revision.visita_id,
                revision.fecha,
                revision.contadores,
                revision.completado
            ],
        ).map_err(|e| e.to_string())?;
        
        let nuevo_id = conn.last_insert_rowid();
        Ok(nuevo_id)
    }
}

#[tauri::command]
pub fn eliminar_revision_visita_rust(id: i64) -> Result<(), String> {
    let conn = establecer_conexion().map_err(|e| e.to_string())?;
    conn.execute(
        "DELETE FROM revision_visitas WHERE id = ?1",
        rusqlite::params![id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn obtener_contadores_revision_anterior_rust(visita_id: i64) -> Result<Option<String>, String> {
    let conn = establecer_conexion().map_err(|e| e.to_string())?;
    
    // Buscamos la revisión más reciente de la misma congregación, anterior a esta visita
    let mut stmt = conn.prepare(
        "SELECT rv.contadores 
         FROM revision_visitas rv
         INNER JOIN visitas_programadas vp_prev ON rv.visita_id = vp_prev.id
         INNER JOIN visitas_programadas vp_act ON vp_act.id = ?1
         WHERE vp_prev.congregacion_id = vp_act.congregacion_id
           AND rv.visita_id != ?1
           AND rv.fecha < vp_act.fechaSemana
         ORDER BY rv.fecha DESC
         LIMIT 1"
    ).map_err(|e| e.to_string())?;

    let mut iter = stmt.query_map([visita_id], |row| {
        let contadores: String = row.get(0)?;
        Ok(contadores)
    }).map_err(|e| e.to_string())?;

    if let Some(resultado) = iter.next() {
        Ok(Some(resultado.map_err(|e| e.to_string())?))
    } else {
        Ok(None)
    }
}