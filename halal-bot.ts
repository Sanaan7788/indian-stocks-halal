
import { chromium, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { v2 as cloudinary } from 'cloudinary';
import * as dotenv from 'dotenv';

// NEW: Load environment variables from .env file
dotenv.config();

const CONFIG = {
    INPUT_FILE: 'nifty50_final.csv',
    CSV_OUTPUT: 'halal_report.csv',
    HTML_OUTPUT: 'index.html',
    WAIT_TIME: 1500,
    CLOUDINARY_FOLDER: 'indian_stocks_halal'
};

// NEW: Configure Cloudinary using keys from .env
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

function loadNiftySymbols(): string[] {
    const inputPath = path.resolve(__dirname, CONFIG.INPUT_FILE);
    if (!fs.existsSync(inputPath)) return [];

    const rawLines = fs.readFileSync(inputPath, 'utf-8').split('\n');
    const validSymbols: string[] = [];
    const symbolPattern = /^[A-Z0-9&]+$/;

    for (let i = 2; i < rawLines.length; i++) {
        const cols = rawLines[i].split(',');
        let sym = cols[0]?.replace(/"/g, '').trim();

        if (sym && symbolPattern.test(sym) && sym !== 'NIFTY 50') {
            validSymbols.push(`${sym}.NS`);
        }
    }
    console.log(`✅ Loaded ${validSymbols.length} Symbols.`);
    return validSymbols;
}

async function injectCssKiller(page: Page) {
    const css = `
        app-riba-modal, .riba_free_modal, .modal-content, .modal-backdrop, .backdrop, .cdk-overlay-backdrop, .modal {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
        }
        body { overflow: auto !important; padding-right: 0 !important; }
    `;
    await page.addStyleTag({ content: css });
}

// NEW: Helper function to upload image buffer to Cloudinary
// Returns the secure web URL of the uploaded image
async function uploadToCloud(imageBuffer: Buffer, symbol: string): Promise<string> {
    return new Promise((resolve) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                public_id: `${CONFIG.CLOUDINARY_FOLDER}/${symbol}`,
                overwrite: true,
                resource_type: "image"
            },
            (error, result) => {
                if (error) {
                    console.log(`   ⚠️ Cloudinary Error: ${error.message}`);
                    resolve('No Image');
                } else {
                    resolve(result?.secure_url || 'No Image');
                }
            }
        );
        uploadStream.end(imageBuffer);
    });
}

async function processStock(page: Page, symbol: string) {
    let musaffaName = "-";
    let status = "SKIPPED";
    let imgUrl = "No Image";

    try {
        console.log(`\n🔍 Processing: ${symbol}`);
        await injectCssKiller(page);

        const searchBar = page.getByPlaceholder('Search Stocks & ETFs');
        await searchBar.click({ force: true });
        await searchBar.fill(symbol);
        await page.waitForTimeout(2000);

        const dropdownItems = page.locator('.stock-name');
        const count = await dropdownItems.count();
        if (count === 0) throw new Error("Dropdown empty");

        let clicked = false;
        const cleanSearch = symbol.replace('.NS', '');

        for (let i = 0; i < count; i++) {
            const text = await dropdownItems.nth(i).innerText();
            if (text.includes(cleanSearch)) {
                await dropdownItems.nth(i).click({ force: true });
                clicked = true;
                break;
            }
        }
        if (!clicked) await dropdownItems.first().click({ force: true });

        try {
            const nameEl = page.locator('.company-name').first();
            if (await nameEl.isVisible()) musaffaName = await nameEl.innerText();
        } catch (e) { }

        const statusLocator = page.locator('.compliance-chip h5.status-text');
        await statusLocator.waitFor({ state: 'visible', timeout: 5000 });
        status = (await statusLocator.innerText()).replace(/\n/g, ' ').trim();

        console.log(`   👉 Found: ${musaffaName} | Status: ${status}`);

    } catch (error: any) {
        console.log(`   ❌ Failed: ${error.message}`);
    }

    // NEW: Capture screenshot to memory buffer and upload to Cloud
    try {
        const buffer = await page.screenshot();
        console.log("   ☁️ Uploading evidence...");
        imgUrl = await uploadToCloud(buffer, symbol);
        console.log("   ✅ Uploaded!");
    } catch (e) { console.log("   ⚠️ Upload failed"); }

    return { symbol, musaffaName, status, imgUrl };
}

