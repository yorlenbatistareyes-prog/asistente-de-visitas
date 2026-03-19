// 1. DECLARAMOS LOS MÓDULOS DE NUESTRA ARQUITECTURA LIMPIA
pub mod database;
pub mod configuracion; 
pub mod circuitos;     
pub mod congregaciones;
pub mod personas;
pub mod historial;

use serde::{Deserialize, Serialize};
use std::process::Command; // Necesario para abrir Word/Excel
use tauri::Manager; // <--- NUEVO: Para buscar las carpetas seguras del sistema (AppData)

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
            // CAMBIO AQUÍ: Usamos app_data_dir() para ir a Roaming automáticamente
            // Antes tenías: app_local_data_dir()
            let app_data_dir = app.path().app_data_dir().expect("Error buscando AppData");
            
            std::fs::create_dir_all(&app_data_dir).expect("Error creando carpeta segura");
            
            let db_path = app_data_dir.join("av_database.db").to_string_lossy().to_string();
            
            database::DB_PATH.set(db_path).expect("Error guardando ruta global");
            
            if let Err(e) = database::inicializar_bd() {
                eprintln!("Error crítico en BD: {}", e);
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
            historial::eliminar_historial_rust
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}