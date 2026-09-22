use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use base64::{engine::general_purpose, Engine as _};
use rand::RngCore;
use std::fs;
use tauri::{AppHandle, Manager};

// Tu base de datos local
const NOMBRE_DB: &str = "av_database.db"; 

// 1. Exportar y Cifrar toda la Base de Datos
#[tauri::command]
pub fn exportar_db_encriptada_global(llave_base64: String, app_handle: AppHandle) -> Result<String, String> {
    let app_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_dir.join(NOMBRE_DB);
    let snapshot_path = app_dir.join("av_database_export_snapshot.db");
    
    // SQLite puede tener cambios pendientes en -wal; leer el archivo directamente
    // produciría un respaldo incompleto. VACUUM INTO crea una instantánea válida.
    let _ = fs::remove_file(&snapshot_path);
    let conn = rusqlite::Connection::open(&db_path)
        .map_err(|e| format!("Error al abrir la base de datos local: {}", e))?;
    conn.busy_timeout(std::time::Duration::from_secs(5))
        .map_err(|e| format!("Error configurando SQLite: {}", e))?;
    let snapshot_sql = format!(
        "VACUUM INTO '{}'",
        snapshot_path.to_string_lossy().replace('\'', "''")
    );
    conn.execute_batch(&snapshot_sql)
        .map_err(|e| format!("Error creando una copia consistente de la base de datos: {}", e))?;
    drop(conn);

    let db_bytes = fs::read(&snapshot_path)
        .map_err(|e| format!("Error al leer la copia de la base de datos: {}", e))?;
    let _ = fs::remove_file(&snapshot_path);

    let key_bytes = general_purpose::STANDARD.decode(&llave_base64).map_err(|e| e.to_string())?;
    let key = aes_gcm::Key::<Aes256Gcm>::from_slice(&key_bytes);
    let cipher = Aes256Gcm::new(key);

    let mut nonce_bytes = [0u8; 12];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let cifrado = cipher.encrypt(nonce, db_bytes.as_ref()).map_err(|e| e.to_string())?;

    let mut paquete_completo = nonce_bytes.to_vec();
    paquete_completo.extend_from_slice(&cifrado);

    let paquete_base64 = general_purpose::STANDARD.encode(paquete_completo);
    Ok(format!("AVISITS2:{}:{}", llave_base64, paquete_base64))
}

// 2. Descifrar e Importar (Sobrescribir la Base de Datos local)
#[tauri::command]
pub fn importar_db_encriptada_global(
    paquete_base64: String,
    llave_base64: String,
    last_synced_folder: String,
    app_handle: AppHandle,
) -> Result<(), String> {
    let (llave_efectiva, paquete_efectivo) = if let Some(resto) = paquete_base64.strip_prefix("AVISITS2:") {
        let (llave_embebida, paquete) = resto
            .split_once(':')
            .ok_or_else(|| "El archivo de sincronización está corrupto.".to_string())?;
        (llave_embebida, paquete)
    } else {
        (llave_base64.as_str(), paquete_base64.as_str())
    };

    let key_bytes = general_purpose::STANDARD.decode(llave_efectiva).map_err(|e| e.to_string())?;
    let paquete_bytes = general_purpose::STANDARD.decode(paquete_efectivo).map_err(|e| e.to_string())?;

    if paquete_bytes.len() < 12 {
        return Err("El archivo de sincronización está corrupto.".into());
    }

    let key = aes_gcm::Key::<Aes256Gcm>::from_slice(&key_bytes);
    let cipher = Aes256Gcm::new(key);

    let (nonce_bytes, cifrado) = paquete_bytes.split_at(12);
    let nonce = Nonce::from_slice(nonce_bytes);

    let db_bytes = cipher.decrypt(nonce, cifrado).map_err(|_| "Llave incorrecta o archivo modificado.".to_string())?;

    let app_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    
    // Guardamos la nueva BD en el archivo de restauración temporal
    let restore_path = app_dir.join("av_database_restore.db");
    fs::write(&restore_path, db_bytes).map_err(|e| format!("Error al sobrescribir: {}", e))?;

    // La BD restaurada reemplazará a la actual después del reinicio; guarda aquí
    // la marca para que el radar no vuelva a detectar el mismo archivo.
    let conn = rusqlite::Connection::open(&restore_path)
        .map_err(|e| format!("Error al abrir la BD restaurada: {}", e))?;
    conn.execute(
        "CREATE TABLE IF NOT EXISTS configuracion (clave TEXT PRIMARY KEY, valor TEXT)",
        [],
    )
    .map_err(|e| format!("Error al preparar la configuración restaurada: {}", e))?;
    // ... (código anterior)
    conn.execute(
        "INSERT INTO configuracion (clave, valor) VALUES (?1, ?2)
         ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor",
        rusqlite::params!["last_synced_folder", last_synced_folder],
    )
    .map_err(|e| format!("Error al guardar la fecha de sincronización: {}", e))?;

    // 👇 1. Soltamos el archivo temporal para que Windows no lo bloquee
    drop(conn);

    // 👇 2. EL CAMBIAZO EN VIVO
    let db_path = app_dir.join("av_database.db");
    
    // Limpiamos los temporales de SQLite para evitar corrupción
    let _ = std::fs::remove_file(app_dir.join("av_database.db-wal"));
    let _ = std::fs::remove_file(app_dir.join("av_database.db-shm"));
    
    // Eliminamos la BD vieja y renombramos la nueva
    let _ = std::fs::remove_file(&db_path);
    std::fs::rename(&restore_path, &db_path).map_err(|e| format!("Error al aplicar la BD en vivo: {}", e))?;

    Ok(())
}

// 3. Guardar la ruta de la carpeta elegida
#[tauri::command]
pub fn guardar_ruta_sync(ruta: Option<String>, app_handle: AppHandle) -> Result<(), String> {
    let app_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    let config_path = app_dir.join("ruta_sync_avisits.txt");
    
    if let Some(r) = ruta {
        fs::write(config_path, r).map_err(|e| e.to_string())?;
    } else {
        let _ = fs::remove_file(config_path); 
    }
    Ok(())
}

// 4. Leer la ruta guardada
#[tauri::command]
pub fn obtener_ruta_sync(app_handle: AppHandle) -> Result<String, String> {
    let app_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    let config_path = app_dir.join("ruta_sync_avisits.txt");
    
    if config_path.exists() {
        fs::read_to_string(config_path).map_err(|e| e.to_string())
    } else {
        Err("No hay ruta configurada".into())
    }
}

// 5. Generar llave si es la primera vez
#[tauri::command]
pub fn generar_llave_invisible() -> String {
    let mut key = [0u8; 32];
    OsRng.fill_bytes(&mut key);
    general_purpose::STANDARD.encode(key)
}