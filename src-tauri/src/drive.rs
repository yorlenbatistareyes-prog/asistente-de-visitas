use google_drive3::oauth2::{
    read_application_secret, InstalledFlowAuthenticator, InstalledFlowReturnMethod,
};

// Este es el comando que llamaremos desde tu interfaz (con TypeScript)
#[tauri::command]
pub async fn login_google_drive() -> Result<String, String> {
    // 1. Leer las llaves que descargaste desde Google Cloud
    let secret = read_application_secret("credentials.json")
        .await
        .map_err(|e| format!("Error leyendo credentials.json: {}", e))?;

    // 2. Configurar el motor de inicio de sesión
    let auth = InstalledFlowAuthenticator::builder(
        secret,
        // Esto abre el navegador y luego redirige de vuelta a la app
        InstalledFlowReturnMethod::HTTPRedirect,
    )
    .persist_tokens_to_disk("drive_token.json") // Guarda la sesión localmente
    .build()
    .await
    .map_err(|e| format!("Error creando el autenticador: {}", e))?;

    // 3. ¡LA PARTE QUE FALTABA! Pedir el token para disparar el navegador
    let scopes = &["https://www.googleapis.com/auth/drive.file"];

    match auth.token(scopes).await {
        Ok(_token) => {
            // Si el usuario acepta en el navegador, guardamos el token y enviamos éxito
            Ok("¡Inicio de sesión en Google configurado con éxito!".to_string())
        }
        Err(e) => {
            // Si el usuario cancela o hay un error
            Err(format!("Error al autorizar con Google: {}", e))
        }
    }
}
