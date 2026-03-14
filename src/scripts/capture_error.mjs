import { chromium } from 'playwright';

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.log('BROWSER ERROR:', msg.text());
        }
    });

    page.on('pageerror', error => {
        console.log('PAGE ERROR:', error.message, error.stack);
    });

    try {
        await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });
    } catch (e) {
        console.log('GOTO ERROR:', e.message);
    }

    await new Promise(r => setTimeout(r, 2000));
    await browser.close();
})();
