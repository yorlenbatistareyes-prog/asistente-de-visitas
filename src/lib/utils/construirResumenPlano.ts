// src/lib/utils/construirResumenPlano.ts

export interface RegistroCongregacion {
  fechaVisita: string;
  opinionGeneral: string;

  ministerioAnalisis: string;
  ministerioDias: string[];
  territorioAnalisis: string;
  precursorAnalisis: string;

  ministerio: string;
  territorio: string;
  atencionTerritorio: string;
  precursoresMetas: string;
  reuniones: string;
  pastoreo: string;
  crecimiento: string;
  superServicio: string;
  publicaciones: string;
  metas: string;
  cuerpoAncianos: string;
  local: string;
  miscelaneos: string;
  irregulares: string;
  potencial: string;
  analisisPrecursores: string;
  contabilidad: string;
  seguimiento: string;
}

export function construirResumenPlano(registro: RegistroCongregacion): string {
  return `
FECHA DE VISITA:
${registro.fechaVisita || ""}

1. OPINIÓN DE LOS ANCIANOS
${registro.opinionGeneral || ""}

2. MINISTERIO CRISTIANO
${registro.ministerio || ""}
- Análisis Ministerio:
${registro.ministerioAnalisis || ""}
- Días:
${(registro.ministerioDias || []).join(", ") || ""}

3. CASA EN CASA
${registro.territorio || ""}
- Análisis Territorio:
${registro.territorioAnalisis || ""}

4. ATENCIÓN AL TERRITORIO
${registro.atencionTerritorio || ""}

5. SERVICIO DE PRECURSOR
${registro.precursoresMetas || ""}
- Análisis Precursores:
${registro.precursorAnalisis || ""}

6. REUNIONES
${registro.reuniones || ""}

7. PASTOREO
${registro.pastoreo || ""}

8. CRECIMIENTO
${registro.crecimiento || ""}

9. SUPERINTENDENTE DE SERVICIO
${registro.superServicio || ""}

10. PUBLICACIONES
${registro.publicaciones || ""}

11. METAS ESPIRITUALES
${registro.metas || ""}

12. CUERPO DE ANCIANOS
${registro.cuerpoAncianos || ""}

13. LOCAL
${registro.local || ""}

14. MISCELÁNEOS
${registro.miscelaneos || ""}

15. IRREGULARES
${registro.irregulares || ""}

16. POTENCIAL
${registro.potencial || ""}

17. ACTIVIDAD PRECURSORES
${registro.analisisPrecursores || ""}

18. CONTABILIDAD
${registro.contabilidad || ""}

19. SEGUIMIENTO
${registro.seguimiento || ""}
`.trim();
}