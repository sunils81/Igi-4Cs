/**
 * IGI 4Cs Public Quiz — Google Sheets Backend
 * Same spreadsheet as training version, separate sheets
 * Spreadsheet: https://docs.google.com/spreadsheets/d/17TKWu-RuazIVxes_sfZKu2c5Z8VjBnekw-P2SWtvze4/edit
 */

const SHEET_ID       = '1j-0WedUUfEujVz-IDEQ9-r9v9tTncOqYHIL8MyoI6aQ';
const PASS_THRESHOLD = 70;

// ============================================================
//  doPost
// ============================================================
function doPost(e) {
  var lock = LockService.getDocumentLock();
  try { lock.waitLock(15000); }
  catch (err) { return jsonResponse({ success: false, message: 'Server busy.' }); }

  try {
    var rawData = e.postData ? e.postData.contents : '';
    var data    = JSON.parse(rawData);
    var ss      = SpreadsheetApp.openById(SHEET_ID);

    if (data.source === 'course_interest') {
      handleCourseInterest(ss, data);
    } else {
      handlePublicSubmission(ss, data);
    }

    lock.releaseLock();
    return jsonResponse({ success: true });

  } catch (err) {
    lock.releaseLock();
    return jsonResponse({ success: false, message: err.toString() });
  }
}

// ============================================================
//  doGet — health check only (no duplicate check needed for public)
// ============================================================
function doGet(e) {
  return ContentService.createTextOutput('IGI 4Cs Public Quiz API active.')
    .setMimeType(ContentService.MimeType.TEXT);
}

// ============================================================
//  handleCourseInterest
// ============================================================
function handleCourseInterest(ss, data) {
  var sheet = getOrCreateSheet(ss, 'Course Enquiries');

  if (sheet.getLastRow() === 0) {
    var headers = ['Timestamp','Name','Email','Mobile','Country Code','Country','City',
                   'Profession','Course Interest','Quiz Score','Quiz %','Submitted At'];
    var hr = sheet.getRange(1,1,1,headers.length);
    hr.setValues([headers]).setFontWeight('bold')
      .setBackground('#094d59').setFontColor('#ffffff').setFontFamily('Arial');
    sheet.setFrozenRows(1);
    sheet.getRange('D:D').setNumberFormat('@STRING@');
    [160,150,200,130,110,120,100,180,220,90,80,160]
      .forEach(function(w,i){ sheet.setColumnWidth(i+1,w); });
  }

  // By header name, not position — see writeRowByHeader. 2026-10-14.
  var written = writeRowByHeader(sheet, {
    'Timestamp':       new Date(),
    'Name':            data.name        || '',
    'Email':           data.email       || '',
    'Mobile':          data.mobile      || '',
    'Country Code':    data.countryCode || '',
    'Country':         data.country     || '',
    'City':            data.city        || '',
    'Profession':      data.profession  || '',
    'Course Interest': data.course      || '',
    'Quiz Score':      (data.score || 0) + '/' + (data.total || 25),
    'Quiz %':          data.pct         || '',
    'Submitted At':    data.submittedAt || '',
    'Consent':         data.consentGiven === true ? 'Yes' : 'No',
    'Consent Version': data.consentVersion || '',
    'Consent At':      data.consentAt      || ''
  }, ['Consent', 'Consent Version', 'Consent At']);

  var newRow = written.row;
  var mobCol = colOf(written.header, 'Mobile');
  if (mobCol) sheet.getRange(newRow, mobCol).setNumberFormat('@STRING@');
  sheet.getRange(newRow, 1, 1, written.header.length).setBackground('#fff9e6');
  var ciCol = colOf(written.header, 'Course Interest');
  if (ciCol) sheet.getRange(newRow, ciCol).setFontWeight('bold').setFontColor('#094d59');
}

