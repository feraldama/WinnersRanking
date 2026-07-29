# Winners Ranking

Sistema de gestión y ranking de jugadores de pádel. API en Express + MySQL (`api/`) y cliente en React + TypeScript + Vite (`client/`).

Arranque local: `api.bat` y `client.bat` (o `pnpm dev` dentro de cada carpeta).

## ⚠️ Son dos proyectos sobre la misma base

| Proyecto | Qué es | Puerto API | Auth |
| --- | --- | --- | --- |
| `WinnersRanking` (este) | Backoffice de administración | 3001 | JWT |
| `WinnersLanding` | Pantalla pública del ranking (TV del club) | 3011 | pública |

**Las dos APIs leen la misma base MySQL (`winners`) y cada una tiene su propia copia del SQL del ranking.** La landing no consume esta API: reimplementa las consultas en [WinnersLanding/api/src/lib/ranking.ts](../WinnersLanding/api/src/lib/ranking.ts).

Consecuencia práctica: **todo cambio en la escala de puntos o en la fórmula del ranking hay que hacerlo en los dos lados y desplegarlos juntos.** Si no, el admin y la pantalla muestran números distintos sobre los mismos partidos. La escala vive en un solo archivo por proyecto justamente para que sea fácil de sincronizar.

---

## Equipos, nueva escala de puntos y racha

Funcionalidad: asignar un equipo a cada jugador, mostrar el equipo en el ranking, agregar un ranking por equipo y mostrar la racha de victorias. Junto con esto cambió la escala de puntos.

### Escala de puntos

Definida como constantes en [api/controllers/ranking.controller.js](api/controllers/ranking.controller.js) y en [WinnersLanding/api/src/lib/ranking.ts](../WinnersLanding/api/src/lib/ranking.ts) — **los dos tienen que coincidir**:

| Concepto            | Puntos | Valor anterior |
| ------------------- | -----: | -------------: |
| Partido ganado      |      3 |            100 |
| Partido perdido     |      1 |             30 |
| Campeón de torneo   |      5 |           1000 |
| Vicecampeón         |      3 |            500 |

Los puntos de torneo se re-escalaron junto con los de partido: con 3/1 por partido, dejar 1000/500 habría hecho que el ranking dependiera casi solo de los torneos.

Los reportes PDF (`api/models/reporte.model.js`) no usan puntos —cuentan victorias— así que no se vieron afectados.

### Racha

Victorias consecutivas contando desde el último partido hacia atrás, cortando en la primera derrota. Es 0 si el último partido decidido fue una derrota. En la UI se muestra con llama a partir de 2 (`🔥3`), como número suelto en 1, y como `–` en 0.

Se calcula en JS y no en SQL a propósito: no necesita window functions, así que no depende de la versión de MySQL. Implementada en las dos APIs (`calcularRachas`).

### Orden y empates

El criterio es `puntos DESC, ganados DESC, partidosJugados DESC, ClienteId ASC`.

El `ClienteId` final no es decorativo. Con la escala vieja (100/30) los puntajes quedaban muy separados; con 3/1 un jugador de 9 partidos tiene entre 9 y 27 puntos, así que **los empates en los tres primeros criterios son habituales**. MySQL no garantiza orden estable para filas empatadas, y como la landing refresca cada 10 segundos, sin ese criterio los jugadores empatados se veían intercambiar posición solos.

### PJ = G + P

`partidosJugados` cuenta sólo los partidos con resultado decidido (`'G'` o `'P'`), de modo que en la tabla siempre se cumple PJ = G + P.

⚠️ Esto **cambió respecto de la versión anterior**, que contaba cualquier resultado no nulo y no vacío. Si en la base hay partidos con otros códigos de resultado, el PJ de esos jugadores baja. Para verificar si aplica:

```sql
SELECT PartidoJugadorResultado, COUNT(*)
FROM PartidoJugador GROUP BY PartidoJugadorResultado;
```

Si solo aparecen `G`, `P`, `NULL` y `''`, el cambio no altera ningún número.

### Modelo de datos

