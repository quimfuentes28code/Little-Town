# Little Town

Un constructor de poblados medievales en Three.js. Una primera versión jugable, con escenario procedural, cámara libre, construcción y economía estacional. No pretende equivaler al alcance de un juego comercial AAA.

## Ejecutar

Requiere Node.js 22 o posterior.

```sh
npm ci
npm run dev
```

```sh
npm run build
npm test
```

## Jugar

Selecciona un edificio en la barra inferior y haz clic en terreno libre. Su coste se descuenta al construir. Las viviendas amplían la capacidad; las granjas producen alimentos según la estación; el aserradero produce madera. Pozos, mercados e iglesias mejoran el bienestar. Conserva comida y madera para el invierno. Una pequeña extracción comunitaria repone piedra.

Arrastra con el botón izquierdo para mover la cámara, con el derecho para girarla y usa la rueda para acercarte. Espacio pausa, Escape cancela la construcción y las teclas 1–6 seleccionan edificios. Los botones de velocidad permiten acelerar el calendario. Las partidas permanecen en memoria durante la sesión; recargar reinicia el poblado.

## Alcance actual

Arquitectura y vegetación procedurales, río, puente, campos, habitantes y molino animados. Colisiones de construcción aproximadas; sin simulación física estructural, rutas individuales, guardado persistente ni assets fotográficos. La estética está diseñada como una maqueta medieval estilizada. Las estaciones afectan a la economía; la iluminación y vegetación mantienen el aspecto de primavera.

## Comprobación en navegador

Con el servidor activo y Chromium instalado, ejecuta `npm run test:browser`. Usa `CHROMIUM_PATH` para indicar el ejecutable y `APP_URL` para cambiar el destino. Verifica renderizado, pausa, colocación, costes, atajos, errores de consola y ausencia de desbordamiento móvil.

## Jugar sin servidor

Después de `npm run build`, ejecuta `npm run export:standalone`.
Esto genera `dist/Little-Town.html` con el código, los estilos y los recursos
procedurales integrados. Abre ese archivo con doble clic en Chrome o Edge:
no necesita Node.js, conexión a Internet ni un servidor para jugar.
Node.js solo hace falta para generar el archivo a partir del código fuente.

Para validar el contenido autónomo con Chromium sin conexión:
`OFFLINE=1 HTML_PATH=dist/Little-Town.html npm run test:browser`.
La prueba carga el HTML generado directamente en memoria; así también funciona
en navegadores gestionados cuya política impide navegar a direcciones `file://`.