// ============================================================
//  handlePublicSubmission
// ============================================================
function handlePublicSubmission(ss, data) {
  var sheet = getOrCreateSheet(ss, 'Public Leads');
  ensurePublicHeaders(sheet);

  var score  = Number(data.score)  || 0;
  var total  = Number(data.total)  || 25;
  var pct    = Math.round((score / total) * 100);
  var badge  = pct >= 90 ? 'Diamond Expert'
             : pct >= 75 ? '4Cs Pro'
             : pct >= 60 ? 'On Your Way'
             : 'Keep Learning';

  var ts = new Date();
  var newRow = sheet.getLastRow() + 1;

  // By header name, not position — see writeRowByHeader. 2026-10-14.
  var written = writeRowByHeader(sheet, {
    'Timestamp':     ts,
    'Name':          data.name         || '',
    'Email':         data.email        || '',
    'Mobile Number': data.mobile       || '',
    'Mobile':        data.mobile       || '',   // whichever label this sheet carries
    'Country Code':  data.countryCode  || '',
    'Country':       data.country      || '',
    'Profession':    data.profession   || '',
    'City':          data.city         || '',
    'Score':         score,
    'Total':         total,
    'Percentage':    pct + '%',
    'Badge':         badge,
    'Time Taken':    data.timeTaken    || '',
    'Device':        data.deviceType   || '',
    'Screen':        data.screenRes    || '',
    'Screen Res':    data.screenRes    || '',
    'Submit Reason': data.submitReason || 'Manual',
    'User Agent':    data.userAgent    || '',
    'Submitted At':  data.submittedAt  || '',
    'Consent':         data.consentGiven === true ? 'Yes' : 'No',
    'Consent Version': data.consentVersion || '',
    'Consent At':      data.consentAt      || ''
  }, ['Consent', 'Consent Version', 'Consent At']);
  newRow = written.row;

  // Keep the mobile column as plain text so a leading + or 0 is not eaten by Sheets.
  var mobCol = colOf(written.header, 'Mobile Number') || colOf(written.header, 'Mobile');
  if (mobCol) sheet.getRange(newRow, mobCol).setNumberFormat('@STRING@');

  // Colour by badge
  var bg = pct >= 90 ? '#fff9e6'
         : pct >= 75 ? '#e6f4ea'
         : pct >= 60 ? '#e8f4ff'
         : '#fce8e6';
  sheet.getRange(newRow, 1, 1, written.header.length).setBackground(bg);
  var badgeCol = colOf(written.header, 'Badge');
  if (badgeCol) sheet.getRange(newRow, badgeCol).setFontWeight('bold');

  // Write wrong answers to Public Wrong Answers sheet
  writePublicWrongAnswers(ss, data, pct, badge);

  // Rebuild public dashboard
  rebuildPublicDashboard(ss);
}

// ============================================================
//  handleTrainingSubmission — same logic as training GAS
// ============================================================
function handleTrainingSubmission(ss, data) {
  var sheet = getOrCreateSheet(ss, 'Responses');
  ensureTrainingHeaders(sheet);

  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    var mobiles = sheet.getRange(2, 4, lastRow - 1, 1).getValues();
    for (var i = 0; i < mobiles.length; i++) {
      if (mobiles[i][0].toString().trim() === (data.mobile || '').toString().trim()) {
        return; // duplicate — silently ignore (already checked client-side)
      }
    }
  }

  var score   = Number(data.score) || 0;
  var total   = Number(data.total) || 25;
  var pct     = Math.round((score / total) * 100);
  var passed  = pct >= PASS_THRESHOLD;
  var status  = passed ? 'PASS' : 'FAIL';
  var training = passed ? 'No' : 'Yes — Training Required';

  var newRow = sheet.getLastRow() + 1;
  sheet.appendRow([
    data.referenceId  || '',
    new Date(),
    data.name,
    data.mobile,
    data.email        || '',
    data.designation  || '',
    data.store,
    data.city,
    score,
    total,
    pct + '%',
    status,
    training,
    data.timeTaken    || '',
    data.tabSwitches  || 0,
    data.submitReason || 'Manual',
    data.deviceType   || 'Unknown',
    data.platform     || 'Unknown',
    data.screenRes    || 'Unknown',
    data.language     || 'Unknown',
    data.userAgent    || 'Unknown',
  ]);

  colorTrainingRow(sheet, newRow, passed);
  writeWrongAnswers(ss, data, passed);
  rebuildSummary(ss);
  rebuildStorePerformance(ss);
  rebuildQuestionHeatmap(ss);
}

