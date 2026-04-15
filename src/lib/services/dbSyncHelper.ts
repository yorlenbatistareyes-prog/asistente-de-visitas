// src/lib/services/dbSyncHelper.ts
import { initDB } from '$lib/services/db';

/**
 * EMPAQUETADOR: Extrae todo de la base de datos local y lo convierte en un JSON listo para subir.
 */
export async function prepararDatosParaSubir() {
  try {
    const db = await initDB();
    
    // 1. Leemos TODAS las tablas (Excepto 'configuracion' para no desvincular el dispositivo)
    const circuitos = await db.select('SELECT * FROM circuitos');
    const congregaciones = await db.select('SELECT * FROM congregaciones');
    const personas = await db.select('SELECT * FROM personas');
    const historial = await db.select('SELECT * FROM historial_visitas');
// 👇 NUEVO: Rescatamos SOLO los borradores de la configuración
    const borradores = await db.select("SELECT * FROM configuracion WHERE clave LIKE 'borrador_%'");

    // 2. Armamos el paquete JSON completo
    const paqueteRespaldo = {
      version_respaldo: 1, 
      fecha_creacion: new Date().toISOString(),
      tablas: {
        circuitos: circuitos || [],
        congregaciones: congregaciones || [],
        personas: personas || [],
        historial_visitas: historial || [],
        borradores: borradores || [] // <-- Lo metemos en la maleta
      }
    };

    return paqueteRespaldo;

  } catch (error) {
    console.error("Error empaquetando la base de datos:", error);
    throw new Error("No se pudo leer la base de datos para el respaldo.");
  }
}

/**
 * DESEMPAQUETADOR: Recibe el JSON de la nube y sobreescribe la base de datos local.
 */
export async function restaurarDatosDeDescarga(jsonData: any) {
  try {
    const db = await initDB();

    if (!jsonData || !jsonData.tablas) {
      throw new Error("El archivo de respaldo está corrupto o vacío.");
    }

    // Extraemos las tablas, incluyendo los borradores
    const { circuitos, congregaciones, personas, historial_visitas, borradores } = jsonData.tablas;

    // 2. BORRADO EN ORDEN INVERSO (ZONA CRÍTICA)
    await db.execute('DELETE FROM historial_visitas');
    await db.execute('DELETE FROM personas');
    await db.execute('DELETE FROM congregaciones');
    await db.execute('DELETE FROM circuitos');
    await db.execute("DELETE FROM configuracion WHERE clave LIKE 'borrador_%'"); // <-- Limpiamos borradores viejos

    /// 3. FUNCIÓN: Inserta cualquier tabla dinámicamente con todas sus columnas
    const insertarDinamico = async (nombreTabla: string, datos: any[]) => {
      if (!datos || datos.length === 0) return;
      
      for (const fila of datos) {
        // Envolvemos las columnas en comillas por seguridad
        const columnas = Object.keys(fila).map(k => `"${k}"`).join(', ');
        // Creamos los comodines ($1, $2, $3...)
        const comodines = Object.keys(fila).map((_, i) => `$${i + 1}`).join(', ');
        const valores = Object.values(fila);

        await db.execute(
          `INSERT INTO ${nombreTabla} (${columnas}) VALUES (${comodines})`, 
          valores
        );
      }
    };

    // 4. Restauramos todas las tablas y borradores en 5 simples líneas
    await insertarDinamico('circuitos', circuitos);
    await insertarDinamico('congregaciones', congregaciones);
    await insertarDinamico('personas', personas);
    await insertarDinamico('historial_visitas', historial_visitas);
    if (borradores) await insertarDinamico('configuracion', borradores); // <-- Inyectamos los borradores

    return true; 

  } catch (error) {
    console.error("Error restaurando la base de datos:", error);
    throw new Error("No se pudo restaurar el respaldo en el dispositivo. Revisa la consola.");
  }
}