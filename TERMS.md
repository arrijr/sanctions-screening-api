# Terms of Service — Sanctions & PEP Screening API

**Last updated:** 2026-04-23
**Provider:** Arthur Richelhof (arrijr)
**Contact:** richelhofarthur@gmail.com

---

## 1. Acceptance

By subscribing to or using the Sanctions & PEP Screening API ("the Service") via RapidAPI, you agree to these Terms. If you do not agree, do not use the Service.

## 2. Service description

The Service screens names of persons and companies against global sanctions lists and PEP (Politically Exposed Persons) databases, including OFAC SDN, EU Consolidated Sanctions, UN Security Council, UK OFSI, Interpol, and 100+ additional sources. It returns fuzzy-matched results with a normalized score and verdict.

## 3. No legal, compliance, or financial advice

**Results are provided for informational and technical purposes only and do not constitute legal, regulatory, compliance, or financial advice.** You are solely responsible for interpreting results, applying appropriate thresholds, and satisfying your regulatory obligations. The Service is not a substitute for consulting a licensed compliance, legal, or financial professional.

## 4. Not a complete AML/KYC/KYB solution

Sanctions screening is one component of AML, KYC, and KYB workflows. This Service does **not** perform beneficial ownership verification, identity document checks, adverse media screening, or any other compliance procedure beyond the scope of the described endpoints. You remain solely responsible for meeting all applicable regulatory requirements.

## 5. Data accuracy and upstream dependencies

Screening data is retrieved from OpenSanctions (`api.opensanctions.org`), which aggregates official government-published sanctions lists. Data may have propagation delays following updates to source lists. No representation is made that results are exhaustive or current at every moment. A `no_match` verdict does not guarantee an entity is not sanctioned on lists not covered by OpenSanctions. A `strong_match` or `possible_match` verdict does not constitute a finding of wrongdoing — always perform additional verification before taking adverse action.

## 6. Acceptable use

You agree not to:
- Use the Service to take automated adverse action against individuals without human review.
- Reverse-engineer, scrape, or attempt to access the Service outside the RapidAPI gateway.
- Resell or republish the underlying screening dataset as a competing service.
- Use the Service for any unlawful purpose.
- Exceed published rate limits or circumvent authentication.

Violation may result in immediate termination without refund.

## 7. Service availability

We target high availability but make no uptime guarantees. Unavailability of the OpenSanctions upstream API may cause the Service to return `503 SERVICE_UNAVAILABLE`.

## 8. Disclaimer of warranties

THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, ACCURACY, COMPLETENESS, OR NON-INFRINGEMENT.

## 9. Limitation of liability

TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL THE PROVIDER BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, DATA, OR GOODWILL, ARISING FROM OR RELATED TO YOUR USE OF THE SERVICE — INCLUDING BUT NOT LIMITED TO DECISIONS MADE ON THE BASIS OF SCREENING RESULTS — EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. AGGREGATE LIABILITY SHALL NOT EXCEED AMOUNTS PAID IN THE 12 MONTHS PRECEDING THE CLAIM.

## 10. Indemnification

You agree to indemnify and hold harmless the provider from any claim arising out of your use of the Service, including adverse actions taken against persons or entities based on screening results.

## 11. Termination

Either party may terminate at any time via RapidAPI's cancellation flow. Sections 3–5, 8, 9, and 10 survive termination.

## 12. Governing law

These Terms are governed by the laws of Germany. Disputes shall be resolved in the courts of Germany.

## 13. Changes

We may update these Terms. Continued use after an update constitutes acceptance.

## Contact

Arthur Richelhof — richelhofarthur@gmail.com