// ============================================================
//  ensurePublicHeaders
// ============================================================
function ensurePublicHeaders(sheet) {
  if (sheet.getLastRow() > 0 && sheet.getRange(1,1).getValue() !== '') return;
  var headers = [
    'Timestamp','Name','Email','Mobile Number','Country Code','Country','Profession','City',
    'Score','Total','Percentage','Badge',
    'Time Taken','Device','Screen','Submit Reason','User Agent','Submitted At'
  ];
  var r = sheet.getRange(1, 1, 1, headers.length);
  r.setValues([headers]).setFontWeight('bold')
   .setBackground('#094d59').setFontColor('#ffffff').setFontFamily('Arial');
  sheet.setFrozenRows(1);
  sheet.getRange('D:D').setNumberFormat('@STRING@');
  sheet.setColumnWidth(1,160); sheet.setColumnWidth(2,150); sheet.setColumnWidth(3,200);
  sheet.setColumnWidth(4,130); sheet.setColumnWidth(5,110); sheet.setColumnWidth(6,120);
  sheet.setColumnWidth(7,180); sheet.setColumnWidth(8,100); sheet.setColumnWidth(9,60);
  sheet.setColumnWidth(10,60); sheet.setColumnWidth(11,90); sheet.setColumnWidth(12,140);
  sheet.setColumnWidth(13,100);sheet.setColumnWidth(14,90); sheet.setColumnWidth(15,110);
  sheet.setColumnWidth(16,130);sheet.setColumnWidth(17,280);sheet.setColumnWidth(18,160);
}

// ============================================================
//  writePublicWrongAnswers
// ============================================================
function writePublicWrongAnswers(ss, data, pct, badge) {
  var sheet = getOrCreateSheet(ss, 'Public Wrong Answers');
  if (sheet.getLastRow() === 0) {
    var h = ['Timestamp','Name','Email','City','Badge','Score','Q No.','Question','Given Answer','Correct Answer'];
    var hr = sheet.getRange(1,1,1,h.length);
    hr.setValues([h]).setFontWeight('bold')
      .setBackground('#094d59').setFontColor('#ffffff').setFontFamily('Arial');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1,160); sheet.setColumnWidth(2,150); sheet.setColumnWidth(3,200);
    sheet.setColumnWidth(4,100); sheet.setColumnWidth(5,140); sheet.setColumnWidth(6,70);
    sheet.setColumnWidth(7,60);  sheet.setColumnWidth(8,380); sheet.setColumnWidth(9,220);
    sheet.setColumnWidth(10,220);
  }

  var wrong = data.wrongAnswers || [];
  if (!wrong.length) return;

  var ts    = new Date();
  var score = (data.score || 0) + '/' + (data.total || 25);
  wrong.forEach(function(w) {
    var lr = sheet.appendRow([ts, data.name, data.email, data.city||'', badge, score,
                               w.qNum, w.question, w.given, w.correct]);
    var row = sheet.getLastRow();
    sheet.getRange(row,9).setBackground('#fce8e6').setFontColor('#c0392b').setFontWeight('bold');
    sheet.getRange(row,10).setBackground('#e6f4ea').setFontColor('#1a7a3c').setFontWeight('bold');
  });
}

