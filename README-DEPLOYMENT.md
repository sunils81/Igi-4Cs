# IGI Diamond 4Cs Public Quiz — Deployment Handover

Prepared for the IGI IT team, 14 October 2026.

## What this is

A **static website** — plain HTML, CSS and JavaScript. There is no build step, no
Node/npm install, no server-side runtime and no database on the web server. Copy the
files to a web root and it runs.

Form submissions are sent to a **Google Apps Script web app**, which writes them to a
Google Sheet. That script is in `backend/` and is deployed inside Google, not on this
server.

## Files

```
index.html                  the quiz page
privacy.html                privacy notice, linked from the consent checkbox
assets/css/styles.css
assets/js/app-public.js
assets/images/igi-logo-white.png
backend/google-apps-script.gs     Google Apps Script — NOT served by the web server
```

Serve the folder so that `index.html` is the document root. `privacy.html` must be
reachable at `/privacy.html` relative to it, because the consent checkbox links there.

Do not publish `backend/` to the web. It is included here only so you have the script
under version control; its code runs inside Google Apps Script.

## Requirements

- Any static web server (Apache, nginx, IIS, S3+CloudFront, or similar)
- **HTTPS is required.** The page collects name, email and mobile number
- No PHP, Python, Node or database needed

## Configuration to check

| Where | Setting | Current value |
|---|---|---|
| `assets/js/app-public.js` | `GAS_WEB_APP_URL` | Google Apps Script `/exec` URL |
| `assets/js/app-public.js` | `QUIZ_URL` | `https://learn.igi.org/diamonds/` — used in share links; update if the public URL changes |
| `assets/js/app-public.js` | `CONSENT_VERSION` | `dpdp-quiz-v1-2026-10` — do not change without changing the consent wording |
| `assets/js/app-public.js` | `EMAILJS_*` | EmailJS service/template/public key, for the one-time email code |
| `backend/google-apps-script.gs` | `SHEET_ID` | `1j-0WedUUfEujVz-IDEQ9-r9v9tTncOqYHIL8MyoI6aQ` |

If the Apps Script is ever redeployed, its new `/exec` URL must be pasted back into
`GAS_WEB_APP_URL` in `assets/js/app-public.js`.

## Third-party services this page calls

The page loads and sends data to these. Your network/CSP rules must allow them, and they
are all declared in `privacy.html`:

- **script.google.com** — Google Apps Script, receives form submissions
- **EmailJS** — delivers the one-time email verification code
- **Meta / Facebook Pixel** (`connect.facebook.net`) — measurement and retargeting
- **Microsoft Clarity** — usage analytics, including session recordings
- **Google Fonts** — typeface, if referenced in the CSS

## MUST BE DONE BEFORE GO-LIVE

`privacy.html` contains **three `[PLACEHOLDER]` markers** that have to be filled in:

1. Grievance Officer name
2. Grievance Officer email — required under DPDP Rule 8
3. Data retention period

Search the file for `PLACEHOLDER`. The page should not be published with these unfilled.
The notice has not been reviewed by legal counsel.

## Test checklist after deploying

1. Open the page over HTTPS — the registration form shows
2. Try to start the quiz with the consent box unticked — it must refuse
3. Try with no mobile number — it must refuse
4. Choose India as country — a City field must appear and be required
5. Click the Privacy Notice link — `privacy.html` opens in a new tab
6. Complete a test submission, then confirm a new row appears in the Google Sheet with
   every value in the correct column, including the three Consent columns
7. Submit a course enquiry and confirm it lands in the Course Enquiries sheet

## Notes

- Data currently lands in Google Sheets. A direct feed into the IGI education portal CRM
  (Supabase) is planned; it will be added inside the Apps Script, so no change to this
  website will be needed.
- The lead sheets are written **by matching the sheet's header names**, not by column
  position. Columns in the Google Sheet may be reordered safely; do not rename the header
  cells, as the script matches on those names.

Questions: Sunil Sharma, Head of Education — indiaeducation@igi.org
