# Loro Parque Navigator — design spec

- **Datum:** 2026-08-13
- **Stav:** schváleno (brainstorming 13. 8. 2026)
- **Původ:** poznámka z návštěvy Loro Parque 8/2026 — oficiální navigační appka neexistuje, orientační systém v parku je špatný.

## Cíl a cílovka

Veřejná, neoficiální PWA pro návštěvníky Loro Parque (Puerto de la Cruz, Tenerife):
offline mapa parku, GPS pozice, navigace k expozicím a hlavní přidaná hodnota —
funkce **„stíháš show?"** (čas chůze k aréně vs. čas začátku show).

Jazyky: **EN / ES / DE** (auto-detekce + přepínač). Čeština přidatelná později —
i18n struktura od začátku.

## Co NEstavíme (YAGNI)

- Žádný backend, žádné účty, žádná analytika na start.
- Žádné app story — distribuce jen jako PWA („Přidat na plochu").
- Žádný automatický scraper webu parku v první verzi (později max. jako hlídač změn, který upozorní — nikdy sám nepřepisuje data).

## Architektura

Statická PWA bez backendu:

| Vrstva | Volba |
|---|---|
| Build | Vite + TypeScript |
| Mapa | MapLibre GL JS |
| Mapa parku | Vykreslená **přímo z bundlovaného GeoJSON** (vlastní styl à la parková mapa: cesty, voda, zeleň, budovy) — park má 13,5 ha, dlaždice nejsou potřeba. PMTiles jen jako fallback, kdyby GeoJSON nestačil. *(Změna 2026-08-13 při plánování: méně toolingu — bez Javy/planetileru, offline triviálně.)* |
| Offline | Service worker (vite-plugin-pwa) — precache appky i dat; po prvním otevření funguje vše bez signálu |
| Routing | Graf předpočítaný při buildu z OSM pěšin, v klientovi Dijkstra (park ~13,5 ha → graf maličký) |
| Shows | Statický `shows.json` vedle appky — fetch při startu, cache pro offline |
| Hosting | GitHub Pages, deploy přes GitHub Actions, public repo |

## Data pipeline

1. **Overpass export** polygonu parku z OSM → GeoJSON (cesty + POI), uložený v repu.
2. **Refresh skript** + soubor ručních oprav (merge přes OSM ID) — terénní opravy nesmí přepsat další OSM import.
3. **Routing graf** se generuje při buildu z OSM `footway`/`path` geometrie.

Referenční bod: vchod parku GPS `28.4082, -16.5659`.

## Navigace

- Tap na POI → trasa od GPS pozice + odhad času chůze (~4 km/h s rezervou na dav/kočárek).
- Bez GPS (odmítnuté oprávnění, indoor): fallback „jsem u vchodu" / ruční výběr pozice na mapě.

## Shows + „stíháš to?"

- `shows.json`: rozvrh podle arén (orky, delfíni, lachtani, papoušci) a sezóny/data.
- Stáhne se při startu (cache-busting), offline se použije poslední známá verze.
- UI: seznam nejbližších show s indikátorem **stíháš v klidu / stíháš poklusem / nestíháš** — vstup: čas chůze z aktuální pozice (routing graf) vs. čas začátku.
- Údržba = editace jednoho JSON v repu, bez redeploye appky.

## Branding a právní rámec

- „Loro Parque" je ochranná známka → appka musí být jasně **„Unofficial visitor guide"**: bez log parku, s viditelným disclaimerem.
- Pracovní název „Loro Parque Navigator" zůstává pro vývoj; finální název + případná doména se rozhodnou před publikací.
- POI data označit jako **beta**, dokud neproběhne ověření v terénu.

## Testy a kvalita

- **Vitest** na logiku: routing graf, výpočet „stíháš to?", merge OSM + ručních oprav. Pokrytí ≥ 80 % na logických modulech.
- **Playwright** smoke test PWA (načtení mapy, offline režim).
- TDD workflow dle pravidel (test first).

## Fáze

1. **Data pipeline** — Overpass query, GeoJSON, routing graf (build skripty).
2. **Mapová PWA** — MapLibre + PMTiles, GPS tečka, zobrazení POI, offline cache.
3. **Routing** — tap na POI → trasa + ETA.
4. **Shows** — `shows.json`, fetch/cache, „stíháš to?" UI.
5. **i18n + polish** — EN/ES/DE, instalační UX, disclaimer.
6. **Terénní verifikace** — ověření POI na místě (jediná část mimo počítač); do té doby beta.

## Rizika

| Riziko | Mitigace |
|---|---|
| Zastaralé časy show | JSON na serveru — oprava bez redeploye; později hlídač změn webu parku |
| Kvalita OSM dat v parku | Vrstva ručních oprav + terénní verifikace, beta disclaimer |
| Ochranná známka | Unofficial branding, žádná loga, finální název před publikací |
| Údržba do budoucna | Vše statické, žádný server k provozování; jediná živá data = 1 JSON |

## Umístění

- Repo: `C:\AIPC2\loro-parque-navigator` (lokálně), public GitHub remote, GitHub Pages.
- Projektová paměť: `OneDrive\Work\projectsmemory\Osobni\loro_parque_navigator.md`.
