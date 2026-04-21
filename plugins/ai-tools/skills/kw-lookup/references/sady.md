# Mapa kodów wydziałów KW → sąd rejonowy

Pierwsze 4 znaki numeru KW (np. `WA1M`) identyfikują wydział ksiąg wieczystych konkretnego
sądu rejonowego. Pełna, aktualna lista: [Ministerstwo Sprawiedliwości — wykaz kodów wydziałów KW](https://przegladarka-ekw.ms.gov.pl/eukw_prz/KsiegiWieczyste/wyszukiwanieKW).

## Najczęstsze kody (wybrane)

| Kod    | Sąd rejonowy                                         |
| ------ | ---------------------------------------------------- |
| WA1M   | Warszawa-Mokotów, IX Wydział KW                      |
| WA1P   | Pruszków, VI Wydział KW                              |
| WA2M   | Warszawa-Mokotów, XV Wydział KW                      |
| WA3M   | Warszawa-Mokotów, X Wydział KW                       |
| WA4M   | Warszawa-Mokotów, XIII Wydział KW                    |
| WA5M   | Warszawa-Mokotów, VII Wydział KW                     |
| KR1P   | Kraków-Podgórze, IV Wydział KW                       |
| KR2K   | Kraków-Krowodrza, VI Wydział KW                      |
| KR1I   | Kraków-Nowa Huta, IV Wydział KW                      |
| PO1P   | Poznań-Stare Miasto, VI Wydział KW                   |
| PO2P   | Poznań-Stare Miasto, V Wydział KW                    |
| GD1G   | Gdańsk-Północ, III Wydział KW                        |
| GD1Y   | Gdynia, V Wydział KW                                 |
| WR1K   | Wrocław-Krzyki, IV Wydział KW                        |
| WR1F   | Wrocław-Fabryczna, IV Wydział KW                     |
| LD1M   | Łódź-Śródmieście, XVI Wydział KW                     |
| SZ1S   | Szczecin-Prawobrzeże i Zachód, X Wydział KW          |
| KA1K   | Katowice, XI Wydział KW                              |
| LU1I   | Lublin-Zachód, X Wydział KW                          |
| BY1B   | Bydgoszcz, X Wydział KW                              |

## Jak interpretować kod

- **2 litery**: województwo / obszar (WA = warszawski, KR = krakowski, PO = poznański...)
- **1 cyfra**: numer kolejny wydziału w obrębie sądu (1, 2, 3...)
- **1 litera**: kod miasta/dzielnicy (M = Mokotów, P = Pruszków/Poznań, K = Krowodrza/Krzyki...)

Dla kodów spoza tej tabeli: zwróć `sad: null` w JSON i dodaj notkę w markdown, że nie udało
się zmapować kodu wydziału — treść umowy sądu i tak jest obecna na stronie EKW po pobraniu
Dział I-O.
