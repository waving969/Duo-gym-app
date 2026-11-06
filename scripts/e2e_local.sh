#!/usr/bin/env bash
# Prueba de la API en local contra `npm run dev`: login, sesión y aislamiento entre dos cuentas.
# Las contraseñas son de prueba y solo existen en la base de datos local.
set -u
B=http://localhost:5173
O="Origin: $B"
J="content-type: application/json"
T="$(mktemp -d)"
fail=0
check() { # descripción esperado obtenido
  if [ "$2" = "$3" ]; then echo "ok   $1"; else echo "FAIL $1 (esperado $2, obtenido $3)"; fail=1; fi
}
code() { curl -s -o /dev/null -w "%{http_code}" "$@"; }
invite() { npm run -s invite | grep -oE 'invitacion/[^ ]+' | cut -d/ -f2 | tr -d '\r'; }

SUF=$RANDOM
A=$(invite); C=$(invite)
check "invitación válida" 200 "$(code $B/api/invite/$A)"
check "invitación falsa" 404 "$(code $B/api/invite/nope)"

check "sin sesión /me" 401 "$(code $B/api/me)"
check "sin sesión /weights" 401 "$(code $B/api/weights)"

check "crea cuenta A" 200 "$(code -c $T/a -X POST $B/api/invite/$A -H "$O" -H "$J" -d "{\"displayName\":\"Ana\",\"username\":\"ana$SUF\",\"password\":\"prueba-local-1\"}")"
check "invitación ya usada" 404 "$(code -X POST $B/api/invite/$A -H "$O" -H "$J" -d "{\"displayName\":\"X\",\"username\":\"x$SUF\",\"password\":\"prueba-local-1\"}")"
check "crea cuenta B" 200 "$(code -c $T/b -X POST $B/api/invite/$C -H "$O" -H "$J" -d "{\"displayName\":\"Beto\",\"username\":\"beto$SUF\",\"password\":\"prueba-local-2\"}")"

grep -q HttpOnly $T/a || grep -q '#HttpOnly' $T/a; check "cookie HttpOnly" 0 $?
exp=$(awk '/sid/ {print $5}' $T/a); days=$(( (exp - $(date +%s)) / 86400 ))
check "la sesión dura 400 días" 1 "$([ "$days" -ge 399 ] && echo 1 || echo 0)"

check "A guarda peso" 200 "$(code -b $T/a -X PUT $B/api/weights/2026-11-01 -H "$O" -H "$J" -d '{"kg":72.4}')"
check "A marca visita" 200 "$(code -b $T/a -X PUT $B/api/visits/2026-11-02 -H "$O")"
check "A ve su peso" '[{"date":"2026-11-01","kg":72.4}]' "$(curl -s -b $T/a $B/api/weights)"
check "B NO ve el peso de A" '[]' "$(curl -s -b $T/b $B/api/weights)"
check "B NO ve las visitas de A" '[]' "$(curl -s -b $T/b $B/api/visits)"
curl -s -b $T/b -X DELETE $B/api/weights/2026-11-01 -H "$O" >/dev/null
curl -s -b $T/b -X DELETE $B/api/visits/2026-11-02 -H "$O" >/dev/null
check "B NO puede borrar el peso de A" '[{"date":"2026-11-01","kg":72.4}]' "$(curl -s -b $T/a $B/api/weights)"
check "B NO puede borrar la visita de A" '["2026-11-02"]' "$(curl -s -b $T/a $B/api/visits)"
check "la exportación de B no contiene datos de A" 0 "$(curl -s -b $T/b $B/api/me/export | grep -c '72.4')"

