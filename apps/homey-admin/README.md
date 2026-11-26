# Homey admin inside SODFA

The admin routes and their UI come from `Hossam-Zahwo/HOMLY-` at commit
`b437e28e14115f7671b2fab530e010bd6c96467c`. The original Homey Supabase
project enforces admin access and row-level policies. This app uses Homey's
public client key and a separate Homey administrator session. Changes saved
from this app affect the same Homey store.

From the SODFA repository root, run `npm ci --prefix apps/homey-admin` and
`npm run build:homey-admin`. Open the Homey admin tab in the SODFA dashboard.
The bundle is built into `public/homey-admin/` during deployment.
