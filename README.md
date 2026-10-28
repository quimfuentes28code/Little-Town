# Little Town · 0.2

Constructor de poblados medievales en Three.js, con arquitectura procedural,
economía estacional y una primera campaña de crecimiento.

[Descargar el juego para abrir sin instalar nada](https://github.com/quimfuentes28code/Little-Town/raw/refs/heads/codex/little-town-playable/releases/Jugar-Little-Town.zip)

Extrae el ZIP y abre **Little-Town.html** con Chrome o Edge. En Windows puede
aparecer como **Little-Town** si las extensiones están ocultas. No necesita servidor
ni conexión a Internet. El archivo también está en `releases/Little-Town.html`.

## Jugar

Selecciona un edificio en la barra inferior y haz clic en un claro cuando su
huella esté verde. Cada edificio consume madera y piedra. Las viviendas amplían
la capacidad, las granjas producen alimento según la estación y los aserraderos
producen madera. Pozos, mercados e iglesias favorecen el bienestar. Las familias
llegan si hay vivienda, reservas y bienestar; la escasez provoca emigración.
Una extracción comunitaria repone piedra. Los objetivos y el diario muestran
el progreso real del asentamiento.

- Arrastrar con botón izquierdo: desplazar la cámara.
- Arrastrar con botón derecho: girar la cámara.
- Rueda: acercar o alejar.
- Teclas 1–6: seleccionar construcciones. Escape: cancelar.
- Espacio: pausar o continuar; los botones también pausan.
- H: ayuda. Ctrl+S o Cmd+S: descargar una copia de la partida.
- Clic en un edificio existente: inspeccionarlo.
- Botones 1×, 2×, 4×: velocidad de simulación.

## Guardar y cargar

El navegador guarda la partida automáticamente cada 15 segundos, al construir
y al cerrar. Al volver a abrir se recupera, siempre que el navegador permita
almacenamiento local y se use el mismo archivo/origen. El modo privado y algunas
políticas de archivos locales pueden impedirlo.

**Guardar** descarga una copia JSON que incluye recursos, edificios, calendario,
objetivos, cámara y hora visual. **Cargar** permite seleccionar esa copia.
Los datos incompatibles o dañados se rechazan sin alterar la partida actual.
No se simula tiempo mientras el juego está cerrado. Nueva partida pide
confirmación y conserva las copias JSON descargadas.

## Novedades de 0.2

- Viviendas con ventanas, contraventanas, porches, jardineras y tejados detallados;
  mercado renovado y más separación entre materiales.
- Agua animada, orillas con vegetación, humo y aldeanos con extremidades animadas.
- Ciclo de luz diurna y nocturna, ventanas encendidas, cielo, nubes y estrellas.
- Vegetación estacional y nieve de invierno, con economía sincronizada por estaciones.
- Huellas de construcción, caminos y claros protegidos; animación al construir.
- Guardado automático, copias portátiles, objetivos, estadísticas laborales,
  registro de eventos, inspección y ayuda integrada.
- Sonido ambiental opcional, generado localmente sin recursos externos.

## Desarrollo

Requiere Node.js 22 o posterior.

```sh
npm ci
npm run dev
```

```sh
npm run build
npm test
npm run export:standalone
```

El último comando genera `dist/Little-Town.html`, con código y estilos integrados.
Los recursos se generan localmente; no hacen falta claves ni servicios externos.

Con el servidor activo y Chromium instalado:

```sh
npm run test:browser
```

Puedes seleccionar el ejecutable mediante `CHROMIUM_PATH` y el servidor mediante
`APP_URL`. Para comprobar el documento autónomo sin conexión:

```sh
OFFLINE=1 HTML_PATH=dist/Little-Town.html npm run test:browser
```

La prueba autónoma carga el documento en memoria porque el navegador gestionado
impide navegar a direcciones `file://`. Las pruebas cubren construcción real,
costes, guardado/restauración de recursos y plano, rechazo transaccional de datos
inválidos, estaciones y controles móviles. La restauración entre recargas se
verifica contra el servidor; un documento en memoria tiene origen opaco y no
permite localStorage.

## Alcance actual

Juego independiente estilizado, todavía en desarrollo. La vegetación y los
edificios son procedurales; las animaciones son cinemáticas y las colisiones de
construcción aproximadas. No hay aún rutas individuales de trabajo, tráfico,
física estructural, terraformación, multijugador ni assets fotográficos.
No se ha realizado una comparación a ciegas con Cities: Skylines: faltan capturas
equivalentes y no se afirma paridad AAA. Las medidas de rendimiento de las pruebas
usan Chromium con renderizado por software y no representan FPS en una GPU real.

[Capturas y revisión visual independiente de esta versión](docs/visual-review-v0.2.md).
