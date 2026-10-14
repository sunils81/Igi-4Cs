// ============================================================
//  optin-sender.gs — 2026-10-14
//  One-off (re-runnable) consent request for historical enquiries.
//
//  WHY THIS EXISTS
//  The people in the "Course Enquiries" sheet enquired before the quiz had a
//  consent checkbox. They asked us about a course, so there is a real basis for
//  contacting them once — but we have no recorded consent, so they must not be
//  dropped straight into the CRM. This sends each of them one email asking
//  whether we may keep in touch. Only a click on "Yes" creates a CRM lead.
//
//  Until they click, their details sit in crm_lead_optin_pending, which no
//  counsellor and no browser can read. Anyone who ignores the email is never
//  contacted again, and anyone who clicks "No thanks" is recorded as declined.
//
//  HOW TO RUN
//  1. Script Properties must have SUPABASE_ANON_KEY and SUPABASE_OPTIN_URL
//     (https://atbexvtrcopaagcdbpqi.supabase.co/functions/v1/stage-quiz-optin)
//     and SUPABASE_CONFIRM_URL
//     (https://atbexvtrcopaagcdbpqi.supabase.co/functions/v1/confirm-quiz-consent)
//  2. Run sendOptInEmailsDryRun() first — it logs exactly who would be emailed
//     and sends nothing.
//  3. Then run sendOptInEmails(). It is safe to re-run: anyone already staged,
//     confirmed or declined is skipped, and the sheet is stamped so a second
//     run does not email the same person twice.
//
//  Gmail caps daily sends (100/day on consumer, 1,500 on Workspace). The script
//  stops at DAILY_CAP and logs where it stopped; run it again the next day.
// ============================================================

var OPTIN_SHEET      = 'Course Enquiries';
var OPTIN_STAMP_COL  = 'Opt-in Email Sent';
var QUIZ_NAME        = 'Diamond 4Cs Quiz';     // change in the gemstone copy
var DAILY_CAP        = 90;
var FROM_NAME        = 'IGI School of Gemology';
var REPLY_TO         = 'indiaeducation@igi.org';

function sendOptInEmailsDryRun() { _runOptIn(true); }
function sendOptInEmails()       { _runOptIn(false); }

function _runOptIn(dryRun) {
  var props = PropertiesService.getScriptProperties();
  var key         = props.getProperty('SUPABASE_ANON_KEY');
  var stageUrl    = props.getProperty('SUPABASE_OPTIN_URL');
  var confirmUrl  = props.getProperty('SUPABASE_CONFIRM_URL');
  if (!key || !stageUrl || !confirmUrl) {
    throw new Error('Set SUPABASE_ANON_KEY, SUPABASE_OPTIN_URL and SUPABASE_CONFIRM_URL in Script Properties first.');
  }

  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(OPTIN_SHEET);
  if (!sheet) throw new Error('Sheet not found: ' + OPTIN_SHEET);

  var values = sheet.getDataRange().getValues();
  if (values.length < 2) { Logger.log('Nothing to do — sheet is empty.'); return; }

  var header = values[0].map(function(h) { return String(h).trim(); });
  function col(name) { return header.indexOf(name); }

  // Add the stamp column if it isn't there yet, so re-runs can skip.
  var stampIdx = col(OPTIN_STAMP_COL);
  if (stampIdx === -1) {
    stampIdx = header.length;
    sheet.getRange(1, stampIdx + 1).setValue(OPTIN_STAMP_COL).setFontWeight('bold');
    header.push(OPTIN_STAMP_COL);
  }

  var iName   = col('Name');
  var iEmail  = col('Email');
  var iMobile = col('Mobile') !== -1 ? col('Mobile') : col('Mobile Number');
  var iCC     = col('Country Code');
  var iCountry= col('Country');
  var iCity   = col('City');
  var iProf   = col('Profession');
  var iCourse = col('Course Interest');

  var sent = 0, skipped = 0, failed = 0;
  var seen = {};   // guard against the same address twice in one sheet

  for (var r = 1; r < values.length; r++) {
    if (sent >= DAILY_CAP) {
      Logger.log('Reached DAILY_CAP (' + DAILY_CAP + ') at sheet row ' + (r + 1) +
                 '. Run again tomorrow to continue.');
      break;
    }

    var row   = values[r];
    var email = String(row[iEmail] || '').trim();
    var name  = String(row[iName]  || '').trim();

    if (!email || email.indexOf('@') === -1) { skipped++; continue; }
    if (row[stampIdx]) { skipped++; continue; }                 // already emailed
    if (seen[email.toLowerCase()]) { skipped++; continue; }      // duplicate in sheet
    seen[email.toLowerCase()] = true;

    if (dryRun) {
      Logger.log('WOULD EMAIL: ' + (name || '(no name)') + ' <' + email + '>');
      sent++;
      continue;
    }

    // Stage first. If staging fails we must not send an email whose link is dead.
    var token;
    try {
      var res = UrlFetchApp.fetch(stageUrl, {
        method: 'post',
        contentType: 'application/json',
        headers: { Authorization: 'Bearer ' + key },
        payload: JSON.stringify({
          name:         name,
          email:        email,
          mobile:       iMobile  !== -1 ? String(row[iMobile]  || '') : '',
          country_code: iCC      !== -1 ? String(row[iCC]      || '') : '',
          country:      iCountry !== -1 ? String(row[iCountry] || '') : '',
          city:         iCity    !== -1 ? String(row[iCity]    || '') : '',
          profession:   iProf    !== -1 ? String(row[iProf]    || '') : '',
          course:       iCourse  !== -1 ? String(row[iCourse]  || '') : '',
          source:       QUIZ_NAME,
          web_meta:     { historical: true, sheet_row: r + 1 }
        }),
        muteHttpExceptions: true
      });
      var out = JSON.parse(res.getContentText() || '{}');
      if (out.status === 'skipped') {
        // Already consented, confirmed or declined — nothing to ask.
        sheet.getRange(r + 1, stampIdx + 1).setValue('Skipped: ' + out.reason);
        skipped++;
        continue;
      }
      if (out.status !== 'ok' || !out.token) {
        Logger.log('Stage failed for ' + email + ': ' + res.getContentText());
        failed++;
        continue;
      }
      token = out.token;
    } catch (err) {
      Logger.log('Stage threw for ' + email + ': ' + err);
      failed++;
      continue;
    }

    var yes = confirmUrl + '?t=' + encodeURIComponent(token);
    var no  = confirmUrl + '?t=' + encodeURIComponent(token) + '&action=decline';

    try {
      MailApp.sendEmail({
        to: email,
        replyTo: REPLY_TO,
        name: FROM_NAME,
        subject: 'May we keep in touch about your gemology course enquiry?',
        htmlBody: _optInHtml(name, yes, no),
        body: _optInText(name, yes, no)
      });
      sheet.getRange(r + 1, stampIdx + 1).setValue(new Date());
      sent++;
    } catch (err) {
      Logger.log('Send failed for ' + email + ': ' + err);
      failed++;
    }
  }

  Logger.log((dryRun ? '[DRY RUN] ' : '') +
    'sent=' + sent + ' skipped=' + skipped + ' failed=' + failed);
}

