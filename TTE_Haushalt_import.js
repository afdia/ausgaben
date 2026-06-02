const fs = require('fs');
const readline = require('readline');

async function processFileZahlungen() {
    const fileStream = fs.createReadStream('/PFADZU/TTE_Haushalt_Alle_202605291201_Z.csv');
    const outputStream = fs.createWriteStream('/PFADZU/TTE_Haushalt_Alle_202605291201_Z.out.txt');

    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let lineCount = 0; // Zeilenzähler initialisieren
    for await (const line of rl) {
        if (!line.trim()) continue; // Skip empty lines
        lineCount++; // Zeilennummer für jede gültige Zeile erhöhen

        const x = line.replaceAll(",", ".").split(";"); // komma durch . ersetzen (für JS floats) und Spitten

        // 1. Datum und Uhrzeit aus x[0] trennen
        const [datePart, timePart] = x[0].split(" ");
        const [day, month, year] = datePart.split(".");

        // 2. Ein gültiges ISO-Format bauen (YYYY-MM-DDTHH:mm:ss) und den Zeitstempel (Date.now-Äquivalent) holen
        let timestamp = Date.parse(`${year}-${month}-${day}T${timePart || "00:00"}:00`);

        // Die letzten 4 Ziffern durch die Zeilennummer ersetzen (Modulo 10000 stellt sicher, dass es 4 Ziffern bleiben)
        timestamp = Math.floor(timestamp / 10000) * 10000 + (lineCount % 10000);

        const kat  = x[2] == 'Verschiedenes' ? 'Sonstiges' : x[2] == 'Öffentl. Verkehr' ? 'Öffis' : x[2];
        const outputLine = "Ausgabe#" +
            x[0].replace(/^(\d{2})\.(\d{2})\.(\d{4})/, '$3-$2-$1') +
            "#" + timestamp +
            '={"a":' + x[6] +
            ',"d":' + x[7] +
            ',"b":"' + x[1] +
            '","k":"' + kat +
            '","s":' + (x[4] === '0.00' ? x[6] : -x[7]) + '}';

        outputStream.write(outputLine + '\n');
    }

    outputStream.end();
    console.log('File processing complete!');
}

// Andreas;Dagmar;50,00 >>>>> Ausgabe#2026-05-22 12:14#1779444874450={"a":0,"d":50,"b":"","k":"Geldtransfer","s":-50}
async function processFileTransfer() {
    const fileStream = fs.createReadStream('/mnt/veracrypt/TTE_Haushalt_Alle_202605291201_T.csv');
    const outputStream = fs.createWriteStream('/mnt/veracrypt/TTE_Haushalt_Alle_202605291201_T.out.txt');

    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let timestampMs = new Date(2000, 0, 2, 0, 0, 0, 0).getTime(); // Month 0 is January
    for await (const line of rl) {
        if (!line.trim()) continue; // Skip empty lines

        // 1. Split the CSV line: ["Andreas", "Dagmar", "50,00"]
        const x = line.split(";");

        // 2. Parse the amount (replace German comma with dot)
        const amount = parseFloat(x[2].replace(',', '.'));

        // 3. Create a fixed target date (Local Time)
        timestampMs -= 60000; // jeder eintrag ist 1 min vor dem vorigen (weil das inputfile von ALT nach neu sortiert ist aber wir neuere oben haben wollen)
        const formattedDate = formatLocalDate(new Date(timestampMs));    // "2000-01-01 00:00"

        // 4. Determine roles based on the sender
        const isAndreas = line.startsWith('Andreas');
        const valueA = isAndreas ? 0 : amount;
        const valueD = isAndreas ? amount : 0;

        // 5. Build the payload object
        const payload = {
            a: valueA,
            d: valueD,
            b: "",
            k: "Geldtransfer",
            s: isAndreas ? -amount : amount
        };

        const outputLine = `Ausgabe#${formattedDate}#${timestampMs}=${JSON.stringify(payload)}`;

        outputStream.write(outputLine + '\n');
    }

    outputStream.end();
    console.log('File processing complete!');
}
// Hilfsfunktion zum Formatieren des Datums als YYYY-MM-DD HH:mm
function formatLocalDate(date) {
    const pad = (num) => String(num).padStart(2, '0');

    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1); // Monate sind 0-basiert
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());

    return `${year}-${month}-${day} ${hours}:${minutes}`;
}

processFileZahlungen();
processFileTransfer();
