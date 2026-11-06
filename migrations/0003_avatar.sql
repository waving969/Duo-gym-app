-- Avatar elegido por cada persona (identificador de shared/avatars.ts). Sin elegir, se muestra su inicial.
ALTER TABLE users ADD COLUMN avatar TEXT;
