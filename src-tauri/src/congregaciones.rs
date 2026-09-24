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
    pub latitud: Option<f64>,
    pub longitud: Option<f64>,
}

// --- COMANDOS PARA CONGREGACIONES ---

#[tauri::command]
pub fn obtener_congregaciones_rust(circuito: String) -> Result<Vec<CongregacionRust>, String> {
    let conn = establecer_conexion().map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare("SELECT id, circuito, nombre, enVisita, ciudad, provincia, pais, idioma, esLenguaSenas, telefono, horaSemana, horaFinSemana, diaSemana, diaFinSemana, numero_congregacion, direccion_salon, enlace_mapa, latitud, longitud FROM congregaciones WHERE circuito = ?1 ORDER BY nombre ASC").map_err(|e| e.to_string())?;

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
                latitud: row.get(17)?,
                longitud: row.get(18)?,
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
             numero_congregacion = ?13, direccion_salon = ?14, enlace_mapa = ?15,
             latitud = ?16, longitud = ?17
             WHERE id = ?18",
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
                cong.latitud,
                cong.longitud,
                id_existente
            ],
        )
        .map_err(|e| e.to_string())?;
    } else {
        // INSERTAR NUEVA O ACTUALIZAR (Cuando usas el botón "Importar CSV")
        // La regla ON CONFLICT intercepta los duplicados y actualiza sus datos en lugar de fallar
           conn.execute(
    "INSERT INTO congregaciones 
     (circuito, nombre, enVisita, ciudad, provincia, pais, idioma, esLenguaSenas, telefono, horaSemana, horaFinSemana, diaSemana, diaFinSemana, numero_congregacion, direccion_salon, enlace_mapa, latitud, longitud) 
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18)
     ON CONFLICT(circuito, nombre) DO UPDATE SET 
     numero_congregacion = excluded.numero_congregacion,
     ciudad = excluded.ciudad,
     provincia = excluded.provincia,
     pais = excluded.pais,
     telefono = excluded.telefono,
     direccion_salon = excluded.direccion_salon,
     enlace_mapa = excluded.enlace_mapa",
    rusqlite::params![
        cong.circuito, cong.nombre.to_uppercase(), en_visita_int, cong.ciudad, cong.provincia, cong.pais,
        cong.idioma, es_lengua_senas_int, cong.telefono, cong.hora_semana,
        cong.hora_fin_semana, cong.dia_semana, cong.dia_fin_semana,
        cong.numero_congregacion, cong.direccion_salon, cong.enlace_mapa,
        cong.latitud, cong.longitud
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

use std::collections::HashMap;

// --- ESTRUCTURAS PARA ESTADÍSTICAS ---
#[derive(Debug, Serialize, Deserialize, Clone)] // 🌟 AÑADIDO CLONE AQUÍ
pub struct DirectivoContacto {
    pub nombre: String,
    pub tel: String,
    pub email: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)] // 🌟 AÑADIDO CLONE AQUÍ
pub struct EstadisticasCongregacion {
    pub publicadores: i64,
    pub ancianos: i64,
    pub sm: i64,
    pub precursores: i64,
    pub cca: Option<DirectivoContacto>,
    pub sec: Option<DirectivoContacto>,
    pub ss: Option<DirectivoContacto>,
}

#[tauri::command]
pub fn obtener_estadisticas_congregaciones_rust(circuito_id: i64) -> Result<HashMap<String, EstadisticasCongregacion>, String> {
    let conn = establecer_conexion().map_err(|e| e.to_string())?;
    
    // Obtenemos todas las personas de este circuito
    let mut stmt = conn.prepare(
        "SELECT congregacion, nombre, apellidos, privilegio, telefono_celular, telefono_fijo, email 
         FROM personas 
         WHERE circuito_id = ?1 AND congregacion IS NOT NULL"
    ).map_err(|e| e.to_string())?;
    
    let personas_iter = stmt.query_map([circuito_id], |row| {
        Ok((
            row.get::<_, String>(0)?, // Congregacion
            row.get::<_, String>(1)?, // Nombre
            row.get::<_, String>(2)?, // Apellido
            row.get::<_, Option<String>>(3)?, // Privilegio
            row.get::<_, Option<String>>(4)?, // Celular
            row.get::<_, Option<String>>(5)?, // Fijo
            row.get::<_, Option<String>>(6)?  // Email
        ))
    }).map_err(|e| e.to_string())?;

    let mut mapa: HashMap<String, EstadisticasCongregacion> = HashMap::new();

    for p in personas_iter {
        let (cong_nombre, nombre, apellido, priv_opt, cel_opt, fijo_opt, email_opt) = p.map_err(|e| e.to_string())?;
        
        // Si la congregación no existe en el mapa, la inicializamos
        let stats = mapa.entry(cong_nombre.clone()).or_insert(EstadisticasCongregacion {
            publicadores: 0,
            ancianos: 0,
            sm: 0,
            precursores: 0,
            cca: None,
            sec: None,
            ss: None,
        });

        let privilegios = priv_opt.unwrap_or_default().to_uppercase();
        
        // 1. Todo el que está en la base de datos es al menos publicador (a menos que indiques lo contrario)
        stats.publicadores += 1;

        // 2. Contadores básicos
        if privilegios.contains("ANCIANO") { stats.ancianos += 1; }
        if privilegios.contains("SM") { stats.sm += 1; }
        if privilegios.contains("PR") || privilegios.contains("PE") || privilegios.contains("PET") { 
            stats.precursores += 1; 
        }

        // 3. Captura de Directivos
        let nombre_completo = format!("{} {}", nombre, apellido);
        // Preferimos celular, si no hay usamos fijo
        let telefono = cel_opt.unwrap_or_else(|| fijo_opt.unwrap_or_default());
        let email = email_opt.unwrap_or_default();

        let contacto = DirectivoContacto { nombre: nombre_completo, tel: telefono, email };

        if privilegios.contains("CCA") && stats.cca.is_none() { stats.cca = Some(contacto.clone()); }
        else if privilegios.contains("SEC") && stats.sec.is_none() { stats.sec = Some(contacto.clone()); }
        else if privilegios.contains("SS") && stats.ss.is_none() { stats.ss = Some(contacto); }
    }

    Ok(mapa)
}