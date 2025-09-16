# Estrella Traffic

This is a minimal starter implementing:
- Email/password auth with 110h session
- i18n (EN/RU/UK) via cookie
- Offers listing (active/archived/available)
- Tracking endpoint `/api/t?offerId=...&subid=...` that redirects to offer target
- Postback endpoint `/api/postback?secret=...&offerId=...&subid=...&type=REG|DEP|...&amount=12.34&currency=USD`
- Dashboard with today's counters and a clicks-by-hour chart
- Wallet page to store an address and list payouts (manual insert for now)

## Quick start

1. Install dependencies
   ```bash
   npm i
   ```

2. Copy `.env.example` to `.env.local` and edit values.

3. Start Postgres locally (or via Docker) and run:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. Run the app:
   ```bash
   npm run dev
   ```

5. Create your first user at `/register`, then login at `/login`.

## Admin / Offers
Insert offers via Prisma Studio:
```bash
npx prisma studio
```
or later build an admin page.

## Notes
- Geo country for clicks is left as TODO (plug in a GeoIP service).
- Wallet connect (Web3) is simplified to storing an address. You can later integrate wagmi/web3modal for signing & on-chain checks.
