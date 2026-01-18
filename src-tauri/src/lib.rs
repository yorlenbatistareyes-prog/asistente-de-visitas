use serde::{Deserialize, Serialize};

// --- 1. ESTRUCTURAS DE DATOS ---

// Para la Agenda
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PersonalTask {
    pub id: i64,
    pub title: String,
    pub date: String,
    pub priority: String,
    pub completed: bool,
}

// Para los Documentos (ESTA FALTABA)
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DocRecord {
    pub id: String,
    pub name: String,
    pub doc_type: String, 
    pub path: String,
    pub date: String,
    pub size: String,
}

// --- 2. COMANDOS (Funciones que llama el Frontend) ---

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// --- Comandos de Agenda ---
#[tauri::command]
fn get_personal_agenda() -> Vec<PersonalTask> {
    // Iniciamos vacío
    vec![]
}

#[tauri::command]
fn add_personal_task(title: String, date: String, priority: String) -> String {
    println!("AGENDA: Guardando tarea '{}' para el {}", title, date);
    // Aquí iría tu lógica de base de datos real
    "OK".to_string()
}

// --- Comando de Documentos (ESTE ERA EL ERROR, FALTABA AQUÍ) ---
#[tauri::command]
fn save_document_record(name: String, path: String, doc_type: String, size: String, date: String) -> String {
    println!("DOCUMENTOS: Guardando -> {} ({}) en: {}", name, doc_type, path);
    // Aquí conectarás la Base de Datos SQLite luego
    "OK".to_string()
}

// --- 3. MAIN (Punto de entrada) ---

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Inicialización de plugins
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build()) 
        
        // REGISTRO DE COMANDOS
        // Es vital que 'save_document_record' esté en esta lista:
        .invoke_handler(tauri::generate_handler![
            greet, 
            get_personal_agenda, 
            add_personal_task,
            save_document_record // <--- ¡AQUÍ ESTÁ LA CORRECCIÓN!
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}