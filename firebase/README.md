# Firebase setup (KaamWala AI)

1. Create a project at [Firebase Console](https://console.firebase.google.com/).
2. Add a **Web app** and copy config values into `client/.env.local` (see `client/.env.local.example`).
3. **Authentication** → Sign-in method → enable **Email/Password** and **Google**.
4. **Firestore Database** → Create database (production mode) → deploy rules:
   ```bash
   firebase deploy --only firestore:rules
   ```
5. **Storage** → Get started → deploy rules:
   ```bash
   firebase deploy --only storage
   ```
6. Restart the Next.js dev server after changing `.env.local`.

Collections used:

- `experts/{uid}` — expert profiles (document id = Firebase Auth uid)

Storage paths:

- `experts/{uid}/profile.*` — required profile photo
- `experts/{uid}/id-card.*` — optional ID card
