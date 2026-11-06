-- Qué comparte cada uno con su pareja. El peso corporal empieza oculto: lo activa quien quiera.
ALTER TABLE users ADD COLUMN share_calendar INTEGER NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN share_workouts INTEGER NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN share_weight INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN routines_seeded INTEGER NOT NULL DEFAULT 0;

-- Una fila en cada sentido: quién es la pareja de quién.
CREATE TABLE partners (
  user_id    TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  partner_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL
);

-- Si ya hay exactamente dos cuentas, son vosotros.
INSERT INTO partners (user_id, partner_id, created_at)
SELECT a.id, b.id, CAST(strftime('%s', 'now') AS INTEGER) * 1000
FROM users a JOIN users b ON a.id <> b.id
WHERE (SELECT COUNT(*) FROM users) = 2;

CREATE TABLE messages (
  id           TEXT PRIMARY KEY,
  sender_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind         TEXT NOT NULL,            -- text | nudge | event
  body         TEXT NOT NULL,
  created_at   INTEGER NOT NULL,
  read_at      INTEGER
);
CREATE INDEX messages_recipient ON messages(recipient_id, read_at);
CREATE INDEX messages_conversation ON messages(sender_id, recipient_id, created_at);

CREATE TABLE push_subscriptions (
  endpoint   TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX push_user ON push_subscriptions(user_id);

CREATE TABLE custom_exercises (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  muscle     TEXT NOT NULL,
  equipment  TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX custom_exercises_user ON custom_exercises(user_id);

CREATE TABLE routines (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  note           TEXT NOT NULL DEFAULT '',
  position       INTEGER NOT NULL,
  cardio_minutes INTEGER NOT NULL DEFAULT 0,
  default_key    TEXT,
  updated_at     INTEGER NOT NULL
);
CREATE INDEX routines_user ON routines(user_id, position);

-- Nombre, músculo y material se copian: así un ejercicio propio borrado no rompe nada.
CREATE TABLE routine_exercises (
  routine_id  TEXT NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  position    INTEGER NOT NULL,
  exercise_id TEXT NOT NULL,
  name        TEXT NOT NULL,
  muscle      TEXT NOT NULL,
  equipment   TEXT NOT NULL,
  sets        INTEGER NOT NULL,
  reps        INTEGER NOT NULL,
  PRIMARY KEY (routine_id, position)
) WITHOUT ROWID;

CREATE TABLE workouts (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date         TEXT NOT NULL,
  routine_id   TEXT,
  routine_name TEXT NOT NULL,
  started_at   INTEGER NOT NULL,
  finished_at  INTEGER,
  updated_at   INTEGER NOT NULL
);
CREATE INDEX workouts_user_date ON workouts(user_id, date);

CREATE TABLE workout_entries (
  workout_id  TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  position    INTEGER NOT NULL,
  exercise_id TEXT NOT NULL,
  name        TEXT NOT NULL,
  muscle      TEXT NOT NULL,
  equipment   TEXT NOT NULL,
  grams       INTEGER,
  sets        INTEGER NOT NULL,
  reps        INTEGER NOT NULL,
  done        INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (workout_id, position)
) WITHOUT ROWID;

CREATE TABLE cardio (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date       TEXT NOT NULL,
  kind       TEXT NOT NULL,
  minutes    INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX cardio_user_date ON cardio(user_id, date);