# ---------- Pareja, privacidad y mensajes ----------
A_ID=$(curl -s -b $T/a $B/api/me | grep -oE '"id":"[^"]+"' | cut -d'"' -f4)
check "B ve a A como pareja" "Ana" "$(curl -s -b $T/b $B/api/partner | grep -oE '"displayName":"[^"]+"' | cut -d'"' -f4)"
check "B ve el calendario de A" '2026-11-02' "$(curl -s -b $T/b $B/api/partner | grep -oE '"visits":\["[^"]+' | cut -d'"' -f4)"
check "el peso de A está oculto por defecto" 1 "$(curl -s -b $T/b $B/api/partner | grep -c '"weights":null')"
curl -s -o /dev/null -b $T/a -X PATCH $B/api/me -H "$O" -H "$J" -d '{"shareWeight":true}'
check "si A lo activa, B ve su peso" 1 "$(curl -s -b $T/b $B/api/partner | grep -c '72.4')"
curl -s -o /dev/null -b $T/a -X PATCH $B/api/me -H "$O" -H "$J" -d '{"shareWeight":false,"shareCalendar":false,"shareWorkouts":false}'
check "si A oculta todo, B no ve nada" 1 "$(curl -s -b $T/b $B/api/partner | grep -c '"visits":null,"workouts":null,"cardio":null,"weights":null')"
curl -s -o /dev/null -b $T/a -X PATCH $B/api/me -H "$O" -H "$J" -d '{"shareCalendar":true,"shareWorkouts":true}'

D=$(invite)
check "crea una tercera cuenta" 200 "$(code -c $T/d -X POST $B/api/invite/$D -H "$O" -H "$J" -d "{\"displayName\":\"Otro\",\"username\":\"otro$SUF\",\"password\":\"prueba-local-3\"}")"
check "una tercera cuenta no tiene pareja" 'null' "$(curl -s -b $T/d $B/api/partner)"
check "una tercera cuenta no puede escribir mensajes" 404 "$(code -b $T/d -X POST $B/api/messages -H "$O" -H "$J" -d '{"id":"mensaje-tercero-1","kind":"text","body":"hola"}')"

check "A manda un mensaje" 200 "$(code -b $T/a -X POST $B/api/messages -H "$O" -H "$J" -d '{"id":"mensaje-prueba-001","kind":"text","body":"Hola <b>Beto</b>"}')"
check "reenviar el mismo mensaje no lo duplica" 200 "$(code -b $T/a -X POST $B/api/messages -H "$O" -H "$J" -d '{"id":"mensaje-prueba-001","kind":"text","body":"Hola <b>Beto</b>"}')"
check "A da un toque" 200 "$(code -b $T/a -X POST $B/api/messages -H "$O" -H "$J" -d '{"id":"mensaje-prueba-002","kind":"nudge","body":"Vamos"}')"
check "B tiene 2 sin leer" '{"count":2}' "$(curl -s -b $T/b $B/api/messages/unread)"
check "B lee los mensajes de A" 2 "$(curl -s -b $T/b $B/api/messages | grep -o '"fromMe":false' | wc -l | tr -d ' ')"
check "la tercera cuenta no ve mensajes" 404 "$(code -b $T/d $B/api/messages)"
check "nadie puede fingir un aviso automático" 1 "$(curl -s -b $T/a -X POST $B/api/messages -H "$O" -H "$J" -d '{"id":"mensaje-prueba-003","kind":"event","body":"falso"}' >/dev/null; curl -s -b $T/b $B/api/messages | grep -c '"kind":"event"' | grep -c 0)"
curl -s -o /dev/null -b $T/b -X POST $B/api/messages/read -H "$O"
check "al leer se ponen a cero" '{"count":0}' "$(curl -s -b $T/b $B/api/messages/unread)"
nudged=0; for i in 1 2 3 4 5 6; do nudged=$(code -b $T/a -X POST $B/api/messages -H "$O" -H "$J" -d "{\"id\":\"toque-repetido-$i\",\"kind\":\"nudge\",\"body\":\"Vamos\"}"); done
check "los toques tienen un límite" 429 "$nudged"

# ---------- Rutinas y entrenos ----------
check "cada uno recibe 3 rutinas por defecto" 3 "$(curl -s -b $T/a $B/api/routines | grep -oE '"default_key|"isDefault":true' | wc -l | tr -d ' ')"
RID=$(curl -s -b $T/b $B/api/routines | grep -oE '"id":"[^"]+"' | head -1 | cut -d'"' -f4)
check "A no puede editar una rutina de B" 404 "$(code -b $T/a -X PUT $B/api/routines/$RID -H "$O" -H "$J" -d '{"name":"robada","exercises":[]}')"
curl -s -o /dev/null -b $T/a -X DELETE $B/api/routines/$RID -H "$O"
check "A no puede borrar una rutina de B" 3 "$(curl -s -b $T/b $B/api/routines | grep -o '"isDefault":true' | wc -l | tr -d ' ')"
E='{"exerciseId":"Leg_Press","name":"Prensa","muscle":"piernas","equipment":"maquina","sets":2,"reps":12,"kg":40,"done":true}'
W="{\"date\":\"2026-11-03\",\"routineId\":null,\"routineName\":\"Pierna\",\"startedAt\":1,\"finishedAt\":null,\"entries\":[$E]}"
check "A guarda un entreno" 200 "$(code -b $T/a -X PUT $B/api/workouts/entreno-prueba-1 -H "$O" -H "$J" -d "$W")"
check "repetir el envío no lo duplica" 200 "$(code -b $T/a -X PUT $B/api/workouts/entreno-prueba-1 -H "$O" -H "$J" -d "$W")"
check "A tiene un solo entreno" 1 "$(curl -s -b $T/a $B/api/workouts | grep -o '"routineName"' | wc -l | tr -d ' ')"
check "hacer un ejercicio marca el calendario" 1 "$(curl -s -b $T/a $B/api/visits | grep -c '2026-11-03')"
check "guarda el peso exacto" 1 "$(curl -s -b $T/a $B/api/workouts | grep -c '"kg":40')"
check "B no puede tocar el entreno de A" 404 "$(code -b $T/b -X PUT $B/api/workouts/entreno-prueba-1 -H "$O" -H "$J" -d "$W")"
curl -s -o /dev/null -b $T/b -X DELETE $B/api/workouts/entreno-prueba-1 -H "$O"
check "B no puede borrar el entreno de A" 1 "$(curl -s -b $T/a $B/api/workouts | grep -o '"routineName"' | wc -l | tr -d ' ')"
check "B ve el entreno compartido de A" 1 "$(curl -s -b $T/b $B/api/partner | grep -c 'Prensa')"
check "peso imposible rechazado" 400 "$(code -b $T/a -X PUT $B/api/workouts/entreno-prueba-2 -H "$O" -H "$J" -d "{\"date\":\"2026-11-03\",\"routineName\":\"X\",\"startedAt\":1,\"entries\":[{\"exerciseId\":\"a\",\"name\":\"a\",\"muscle\":\"pecho\",\"equipment\":\"maquina\",\"sets\":1,\"reps\":1,\"kg\":99999}]}")"
WF="{\"date\":\"2026-11-03\",\"routineId\":null,\"routineName\":\"Pierna\",\"startedAt\":1,\"finishedAt\":5,\"entries\":[$E]}"
curl -s -o /dev/null -b $T/a -X PUT $B/api/workouts/entreno-prueba-1 -H "$O" -H "$J" -d "$WF"
curl -s -o /dev/null -b $T/a -X PUT $B/api/workouts/entreno-prueba-1 -H "$O" -H "$J" -d "$WF"
check "terminar avisa a la pareja una sola vez" 1 "$(curl -s -b $T/b $B/api/messages | grep -o 'ha terminado' | wc -l | tr -d ' ')"
check "A apunta cardio" 200 "$(code -b $T/a -X PUT $B/api/cardio/cardio-prueba-1 -H "$O" -H "$J" -d '{"date":"2026-11-04","kind":"cinta","minutes":15}')"
check "cardio marca el calendario" 1 "$(curl -s -b $T/a $B/api/visits | grep -c '2026-11-04')"
check "tipo de cardio inventado rechazado" 400 "$(code -b $T/a -X PUT $B/api/cardio/cardio-prueba-2 -H "$O" -H "$J" -d '{"date":"2026-11-04","kind":"nadar","minutes":15}')"
check "B no puede tocar el cardio de A" 404 "$(code -b $T/b -X PUT $B/api/cardio/cardio-prueba-1 -H "$O" -H "$J" -d '{"date":"2026-11-04","kind":"bici","minutes":99}')"
check "la exportación incluye los entrenos" 1 "$(curl -s -b $T/a $B/api/me/export | grep -c 'Prensa')"
check "push: destino falso rechazado" 400 "$(code -b $T/a -X POST $B/api/push/subscribe -H "$O" -H "$J" -d '{"endpoint":"https://malo.example/x","keys":{"p256dh":"a","auth":"b"}}')"

check "otra web no puede escribir" 403 "$(code -b $T/a -X PUT $B/api/visits/2026-11-03 -H 'Origin: https://malo.example')"
check "sin origen no se puede escribir" 403 "$(code -b $T/a -X PUT $B/api/visits/2026-11-03)"
check "fecha futura rechazada" 400 "$(code -b $T/a -X PUT $B/api/visits/2099-01-01 -H "$O")"
check "fecha imposible rechazada" 400 "$(code -b $T/a -X PUT $B/api/visits/2026-02-31 -H "$O")"
check "peso absurdo rechazado" 400 "$(code -b $T/a -X PUT $B/api/weights/2026-11-01 -H "$O" -H "$J" -d '{"kg":9000}')"

check "contraseña mala" 401 "$(code -X POST $B/api/auth/login -H "$O" -H "$J" -d "{\"username\":\"ana$SUF\",\"password\":\"mala-mala\"}")"
check "login correcto" 200 "$(code -c $T/a2 -X POST $B/api/auth/login -H "$O" -H "$J" -d "{\"username\":\"ana$SUF\",\"password\":\"prueba-local-1\"}")"
check "cerrar otras sesiones" 200 "$(code -b $T/a2 -X POST $B/api/auth/logout-others -H "$O")"
check "la primera sesión ya no vale" 401 "$(code -b $T/a $B/api/me)"
check "la actual sigue viva" 200 "$(code -b $T/a2 $B/api/me)"
check "logout" 200 "$(code -b $T/a2 -X POST $B/api/auth/logout -H "$O")"
check "tras logout no entra" 401 "$(code -b $T/a2 $B/api/me)"

last=0
for i in 1 2 3 4 5 6 7 8 9; do
  last=$(code -X POST $B/api/auth/login -H "$O" -H "$J" -d "{\"username\":\"beto$SUF\",\"password\":\"intento-malo-$i\"}")
done
check "bloqueo tras 8 fallos" 429 "$last"

rm -rf "$T"
[ "$fail" = 0 ] && echo "TODO OK" || echo "HAY FALLOS"
