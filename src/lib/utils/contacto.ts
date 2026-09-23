import { openUrl } from '@tauri-apps/plugin-opener';

// Función para abrir WhatsApp
export async function abrirWhatsApp(telefono: string | null | undefined, mensaje: string = '') {
  if (!telefono) return;
  
  // 1. Extraemos solo los dígitos
  let numLimpio = telefono.replace(/\D/g, '');
  if (!numLimpio) return;

  // 2. Quitamos el '0' inicial si lo tiene
  if (numLimpio.startsWith('0')) {
    numLimpio = numLimpio.substring(1);
  }

  // 3. Aseguramos el prefijo 53 si es un número local de 8 dígitos
  if (!numLimpio.startsWith('53') && numLimpio.length === 8) {
    numLimpio = '53' + numLimpio;
  }

  // 4. Usamos el protocolo nativo de escritorio para abrir directo en la app y en el chat
  const nativeUrl = `whatsapp://send?phone=${numLimpio}${mensaje ? `&text=${encodeURIComponent(mensaje)}` : ''}`;

  try {
    await openUrl(nativeUrl);
  } catch (err) {
    console.error("No se pudo abrir la app nativa de WhatsApp:", err);
    // Fallback a web por seguridad
    const webUrl = `https://wa.me/${numLimpio}${mensaje ? `?text=${encodeURIComponent(mensaje)}` : ''}`;
    await openUrl(webUrl);
  }
}

// Función para abrir el correo web de jwpub.org
export async function abrirCorreoJWPub(email: string | null | undefined, asunto: string = '', cuerpo: string = '') {
  if (!email || !email.trim()) return;
  
  const url = `https://mail.jwpub.org/owa/#path=/mail/action/compose` +
    `&to=${encodeURIComponent(email.trim())}` +
    `&subject=${encodeURIComponent(asunto)}` +
    `&body=${encodeURIComponent(cuerpo)}`;

  try {
    await openUrl(url);
  } catch (e) {
    console.error("Error al abrir jwpub.org:", e);
  }
}