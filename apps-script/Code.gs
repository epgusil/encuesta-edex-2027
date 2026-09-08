/**
 * Code.gs
 * ------------------------------------------------------------------
 * Endpoint de Google Apps Script para la encuesta USIL 2027.
 *
 * QUÉ HACE:
 *   Recibe un POST con { answers } (JSON) desde la encuesta estática
 *   (js/app.js -> submitSurvey) y agrega una fila nueva en la hoja
 *   "Respuestas" de la planilla donde vive este script. `answers` ya
 *   viene con encabezados legibles (el `sheetLabel` de cada pregunta,
 *   definido en questions.js) en vez de ids internos como "p1" o
 *   "p4b_ciudad". Si aparece una columna que la hoja todavía no tiene
 *   (por ejemplo si más adelante se agrega una pregunta nueva), la
 *   crea automáticamente — no hay que tocar este script cada vez que
 *   cambia la encuesta.
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

    // El cliente (js/app.js) ya manda los datos con encabezados legibles
    // (sheetLabel de cada pregunta, ej. "Modalidad preferida (1ª; 2ª)")
    // en vez de ids internos — este script no necesita saber nada sobre
    // la encuesta, solo escribe lo que llega.
    var data = body.answers || {};

    // Respaldo por si el envío no trajera su propia fecha (o llegara de
    // un cliente viejo): no pisa la del cliente si ya existe.
    if (!data["Fecha y hora de envío (UTC)"]) {
      data["Recibido en el servidor (UTC)"] = new Date().toISOString();
    }

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
