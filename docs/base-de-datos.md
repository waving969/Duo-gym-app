# Base de datos

Cloudflare D1 (SQLite). El esquema está en [`migrations/`](../migrations): cada cambio es un archivo numerado, y uno ya aplicado no se edita.

```mermaid
erDiagram
    users ||--o{ sessions : tiene
    users ||--o| partners : "su pareja"
    users ||--o{ messages : "envía"
    users ||--o{ push_subscriptions : "sus dispositivos"
    users ||--o{ weights : registra
    users ||--o{ gym_visits : marca
    users ||--o{ custom_exercises : crea
    users ||--o{ routines : tiene
    routines ||--o{ routine_exercises : contiene
    users ||--o{ workouts : hace
    workouts ||--o{ workout_entries : contiene
    users ||--o{ cardio : apunta

    users {
        text id PK
        text username UK
        text password_hash
        int weekly_goal
        int share_calendar
        int share_workouts
        int share_weight
        text avatar
    }
    sessions {
        text token_hash PK
        text user_id FK
        int expires_at
    }
    partners {
        text user_id PK
        text partner_id UK
    }
    messages {
        text id PK
        text sender_id FK
        text recipient_id FK
        text kind
        text body
        int read_at
    }
    routines {
        text id PK
        text user_id FK
        text name
        int cardio_minutes
        text default_key
    }
    routine_exercises {
        text routine_id PK
        int position PK
        text exercise_id
        int sets
        int reps
    }
    workouts {
        text id PK
        text user_id FK
        text date
        text routine_name
        int finished_at
    }
    workout_entries {
        text workout_id PK
        int position PK
        text exercise_id
        int grams
        int done
    }
    cardio {
        text id PK
        text user_id FK
        text date
        text kind
        int minutes
    }
```

El diagrama muestra las columnas principales.

## Tablas

| Tabla | Para qué sirve |
|---|---|
| `users` | Cuenta, objetivos y permisos de privacidad |
| `sessions` | Sesiones abiertas. Guarda el hash del token, nunca el token |
| `invites` | Invitaciones de un solo uso. Guarda solo su hash |
| `login_attempts` | Intentos fallidos, para el bloqueo temporal |
| `partners` | Quién es pareja de quién, con una fila en cada sentido |
| `messages` | Mensajes (`text`), toques (`nudge`) y avisos automáticos (`event`) |
| `push_subscriptions` | Dispositivos con notificaciones activadas |
| `weights` | Peso corporal en gramos, uno por día |
| `gym_visits` | Días de gym |
| `custom_exercises` | Ejercicios creados por cada persona |
| `routines`, `routine_exercises` | Rutinas y sus ejercicios |
| `workouts`, `workout_entries` | Entrenos y lo hecho en cada uno, con el peso en gramos |
| `cardio` | Registros de cardio |

## Criterios

- **Cada fila tiene dueño:** los datos personales llevan `user_id` o cuelgan de una fila que lo lleva, y borrar una cuenta borra sus datos en cascada.
- **Fechas:** los días se guardan como `AAAA-MM-DD` en la hora local de la persona, para que un entreno a las 23:30 no caiga en el día siguiente. Los instantes se guardan en milisegundos.
- **Copias de datos:** `routine_exercises` y `workout_entries` copian nombre, músculo y material del ejercicio, así que el historial no depende del catálogo.
- **Catálogo:** no está en la base de datos, sino en [`public/exercises.json`](../public/exercises.json).
