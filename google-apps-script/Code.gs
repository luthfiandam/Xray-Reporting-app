/**
 * GOOGLE APPS SCRIPT WEB APP FOR SYSTEM MAINTENANCE & INSPECTION REPORTING
 * PT NARARYA TEKNOLOGI INDONESIA (v0.5.0)
 *
 * Setup instructions:
 * 1. Open Google Sheets -> Extensions -> Apps Script.
 * 2. Paste this Code.gs content into the editor.
 * 3. Click "Deploy" -> "New deployment".
 * 4. Select type: "Web app".
 * 5. Set "Execute as": "Me".
 * 6. Set "Who has access": "Anyone".
 * 7. Click "Deploy" and authorize permissions.
 * 8. Copy the Web App URL (e.g., https://script.google.com/macros/s/.../exec).
 * 9. Set environment variable in your Vite project: VITE_GAS_API_URL="<WEB_APP_URL>"
 */

const PREVENTIVE_TAB = "Preventive_Records";
const CORRECTIVE_TAB = "Corrective_Records";
const DRIVE_ROOT_FOLDER = "X-Ray Reporting App";

function doPost(e) {
  try {
    var contents = e.postData ? e.postData.contents : "";
    var payload = contents ? JSON.parse(contents) : {};
    var action = payload.action;

    var result = { success: false, message: "Unknown action" };

    if (action === "healthCheck") {
      result = {
        success: true,
        message: "Google Apps Script API is active",
        data: { timestamp: new Date().toISOString() }
      };
    } else if (action === "getPreventiveRecords") {
      result = getPreventiveRecords(payload.operationalDate, payload.shift);
    } else if (action === "savePreventiveRecord") {
      result = savePreventiveRecord(payload.record);
    } else if (action === "getCorrectiveRecords") {
      result = getCorrectiveRecords(payload.operationalDate, payload.shift);
    } else if (action === "saveCorrectiveRecord") {
      result = saveCorrectiveRecord(payload.record);
    } else if (action === "uploadPhoto") {
      result = handlePhotoUpload(payload.base64Data, payload.folderPath, payload.fileName, payload.photoType);
    } else {
      result = { success: false, message: "Invalid action: " + action };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: err.toString(),
      stack: err.stack
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: "Google Apps Script Endpoint for PT Nararya NTI Reporting is active. Please use POST for API requests."
  })).setMimeType(ContentService.MimeType.JSON);
}

