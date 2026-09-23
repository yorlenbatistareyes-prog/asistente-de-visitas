use crate::database::establecer_conexion;
use serde::{Deserialize, Serialize};

// --- ESTRUCTURA PARA CONGREGACIONES ---
#[derive(Debug, Serialize, Deserialize)]
pub struct CongregacionRust {
    pub id: Option<i64>,
    pub circuito: String,
    pub nombre: String,
    #[serde(rename = "enVisita")]
    pub en_visita: bool,
    pub ciudad: Option<String>,
    pub provincia: Option<String>,
    pub pais: Option<String>,
    pub idioma: Option<String>,
    #[serde(rename = "esLenguaSenas")]
    pub es_lengua_senas: bool,
    pub telefono: Option<String>,
    #[serde(rename = "horaSemana")]
    pub hora_semana: Option<String>,
    #[serde(rename = "horaFinSemana")]
    pub hora_fin_semana: Option<String>,
    #[serde(rename = "diaSemana")]
    pub dia_semana: Option<String>,
    #[serde(rename = "diaFinSemana")]
    pub dia_fin_semana: Option<String>,
    // 🌟 NUEVOS CAMPOS:
    pub numero_congregacion: Option<String>,
    pub direccion_salon: Option<String>,
    pub enlace_mapa: Option<String>,
}

// --- COMANDOS PARA CONGREGACIONES ---

#[tauri::command]
pub fn obtener_congregaciones_rust(circuito: String) -> Result<Vec<CongregacionRust>, String> {
    let conn = establecer_conexion().map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare("SELECT id, circuito, nombre, enVisita, ciudad, provincia, pais, idioma, esLenguaSenas, telefono, horaSemana, horaFinSemana, diaSemana, diaFinSemana, numero_congregacion, direccion_salon, enlace_mapa FROM congregaciones WHERE circuito = ?1 ORDER BY nombre ASC").map_err(|e| e.to_string())?;

    let congregaciones_iter = stmt
        .query_map(rusqlite::params![circuito], |row| {
            Ok(CongregacionRust {
                id: row.get(0)?,
                circuito: row.get(1)?,
                nombre: row.get(2)?,
                en_visita: row.get(3)?,
                ciudad: row.get(4)?,
                provincia: row.get(5)?,
                pais: row.get(6)?,
                idioma: row.get(7)?,
                es_lengua_senas: row.get(8)?,
                telefono: row.get(9)?,
                hora_semana: row.get(10)?,
                hora_fin_semana: row.get(11)?,
                dia_semana: row.get(12)?,
                dia_fin_semana: row.get(13)?,
                numero_congregacion: row.get(14)?,
                direccion_salon: row.get(15)?,
                enlace_mapa: row.get(16)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut congregaciones = Vec::new();
    for cong in congregaciones_iter {
        congregaciones.push(cong.map_err(|e| e.to_string())?);
    }

    Ok(congregaciones)
}

#[tauri::command]
pub fn guardar_congregacion_rust(cong: CongregacionRust) -> Result<(), String> {
    let conn = establecer_conexion().map_err(|e| e.to_string())?;

    let en_visita_int = if cong.en_visita { 1 } else { 0 };
    let es_lengua_senas_int = if cong.es_lengua_senas { 1 } else { 0 };

    if let Some(id_existente) = cong.id {
        // ACTUALIZAR DIRECTO (Cuando guardas desde el Modal de Edición)
        conn.execute(
            "UPDATE congregaciones SET 
             nombre = ?1, enVisita = ?2, ciudad = ?3, provincia = ?4, pais = ?5, 
             idioma = ?6, esLenguaSenas = ?7, telefono = ?8, horaSemana = ?9, 
             horaFinSemana = ?10, diaSemana = ?11, diaFinSemana = ?12,
             numero_congregacion = ?13, direccion_salon = ?14, enlace_mapa = ?15
             WHERE id = ?16",
            rusqlite::params![
                cong.nombre.to_uppercase(),
                en_visita_int,
                cong.ciudad,
                cong.provincia,
                cong.pais,
                cong.idioma,
                es_lengua_senas_int,
                cong.telefono,
                cong.hora_semana,
                cong.hora_fin_semana,
                cong.dia_semana,
                cong.dia_fin_semana,
                cong.numero_congregacion,
                cong.direccion_salon,
                cong.enlace_mapa,
                id_existente
            ],
        )
        .map_err(|e| e.to_string())?;
    } else {
        // INSERTAR NUEVA O ACTUALIZAR (Cuando usas el botón "Importar CSV")
        // La regla ON CONFLICT intercepta los duplicados y actualiza sus datos en lugar de fallar
        conn.execute(
            "INSERT INTO congregaciones 
             (circuito, nombre, enVisita, ciudad, provincia, pais, idioma, esLenguaSenas, telefono, horaSemana, horaFinSemana, diaSemana, diaFinSemana, numero_congregacion, direccion_salon, enlace_mapa) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)
             ON CONFLICT(circuito, nombre) DO UPDATE SET 
             numero_congregacion = excluded.numero_congregacion,
             ciudad = excluded.ciudad,
             provincia = excluded.provincia,
             pais = excluded.pais,
             telefono = excluded.telefono",
            rusqlite::params![
                cong.circuito, cong.nombre.to_uppercase(), en_visita_int, cong.ciudad, cong.provincia, cong.pais,
                cong.idioma, es_lengua_senas_int, cong.telefono, cong.hora_semana,
                cong.hora_fin_semana, cong.dia_semana, cong.dia_fin_semana,
                cong.numero_congregacion, cong.direccion_salon, cong.enlace_mapa
            ],
        ).map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub fn eliminar_congregacion_rust(id: i64) -> Result<(), String> {
    let conn = establecer_conexion().map_err(|e| e.to_string())?;
    conn.execute(
        "DELETE FROM congregaciones WHERE id = ?1",
        rusqlite::params![id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}