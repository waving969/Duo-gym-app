# Decisiones técnicas

Qué elegí, por qué y qué dejé de lado.

## Plataforma

### Cloudflare Workers y D1 en un solo despliegue

Un solo Worker sirve la web y la API. Al compartir dominio no hace falta CORS y la cookie de sesión puede ser `SameSite=Lax`. El plan gratuito sobra para dos personas.

**A cambio:** dependo de la plataforma de Cloudflare, y D1 tiene límites diarios de filas.

### PWA en lugar de app nativa

Se instala desde el navegador en iPhone y Android con un solo código, sin tiendas ni cuotas de desarrollador.

**A cambio:** no hay acceso a Apple Salud, y en iPhone las notificaciones solo funcionan con la app añadida a la pantalla de inicio.

## Experiencia en el gym

### Lista cerrada de pesos en lugar de teclado

En el gym se usa el móvil con prisa y con las manos ocupadas. Los botones `−` y `+` solo pasan por pesos habituales de cada material: en mancuernas, de 10 a 12 kg; en máquina, de 20 a 25 kg (`shared/training.ts`).

**A cambio:** un peso poco común no se puede apuntar, y las listas pueden no coincidir con todos los gimnasios.

### Un peso por ejercicio, no por serie

Las apps de este tipo suelen pedir peso y repeticiones en cada serie. Para volver a entrenar basta con un toque por ejercicio.

**A cambio:** no se registran pirámides ni series fallidas. Se puede añadir más adelante sin perder los datos existentes.

## Sin conexión

### Cola de envíos propia con operaciones idempotentes

Cada cambio se aplica antes en la pantalla y entra en una cola guardada en `localStorage` (`src/lib/outbox.ts`). Los identificadores se crean en el móvil y un `PUT` envía el recurso completo, así que repetirlo da el mismo resultado. Dos cambios sobre el mismo recurso se agrupan en uno.

**A cambio:** si se edita lo mismo en dos dispositivos, gana el último en enviarse. Para un entreno que hace una sola persona con un solo móvil, resolver conflictos sería complejidad innecesaria.

### Service worker escrito a mano

Son unas 100 líneas con tres estrategias: red primero para la página, caché primero para los archivos con hash y para las imágenes, y red con respaldo en caché para el resto. Nunca guarda nada de `/api`.

**A cambio:** no uso Workbox, así que el mantenimiento es mío. A cambio, el comportamiento es fácil de leer entero.

## Pareja y mensajes

### Consultas periódicas en lugar de WebSockets

Con la conversación abierta se consulta cada 5 segundos. Fuera de ella, avisa la notificación push.

**A cambio:** los mensajes tardan unos segundos y hay peticiones que un WebSocket evitaría. Para dos personas el coste es mínimo y no necesito otra pieza en el servidor.

### Web Push sin librerías

Las librerías habituales dependen de módulos de Node. El cifrado y la firma caben en un archivo con WebCrypto (`worker/lib/push.ts`), y un test lo compara con el ejemplo oficial del RFC 8291.

**A cambio:** el código criptográfico es mío, por eso el test contra el vector oficial es imprescindible.

### Vinculación automática de la pareja

Si al crear una cuenta solo queda otra sin pareja, se vinculan. No hay pantalla de solicitudes porque las cuentas solo se crean por invitación.

**A cambio:** el modelo solo admite parejas, no grupos.

### Privacidad por categorías con el peso corporal oculto

Calendario y entrenos se comparten por defecto porque son el motivo de la app. El peso corporal empieza oculto porque es más sensible: compartirlo debe ser una decisión expresa.

## Datos

### Catálogo como archivo estático

Los 855 ejercicios no cambian, así que son un JSON de 150 KB que el service worker guarda. Se puede buscar sin red y no consume filas de D1.

### Copiar nombre y material en cada rutina y entreno

Los entrenos guardan una copia de los datos del ejercicio. Así el historial no cambia aunque se borre un ejercicio propio o cambie el catálogo.

### Avatares como imágenes propias, no emojis del sistema

Un emoji se ve distinto en cada móvil. Fluent Emoji da el mismo aspecto en todos, y 32 imágenes WebP ocupan unos 180 KB servidas desde la propia app. El servidor solo guarda el identificador y lo valida contra la lista.

### Pesos como enteros en gramos

`72,4 kg` se guarda como `72400`, para evitar errores de redondeo con decimales.

### Imágenes enlazadas, no copiadas

Unas 1.700 imágenes inflarían el repositorio y cada despliegue, así que se cargan desde el repositorio original y se guardan en el móvil al verlas.

**A cambio:** dependen de un servicio externo, y una imagen no vista antes no carga sin cobertura.

## Problemas reales que aparecieron

Todos los encontraron las pruebas automáticas con el modo sin conexión.

### Los datos guardados se borraban al instante

Configuré `gcTime` en 30 días para la caché de TanStack Query. Son 2.592.000.000 ms, más que el máximo de `setTimeout` (2.147.483.647 ms, unos 24,8 días). El temporizador se disparaba de inmediato y borraba los datos recién restaurados. **Solución:** `gcTime: Infinity`, con la caducidad a cargo del guardado en `localStorage`.

### Un fallo de red hacía olvidar los datos

Solo se guardaban las consultas con estado `success`. Una consulta fallida por falta de red pasa a `error` aunque conserve sus datos, y dejaba de guardarse justo cuando más falta hacía. **Solución:** guardar toda consulta que tenga datos.

### Cerrar sesión no volvía al login

`queryClient.clear()` elimina las consultas sin avisar a los componentes que las observan, así que la pantalla no se enteraba del cierre. **Solución:** poner primero la sesión a `null` y borrar después el resto de consultas.