// Ensure Sheet Tabs Exist with Standardized Headers
function getOrCreateSheet(sheetName, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (headers && headers.length > 0) {
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#e2e8f0");
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

// Drive Nested Folder Creator
function getOrCreateFolder(folderPath) {
  var parts = folderPath.split("/").filter(Boolean);
  var currentFolder = DriveApp.getRootFolder();
  for (var i = 0; i < parts.length; i++) {
    var folderName = parts[i];
    var folders = currentFolder.getFoldersByName(folderName);
    if (folders.hasNext()) {
      currentFolder = folders.next();
    } else {
      currentFolder = currentFolder.createFolder(folderName);
      currentFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    }
  }
  return currentFolder;
}

// Upload base64 image to Google Drive
function saveImageToDrive(base64Data, folderPath, fileName) {
  if (!base64Data || typeof base64Data !== "string") return null;
  if (base64Data.indexOf("http://") === 0 || base64Data.indexOf("https://") === 0) {
    return { url: base64Data, drive_url: base64Data, isNew: false };
  }

  try {
    var matches = base64Data.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
    var contentType = "image/jpeg";
    var base64String = base64Data;

    if (matches && matches.length === 3) {
      contentType = matches[1];
      base64String = matches[2];
    }

    var bytes = Utilities.base64Decode(base64String);
    var blob = Utilities.newBlob(bytes, contentType, fileName || ("photo_" + Date.now() + ".jpg"));

    var folder = getOrCreateFolder(folderPath);
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    var fileId = file.getId();
    var driveUrl = "https://lh3.googleusercontent.com/d/" + fileId;

    return {
      file_id: fileId,
      file_name: file.getName(),
      drive_url: driveUrl,
      download_url: file.getUrl(),
      url: driveUrl,
      isNew: true
    };
  } catch (err) {
    Logger.log("Error uploading image: " + err);
    return null;
  }
}

// PREVENTIVE RECORDS
function getPreventiveSheet() {
  var headers = [
    "record_id", "equipment_id", "equipment_code", "equipment_name", "equipment_type",
    "checklist_frequency_id", "period_key", "operational_date", "shift",
    "preventive_session_id", "sequence", "submitted_at", "submitted_by_technician_ids",
    "status", "notes", "checklist_results", "measurements", "evidences", "created_at", "updated_at"
  ];
  return getOrCreateSheet(PREVENTIVE_TAB, headers);
}

function getPreventiveRecords(operationalDate, shift) {
  var sheet = getPreventiveSheet();
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return { success: true, data: [] };
  }

  var headers = data[0];
  var records = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue;

    var recOpDate = String(row[headers.indexOf("operational_date")] || "");
    var recShift = String(row[headers.indexOf("shift")] || "");

    if (operationalDate && recOpDate !== operationalDate) continue;
    if (shift && recShift !== shift) continue;

    try {
      var record = {
        id: Number(row[headers.indexOf("record_id")]),
        equipment_id: Number(row[headers.indexOf("equipment_id")]),
        checklist_frequency_id: Number(row[headers.indexOf("checklist_frequency_id")]),
        period_key: String(row[headers.indexOf("period_key")]),
        operational_date: recOpDate,
        shift: recShift,
        preventive_session_id: Number(row[headers.indexOf("preventive_session_id")] || 1),
        sequence: Number(row[headers.indexOf("sequence")] || 1),
        submitted_at: String(row[headers.indexOf("submitted_at")] || ""),
        submitted_by_technician_ids: JSON.parse(row[headers.indexOf("submitted_by_technician_ids")] || "[]"),
        status: String(row[headers.indexOf("status")] || "OK"),
        notes: String(row[headers.indexOf("notes")] || ""),
        checklist_results: JSON.parse(row[headers.indexOf("checklist_results")] || "[]"),
        measurements: JSON.parse(row[headers.indexOf("measurements")] || "[]"),
        evidences: JSON.parse(row[headers.indexOf("evidences")] || "[]"),
        created_at: String(row[headers.indexOf("created_at")] || ""),
        updated_at: String(row[headers.indexOf("updated_at")] || "")
      };
      records.push(record);
    } catch (e) {
      Logger.log("Row parse error at row " + i + ": " + e);
    }
  }

  return { success: true, data: records };
}

