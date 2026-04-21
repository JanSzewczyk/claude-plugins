---
name: kw-lookup
description: >
  Wyszukuje dane nieruchomości po polskim numerze księgi wieczystej (KW) — adres,
  działki/lokal, właścicieli, prawa, roszczenia, ograniczenia i hipoteki. Używaj gdy
  użytkownik poda numer w formacie XX1X/XXXXXXXX/X (np. WA1M/00123456/7) lub prosi o
  "sprawdź księgę wieczystą", "dane z KW", "znajdź adres/właściciela/hipoteki po KW".
  Łączy browser automation na portalu EKW (ekw.ms.gov.pl, wymaga ręcznego rozwiązania
  CAPTCHA) z REST API ULDK GUGiK do wzbogacenia o geometrię działki i współrzędne.
---

# KW Lookup — odczyt księgi wieczystej

Skill mapuje numer polskiej księgi wieczystej na pełne dane ze wszystkich działów:
I-O (oznaczenie), I-Sp (spis praw), II (własność), III (prawa/roszczenia/ograniczenia),
IV (hipoteki). Opcjonalnie wzbogaca dane o geometrię działki przez ULDK GUGiK.

> **Ograniczenia**: portal EKW używa reCAPTCHA — człowiek musi ją rozwiązać raz na sesję
> (jeśli zostanie wywołana). Publiczny REST API dla KW → adres nie istnieje. Rate-limit:
> max 1 zapytanie / 10 s (szanujemy ToS serwisu, brak masowych zapytań).

## Wejście

Numer KW w formacie: `^[A-Z]{2}\d[A-Z]/\d{8}/\d$`

- Przykład: `WA1M/00123456/7`
- `WA1M` — kod wydziału sądu rejonowego (4 znaki)
- `00123456` — numer KW (8 cyfr)
- `7` — cyfra kontrolna

Flagi opcjonalne:

- `--geo` — wzbogacenie o współrzędne i link do Geoportalu (Etap 3).
- `--dzialy=IO,ISp,II,III,IV` — lista działów do pobrania (domyślnie wszystkie). Podaj
  np. `--dzialy=IO` aby pobrać tylko adres i działki (szybciej, mniej kliknięć).

**Walidacja przed wywołaniem dowolnego narzędzia**:

1. Usuń spacje, wymuś upper-case.
2. Dopasuj regex. Jeśli nie pasuje → zwróć błąd z przykładem poprawnego formatu.
3. Pierwsze 4 znaki (kod wydziału) → tabela sądów (patrz `references/sady.md`).

## Flow główny (preferowany)

### Etap 1 — EKW przez Playwright MCP

1. `mcp__plugin_playwright_playwright__browser_navigate` →
   `https://przegladarka-ekw.ms.gov.pl/eukw_prz/KsiegiWieczyste/wyszukiwanieKW`
2. `browser_fill_form` — wypełnij 3 pola: kod wydziału, numer (8 cyfr), cyfra kontrolna.
3. Klik "Wyszukaj Księgę". Portal może pokazać CAPTCHA — jeśli tak, **poproś użytkownika
   o jej rozwiązanie** i `browser_wait_for` na zmianę URL. Strona wyników zawiera typ KW
   (grunt / lokal / budynek / SUW) i sąd — zapisz do JSON.
4. Klik "Przeglądanie aktualnej treści KW" → strona `/pokazWydruk` z zakładkami
   działów (przyciski: `Dział I-O`, `Dział I-Sp`, `Dział II`, `Dział III`, `Dział IV`).
5. Domyślnie widoczny jest Dział I-O — `browser_snapshot` i parsuj. Następnie dla
   każdego kolejnego działu z listy `--dzialy`: klik odpowiedniego przycisku →
   `browser_snapshot` → parsuj. Między klikami **nie** potrzeba `sleep`, to ta sama
   sesja.

### Etap 2 — parsowanie działów

Wszystkie tabele EKW mają wspólny schemat: kolumna „Nr pola”, „Nazwa pola”, „Treść pola”
(plus numery wpisu). Czytaj etykiety wierszy (`cell[0]`) i wartości (`cell[1..n]`).
Pomijaj wiersze-nagłówki i wiersze typu „DOKUMENTY BĘDĄCE PODSTAWĄ WPISU”.

#### Dział I-O — Oznaczenie nieruchomości

Pola w zależności od typu KW:

