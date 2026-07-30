# Faza 6: Panel klienta — ustawienia i polish

## Cel

Uzupełnienie panelu klienta (rodzica) o ustawienia powiadomień oraz poprawki UI w istniejących widokach.

## Stan obecny

### Co już istnieje
- ✅ `/moje-zajecia` — pełny panel klienta: aktywne rezerwacje, kredyty, zakupy, oceny, notatki
- ✅ `/zapisy/[groupTypeSlug]` — pełny flow rejestracji
- ✅ `/karta/[groupTypeSlug]` — karta kwalifikacyjna
- ✅ `/moje-konto` — logowanie klienta
- ✅ `notification_event_type` tabela — typy powiadomień
- ✅ `notification_preference` tabela — preferencje per user
- ✅ `src/features/notifications/actions.ts` — akcje powiadomień
- ❌ Brak UI do zarządzania preferencjami powiadomień przez klienta

### Czego brakuje
- ❌ Strona ustawień powiadomień dla klienta
- ❌ Link do ustawień z panelu klienta

---

## 6a. Ustawienia powiadomień klienta (`/moje-konto/ustawienia` lub `/moje-zajecia/ustawienia`)

### Backend (już istnieje)
- `notification_event_type` — definicje typów: `code`, `label`, `defaultChannels`
- `notification_preference` — `(userId, eventTypeCode, channel, enabled)`
- Akcje server: get/set preferences

### Zakres frontendu

**Strona ustawień powiadomień:**

Nagłówek: "Ustawienia powiadomień"

Sekcje zgrupowane tematycznie (kategorie z `src/features/emails/categories.ts`):

1. **Rezerwacje i zajęcia**
   - Przypomnienie o zajęciach (checkbox)
   - Zmiana terminu zajęć (checkbox)
   - Odwołanie zajęć (checkbox)
   - Potwierdzenie zapisu (checkbox)

2. **Płatności i kredyty**
   - Przypomnienie o wygasających kredytach (checkbox)
   - Potwierdzenie płatności (checkbox)
   - Faktura dostępna (checkbox)

3. **Wnioski i zmiany**
   - Zmiana grupy — zatwierdzona (checkbox)
   - Zmiana grupy — odrzucona (checkbox)
   - Lekcja indywidualna — potwierdzona (checkbox)
   - Lekcja indywidualna — odrzucona (checkbox)

4. **Karty kwalifikacyjne**
   - Przypomnienie o karcie kwalifikacyjnej (checkbox)

Każdy wiersz:
- Label (nazwa powiadomienia)
- Switch — wł/wyłącz
- Opcjonalnie: wybór kanału (email / SMS) — jeśli dostępne

Przycisk "Zapisz ustawienia" — zapisuje całość.

Toast po zapisie: "Ustawienia powiadomień zostały zapisane."

### Komponenty shadcn/ui
- `Switch` (z Fazy 0) — przełączniki wł/wyłącz
- `Checkbox` (z Fazy 0) — alternatywnie
- `Card` (już istnieje) — grupowanie sekcji
- `Separator` (z Fazy 0) — między sekcjami

### DoD
- [ ] Klient widzi listę wszystkich typów powiadomień
- [ ] Każde powiadomienie ma Switch wł/wyłącz
- [ ] Ustawienia są wczytywane z `notification_preference`
- [ ] Przycisk "Zapisz" persistuje zmiany
- [ ] Default: wszystkie włączone (zgodnie z `defaultChannels` w definicji typu)
- [ ] Link do ustawień dostępny z panelu `/moje-zajecia`

---

## 6b. Poprawki UI w istniejących widokach klienta

### `/moje-zajecia` — poprawki

- [ ] **Nagłówek z powitaniem:** "Witaj, [Imię]" zamiast surowego tytułu
- [ ] **Link do ustawień:** ikona zębatki / "Ustawienia" w nagłówku
- [ ] **Lepsze empty states:** zamiast pustych tabel — ilustracja + tekst
  - Brak rezerwacji: "Nie masz jeszcze żadnych zajęć. [Przeglądaj ofertę]"
  - Brak kredytów: "Nie masz aktywnych kredytów."
  - Brak ocen: "Brak ocen do wyświetlenia."
- [ ] **Mobile:** karty zamiast tabeli na małych ekranach

### `/zapisy/[groupTypeSlug]` — flow rejestracji

- [ ] Wskaźnik kroków (Stepper): Krok 1/4 → 2/4 → 3/4 → 4/4
- [ ] Lepsze komunikaty błędów (zamiast generic "error")

### `/moje-konto` — logowanie

- [ ] Stan po zalogowaniu — przycisk "Przejdź do moich zajęć" zamiast formularza

### Komponenty
- Większość już istnieje. Użycie `Card`, `Badge`, `Button`.

---

## Definition of Done (całość Fazy 6)

- [ ] Strona ustawień powiadomień klienta działa
- [ ] Switch zapisuje preferencje per typ powiadomienia
- [ ] Ustawienia persistują między sesjami
- [ ] Link do ustawień z `/moje-zajecia`
- [ ] Poprawione empty states w panelu klienta
- [ ] Powitanie z imieniem w panelu klienta
- [ ] Mobile: karty zamiast tabel
- [ ] Wszystkie teksty w i18n

---

## Testy

### Unit (Vitest)
- [ ] `getNotificationPreferences` — zwraca preferencje dla klienta
- [ ] `setNotificationPreference` — zapisuje pojedynczą preferencję
- [ ] `setNotificationPreferences` — batch update

### E2E (Playwright)
- [ ] Klient: wchodzi w ustawienia → widzi listę powiadomień
- [ ] Klient: wyłącza Switch → zapisuje → odświeża → Switch jest wyłączony
- [ ] Klient: z `/moje-zajecia` klika w "Ustawienia" → przechodzi do ustawień
- [ ] Mobile: karty zamiast tabeli na `/moje-zajecia`
- [ ] Empty state: klient bez rezerwacji widzi odpowiedni komunikat

### Manualne QA
- [ ] Ustawienia na mobile
- [ ] Switch działa na dotyk
- [ ] Zapisywanie preferencji bez przeładowania strony

---

## Zależności

- **Faza 0** — komponenty shadcn/ui (Switch, Checkbox, Separator)
- **Faza 1** — sidebar (do nawigacji — opcjonalnie, klient nie używa sidebaru)

## Pliki do utworzenia / zmiany

| Plik | Akcja |
|------|-------|
| `src/app/[locale]/(site)/moje-konto/ustawienia/page.tsx` | **Nowy** — ustawienia powiadomień |
| `src/app/[locale]/(site)/moje-konto/ustawienia/notification-settings.tsx` | **Nowy** — formularz |
| `src/app/[locale]/(site)/moje-zajecia/page.tsx` | **Zmiana** — powitanie, link do ustawień, empty states |
| `src/app/[locale]/(site)/moje-konto/page.tsx` | **Zmiana** — przycisk po zalogowaniu |
| `messages/pl.json` | Nowe klucze |
| `messages/en.json` | Nowe klucze |

## Szacowany nakład

1–2 dni — głównie frontend, backend już istnieje.
