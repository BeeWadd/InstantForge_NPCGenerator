# InstantForge Analytics Property Owner Checklist

This repository cannot enforce Google Analytics property administration settings. Complete and record this checklist in the release PR before enabling production analytics.

- [ ] Set event- and user-level data retention to the minimum period approved by the product owner.
- [ ] Keep Google Signals disabled.
- [ ] Keep Google Ads links, advertising features, remarketing, ad personalization, and ad-user-data collection disabled.
- [ ] Keep cross-domain measurement disabled; no linker domains should be configured.
- [ ] Confirm no user ID, custom dimensions, audience, or data import is configured to receive generated, saved, searched, imported, or exported content.
- [ ] Restrict property access to approved owners and document the reviewer/date in the draft PR.

The application also enforces `ad_storage`, `ad_user_data`, `ad_personalization`, Google Signals, ad-personalization signals, automatic page views, and inbound cross-domain linking as disabled. If a property setting conflicts with this checklist, leave the build-time analytics switch disabled until it is corrected.
