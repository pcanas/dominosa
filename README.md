# Dominosa · prototipo (hito 1 en curso)

Puzle lógico de dominó: une cada pareja de números adyacentes con una ficha, usando cada ficha del juego exactamente una vez. Todo nivel tiene **solución única**.

Prototipo jugable en el navegador, instalable en el iPhone como app web, con el motor en TypeScript que se reutilizará en la app nativa. El hito 0 está cerrado; el hito 1 va por bloques (hechos: **bloque 1**, muros y guardado, y **bloque 2**, rastreador de pares y packs).

- **60 niveles en 5 packs de 12**, en rampa de tamaño y profundidad de deducción: Primeros pasos (4×5 y 5×6), Fácil (5×6 y 6×7), Medio (7×8), Difícil (8×9) y Experto (9×10). Todos abiertos. Inicio → pack (rejilla de niveles con resueltos y a medias) → partida; "Siguiente" sigue en el pack y salta al siguiente al terminarlo.
- **Rastreador de pares** (botón "Pares"): panel con todas las fichas del juego en escalera; sin colocar, colocadas (salvia) o repetidas (terracota). Tocar un par cierra el panel y marca en el tablero sus huecos libres como fichas punteadas, con el recuento arriba; se quita con la ✕ o al colocar ese par. El panel flota sobre la parte baja de la pantalla, así que el tablero nunca encoge.
- Deslizar de una celda a su vecina para colocar (ficha fantasma mientras arrastras; si vuelves atrás, se cancela), tocar para quitar, colocar encima de otra ficha la reemplaza.
- **Muros** (marcar que dos celdas no pueden ir juntas): deslizar crea y tocar quita. El botón "Muro" funciona como la tecla de mayúsculas del iPhone: un toque vale para un muro (el modo se apaga al ponerlo), doble toque lo deja fijo (candado) hasta volver a tocarlo. Tocar un muro lo quita; su zona de toque es mucho mayor que la barra (hasta media celda si la celda está vacía, un cuarto si tiene ficha) y el muro se pone en terracota mientras el dedo está encima. Un muro impide colocar una ficha en ese hueco; poner un muro donde hay una ficha la quita.
- Deshacer (hasta 500 pasos, muros incluidos), reiniciar con confirmación (borra fichas y muros), fichas repetidas en terracota con icono, verde salvia al resolver.
- **Partidas guardadas:** cada nivel empezado se guarda en el dispositivo (fichas, muros, historial de deshacer y tiempo) y se retoma al volver, aunque se cierre la app. El reloj se para al salir del nivel o al pasar la app a segundo plano. En la rejilla del pack, los niveles a medias llevan un punto terracota.
- Progreso y mejor tiempo guardados en el dispositivo. Modo oscuro cálido. ES / EN / FR según el idioma del sistema.
- La pantalla de inicio muestra la versión y el commit del build, para saber si la app ya se actualizó (la PWA coge la versión nueva al cerrarla y volver a abrirla).
- Funciona sin conexión una vez abierta (service worker).

## Publicar en GitHub Pages

1. Crea un repo en GitHub (por ejemplo `dominosa`) y sube este proyecto a la rama `main`:
   ```sh
   git remote add origin git@github.com:<usuario>/dominosa.git
   git push -u origin main
   ```
2. En el repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Cada push a `main` pasa los checks (tipos, lint, formato, tests y unicidad de niveles) y publica en `https://<usuario>.github.io/dominosa/`. Si el primer despliegue falla por no haber activado Pages aún, vuelve a lanzarlo desde **Actions → CI → Re-run jobs**.

La ruta base (`BASE_URL`) la da GitHub Pages en el propio workflow, así que el repo puede llamarse como quieras y también funciona con dominio propio.

### Probar una rama antes de `main`

Los cambios van en una rama; `main` es siempre lo publicado.

1. Sube la rama: `git push -u origin <rama>`.
2. En GitHub: **Actions → Deploy → Run workflow**. Deja _Use workflow from_ en `main` y escribe la rama (o un commit o un tag) en **ref**. Pasa los checks y publica esa versión en la misma URL.
3. En el iPhone, cierra la app y vuelve a abrirla para que coja la versión nueva. La pantalla de inicio muestra el commit y, si no es `main`, la rama (por ejemplo `Versión 0.2.0 · 1a2b3c4 · hito1-bloque1`).
4. Si convence, abre un pull request y fusiónalo: al llegar a `main` se publica `main` otra vez. Si no, lanza **Deploy** con `main` para volver a lo que había.

GitHub Pages tiene un solo sitio por repo, así que mientras pruebas una rama es lo que ve cualquiera que abra la URL. El workflow **Deploy** tiene que estar ya en `main` para aparecer en Actions, y siempre se lanza desde `main` (el entorno `github-pages` solo acepta despliegues iniciados ahí; qué se publica lo decide **ref**).

