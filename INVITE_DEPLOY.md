# Permanent access setup (invite-only + easy link)

## 1) Set your invite key
Create a long secret value and set `INVITE_KEY` in your deployment environment.

Example:
`INVITE_KEY=9c4f7a1d...`

## 2) Deploy publicly (recommended: Vercel)
- Import this repo in Vercel
- Add environment variable: `INVITE_KEY`
- Deploy

## 3) Share one invite URL in Gmail
Use one link format for invited users:

`https://your-domain.com/?invite=YOUR_INVITE_KEY`

When they open it once, the app stores an access cookie for 10 years on that device.
After that, they can open `https://your-domain.com` directly.

## 4) Multi-device behavior
- Works on phone, laptop, and iPad
- First visit per device should use invite URL
- Future visits on same device do not require invite query

## 5) Important for Gmail links
- Do not use localhost links in Gmail for cross-device access.
- Use your deployed HTTPS domain link in Gmail (for example Vercel/custom domain).
- Localhost only works on the same machine where the dev server is running.

## 6) Rotate access if needed
Change `INVITE_KEY` in your deployment env and redeploy.
Old invite links stop working.
