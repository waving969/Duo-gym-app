# Desarrollo

## Requisitos

- Node.js 24
- Python 3 con Pillow, solo para regenerar iconos y capturas
- Bash, solo para la prueba de la API (en Windows sirve Git Bash)
- Google Chrome, o un navegador compatible indicado en `CHROME_BIN`, solo para la prueba de navegador

## Instalar y arrancar

```bash
npm install
node scripts/make_vapid.mjs
npm run db:migrate:local
npm run dev
```

`make_vapid.mjs` crea las claves de notificaciones: guarda la privada en `.dev.vars`, que no se sube a git, y escribe la pública en `wrangler.toml`. Si ya tienes `.dev.vars` no hace nada.

Las notificaciones y el modo sin conexión solo se activan en la versión compilada. Para probarlos:

```bash
npm run build
npx vite preview --port 5173
```

## Cuentas

No hay registro público. Para crear una invitación en local:

```bash
npm run invite
```

Para tener dos cuentas ficticias con un mes de datos, con la app en marcha y la base local vacía:

```bash
npm run demo:seed
```

Crea `alex` (contraseña `demo-local-123`) y `sam` (`demo-local-456`). Solo existen en tu base local.

## Pruebas

```bash
npm run typecheck
npm test
```

`npm test` prueba los cálculos y el cifrado de notificaciones, incluido el vector de ejemplo del RFC 8291.

### Prueba de la API

Necesita una base local recién creada y la app en marcha. Las dos primeras cuentas que crea quedan vinculadas como pareja.

```bash
rm -rf .wrangler
npm run db:migrate:local
npm run dev
```

En otra terminal:

```bash
npm run test:api
```

Comprueba la sesión, el aislamiento entre cuentas, los permisos de privacidad, los mensajes, los entrenos y las validaciones.

### Prueba de navegador

Recorre la versión compilada a tamaño móvil con dos cuentas, incluido cortar la red a mitad de un entreno y reabrir la app sin conexión.

```bash
rm -rf .wrangler
npm run db:migrate:local
npm run build
npx vite preview --port 5173
```

En otra terminal:

```bash
npm run demo:seed
npm run test:browser
```

Las capturas quedan en `.capturas/`. Para actualizar las de la documentación:

```bash
COLOR_SCHEME=dark npm run test:browser
python scripts/make_portada.py
```

Esta prueba usa las cuentas de `demo:seed` y modifica sus datos: para repetirla, vuelve a empezar con la base limpia.

## Publicar tu propia copia

Necesitas una cuenta gratuita de [Cloudflare](https://dash.cloudflare.com/sign-up).

1. Inicia sesión y crea la base de datos:

   ```bash
   npx wrangler login
   npx wrangler d1 create duo-gym
   ```

2. Pon el `database_id` que te devuelve en `wrangler.toml`.

3. Si no tienes claves propias, borra `.dev.vars` si existe y genéralas. Usa siempre las tuyas, nunca las de otra copia:

   ```bash
   node scripts/make_vapid.mjs
   ```

4. Aplica las migraciones, sube la clave privada y publica:

   ```bash
   npm run db:migrate:remote
   node scripts/make_vapid.mjs --print-private | npx wrangler secret put VAPID_PRIVATE_KEY
   npm run deploy
   ```

5. Crea una invitación para cada persona. Las dos primeras cuentas se vinculan solas:

   ```bash
   npm run invite -- https://TU-APP.workers.dev
   ```

No cambies las claves VAPID una vez publicada la app, porque dejarían de funcionar las notificaciones ya activadas.

## Regenerar los avatares

```bash
python scripts/make_avatars.py
```

Descarga las imágenes de Fluent Emoji y las deja en `public/avatares/`. Para añadir uno, añádelo también a `shared/avatars.ts`; un test comprueba que ambas listas coincidan.

## Regenerar el catálogo de ejercicios

```bash
python scripts/build_exercises.py data/free-exercise-db.json data/exercise_ids_order.txt
```

Une los datos originales con las traducciones de `data/exercise_names_es.txt` y escribe `public/exercises.json`. La traducción va por posición: su línea número N corresponde a la línea N de `exercise_ids_order.txt`.