- Tabla `Equipo` (`EquipoId`, `EquipoNombre` único, `EquipoLogo`, `EquipoEstado`).
- `clientes.EquipoId` → FK a `Equipo` con `ON DELETE SET NULL`. Nullable: un jugador puede no tener equipo.
- El logo se guarda como `MEDIUMBLOB` y viaja en base64, igual que `ProductoImagen`: `Buffer.from(base64)` al escribir, `.toString("base64")` al leer.

**El equipo es fijo por jugador, no por competencia.** Consecuencia a tener presente: si un jugador cambia de equipo, los rankings de competencias ya cerradas se recalculan mostrando el equipo nuevo. Si en algún momento hace falta historial por competencia, se migra a una tabla puente `EquipoJugador(EquipoId, ClienteId, CompetenciaId)` sin tocar el resto.

### Endpoints

| Método | Ruta                              | Descripción                             |
| ------ | --------------------------------- | --------------------------------------- |
| CRUD   | `/api/equipos`                    | ABM de equipos (+ `/search`)            |
| GET    | `/api/ranking/global`             | Ranking de jugadores (ahora con G/P y equipo) |
| GET    | `/api/ranking/competencia`        | Ídem, filtrado por fechas de competencia |
| GET    | `/api/ranking/equipos`            | **Nuevo** — ranking por equipo          |
| GET    | `/api/ranking/equipos/competencia`| **Nuevo** — ranking por equipo de una competencia |

Los cuatro endpoints de ranking aceptan `categoria` y `sexo`; los de competencia además requieren `competenciaId`.

### Ranking por equipo

Suma los puntos de los jugadores del equipo **que cumplen los mismos filtros de categoría y sexo** que el ranking individual, y que tienen actividad (partidos o torneos). Ordena por PTS → G → PJ.

Como suma totales, un equipo con más jugadores tiene ventaja estructural. Por eso la tabla incluye la columna **Prom.** (puntos por jugador) al lado de PTS, para poder comparar de forma justa.

Los logos no viajan en la respuesta del ranking: `Dashboard.tsx` trae la lista de equipos **una sola vez** y la pasa por props a las cuatro tablas, que resuelven el logo por `EquipoId`. Mandarlos inline repetiría el mismo blob en cada fila, y que cada tabla los pidiera por su cuenta serían cuatro respuestas idénticas con imágenes.

---

## La landing (`../WinnersLanding`)

Pantalla pública del ranking, API propia en `api/src/` (Express + TypeScript, puerto 3011, sin auth) y cliente Vite en `client/`.

- Prisma está en el repo pero **no se usa** para el ranking: el `schema.prisma` apunta a `sqlserver` y no modela `Equipo`. Las consultas van por `queryAsync` a MySQL. No hay que migrar nada del lado de Prisma.
- El SQL del ranking vive en [api/src/lib/ranking.ts](../WinnersLanding/api/src/lib/ranking.ts) (escala de puntos, subqueries y `calcularRachas`). Antes estaba copiado 5 veces dentro del controlador, y ya se había desincronizado del admin.
- Endpoints de la landing: `/api/rankings/global` y `/api/rankings/competencia` aceptan `categoria`, `sexo` y **`equipoId` opcional** para filtrar por equipo. `/api/equipos` (nuevo) devuelve los equipos activos con jugadores, con el logo en base64.
- La pantalla es una tabla ancha con POS · JUGADOR · EQUIPO (logo) · PJ · G · P · PTS · RACHA, más dos selects: vista (Global / En competencia, arranca en Global) y equipo (arranca en "Todos los equipos"). Rota categoría/sexo cada 10 segundos.
- **La rotación no se detiene al filtrar por equipo**, y cuando la combinación categoría/sexo actual no tiene jugadores de ese equipo se saltea a la siguiente sin esperar los 10 segundos. La landing no tiene selector de categoría, así que pausar la rotación dejaría al que filtra atrapado en una tabla vacía sin forma de salir. Un contador corta el salteo después de recorrer todas las combinaciones, para no girar sin fin si el equipo no tiene jugadores en ninguna.
- **Caché en memoria de 30 segundos** ([api/src/lib/cache.ts](../WinnersLanding/api/src/lib/cache.ts)) sobre las respuestas de ranking y equipos. Es un kiosco: sin caché cada pantalla conectada dispara dos consultas pesadas cada 10 segundos y todas ven lo mismo. El caché es por proceso y no se invalida al cargar un partido desde el admin: el cambio se ve, como máximo, 30 segundos después.