function generateHtmlReport() {
    if (!fs.existsSync(CONFIG.CSV_OUTPUT)) return;
    const csvData = fs.readFileSync(CONFIG.CSV_OUTPUT, 'utf-8').split('\n');

    let html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Nifty 50 Halal Screener</title>
        <meta charset="UTF-8">
        <style>
            body { font-family: sans-serif; padding: 20px; background: #f8f9fa; }
            .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #343a40; color: white; padding: 12px; text-align: left; }
            td { padding: 12px; border-bottom: 1px solid #dee2e6; vertical-align: middle; }
            .badge { padding: 5px 10px; border-radius: 4px; font-weight: bold; font-size: 0.85em; }
            .HALAL { background: #d4edda; color: #155724; }
            .NOT { background: #f8d7da; color: #721c24; }
            .DOUBTFUL { background: #fff3cd; color: #856404; }
            .SKIPPED { background: #e2e3e5; color: #383d41; text-decoration: line-through; }
            .thumb { height: 50px; border: 1px solid #ddd; cursor: pointer; transition: 0.2s; }
            .thumb:hover { transform: scale(3); z-index: 10; border-color: #333; position: relative; }
            .modal { display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); }
            .modal-content { display: block; max-width: 90%; max-height: 90%; margin: 50px auto; }
            .close { position: absolute; top: 20px; right: 35px; color: #fff; font-size: 40px; cursor: pointer; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>📊 Nifty 50 Halal Screener</h1>
            <table>
                <tr><th>#</th><th>Symbol</th><th>Company Name</th><th>Status</th><th>Evidence</th></tr>
    `;

    let counter = 1;
    for (let i = 1; i < csvData.length; i++) {
        const row = csvData[i].split(',');
        if (row.length < 4) continue;
        const [sym, name, status, img] = row;

        let badgeClass = status;
        if (status.includes('NOT')) badgeClass = 'NOT';

        // NEW: Check if img starts with 'http' (Cloudinary URL) before displaying
        html += `<tr>
            <td style="text-align:center; color:#888;">${counter++}</td>
            <td><strong>${sym}</strong></td>
            <td>${name.replace(/"/g, '')}</td>
            <td><span class="badge ${badgeClass}">${status}</span></td>
            <td>${img.startsWith('http') ? `<img src="${img}" class="thumb" onclick="openModal(this.src)">` : '-'}</td>
        </tr>`;
    }
    html += `</table></div>
    <div id="myModal" class="modal" onclick="this.style.display='none'">
        <span class="close">&times;</span>
        <img class="modal-content" id="img01">
    </div>
    <script>
        function openModal(src) {
            document.getElementById("myModal").style.display = "block";
            document.getElementById("img01").src = src;
        }
    </script>
    </body></html>`;

    fs.writeFileSync(CONFIG.HTML_OUTPUT, html);
    console.log(`\n✨ REPORT READY: ${CONFIG.HTML_OUTPUT}`);
}

async function main() {
    const symbols = loadNiftySymbols();
    fs.writeFileSync(CONFIG.CSV_OUTPUT, 'Symbol,Name,Status,Screenshot\n');

    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page = await context.newPage();

    await page.goto('https://musaffa.com', { waitUntil: 'domcontentloaded' });
    await injectCssKiller(page);

    for (const sym of symbols) {
        const result = await processStock(page, sym);
        const csvLine = `${result.symbol},"${result.musaffaName}",${result.status},${result.imgUrl}\n`;
        fs.appendFileSync(CONFIG.CSV_OUTPUT, csvLine);

        await page.goto('https://musaffa.com');
        await page.waitForTimeout(1000);
    }

    generateHtmlReport();
    await browser.close();
}

main();