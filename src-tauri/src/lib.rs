// 1. DECLARAMOS LOS MÓDULOS DE NUESTRA ARQUITECTURA LIMPIA
pub mod circuitos;
pub mod configuracion;
pub mod congregaciones;
pub mod database;
pub mod drive;
pub mod historial;
pub mod personas;
pub mod rutas;
pub mod visitas;
pub mod analisis;
pub mod revision;
pub mod reportes;
pub mod sync_carpeta;
pub mod programa_visita;

use serde::{Deserialize, Serialize};
use std::process::Command; // Necesario para abrir Word/Excel
use tauri::Manager; // <--- NUEVO: Para buscar las carpetas seguras del sistema (AppData)

use std::sync::{Mutex, OnceLock}; // <-- AÑADIR

use chrono::Local;
use std::env;

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

// FUNCIONES ANTERIORES (Corregidas sin punto y coma en los retornos)
#[tauri::command]
fn greet(name: &str) -> String {
    return format!("Hello, {}! You've been greeted from Rust!", name);
}

#[tauri::command]
fn get_personal_agenda() -> Vec<PersonalTask> {
    return vec![];
}

#[tauri::command]
fn add_personal_task(title: String, date: String, _priority: String) -> String {
    println!("AGENDA: {} - Fecha: {}", title, date);
    "OK".to_string()
}

#[tauri::command]
fn save_document_record(
    name: String,
    path: String,
    doc_type: String,
    _size: String,
    _date: String,
) -> String {
    println!("DOC: {} (Tipo: {}) guardado en: {}", name, doc_type, path);
    "OK".to_string()
}

#[tauri::command]
fn generar_nombre_respaldo() -> String {
    let fecha_hora = Local::now().format("%Y-%m-%d_%I-%M-%p").to_string();

    // Intentamos obtener el nombre (esto funciona bien en Windows)
    let dispositivo = whoami::devicename().unwrap_or("Unknown".to_string());

    // Si estamos en Android, intentamos sacar la marca y el modelo real
    #[cfg(target_os = "android")]
    let dispositivo = if dispositivo == "Unknown" || dispositivo == "Desconocido" {
        // Le pedimos a Android la marca y el modelo real (ej: Samsung_SM-G991B)
        let marca =
            std::env::var("RO_PRODUCT_MANUFACTURER").unwrap_or_else(|_| "Movil".to_string());
        let modelo =
            std::env::var("RO_PRODUCT_MODEL").unwrap_or_else(|_| "Android".to_string());
        format!("{}_{}", marca, modelo)
    } else {
        dispositivo
    };

    return format!("Respaldo_{}_{}.avisits", fecha_hora, dispositivo);
}

#[tauri::command]
fn restaurar_bd(app_handle: tauri::AppHandle, ruta_origen: String) -> Result<(), String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    let db_path = app_data_dir.join("av_database.db");
    let restore_path = app_data_dir.join("av_database_restore.db");
    
    // Copiamos la BD descargada al archivo temporal
    std::fs::copy(&ruta_origen, &restore_path).map_err(|e| format!("Error al copiar: {}", e))?;

    // 👇 EL CAMBIAZO EN VIVO
    let _ = std::fs::remove_file(app_data_dir.join("av_database.db-wal"));
    let _ = std::fs::remove_file(app_data_dir.join("av_database.db-shm"));
    let _ = std::fs::remove_file(&db_path);
    
    std::fs::rename(&restore_path, &db_path).map_err(|e| format!("Error al aplicar la BD en vivo: {}", e))?;

    Ok(())
}

// 🌟 NUEVA FUNCIÓN: CREAR RESPALDO PERFECTO 🌟
#[tauri::command]
fn crear_respaldo_bd(app_handle: tauri::AppHandle, ruta_destino: String) -> Result<(), String> {
    // 1. Buscamos la base de datos original en la carpeta interna de la app
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    let db_path = app_data_dir.join("av_database.db");

    if !db_path.exists() {
        return Err("No se encontró la base de datos para respaldar".to_string());
    }

    // 2. COPIA BINARIA: Leemos el archivo completo y lo escribimos en el destino
    // Esto es mucho más fiable en Android que usar "VACUUM INTO"
    let contenido =
        std::fs::read(&db_path).map_err(|e| format!("Error al leer base de datos: {}", e))?;

    std::fs::write(&ruta_destino, contenido)
        .map_err(|e| format!("Error al escribir el archivo de respaldo: {}", e))?;

    println!("✅ Respaldo completado con éxito en: {}", ruta_destino);
    Ok(())
}

#[tauri::command]
async fn verificar_actualizacion_rust() -> Result<String, String> {
    // Rust hace la petición directamente al servidor. Cero CORS. Cero bloqueos.
    let response = reqwest::get("https://updates.ejvapps.online/api/check/avisits")
        .await
        .map_err(|e| format!("El servidor rechazó la conexión: {}", e))?;

    let texto = response.text().await.map_err(|e| format!("Error leyendo el JSON: {}", e))?;
    Ok(texto)
}

// --- 3. MAIN ---
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_folder_tree::init())
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
                std::fs::rename(&restore_path, &db_path_buf)
                    .expect("No se pudo aplicar la BD restaurada");
            }
            // ----------------------------------------------------------

            // Ahora sí, la convertimos a String y la guardamos globalmente
            let db_path = db_path_buf.to_string_lossy().to_string();
            database::DB_PATH
                .set(db_path)
                .expect("Error guardando ruta global");

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
            verificar_actualizacion_rust,

            // --- COMANDOS DE RUTAS ---
            rutas::obtener_rutas_rust,
            rutas::guardar_ruta_rust,
             rutas::eliminar_ruta_rust,

            // --- COMANDOS DE VISITAS PROGRAMADAS ---
            visitas::obtener_visitas_programadas_rust,
            visitas::guardar_visita_programada_rust,
            visitas::eliminar_visita_programada_rust,
            visitas::obtener_visita_por_id_rust,

            // --- COMANDOS DE ANÁLISIS DE VISITAS ---
            analisis::obtener_analisis_por_visita_rust,
            analisis::guardar_analisis_visita_rust,
            analisis::eliminar_analisis_visita_rust,

            // --- COMANDOS DE REVISIÓN DE VISITAS ---
            revision::obtener_revision_por_visita_rust,
            revision::guardar_revision_visita_rust,
            revision::eliminar_revision_visita_rust,
            revision::obtener_contadores_revision_anterior_rust,

            // --- COMANDOS DE REPORTES / HISTORIAL ---
            reportes::obtener_historial_revisiones_rust,
            reportes::obtener_ultimas_revisiones_por_circuito_rust,

            // --- NUEVOS COMANDOS DE SINCRONIZACIÓN ---
            sync_carpeta::exportar_db_encriptada_global,
            sync_carpeta::importar_db_encriptada_global,
            sync_carpeta::guardar_ruta_sync,
            sync_carpeta::obtener_ruta_sync,
            sync_carpeta::generar_llave_invisible,

            // Aquí irían tus otras funciones...
          programa_visita::obtener_predicacion_rust,
          programa_visita::guardar_predicacion_rust,
          programa_visita::obtener_hospitalidad_rust,
          programa_visita::guardar_hospitalidad_rust,
          programa_visita::obtener_pastoreo_rust,
          programa_visita::guardar_pastoreo_rust,
          programa_visita::obtener_agenda_rust,
          programa_visita::guardar_agenda_rust,
          programa_visita::eliminar_registro_programa_rust

        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
