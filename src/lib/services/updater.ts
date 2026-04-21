import { invoke } from '@tauri-apps/api/core';
import { getVersion } from '@tauri-apps/api/app';
import { openUrl } from '@tauri-apps/plugin-opener';

export async function verificarActualizacion() {
  const APP_ID = "avisits"; 

  try {
    // 1. Le pedimos a Rust que vaya al servidor a buscar el texto
    const jsonString = await invoke<string>('verificar_actualizacion_rust');
    
    // 2. Convertimos el texto que nos trajo Rust en un objeto de JavaScript
    const datos = JSON.parse(jsonString);
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
    // Si Rust falla, ahora sí nos dirá EXACTAMENTE por qué.
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
  try {
    await openUrl(url);
  } catch (error) {
    alert(`❌ Tauri bloqueó el navegador.\nMotivo: ${error}`);
  }
}