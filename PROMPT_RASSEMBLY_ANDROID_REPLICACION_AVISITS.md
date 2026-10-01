# Prompt para replicar la arquitectura Android de Avisits en RAsembly

## Objetivo

Replica la misma arquitectura y patrón que ya funciona en este proyecto Avisits para que RAsembly compile y funcione en Android con la misma lógica de sincronización y acceso a carpetas compartidas.

No intentes reinventar la solución desde cero ni improvisar con pruebas ciegas. Usa como base la estructura real ya presente en este proyecto y transpórtala a RAsembly sin perder los mismos principios de diseño.

## Base técnica que ya existe en Avisits

El proyecto ya tiene estas piezas clave y debes reutilizar el mismo patrón:

1. Tauri 2 + SvelteKit + Rust + SQLite
2. Arquitectura de aplicación con frontend y backend separado
3. Configuración de compilación para Android en Tauri
4. Plugin nativo Android para selección de carpeta con SAF (Storage Access Framework)
5. Archivo de sincronización fijo dentro de la carpeta seleccionada
6. Lógica de backup/restore de la base de datos
7. Uso de permisos persistentes de carpetas mediante `content://` en Android
8. Separación clara entre la lógica de sincronización y la lógica del negocio

### Evidencias del proyecto actual

- [package.json](package.json): scripts principales, dependencias de Tauri, Vite y Svelte
- [src-tauri/Cargo.toml](src-tauri/Cargo.toml): dependencias Rust y plugins necesarios
- [src-tauri/tauri.conf.json](src-tauri/tauri.conf.json): configuración de Tauri y bundle para Android
- [src-tauri/folder-tree-plugin/src/lib.rs](src-tauri/folder-tree-plugin/src/lib.rs): registro del plugin nativo
- [src-tauri/folder-tree-plugin/build.rs](src-tauri/folder-tree-plugin/build.rs): comandos y Android metadata del plugin
- [src-tauri/folder-tree-plugin/android/build.gradle.kts](src-tauri/folder-tree-plugin/android/build.gradle.kts): dependencia Android y manejo de SAF
- [src-tauri/src/lib.rs](src-tauri/src/lib.rs): lógica de respaldo, restauración y archivos

## Principio fundamental

La solución correcta no es “seleccionar un archivo cada vez”, sino:

- Seleccionar una carpeta raiz compartida
- Guardar esa carpeta como `content://...` persistente
- Trabajar siempre con un archivo fijo dentro de ella
- Usar ese archivo como contenedor de sincronización

En Android, no se debe depender de rutas del sistema tipo `/storage/emulated/0/...` ni de permisos amplios de almacenamiento. Debe usarse SAF y `DocumentFile` + `ContentResolver`.

## Patrón que hay que replicar

### 1) Configuración general

Haz que RAsembly tenga este mismo stack base:

- `@tauri-apps/cli` y `@tauri-apps/api` en frontend
- `@tauri-apps/plugin-fs`, `dialog`, `shell`, `http`, `sql`, `store`
- `@sveltejs/kit` + Svelte + Vite
- `tauri = { version = "2", features = [] }` en Rust
- Dependencias adicionales si se necesitan para backup, JSON, encriptación, SQLite y sincronización

### 2) Configuración de Tauri para Android

Reproduce la configuración equivalente a la de Avisits:

- `identifier` con el bundle real de RAsembly
- `build.beforeBuildCommand` con `pnpm build`
- `build.frontendDist` apuntando a `../dist`
- `bundle.targets` adecuado para Android
- `bundle.icon` con los recursos correctos
- `app.windows` con las dimensiones de la ventana principal
- `security.csp` compatible con la app y con el acceso a APIs externas

### 3) Plugin nativo para carpeta compartida

Crea un plugin local en RAsembly con la misma estructura que este proyecto:

- `src-tauri/folder-tree-plugin/Cargo.toml`
- `src-tauri/folder-tree-plugin/build.rs`
- `src-tauri/folder-tree-plugin/src/lib.rs`
- `src-tauri/folder-tree-plugin/android/build.gradle.kts`
- `src-tauri/folder-tree-plugin/android/src/main/java/.../FolderTreePlugin.kt`
- permisos del plugin

El plugin debe registrar comandos como mínimo:

- `pickDirectory`
- `readSyncFile`
- `writeSyncFile`
- opcionalmente `validateDirectory`

### 4) Comandos del plugin Android

Implementa exactamente este flujo en Kotlin:

- abrir selector de carpeta con `ACTION_OPEN_DOCUMENT_TREE`
- aplicar `FLAG_GRANT_READ_URI_PERMISSION`
- aplicar `FLAG_GRANT_WRITE_URI_PERMISSION`
- aplicar `FLAG_GRANT_PERSISTABLE_URI_PERMISSION`
- aplicar `FLAG_GRANT_PREFIX_URI_PERMISSION`
- persistir la URI con `takePersistableUriPermission`
- devolver la URI `content://...` al frontend