function savePreventiveRecord(record) {
  if (!record || !record.equipment_id || !record.checklist_frequency_id) {
    return { success: false, message: "Invalid preventive record payload" };
  }

  var sheet = getPreventiveSheet();
  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  var dateStr = record.operational_date || new Date().toISOString().split("T")[0];
  var dateParts = dateStr.split("-");
  var year = dateParts[0] || "2026";
  var month = dateParts[1] || "08";
  var folderPath = DRIVE_ROOT_FOLDER + "/" + year + "/" + month + "/" + dateStr + "/Preventive";

  var processedEvidences = [];
  if (record.evidences && Array.isArray(record.evidences)) {
    for (var i = 0; i < record.evidences.length; i++) {
      var ev = record.evidences[i];
      if (typeof ev === "string") {
        if (ev.indexOf("http") === 0) {
          processedEvidences.push({ id: i + 1, file_path: ev, caption: "" });
        } else {
          var uploaded = saveImageToDrive(ev, folderPath, "prev_" + record.equipment_id + "_" + i + ".jpg");
          processedEvidences.push({
            id: i + 1,
            file_path: uploaded ? uploaded.drive_url : ev,
            caption: "",
            drive_url: uploaded ? uploaded.drive_url : ""
          });
        }
      } else if (ev && typeof ev === "object") {
        var path = ev.file_path || ev.url || "";
        if (path && path.indexOf("http") !== 0) {
          var uploaded = saveImageToDrive(path, folderPath, "prev_" + record.equipment_id + "_" + i + ".jpg");
          processedEvidences.push({
            ...ev,
            file_path: uploaded ? uploaded.drive_url : path,
            drive_url: uploaded ? uploaded.drive_url : ev.drive_url
          });
        } else {
          processedEvidences.push(ev);
        }
      }
    }
  }

  var now = new Date().toISOString();
  record.evidences = processedEvidences;
  record.updated_at = now;
  if (!record.created_at) record.created_at = now;
  if (!record.id) record.id = Date.now();

  var eqId = Number(record.equipment_id);
  var freqId = Number(record.checklist_frequency_id);
  var periodKey = String(record.period_key || "");
  var shiftStr = String(record.shift || "");

  // Unique tuple match: (equipment_id, checklist_frequency_id, period_key, shift)
  var existingRowIndex = -1;
  for (var r = 1; r < data.length; r++) {
    var rEq = Number(data[r][headers.indexOf("equipment_id")]);
    var rFreq = Number(data[r][headers.indexOf("checklist_frequency_id")]);
    var rPeriod = String(data[r][headers.indexOf("period_key")] || "");
    var rShift = String(data[r][headers.indexOf("shift")] || "");

    if (rEq === eqId && rFreq === freqId && rPeriod === periodKey && rShift === shiftStr) {
      existingRowIndex = r + 1;
      break;
    }
  }

  var rowValues = [
    record.id,
    record.equipment_id,
    record.equipment_code || "",
    record.equipment_name || "",
    record.equipment_type || "",
    record.checklist_frequency_id,
    record.period_key || "",
    record.operational_date || "",
    record.shift || "",
    record.preventive_session_id || 1,
    record.sequence || 1,
    record.submitted_at || "",
    JSON.stringify(record.submitted_by_technician_ids || []),
    record.status || "OK",
    record.notes || "",
    JSON.stringify(record.checklist_results || []),
    JSON.stringify(record.measurements || []),
    JSON.stringify(record.evidences || []),
    record.created_at,
    record.updated_at
  ];

  if (existingRowIndex > 0) {
    sheet.getRange(existingRowIndex, 1, 1, rowValues.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }

  return {
    success: true,
    message: existingRowIndex > 0 ? "Preventive record updated successfully" : "Preventive record created successfully",
    data: record
  };
}

// CORRECTIVE RECORDS
function getCorrectiveSheet() {
  var headers = [
    "record_id", "corrective_code", "operational_date", "shift",
    "equipment_id", "equipment_name", "equipment_type", "location_id",
    "problem_description", "action_taken", "result", "result_text",
    "start_time", "end_time", "technicians", "created_by", "notes",
    "evidences", "created_at", "updated_at"
  ];
  return getOrCreateSheet(CORRECTIVE_TAB, headers);
}

function getCorrectiveRecords(operationalDate, shift) {
  var sheet = getCorrectiveSheet();
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return { success: true, data: [] };
  }

  var headers = data[0];
  var records = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue;

    var recOpDate = String(row[headers.indexOf("operational_date")] || "");
    var recShift = String(row[headers.indexOf("shift")] || "");

    if (operationalDate && recOpDate !== operationalDate) continue;
    if (shift && recShift !== shift) continue;

    try {
      var record = {
        id: Number(row[headers.indexOf("record_id")]),
        corrective_code: String(row[headers.indexOf("corrective_code")] || ""),
        corrective_date: recOpDate,
        shift: recShift,
        equipment_id: Number(row[headers.indexOf("equipment_id")]),
        location_id: Number(row[headers.indexOf("location_id")]),
        problem_description: String(row[headers.indexOf("problem_description")] || ""),
        action_taken: String(row[headers.indexOf("action_taken")] || ""),
        result: String(row[headers.indexOf("result")] || "Resolved"),
        result_text: String(row[headers.indexOf("result_text")] || ""),
        start_time: String(row[headers.indexOf("start_time")] || ""),
        end_time: String(row[headers.indexOf("end_time")] || ""),
        technicians: JSON.parse(row[headers.indexOf("technicians")] || "[]"),
        created_by: String(row[headers.indexOf("created_by")] || ""),
        notes: String(row[headers.indexOf("notes")] || ""),
        evidences: JSON.parse(row[headers.indexOf("evidences")] || "[]"),
        created_at: String(row[headers.indexOf("created_at")] || ""),
        updated_at: String(row[headers.indexOf("updated_at")] || "")
      };
      records.push(record);
    } catch (e) {
      Logger.log("Corrective parse error: " + e);
    }
  }

  return { success: true, data: records };
}

