import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';

// Interfaces de TypeScript para evitar la línea roja
interface CustomPdfFonts {
    pdfMake?: { vfs: Record<string, string> };
    vfs?: Record<string, string>;
}
interface PdfDocGenerator {
    getBlob(cb: (blob: Blob) => void): void;
}
interface CustomPdfMake {
    vfs: Record<string, string>;
    createPdf(docDefinition: TDocumentDefinitions): PdfDocGenerator;
}

// Inyección limpia estilo Assembly
const fonts = pdfFonts as unknown as CustomPdfFonts;
const pdf = pdfMake as unknown as CustomPdfMake;
pdf.vfs = fonts.pdfMake ? fonts.pdfMake.vfs : (fonts.vfs || {});

export async function createPdf(docDefinition: TDocumentDefinitions): Promise<Uint8Array> {
    console.log("🔵 Iniciando pdfMake v0.2.10 (Estable)...");

    return new Promise((resolve, reject) => {
        try {
            const pdfDocGenerator = pdf.createPdf(docDefinition);

            // getBlob funciona perfecto en esta versión
            pdfDocGenerator.getBlob(async (blob: Blob) => {
                if (!blob) {
                    reject(new Error("No se generó el archivo"));
                    return;
                }
                const arrayBuffer = await blob.arrayBuffer();
                resolve(new Uint8Array(arrayBuffer));
            });
        } catch (error) {
            console.error("❌ Error en pdfMake:", error);
            reject(error);
        }
    });
}