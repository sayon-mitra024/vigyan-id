# VIGYAN.ID hackathon setup

Use real Firebase data for the demo. Never commit passwords, private keys, service-account JSON, or `.env.local`.

## Environment variables

Set the six `NEXT_PUBLIC_FIREBASE_*` client variables, the three server-only `FIREBASE_*` Admin variables, `ISSUER_ED25519_PRIVATE_KEY_HEX`, and:

```text
NEXT_PUBLIC_APP_URL=https://vigyan-id-iota.vercel.app
DEFAULT_INSTITUTION_ID=university-cu-up
DEFAULT_INSTITUTION_NAME=Chandigarh University
```

Keep Admin credentials and the issuer signing key server-only in Vercel. Never print their values.

## Institution

Create `institutions/university-cu-up` in Firestore:

```json
{
  "institutionId": "university-cu-up",
  "name": "Chandigarh University",
  "shortName": "CU",
  "officialEmailDomain": "<set the verified university domain>",
  "registrationNumber": "<set by the institution>",
  "address": "<set by the institution>",
  "status": "ACTIVE",
  "createdAt": "<ISO timestamp>",
  "updatedAt": "<ISO timestamp>"
}
```

Do not invent an official registration number or put real personal data in source control.

## First admin

Create an email/password Firebase Auth user manually. Then create `users/{adminUid}`:

```json
{
  "uid": "<admin Firebase UID>",
  "name": "<admin name>",
  "email": "<admin email>",
  "role": "ADMIN",
  "status": "ACTIVE",
  "institutionId": "university-cu-up",
  "did": "<admin DID>",
  "publicKeyMultibase": "<admin public key>",
  "createdAt": "<ISO timestamp>",
  "updatedAt": "<ISO timestamp>"
}
```

## Issuer provisioning

After logging in as the admin, call `POST /api/admin/provision-issuer`:

```json
{
  "institutionId": "university-cu-up",
  "institution": {
    "name": "Chandigarh University",
    "shortName": "CU",
    "officialEmailDomain": "<verified domain>",
    "registrationNumber": "<institution value>",
    "address": "<institution value>"
  },
  "issuer": {
    "name": "<issuer name>",
    "email": "<issuer@verified-domain>",
    "password": "<set manually; never store in Firestore>"
  }
}
```

The endpoint creates the Firebase Auth account and `ISSUER` profile server-side. It returns only the UID, institution ID, and role. Issuer passwords are never stored in Firestore.

## Student

Use the normal student registration form. New students receive `DEFAULT_INSTITUTION_ID` on the server only, after the institution exists and is `ACTIVE`.

## Demo placeholders

Keep actual values outside GitHub:

```text
ADMIN_EMAIL=<set manually>
ADMIN_PASSWORD=<set manually>
ISSUER_EMAIL=<set manually>
ISSUER_PASSWORD=<set manually>
STUDENT_EMAIL=<set manually>
STUDENT_PASSWORD=<set manually>
```

Deploy `firestore.rules` and `storage.rules` to the same Firebase project. Public verification uses the server API and does not require Firebase Authentication.

Supporting-document upload is not enabled by the current UI/API. Do not place documents in public storage or simulate successful uploads; implement the private upload/retrieval flow separately before relying on that feature.
