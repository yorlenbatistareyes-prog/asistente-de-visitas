use serde::{Deserialize, Serialize};
use std::process::Command; // <--- NUEVO: Necesario para abrir Word/Excel

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

// NUEVA FUNCIÓN: Abre archivos saltándose la seguridad estricta de Tauri
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
    // CORRECCIÓN: Agregamos 'date' al mensaje para que Rust vea que se usa
    println!("AGENDA: {} - Fecha: {}", title, date);
    "OK".to_string()
}

#[tauri::command]
fn save_document_record(name: String, path: String, doc_type: String, _size: String, _date: String) -> String {
    // CORRECCIÓN: Agregamos 'doc_type' y 'path' al mensaje
    println!("DOC: {} (Tipo: {}) guardado en: {}", name, doc_type, path);
    "OK".to_string()
}

// --- 3. MAIN ---
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // --- PLUGINS: Mantenemos TODOS para que los PDF y la BD sigan funcionando ---
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())     // Vital para leer PDFs
        .plugin(tauri_plugin_dialog::init()) // Vital para importar
        .plugin(tauri_plugin_opener::init()) // Lo dejamos por si acaso
        // --------------------------------------------------------------------------

        .invoke_handler(tauri::generate_handler![
            greet,
            get_personal_agenda,
            add_personal_task,
            save_document_record,
            abrir_archivo_nativo // <--- Agregamos la nueva a la lista
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}