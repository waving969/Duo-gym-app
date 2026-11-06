# Créditos

## Ejercicios: free-exercise-db

El catálogo de ejercicios y sus imágenes proceden de **[free-exercise-db](https://github.com/yuhonas/free-exercise-db)**, de [yuhonas](https://github.com/yuhonas) y sus colaboradores, publicado como dominio público bajo [The Unlicense](../data/free-exercise-db.LICENSE.md). La licencia no exige atribución; la incluyo porque este proyecto no tendría catálogo sin su trabajo.

- **Versión usada:** `dist/exercises.json` de la rama `main`, descargado en noviembre de 2026. Último commit entonces: [`f00c92c`](https://github.com/yuhonas/free-exercise-db/commit/f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5).
- **Copia sin modificar:** [`data/free-exercise-db.json`](../data/free-exercise-db.json).

### Qué cambia este proyecto

El archivo [`public/exercises.json`](../public/exercises.json) se genera con [`scripts/build_exercises.py`](../scripts/build_exercises.py) y:

- Traduce los nombres al español ([`data/exercise_names_es.txt`](../data/exercise_names_es.txt)). La traducción la hice para este proyecto y puede tener imprecisiones.
- Deja fuera la categoría `strongman`: quedan 855 de 876 ejercicios.
- Agrupa los músculos en categorías más simples y traduce los materiales.
- No incluye las instrucciones escritas, que están en inglés.

### Imágenes

Las imágenes no están en este repositorio. La app las carga desde el repositorio original, a través de `raw.githubusercontent.com`, y el service worker guarda las ya vistas. La licencia es la que declara ese repositorio; no he revisado el origen de cada foto por separado.

## Librerías

| Librería | Uso | Licencia |
|---|---|---|
| [React](https://react.dev) | Interfaz | MIT |
| [React Router](https://reactrouter.com) | Navegación | MIT |
| [TanStack Query](https://tanstack.com/query) | Datos, caché y guardado local | MIT |
| [Motion](https://motion.dev) | Animaciones | MIT |
| [Hono](https://hono.dev) | API | MIT |
| [Vite](https://vite.dev) | Compilación | MIT |
| [Wrangler](https://github.com/cloudflare/workers-sdk) | Publicación en Cloudflare | MIT o Apache-2.0 |

Las herramientas de desarrollo y sus versiones exactas están en [`package.json`](../package.json) y `package-lock.json`.

## Fuentes tipográficas

Incluidas con [Fontsource](https://fontsource.org), bajo [SIL Open Font License 1.1](https://openfontlicense.org):

- [Bricolage Grotesque](https://fonts.google.com/specimen/Bricolage+Grotesque)
- [Geist](https://vercel.com/font)

## Especificaciones

- [RFC 8291](https://www.rfc-editor.org/rfc/rfc8291): cifrado de mensajes Web Push
- [RFC 8292](https://www.rfc-editor.org/rfc/rfc8292): identificación VAPID
- [RFC 8188](https://www.rfc-editor.org/rfc/rfc8188): formato de cifrado `aes128gcm`

## Desarrollo asistido

Este proyecto se ha desarrollado con ayuda de [Claude Code](https://claude.com/claude-code), de Anthropic.