// ============================================================
//  rebuildPublicDashboard
// ============================================================
function rebuildPublicDashboard(ss) {
  var src   = getOrCreateSheet(ss, 'Public Leads');
  var dash  = getOrCreateSheet(ss, 'Public Dashboard');
  dash.clearContents();
  dash.clearFormats();

  var lastRow = src.getLastRow();
  if (lastRow < 2) { dash.getRange(1,1).setValue('No public attempts yet.'); return; }

  var data = src.getRange(2, 1, lastRow - 1, 16).getValues();
  var total = data.length;

  // Badge counts (col J = index 9)
  var badgeCounts = { 'Diamond Expert':0, '4Cs Pro':0, 'On Your Way':0, 'Keep Learning':0 };
  var totalScore  = 0;
  var profMap     = {};
  var countryMap  = {};
  var cityMap     = {};

  data.forEach(function(r) {
    var badge = r[10] || 'Keep Learning';
    if (badgeCounts[badge] !== undefined) badgeCounts[badge]++;
    totalScore += Number(r[7]) || 0;
    var prof    = r[5] || 'Not specified';
    profMap[prof] = (profMap[prof] || 0) + 1;
    var country = r[4] || 'Unknown';
    if (country) countryMap[country] = (countryMap[country] || 0) + 1;
    var city = r[6] || 'Unknown';
    if (city) cityMap[city] = (cityMap[city] || 0) + 1;
  });

  var avgPct = Math.round((totalScore / (total * 25)) * 100);

  // ---- Title ----
  dash.getRange(1,1,1,6).merge()
    .setValue('IGI 4Cs Public Quiz — Lead & Performance Dashboard')
    .setFontWeight('bold').setFontSize(14)
    .setBackground('#094d59').setFontColor('#b5944a')
    .setHorizontalAlignment('center');

  dash.getRange(2,1,1,6).merge()
    .setValue('Total Attempts: ' + total + '   |   Avg Score: ' + avgPct + '%   |   Last Updated: ' + new Date().toLocaleString())
    .setFontSize(10).setBackground('#f1f3f4').setHorizontalAlignment('center');

  // ---- Badge Breakdown ----
  dash.getRange(4,1).setValue('🏅 Badge Distribution')
    .setFontWeight('bold').setFontSize(12).setBackground('#0e6674').setFontColor('#ffffff');
  dash.getRange(4,1,1,3).merge().setBackground('#0e6674');

  var badgeRows = [
    ['🏆 Diamond Expert (90%+)',  badgeCounts['Diamond Expert'],  Math.round((badgeCounts['Diamond Expert']/total)*100)+'%'],
    ['💎 4Cs Pro (75-89%)',       badgeCounts['4Cs Pro'],         Math.round((badgeCounts['4Cs Pro']/total)*100)+'%'],
    ['💡 On Your Way (60-74%)',   badgeCounts['On Your Way'],     Math.round((badgeCounts['On Your Way']/total)*100)+'%'],
    ['📚 Keep Learning (<60%)',   badgeCounts['Keep Learning'],   Math.round((badgeCounts['Keep Learning']/total)*100)+'%']
  ];

  var badgeHeaderRow = 5;
  dash.getRange(badgeHeaderRow,1,1,3).setValues([['Badge','Count','% of Attempts']])
    .setFontWeight('bold').setBackground('#14353b').setFontColor('#e8f0f1');
  var bColors = ['#fff9e6','#e6f4ea','#e8f4ff','#fce8e6'];
  badgeRows.forEach(function(row, i) {
    dash.getRange(badgeHeaderRow+1+i, 1, 1, 3).setValues([row]).setBackground(bColors[i]);
    dash.getRange(badgeHeaderRow+1+i, 1).setFontWeight('bold');
  });

  // ---- Profession Breakdown ----
  var profStart = badgeHeaderRow + badgeRows.length + 3;
  dash.getRange(profStart,1).setValue('👤 Audience Breakdown')
    .setFontWeight('bold').setFontSize(12).setBackground('#0e6674').setFontColor('#ffffff');
  dash.getRange(profStart,1,1,3).merge().setBackground('#0e6674');
  dash.getRange(profStart+1,1,1,3).setValues([['Profession','Count','% of Total']])
    .setFontWeight('bold').setBackground('#14353b').setFontColor('#e8f0f1');

  var profRowNum = profStart + 2;
  Object.keys(profMap).sort(function(a,b){ return profMap[b]-profMap[a]; }).forEach(function(prof) {
    var cnt = profMap[prof];
    var pct = Math.round((cnt/total)*100)+'%';
    dash.getRange(profRowNum,1,1,3).setValues([[prof, cnt, pct]]).setBackground('#f8f9fa');
    profRowNum++;
  });

  // ---- Country Breakdown ----
  var countryStart = profRowNum + 2;
  dash.getRange(countryStart,1).setValue('🌍 Country Breakdown')
    .setFontWeight('bold').setFontSize(12).setBackground('#0e6674').setFontColor('#ffffff');
  dash.getRange(countryStart,1,1,3).merge().setBackground('#0e6674');
  dash.getRange(countryStart+1,1,1,3).setValues([['Country','Attempts','%']])
    .setFontWeight('bold').setBackground('#14353b').setFontColor('#e8f0f1');

  var countryEntries = Object.keys(countryMap)
    .filter(function(c){ return c && c !== 'Unknown'; })
    .sort(function(a,b){ return countryMap[b]-countryMap[a]; });
  countryEntries.forEach(function(country, i) {
    var cnt = countryMap[country];
    var pct = Math.round((cnt/total)*100)+'%';
    dash.getRange(countryStart+2+i,1,1,3).setValues([[country, cnt, pct]]).setBackground(i%2===0?'#f8f9fa':'#ffffff');
  });

  // ---- Top Cities ----
  var cityStart = countryStart + countryEntries.length + 4;
  dash.getRange(cityStart,1).setValue('📍 Top Cities')
    .setFontWeight('bold').setFontSize(12).setBackground('#0e6674').setFontColor('#ffffff');
  dash.getRange(cityStart,1,1,3).merge().setBackground('#0e6674');
  dash.getRange(cityStart+1,1,1,3).setValues([['City','Attempts','%']])
    .setFontWeight('bold').setBackground('#14353b').setFontColor('#e8f0f1');

  var cityEntries = Object.keys(cityMap)
    .filter(function(c){ return c && c !== 'Unknown'; })
    .sort(function(a,b){ return cityMap[b]-cityMap[a]; })
    .slice(0,10);
  cityEntries.forEach(function(city, i) {
    var cnt = cityMap[city];
    var pct = Math.round((cnt/total)*100)+'%';
    dash.getRange(cityStart+2+i,1,1,3).setValues([[city, cnt, pct]]).setBackground(i%2===0?'#f8f9fa':'#ffffff');
  });

  // ---- Column widths ----
  dash.setColumnWidth(1,220); dash.setColumnWidth(2,80); dash.setColumnWidth(3,110);
  dash.setFrozenRows(1);
}