- **Grunt / budynek**: `Położenie` (woj., powiat, gmina, miejscowość, dzielnica, ulica,
  numer), lista działek z polami:
  - `identyfikator działki` (TERYT: `WWPPGG_R.OOOO.NR_DZ`, np. `146513_8.0123.45/6`)
  - `numer działki`, `obręb` (numer + nazwa)
  - `sposób korzystania` (np. „R — grunty orne”, „B — tereny mieszkaniowe”)
  - `powierzchnia` (ha lub m²) jeśli podano.
- **Lokal stanowiący odrębną nieruchomość**: `Położenie` + `Ulica`, `Numer budynku`,
  `Numer lokalu`, `Identyfikator lokalu`, `Przeznaczenie lokalu`, `Opis lokalu`,
  `Pomieszczenia przynależne`, `Kondygnacja`, `Powierzchnia użytkowa`,
  `Przyłączenie — numer KW gruntowej` (to KW nadrzędna, z której wyodrębniono lokal).

Jeśli wiele wierszy (kilka działek / adresów) — zwróć wszystkie.

#### Dział I-Sp — Spis praw związanych z własnością

Typowo dla lokali: udział w nieruchomości wspólnej, prawa do korzystania z części
nieruchomości (np. miejsce postojowe). Zwróć listę obiektów:

```json
{
  "lp": "1",
  "rodzaj_prawa": "UDZIAŁ ZWIĄZANY Z WŁASNOŚCIĄ LOKALU",
  "tresc": "UDZIAŁ W NIERUCHOMOŚCI WSPÓLNEJ",
  "wielkosc_udzialu": "6187/1234567"
}
```

#### Dział II — Własność

Lista właścicieli / użytkowników wieczystych / uprawnionych. Dla każdego zwróć:

- `lp`, `rodzaj_wpisu` (WŁAŚCICIEL / UŻYTKOWNIK WIECZYSTY / UPRAWNIONY),
- `udzial` (np. „1/1”, „1/2”),
- `typ_podmiotu` (OSOBA FIZYCZNA / PRAWNA / JEDNOSTKA ORGANIZACYJNA),
- dane podmiotu: `imiona_nazwisko`, `imiona_rodzicow`, `pesel`, lub `nazwa`, `regon`,
  `krs` dla podmiotów instytucjonalnych.

> **Prywatność**: dane z Dział II są publicznie dostępne na portalu MS, ale nie
> zapisuj pełnych PESEL-i / imion rodziców do artefaktów trwałych (pliki, logi, memory)
> — tylko do odpowiedzi w bieżącej konwersacji. Jeśli zapisujesz do pliku, zamaskuj
> PESEL do ostatnich 4 cyfr (`***-**-****`).

#### Dział III — Prawa, roszczenia i ograniczenia

Lista wpisów. Dla każdego:

- `lp`, `rodzaj_wpisu` (SŁUŻEBNOŚĆ / ROSZCZENIE / OSTRZEŻENIE / PRAWO DOŻYWOCIA / …),
- `tresc` (pełny tekst wpisu, łącznie z opisem ograniczenia),
- `osoba_uprawniona` (jeśli dotyczy),
- `podstawa_wpisu` (dokument, data, organ).

Jeśli dział pusty → zwróć `[]`.

#### Dział IV — Hipoteka

Lista hipotek. Dla każdej:

- `lp`, `rodzaj_hipoteki` (UMOWNA / PRZYMUSOWA / ŁĄCZNA),
- `suma` (kwota + waluta, np. `"400000.00 PLN"`),
- `wierzyciel` (nazwa banku / podmiotu),
- `zabezpieczona_wierzytelnosc` (opis — np. „kredyt mieszkaniowy nr X z dnia Y”),
- `oprocentowanie` jeśli podano,
- `termin_zaplaty` jeśli podano,
- `podstawa_wpisu`.

Jeśli dział pusty → zwróć `[]`.

### Etap 3 (opcjonalny, flaga `--geo`) — wzbogacenie przez ULDK GUGiK

Dla każdego identyfikatora działki (także wyciągniętego z `identyfikator lokalu` —
pierwsze segmenty przed `.1_BUD` to ID działki):

```bash
curl -s "https://uldk.gugik.gov.pl/?request=GetParcelById&id=<ID>&result=geom_wkt,teryt,voivodeship,county,commune,region,parcel"
```

- Z `geom_wkt` policz centroid (średnia współrzędnych) — lat/lon.
- Deep-link: `https://mapy.geoportal.gov.pl/imap/?identifyParcel=<ID>`

## Format wyjścia

Zawsze zwróć **oba**: strukturę JSON (w code block) + krótkie podsumowanie markdown.
Klucze pomijanych działów (np. gdy użytkownik ograniczył `--dzialy`) zwróć jako `null`,
pustych działów — jako `[]`. Odróżnia „nie pobrałem” od „brak wpisów”.

