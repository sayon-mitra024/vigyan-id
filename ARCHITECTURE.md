# VIGYAN.ID — Architecture

This document describes the system as implemented: a Next.js App Router application with Firebase Authentication, Firestore persistence, and server-only Ed25519/DID cryptography. It reflects the structure and behavior described in the project's own source layout (`src/app`, `src/components`, `src/lib`, `src/types`); if the live repository has since diverged, the code is authoritative.

## 1. High-level architecture

```mermaid
flowchart TD
  Student[Student] --> Auth[Firebase Authentication]
  Issuer[Institution Issuer] --> Auth
  Auth --> Dashboard[Role-based dashboard]
  Dashboard --> API[Next.js API routes]
  API --> Store[(Firestore)]
  API --> Crypto[Server-side DID + Ed25519 crypto]
  Crypto --> VC[Signed Verifiable Credential]
  VC --> Wallet[Student wallet]
  Wallet --> Verifier[Public verifier]
  Verifier --> VerifyAPI[Verification API]
  VerifyAPI --> Result[Verified / lifecycle result]
```

## 2. Authentication flow

```mermaid
sequenceDiagram
  participant U as User (student/issuer)
  participant B as Browser
  participant FA as Firebase Auth
  participant S as /api/auth/session
  participant D as Dashboard

  U->>B: Sign in
  B->>FA: Authenticate
  FA-->>B: ID token
  B->>S: Exchange token for session cookie
  S-->>B: Set session cookie
  B->>D: Load role-based dashboard
  D->>D: Render student or issuer portal
```

Demo mode bypasses Firebase Auth with isolated demo identities when Firebase is intentionally left unconfigured — it is explicit and not a fallback triggered by misconfiguration.

## 3. Student registration flow

```mermaid
sequenceDiagram
  participant St as Student
  participant API as /api/students
  participant F as Firestore
  participant Is as Issuer

  St->>API: Submit registration
  API->>F: Create student record (status: pending)
  Is->>API: Review via /api/students/verification
  API->>F: Update status (verified/rejected)
  API-->>St: Notify (optional Gmail)
```

## 4. Credential issuance flow

```mermaid
sequenceDiagram
  participant I as Issuer
  participant A as /api/credentials
  participant K as Server key store (lib/crypto)
  participant C as VC canonicalize/issue (lib/vc)
  participant F as Firestore
  participant H as Holder (student)

  I->>A: Issue request (student, credential data)
  A->>F: Validate holder + institution scope
  A->>C: Canonicalize credential payload
  C->>K: Request Ed25519 signature
  K-->>C: Signature
  C-->>A: Signed VC
  A->>F: Store credential + audit event
  A-->>H: Credential now visible in wallet
```

## 5. Credential verification flow

```mermaid
sequenceDiagram
  participant V as Verifier (public, no account)
  participant API as /api/verify
  participant C as VC verify (lib/vc)
  participant F as Firestore

  V->>API: Submit credential ID or JSON
  API->>F: Look up credential record (if ID)
  API->>C: Canonicalize + verify signature
  C-->>API: Signature valid/invalid
  API->>F: Check lifecycle status
  API-->>V: Result (active/revoked/superseded/expired/invalid)
```

## 6. Correction / reissuance flow

```mermaid
sequenceDiagram
  participant St as Student
  participant API as /api/corrections
  participant Is as Issuer
  participant C as VC issue
  participant F as Firestore

  St->>API: Submit correction request
  API->>F: Store request (status: pending)
  Is->>API: Review request
  alt Approved
    Is->>C: Issue new signed version
    C->>F: Store new credential (ACTIVE)
    API->>F: Mark previous version SUPERSEDED
  else Rejected
    API->>F: Mark request rejected
  end
```

Corrections never overwrite history — an approved correction creates a new signed record and marks the prior one superseded.

## 7. Credential lifecycle state machine

```mermaid
stateDiagram-v2
  [*] --> PENDING
  PENDING --> ACTIVE: issuer approves / issues
  ACTIVE --> REVOKED: issuer revokes
  ACTIVE --> SUPERSEDED: correction approved
  ACTIVE --> EXPIRED: validity period ends
  SUPERSEDED --> [*]
  REVOKED --> [*]
  EXPIRED --> [*]
```

