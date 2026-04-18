import { getVersion } from '@tauri-apps/api/app';
import { open } from '@tauri-apps/plugin-shell';

export async function verificarActualizacion() {
  const APP_ID = "avisits"; 
  const URL_API = `https://updates.ejvapps.online/api/check/${APP_ID}`;

  try {
    // Usamos el fetch estándar de la web. 
    // ¡Ahora el muro CORS estará abierto gracias a tu amigo!
    const response = await fetch(URL_API, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      console.error('El servidor respondió con error:', response.status);
      return { hayNueva: false, error: true };
    }
    
    const datos = await response.json();
    const versionActual = await getVersion();

    const esAndroid = /android/i.test(navigator.userAgent);
    const infoPlataforma = esAndroid ? datos.android : datos.windows;

    if (!infoPlataforma) return { hayNueva: false, error: true };

    if (compararVersiones(infoPlataforma.latest_version, versionActual)) {
      return {
        hayNueva: true,
        version: infoPlataforma.latest_version,
        url: `https://updates.ejvapps.online/app/${APP_ID}`,
        notas: datos.release_notes?.es || datos.release_notes?.en || []
      };
    }

  } catch (error) {
    alert(`❌ ERROR DE CONEXIÓN:\n${error}`);
    console.error("Fallo de red:", error);
    return { hayNueva: false, error: true };
  }
  
  return { hayNueva: false };
}

function compararVersiones(vNueva: string, vActual: string): boolean {
  const n = vNueva.split('.').map(Number);
  const a = vActual.split('.').map(Number);
  const longitudMaxima = Math.max(n.length, a.length);
  
  for (let i = 0; i < longitudMaxima; i++) {
    const numN = n[i] || 0;
    const numA = a[i] || 0;
    if (numN > numA) return true;
    if (numN < numA) return false;
  }
  return false;
}

export async function irA_Descarga() {
  const url = "https://updates.ejvapps.online/app/avisits";
  
  // 1. Primero verificamos que el botón sí está respondiendo
  console.log("Intentando abrir el navegador...");
  
  try {
    await open(url);
    console.log("Navegador abierto con éxito");
  } catch (error) {
    // 2. Si Tauri lo bloquea, le obligamos a que nos tire el error en la cara
    alert(`❌ Tauri bloqueó el navegador.\nMotivo exacto: ${error}`);
  }
}