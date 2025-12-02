// import { chromium, Page } from 'playwright';
// import * as fs from 'fs';
// import * as path from 'path';
// import { v2 as cloudinary } from 'cloudinary';
// import * as dotenv from 'dotenv';

// dotenv.config();

// const CONFIG = {
//     INPUT_FILE: 'nifty50_final.csv',
//     CSV_OUTPUT: 'halal_report.csv',
//     HTML_OUTPUT: 'index.html',
//     WAIT_TIME: 1500,
//     CLOUDINARY_FOLDER: 'indian_stocks_halal',

//     // 🔴 TEST MODE: Set to 5 to check only 5 stocks. Set to 0 for FULL RUN.
//     TEST_LIMIT: 5
// };

// cloudinary.config({
//     cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//     api_key: process.env.CLOUDINARY_API_KEY,
//     api_secret: process.env.CLOUDINARY_API_SECRET
// });

// function loadNiftySymbols(): string[] {
//     const inputPath = path.resolve(__dirname, CONFIG.INPUT_FILE);
//     if (!fs.existsSync(inputPath)) return [];

//     const rawLines = fs.readFileSync(inputPath, 'utf-8').split('\n');
//     const validSymbols: string[] = [];
//     const symbolPattern = /^[A-Z0-9&]+$/;

//     for (let i = 2; i < rawLines.length; i++) {
//         const cols = rawLines[i].split(',');
//         let sym = cols[0]?.replace(/"/g, '').trim();

//         if (sym && symbolPattern.test(sym) && sym !== 'NIFTY 50') {
//             validSymbols.push(`${sym}.NS`);
//         }
//     }

//     // LOGIC: Check if Test Limit is active
//     if (CONFIG.TEST_LIMIT > 0) {
//         console.log(`⚠️ TEST MODE ON: Processing only first ${CONFIG.TEST_LIMIT} stocks.`);
//         return validSymbols.slice(0, CONFIG.TEST_LIMIT);
//     }

//     console.log(`✅ PRODUCTION MODE: Loaded all ${validSymbols.length} Symbols.`);
//     return validSymbols;
// }

// async function injectCssKiller(page: Page) {
//     const css = `
//         app-riba-modal, .riba_free_modal, .modal-content, .modal-backdrop, .backdrop, .cdk-overlay-backdrop, .modal {
//             display: none !important;
//             visibility: hidden !important;
//             opacity: 0 !important;
//             pointer-events: none !important;
//         }
//         body { overflow: auto !important; padding-right: 0 !important; }
//     `;
//     await page.addStyleTag({ content: css });
// }

// async function uploadToCloud(imageBuffer: Buffer, symbol: string): Promise<string> {
//     return new Promise((resolve) => {
//         const uploadStream = cloudinary.uploader.upload_stream(
//             {
//                 public_id: `${CONFIG.CLOUDINARY_FOLDER}/${symbol}`,
//                 overwrite: true,
//                 resource_type: "image"
//             },
//             (error, result) => {
//                 if (error) {
//                     console.log(`   ⚠️ Cloudinary Error: ${error.message}`);
//                     resolve('No Image');
//                 } else {
//                     resolve(result?.secure_url || 'No Image');
//                 }
//             }
//         );
//         uploadStream.end(imageBuffer);
//     });
// }

// async function processStock(page: Page, symbol: string) {
//     let musaffaName = "-";
//     let status = "SKIPPED";
//     let imgUrl = "No Image";

//     try {
//         console.log(`\n🔍 Processing: ${symbol}`);
//         await injectCssKiller(page);

//         const searchBar = page.getByPlaceholder('Search Stocks & ETFs');
//         await searchBar.click({ force: true });
//         await searchBar.fill(symbol);
//         await page.waitForTimeout(2000);

//         const dropdownItems = page.locator('.stock-name');
//         const count = await dropdownItems.count();
//         if (count === 0) throw new Error("Dropdown empty");

//         let clicked = false;
//         const cleanSearch = symbol.replace('.NS', '');

