# API

Todas las rutas empiezan por `/api` y responden en JSON. Los errores tienen la forma `{ "error": "mensaje" }`.

- **Sesión:** cookie `__Host-sid` (`sid` en local). Salvo las rutas de login e invitación, todas la exigen y responden `401` sin ella.
- **Escritura:** las peticiones que modifican datos deben llevar una cabecera `Origin` del mismo dominio, o responden `403`.
- **Datos propios:** el usuario siempre sale de la sesión, nunca de la petición.

Los tipos están en [`shared/types.ts`](../shared/types.ts).

## Cuenta y sesión

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/auth/login` | Inicia sesión con `username` y `password`. Bloqueo temporal tras varios fallos (`429`) |
| `POST` | `/auth/logout` | Cierra la sesión actual |
| `POST` | `/auth/logout-others` | Cierra las demás sesiones |
| `POST` | `/auth/password` | Cambia la contraseña y cierra las demás sesiones |
| `GET` | `/invite/:token` | Comprueba una invitación |
| `POST` | `/invite/:token` | Crea la cuenta con `displayName`, `username` y `password` |
| `GET` | `/me` | Perfil propio |
| `PATCH` | `/me` | Cambia nombre, color, objetivos y permisos de privacidad |
| `GET` | `/me/export` | Descarga todos los datos propios |

## Peso corporal y calendario

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/weights` | Lista de registros |
| `PUT` | `/weights/:date` | Crea o sustituye el peso de ese día (`{ "kg": 72.4 }`) |
| `DELETE` | `/weights/:date` | Borra el registro |
| `GET` | `/visits` | Días de gym |
| `PUT` | `/visits/:date` | Marca un día |
| `DELETE` | `/visits/:date` | Desmarca un día |

## Rutinas

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/routines` | Lista. La primera vez crea las rutinas de aclimatación |
| `PUT` | `/routines/:id` | Crea o sustituye una rutina con sus ejercicios |
| `DELETE` | `/routines/:id` | Borra una rutina. Los entrenos hechos se conservan |
| `POST` | `/routines/restore-defaults` | Recupera las rutinas por defecto que falten |
| `GET` | `/routines/custom-exercises/all` | Ejercicios propios |
| `PUT` | `/routines/custom-exercises/:id` | Crea o cambia un ejercicio propio |

## Entrenos y cardio

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/workouts` | Entrenos con sus ejercicios |
| `PUT` | `/workouts/:id` | Crea o sustituye un entreno. Es idempotente |
| `DELETE` | `/workouts/:id` | Borra un entreno |
| `GET` | `/cardio` | Registros de cardio |
| `PUT` | `/cardio/:id` | Crea o sustituye un registro |
| `DELETE` | `/cardio/:id` | Borra un registro |

Un entreno con algún ejercicio hecho, o un registro de cardio, marca ese día en el calendario. Al terminar un entreno se avisa a la pareja una sola vez, si la persona comparte sus entrenos.

Ejemplo de `PUT /workouts/:id`:

```json
{
  "date": "2026-11-06",
  "routineId": "6f1c…",
  "routineName": "Pierna y hombro",
  "startedAt": 1793960000000,
  "finishedAt": null,
  "entries": [
    {
      "exerciseId": "Leg_Press",
      "name": "Prensa de piernas",
      "muscle": "piernas",
      "equipment": "maquina",
      "sets": 2,
      "reps": 12,
      "kg": 40,
      "done": true
    }
  ]
}
```

## Pareja y mensajes

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/partner` | Datos de la pareja. Lo no compartido llega como `null`. Sin pareja, responde `null` |
| `GET` | `/messages` | Últimos 100 mensajes. Admite `?before=<ms>` |
| `POST` | `/messages` | Envía un mensaje o toque: `{ "id", "kind": "text" \| "nudge", "body" }` |
| `GET` | `/messages/unread` | Número de mensajes sin leer |
| `POST` | `/messages/read` | Marca todo como leído |

El `id` lo genera el móvil: reenviar un mismo mensaje no lo duplica. Hay un límite por minuto de mensajes y de toques (`429`).

## Notificaciones

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/push/key` | Clave pública VAPID |
| `POST` | `/push/subscribe` | Registra este dispositivo. Solo acepta servicios de push conocidos |
| `POST` | `/push/unsubscribe` | Da de baja este dispositivo |
| `POST` | `/push/test` | Envía una notificación de prueba a los dispositivos propios |
