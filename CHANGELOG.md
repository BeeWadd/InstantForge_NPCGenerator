# Changelog

## Unreleased - Privacy and measurement foundation

- Added opt-in analytics consent with equally prominent Allow and Decline choices plus persistent Privacy settings and cookie-clearing revocation.
- Added a build-time analytics switch that is disabled when required configuration is absent.
- Limited measurement to five content-free allowlisted events and added network/payload regression coverage.
- Removed external Google Fonts so no Google request occurs before analytics consent.
- Added the owner-only GA4 property checklist in `docs/analytics-property-owner-checklist.md`.