### ⚠️ Tailwind no corre en el build de la landing

`client/src/index.css` es un CSS de **Tailwind v4 ya compilado y commiteado**. Tailwind no está en `package.json` ni en `node_modules`, y el build es `vite build` solo. Es decir: **solo funcionan las clases que ya están en ese archivo**; cualquier clase nueva no existe y no aplica estilo.

Por eso la tabla nueva usa estilos inline para todo lo que no estaba (grid, tamaños, colores de G/P). Está comentado en el propio componente.

El origen real es `client/src/styles/globals.css`, que sí tiene la estructura v4 (`@custom-variant`, `@theme inline`, `@layer base`) pero **no se importa en runtime** — `main.tsx` importa `index.css`. Para volver al pipeline normal habría que instalar `tailwindcss` + `@tailwindcss/vite` y hacer que `index.css` sea `@import "tailwindcss"; @import "./styles/globals.css";`. Queda pendiente: hoy `pnpm add` falla porque `node_modules` está linkeado a un store de pnpm v10 y el pnpm instalado es v11, así que requiere reinstalar todo el árbol de dependencias.

---

## Despliegue a producción

**Los dos proyectos van juntos.** Si subís solo este, la landing sigue mostrando la escala vieja (100/30) sobre los mismos partidos.

### 1. Migración de base de datos — **antes** de subir el código

```bash
mysql -u <usuario> -p <base> < api/migrations/001_equipos.sql
mysql -u <usuario> -p <base> < api/migrations/002_indices_ranking.sql
```

El orden importa. La migración es aditiva y compatible con el código viejo (agrega una tabla y una columna nullable), así que correrla primero es seguro. Al revés no: el código nuevo hace `JOIN` contra `Equipo` y sin la tabla se caen el ranking y el listado de jugadores.

La `002` son índices para las consultas del ranking y de la racha. No es obligatoria para que funcione, pero sí para que rinda: la racha filtra por `ClienteId IN (...)` y ordena por `PartidoFecha` en cada request. Si un índice ya existe, MySQL corta con "Duplicate key name" — es esperable, se ignora y se sigue con el siguiente.

### 2. Permisos del menú

La migración inserta el menú `EQUIPOS`. Falta asignarle permisos al perfil correspondiente desde **Control de Acceso → Perfiles**. Hasta que se haga, la pantalla de Equipos solo la ven los usuarios con `isAdmin = 'S'`.

### 3. Desplegar el admin

```bash
cd api    && pnpm install && pnpm start      # o el proceso/servicio habitual
cd client && pnpm install && pnpm build      # publicar client/dist
```

### 4. Desplegar la landing

```bash
cd ../WinnersLanding/api    && npm install && npm run build && npm start   # compila a dist/
cd ../WinnersLanding/client && pnpm build                                  # publicar client/build
```

La API de la landing corre `dist/`, no los `.ts`: si no se ejecuta el `build`, sigue sirviendo el código viejo con la escala vieja.

### 5. Verificación post-deploy

Admin:

- [ ] El Dashboard carga las cuatro tablas de ranking sin errores en consola.
- [ ] Los puntos reflejan la escala 3/1: un jugador con 7 G y 2 P debe tener `7×3 + 2×1 = 23` pts, más los de torneo si tiene.
- [ ] Crear un equipo con logo y verificar que el logo se muestre en la grilla y en el ranking.
- [ ] Asignar equipo a un jugador y confirmar que aparece en el ranking global.
- [ ] Los jugadores sin equipo siguen apareciendo en el ranking, con "Sin equipo".

Landing:

