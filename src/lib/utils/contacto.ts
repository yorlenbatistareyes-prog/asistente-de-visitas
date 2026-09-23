import { openUrl } from '@tauri-apps/plugin-opener';

// Función para abrir WhatsApp
export async function abrirWhatsApp(telefono: string | null | undefined, mensaje: string = '') {
  if (!telefono) return;
  const numeroLimpio = telefono.replace(/\D/g, '');
  if (!numeroLimpio) return;

  // Protocolo nativo para abrir directamente el chat con el número y mensaje
  const nativeUrl = `whatsapp://send?phone=${numeroLimpio}${mensaje ? `&text=${encodeURIComponent(mensaje)}` : ''}`;

  try {
    await openUrl(nativeUrl);
  } catch (e) {
    console.warn("No se pudo abrir la app nativa, intentando con web:", e);
    // Fallback a la versión web si la app nativa presenta algún inconveniente
    const webUrl = `https://wa.me/${numeroLimpio}${mensaje ? `?text=${encodeURIComponent(mensaje)}` : ''}`;
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