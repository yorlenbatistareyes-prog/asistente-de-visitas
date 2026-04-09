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

    // 2. Armamos el paquete JSON completo
    const paqueteRespaldo = {
      version_respaldo: 1, 
      fecha_creacion: new Date().toISOString(),
      tablas: {
        circuitos: circuitos || [],
        congregaciones: congregaciones || [],
        personas: personas || [],
        historial_visitas: historial || []
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

    const { circuitos, congregaciones, personas, historial_visitas } = jsonData.tablas;

    // 2. BORRADO EN ORDEN INVERSO (ZONA CRÍTICA)
    // Para evitar errores de llaves foráneas (ON DELETE CASCADE), 
    // primero se borran los "hijos" y luego los "padres".
    await db.execute('DELETE FROM historial_visitas');
    await db.execute('DELETE FROM personas');
    await db.execute('DELETE FROM congregaciones');
    await db.execute('DELETE FROM circuitos');

    // 3. Insertamos los Circuitos (Padres nivel 1)
    if (circuitos && circuitos.length > 0) {
      for (const cir of circuitos) {
        await db.execute(
          'INSERT INTO circuitos (id, nombre, etiquetas, fechaCreacion, fechaInicio, fechaFin) VALUES ($1, $2, $3, $4, $5, $6)',
          [cir.id, cir.nombre, cir.etiquetas, cir.fechaCreacion, cir.fechaInicio, cir.fechaFin]
        );
      }
    }

    // 4. Insertamos las Congregaciones (Hijos de circuito, padres de historial)
    if (congregaciones && congregaciones.length > 0) {
      for (const cong of congregaciones) {
        await db.execute(
          `INSERT INTO congregaciones 
          (id, circuito, nombre, enVisita, ciudad, provincia, pais, idioma, esLenguaSenas, telefono, horaSemana, horaFinSemana, diaSemana, diaFinSemana) 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`, 
          [
            cong.id, cong.circuito, cong.nombre, cong.enVisita, 
            cong.ciudad, cong.provincia, cong.pais, cong.idioma, 
            cong.esLenguaSenas, cong.telefono, cong.horaSemana, 
            cong.horaFinSemana, cong.diaSemana, cong.diaFinSemana
          ]
        );
      }
    }

    // 5. Insertamos las Personas (Hijos de circuito)
    if (personas && personas.length > 0) {
      for (const per of personas) {
        await db.execute(
          `INSERT INTO personas 
          (id, circuito_id, nombre, segundo_nombre, apellidos, privilegio, congregacion, direccion, telefono_celular, telefono_fijo, email) 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            per.id, per.circuito_id, per.nombre, per.segundo_nombre, per.apellidos, 
            per.privilegio, per.congregacion, per.direccion, per.telefono_celular, 
            per.telefono_fijo, per.email
          ]
        );
      }
    }

    // 6. Insertamos el Historial de Visitas (Hijos de congregaciones)
    if (historial_visitas && historial_visitas.length > 0) {
      for (const visita of historial_visitas) {
        await db.execute(
          `INSERT INTO historial_visitas 
          (id, congregacion_id, fecha, tipo, completado, contenido) 
          VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            visita.id, visita.congregacion_id, visita.fecha, 
            visita.tipo, visita.completado, visita.contenido
          ]
        );
      }
    }

    return true; 

  } catch (error) {
    console.error("Error restaurando la base de datos:", error);
    throw new Error("No se pudo restaurar el respaldo en el dispositivo. Revisa la consola.");
  }
}