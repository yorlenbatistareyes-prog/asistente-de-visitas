import type { TDocumentDefinitions } from 'pdfmake/interfaces';

// Cache global para el motor y la bandera de fuentes
let pdfMakeInstance: any = null;
let fontsInjected = false;

async function getPdfMake() {
    if (pdfMakeInstance) return pdfMakeInstance;

    // Importación dinámica (Vite la maneja bien)
    const pdfMakeModule = await import('pdfmake/build/pdfmake');
    const pdfFontsModule = await import('pdfmake/build/vfs_fonts');

    const pdfMake = (pdfMakeModule as any).default || pdfMakeModule;
    const pdfFonts = (pdfFontsModule as any).default || pdfFontsModule;

    // Inyectar las fuentes solo una vez
    if (!fontsInjected) {
        // Usamos 'as any' para evitar errores de tipo
        const vfs = (pdfFonts as any).pdfMake ? (pdfFonts as any).pdfMake.vfs : ((pdfFonts as any).vfs || pdfFonts);
        (pdfMake as any).vfs = vfs;
        fontsInjected = true;
    }

    pdfMakeInstance = pdfMake;
    return pdfMake;
}

export async function createPdf(docDefinition: TDocumentDefinitions): Promise<Uint8Array> {
    const pdfMake = await getPdfMake();

    return new Promise((resolve, reject) => {
        try {
            const pdfDoc = pdfMake.createPdf(docDefinition);
            // getBlob con callback (versión 0.3.x)
            (pdfDoc as any).getBlob(async (blob: Blob) => {
                if (!blob) {
                    reject(new Error('No se generó el PDF'));
                    return;
                }
                const arrayBuffer = await blob.arrayBuffer();
                resolve(new Uint8Array(arrayBuffer));
            });
        } catch (error) {
            reject(error);
        }
    });
}