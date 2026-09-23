use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};

// ==========================================
// 1. ESTRUCTURAS DE DATOS (Iguales a TypeScript)
// ==========================================

#[derive(Debug, Serialize, Deserialize)]
pub struct Predicacion {
    id: Option<i32>,
    visita_id: i32,
    dia: String,
    hora: String,
    acomp_esposo: Option<String>,
    acomp_esposa: Option<String>,
    publicador: Option<String>,
    telefono: Option<String>,
    tipo_arreglo: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Hospitalidad {
    id: Option<i32>,
    visita_id: i32,
    dia: String,
    tipo_comida: String,
    anfitrion: String,
    direccion: Option<String>,
    telefono: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Pastoreo {
    id: Option<i32>,
    visita_id: i32,
    dia_hora: Option<String>,
    familia: String,
    direccion: Option<String>,
    telefono: Option<String>,
    anciano: Option<String>,
    notas: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Agenda {
    id: Option<i32>,
    visita_id: i32,
    puntos: Option<String>,
}

// ==========================================
// 2. COMANDOS PARA PREDICACIÓN
// ==========================================

#[tauri::command]
pub fn obtener_predicacion_rust(visita_id: i32) -> Result<Vec<Predicacion>, String> {
    let conn = Connection::open("av_database.db").map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT id, visita_id, dia, hora, acomp_esposo, acomp_esposa, publicador, telefono, tipo_arreglo FROM visita_predicacion WHERE visita_id = ?1 ORDER BY id ASC").map_err(|e| e.to_string())?;

    let iter = stmt.query_map(params![visita_id], |row| {
        Ok(Predicacion {
            id: row.get(0)?,
            visita_id: row.get(1)?,
            dia: row.get(2)?,
            hora: row.get(3)?,
            acomp_esposo: row.get(4)?,
            acomp_esposa: row.get(5)?,
            publicador: row.get(6)?,
            telefono: row.get(7)?,
            tipo_arreglo: row.get(8)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut resultados = Vec::new();
    for item in iter { if let Ok(p) = item { resultados.push(p); } }
    Ok(resultados)
}

#[tauri::command]
pub fn guardar_predicacion_rust(datos: Predicacion) -> Result<i32, String> {
    let conn = Connection::open("av_database.db").map_err(|e| e.to_string())?;
    if let Some(id) = datos.id {
        conn.execute("UPDATE visita_predicacion SET dia=?1, hora=?2, acomp_esposo=?3, acomp_esposa=?4, publicador=?5, telefono=?6, tipo_arreglo=?7 WHERE id=?8",
            params![datos.dia, datos.hora, datos.acomp_esposo, datos.acomp_esposa, datos.publicador, datos.telefono, datos.tipo_arreglo, id]
        ).map_err(|e| e.to_string())?;
        Ok(id)
    } else {
        conn.execute("INSERT INTO visita_predicacion (visita_id, dia, hora, acomp_esposo, acomp_esposa, publicador, telefono, tipo_arreglo) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![datos.visita_id, datos.dia, datos.hora, datos.acomp_esposo, datos.acomp_esposa, datos.publicador, datos.telefono, datos.tipo_arreglo]
        ).map_err(|e| e.to_string())?;
        Ok(conn.last_insert_rowid() as i32)
    }
}

// ==========================================
// 3. COMANDOS PARA HOSPITALIDAD
// ==========================================

#[tauri::command]
pub fn obtener_hospitalidad_rust(visita_id: i32) -> Result<Vec<Hospitalidad>, String> {
    let conn = Connection::open("av_database.db").map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT id, visita_id, dia, tipo_comida, anfitrion, direccion, telefono FROM visita_hospitalidad WHERE visita_id = ?1").map_err(|e| e.to_string())?;

    let iter = stmt.query_map(params![visita_id], |row| {
        Ok(Hospitalidad {
            id: row.get(0)?, visita_id: row.get(1)?, dia: row.get(2)?, tipo_comida: row.get(3)?,
            anfitrion: row.get(4)?, direccion: row.get(5)?, telefono: row.get(6)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut resultados = Vec::new();
    for item in iter { if let Ok(p) = item { resultados.push(p); } }
    Ok(resultados)
}

#[tauri::command]
pub fn guardar_hospitalidad_rust(datos: Hospitalidad) -> Result<i32, String> {
    let conn = Connection::open("av_database.db").map_err(|e| e.to_string())?;
    if let Some(id) = datos.id {
        conn.execute("UPDATE visita_hospitalidad SET dia=?1, tipo_comida=?2, anfitrion=?3, direccion=?4, telefono=?5 WHERE id=?6",
            params![datos.dia, datos.tipo_comida, datos.anfitrion, datos.direccion, datos.telefono, id]
        ).map_err(|e| e.to_string())?;
        Ok(id)
    } else {
        conn.execute("INSERT INTO visita_hospitalidad (visita_id, dia, tipo_comida, anfitrion, direccion, telefono) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![datos.visita_id, datos.dia, datos.tipo_comida, datos.anfitrion, datos.direccion, datos.telefono]
        ).map_err(|e| e.to_string())?;
        Ok(conn.last_insert_rowid() as i32)
    }
}

// ==========================================
// 4. COMANDOS PARA PASTOREO
// ==========================================

#[tauri::command]
pub fn obtener_pastoreo_rust(visita_id: i32) -> Result<Vec<Pastoreo>, String> {
    let conn = Connection::open("av_database.db").map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT id, visita_id, dia_hora, familia, direccion, telefono, anciano, notas FROM visita_pastoreo WHERE visita_id = ?1").map_err(|e| e.to_string())?;

    let iter = stmt.query_map(params![visita_id], |row| {
        Ok(Pastoreo {
            id: row.get(0)?, visita_id: row.get(1)?, dia_hora: row.get(2)?, familia: row.get(3)?,
            direccion: row.get(4)?, telefono: row.get(5)?, anciano: row.get(6)?, notas: row.get(7)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut resultados = Vec::new();
    for item in iter { if let Ok(p) = item { resultados.push(p); } }
    Ok(resultados)
}

#[tauri::command]
pub fn guardar_pastoreo_rust(datos: Pastoreo) -> Result<i32, String> {
    let conn = Connection::open("av_database.db").map_err(|e| e.to_string())?;
    if let Some(id) = datos.id {
        conn.execute("UPDATE visita_pastoreo SET dia_hora=?1, familia=?2, direccion=?3, telefono=?4, anciano=?5, notas=?6 WHERE id=?7",
            params![datos.dia_hora, datos.familia, datos.direccion, datos.telefono, datos.anciano, datos.notas, id]
        ).map_err(|e| e.to_string())?;
        Ok(id)
    } else {
        conn.execute("INSERT INTO visita_pastoreo (visita_id, dia_hora, familia, direccion, telefono, anciano, notas) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![datos.visita_id, datos.dia_hora, datos.familia, datos.direccion, datos.telefono, datos.anciano, datos.notas]
        ).map_err(|e| e.to_string())?;
        Ok(conn.last_insert_rowid() as i32)
    }
}

// ==========================================
// 5. COMANDOS PARA AGENDA
// ==========================================

#[tauri::command]
pub fn obtener_agenda_rust(visita_id: i32) -> Result<Option<Agenda>, String> {
    let conn = Connection::open("av_database.db").map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT id, visita_id, puntos FROM visita_agenda WHERE visita_id = ?1").map_err(|e| e.to_string())?;
    
    let mut iter = stmt.query_map(params![visita_id], |row| {
        Ok(Agenda { id: row.get(0)?, visita_id: row.get(1)?, puntos: row.get(2)? })
    }).map_err(|e| e.to_string())?;

    if let Some(Ok(agenda)) = iter.next() {
        Ok(Some(agenda))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub fn guardar_agenda_rust(datos: Agenda) -> Result<i32, String> {
    let conn = Connection::open("av_database.db").map_err(|e| e.to_string())?;
    
    // Usamos UPSERT (Insertar o Actualizar si ya existe por el UNIQUE de visita_id)
    conn.execute("INSERT INTO visita_agenda (visita_id, puntos) VALUES (?1, ?2) 
                  ON CONFLICT(visita_id) DO UPDATE SET puntos=excluded.puntos",
        params![datos.visita_id, datos.puntos]
    ).map_err(|e| e.to_string())?;
    
    Ok(conn.last_insert_rowid() as i32)
}

// ==========================================
// 6. ELIMINAR (GENÉRICO)
// ==========================================

#[tauri::command]
pub fn eliminar_registro_programa_rust(tabla: String, id: i32) -> Result<(), String> {
    let conn = Connection::open("av_database.db").map_err(|e| e.to_string())?;
    
    // Medida de seguridad básica para evitar inyección SQL
    let query = match tabla.as_str() {
        "predicacion" => "DELETE FROM visita_predicacion WHERE id = ?1",
        "hospitalidad" => "DELETE FROM visita_hospitalidad WHERE id = ?1",
        "pastoreo" => "DELETE FROM visita_pastoreo WHERE id = ?1",
        _ => return Err("Tabla no válida".into()),
    };

    conn.execute(query, params![id]).map_err(|e| e.to_string())?;
    Ok(())
}
