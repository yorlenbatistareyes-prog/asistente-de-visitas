import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { readTextFile, stat, writeTextFile } from '@tauri-apps/plugin-fs';
import { cargarConfig } from '$lib/services/db';

const NOMBRE_ARCHIVO_SYNC = 'sincronizacion_global.avisits';
const NOMBRE_ARCHIVO_CLAVE = 'sincronizacion_global_clave.txt';
const NOMBRE_ARCHIVO_CLAVE_ANTERIOR = 'sincronizacion_global.key';
type AndroidReadResult = { content: string; modifiedAt: number };
type AndroidDirectoryResult = { uri: string };

export function esAndroid(): boolean {
  return typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
}

export function esUriAndroid(ruta: string): boolean {
  return ruta.startsWith('content://');
}

export async function seleccionarRutaCarpeta(): Promise<string | null> {
  if (esAndroid()) {
    const result = await invoke<AndroidDirectoryResult>('plugin:folder-tree|pickDirectory');
    return result.uri;
  }

  return await open({
    directory: true,
    recursive: true,
    multiple: false,
    title: 'Selecciona tu carpeta de Google Drive / OneDrive'
  });
}

export function obtenerRutaArchivoSync(ruta: string): string {
  if (esUriAndroid(ruta)) return ruta;

  const separador = ruta.includes('/') ? '/' : '\\';
  return ruta.endsWith(NOMBRE_ARCHIVO_SYNC)
    ? ruta
    : `${ruta}${separador}${NOMBRE_ARCHIVO_SYNC}`;
}

export async function leerPaqueteSync(ruta: string): Promise<{ content: string; modifiedAt: number }> {
  if (esUriAndroid(ruta)) {
    const result = await invoke<AndroidReadResult>('plugin:folder-tree|readSyncFile', {
      treeUri: ruta
    });
    
    let textoFinal = result.content;
    // 🔥 EL ESCUDO INTELIGENTE:
    // Si Android no nos mandó "AVISITS2:" de frente, significa que viene en Base64, así que lo decodificamos.
    // Si ya trae "AVISITS2:", lo dejamos quieto para que atob() no explote.
    if (!textoFinal.startsWith('AVISITS2:')) {
      textoFinal = atob(textoFinal);
    }
    
    return { content: textoFinal, modifiedAt: result.modifiedAt };
  }

  const archivo = obtenerRutaArchivoSync(ruta);
  const info = await stat(archivo);
  return {
    content: await readTextFile(archivo),
    modifiedAt: info.mtime?.getTime() ?? Date.now()
  };
}

export async function escribirPaqueteSync(ruta: string, content: string): Promise<void> {
  if (esUriAndroid(ruta)) {
    await invoke('plugin:folder-tree|writeSyncFile', {
      treeUri: ruta,
      content: btoa(content)
    });
    return;
  }

  await writeTextFile(obtenerRutaArchivoSync(ruta), content);
}

async function leerArchivoCompartido(ruta: string, nombre: string): Promise<string> {
  if (esUriAndroid(ruta)) {
    const result = await invoke<AndroidReadResult>('plugin:folder-tree|readSyncFile', {
      treeUri: ruta,
      fileName: nombre
    });
    return atob(result.content);
  }

  const separador = ruta.includes('/') ? '/' : '\\';
  return await readTextFile(`${ruta}${separador}${nombre}`);
}

async function escribirArchivoCompartido(ruta: string, nombre: string, content: string): Promise<void> {
  if (esUriAndroid(ruta)) {
    await invoke('plugin:folder-tree|writeSyncFile', {
      treeUri: ruta,
      fileName: nombre,
      content: btoa(content)
    });
    return;
  }

  const separador = ruta.includes('/') ? '/' : '\\';
  await writeTextFile(`${ruta}${separador}${nombre}`, content);
}

export async function obtenerOCrearLlaveCarpeta(ruta: string): Promise<string> {
  try {
    const paquete = await leerPaqueteSync(ruta);
    if (paquete.content.startsWith('AVISITS2:')) {
      const llave = paquete.content.slice('AVISITS2:'.length).split(':', 1)[0];
      if (llave) return llave;
    }
  } catch (_) {
    // Se intenta la clave auxiliar para respaldos antiguos.
  }

  for (const nombre of [NOMBRE_ARCHIVO_CLAVE, NOMBRE_ARCHIVO_CLAVE_ANTERIOR]) {
    try {
      const llaveCompartida = (await leerArchivoCompartido(ruta, nombre)).trim();
      if (llaveCompartida) {
        return llaveCompartida;
      }
    } catch (error) {
      if (nombre === NOMBRE_ARCHIVO_CLAVE_ANTERIOR || !esUriAndroid(ruta)) {
        if (esUriAndroid(ruta)) {
          // 🔥 EL ARREGLO: Usar JSON.stringify para no ver [object Object]
          const detalle = error instanceof Error ? error.message : JSON.stringify(error);
          throw new Error(`No se pudo leer la clave compartida en la carpeta seleccionada: ${detalle}`);
        }
      }
    }
  }

  let llave = await cargarConfig('llave_carpeta_sync');
  if (!llave) {
    llave = await invoke<string>('generar_llave_invisible');
  }

  await escribirArchivoCompartido(ruta, NOMBRE_ARCHIVO_CLAVE, llave);
  return llave;
}
