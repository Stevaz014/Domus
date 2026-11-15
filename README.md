# Casa Inventario

Inventario domestico offline per iOS e Android. Organizza gli oggetti per luoghi annidati, ad esempio `Cucina > Credenza > Cassetto 1`, e ritrovali con la ricerca.

## Funzionalità

- Luoghi annidati con conteggio di sotto-luoghi e oggetti
- Aggiunta, modifica ed eliminazione di oggetti
- Quantità, note e foto persistenti
- Ricerca per nome, note o luogo
- Dati locali offline con SQLite
- Un solo codebase Expo per iOS e Android

## Sviluppo

```sh
npm install
npm start
```

Poi premi `i` per iOS oppure `a` per Android. Per il web:

```sh
npm run web
```

## Controlli

```sh
npm run lint
npm run typecheck
npm run typecheck:tests
npm test
npx expo-doctor
```

Le foto vengono copiate nella directory documenti dell'app, così non dipendono dalla cache temporanea del selettore immagini. Il database SQLite è locale al dispositivo e non viene inviato a un server.
