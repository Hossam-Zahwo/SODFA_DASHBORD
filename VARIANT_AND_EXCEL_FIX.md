# Variant inheritance and Excel import fixes

- New variants inherit title, description, keywords, category and parent attributes by default.
- Variant-specific overrides take precedence.
- Saving a new variant now passes the selected warehouse required by the API.
- Parent changes are reflected in inherited variant snapshots when saving, while local overrides remain untouched.
- Excel preview and import use all parsed rows; no 20-row or preview-row cap is used.
- Excel RPC batching remains transport-safe and imports every parsed row.
