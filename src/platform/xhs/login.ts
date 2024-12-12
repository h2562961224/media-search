import { BrowserContext, Page } from 'playwright';
import { convertCookies, findLoginQrcode } from '../../util/crawerUtil';

class XiaoHongShuLogin {
  private browserContext: BrowserContext;
  private contextPage: Page;
  private cookieStr: string;

  constructor(
    browserContext: BrowserContext,
    contextPage: Page,
    cookieStr: string = ""
  ) {
    this.browserContext = browserContext;
    this.contextPage = contextPage;
    this.cookieStr = cookieStr;
  }

  async checkLoginState(noLoggedInSession: string): Promise<boolean> {
    if ((await this.contextPage.content()).includes("请通过验证")) {
      console.info("[XiaoHongShuLogin.checkLoginState] 登录过程中出现验证码，请手动验证");
    }

    const currentCookies = await this.browserContext.cookies();
    const [_, cookieDict] = convertCookies(currentCookies);
    const currentWebSession = cookieDict["web_session"];

    return currentWebSession !== noLoggedInSession;
  }

  async begin(): Promise<void> {
    console.info("[XiaoHongShuLogin.begin] Begin login xiaohongshu ...");
    await this.loginByQrcode();
  }

  async loginByQrcode(): Promise<void> {
    console.info("[XiaoHongShuLogin.loginByQrcode] Begin login xiaohongshu by qrcode ...");

    const qrcodeImgSelector = "xpath=//img[@class='qrcode-img']";
    let qrcodeUrl = await findLoginQrcode(this.contextPage, qrcodeImgSelector);

    if (!qrcodeUrl) {
      console.info("[XiaoHongShuLogin.loginByQrcode] QR code not found, attempting manual click...");
      await this.contextPage.waitForTimeout(500);

      const loginButton = this.contextPage.locator("xpath=//*[@id='app']/div[1]/div[2]/div[1]/ul/div[1]/button");
      await loginButton.click();

      qrcodeUrl = await findLoginQrcode(this.contextPage, qrcodeImgSelector);

      if (!qrcodeUrl) {
        return;
      }
    }

    const currentCookies = await this.browserContext.cookies();
    const [_, cookieDict] = convertCookies(currentCookies);
    const noLoggedInSession = cookieDict["web_session"];

    let times = 0;
    while (times < 24){
      const qr = await findLoginQrcode(this.contextPage, qrcodeImgSelector, false);
      if (!qr) {
        break;
      }
      await this.contextPage.waitForTimeout(5000);
      console.info(`[XiaoHongShuLogin.loginByQrcode] Waiting for scan code login, remaining time is ${(24 - times) * 5} seconds`);
      times += 1;
    }

    try {
      await this.checkLoginState(noLoggedInSession);
    } catch (error) {
      console.info("[XiaoHongShuLogin.loginByQrcode] Login failed by QR code method.");
      process.exit();
    }

    const waitRedirectSeconds = 5;
    console.info(`[XiaoHongShuLogin.loginByQrcode] Login successful, waiting ${waitRedirectSeconds} seconds for redirect ...`);
    await this.contextPage.waitForTimeout(waitRedirectSeconds * 1000);
  }
}

export { XiaoHongShuLogin };