- [ ] **Los puntos de un mismo jugador coinciden con los del admin.** Es la verificación más importante.
- [ ] `GET /api/equipos` responde y los logos se ven en la columna Equipo.
- [ ] El select de equipo filtra, y al elegir un equipo chico la rotación saltea las categorías vacías hasta encontrar una con jugadores (en vez de quedar en "No hay datos").
- [ ] La racha se ve igual en los dos (`🔥N`).
- [ ] La tabla no desborda a lo ancho en el TV/monitor donde se muestra.
- [ ] Dejar la pantalla un rato con dos jugadores empatados: **no deben intercambiar posición solos** entre refrescos.
- [ ] El caché funciona: dos requests seguidos al mismo ranking deben dar una sola línea de consulta en el log de la API.

### Rollback

Volver el código a la versión anterior alcanza —**en los dos proyectos**: la escala de puntos se calcula en cada consulta, no hay datos derivados persistidos, y `clientes.EquipoId` es ignorado por el código viejo. No hace falta revertir el esquema. Si se quiere revertir igual:

```sql
ALTER TABLE clientes DROP FOREIGN KEY fk_cliente_equipo;
ALTER TABLE clientes DROP COLUMN EquipoId;
DROP TABLE Equipo;
DELETE FROM menu WHERE MenuId = 'EQUIPOS';
```

---

## Pendientes conocidos

- **SQL duplicado entre los dos proyectos.** Es la deuda más importante. Hoy la sincronización es manual y ya falló una vez. La salida limpia sería que la landing consuma esta API (necesitaría endpoints públicos sin JWT) o extraer el SQL a un paquete compartido.
- **Tailwind en la landing** (ver la sección de la landing): el CSS está precompilado y commiteado, así que las clases nuevas no aplican. Bloqueado por el store de pnpm v10 vs v11.
- **Categoría del ranking por equipo.** Los equipos pueden tener jugadores de distintas categorías; el ranking por equipo respeta el filtro de categoría/sexo, así que un mismo equipo aparece en varias categorías con puntajes distintos. Es intencional, pero conviene tenerlo claro al leer las tablas.
- **Columna "Cat." del ranking individual.** Se quitó por ser redundante con el filtro de categoría.
- **Ranking por equipo en la landing.** Solo está en el admin. En la landing hay filtro *por* equipo, no la tabla agregada de equipos.
- **Endpoints legacy de la landing** (`/api/rankings`, `/api/rankings/categoria/:id`, `/api/rankings/top/:limit`): no los usa la pantalla. Les actualicé la escala y unifiqué el SQL, con lo cual `categoria/:id` ahora incluye puntos de torneo (antes solo partidos). Si algo externo los consume, verificar.
- **Código muerto en la landing**: `client/src/components/RankingTable.tsx` y `RankingTable.example.tsx` son una copia vieja de la tabla del admin, nadie los importa y siguen con la escala 100/30. Son una trampa para el próximo que busque "la tabla del ranking".
- **La regla de puntaje premia la asistencia.** Con 3/1, nueve derrotas (9 pts) le ganan a dos victorias y una derrota (7 pts). La propiedad ya existía con 100/30 (270 vs 230), pero con números de dos dígitos nadie la miraba; con números chicos los jugadores la van a ver. Si molesta, las salidas típicas son exigir un mínimo de partidos para entrar al ranking, o desempatar por porcentaje de victorias antes que por PJ. Es una decisión del torneo, no un bug.

---

# Runbook: ejecutar todo en una máquina nueva

Esta sección está escrita para que un agente (Claude Code) la ejecute de punta a punta sin más contexto que este archivo. Seguir los pasos **en orden**; cada uno tiene su verificación.

Nada acá es destructivo salvo el paso 5 (migraciones), que es el único que escribe en la base y el único que hay que confirmar con el usuario antes de correr.

## 0. Datos del entorno

Verificado en la máquina de desarrollo original:

| Cosa | Valor |
| --- | --- |
| Node / npm / pnpm | v24.17.0 / 11.13.0 / 11.16.0 |
| Base de datos | MySQL, base `winners`, host `localhost`, puerto 3306 |
| `WinnersRanking/api` | **pnpm**, puerto 3001 (`PORT` en `.env`; el default del código es 3002) |
| `WinnersRanking/client` | **pnpm**, Vite puerto 3004, build → `dist/`, Tailwind instalado y funcionando |
| `WinnersLanding/api` | **npm** (tiene `package-lock.json`, no pnpm), puerto 3011 |
| `WinnersLanding/client` | **pnpm**, Vite puerto 3010, build → `build/`, **Tailwind NO instalado** |