//         for (let i = 0; i < count; i++) {
//             const text = await dropdownItems.nth(i).innerText();
//             if (text.includes(cleanSearch)) {
//                 await dropdownItems.nth(i).click({ force: true });
//                 clicked = true;
//                 break;
//             }
//         }
//         if (!clicked) await dropdownItems.first().click({ force: true });

//         try {
//             const nameEl = page.locator('.company-name').first();
//             if (await nameEl.isVisible()) musaffaName = await nameEl.innerText();
//         } catch (e) { }

//         const statusLocator = page.locator('.compliance-chip h5.status-text');
//         await statusLocator.waitFor({ state: 'visible', timeout: 5000 });
//         status = (await statusLocator.innerText()).replace(/\n/g, ' ').trim();

//         console.log(`   👉 Found: ${musaffaName} | Status: ${status}`);

//     } catch (error: any) {
//         console.log(`   ❌ Failed: ${error.message}`);
//     }

//     try {
//         const buffer = await page.screenshot();
//         console.log("   ☁️ Uploading evidence...");
//         imgUrl = await uploadToCloud(buffer, symbol);
//         console.log("   ✅ Uploaded!");
//     } catch (e) { console.log("   ⚠️ Upload failed"); }

//     return { symbol, musaffaName, status, imgUrl };
// }

// function generateHtmlReport() {
//     if (!fs.existsSync(CONFIG.CSV_OUTPUT)) return;
//     const csvData = fs.readFileSync(CONFIG.CSV_OUTPUT, 'utf-8').split('\n');

//     const now = new Date();
//     const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
//     const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

//     let html = `
//     <!DOCTYPE html>
//     <html lang="en">
//     <head>
//         <meta charset="UTF-8">
//         <meta name="viewport" content="width=device-width, initial-scale=1.0">
//         <title>Nifty 50 Halal Screener</title>
//         <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
//         <style>
//             :root { --primary: #0f172a; --secondary: #64748b; --bg-color: #f1f5f9; --card-bg: #ffffff; --border: #e2e8f0; --success-bg: #dcfce7; --success-text: #166534; --danger-bg: #fee2e2; --danger-text: #991b1b; --warning-bg: #fef3c7; --warning-text: #92400e; }
//             body { font-family: 'Inter', sans-serif; background-color: var(--bg-color); color: var(--primary); margin: 0; padding: 40px 20px; }
//             .container { max-width: 1200px; margin: 0 auto; background: var(--card-bg); border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); overflow: hidden; }
//             header { background: var(--primary); color: white; padding: 2rem; display: flex; justify-content: space-between; align-items: center; }
//             .header-content h1 { margin: 0; font-size: 1.5rem; font-weight: 700; }
//             .header-content p { margin: 4px 0 0 0; color: #94a3b8; font-size: 0.875rem; }
//             .update-badge { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); padding: 0.5rem 1rem; border-radius: 9999px; font-size: 0.875rem; display: flex; align-items: center; gap: 8px; }
//             .update-dot { width: 8px; height: 8px; background-color: #4ade80; border-radius: 50%; box-shadow: 0 0 8px #4ade80; }
//             table { width: 100%; border-collapse: collapse; text-align: left; }
//             th { background-color: #f8fafc; padding: 16px 24px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; color: var(--secondary); border-bottom: 1px solid var(--border); }
//             td { padding: 16px 24px; border-bottom: 1px solid var(--border); font-size: 0.925rem; }
//             .badge { display: inline-flex; align-items: center; padding: 4px 12px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; }
//             .HALAL { background-color: var(--success-bg); color: var(--success-text); }
//             .NOT { background-color: var(--danger-bg); color: var(--danger-text); }
//             .DOUBTFUL { background-color: var(--warning-bg); color: var(--warning-text); }
//             .SKIPPED { background-color: #f1f5f9; color: #64748b; }
//             .thumb-wrapper { width: 60px; height: 40px; border-radius: 6px; overflow: hidden; border: 1px solid var(--border); cursor: pointer; transition: all 0.2s ease; }
//             .thumb-wrapper img { width: 100%; height: 100%; object-fit: cover; }
//             .thumb-wrapper:hover { transform: scale(1.05); }
//             .symbol-text { font-weight: 600; color: var(--primary); }
//             .name-text { color: var(--secondary); }
//             .modal { display: none; position: fixed; z-index: 1000; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(15, 23, 42, 0.9); backdrop-filter: blur(4px); }
//             .modal-content { display: block; max-width: 90%; max-height: 90vh; margin: 2vh auto; border-radius: 8px; }
//             .close-btn { position: absolute; top: 20px; right: 30px; color: white; font-size: 40px; cursor: pointer; }
//         </style>
//     </head>
//     <body>
//         <div class="container">
//             <header>
//                 <div class="header-content">
//                     <h1>📊 Nifty 50 Halal Screener</h1>
//                     <p>Automated Shariah Compliance Audit Report</p>
//                 </div>
//                 <div class="update-badge">
//                     <div class="update-dot"></div>
//                     Updated: ${dateStr} at ${timeStr}
//                 </div>
//             </header>
//             <div class="table-container">
//                 <table>
//                     <thead>
//                         <tr><th style="width: 60px">#</th><th>Symbol</th><th>Company Name</th><th>Status</th><th>Evidence</th></tr>
//                     </thead>
//                     <tbody>
//     `;

