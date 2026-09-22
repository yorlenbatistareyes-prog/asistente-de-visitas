package com.asistente.visitas.foldertree

import android.app.Activity
import android.content.Intent
import android.net.Uri
import androidx.activity.result.ActivityResult
import androidx.documentfile.provider.DocumentFile
import app.tauri.annotation.ActivityCallback
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import android.util.Base64

@InvokeArg
class FolderArgs {
    lateinit var treeUri: String
    var fileName: String? = null
}

@InvokeArg
class WriteArgs {
    lateinit var treeUri: String
    lateinit var content: String
    var fileName: String? = null
}

@TauriPlugin
class FolderTreePlugin(private val activity: Activity) : Plugin(activity) {
   @Command
    fun pickDirectory(invoke: Invoke) {
        val intent = Intent(Intent.ACTION_OPEN_DOCUMENT_TREE).apply {
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
            addFlags(Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION)
            addFlags(Intent.FLAG_GRANT_PREFIX_URI_PERMISSION)
            
            // Forzar a Android a mostrar proveedores de nube ocultos (como Google Drive)
            putExtra("android.content.extra.SHOW_ADVANCED", true)
            putExtra("android.content.extra.FANCY", true)
            putExtra("android.content.extra.SHOW_FILESIZE", true)
        }
        startActivityForResult(invoke, intent, "directoryResult")
    }

    @ActivityCallback
    fun directoryResult(invoke: Invoke, result: ActivityResult) {
        if (result.resultCode != Activity.RESULT_OK || result.data?.data == null) {
            invoke.reject("Selección de carpeta cancelada")
            return
        }

        val uri = result.data!!.data!!
        val flags = result.data!!.flags and
            (Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
        try {
            activity.contentResolver.takePersistableUriPermission(uri, flags)
        } catch (_: SecurityException) {
            invoke.reject("Android no concedió permiso persistente para la carpeta")
            return
        }
        val result = JSObject()
        result.put("uri", uri.toString())
        invoke.resolve(result)
    }

    @Command
    fun readSyncFile(invoke: Invoke) {
        try {
            val args = invoke.parseArgs(FolderArgs::class.java)
            val fileName = args.fileName ?: "sincronizacion_global.avisits"
            val file = findSyncFile(args.treeUri, fileName)
                ?: throw IllegalStateException("No existe $fileName en la carpeta")
            val bytes = activity.contentResolver.openInputStream(file.uri)?.use { it.readBytes() }
                ?: throw IllegalStateException("No se pudo leer el archivo sincronizado")
            val result = JSObject()
            result.put("content", Base64.encodeToString(bytes, Base64.NO_WRAP))
            result.put("modifiedAt", file.lastModified())
            invoke.resolve(result)
        } catch (error: Exception) {
            invoke.reject(error.message ?: "No se pudo leer la carpeta sincronizada")
        }
    }

    @Command
    fun writeSyncFile(invoke: Invoke) {
        try {
            val args = invoke.parseArgs(WriteArgs::class.java)
            val tree = tree(args.treeUri)
                ?: throw IllegalStateException("La carpeta sincronizada ya no está disponible")
            val fileName = args.fileName ?: "sincronizacion_global.avisits"
            val file = findSyncFile(args.treeUri, fileName)
                ?: tree.createFile("application/octet-stream", fileName)
                ?: throw IllegalStateException("No se pudo crear el archivo sincronizado")
            val bytes = Base64.decode(args.content, Base64.NO_WRAP)
            activity.contentResolver.openOutputStream(file.uri, "wt")?.use { it.write(bytes) }
                ?: throw IllegalStateException("No se pudo escribir en la carpeta sincronizada")
            invoke.resolve()
        } catch (error: Exception) {
            invoke.reject(error.message ?: "No se pudo escribir en la carpeta sincronizada")
        }
    }

    private fun tree(treeUri: String): DocumentFile? =
        DocumentFile.fromTreeUri(activity, Uri.parse(treeUri))

    private fun findSyncFile(treeUri: String, fileName: String? = null): DocumentFile? =
        tree(treeUri)?.findFile(fileName ?: "sincronizacion_global.avisits")
}