```json
{
  "kw": "WA1M/00123456/7",
  "sad": "Sąd Rejonowy dla Warszawy-Mokotowa, IX Wydział KW",
  "typ": "NIERUCHOMOŚĆ GRUNTOWA",
  "stan_z_dnia": "2026-04-21 18:18",
  "dzial_io": {
    "adres": {
      "wojewodztwo": "mazowieckie",
      "powiat": "Warszawa",
      "gmina": "Warszawa",
      "miejscowosc": "Warszawa",
      "dzielnica": "Mokotów",
      "ulica": "Puławska",
      "numer_budynku": "12",
      "numer_lokalu": null
    },
    "dzialki": [
      {
        "id": "146513_8.0123.45/6",
        "obreb": "0123 Mokotów",
        "numer": "45/6",
        "sposob_korzystania": "B — tereny mieszkaniowe",
        "powierzchnia": "0.0450 ha"
      }
    ],
    "lokal": null,
    "kw_gruntowa": null
  },
  "dzial_isp": [
    { "lp": "1", "rodzaj_prawa": "...", "tresc": "...", "wielkosc_udzialu": "..." }
  ],
  "dzial_ii": [
    {
      "lp": "1",
      "rodzaj_wpisu": "WŁAŚCICIEL",
      "udzial": "1/1",
      "typ_podmiotu": "OSOBA FIZYCZNA",
      "imiona_nazwisko": "JAN KOWALSKI",
      "imiona_rodzicow": "ADAM, EWA",
      "pesel": "12345678901"
    }
  ],
  "dzial_iii": [
    {
      "lp": "1",
      "rodzaj_wpisu": "SŁUŻEBNOŚĆ PRZESYŁU",
      "tresc": "...",
      "osoba_uprawniona": "...",
      "podstawa_wpisu": "..."
    }
  ],
  "dzial_iv": [
    {
      "lp": "1",
      "rodzaj_hipoteki": "UMOWNA",
      "suma": "400000.00 PLN",
      "wierzyciel": "BANK X S.A.",
      "zabezpieczona_wierzytelnosc": "kredyt mieszkaniowy nr ... z dnia ...",
      "oprocentowanie": "WIBOR 3M + 1.9%",
      "termin_zaplaty": null,
      "podstawa_wpisu": "..."
    }
  ],
  "geo": {
    "lat": 52.1942,
    "lon": 21.0254,
    "geoportalUrl": "https://mapy.geoportal.gov.pl/imap/?identifyParcel=146513_8.0123.45/6"
  }
}
```

Pole `geo` pomijaj (`null`) gdy użytkownik nie poda `--geo`.

## Fallback — tryb manualny

Jeśli Playwright MCP nie jest dostępny lub użytkownik odmówi rozwiązania CAPTCHA:

1. Zbuduj instrukcję z gotowym URL-em EKW i rozbitym numerem KW (kod/numer/cyfra).
2. Poproś użytkownika o wklejenie tekstu kolejnych działów z przeglądarki (po jednej
   zakładce naraz — oddzielnie I-O, I-Sp, II, III, IV).
3. Sparsuj wklejony tekst lokalnie i wykonaj Etap 3 (jeśli `--geo`).

## Checklist przed zwrotem wyniku

- [ ] Format KW zwalidowany regexem.
- [ ] Wszystkie pola adresu są non-null lub jawnie `null` (nie pomijaj kluczy).
- [ ] Każda działka ma `id` w formacie TERYT.
- [ ] Dla lokalu: `identyfikator lokalu` obecny + `kw_gruntowa` wypełniona.
- [ ] Pobrano wszystkie działy z listy `--dzialy` (domyślnie I-O, I-Sp, II, III, IV).
- [ ] Pusty dział → `[]`; pominięty dział → `null`.
- [ ] PESEL-e zamaskowane jeśli dane trafiają do pliku/artefaktu trwałego.
- [ ] Przy `--geo`: lat/lon w granicach PL (49–55°N, 14–24°E) — sanity check.
- [ ] Jedno zapytanie / 10 s na EKW — przy wielu KW wstaw `sleep`.

## Co ten skill **nie** robi

- Nie obchodzi CAPTCHA automatycznie.
- Nie integruje się z płatnymi API (ksiegiwieczyste.pl, ekw.plus).
- Nie pobiera treści zupełnej (historycznej) — tylko aktualna treść KW.
- Nie wysyła więcej niż 1 zapytania / 10 s do EKW.
- Nie redystrybuuje danych osobowych z Dział II poza odpowiedzią do użytkownika.
