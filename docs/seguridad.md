# Seguridad y privacidad

La app guarda datos personales de dos personas, como su peso y sus conversaciones. Este documento resume cómo se protegen y qué límites tiene.

## Acceso

- **Sin registro público:** las cuentas solo se crean con una invitación de un solo uso que caduca en 7 días y se genera desde la línea de comandos.
- **Contraseñas:** PBKDF2-SHA256 con 100.000 iteraciones y sal por usuario. Es el máximo que admite Workers; las iteraciones se guardan por usuario para poder subirlas en el futuro.
- **Intentos de login:** bloqueo temporal tras 8 fallos por cuenta e IP, o 40 por IP, en 15 minutos. Si el usuario no existe se hace el mismo cálculo, para no revelar qué usuarios hay.

## Sesión

- Token aleatorio de 256 bits en una cookie `__Host-` con `HttpOnly`, `Secure` y `SameSite=Lax`.
- La base de datos solo guarda su hash SHA-256: una copia de la base no permite entrar.
- Dura 400 días, el máximo que aceptan los navegadores, y se renueva al usar la app.
- Se pueden cerrar las demás sesiones, y cambiar la contraseña también las cierra.
- Un fallo de red no cierra la sesión. Solo lo hace un `401` del servidor.

## Datos y permisos

- El usuario siempre se obtiene de la sesión, y cada consulta filtra por él.
- Lo que una persona no comparte no llega a la otra: el servidor lo devuelve como `null`.
- El peso corporal empieza oculto.
- Cada persona puede descargar todos sus datos.

## Peticiones

- **Otras webs:** las escrituras exigen una cabecera `Origin` del mismo dominio.
- **Datos de entrada:** se validan en el servidor, y las consultas SQL usan siempre parámetros.
- **HTML:** React escapa el contenido de los mensajes.
- **Cabeceras:** CSP restrictiva, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy: no-referrer` y `noindex` ([`public/_headers`](../public/_headers)).
- **Abuso:** límites por minuto de mensajes y toques. Las notificaciones solo se envían a servicios de push conocidos.

## Notificaciones

El contenido se cifra para cada dispositivo (RFC 8291), de modo que el servicio de push no puede leerlo. Al cerrar sesión, el dispositivo se da de baja.

## Claves

La clave privada VAPID es un secreto de Cloudflare y, en local, está en `.dev.vars`, que no se sube a git. `wrangler.toml` contiene la clave pública y el identificador de la base de datos, que no dan acceso por sí solos.

## Límites conocidos

- **Sin cifrado de extremo a extremo:** los mensajes y datos están en claro para quien controle la cuenta de Cloudflare.
- **Datos en el móvil:** la caché y el entreno en curso están en `localStorage` sin cifrar. Se borran al cerrar sesión, pero no están protegidos ante alguien con acceso al dispositivo desbloqueado.
- **Texto en la pantalla de bloqueo:** las notificaciones muestran el contenido del mensaje.
- **Sin recuperar contraseña:** al no pedir correo, recuperarla requiere intervención manual en la base de datos.
- **Sin segundo factor** ni llaves de acceso (passkeys).
- **Imágenes externas:** las de los ejercicios se piden a GitHub, que puede ver la IP y qué imagen se solicita. No se envían cookies ni la dirección de origen.
- **CSP:** permite estilos en línea, porque los necesitan las animaciones.
- **Sin auditoría externa:** es un proyecto personal.
