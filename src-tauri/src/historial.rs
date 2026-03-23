use crate::database::establecer_conexion;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct VisitaHistorialRust {
    pub id: Option<i64>,
    pub congregacion_id: i64,
    pub fecha: String,
    pub tipo: String,
    pub completado: bool,
    pub contenido: String,
}

// --- NUEVAS ESTRUCTURAS PARA EL PANEL DE ESTADÍSTICAS ---

#[derive(Debug, Serialize, Deserialize)]
pub struct TotalesCircuito {
    pub publicadores: i32,
    pub precursores: i32,
    pub auxiliares: i32,
    pub eb: i32,
    pub ancianos: i32,
    pub siervos_min: i32,
    pub congregaciones_contadas: i32,
}

// Agregamos Serialize aquí para que no de error
// Agregamos Serialize aquí para que no de error
#[derive(Debug, Serialize, Deserialize)] 
pub struct ContenidoInforme {
    #[serde(alias = "total", default)] // <--- CLAVE: Si el JSON dice "total", cárgalo aquí
    pub publicadores: i32,
    #[serde(alias = "precursoresRegulares", default)] 
    pub precursores: i32,
    #[serde(alias = "precursoresAuxiliares", default)] 
    pub auxiliares: i32,
    #[serde(alias = "sinCursos", alias = "eb", default)] 
    pub eb: i32,
    #[serde(default)]
    pub ancianos: i32,
    #[serde(alias = "siervosMinisteriales", alias = "siervos_min", default)]
    pub siervos_min: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DesgloseUltimaVisita {
    pub nombre_congregacion: String,
    pub fecha_visita: String,
    pub datos: ContenidoInforme,
}

#[tauri::command]
pub fn obtener_historial_rust(congregacion_id: i64) -> Result<Vec<VisitaHistorialRust>, String> {
    let conn = establecer_conexion().map_err(|e| e.to_string())?;
    
    // Ordenamos por fecha DESC para que los análisis más recientes salgan primero en el muro
    let mut stmt = conn.prepare(
        "SELECT id, congregacion_id, fecha, tipo, completado, contenido 
         FROM historial_visitas WHERE congregacion_id = ?1 ORDER BY fecha DESC"
    ).map_err(|e| e.to_string())?;
    
    let historial_iter = stmt.query_map(rusqlite::params![congregacion_id], |row| {
        Ok(VisitaHistorialRust {
            id: row.get(0)?,
            congregacion_id: row.get(1)?,
            fecha: row.get(2)?,
            tipo: row.get(3)?,
            completado: row.get(4)?,
            contenido: row.get(5)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut historial = Vec::new();
    for h in historial_iter {
        historial.push(h.map_err(|e| e.to_string())?);
    }
    
    Ok(historial)
}

#[tauri::command]
pub fn guardar_historial_rust(visita: VisitaHistorialRust) -> Result<(), String> {
    let conn = establecer_conexion().map_err(|e| e.to_string())?;
    
    // SQLite guarda booleanos como 1 o 0
    let completado_int = if visita.completado { 1 } else { 0 };

    if let Some(id_existente) = visita.id {
        // ACTUALIZAR ANÁLISIS EXISTENTE
        conn.execute(
            "UPDATE historial_visitas SET 
             fecha = ?1, tipo = ?2, completado = ?3, contenido = ?4 
             WHERE id = ?5",
            rusqlite::params![
                visita.fecha, visita.tipo, completado_int, visita.contenido, id_existente
            ],
        ).map_err(|e| e.to_string())?;
    } else {
        // INSERTAR NUEVO ANÁLISIS
        conn.execute(
            "INSERT INTO historial_visitas 
             (congregacion_id, fecha, tipo, completado, contenido) 
             VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![
                visita.congregacion_id, visita.fecha, visita.tipo, completado_int, visita.contenido
            ],
        ).map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

#[tauri::command]
pub fn eliminar_historial_rust(id: i64) -> Result<(), String> {
    let conn = establecer_conexion().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM historial_visitas WHERE id = ?1", rusqlite::params![id]).map_err(|e| e.to_string())?;
    Ok(())
}

// --- COMANDO PARA LOS TOTALES DEL PANEL SUPERIOR ---

#[tauri::command]
pub fn obtener_totales_circuito_recientes_rust() -> Result<TotalesCircuito, String> {
    let conn = establecer_conexion().map_err(|e| e.to_string())?;

    // Usamos la VISTA que creamos en database.rs para obtener solo las ÚLTIMAS visitas
    let mut stmt = conn
        .prepare("SELECT contenido FROM vista_ultima_visita_congregacion")
        .map_err(|e| e.to_string())?;

    let informes_iter = stmt
        .query_map([], |row| {
            let contenido_json: String = row.get(0)?;
            Ok(contenido_json)
        })
        .map_err(|e| e.to_string())?;

    let mut totales = TotalesCircuito {
        publicadores: 0, precursores: 0, auxiliares: 0,
        eb: 0, ancianos: 0, siervos_min: 0,
        congregaciones_contadas: 0,
    };

    for informe_json in informes_iter {
        if let Ok(json_str) = informe_json {
            if let Ok(data) = serde_json::from_str::<ContenidoInforme>(&json_str) {
                totales.publicadores += data.publicadores;
                totales.precursores += data.precursores;
                totales.auxiliares += data.auxiliares;
                totales.eb += data.eb;
                totales.ancianos += data.ancianos;
                totales.siervos_min += data.siervos_min;
                totales.congregaciones_contadas += 1;
            }
        }
    }
    Ok(totales)
}

// --- COMANDO PARA EL BOTÓN DE DESGLOSE (TABLA TIPO TIMOTHY) ---

#[tauri::command]
pub fn obtener_desglose_ultimas_visitas_rust(circuito: String) -> Result<Vec<DesgloseUltimaVisita>, String> {
    let conn = establecer_conexion().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("
            SELECT c.nombre, v.fecha, v.contenido 
            FROM congregaciones c
            INNER JOIN vista_ultima_visita_congregacion v ON c.id = v.congregacion_id
            WHERE c.circuito = ?1
            ORDER BY c.nombre ASC
        ")
        .map_err(|e| e.to_string())?;

    let rows = stmt.query_map(rusqlite::params![circuito], |row| {
        let nombre: String = row.get(0)?;
        let fecha: String = row.get(1)?;
        let contenido_raw: String = row.get(2)?;
        
        // Limpieza del JSON (por si acaso viene doblemente escapado)
        let contenido_limpio = if contenido_raw.starts_with('"') {
            serde_json::from_str::<String>(&contenido_raw).unwrap_or(contenido_raw)
        } else {
            contenido_raw
        };

        let datos = serde_json::from_str::<ContenidoInforme>(&contenido_limpio)
            .unwrap_or_else(|_| ContenidoInforme { 
                publicadores: 0, precursores: 0, auxiliares: 0, 
                eb: 0, ancianos: 0, siervos_min: 0 
            });

        Ok(DesgloseUltimaVisita {
            nombre_congregacion: nombre,
            fecha_visita: fecha,
            datos
        })
    }).map_err(|e| e.to_string())?;

    let mut lista = Vec::new();
    for row in rows {
        lista.push(row.map_err(|e| e.to_string())?);
    }
    Ok(lista)
}