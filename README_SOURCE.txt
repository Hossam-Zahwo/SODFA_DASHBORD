SODFA source bundle — inventory remaining balance update

Contains the src/ tree from the provided SODFA source archive. This update is limited to the MEME company inventory financial summary:
- The first red balance card now calculates original inventory value at cost minus completed payments assigned to the selected MEME / Meme Stor warehouse(s).
- A second red card beside it calculates sold inventory value at cost minus those same completed payments.
- Existing payment owner and warehouse filtering is preserved.
- No SQL changes are included or required for this display-only update.

Validation limits: ZIP integrity and source-level checks can be performed, but the uploaded archive contains only src/ and does not include package.json, lockfile, TypeScript config, or build config. A full project build/typecheck therefore cannot be run from this archive.