// ── Email body ──────────────────────────────────────────────────────────────
// Plain and honest: says where we got their details, what we would use them
// for, and makes "no" exactly as easy as "yes". No marketing in this email —
// asking for consent and selling at the same time is what makes an opt-in
// request look like spam.
function _optInText(name, yes, no) {
  return 'Hello ' + (name || 'there') + ',\n\n' +
    'You took one of IGI\'s online gemology quizzes and asked us about a course. ' +
    'We still have the contact details you gave us then.\n\n' +
    'Before a counsellor gets in touch, we would like your permission to keep ' +
    'those details and contact you about IGI\'s gemology courses.\n\n' +
    'Yes, keep in touch:  ' + yes + '\n' +
    'No, remove my details:  ' + no + '\n\n' +
    'If you do nothing, we will not contact you.\n\n' +
    'You can withdraw at any time by writing to ' + REPLY_TO + '.\n\n' +
    'IGI School of Gemology\n' +
    'International Gemological Institute\n';
}

function _optInHtml(name, yes, no) {
  var e = function(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };
  return '' +
  '<div style="background:#0A1220;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif">' +
    '<div style="max-width:540px;margin:0 auto;background:#0E1829;border:1px solid rgba(255,255,255,.08);border-radius:4px;padding:40px 36px">' +
      '<p style="margin:0 0 22px;color:#C9A84C;font-size:11px;letter-spacing:.22em;text-transform:uppercase;font-weight:700">IGI School of Gemology</p>' +
      '<h1 style="margin:0 0 18px;color:#EEF1F5;font-size:21px;font-weight:600;line-height:1.35">May we keep in touch?</h1>' +
      '<p style="margin:0 0 14px;color:#8E9DB2;font-size:15px;line-height:1.7">Hello ' + e(name || 'there') + ',</p>' +
      '<p style="margin:0 0 14px;color:#8E9DB2;font-size:15px;line-height:1.7">' +
        'You took one of IGI\'s online gemology quizzes and asked us about a course. ' +
        'We still have the contact details you gave us then.</p>' +
      '<p style="margin:0 0 26px;color:#8E9DB2;font-size:15px;line-height:1.7">' +
        'Before a counsellor gets in touch, we\'d like your permission to keep those ' +
        'details and contact you about IGI\'s gemology courses.</p>' +
      '<p style="margin:0 0 14px">' +
        '<a href="' + yes + '" style="display:inline-block;background:#C9A84C;color:#0A1220;' +
        'text-decoration:none;font-size:13px;font-weight:700;letter-spacing:.14em;' +
        'text-transform:uppercase;padding:15px 34px;border-radius:2px">Yes, keep in touch</a></p>' +
      '<p style="margin:0 0 26px">' +
        '<a href="' + no + '" style="color:#8E9DB2;font-size:13px;text-decoration:underline">' +
        'No thanks — remove my details</a></p>' +
      '<p style="margin:0 0 10px;color:#6B7A8F;font-size:12.5px;line-height:1.7">' +
        'If you do nothing, we will not contact you.</p>' +
      '<p style="margin:0;color:#6B7A8F;font-size:12.5px;line-height:1.7">' +
        'You can withdraw at any time by writing to ' +
        '<a href="mailto:' + REPLY_TO + '" style="color:#C9A84C">' + REPLY_TO + '</a>.</p>' +
    '</div>' +
  '</div>';
}