// ============================================================
//  Shared Helpers
// ============================================================
function getOrCreateSheet(ss, name) {
  var s = ss.getSheetByName(name);
  if (!s) s = ss.insertSheet(name);
  return s;
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
//  writeRowByHeader — 2026-10-14
//  Appends a row by MATCHING THE SHEET'S OWN HEADER NAMES, instead of trusting a
//  positional array. Found 2026-10-14: the live "Gemstone Leads" header row had been
//  reordered by hand (Country Code before Mobile, City before Profession) while the
//  script kept appending in code order, so every new row landed one or two columns out
//  — mobiles sitting in Country Code, cities in Profession. A positional appendRow can
//  never survive someone dragging a column in Sheets; matching on the header can.
//
//  Also self-heals: any name in `fields` that the sheet does not yet have is appended as
//  a new column, so adding Consent/Consent Version/Consent At needs no manual edit.
//
//  fields = { 'Header Name': value, ... }
//  ensure = ['New Column', ...]  columns created if the sheet lacks them
// ============================================================
function writeRowByHeader(sheet, fields, ensure) {
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var header  = sheet.getLastRow() > 0
    ? sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h){ return String(h).trim(); })
    : [];

  // Only names listed in `ensure` are created if missing. Everything else in `fields`
  // is written ONLY where the sheet already has that column — which lets a payload carry
  // alternate labels for the same value (a sheet may say 'Mobile' or 'Mobile Number')
  // without the unused alias spawning a duplicate column.
  (ensure || []).forEach(function(name) {
    if (header.indexOf(name) === -1) {
      header.push(name);
      sheet.getRange(1, header.length).setValue(name)
        .setFontWeight('bold').setBackground(TEAL).setFontColor(WHITE).setFontFamily('Arial');
    }
  });

  var row = header.map(function(name) {
    return Object.prototype.hasOwnProperty.call(fields, name) ? fields[name] : '';
  });
  sheet.appendRow(row);
  return { row: sheet.getLastRow(), header: header };
}

// Column number of a header name (1-based), or 0 if absent. For per-cell formatting
// after writeRowByHeader, so formatting follows the column rather than a fixed letter.
function colOf(header, name) {
  var i = header.indexOf(name);
  return i === -1 ? 0 : i + 1;
}
