use crate::database::establecer_conexion;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct PersonaRust {
    pub id: Option<i64>,
    pub circuito_id: i64,
    pub nombre: String,
    pub segundo_nombre: Option<String>,
    pub apellidos: String,
    pub privilegio: Option<String>,
    pub congregacion: Option<String>,
    pub direccion: Option<String>,
    pub telefono_celular: Option<String>,
    pub telefono_fijo: Option<String>,
    pub email: Option<String>,
}

#[tauri::command]
pub fn obtener_personas_por_circuito_rust(circuito_id: i64) -> Result<Vec<PersonaRust>, String> {
    let conn = establecer_conexion().map_err(|e| e.to_string())?;
    
    let mut stmt = conn.prepare(
        "SELECT id, circuito_id, nombre, segundo_nombre, apellidos, privilegio, congregacion, direccion, telefono_celular, telefono_fijo, email 
         FROM personas WHERE circuito_id = ?1 ORDER BY apellidos ASC"
    ).map_err(|e| e.to_string())?;
    
    let personas_iter = stmt.query_map(rusqlite::params![circuito_id], |row| {
        Ok(PersonaRust {
            id: row.get(0)?,
            circuito_id: row.get(1)?,
            nombre: row.get(2)?,
            segundo_nombre: row.get(3)?,
            apellidos: row.get(4)?,
            privilegio: row.get(5)?,
            congregacion: row.get(6)?,
            direccion: row.get(7)?,
            telefono_celular: row.get(8)?,
            telefono_fijo: row.get(9)?,
            email: row.get(10)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut personas = Vec::new();
    for p in personas_iter {
        personas.push(p.map_err(|e| e.to_string())?);
    }
    
    Ok(personas)
}

#[tauri::command]
pub fn guardar_persona_rust(p: PersonaRust) -> Result<(), String> {
    let conn = establecer_conexion().map_err(|e| e.to_string())?;

    if let Some(id_existente) = p.id {
        // ACTUALIZAR PERSONA
        conn.execute(
            "UPDATE personas SET 
             nombre = ?1, segundo_nombre = ?2, apellidos = ?3, privilegio = ?4, 
             congregacion = ?5, direccion = ?6, telefono_celular = ?7, 
             telefono_fijo = ?8, email = ?9
             WHERE id = ?10",
            rusqlite::params![
                p.nombre, p.segundo_nombre, p.apellidos, p.privilegio, 
                p.congregacion, p.direccion, p.telefono_celular, 
                p.telefono_fijo, p.email, id_existente
            ],
        ).map_err(|e| e.to_string())?;
    } else {
        // INSERTAR NUEVA PERSONA
        conn.execute(
            "INSERT INTO personas 
             (circuito_id, nombre, segundo_nombre, apellidos, privilegio, congregacion, direccion, telefono_celular, telefono_fijo, email) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            rusqlite::params![
                p.circuito_id, p.nombre, p.segundo_nombre, p.apellidos, p.privilegio, 
                p.congregacion, p.direccion, p.telefono_celular, p.telefono_fijo, p.email
            ],
        ).map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

#[tauri::command]
pub fn eliminar_persona_rust(id: i64) -> Result<(), String> {
    let conn = establecer_conexion().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM personas WHERE id = ?1", rusqlite::params![id]).map_err(|e| e.to_string())?;
    Ok(())
}