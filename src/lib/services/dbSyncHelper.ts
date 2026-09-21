import { initDB } from '$lib/services/db';

export async function prepararDatosParaSubir() {
  try {
    const db = await initDB();
    
    const circuitos = await db.select('SELECT * FROM circuitos');
    const congregaciones = await db.select('SELECT * FROM congregaciones');
    const personas = await db.select('SELECT * FROM personas');
    const historial = await db.select('SELECT * FROM historial_visitas');
    const borradores = await db.select("SELECT * FROM configuracion WHERE clave LIKE 'borrador_%'");
    
    // NUEVO: Rescatamos las tablas del módulo de visitas
    const rutas = await db.select('SELECT * FROM rutas');
    const visitas_programadas = await db.select('SELECT * FROM visitas_programadas');
    const analisis_visitas = await db.select('SELECT * FROM analisis_visitas');
    const revision_visitas = await db.select('SELECT * FROM revision_visitas');

    const paqueteRespaldo = {
      version_respaldo: 1, 
      fecha_creacion: new Date().toISOString(),
      tablas: {
        circuitos: circuitos || [],
        congregaciones: congregaciones || [],
        personas: personas || [],
        historial_visitas: historial || [],
        rutas: rutas || [],
        visitas_programadas: visitas_programadas || [],
        analisis_visitas: analisis_visitas || [],
        revision_visitas: revision_visitas || [],
        borradores: borradores || [] 
      }
    };

    return paqueteRespaldo;

  } catch (error) {
    console.error("Error empaquetando la base de datos:", error);
    throw new Error("No se pudo leer la base de datos para el respaldo.");
  }
}

export async function restaurarDatosDeDescarga(jsonData: any) {
  try {
    const db = await initDB();

    // 🛡️ ACTIVAR SEMÁFORO: Bloquea el radar durante toda la restauración
    const { iniciarRestauracion, terminarRestauracion } = await import('$lib/services/db');
    iniciarRestauracion();

    if (!jsonData || !jsonData.tablas) {
      throw new Error("El archivo de respaldo está corrupto o vacío.");
    }

    if (!jsonData || !jsonData.tablas) {
      throw new Error("El archivo de respaldo está corrupto o vacío.");
    }

    const { 
      circuitos, congregaciones, personas, historial_visitas, 
      rutas, visitas_programadas, analisis_visitas, revision_visitas, 
      borradores 
    } = jsonData.tablas;

    // BORRADO EN ORDEN INVERSO (Hijos primero, luego Padres)
    await db.execute('DELETE FROM revision_visitas');
    await db.execute('DELETE FROM analisis_visitas');
    await db.execute('DELETE FROM visitas_programadas');
    await db.execute('DELETE FROM rutas');
    await db.execute('DELETE FROM historial_visitas');
    await db.execute('DELETE FROM personas');
    await db.execute('DELETE FROM congregaciones');
    await db.execute('DELETE FROM circuitos');
    await db.execute("DELETE FROM configuracion WHERE clave LIKE 'borrador_%'"); 

    const insertarDinamico = async (nombreTabla: string, datos: any[]) => {
      if (!datos || datos.length === 0) return;
      
      for (const fila of datos) {
        const columnas = Object.keys(fila).map(k => `"${k}"`).join(', ');
        const comodines = Object.keys(fila).map((_, i) => `$${i + 1}`).join(', ');
        const valores = Object.values(fila);

        await db.execute(
          `INSERT INTO ${nombreTabla} (${columnas}) VALUES (${comodines})`, 
          valores
        );
      }
    };

    // RESTAURACIÓN EN ORDEN (Padres primero, luego Hijos)
    await insertarDinamico('circuitos', circuitos);
    await insertarDinamico('congregaciones', congregaciones);
    await insertarDinamico('personas', personas);
    await insertarDinamico('historial_visitas', historial_visitas);
    await insertarDinamico('rutas', rutas);
    await insertarDinamico('visitas_programadas', visitas_programadas);
    await insertarDinamico('analisis_visitas', analisis_visitas);
    await insertarDinamico('revision_visitas', revision_visitas);
    if (borradores) await insertarDinamico('configuracion', borradores);

     // 🛡️ DESACTIVAR SEMÁFORO: Reactivamos el radar tras un pequeño delay
    setTimeout(() => terminarRestauracion(), 3000);

    return true; 

  } catch (error) {
    console.error("Error restaurando la base de datos:", error);
    throw new Error("No se pudo restaurar el respaldo en el dispositivo.");
  }
}