Los gestores de paquetes **no son intercambiables**: usar el que corresponde a cada carpeta según su lockfile.

## 1. Ubicar los dos proyectos

Los paths van a ser distintos en la máquina nueva. Buscar las dos raíces y usar esas variables en todo lo que sigue:

```powershell
# Ajustar a donde estén realmente
$ADMIN   = "D:\Sistemas\WinnersRanking"
$LANDING = "D:\Sistemas\WinnersLanding"
Test-Path "$ADMIN\api\index.js"; Test-Path "$LANDING\api\src\index.ts"
```

Las dos tienen que dar `True`. **`WinnersLanding` es un repo git separado**, no un subdirectorio de este: si no está, pedirlo antes de seguir — sin él la landing queda con la escala de puntos vieja.

⚠️ `api.bat` y `client.bat` en la raíz del admin apuntan a `C:\WinnersRanking\...`, que no existe en esta máquina. **No usarlos como fuente de verdad de los paths**; están para otra instalación.

## 2. Git

Si `git status` falla con `detected dubious ownership`, es porque los archivos vienen de otro usuario de Windows:

```powershell
git config --global --add safe.directory $ADMIN
git config --global --add safe.directory $LANDING
```

Los mensajes de commit **van en español** (formato `tipo: Descripción`), según `.cursorrules`. No commitear ni pushear sin que el usuario lo pida.

## 3. Archivos `.env` — no vienen en el repo

`.env` está en `.gitignore` en los dos proyectos, así que en la máquina nueva **no existen** y hay que crearlos antes de cualquier otra cosa. Sin ellos las APIs arrancan apuntando a los defaults del código (base `tu_base_de_datos` en el admin, usuario `root`) y nada conecta.

`$ADMIN\api\.env`:

```ini
PORT=3001
DB_HOST=localhost
DB_USER=sa
DB_PASSWORD=<pedir al usuario>
DB_NAME=winners
JWT_SECRET=<pedir al usuario — tiene que ser el mismo de siempre o se invalidan los tokens>
```

`$LANDING\api\.env`:

```ini
PORT=3011
DB_HOST=localhost
DB_USER=sa
DB_PASSWORD=<pedir al usuario>
DB_NAME=winners
CORS_ORIGIN=http://localhost:3010
NODE_ENV=development
```

⚠️ `$LANDING\api\env.example` existe pero **está desactualizado**: dice `PORT=3001` (choca con el admin) y `DB_USER=root`. Los valores reales son los de arriba. El admin no tiene `env.example`.

Si el usuario trae los `.env` de la máquina anterior, usar esos y saltear este paso. Nunca inventar la contraseña ni el `JWT_SECRET`.

## 4. Verificar que MySQL responde y en qué estado está el esquema

Sin esto no se puede validar nada del ranking. Script de solo lectura, se ejecuta desde `$ADMIN\api` para reusar su `.env`:

```powershell
cd "$ADMIN\api"
@'
const db = require("./config/db");
const q = (sql) => new Promise((res, rej) => db.query(sql, (e, r) => (e ? rej(e) : res(r))));
(async () => {
  const [v] = await q("SELECT VERSION() v, DATABASE() d");
  console.log("MySQL", v.v, "| base", v.d);
  console.log("tabla Equipo:", (await q("SHOW TABLES LIKE 'Equipo'")).length > 0);
  console.log("clientes.EquipoId:", (await q("SHOW COLUMNS FROM clientes LIKE 'EquipoId'")).length > 0);
  console.log("menu EQUIPOS:", (await q("SELECT 1 FROM menu WHERE MenuId='EQUIPOS'")).length > 0);
  console.log("resultados en PartidoJugador:", await q("SELECT PartidoJugadorResultado r, COUNT(*) n FROM PartidoJugador GROUP BY PartidoJugadorResultado"));
  process.exit(0);
})().catch((e) => { console.log("ERROR:", e.code || e.message); process.exit(1); });
'@ | Out-File -Encoding utf8 _check.js; node _check.js; Remove-Item _check.js
```

