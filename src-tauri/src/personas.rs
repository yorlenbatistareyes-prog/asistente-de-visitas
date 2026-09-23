use crate::database::establecer_conexion;
use serde::{Deserialize, Serialize};
use rusqlite::OptionalExtension; // IMPORTANTE: Necesario para manejar búsquedas que no encuentran resultados sin dar error

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

// 🌟 NUEVA FUNCIÓN: Fusiona los privilegios antiguos con los nuevos del CSV sin duplicar
fn fusionar_privilegios(viejos: &Option<String>, nuevos: &Option<String>) -> Option<String> {
    let mut lista_privilegios: Vec<String> = Vec::new();

    if let Some(v) = viejos {
        for p in v.split(',') {
            let limpio = p.trim().to_uppercase();
            if !limpio.is_empty() && !lista_privilegios.contains(&limpio) {
                lista_privilegios.push(limpio);
            }
        }
    }

    if let Some(n) = nuevos {
        for p in n.split(',') {
            let limpio = p.trim().to_uppercase();
            if !limpio.is_empty() && !lista_privilegios.contains(&limpio) {
                lista_privilegios.push(limpio);
            }
        }
    }

    if lista_privilegios.is_empty() {
        None
    } else {
        Some(lista_privilegios.join(", "))
    }
}

#[tauri::command]
pub fn obtener_personas_por_circuito_rust(circuito_id: i64) -> Result<Vec<PersonaRust>, String> {
    let conn = establecer_conexion().map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare(
        "SELECT id, circuito_id, nombre, segundo_nombre, apellidos, privilegio, congregacion, direccion, telefono_celular, telefono_fijo, email 
         FROM personas WHERE circuito_id = ?1 ORDER BY congregacion ASC, apellidos ASC"
    ).map_err(|e| e.to_string())?;

    let personas_iter = stmt
        .query_map(rusqlite::params![circuito_id], |row| {
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
        })
        .map_err(|e| e.to_string())?;

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
        // ACTUALIZACIÓN DIRECTA (Cuando editas desde el Modal y guardas)
        conn.execute(
            "UPDATE personas SET 
             nombre = ?1, segundo_nombre = ?2, apellidos = ?3, privilegio = ?4, 
             congregacion = ?5, direccion = ?6, telefono_celular = ?7, 
             telefono_fijo = ?8, email = ?9
             WHERE id = ?10",
            rusqlite::params![
                p.nombre,
                p.segundo_nombre,
                p.apellidos,
                p.privilegio,
                p.congregacion,
                p.direccion,
                p.telefono_celular,
                p.telefono_fijo,
                p.email,
                id_existente
            ],
        )
        .map_err(|e| e.to_string())?;
    } else {
        // NUEVA INSERCIÓN O IMPORTACIÓN CSV
        
        // 1. Buscamos si ya existe el hermano (Mismo Nombre, Apellido y Congregación)
        let mut stmt = conn.prepare(
            "SELECT id, privilegio FROM personas WHERE circuito_id = ?1 AND nombre = ?2 AND apellidos = ?3 AND (congregacion = ?4 OR (congregacion IS NULL AND ?4 IS NULL))"
        ).map_err(|e| e.to_string())?;
        
        let resultado_busqueda = stmt.query_row(
            rusqlite::params![p.circuito_id, p.nombre, p.apellidos, p.congregacion],
            |row| Ok((row.get::<_, i64>(0)?, row.get::<_, Option<String>>(1)?))
        ).optional().map_err(|e| e.to_string())?;

        if let Some((id_dup, privilegio_viejo)) = resultado_busqueda {
            // SI EXISTE: Actualizamos sus datos y FUSIONAMOS los privilegios
            let privilegios_unidos = fusionar_privilegios(&privilegio_viejo, &p.privilegio);

            conn.execute(
                "UPDATE personas SET 
                 segundo_nombre=?1, privilegio=?2, direccion=?3, telefono_celular=?4, telefono_fijo=?5, email=?6
                 WHERE id=?7",
                rusqlite::params![
                    p.segundo_nombre, privilegios_unidos, p.direccion, p.telefono_celular, p.telefono_fijo, p.email, id_dup
                ],
            ).map_err(|e| e.to_string())?;
        } else {
            // SI NO EXISTE: Insertamos como persona nueva
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
    }

    Ok(())
}

#[tauri::command]
pub fn eliminar_persona_rust(id: i64) -> Result<(), String> {
    let conn = establecer_conexion().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM personas WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}