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

## Build installabili per Android e iOS

Le build cloud usano [EAS Build](https://docs.expo.dev/build/introduction/). Serve un account Expo; per iOS serve inoltre un account Apple Developer per firmare la build. EAS può gestire le credenziali di firma guidandoti durante il primo build.

Installa e autentica EAS CLI:

```sh
npm install --global eas-cli
eas login
eas project:init
```

### Android: APK installabile

Il profilo `preview` produce un APK installabile direttamente su dispositivi Android. Avvia la build con:

```sh
eas build --platform android --profile preview
```

Al termine EAS mostra un URL per scaricare l'APK. Trasferiscilo sul telefono, abilita l'installazione da questa sorgente quando richiesto da Android e aprilo. Per pubblicare sul Play Store usa il profilo `production`, che produce un Android App Bundle:

```sh
eas build --platform android --profile production
```

### iOS: build installabile

Per un dispositivo iOS usa il profilo `preview` (distribuzione interna/ad hoc). Durante la prima build EAS chiederà di configurare certificato e provisioning profile Apple:

```sh
eas build --platform ios --profile preview
```

L'installazione ad hoc richiede che il dispositivo sia registrato nel provisioning profile. Per App Store/TestFlight usa il profilo `production`:

```sh
eas build --platform ios --profile production
```

Le build iOS non sono file `.ipa` liberamente installabili su qualsiasi iPhone: devono essere firmate e distribuite tramite TestFlight/App Store oppure ad hoc sui dispositivi registrati.

### Controlli

```sh
npm run lint
npm run typecheck
npm run typecheck:tests
npm test
npx expo-doctor
```

Le foto vengono copiate nella directory documenti dell'app, così non dipendono dalla cache temporanea del selettore immagini. Il database SQLite è locale al dispositivo e non viene inviato a un server.