## 8. Security / trust boundary diagram

```mermaid
flowchart LR
  subgraph Browser [Untrusted: Browser]
    UI[React components]
  end
  subgraph Server [Trusted: Next.js server]
    API[API routes]
    Auth[Session validation]
    Key[Issuer signing key - lib/crypto]
    Admin[Firebase Admin]
  end
  subgraph Cloud [Firebase]
    FA[Authentication]
    FS[(Firestore)]
  end

  UI -->|HTTPS, no secrets| API
  API --> Auth
  API --> Key
  API --> Admin
  Admin --> FS
  UI -.->|ID token only| FA
```

Private issuer key material and Firebase Admin credentials exist only inside the server boundary. The browser never receives signing keys, Admin credentials, or unfiltered Firestore access — every read/write goes through an API route that enforces session and role checks.

## 9. Data architecture

```mermaid
erDiagram
  USERS ||--o{ CREDENTIALS : holds
  USERS ||--o{ CORRECTIONS : submits
  CREDENTIALS ||--o{ CORRECTIONS : "subject of"
  CREDENTIALS ||--o{ AUDIT_EVENTS : generates
  USERS {
    string uid
    string role
    string institutionId
    string didKey
    string status
  }
  CREDENTIALS {
    string id
    string holderDid
    string issuerDid
    string status
    string version
    string signature
  }
  CORRECTIONS {
    string id
    string credentialId
    string status
    string requestedBy
  }
  AUDIT_EVENTS {
    string id
    string actorId
    string action
    string timestamp
  }
```

Exact field names and collection structure live in `src/lib/store` and `src/lib/vc/types.ts` — treat those types (and any deployed Firestore security rules) as the source of truth, not this diagram.

## 10. Deployment architecture

```mermaid
flowchart TD
  Dev[Developer] -->|git push| Repo[Git repository]
  Repo --> Build[Next.js build]
  Build --> Host[Next.js host - server + API routes]
  Host --> Secrets[Environment secrets: Firebase Admin, issuer key, Gmail]
  Host --> FirebaseProject[Firebase project]
  FirebaseProject --> FA[Authentication]
  FirebaseProject --> FS[Firestore + rules]
  FirebaseProject --> Storage[Storage + rules, where used]
```

Production deployment should include: managed secret storage (never `.env` files in the repo), restrictive Firestore/Storage rules, HTTPS everywhere, monitoring and alerting, backups, periodic issuer key rotation, rate limiting/abuse controls on public endpoints, and an independent security review before handling real institutional data.

## Component responsibilities

| Layer | Responsibility |
|---|---|
| `src/app` | Routes, layouts, loading states, API route handlers |
| `src/components` | Shared UI (`auth-provider`, `dashboard-shell`, `login-screen`, `ui-atoms`) and role portals (`issuer/issuer-portal`, `student/*`) |
| `src/lib/auth` | Session handling (`session.ts`), demo identity path (`demo.ts`) |
| `src/lib/firebase` | Client SDK config (`client.ts`) vs. Admin SDK config (`admin.ts`) — kept strictly separate |
| `src/lib/crypto` | Ed25519 key handling (`ed25519.ts`, `issuerKey.ts`) |
| `src/lib/vc` | Canonicalization, issuance, verification (`canonicalize.ts`, `issue.ts`, `verify.ts`) |
| `src/lib/store` | Firestore data access (`firestore.ts`) with an in-memory variant (`memory.ts`) for local/demo use |
| `src/lib/gmail` | Optional server-side email notifications (`send.ts`) |
| `src/types` | Shared domain types (`domain.ts`) |

## Known limitations

- No zero-knowledge proofs, BBS+ signatures, SD-JWT, or selective disclosure — roadmap items, not implemented.
- No decentralized/on-chain revocation registry; lifecycle status is authoritative in Firestore.
- `did:key` only — no external DID method resolution or interoperability layer yet.
- No independent security audit performed to date.

See [README.md](README.md) for setup instructions and feature overview.