(`e.code || e.message` porque cuando MySQL no está levantado el error es un `AggregateError` sin `.message`: imprimiría una línea vacía)

Qué hacer con el resultado:

- **`ECONNREFUSED`** → MySQL no está levantado. Pedir al usuario que lo inicie; no seguir.
- **`tabla Equipo: true`** → la migración 001 ya corrió. **Saltear el paso 5**, `ALTER TABLE ... ADD COLUMN` no es idempotente y va a fallar.
- **`resultados en PartidoJugador`** → si además de `G`, `P`, `null` y `''` aparece cualquier otro código, avisar al usuario: el cambio de `partidosJugados` (ver *PJ = G + P*) le baja el PJ a esos jugadores.

## 5. Migraciones — el único paso que escribe en la base

**Confirmar con el usuario antes de ejecutar.** Va antes de levantar el código nuevo: el código nuevo hace `JOIN` contra `Equipo` y sin la tabla se caen el ranking y el listado de jugadores. Al revés es seguro, la migración es aditiva y el código viejo la tolera.

```powershell
cd "$ADMIN"
# PowerShell NO soporta "<" para redirigir stdin: hay que pipear con Get-Content
Get-Content api\migrations\001_equipos.sql | mysql -u sa -p winners
Get-Content api\migrations\002_indices_ranking.sql | mysql -u sa -p winners
```

(en bash sí vale `mysql -u sa -p winners < api/migrations/001_equipos.sql`)

- `001` crea `Equipo`, agrega `clientes.EquipoId` e inserta el menú `EQUIPOS`. **Correrla una sola vez.**
- `002` son índices; si alguno ya existe MySQL corta con `Duplicate key name`, es esperable y se ignora.
- Si no está el cliente `mysql` en el PATH, ejecutar el contenido de los `.sql` con el script de Node del paso 4 como plantilla.

Después: asignar el permiso del menú `EQUIPOS` al perfil desde **Control de Acceso → Perfiles** en la app. Sin eso la pantalla de Equipos solo la ve un usuario con `isAdmin = 'S'`.

## 6. Instalar y verificar los cuatro paquetes

Comandos exactos, todos verificados. **El orden importa solo dentro de cada proyecto.**

```powershell
# --- Admin API ---
cd "$ADMIN\api"; pnpm install
node --check controllers\ranking.controller.js   # no hay tests; esto es la verificación

# --- Admin client ---
cd "$ADMIN\client"; pnpm install
npx tsc -b --pretty false                        # debe salir sin output
npx eslint src                                   # 1 warning preexistente en AuthContext.tsx, ignorar
pnpm build                                        # → dist/

# --- Landing API (npm, no pnpm) ---
cd "$LANDING\api"; npm install
npx tsc --noEmit                                  # debe salir sin output
npm run build                                     # → dist/  ¡obligatorio, arranca desde dist!

# --- Landing client ---
cd "$LANDING\client"; pnpm install
npx vite build                                    # → build/
```

Notas que ahorran tiempo:

- **`WinnersLanding/client` no tiene TypeScript instalado.** `npx tsc` ahí falla con *"This is not the tsc command you are looking for"*. Es correcto: el build es solo `vite build` y no chequea tipos. No instalar TypeScript para "arreglarlo".
- **La API de la landing corre `dist/`**, no los `.ts`. Si se saltea `npm run build`, sigue sirviendo el código viejo con la escala de puntos vieja y los rankings no van a coincidir.
- Si `pnpm install` falla con `ERR_PNPM_UNEXPECTED_STORE`, es que `node_modules` quedó linkeado al store de otra versión mayor de pnpm. En una máquina nueva no debería pasar (no hay `node_modules`); si pasa, `rm -r node_modules` y reinstalar.

## 7. Levantar y probar

```powershell
# Cuatro terminales, o en background
cd "$ADMIN\api";      pnpm dev     # nodemon, :3001
cd "$ADMIN\client";   pnpm dev     # vite,    :3004
cd "$LANDING\api";    npm run dev  # tsx watch, :3011
cd "$LANDING\client"; pnpm dev     # vite,    :3010
```

