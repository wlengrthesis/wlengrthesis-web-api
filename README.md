# Projekt inżynierski - Web API służące do analizy sentymentu

## Wymagania wstępne

Przed rozpoczęciem upewnij się, że masz zainstalowane następujące oprogramowanie:

- [Node.js](https://nodejs.org/en) w wersji 16 lub wyższej,
- jeden z następujących menadżerów pakietów: npm (instalowany razem z Node.js), [pnpm](https://pnpm.io/installation), [yarn](https://yarnpkg.com/getting-started/install).

## Instalacja projektu

Po pobraniu bądź sklonowaniu repozytorium wpisz w konsoli w ścieżce projektu następującą komendę:

```bash
$ npm install
```

lub

```bash
$ pnpm install
```

lub

```bash
$ yarn
```

## Start aplikacji

Aby uruchomić aplikację wpisz komendę:

```bash
$ npm run start
```

lub

```bash
$ pnpm run start
```

lub

```bash
$ yarn start
```

API będzie dostępny w przeglądarce pod adresem: [localhost:4000](http://localhost:4000)

## Testy

W celu przetestowania aplikacji zarejestruj nowego użytkownika używając endpointu *auth/signup*.

Wpisz w **Request Body** dane w następującym formacie:

```json
{
    "email": "test1@test.com",
    "password": "test1",
    "firstName": "Test1",
    "lastName": "Test1"
}
```
Po poprawnej rejestracji serwer zwróci token dostępu i token odświeżania. Użyj tokenu dostępu *access_token* w celu autoryzacji klikając w przycisk *Authorize*.

### Predykcja sentymentu

Użyj endpointu *sentiment-analysis/predict* z **Request body**:

```json
{
  "text": "I am not happy"
}
```

### Trenowanie modelu

Użyj endpointu *sentiment-analysis/train*.
Jeśli serwer zwróci informację: *Cannot train model on production server. Use localhost instead*, stwórz plik .env w głównym katalogu projektu, dodając następującą linie:

`NODE_ENV="development"`

 W konsoli pojawi się informacja o warstwach sieci neuronowej i uruchomi się trening.

Predykcję sentymentu można przetestować również pod adresem: [wlengrthesis-web-api.onrender.com](https://wlengrthesis-web-api.onrender.com).
Trening modelu ze względu na swoją złożoność obliczeniową w aplikacji online jest wyłączony.
