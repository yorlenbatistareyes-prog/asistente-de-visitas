// src/lib/services/syncService.ts

const BASE_URL = 'https://syncserver.ejvapps.online';
const APP_ID = 'avisits'; 
const SERVER_TOKEN = 'ejv_server_2026'; // Token global obligatorio del servidor

// Función auxiliar para armar las cabeceras requeridas
function obtenerCabeceras(tokenUsuario?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Server-Token': SERVER_TOKEN
  };
  
  if (tokenUsuario) {
    headers['Authorization'] = `Bearer ${tokenUsuario}`;
  }
  return headers;
}

/**
 * Función auxiliar para obtener un nombre de dispositivo básico.
 */
export function obtenerNombreDispositivo(): string {
  if (typeof navigator !== 'undefined') {
    const ua = navigator.userAgent;
    if (ua.includes("Android")) return "Android";
    if (ua.includes("Windows")) return "PC Windows";
    if (ua.includes("Mac OS")) return "MacBook / iMac";
    if (ua.includes("Linux")) return "Linux";
  }
  return "Dispositivo Desconocido";
}

/**
 * 1. SOLICITAR CÓDIGO OTP
 * Se envía el correo electrónico al servidor para recibir un código de 6 dígitos.
 */
export async function solicitarCodigoOtp(email: string) {
  try {
    const response = await fetch(`${BASE_URL}/api/auth/request-code`, {
      method: 'POST',
      headers: obtenerCabeceras(),
      body: JSON.stringify({ email })
    });
    
    if (!response.ok) throw new Error('Error al solicitar el código. Verifica tu correo.');
    return await response.json(); 
  } catch (error) {
    console.error("Error en solicitarCodigoOtp:", error);
    throw error;
  }
}

/**
 * 2. VERIFICAR CÓDIGO Y OBTENER TOKEN
 * Valida el código OTP que ingresó el usuario. Si es correcto, devuelve el Token de acceso.
 */
export async function verificarCodigoOtp(email: string, code: string) {
  try {
    const response = await fetch(`${BASE_URL}/api/auth/verify-code`, {
      method: 'POST',
      headers: obtenerCabeceras(),
      body: JSON.stringify({ email, code })
    });
    
    if (!response.ok) throw new Error('Código incorrecto o expirado.');
    return await response.json(); // Retorna { message, token, user }
  } catch (error) {
    console.error("Error en verificarCodigoOtp:", error);
    throw error;
  }
}

/**
 * 3. CHEQUEAR ESTADO EN LA NUBE (NUEVO)
 * Consulta ligera: Revisa cuándo fue el último respaldo y quién lo hizo sin descargar la BD.
 */
export async function chequearEstadoNube(token: string) {
  try {
    const response = await fetch(`${BASE_URL}/api/backups/${APP_ID}/check`, {
      method: 'GET',
      headers: obtenerCabeceras(token)
    });

    if (response.status === 404) return null; // No hay respaldos previos
    if (!response.ok) throw new Error('Error al chequear el estado en la nube.');
    
    const data = await response.json();
    // Esto debe devolver el objeto con last_synced_at y last_device
    return data.backup; 
  } catch (error) {
    console.error("Error en chequearEstadoNube:", error);
    throw error;
  }
}

/**
 * 4. SUBIR RESPALDO (UPLOAD)
 * Sube los datos enviando dinámicamente el dispositivo y la fecha exacta.
 */
export async function subirRespaldo(token: string, backupData: any, fechaSync?: string) {
  try {
    const dispositivo = obtenerNombreDispositivo();
    // Si no le pasamos una fecha exacta, genera la de este mismo milisegundo
    const fecha = fechaSync || new Date().toISOString(); 

    const response = await fetch(`${BASE_URL}/api/backups/${APP_ID}`, {
      method: 'POST',
      headers: obtenerCabeceras(token),
      body: JSON.stringify({ 
        backup_data: backupData,
        last_device: dispositivo,
        last_synced_at: fecha
      })
    });

    if (!response.ok) throw new Error('No se pudo subir el respaldo.');
    return await response.json();
  } catch (error) {
    console.error("Error en subirRespaldo:", error);
    throw error;
  }
}

/**
 * 5. DESCARGAR RESPALDO (DOWNLOAD)
 * Extrae el último respaldo completo usando el método GET.
 */
export async function descargarRespaldo(token: string) {
  try {
    const response = await fetch(`${BASE_URL}/api/backups/${APP_ID}`, {
      method: 'GET',
      headers: obtenerCabeceras(token)
    });

    if (response.status === 404) throw new Error('No hay respaldos previos en la nube.');
    if (!response.ok) throw new Error('Error al descargar el respaldo.');
    
    return await response.json();
  } catch (error) {
    console.error("Error en descargarRespaldo:", error);
    throw error;
  }
}