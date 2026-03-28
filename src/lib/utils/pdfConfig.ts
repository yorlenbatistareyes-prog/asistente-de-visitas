import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';

// 1. INYECCIÓN DE FUENTES (Estilo RAssembly estricto)
interface CustomPdfFonts {
    pdfMake?: { vfs: Record<string, string> };
    vfs?: Record<string, string>;
}

interface CustomPdfMake {
    vfs: Record<string, string>;
    createPdf: typeof pdfMake.createPdf;
}

const fonts = pdfFonts as unknown as CustomPdfFonts;
const pdf = pdfMake as unknown as CustomPdfMake;

// 2. EL ESCUDO (Evita que SvelteKit colapse en el servidor)
if (typeof window !== 'undefined') {
    pdf.vfs = fonts.pdfMake ? fonts.pdfMake.vfs : (fonts.vfs || {});
}

// 3. GENERADOR NATIVO (Limpio y moderno)
export async function createPdf(docDefinition: TDocumentDefinitions): Promise<Uint8Array> {
    try {
        const pdfDocGenerator = pdf.createPdf(docDefinition);
        
        const blob = await pdfDocGenerator.getBlob();
        const arrayBuffer = await blob.arrayBuffer();
        
        return new Uint8Array(arrayBuffer);
    } catch (error) {
        console.error("❌ Error interno al generar el PDF:", error);
        throw error; 
    }
}