# Privacy Policy — Sanctions & PEP Screening API

**Last updated:** 2026-04-23
**Provider:** Arthur Richelhof (arrijr)
**Contact:** richelhofarthur@gmail.com

---

## What data we collect

This API screens names of persons and companies against global sanctions lists and PEP databases using OpenSanctions. We collect **the minimum data required to operate the service**:

| Data | Purpose | Retention |
|---|---|---|
| IP address | Rate limiting (sliding window) | 30 days (rolling window only) |
| RapidAPI user identifier (`x-rapidapi-user` header) | Rate limiting per subscription | 30 days (rolling window only) |
| RapidAPI proxy secret header | Authentication | Not stored |
| Submitted name + optional parameters | Forwarded to OpenSanctions for matching | Not stored beyond the request |

We do **not** collect, log, or persist:
- Full request bodies or response bodies
- Screening results
- Cookies or tracking identifiers

## How we process data

- Rate-limiting state is stored in **Upstash Redis** (EU region, `fra1`) with automatic expiry.
- Infrastructure is hosted on **Vercel** (EU region, `fra1`) and **Upstash** (EU).
- Submitted names are forwarded to the **OpenSanctions API** (`api.opensanctions.org`) for fuzzy matching. OpenSanctions processes these requests under its own privacy policy.
- No analytics, no tracking pixels, no third-party scripts.

## Data sources

Sanctions and PEP data is retrieved from the OpenSanctions API:
- **OpenSanctions:** `https://api.opensanctions.org` — aggregates 100+ official government sanctions lists. Data is CC0 (public domain).

## Legal basis (GDPR)

- **Rate limiting (IP / user ID):** legitimate interest (Art. 6(1)(f) GDPR) — protecting the service from abuse.
- **Name forwarding to OpenSanctions:** legitimate interest (Art. 6(1)(f) GDPR) — names submitted for screening are public-record references required to perform the requested compliance check.

## Your rights

Rate-limiting data is purged automatically within 30 days. If you believe a specific entry should be purged, contact us at richelhofarthur@gmail.com and we will clear it within 72 hours.

## Subprocessors

- **RapidAPI (RapidAPI Inc., USA)** — API gateway; see RapidAPI's own privacy policy.
- **Vercel Inc. (USA, EU region)** — hosting.
- **Upstash Inc. (EU region)** — rate-limiting storage.
- **OpenSanctions (opensanctions.org)** — upstream sanctions and PEP data source.

## Changes

Material changes will be reflected in this document and the `Last updated` date.

## Contact

Arthur Richelhof — richelhofarthur@gmail.com
