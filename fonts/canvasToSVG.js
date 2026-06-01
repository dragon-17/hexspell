/// THX Gemini 🤖.cookies << "🍪🍪🍪";
//  for implementing Moor neighbourhood image stroke extraction


/**
 * Extrahiert mehrere separate Konturen aus einem Canvas oder Text.
 * @param {HTMLCanvasElement|string} source - Ein bemaltes Canvas oder ein Text-String
 * @param {Object} [options] - Optionale Einstellungen für den Text-Modus
 */
function extractAllContours(source, options = {}) {
    let canvas;
    let ctx;

    // 1. Flexibler Input-Check
    if (source instanceof HTMLCanvasElement) {
        canvas = source;
        ctx = canvas.getContext('2d', { willReadFrequently: true, });
    } else if (typeof source === 'string') {
        // Fallback: Temporäres Canvas für Text erstellen
        canvas = document.createElement('canvas');
        canvas.width = options.width || 1000;
        canvas.height = options.height || 1000;
        ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#000000";
        ctx.font = options.fontStyle || "500px sans-serif";
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        ctx.fillText(source, canvas.width / 2, canvas.height / 2);
    } else {
        throw new Error("Ungültige Quelle. Erwartet wird ein Canvas oder ein String.");
    }

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    const width = imgData.width;
    const height = imgData.height;

    // Byte-Array um bereits verarbeitete Pixel zu tracken (verhindert Endlosschleifen)
    const visited = new Uint8Array(width * height);
    const allPaths = [];

    // Hilfsfunktion: Ist der Pixel schwarz und nicht weiß?
    const isBlack = (x, y) => {
        if (x < 0 || x >= width || y < 0 || y >= height) return false;
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3]; // Der Alpha-Kanal (0 = voll transparent, 255 = voll deckend)
        // 1. Wenn der Pixel transparent ist, ist er HINTERGRUND (also für uns "weiß")
        if (a < 1) {  return false; }
        // 2. Wenn er deckend ist, prüfen wir, ob die Farbe dunkel genug (schwarz/Pinsel) ist
        // Bei einem reinen transparenten Pinsel auf transparentem Grund reicht oft schon: return true;
        return (r + g + b) / 3 < 230;
    };

    // Richtungs-Offsets für Moore-Neighbor (Uhrzeigersinn)
    const dx = [0, 1, 1, 1, 0, -1, -1, -1];
    const dy = [-1, -1, 0, 1, 1, 1, 0, -1];

    // 2. Globaler Grid-Scan für unentdeckte Formen
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const currentIdx = y * width + x;

            // Kriterien für eine NEUE Kontur:
            // Pixel ist schwarz, linker Nachbar ist weiß (Kante) und wir waren hier noch nicht.
            if (isBlack(x, y) && !isBlack(x - 1, y) && !visited[currentIdx]) {
                const currentPath = [];
                let cx = x;
                let cy = y;
                let d = 7; // Start-Suchrichtung

                // Moore-Neighbor-Tracing für diese spezifische Form
                do {
                    let foundNext = false;
                    for (let i = 0; i < 8; i++) {
                        const checkDir = (d + i) % 8;
                        const nx = cx + dx[checkDir];
                        const ny = cy + dy[checkDir];

                        if (isBlack(nx, ny)) {
                            cx = nx;
                            cy = ny;
                            
                            currentPath.push( [cx,  cy ]);
                            visited[cy * width + cx] = 1; // Als besucht markieren
                            
                            d = (checkDir + 5) % 8; 
                            foundNext = true;
                            break;
                        }
                    }
                    if (!foundNext) break; // Isolierter Pixel-Punkt

                    if (currentPath.length > 20000) break; // Notbremse

                } while (cx !== x || cy !== y);

                if (currentPath.length > 0) {
                    allPaths.push(currentPath);
                }
            }
        }
    }
    return allPaths;
}

// --- ANWENDUNGS-BEISPIELE ---

// Szenario A: Direktes Auslesen des User-Canvas
// const userPaths = extractAllContours(document.getElementById('userCanvas'));
// console.log(`Der User hat ${userPaths.length} separate Striche/Formen gezeichnet.`);

// Szenario B: Text-Modus (erzeugt intern ein hochauflösendes Canvas)
// const textPaths = extractAllContours("B", { width: 1000, height: 1000 });