//     let counter = 1;
//     for (let i = 1; i < csvData.length; i++) {
//         const row = csvData[i].split(',');
//         if (row.length < 4) continue;
//         const [sym, name, status, img] = row;
//         let badgeClass = status;
//         if (status.includes('NOT')) badgeClass = 'NOT';

//         html += `<tr>
//             <td style="color: #94a3b8; text-align: center;">${counter++}</td>
//             <td><div class="symbol-text">${sym.replace('.NS', '')}</div></td>
//             <td><div class="name-text">${name.replace(/"/g, '')}</div></td>
//             <td><span class="badge ${badgeClass}">${status}</span></td>
//             <td>${img.startsWith('http') ? `<div class="thumb-wrapper" onclick="openModal('${img}')"><img src="${img}" alt="Evidence"></div>` : '<span style="color:#cbd5e1; font-size: 0.8rem;">No Data</span>'}</td>
//         </tr>`;
//     }

//     html += `</tbody></table></div></div>
//         <div id="myModal" class="modal" onclick="closeModal()">
//             <span class="close-btn">&times;</span>
//             <img class="modal-content" id="img01">
//         </div>
//         <script>
//             function openModal(src) {
//                 document.getElementById("myModal").style.display = "flex";
//                 document.getElementById("myModal").style.alignItems = "center";
//                 document.getElementById("img01").src = src;
//             }
//             function closeModal() { document.getElementById("myModal").style.display = "none"; }
//             document.addEventListener('keydown', function(event) { if (event.key === "Escape") closeModal(); });
//         </script>
//     </body></html>`;

//     fs.writeFileSync(CONFIG.HTML_OUTPUT, html);
//     console.log(`\n✨ REPORT READY: ${CONFIG.HTML_OUTPUT}`);
// }

// async function main() {
//     const symbols = loadNiftySymbols();
//     fs.writeFileSync(CONFIG.CSV_OUTPUT, 'Symbol,Name,Status,Screenshot\n');

//     const browser = await chromium.launch({ headless: false });
//     const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
//     const page = await context.newPage();

//     await page.goto('https://musaffa.com', { waitUntil: 'domcontentloaded' });
//     await injectCssKiller(page);

//     for (const sym of symbols) {
//         const result = await processStock(page, sym);
//         const csvLine = `${result.symbol},"${result.musaffaName}",${result.status},${result.imgUrl}\n`;
//         fs.appendFileSync(CONFIG.CSV_OUTPUT, csvLine);

//         await page.goto('https://musaffa.com');
//         await page.waitForTimeout(1000);
//     }

//     generateHtmlReport();
//     await browser.close();
// }

// main();

