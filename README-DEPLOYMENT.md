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

The retention period (24 months) and Grievance Officer contact are filled in. The officer
is published by role with a monitored address, which satisfies DPDP Rule 8; insert the
individual's name in `privacy.html` once it is decided. The notice has not been reviewed
by legal counsel.

## Test checklist after deploying

1. Open the page over HTTPS — the registration form shows
2. Try to start the quiz with the consent box unticked — it must refuse
3. Try with no mobile number — it must refuse
4. Choose India as country — a City field must appear and be required
5. Click the Privacy Notice link — `privacy.html` opens in a new tab
6. Complete a test submission, then confirm a new row appears in the Google Sheet with
   every value in the correct column, including the three Consent columns
7. Submit a course enquiry and confirm it lands in the Course Enquiries sheet

## CRM feed (Supabase) — setup

Leads now flow from this quiz into the IGI education portal CRM. The Google Sheet is
still the system of record: the CRM push happens **after** the sheet row is written and
every failure in it is swallowed and logged, so a CRM outage can never cost a lead.

Only submissions with a ticked consent box are sent. This is enforced twice — in the
Apps Script, and again server-side in the edge function, because a checkbox's `required`
attribute is trivially bypassed by a direct POST.

### Script Properties to set

In the Apps Script project: **Project Settings → Script Properties**

| Property | Value |
|---|---|
| `SUPABASE_FN_URL` | `https://atbexvtrcopaagcdbpqi.supabase.co/functions/v1/submit-quiz-lead` |
| `SUPABASE_ANON_KEY` | the portal project's anon key |
| `SUPABASE_OPTIN_URL` | `https://atbexvtrcopaagcdbpqi.supabase.co/functions/v1/stage-quiz-optin` |
| `SUPABASE_CONFIRM_URL` | `https://atbexvtrcopaagcdbpqi.supabase.co/functions/v1/confirm-quiz-consent` |

If `SUPABASE_FN_URL` or `SUPABASE_ANON_KEY` is missing, the push is skipped silently and
the quiz carries on working normally.

### How leads are routed

| Submission | Centre | Owner |
|---|---|---|
| Country = India, city maps to a centre | that centre | round-robin / direct, per `crm_routing_rules` |
| Country ≠ India | `International` | none — admin triage |
| Country = India, city not recognised | `Unassigned` | none — admin triage |

`International` and `Unassigned` are holding buckets, not real centres. They are visible
only to admins in the portal and are deliberately absent from batch setup, revenue targets
and enrolment. A lead nobody can service is never dropped into a counsellor's queue.

A completed quiz creates a lead with course `Undecided` — finishing a quiz is interest,
not a course choice. A course enquiry carries the course the person actually asked about
and scores higher. Repeat visitors are deduplicated on mobile, then email; an existing
lead is never reassigned or re-staged by a quiz, only annotated and nudged.

### Historical enquiries (`optin-sender.gs`)

Enquiries collected before the consent checkbox existed are **not** imported. Running
`sendOptInEmails()` emails each of them once, asking permission; only a click on
"Yes, keep in touch" creates a CRM lead, stamped with the moment of consent. Until then
their details sit in `crm_lead_optin_pending`, which no counsellor and no browser can
read, and which can simply be deleted.

Run `sendOptInEmailsDryRun()` first — it logs exactly who would be emailed and sends
nothing. The sender is safe to re-run: anyone already emailed, confirmed or declined is
skipped, and it stops at the daily Gmail cap.

## Notes

- Data lands in Google Sheets and is then mirrored into the IGI education portal CRM
  (Supabase) from inside the Apps Script — see "CRM feed" above.
- The lead sheets are written **by matching the sheet's header names**, not by column
  position. Columns in the Google Sheet may be reordered safely; do not rename the header
  cells, as the script matches on those names.

Questions: Sunil Sharma, Head of Education — IGIEducation@igi.org