⚠️ En Windows PowerShell 5.1 `curl` es **alias de `Invoke-WebRequest`** y no acepta `-s`, `-X` ni `-H`. Usar `Invoke-RestMethod` (nativo, devuelve objetos) o llamar a `curl.exe` con el `.exe` explícito.

La landing es **pública**, no necesita token:

```powershell
Invoke-RestMethod "http://localhost:3011/health"
Invoke-RestMethod "http://localhost:3011/api/equipos" | Select-Object -ExpandProperty data | Format-Table id, nombre, jugadores
Invoke-RestMethod "http://localhost:3011/api/rankings/global?categoria=8&sexo=M" |
  Select-Object -ExpandProperty data |
  Format-Table position, nombre, equipoNombre, partidosJugados, ganados, perdidos, puntos, racha

# Con filtro por equipo
Invoke-RestMethod "http://localhost:3011/api/rankings/global?categoria=8&sexo=M&equipoId=1"
```

El admin **requiere JWT**:

```powershell
$login = Invoke-RestMethod -Method Post "http://localhost:3001/api/usuarios/login" `
  -ContentType "application/json" `
  -Body (@{ usuario = "<usr>"; password = "<pwd>" } | ConvertTo-Json)
$login   # inspeccionar para ver cómo se llama el campo del token

$headers = @{ Authorization = "Bearer $($login.token)" }
Invoke-RestMethod "http://localhost:3001/api/ranking/global?categoria=8&sexo=M" -Headers $headers |
  Select-Object -ExpandProperty data | Format-Table nombre, equipoNombre, partidosJugados, ganados, perdidos, puntos, racha
Invoke-RestMethod "http://localhost:3001/api/ranking/equipos?categoria=8&sexo=M" -Headers $headers |
  Select-Object -ExpandProperty data | Format-Table nombre, jugadores, partidosJugados, ganados, perdidos, puntos, promedio
```

Pedir las credenciales al usuario; no inventarlas ni buscarlas en la base.

## 8. Criterio de terminado

Nada de esto se pudo verificar contra MySQL en la máquina original —el motor no estaba levantado—, así que **estas comprobaciones son las que realmente validan el trabajo**:

- [ ] Los cuatro builds del paso 6 pasan.
- [ ] `/api/rankings/global` de la landing y `/api/ranking/global` del admin devuelven **los mismos puntos para el mismo jugador**. Es la verificación más importante: son dos SQL distintos sobre la misma base.
- [ ] Un jugador con 7 G y 2 P tiene `7×3 + 2×1 = 23` puntos.
- [ ] En cada fila, `partidosJugados == ganados + perdidos`.
- [ ] `/api/ranking/equipos` no falla por `ONLY_FULL_GROUP_BY` (usa `GROUP BY e.EquipoId, e.EquipoNombre`).
- [ ] Los endpoints `?...&competenciaId=N` devuelven datos coherentes: es donde el orden de los parámetros `?` es más fácil de romper.
- [ ] Dos jugadores empatados **no intercambian posición** entre refrescos de la landing.
- [ ] En la landing, filtrar por un equipo chico saltea las categorías vacías hasta encontrar una con jugadores.
- [ ] Dos requests seguidos al mismo ranking de la landing generan **una sola** consulta en el log (caché de 30s).

## 9. Trampas conocidas

- **No agregar clases Tailwind nuevas en `WinnersLanding/client`.** Su `src/index.css` es un CSS de Tailwind v4 ya compilado y commiteado; Tailwind no corre en el build, así que cualquier clase que no esté ya en ese archivo no aplica nada. Lo nuevo va con `style={{}}` inline. En el admin no aplica: ahí Tailwind está bien instalado.
- **La escala de puntos está duplicada** en `WinnersRanking/api/controllers/ranking.controller.js` y `WinnersLanding/api/src/lib/ranking.ts`. Cualquier cambio va en los dos.
- **Código muerto**: `WinnersLanding/client/src/components/RankingTable.tsx` y su `.example.tsx` no los importa nadie y siguen con la escala 100/30. No editarlos pensando que son la tabla de la pantalla; la real es el `RankingTable` interno de `ResponsiveRankingLayout.tsx`.
