// 1. DECLARAMOS LOS MÓDULOS DE NUESTRA ARQUITECTURA LIMPIA
pub mod database;
pub mod configuracion; 
pub mod circuitos;     
pub mod congregaciones;
pub mod personas;
pub mod historial;
pub mod drive;

use serde::{Deserialize, Serialize};
use std::process::Command; // Necesario para abrir Word/Excel
use tauri::Manager; // <--- NUEVO: Para buscar las carpetas seguras del sistema (AppData)

use std::sync::{Mutex, OnceLock}; // <-- AÑADIR

use std::env;
use chrono::Local;

// --- 2. VARIABLES GLOBALES Y ESTADOS ---

// Esta es nuestra "caja fuerte" global para el archivo pendiente
static ARCHIVO_PENDIENTE: OnceLock<Mutex<Option<String>>> = OnceLock::new();

// --- 1. ESTRUCTURAS (Igual que antes) ---
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PersonalTask {
    pub id: i64,
    pub title: String,
    pub date: String,
    pub priority: String,
    pub completed: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DocRecord {
    pub id: String,
    pub name: String,
    pub doc_type: String,
    pub path: String,
    pub date: String,
    pub size: String,
}

// --- 2. COMANDOS ---

#[tauri::command]
fn verificar_archivo_pendiente() -> Option<String> {
    let cache = ARCHIVO_PENDIENTE.get_or_init(|| Mutex::new(None));
    let archivo = cache.lock().unwrap().take();
    println!("🔍 Verificando archivo pendiente: {:?}", archivo);
    archivo
}

#[tauri::command]
fn hay_archivo_pendiente() -> bool {
    let cache = ARCHIVO_PENDIENTE.get_or_init(|| Mutex::new(None));
    let hay = cache.lock().unwrap().is_some();
    println!("🔍 ¿Hay archivo pendiente?: {}", hay);
    hay
}

// Abre archivos saltándose la seguridad estricta de Tauri
#[tauri::command]
fn abrir_archivo_nativo(ruta: String) -> Result<(), String> {
    println!("Abriendo nativamente: {}", ruta);

    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .arg(&ruta)
            .spawn()
            .map_err(|e| format!("Error Windows: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&ruta)
            .spawn()
            .map_err(|e| format!("Error Mac: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(&ruta)
            .spawn()
            .map_err(|e| format!("Error Linux: {}", e))?;
    }
    Ok(())
}

// FUNCIONES ANTERIORES (Las mantenemos para no romper nada)
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn get_personal_agenda() -> Vec<PersonalTask> {
    vec![]
}

#[tauri::command]
fn add_personal_task(title: String, date: String, _priority: String) -> String {
    println!("AGENDA: {} - Fecha: {}", title, date);
    "OK".to_string()
}

#[tauri::command]
fn save_document_record(name: String, path: String, doc_type: String, _size: String, _date: String) -> String {
    println!("DOC: {} (Tipo: {}) guardado en: {}", name, doc_type, path);
    "OK".to_string()
}



#[tauri::command]
fn generar_nombre_respaldo() -> String {
    // Genera la hora en formato 12h con AM/PM (Ej: 2026-03-30_08-33-PM)
    let fecha_hora = Local::now().format("%Y-%m-%d_%I-%M-%p").to_string();
    
    // Extraemos el nombre del dispositivo
    let dispositivo = whoami::devicename().unwrap_or("Desconocido".to_string());
    
    // Unimos todo
    format!("Respaldo_{}_{}.avisits", fecha_hora, dispositivo)
}


use std::fs;
use tauri::process::restart; // Importamos la función de reinicio de Tauri

#[tauri::command]
fn restaurar_bd(app_handle: tauri::AppHandle, ruta_origen: String) -> Result<(), String> {
    let app_data_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    
    // Guardamos la copia con un nombre temporal para que Windows no moleste
    let restore_path = app_data_dir.join("av_database_restore.db");
    std::fs::copy(&ruta_origen, &restore_path).map_err(|e| format!("Error al copiar: {}", e))?;

    // Reiniciamos la app inmediatamente
    tauri::process::restart(&app_handle.env());

    Ok(())
}


// 🌟 NUEVA FUNCIÓN: CREAR RESPALDO PERFECTO 🌟
#[tauri::command]
fn crear_respaldo_bd(app_handle: tauri::AppHandle, ruta_destino: String) -> Result<(), String> {
    // 1. Buscamos dónde está la base de datos original
    let app_data_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_data_dir.join("av_database.db");

    // 2. Nos conectamos a ella
    let conn = rusqlite::Connection::open(db_path).map_err(|e| e.to_string())?;

    // 3. MAGIA: VACUUM INTO crea una copia perfecta en un solo archivo, uniendo .db y .wal
    conn.execute("VACUUM INTO ?1", rusqlite::params![ruta_destino])
        .map_err(|e| format!("Error al crear el respaldo seguro: {}", e))?;

    Ok(())
}

// --- 3. MAIN ---
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()

        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::default().build())

        .setup(|app| { 
            let app_data_dir = app.path().app_data_dir().expect("Error buscando AppData");
            std::fs::create_dir_all(&app_data_dir).expect("Error creando carpeta segura");
            
            // Creamos la ruta como PathBuf para poder manipular los archivos
            let db_path_buf = app_data_dir.join("av_database.db");
            
            // 🌟 EL TRUCO: Cambiazo antes de que SQLite y el plugin despierten
            let restore_path = app_data_dir.join("av_database_restore.db");
            if restore_path.exists() {
                println!("🔄 Restauración detectada. Limpiando archivos viejos...");
                // Borramos los temporales viejos que causaban el Error 500
                let _ = std::fs::remove_file(app_data_dir.join("av_database.db-wal"));
                let _ = std::fs::remove_file(app_data_dir.join("av_database.db-shm"));
                let _ = std::fs::remove_file(&db_path_buf); // Borramos la BD actual
                
                // Renombramos el archivo temporal para que sea la nueva BD oficial
                let _ = std::fs::rename(&restore_path, &db_path_buf);
            }
            // ----------------------------------------------------------
            
            // Ahora sí, la convertimos a String y la guardamos globalmente
            let db_path = db_path_buf.to_string_lossy().to_string();
            database::DB_PATH.set(db_path).expect("Error guardando ruta global");
            
            if let Err(e) = database::inicializar_bd() {
                eprintln!("Error crítico en BD: {}", e);
            }

            // Guardar ruta en la caja fuerte (doble clic / archivo asociado)
            for arg in std::env::args().skip(1) {
                if arg.to_lowercase().ends_with(".avisits") {
                    let cache = ARCHIVO_PENDIENTE.get_or_init(|| Mutex::new(None));
                    *cache.lock().unwrap() = Some(arg.clone());
                    println!("📦 Archivo .avisits detectado y guardado: {}", arg);
                    break; 
                }
            }
            
            Ok(())
        })
        // -------------------------------------------------
        
        .invoke_handler(tauri::generate_handler![
            greet,
            get_personal_agenda,
            add_personal_task,
            save_document_record,
            abrir_archivo_nativo,
            
            // --- REGISTRAMOS LOS COMANDOS DESDE SUS NUEVOS ARCHIVOS ---
            configuracion::guardar_config_rust,
            configuracion::cargar_config_rust,
            circuitos::crear_circuito_rust,
            circuitos::obtener_todos_los_circuitos_rust,
            circuitos::obtener_circuito_por_id_rust,
            circuitos::eliminar_circuito_rust,
            // --- NUEVOS COMANDOS DE CONGREGACIONES ---
            congregaciones::obtener_congregaciones_rust,
            congregaciones::guardar_congregacion_rust,
            congregaciones::eliminar_congregacion_rust,
            // --- NUEVOS COMANDOS DE PERSONAS ---
            personas::obtener_personas_por_circuito_rust,
            personas::guardar_persona_rust,
            personas::eliminar_persona_rust,
            // --- NUEVOS COMANDOS DEL HISTORIAL ---
            historial::obtener_historial_rust,
            historial::guardar_historial_rust,
            historial::eliminar_historial_rust,
            historial::obtener_totales_circuito_recientes_rust, // <-- AÑADIR
            historial::obtener_desglose_ultimas_visitas_rust,   // <-- AÑADIR
            
            drive::login_google_drive,

            generar_nombre_respaldo,
            verificar_archivo_pendiente,
            hay_archivo_pendiente,

            restaurar_bd,
            crear_respaldo_bd,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

