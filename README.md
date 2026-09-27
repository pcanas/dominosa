# Dominosa · prototipo (hito 0)

Puzle lógico de dominó: une cada pareja de números adyacentes con una ficha, usando cada ficha del juego exactamente una vez. Todo nivel tiene **solución única**.

Este repo es el **hito 0** del plan: un prototipo jugable en el navegador, instalable en el iPhone como app web, con el motor en TypeScript que se reutilizará en la app nativa.

- 5 niveles en rampa de tamaño y profundidad de deducción: 4×5 (tutorial), 5×6, 7×8, 8×9 y 9×10 (experto).
- Deslizar de una celda a su vecina para colocar (ficha fantasma mientras arrastras; si vuelves atrás, se cancela), tocar para quitar, colocar encima de otra ficha la reemplaza.
- Deshacer (hasta 500 pasos), reiniciar con confirmación, fichas repetidas en terracota con icono, verde salvia al resolver.
- Progreso y mejor tiempo guardados en el dispositivo. Modo oscuro cálido. ES / EN / FR según el idioma del sistema.
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
             deshacer, reiniciar), selectores y progreso.
  state/     Stores de Zustand (partida actual y progreso persistido).
  platform/  Adaptadores: almacenamiento, vibración, service worker, hidratación web.
  i18n/      Textos ES/EN/FR tipados.
  ui/        Tema (paleta del plan), componentes, tablero y gestos.
  app/       Rutas de Expo Router (inicio y /play/[levelId]).
scripts/     Pipeline de niveles (Node) y post-proceso PWA.
```

Reglas que el lint hace cumplir: `core/` no importa nada de fuera (ni `Math.random`: todo va con semilla), y `core/`, `game/` y `levels/` no importan React, React Native, Expo ni stores. Así el motor y las reglas se reutilizan tal cual en el script de generación, los tests y la app nativa.

### Generación y graduación de niveles

- **Generador:** reparte el juego completo sobre un teselado aleatorio y hace escalada (intercambia o gira fichas y acepta el cambio si el número de soluciones, con tope de 40, no sube) hasta que la solución plantada es la única. Unos pocos ms por puzle, incluso en 10×11.
- **Graduador:** resuelve como una persona, usando siempre la técnica más sencilla que avance. Nivel 1: singles (celda con una sola pareja posible, ficha con un solo hueco). Nivel 2: huecos de una ficha que comparten celda y colocaciones que dejan sin opciones a una celda vecina u otra ficha. Nivel 3: lookahead de un paso (suponer y seguir los singles hasta contradicción). Cada paso es un `Deduction`, la misma unidad que usarán las pistas graduadas.
- Los niveles se generan offline (`npm run levels`) y se guardan en `src/levels/packs/*.json` (~300 bytes por nivel). Un test comprueba en CI que cada nivel tiene exactamente una solución, que coincide con la guardada, y que su grado es el declarado.

## Qué validar en este hito

- **El gesto:** ¿deslizar para colocar se siente natural? ¿Hay colocaciones accidentales? (Umbral: 35 % de la celda, en `src/ui/board/geometry.ts`.)
- **Tamaño máximo:** el 9×10 da celdas de ~34 pt en un iPhone de 390 pt de ancho. ¿Se juega bien o el límite debe ser 8×9?
- Probarlo con 3–5 personas y anotar dudas y fallos de toque.

## Siguiente (hito 1)

Marcas de muro, rastreador de pares, guardar la partida en curso, packs de niveles y "tocar A y luego B" para VoiceOver.
