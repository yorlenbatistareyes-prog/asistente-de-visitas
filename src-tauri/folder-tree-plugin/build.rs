fn main() {
    tauri_plugin::Builder::new(&["pickDirectory", "readSyncFile", "writeSyncFile"])
        .android_path("android")
        .try_build()
        .expect("No se pudo preparar tauri-plugin-folder-tree");
}