import { chromium, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { v2 as cloudinary } from 'cloudinary';
import * as dotenv from 'dotenv';

dotenv.config();

const CONFIG = {
    INPUT_FILE: 'nifty50_final.csv',
    CSV_OUTPUT: 'halal_report.csv',
    HTML_OUTPUT: 'index.html',
    WAIT_TIME: 1500,
    CLOUDINARY_FOLDER: 'indian_stocks_halal',
    TEST_LIMIT: 5 // Set to 0 for FULL RUN
};

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

    if (CONFIG.TEST_LIMIT > 0) {
        console.log(`⚠️ TEST MODE ON: Processing only first ${CONFIG.TEST_LIMIT} stocks.`);
        return validSymbols.slice(0, CONFIG.TEST_LIMIT);
    }
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

async function uploadToCloud(imageBuffer: Buffer, symbol: string): Promise<string> {
    return new Promise((resolve) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                public_id: `${CONFIG.CLOUDINARY_FOLDER}/${symbol}`,
                overwrite: true,
                resource_type: "image"
            },
            (error, result) => {
                if (error) resolve('No Image');
                else resolve(result?.secure_url || 'No Image');
            }
        );
        uploadStream.end(imageBuffer);
    });
}

async function processStock(page: Page, symbol: string) {
    let musaffaName = "-";
    let status = "SKIPPED";
    let imgUrl = "No Image";
    let pageUrl = "https://musaffa.com"; // Default URL

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

        // Capture the actual URL of the stock page
        pageUrl = page.url();

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

    try {
        const buffer = await page.screenshot();
        console.log("   ☁️ Uploading evidence...");
        imgUrl = await uploadToCloud(buffer, symbol);
        console.log("   ✅ Uploaded!");
    } catch (e) { console.log("   ⚠️ Upload failed"); }

    // Return the URL as part of the result
    return { symbol, musaffaName, status, imgUrl, pageUrl };
}

