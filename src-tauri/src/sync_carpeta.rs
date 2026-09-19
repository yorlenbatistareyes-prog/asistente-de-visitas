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
    
    // Leemos el archivo de tu base de datos
    let db_bytes = fs::read(&db_path).map_err(|e| format!("Error al leer la base de datos local: {}", e))?;

    let key_bytes = general_purpose::STANDARD.decode(llave_base64).map_err(|e| e.to_string())?;
    let key = aes_gcm::Key::<Aes256Gcm>::from_slice(&key_bytes);
    let cipher = Aes256Gcm::new(key);

    let mut nonce_bytes = [0u8; 12];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let cifrado = cipher.encrypt(nonce, db_bytes.as_ref()).map_err(|e| e.to_string())?;

    let mut paquete_completo = nonce_bytes.to_vec();
    paquete_completo.extend_from_slice(&cifrado);

    Ok(general_purpose::STANDARD.encode(paquete_completo))
}

// 2. Descifrar e Importar (Sobrescribir la Base de Datos local)
#[tauri::command]
pub fn importar_db_encriptada_global(paquete_base64: String, llave_base64: String, app_handle: AppHandle) -> Result<(), String> {
    let key_bytes = general_purpose::STANDARD.decode(llave_base64).map_err(|e| e.to_string())?;
    let paquete_bytes = general_purpose::STANDARD.decode(paquete_base64).map_err(|e| e.to_string())?;

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

    // 🌟 EL TRUCO MAESTRO: Hilo en segundo plano para retrasar el reinicio
    // Esto permite devolver el 'Ok' a Svelte para que guarde el localStorage ANTES de morir
    let env = app_handle.env();
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_millis(1500));
        tauri::process::restart(&env);
    });

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