-- Cada funcionalidad nueva añade su propia migración numerada; nunca se edita una ya aplicada.

CREATE TABLE users (
  id             TEXT PRIMARY KEY,
  username       TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name   TEXT NOT NULL,
  password_hash  TEXT NOT NULL,
  password_salt  TEXT NOT NULL,
  password_iters INTEGER NOT NULL,
  accent         TEXT NOT NULL DEFAULT 'lima',
  height_cm      INTEGER,
  goal_grams     INTEGER,
  weekly_goal    INTEGER NOT NULL DEFAULT 3,
  created_at     INTEGER NOT NULL
);

-- Solo se guarda el hash del token: una copia de la base de datos no permite entrar.
CREATE TABLE sessions (
  token_hash   TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  expires_at   INTEGER NOT NULL
);
CREATE INDEX sessions_user ON sessions(user_id);

-- No hay registro público: solo se entra con una invitación de un solo uso.
CREATE TABLE invites (
  token_hash TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at    INTEGER
);

CREATE TABLE login_attempts (
  key TEXT NOT NULL,
  at  INTEGER NOT NULL
);
CREATE INDEX login_attempts_key ON login_attempts(key, at);

-- Peso en gramos (entero) para evitar errores de decimales. Un registro por día.
CREATE TABLE weights (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date       TEXT NOT NULL,
  grams      INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, date)
) WITHOUT ROWID;

CREATE TABLE gym_visits (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date       TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, date)
) WITHOUT ROWID;