function generateHtmlReport() {
    if (!fs.existsSync(CONFIG.CSV_OUTPUT)) return;
    const csvData = fs.readFileSync(CONFIG.CSV_OUTPUT, 'utf-8').split('\n');

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    let html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Nifty 50 Halal Screener</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
            :root { --primary: #0f172a; --secondary: #64748b; --bg-color: #f1f5f9; --card-bg: #ffffff; --border: #e2e8f0; --success-bg: #dcfce7; --success-text: #166534; --danger-bg: #fee2e2; --danger-text: #991b1b; --warning-bg: #fef3c7; --warning-text: #92400e; }
            body { font-family: 'Inter', sans-serif; background-color: var(--bg-color); color: var(--primary); margin: 0; padding: 40px 20px; }
            .container { max-width: 1200px; margin: 0 auto; background: var(--card-bg); border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); overflow: hidden; }
            header { background: var(--primary); color: white; padding: 2rem; display: flex; justify-content: space-between; align-items: center; }
            .header-content h1 { margin: 0; font-size: 1.5rem; font-weight: 700; }
            .header-content p { margin: 4px 0 0 0; color: #94a3b8; font-size: 0.875rem; }
            .update-badge { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); padding: 0.5rem 1rem; border-radius: 9999px; font-size: 0.875rem; display: flex; align-items: center; gap: 8px; }
            .update-dot { width: 8px; height: 8px; background-color: #4ade80; border-radius: 50%; box-shadow: 0 0 8px #4ade80; }
            table { width: 100%; border-collapse: collapse; text-align: left; }
            th { background-color: #f8fafc; padding: 16px 24px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; color: var(--secondary); border-bottom: 1px solid var(--border); }
            td { padding: 16px 24px; border-bottom: 1px solid var(--border); font-size: 0.925rem; }
            .badge { display: inline-flex; align-items: center; padding: 4px 12px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; }
            .HALAL { background-color: var(--success-bg); color: var(--success-text); }
            .NOT { background-color: var(--danger-bg); color: var(--danger-text); }
            .DOUBTFUL { background-color: var(--warning-bg); color: var(--warning-text); }
            .SKIPPED { background-color: #f1f5f9; color: #64748b; }
            .thumb-wrapper { width: 60px; height: 40px; border-radius: 6px; overflow: hidden; border: 1px solid var(--border); cursor: pointer; transition: all 0.2s ease; }
            .thumb-wrapper img { width: 100%; height: 100%; object-fit: cover; }
            .thumb-wrapper:hover { transform: scale(1.05); }
            
            /* Symbol Link Style */
            .symbol-link { font-weight: 700; color: #2563eb; text-decoration: none; transition: color 0.2s; }
            .symbol-link:hover { color: #1d4ed8; text-decoration: underline; }
            
            .name-text { color: var(--secondary); }
            .modal { display: none; position: fixed; z-index: 1000; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(15, 23, 42, 0.9); backdrop-filter: blur(4px); }
            .modal-content { display: block; max-width: 90%; max-height: 90vh; margin: 2vh auto; border-radius: 8px; }
            .close-btn { position: absolute; top: 20px; right: 30px; color: white; font-size: 40px; cursor: pointer; }
        </style>
    </head>
    <body>
        <div class="container">
            <header>
                <div class="header-content">
                    <h1>📊 Nifty 50 Halal Screener</h1>
                    <p>Automated Shariah Compliance Audit Report</p>
                </div>
                <div class="update-badge">
                    <div class="update-dot"></div>
                    Updated: ${dateStr} at ${timeStr}
                </div>
            </header>
            <div class="table-container">
                <table>
                    <thead>
                        <tr><th style="width: 60px">#</th><th>Symbol</th><th>Company Name</th><th>Status</th><th>Evidence</th></tr>
                    </thead>
                    <tbody>
    `;

    let counter = 1;
    for (let i = 1; i < csvData.length; i++) {
        const row = csvData[i].split(',');
        if (row.length < 5) continue; // Now checking for 5 columns
        const [sym, name, status, img, url] = row;

        let badgeClass = status;
        if (status.includes('NOT')) badgeClass = 'NOT';

        // 1. Remove .NS suffix
        const displaySymbol = sym.replace('.NS', '');

        // 2. Create Hyperlink
        // Use the URL from the CSV, or fallback to musaffa.com if missing
        const link = (url && url.startsWith('http')) ? url : `https://musaffa.com`;

        html += `
            <tr>
                <td style="color: #94a3b8; text-align: center;">${counter++}</td>
                <td><a href="${link}" target="_blank" class="symbol-link">${displaySymbol} ↗</a></td>
                <td><div class="name-text">${name.replace(/"/g, '')}</div></td>
                <td><span class="badge ${badgeClass}">${status}</span></td>
                <td>
                    ${img.startsWith('http') ?
                `<div class="thumb-wrapper" onclick="openModal('${img}')">
                        <img src="${img}" alt="Evidence">
                     </div>` :
                '<span style="color:#cbd5e1; font-size: 0.8rem;">No Data</span>'}
                </td>
            </tr>`;
    }

    html += `</tbody></table></div></div>
        <div id="myModal" class="modal" onclick="closeModal()">
            <span class="close-btn">&times;</span>
            <img class="modal-content" id="img01">
        </div>
        <script>
            function openModal(src) {
                document.getElementById("myModal").style.display = "flex";
                document.getElementById("myModal").style.alignItems = "center";
                document.getElementById("img01").src = src;
            }
            function closeModal() { document.getElementById("myModal").style.display = "none"; }
            document.addEventListener('keydown', function(event) { if (event.key === "Escape") closeModal(); });
        </script>
    </body></html>`;

    fs.writeFileSync(CONFIG.HTML_OUTPUT, html);
    console.log(`\n✨ REPORT READY: ${CONFIG.HTML_OUTPUT}`);
}

async function main() {
    const symbols = loadNiftySymbols();

    // Add URL column to CSV Header
    fs.writeFileSync(CONFIG.CSV_OUTPUT, 'Symbol,Name,Status,Screenshot,PageURL\n');

    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page = await context.newPage();

    await page.goto('https://musaffa.com', { waitUntil: 'domcontentloaded' });
    await injectCssKiller(page);

    for (const sym of symbols) {
        const result = await processStock(page, sym);
        // Save URL in the 5th column
        const csvLine = `${result.symbol},"${result.musaffaName}",${result.status},${result.imgUrl},${result.pageUrl}\n`;
        fs.appendFileSync(CONFIG.CSV_OUTPUT, csvLine);

        await page.goto('https://musaffa.com');
        await page.waitForTimeout(1000);
    }

    generateHtmlReport();
    await browser.close();
}

main();