/**
 * Code.gs
 * ------------------------------------------------------------------
 * Endpoint de Google Apps Script para la encuesta USIL 2027.
 *
 * QUÉ HACE:
 *   Recibe un POST con { submittedAt, answers } (JSON) desde la
 *   encuesta estática (js/app.js -> submitSurvey) y agrega una fila
 *   nueva en la hoja "Respuestas" de la planilla donde vive este
 *   script. Si aparece una pregunta/columna nueva que no existía
 *   antes (por ejemplo si más adelante se agrega una pregunta en
 *   questions.js), crea la columna automáticamente — no hay que
 *   tocar este script cada vez que cambia la encuesta.
 *
 * CÓMO SE INSTALA: ver README.md, sección "Conectar con Google
 * Sheets (Apps Script)".
 * ------------------------------------------------------------------
 */

var SHEET_NAME = "Respuestas";

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000); // hasta 10s esperando si hay envíos simultáneos

  try {
    var sheet = getOrCreateSheet_();
    var body = JSON.parse(e.postData.contents);

    var data = body.answers || {};
    data["submittedAt"] = body.submittedAt || new Date().toISOString();

    var headers = getCurrentHeaders_(sheet);

    // Agrega al final cualquier columna nueva que traiga esta respuesta
    // y que la hoja todavía no tenga.
    var headersChanged = false;
    Object.keys(data).forEach(function (key) {
      if (headers.indexOf(key) === -1) {
        headers.push(key);
        headersChanged = true;
      }
    });

    if (headersChanged) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }

    var row = headers.map(function (key) {
      var val = data[key];
      return val === undefined || val === null ? "" : val;
    });

    sheet.appendRow(row);

    return jsonResponse_({ ok: true });
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// Confirma que el endpoint está vivo si lo abres desde el navegador.
function doGet() {
  return ContentService.createTextOutput(
    "La encuesta USIL 2027 usa este endpoint solo para envíos POST."
  );
}

function getOrCreateSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  return sheet;
}

function getCurrentHeaders_(sheet) {
  var lastCol = sheet.getLastColumn();
  if (lastCol === 0) return [];
  return sheet.getRange(1, 1, 1, lastCol).getValues()[0];
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