## Instalar en el iPhone

1. Abre la URL en **Safari**.
2. **Compartir → Añadir a pantalla de inicio**.
3. Se abre a pantalla completa, como una app, y funciona sin conexión.

Para probar la versión nativa sin compilar: `npm start` y escanea el QR con **Expo Go** (SDK 57), con el móvil y el ordenador en la misma red.

## Desarrollo

Requisitos: Node 20.19 o superior.

```sh
npm install
npm run web          # servidor de desarrollo en el navegador
npm start            # Metro + QR para Expo Go
npm run check        # typecheck + lint + formato + tests (lo mismo que CI)
npm run levels       # regenera los packs de niveles (determinista)
npm run build:web    # export estático + PWA en dist/
```

Para probar el build de producción con la ruta de GitHub Pages: `BASE_URL=/dominosa npm run build:web`.

## Arquitectura

```
src/
  core/      Motor puro TS, sin dependencias: modelo, RNG con semilla, solver,
             generador, deducción lógica y graduador. Corre en app, Node y tests.
  levels/    Formato de los packs (JSON compacto), parseo y catálogo.
  game/      Reglas de una partida: reducer puro (colocar, reemplazar, quitar,
             muros, deshacer por diffs, reiniciar), selectores, progreso y
             guardado/restauración validada de partidas.
  state/     Stores de Zustand (partida actual, partidas guardadas y progreso persistidos).
  platform/  Adaptadores: almacenamiento, vibración, service worker, hidratación web.
  i18n/      Textos ES/EN/FR tipados.
  ui/        Tema (paleta del plan), componentes, tablero y gestos.
  app/       Rutas de Expo Router (inicio, /pack/[packId] y /play/[levelId]).
scripts/     Pipeline de niveles (Node) y post-proceso PWA.
```

Reglas que el lint hace cumplir: `core/` no importa nada de fuera (ni `Math.random`: todo va con semilla), y `core/`, `game/` y `levels/` no importan React, React Native, Expo ni stores. Así el motor y las reglas se reutilizan tal cual en el script de generación, los tests y la app nativa.

### Generación y graduación de niveles

- **Generador:** reparte el juego completo sobre un teselado aleatorio y hace escalada (intercambia o gira fichas y acepta el cambio si el número de soluciones, con tope de 40, no sube) hasta que la solución plantada es la única. Unos pocos ms por puzle, incluso en 10×11.
- **Graduador:** resuelve como una persona, usando siempre la técnica más sencilla que avance. Nivel 1: singles (celda con una sola pareja posible, ficha con un solo hueco). Nivel 2: huecos de una ficha que comparten celda y colocaciones que dejan sin opciones a una celda vecina u otra ficha. Nivel 3: lookahead de un paso (suponer y seguir los singles hasta contradicción). Cada paso es un `Deduction`, la misma unidad que usarán las pistas graduadas.
- Los niveles se generan offline (`npm run levels`) desde `scripts/level-packs.ts` y se guardan en `src/levels/packs/*.json` (~300 bytes por nivel). Cada pack se describe por grupos (tamaño, grado, cuántos); dentro de un grupo se ordenan de menos a más pasos de deducción, y ningún puzle se repite en todo el juego.
- **Los ids de nivel son permanentes** (`<pack>-<nn>`, p. ej. `medium-07`): de ellos cuelgan el progreso y las partidas guardadas. No se renombra ni se reordena un pack publicado; se añade uno nuevo.
- Un test comprueba en CI que cada nivel tiene exactamente una solución, que coincide con la guardada, que su grado es el declarado, que no hay puzles repetidos y que la dificultad sube dentro de cada pack.

## Qué validar

- **El gesto:** ¿deslizar para colocar se siente natural? ¿Hay colocaciones accidentales? (Umbral: 35 % de la celda, en `src/ui/board/geometry.ts`.)
- **Muros:** ¿se entiende el botón (un toque, doble toque para fijar)? ¿Se quitan muros o fichas sin querer al tocar? (Zona de toque: `WALL_REACH_OVER_TILE` en `src/ui/board/geometry.ts`; doble toque: `DOUBLE_TAP_MS` en `src/ui/board/wall-mode.ts`.)
- **Guardado:** cerrar la app a mitad de un nivel y volver: fichas, muros, deshacer y tiempo tienen que seguir igual.
- **Rastreador:** ¿ayuda o estorba? ¿Se entiende qué significa cada color?
- **Tamaño máximo:** el 9×10 da celdas de ~34 pt en un iPhone de 390 pt de ancho. ¿Se juega bien o el límite debe ser 8×9? (Cambiarlo es una línea en `scripts/level-packs.ts`.)
- **Curva:** ¿cada pack se siente un poco más difícil que el anterior?

## Siguiente (hito 1)

- Bloque 3: "tocar A y luego B" (VoiceOver), etiquetas de accesibilidad y ajustes mínimos.