Al leer el archivo:

- convertir la URI a `Uri`
- usar `DocumentFile.fromTreeUri(activity, uri)`
- buscar el archivo `sincronizacion_global.rassembly`
- abrir `ContentResolver.openInputStream`
- leer bytes
- devolver contenido en Base64 para IPC
- devolver metadata `lastModified` si existe
- devolver error claro si la carpeta ya no existe o el permiso fue revocado

Al escribir el archivo:

- recuperar la carpeta seleccionada
- buscar o crear el archivo sincronizado
- decodificar Base64
- `openOutputStream`
- escribir todo el contenido
- cerrar correctamente
- manejar errores de permisos o proveedor de solo lectura

### 5) Archivo fijo dentro de la carpeta

Define una constante global:

- `SYNC_FILE_NAME = "sincronizacion_global.rassembly"`

La carpeta elegida es el directorio base. El archivo se busca o crea dentro de esa carpeta. No se usa una ruta absoluta permanente en Android;
se usa la URI persistente de la carpeta y el archivo es un child dentro de esa carpeta.

### 6) Capa de abstracción del sistema de archivos

Crea un helper unificado como:

- `src/lib/services/folderSyncPath.ts`

Debe exportar:

- `esAndroid()`
- `esUriAndroid(value)`
- `seleccionarRutaCarpeta()`
- `obtenerRutaArchivoSync(path)`
- `leerPaqueteSync(path)`
- `escribirPaqueteSync(path, content)`

Reglas:

- En Android: invocar el plugin `folder-tree`
- En escritorio: abrir un selector de carpeta normal con Tauri dialog
- Si la ruta empieza con `content://`, no convertirla a ruta local
- En Windows, concatenar la carpeta + `sincronizacion_global.rassembly`
- Nunca mezclar una URI Android con rutas normales

### 7) Base de datos y backup

Replica la estrategia que ya funciona en Avisits:

- La base de datos local sigue siendo la fuente de verdad
- No se debe escribir SQLite directamente desde el frontend mientras la BD está abierta
- Los backups deben hacerse de forma consistente
- La restauración debe hacerse de forma atomica
- Deben borrarse archivos temporales y `-wal`, `-shm` solo cuando sea seguro

En Rust, debes implementar:

- backup de DB local a un archivo de destino
- restore de un archivo backup hacia la base de datos activa
- manejo de archivo temporal para restauración en curso
- verificación del archivo y comprobación de tablas esperadas

### 8) Sincronización por carpeta

La lógica de sincronización no debe depender del sistema operativo. Debe tener una capa lógica que haga:

- leer paquete sincronizado
- validar contenido
- comparar hash y metadatos
- detectar conflicto
- decidir si se descarga o se fuerza subida
- guardar estado local de última revisión

No se debe decidir por fecha del sistema únicamente. Debe usarse:

- `updated_at`
- `content_hash`
- `revision_id` o equivalente
- metadatos autenticados del paquete

### 9) Separación de responsabilidades

Haz que RAsembly respete la misma separación que te está mostrando Avisits:

- frontend UI: controls, modals, loading states
- frontend sync service: una lógica específica por método (web/folder)
- backend Rust: acceso a DB, archivos, permisos, backups, restore
- plugin Android: SAF y acceso a carpetas compartidas
- no mezcles web y carpeta en un único store
- no compartas temporizadores, estados, mutex ni claves de cifrado

## Prompt exacto para Gemini

Copia y pega este prompt completo en Gemini:

