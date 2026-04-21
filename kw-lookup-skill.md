# Plan: Skill `kw-lookup` — wyszukiwanie adresu/miejsca po numerze księgi wieczystej

## Context

Użytkownik chce dedykowanego skila Claude Code, który na podstawie numeru KW (format `XX1X/XXXXXXXX/X`, np. `WA1M/00123456/7`) zwróci:

- adres nieruchomości (miejscowość, ulica, numer),
- numer/numery działek ewidencyjnych,
- obręb / gminę / powiat / województwo,
- (opcjonalnie) współrzędne geograficzne i link do Geoportalu.

Powód: ręczne wyszukiwanie przez [ekw.ms.gov.pl](https://ekw.ms.gov.pl/eukw_ogol/menu.do) jest żmudne (CAPTCHA, klikanie przez Dział I-O) i nie ma publicznego REST API. Skill ma zebrać w jednym miejscu dostępne (pół)automatyczne metody i dać deterministyczny format wyjścia.

## Realia źródeł danych (rekonesans)

| Źródło | KW → adres? | Automatyzacja | Koszt |
|---|---|---|---|
| `ekw.ms.gov.pl` (oficjalny EKW) | ✅ pełne dane Dział I-O | ❌ CAPTCHA (reCAPTCHA) — tylko browser + ręczne rozwiązanie | darmowy |
| ULDK GUGiK (`uldk.gugik.gov.pl`) | ❌ (tylko ID działki → geometria) | ✅ REST | darmowy |
| Geoportal krajowy (`geoportal.gov.pl`) | ❌ (działka → adres) | ✅ WMS/WFS | darmowy |
| ksiegiwieczyste.pl / ekw.plus / hipoteki.pl | ✅ | ❌ brak publicznego API | płatne kredyty |

**Wniosek:** realna ścieżka to **dwuetapowa**:
1. **KW → Dział I-O** przez browser automation na EKW (użytkownik rozwiązuje CAPTCHA raz na sesję),
2. **Dział I-O → dane uzupełniające** (geometria, centroid) przez ULDK po wyciągniętym identyfikatorze działki.

## Recommended approach

Stworzyć skill `kw-lookup` jako skill typu "specialist" z `user-invocable: true`, wzorowany na strukturze `/Users/janszewczyk/jaris, inc./Frontend/.claude/skills/swagger-explorer/` i `auth0/`.

### Lokalizacja

- `/Users/janszewczyk/jaris, inc./Frontend/.claude/skills/kw-lookup/SKILL.md` — główna instrukcja skila
- `/Users/janszewczyk/jaris, inc./Frontend/.claude/skills/kw-lookup/scripts/parse-dzial-io.ts` — parser HTML Dział I-O (opcjonalnie; można zacząć bez)
- `/Users/janszewczyk/jaris, inc./Frontend/.claude/skills/kw-lookup/README.md` — krótki opis dla ludzi

### Frontmatter SKILL.md

```yaml
---
name: kw-lookup
description: Wyszukuje adres i lokalizację nieruchomości po polskim numerze księgi wieczystej (KW). Używaj gdy użytkownik poda numer w formacie XX1X/XXXXXXXX/X lub prosi o "znajdź adres po KW" / "księga wieczysta".
user-invocable: true
allowed-tools: Bash(curl:*), Bash(jq:*), WebFetch, mcp__playwright__*
argument-hint: "<numer-KW> [--geo]"
---
```

### Zawartość SKILL.md — sekcje

1. **Walidacja wejścia** — regex `^[A-Z]{2}\d[A-Z]/\d{8}/\d$`, normalizacja (upper-case, usunięcie spacji). Kod sądu (pierwsze 4 znaki) → mapa do sądu rejonowego (tabela w skilu).

2. **Etap 1: EKW przez Playwright MCP** (preferowany flow):
   - `mcp__playwright__browser_navigate` → `https://przegladarka-ekw.ms.gov.pl/eukw_prz/KsiegiWieczyste/wyszukiwanieKW`
   - wypełnić 3 pola: kod wydziału, numer, cyfra kontrolna (`browser_fill_form`)
   - poprosić użytkownika o rozwiązanie CAPTCHA (prompt + `browser_wait_for` na zmianę URL-a)
   - kliknąć "Przeglądanie aktualnej treści KW" → Dział I-O
   - `browser_snapshot` lub `browser_evaluate` do wyciągnięcia tabeli "Położenie" i "Oznaczenie"

3. **Etap 2: Parsowanie Dział I-O** — pola do wyciągnięcia:
   - `województwo`, `powiat`, `gmina`, `miejscowość`, `dzielnica`, `ulica`, `numer`
   - lista działek: `identyfikator działki` (format `WWPPGG_R.OOOO.NR_DZ`), `numer działki`, `obręb`

4. **Etap 3 (opcjonalny, flaga `--geo`): wzbogacenie przez ULDK**:
   ```bash
   curl "https://uldk.gugik.gov.pl/?request=GetParcelById&id=<ID>&result=geom_wkt,teryt,voivodeship,county,commune,region,parcel"
   ```
   → centroid + link do `https://mapy.geoportal.gov.pl/imap/?identifyParcel=<ID>`.

5. **Format wyjścia** — stała struktura JSON + czytelny markdown:
   ```json
   {
     "kw": "WA1M/00123456/7",
     "sad": "Sąd Rejonowy dla Warszawy-Mokotowa, IX Wydział KW",
     "adres": { "wojewodztwo": "...", "powiat": "...", "gmina": "...", "miejscowosc": "...", "ulica": "...", "numer": "..." },
     "dzialki": [{ "id": "146513_8.0123.45/6", "obreb": "0123", "numer": "45/6" }],
     "geo": { "lat": 52.1, "lon": 21.0, "geoportalUrl": "..." }
   }
   ```

6. **Fallback / tryb manualny** — jeśli Playwright niedostępny, skill generuje gotowy deep-link do EKW z wypełnionymi polami i instruuje użytkownika, co skopiować z powrotem.

7. **Ograniczenia (sekcja "Limitations")** — otwarcie piszemy: CAPTCHA wymaga człowieka; serwis EKW bywa wolny; skill nie obchodzi ToS serwisu (brak masowych zapytań, rate-limit 1 req / 10 s).

### Critical files to create

- `.claude/skills/kw-lookup/SKILL.md` — całość wyżej
- `.claude/skills/kw-lookup/README.md` — 20 linii: cel, wywołanie, przykład

### Reużycie istniejącego

- Wzorzec frontmatter i `allowed-tools` → `auth0/SKILL.md` i `swagger-explorer/SKILL.md`
- Browser automation → skill `agent-browser` (już zainstalowany) lub natywny `mcp__playwright__*`
- Struktura katalogu → jak pozostałe skille w `.claude/skills/`

## Verification

1. `/kw-lookup WA1M/00123456/7` (testowy, realny numer poda użytkownik) → skill otwiera EKW, prosi o CAPTCHA, zwraca JSON + markdown z adresem.
2. `/kw-lookup WA1M/00123456/7 --geo` → dodatkowo lat/lon i link do Geoportalu.
3. Walidacja odrzuca zły format: `/kw-lookup XXX/123/4` → błąd + przykład poprawnego formatu.
4. Ręczny smoke-test: porównać wynik z ręcznym przeglądem tej samej KW na ekw.ms.gov.pl.
5. (opcjonalnie) dodać do `MEMORY.md` referencję do skila, jeśli użytkownik często go używa.

## Pytania otwarte (do dopytania przed implementacją)

- Czy skill ma być **tylko osobisty** (`~/.claude/skills/kw-lookup/`) czy **wspólny dla repo** (`Frontend/.claude/skills/kw-lookup/`, commit do git)?
- Czy akceptujesz flow z ręczną CAPTCHĄ, czy wolisz zintegrować z płatnym API (np. ksiegiwieczyste.pl — wymagałoby klucza i budżetu)?
- Zakres wyjścia: tylko Dział I-O (adres + działki), czy też Dział II (właściciel) / Dział IV (hipoteki)?