function saveCorrectiveRecord(record) {
  if (!record) {
    return { success: false, message: "Invalid corrective payload" };
  }

  var sheet = getCorrectiveSheet();
  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  var dateStr = record.corrective_date || new Date().toISOString().split("T")[0];
  var dateParts = dateStr.split("-");
  var year = dateParts[0] || "2026";
  var month = dateParts[1] || "08";
  var folderPath = DRIVE_ROOT_FOLDER + "/" + year + "/" + month + "/" + dateStr + "/Corrective";

  var processedEvidences = [];
  if (record.evidences && Array.isArray(record.evidences)) {
    for (var i = 0; i < record.evidences.length; i++) {
      var ev = record.evidences[i];
      if (typeof ev === "string") {
        if (ev.indexOf("http") === 0) {
          processedEvidences.push(ev);
        } else {
          var uploaded = saveImageToDrive(ev, folderPath, "corr_" + (record.id || Date.now()) + "_" + i + ".jpg");
          processedEvidences.push(uploaded ? uploaded.drive_url : ev);
        }
      } else {
        processedEvidences.push(ev);
      }
    }
  }

  var now = new Date().toISOString();
  record.evidences = processedEvidences;
  record.updated_at = now;
  if (!record.created_at) record.created_at = now;
  if (!record.id) record.id = Date.now();

  var recId = Number(record.id);
  var corrCode = String(record.corrective_code || "");

  var existingRowIndex = -1;
  for (var r = 1; r < data.length; r++) {
    var rowId = Number(data[r][headers.indexOf("record_id")]);
    var rowCode = String(data[r][headers.indexOf("corrective_code")] || "");

    if (rowId === recId || (corrCode && rowCode === corrCode)) {
      existingRowIndex = r + 1;
      break;
    }
  }

  var rowValues = [
    record.id,
    record.corrective_code || "",
    record.corrective_date || "",
    record.shift || "",
    record.equipment_id || "",
    record.equipment_name || "",
    record.equipment_type || "",
    record.location_id || "",
    record.problem_description || "",
    record.action_taken || "",
    record.result || "Resolved",
    record.result_text || "",
    record.start_time || "",
    record.end_time || "",
    JSON.stringify(record.technicians || []),
    record.created_by || "",
    record.notes || "",
    JSON.stringify(record.evidences || []),
    record.created_at,
    record.updated_at
  ];

  if (existingRowIndex > 0) {
    sheet.getRange(existingRowIndex, 1, 1, rowValues.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }

  return {
    success: true,
    message: existingRowIndex > 0 ? "Corrective record updated successfully" : "Corrective record created successfully",
    data: record
  };
}

function handlePhotoUpload(base64Data, folderPath, fileName, photoType) {
  var path = folderPath || (DRIVE_ROOT_FOLDER + "/Uploaded_Photos");
  var res = saveImageToDrive(base64Data, path, fileName || "upload.jpg");
  if (res) {
    return { success: true, data: res };
  } else {
    return { success: false, message: "Failed to upload photo to Drive" };
  }
}
