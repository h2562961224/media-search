import { Page, Cookie } from 'playwright';
import axios from 'axios';

// Utility functions
async function findLoginQrcode(page: Page, selector: string, wait: boolean = true): Promise<string> {
    try {
        const element = wait ? await page.waitForSelector(selector) : await page.$(selector);
        if(!element) {
          return '';
        }
        const loginQrcodeImg = await element.getAttribute("src");

        if (loginQrcodeImg && (loginQrcodeImg.startsWith("http://") || loginQrcodeImg.startsWith("https://"))) {
            return loginQrcodeImg;
        }
        return loginQrcodeImg || '';
    } catch (error) {
        console.error(error);
        return '';
    }
}

async function findQrcodeImgFromCanvas(page: Page, canvasSelector: string): Promise<string> {
    const canvas = await page.waitForSelector(canvasSelector);
    const screenshot = await canvas.screenshot();
    return Buffer.from(screenshot).toString('base64');
}

function getUserAgent(): string {
    const uaList = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.79 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.5060.53 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.84 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.5112.79 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.5060.53 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.4844.84 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.5112.79 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.5060.53 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.4844.84 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.5112.79 Safari/537.36"
    ];
    return uaList[Math.floor(Math.random() * uaList.length)];
}

function getMobileUserAgent(): string {
    const uaList = [
        "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
        "Mozilla/5.0 (iPad; CPU OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
        "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/114.0.5735.99 Mobile/15E148 Safari/604.1",
        "Mozilla/5.0 (iPad; CPU OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/114.0.5735.124 Mobile/15E148 Safari/604.1",
        "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36",
        "Mozilla/5.0 (Linux; Android 13; SAMSUNG SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/21.0 Chrome/110.0.5481.154 Mobile Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36 OPR/99.0.0.0",
        "Mozilla/5.0 (Linux; Android 10; JNY-LX1; HMSCore 6.11.0.302) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.88 HuaweiBrowser/13.0.5.303 Mobile Safari/537.36"
    ];
    return uaList[Math.floor(Math.random() * uaList.length)];
}

function convertCookies(cookies: Cookie[] = []): [string, Record<string, string>] {
    const cookiesStr = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
    const cookieDict: Record<string, string> = {};
    cookies.forEach(cookie => {
        cookieDict[cookie.name] = cookie.value;
    });
    return [cookiesStr, cookieDict];
}

function convertStrCookieToDict(cookieStr: string): Record<string, string> {
    const cookieDict: Record<string, string> = {};
    cookieStr.split(';').forEach(cookie => {
        const [name, ...rest] = cookie.trim().split('=');
        if (name && rest) {
            cookieDict[name] = rest.join('=');
        }
    });
    return cookieDict;
}

function matchInteractInfoCount(countStr: string): number {
    const match = countStr.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
}

function formatProxyInfo(ipProxyInfo: any): [Record<string, string>, Record<string, string>] {
    const playwrightProxy = {
        server: `${ipProxyInfo.protocol}${ipProxyInfo.ip}:${ipProxyInfo.port}`,
        username: ipProxyInfo.user,
        password: ipProxyInfo.password,
    };
    const httpxProxy = {
        [ipProxyInfo.protocol]: `http://${ipProxyInfo.user}:${ipProxyInfo.password}@${ipProxyInfo.ip}:${ipProxyInfo.port}`
    };
    return [playwrightProxy, httpxProxy];
}

function extractTextFromHtml(html: string): string {
    const cleanHtml = html.replace(/<(script|style)[^>]*>.*?<\/\1>/gs, '');
    return cleanHtml.replace(/<[^>]+>/g, '').trim();
}

function extractUrlParamsToDict(url: string): Record<string, string> {
    const urlParamsDict: Record<string, string> = {};
    const parsedUrl = new URL(url);
    parsedUrl.searchParams.forEach((value, key) => {
        urlParamsDict[key] = value;
    });
    return urlParamsDict;
}

export {
    findLoginQrcode,
    findQrcodeImgFromCanvas,
    getUserAgent,
    getMobileUserAgent,
    convertCookies,
    convertStrCookieToDict,
    matchInteractInfoCount,
    formatProxyInfo,
    extractTextFromHtml,
    extractUrlParamsToDict
};
