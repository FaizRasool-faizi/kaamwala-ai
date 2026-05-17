# Firebase Setup Guide — KaamWala AI

The `CONFIGURATION_NOT_FOUND` error occurs because **Firebase Authentication** has not been enabled or the **Email/Password** sign-in provider has not been configured in the Firebase Console for your project `ai-sales-engine-490611`.

To fix this error, you need to enable and configure the three Firebase services that our client application relies on:
1. **Firebase Authentication** (to authenticate experts and customers).
2. **Cloud Firestore** (to store profiles, location coordinates, and metadata).
3. **Firebase Storage** (to upload profile photos and ID Card/CNIC images).

Follow the steps below to set them up:

---

## 🛠️ Step 1: Enable Firebase Authentication & Email/Password

This is the direct fix for the `CONFIGURATION_NOT_FOUND` error.

1. Go to the **[Firebase Console](https://console.firebase.google.com/)**.
2. Select your project: **`ai-sales-engine-490611`**.
3. In the left-hand menu, under **Build**, click on **Authentication**.
4. If you see a **Get Started** button, click it to initialize Authentication.
5. Navigate to the **Sign-in method** tab.
6. Click on **Add new provider** (or select **Email/Password** from the list).
7. Under **Email/Password**:
   - Toggle **Enable** to **ON**.
   - (Optional) You can leave *Email link (passwordless sign-in)* turned **OFF**.
8. Click **Save**.

---

## 📂 Step 2: Initialize Cloud Firestore

Once authentication succeeds, the registration form writes the expert's profile data to Firestore. If Firestore is not enabled, your app will throw a Firestore permission/database error.

1. In the left-hand menu, under **Build**, click on **Firestore Database**.
2. Click **Create database**.
3. Choose your database location (select a location closest to you or your users, e.g., `nam5 (us-central)` or `asia-south1`).
4. Click **Next**.
5. Select **Start in test mode** for local development (which allows read/write access), or **Start in locked mode**.
   *Note: If you start in locked mode, you will need to update your Firestore rules to allow writes to `/experts/{expertId}`.*
6. Click **Create** and wait a few seconds for the database to provision.

---

## 🖼️ Step 3: Initialize Cloud Storage

The registration form requires experts to upload a profile photo, which is stored in Firebase Storage. Without Storage enabled, registration will fail during the upload step.

1. In the left-hand menu, under **Build**, click on **Storage**.
2. Click **Get Started**.
3. Choose **Start in test mode** (allows local uploads without strict authentication checks initially).
4. Click **Next**.
5. Choose your Storage bucket location (it should match your Firestore/GCP region).
6. Click **Done** and wait for the storage bucket to be created.

---

## 🔍 Step 4: Verify Your `.env.local` Config

Ensure the keys in your `client/.env.local` match your Firebase project exactly. They should look like this:

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyB-2O4g3zdAMUXgEfAMfzTySWCfhFgJkzI

NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBe1kznN1vVN1CaoA88Uaq35EOERSvUZk4
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=ai-sales-engine-490611.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=ai-sales-engine-490611
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=ai-sales-engine-490611.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=711374931404
NEXT_PUBLIC_FIREBASE_APP_ID=1:711374931404:web:11d3edbff1bef94b7c0969
```

Next.js reloads changes in `.env.local` automatically. If in doubt, stop your terminal and run `npm run dev` again to ensure the environment variables are fresh.
