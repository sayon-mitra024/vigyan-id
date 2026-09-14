# VIGYAN.ID

![VIGYAN.ID](public/v_logo.png)

**Issue. Own. Share. Verify.** A sovereign academic identity and verifiable credential wallet.

## Hackathon

- **Hack2Innovate 2026 — 24H Grand Finale Hackathon**
- Team: **Vigyan**
- Problem Statement: **PS-23 — Decentralized Identity (DID) & Verifiable Credentials**
- Track: **Blockchain & Web3 Security**
- Developer: **Sayon Mitra**

This is a hackathon prototype entry, not an official endorsement by Hack2Innovate. The event reference is [Hack2Innovate 2026](https://www.quickhealctf.com/).

## The problem

Academic credentials are often distributed as paper or PDF documents that are difficult to authenticate at scale. Verification may require manual contact with the issuing institution, while students have limited control over how their records are stored and shared. VIGYAN.ID focuses on a narrower, verifiable workflow: a trusted issuer signs a credential once, the student holds and shares it, and anyone can independently check its signature and current lifecycle status.

## How it works

```text
Student registration → Institution verification → DID identity
  → Credential issuance → Student wallet → Share credential
  → Public verification → Cryptographic check → Lifecycle status
```

1. Registration creates a student profile and an Ed25519-backed `did:key` identity.
2. A provisioned institution issuer reviews and approves the student.
3. The server canonicalizes and signs an academic credential with issuer key material.
4. The signed credential appears in the student's wallet.
5. The student shares a credential ID or downloaded JSON document.
6. A public verifier checks the signature, issuer trust, canonical payload, and lifecycle state without an account.

## Feature summary

- **Identity:** Ed25519 `did:key` generation and student/issuer role separation.
- **Credentials:** Signed issuance, append-only correction versions, revocation, and expiry handling.
- **Verification:** Public lookup by credential ID or raw JSON, tamper detection, and issuer-trust validation.
- **Student wallet:** Credential list/detail views, downloadable JSON/certificate artifacts, and shareable verification links.
- **Institution workflow:** Student approval, issuer provisioning, correction review, reissuance, revocation, and audit logging.
- **Notifications:** Optional server-side Gmail notifications for registration, issuance, correction, and revocation events.

## Overview

VIGYAN.ID gives students an institution-backed decentralized identifier, a personal credential wallet, and a public verification link. Issuers can verify students, issue signed credentials, review corrections, and revoke credentials. Public verifiers can check a credential without an account.

The implementation is built around the W3C DID Core and Verifiable Credentials standards. It does not claim formal W3C certification or conformance.

## Features

- Firebase Authentication with student and provisioned issuer roles
- `did:key` identities using Ed25519 keys
- Signed academic credentials with append-only versioning
- Student wallet and credential detail views
- Public verification of credential JSON or credential ID
- Active, revoked, superseded, expired, and invalid outcomes
- Correction review and reissuance workflow
- Institution-scoped Firestore persistence and audit fields
- Optional Gmail notifications for registration and issuance events

## Architecture

Next.js App Router provides the UI and API routes. Client components call server-side routes; Firebase Admin, issuer private keys, signing, and verification remain server-side. Firestore stores profiles, credential records, corrections, and audit data; Firebase Storage is available for file-backed workflows. See [ARCHITECTURE.md](ARCHITECTURE.md) for data flow, trust boundaries, and Mermaid diagrams.

## Technology

Next.js, React, TypeScript, Tailwind CSS, Firebase Authentication, Firestore, Firebase Admin SDK, Ed25519, `jose`, and W3C-oriented DID/VC data structures.

## Local development

1. Install Node.js 20+.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local` and provide the Firebase and optional email values.
4. Run `npm run dev`.
5. Visit `http://localhost:3000`.

Useful checks: `npm run typecheck`, `npm run lint`, and `npm run build`.

## Environment variables

See [.env.example](.env.example). Public Firebase browser settings use `NEXT_PUBLIC_` variables. Firebase Admin credentials and issuer signing material are server-only and must never be exposed to the browser. Demo mode is available when Firebase is intentionally unconfigured.

## Security and privacy

Private keys are kept out of client bundles; API routes enforce session and role checks. Credential verification validates the signed payload and current lifecycle state. Firestore and Storage rules provide an additional boundary. Production deployments should use managed secrets, key rotation, rate limiting, monitoring, backups, and an independent security review. The prototype does not implement zero-knowledge proofs, BBS signatures, SD-JWT, selective disclosure, or a decentralized revocation registry.

## Project structure

`src/app` contains routes and API handlers; `src/components` contains the existing portals and reusable UI; `src/lib/auth`, `firebase`, `crypto`, `vc`, and `store` contain server/client-separated domain logic; `public` contains browser-served brand assets; `docs` contains setup notes.

## Limitations and future work

Future work includes hardware-backed key storage, stronger key recovery, interoperable external registries, selective disclosure, decentralized status publishing, richer test vectors, and formal conformance/security testing.

## License and credits

Hackathon prototype by **Sayon Mitra / Team Vigyan**. No separate open-source license has been declared yet; add one before external redistribution.
