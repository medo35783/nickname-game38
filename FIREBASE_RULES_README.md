# Firebase Realtime Database Rules

This file documents the rules for the centralized question bank path:

```json
{
  "rules": {
    "question-bank": {
      ".read": "auth != null",
      ".write": "auth != null",
      ".indexOn": ["status"],
      "$questionId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    }
  }
}
```

## How To Apply

1. Open the Firebase Console.
2. Select this project.
3. Go to Realtime Database.
4. Open the Rules tab.
5. Copy the contents of `firebase-rules.json`.
6. Paste the rules into the editor.
7. Click Publish.

Important: the app reads the list from `question-bank/`, so the parent path must allow authenticated reads. If the parent has `".read": false`, Firebase will deny list reads even if `$questionId` allows reads.

## Current Admin Check

The current admin dashboard visibility is handled in the React component using:

```js
localStorage.getItem('pfcc_is_admin') === 'true'
```

This is only a client-side UI check. It can hide admin screens in the app, but it is not a complete security boundary by itself.

For now, the admin check is handled at the component level.

## Future Improvement

For production, full security enforcement should use Firebase Authentication with custom claims.

Recommended future flow:

1. Sign admins in with Firebase Auth.
2. Assign an admin custom claim on trusted backend code.
3. Update Realtime Database rules to allow admin writes only when the authenticated user has that custom claim.
4. Keep the local UI check only as a convenience layer, not as the source of security.
