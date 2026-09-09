# soms.cat

Homenatge d'una sola pàgina a la família Soms i a la Garrotxa: la seva herència, la seva
llengua i la seva terra. En línia a **[soms.cat](https://soms.cat)**.

La pàgina recorre *La família Soms*, *Les Tietes de Sant Roc*, *La Garrotxa* i *El parlar
de la Garrotxa*, amb fotografies d'arxiu familiar tractades com a làmines de museu i un
mapa de relleu fet a mida.

## Sense eines de construcció

No hi ha bundler, ni dependències, ni pas de compilació. El lloc són tres fitxers que el
navegador entén tal com estan:

| Fitxer / carpeta | Què és |
| --- | --- |
| `index.html` | tota la pàgina, inclòs l'SVG del mapa |
| `styles.css` | el sistema de disseny sencer, amb custom properties |
| `script.js` | només les revelacions per scroll (`IntersectionObserver`) |
| `images/` | fotografies, escut, mapa i targeta Open Graph |
| `CNAME` | el domini de GitHub Pages |
| `CLAUDE.md` | sistema de disseny, convencions i registre de sessions |
| `tools/garrotxa-map/` | generador del mapa — **no** és un pas de construcció |

`script.js` és millora progressiva pura: sense JavaScript la pàgina es veu sencera, i
tota l'animació respecta `prefers-reduced-motion`.

`tools/garrotxa-map/` és un generador d'un sol ús que es va executar una vegada per produir
el mapa; no s'executa mai en desplegament ni cal per servir el lloc. Té el
[seu propi README](tools/garrotxa-map/README.md).

## Desenvolupament local

Qualsevol servidor estàtic serveix. Sense `npm install`:

```bash
python3 -m http.server 8000
```

I obre <http://localhost:8000>. Obrir `index.html` amb doble clic també funciona, però des
d'un servidor s'assembla més al que es publica.

## Desplegament

**Només publica un tag nou.** Els pushos a `main` no publiquen res.

| Acció | Què passa |
| --- | --- |
| `git push` a `main` | **res** — el lloc no es toca |
| push d'un tag `v*` **nou** | es publica a soms.cat |
| tornar a empènyer o moure un tag existent | res; el lloc es queda igual |

Per publicar:

```bash
git push origin main            # el codi, sense publicar
git tag -a v1.0.0 -m "v1.0.0"   # anotat, no lleuger
git push origin v1.0.0          # això és el que publica
```

Ho fa [`.github/workflows/desplega.yml`](.github/workflows/desplega.yml), que abans de
publicar comprova si aquell tag ja té un desplegament reeixit a l'entorn `github-pages`. Si
en té, la feina de publicació queda **saltada** i el workflow surt en verd sense tocar res:
és el comportament volgut quan es mou un tag amb `git tag -f` o es torna a executar el
workflow a mà. Un desplegament **fallat** no bloqueja el tag, així que una incidència
transitòria es pot reintentar.

Dues coses que val la pena tenir presents:

- **Fes els tags anotats** (`git tag -a`). `git push --follow-tags` només arrossega els
  anotats i se salta els lleugers sense dir-ho, i llavors no s'executa res.
- **Un workflow en verd no és prova que s'hagi publicat**: pot haver saltat perquè el tag
  ja existia. Comprova-ho a la pestanya Actions o mirant l'entorn `github-pages`.

El desplegament només puja el lloc — `index.html`, `styles.css`, `script.js`, `CNAME` i
`images/`. `CLAUDE.md`, aquest README i `tools/` es queden al repositori.

## Disseny

El sistema es diu **"Basalt volcànic"**: fons de carbó volcànic, el groc de la senyera com
a accent protagonista, fotografies tractades com a làmines d'arxiu i *les quatre barres*
com a element de signatura. Tipografies Fraunces, Newsreader i Space Grotesk.

Els tokens, les convencions (BEM, mobile-first, còpia en català) i el registre de decisions
viuen a [`CLAUDE.md`](CLAUDE.md).

## El mapa de la Garrotxa

El mapa no és una il·lustració comprada: és un relleu ombrejat construït a partir de dades
reals. La base és `images/garrotxa-relleu.webp` i el traçat i la retolació són SVG en línia
dins `index.html`, entre els marcadors `<!-- mapa:inici -->` i `<!-- mapa:fi -->`.

> Aquest SVG és **generat**. Per canviar-lo, edita `tools/garrotxa-map/overlay.mjs` i torna
> a executar el generador; no editis mai el marcatge a mà.

### Crèdits de les dades

L'ODbL **exigeix** l'atribució, així que aquests crèdits no són decoratius i no s'han de
treure de la pàgina:

- Relleu ombrejat © **Institut Cartogràfic i Geològic de Catalunya** (CC BY 4.0)
- Elevacions **Copernicus DEM**
- Límits, rius i volcans © **col·laboradors d'OpenStreetMap** (ODbL)

## Peu

El peu "Made by pearpages" ve de
[`@pearpages/credit`](https://www.npmjs.com/package/@pearpages/credit), carregat des
d'unpkg amb `@0` perquè es mantingui al dia sol. El lloc només hi posa els dos tokens de
tema que el paquet demana: sobre aquest fons fosc, el color per defecte del paquet no
compliria el contrast WCAG AA.
