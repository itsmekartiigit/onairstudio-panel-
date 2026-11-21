<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/2c6ccc3b-c085-406e-b0e1-68524e29c7d7

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Firebase setup

The Studio uses the existing `wedding-app-on-air` Firebase project. Enable **Email/Password** in Firebase Authentication, create the demo user `demo@onairstudio.in` in the Firebase Console, and set its password there. Do not put the password in source code or a Vite environment variable.

Create the Firestore database and Storage bucket, then deploy the rules from the workspace root:

```sh
npx firebase-tools login
npx firebase-tools deploy --project wedding-app-on-air --only firestore:rules,storage,functions:new
```

The first successful Studio sign-in imports this browser's existing local data into the signed-in Firebase account. Subsequent edits are saved to Firestore. Event photos are uploaded to Storage and published to the event's guest gallery. Studio data is scoped to the signed-in Firebase UID; public guest event details and wishes follow the workspace rules.

Events and wallet transactions use the shared `studios/{uid}/events` and
`studios/{uid}/walletTransactions` Firestore collections. The admin panel reads
these collections live; event changes made by an administrator are reflected in
the Studio panel without a refresh.

To enable guest PIN login, open an event and select **Set PIN**. Set a unique
6-digit PIN and share it with guests. PINs are hashed and stored outside the
public event document; the Guest app validates them through the deployed
`setEventGuestPin` and `authenticateGuestEvent` Cloud Functions.