> Actúa como arquitecto senior de Tauri 2, SvelteKit, Rust, Android y SAF. Necesito replicar en RAsembly la misma arquitectura funcional que ya funciona en Avisits para compilar y sincronizar en Android. 
> 
> Tengo como referencia este proyecto Avisits, que ya demuestra la solución real: Tauri 2 + SvelteKit + Rust + SQLite + plugin nativo Android para carpeta compartida. Debes tomar esa lógica y adaptarla a RAsembly sin perder los principios fundamentales. 
> 
> Objetivo: que RAsembly permita a un usuario seleccionar una carpeta compartida en Android, conservarla mediante SAF como URI persistente `content://`, y dentro de esa carpeta usar un archivo fijo llamado `sincronizacion_global.rassembly` para guardar la copia sincronizada de la app. 
> 
> Requisitos innegociables: 
> 
> 1. Debe usarse Android Storage Access Framework (SAF), no rutas absolutas del sistema. 
> 2. La carpeta seleccionada se guarda como URI persistente y se vuelve a usar entre reinicios. 
> 3. La app debe buscar o crear el archivo `sincronizacion_global.rassembly` dentro de la carpeta elegida. 
> 4. No se debe depender del plugin genérico `dialog` de Tauri como solución principal para Android porque no es fiable para `ACTION_OPEN_DOCUMENT_TREE`. 
> 5. Debe crearse un plugin Tauri nativo Android propio con comandos `pickDirectory`, `readSyncFile`, `writeSyncFile` y opcionalmente `validateDirectory`. 
> 6. La implementación Android debe usar `Intent.ACTION_OPEN_DOCUMENT_TREE`, `FLAG_GRANT_READ_URI_PERMISSION`, `FLAG_GRANT_WRITE_URI_PERMISSION`, `FLAG_GRANT_PERSISTABLE_URI_PERMISSION`, `FLAG_GRANT_PREFIX_URI_PERMISSION`, `takePersistableUriPermission`, `DocumentFile.fromTreeUri`, `ContentResolver`, `openInputStream` y `openOutputStream`. 
> 7. El resultado de `pickDirectory` debe devolver la URI `content://...` al frontend. 
> 8. El backend Rust debe seguir siendo la fuente de verdad local. La BD local sigue siendo SQLite y la sync no debe tocar la DB abierta directamente desde frontend. 
> 9. Debe existir una capa de abstracción TypeScript que oculte la diferencia entre Android y escritorio: `seleccionarRutaCarpeta()`, `obtenerRutaArchivoSync()`, `leerPaqueteSync()`, `escribirPaqueteSync()`. 
> 10. Debe haber una separación clara entre captura de carpeta, serialización del paquete, validación de metadatos, restauración y sincronización. 
> 11. Debe detectar conflictos por `updated_at`, `content_hash`, `revision_id` o metadatos firmados del paquete, no solo por fecha del sistema. 
> 12. La lógica debe tener soporte para recuperar un archivo a través de la carpeta compartida, forzar subida, detectar cambios locales y restaurar versión remota con un protocolo seguro. 
> 13. Los permisos SAF deben validarse al iniciar la app; si la URI ya no es válida, la app debe marcar la carpeta como no disponible y pedir reelección. 
> 14. Debes mantener la estructura modular y limpia, tal como lo hace Avisits: frontend, plugins nativos, backend Rust, base de datos local, servicio de sincronización y helpers de archivo. 
> 
> Estructura recomendada: 
> 
> - `src-tauri/folder-tree-plugin/Cargo.toml` 
> - `src-tauri/folder-tree-plugin/build.rs` 
> - `src-tauri/folder-tree-plugin/src/lib.rs` 
> - `src-tauri/folder-tree-plugin/android/build.gradle.kts` 
> - `src-tauri/folder-tree-plugin/android/src/main/java/com/tuempresa/rassembly/foldertree/FolderTreePlugin.kt` 
> - `src/lib/services/folderSyncPath.ts` 
> - `src/lib/sync/...` si se implementa sincronización por carpeta 
> - ajustes en `src-tauri/Cargo.toml` y `src-tauri/tauri.conf.json` 
> 
> Debes revisar el proyecto Avisits y copiar la lógica real que ya está funcionando, no solo una teoría. Reproduce los patrones de plugin, permisos, base de datos, backup y carpeta compartida para que RAsembly compile en Android como un proyecto Tauri real. 
> 
> Haz el trabajo en pasos, explica cada decisión, y entrega una implementación que se pueda compilar y mantener. 

## Checklist de validación

Antes de dar la solución por buena, valida lo siguiente:

- La app compila en Android con Tauri 2
- El plugin Android se registra correctamente en Rust
- El plugin Android puede abrir el selector de carpetas
- Se persiste la URI `content://`
- Se puede crear/leer el archivo de sincronización dentro de la carpeta
- La app no depende de rutas del sistema para Android
- La base de datos local sigue siendo la fuente de verdad
- La restauración y backup de la DB son atómicos y seguros
- El conflicto se detecta con metadatos y no solo con fecha

## Orden recomendado de implementación

1. Configurar Tauri + Rust + Svelte para RAsembly
2. Crear plugin Android para carpeta compartida
3. Probar `pickDirectory` y devolver la URI persistente
4. Implementar `readSyncFile` y `writeSyncFile`
5. Crear `folderSyncPath.ts` para ocultar Android/escritorio
6. Implementar backup/restore de la base de datos
7. Crear validación de metadatos y detección de conflictos
8. Conectar UI con el flujo de sincronización
9. Probar en Android real

## Resultado esperado

RAsembly debe comportarse como una app Tauri Android con:

- selección de carpeta compartida real
- uso de SAF persistente
- archivo de sincronización fijo
- backup/restore de la base de datos
- archivos en carpeta compartida
- detección y manejo de conflictos
- flujo multiplataforma sin romper la lógica principal

## Nota de estrategia

No intentes resolverlo todo en una sola pasada. Primero haz la capa nativa y la capa de archivos, luego la capa de sincronización, y al final la capa de UI. La solución debe ser modular, mantenible y compilable.
