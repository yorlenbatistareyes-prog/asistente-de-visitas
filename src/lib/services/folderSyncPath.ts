import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { readTextFile, stat, writeTextFile } from '@tauri-apps/plugin-fs';

const NOMBRE_ARCHIVO_SYNC = 'sincronizacion_global.avisits';
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
    return { content: atob(result.content), modifiedAt: result.modifiedAt };
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
