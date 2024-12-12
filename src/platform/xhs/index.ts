import { BrowserContext, chromium, Page } from "playwright";
import { Semaphore } from 'async-mutex';
import { Platform, PlatformConfig, PlatformMetadata, Source } from "../PlatformRegister"
import { NoteDetail, XiaoHongShuClient } from "./client";
import { getSearchId } from "./helper";
import { SearchNoteType, SearchSortType } from "./models";
import { XiaoHongShuLogin } from "./login";
import { SSEPromise } from "../../base/PartPromise";


interface XhsConfig extends PlatformConfig {

}

export class Xhs implements Platform<XhsConfig> {
  metadata: PlatformMetadata = {
    name: "小红书",
    code: "xhs",
    icon: "https://xhs.com/favicon.ico"
  };

  private contextPage?: Page;
  private xhsClient?: XiaoHongShuClient;
  private browserContext?: BrowserContext;
  private indexUrl: string;
  private userAgent: string;

  constructor() {
    this.indexUrl = "https://www.xiaohongshu.com";
    this.userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
  }


  async start(config: XhsConfig): Promise<void> {
    const playwrightProxyFormat = null;
    const httpxProxyFormat = null;

    // Launch browser and context
    const browser = await chromium.launch({ headless: false });
    this.browserContext = await browser.newContext({
      userAgent: this.userAgent,
      viewport: { width: 1920, height: 1080 }
    });

    this.contextPage = await this.browserContext.newPage();
    await this.contextPage.goto(this.indexUrl);

    // Create client
    this.xhsClient = await this.createXhsClient(httpxProxyFormat);

    // Perform login if necessary
    const loginObj = new XiaoHongShuLogin(
      this.browserContext,
      this.contextPage,
      '',
    );
    await loginObj.begin();
    await this.xhsClient.updateCookies(this.browserContext);

    console.info("[XiaoHongShuCrawler.start] Xhs Crawler finished ...");
  }
  stop(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  convert(noteDetails: NoteDetail[]): Source[] {
    return noteDetails.map(({ note_id, title, desc, image_list = [], xsec_token }) => {
      const images = Array.isArray(image_list) ? image_list.map((image) => image.url_pre) : [];
      return {
        id: note_id,
        title,
        url: `https://www.xiaohongshu.com/explore/${note_id}?xsec_token=${xsec_token}&xsec_source=`,
        snippet: desc,
        images
      }
    });
  }

  async search(q: string, sse: SSEPromise<Source[]>): Promise<Source[]> {
    const ssePromise = new SSEPromise<NoteDetail[]>();
    ssePromise.then(
      (noteDetails) => sse.partResolve(this.convert(noteDetails)),
      () => {}
    );
    const noteDetails = await this.doSearch(q, ssePromise);
    return this.convert(noteDetails);
  }

  async doSearch(keyword: string, sse: SSEPromise<NoteDetail[]>): Promise<NoteDetail[]> {
    if (!this.xhsClient) {
      throw new Error("XiaoHongShu client is not initialized");
    }
    console.info("[XiaoHongShuCrawler.search] Begin search xiaohongshu keywords");
    let xhsLimitCount = 20;
  
    const startPage = 1;

    console.info(`[XiaoHongShuCrawler.search] Current search keyword: ${keyword}`);
    let page = 1;
    const searchId = getSearchId();

    const results: NoteDetail[] = [];

    while ((page - startPage + 1) * xhsLimitCount <= 20) {
      if (page < startPage) {
        console.info(`[XiaoHongShuCrawler.search] Skip page ${page}`);
        page++;
        continue;
      }

      try {
        console.info(`[XiaoHongShuCrawler.search] search xhs keyword: ${keyword}, page: ${page}`);
        const notesRes = await this.xhsClient.getNoteByKeyword(
          keyword,
          searchId,
          page,
          xhsLimitCount,
          SearchSortType.MOST_POPULAR,
        );

        if (!notesRes || !notesRes['has_more']) {
          console.info("No more content!");
          break;
        }

        const semaphore = new Semaphore(1);
        const taskList = notesRes.items.map(async (postItem: { model_type: string; id: string; xsec_source: string; xsec_token: string; }) => {
          if (postItem.model_type !== 'rec_query' && postItem.model_type !== 'hot_query') {
            const result = await this.getNoteDetailAsyncTask(
              postItem.id,
              postItem.xsec_source,
              postItem.xsec_token,
              semaphore
            );
            if (result) {
              results.push(result);
              sse.partResolve(results);
            }
            console.info(`[XiaoHongShuCrawler.search] Get note detail: ${postItem.id}`);
            return result;
          }
        });

        await Promise.all(taskList);
        page++;
      } catch (error) {
        console.error("[XiaoHongShuCrawler.search] Get note detail error", error);
        break;
      }
    }

    return results;
  }

  /**
   * async def get_note_detail_async_task(
        self,
        note_id: str,
        xsec_source: str,
        xsec_token: str,
        semaphore: asyncio.Semaphore,
    ) -> Optional[Dict]:
        """Get note detail

        Args:
            note_id:
            xsec_source:
            xsec_token:
            semaphore:

        Returns:
            Dict: note detail
        """
        note_detail_from_html, note_detail_from_api = None, None
        async with semaphore:
            # When proxy is not enabled, increase the crawling interval
            if config.ENABLE_IP_PROXY:
                crawl_interval = random.random()
            else:
                crawl_interval = random.uniform(1, config.CRAWLER_MAX_SLEEP_SEC)
            try:
                # 尝试直接获取网页版笔记详情，携带cookie
                note_detail_from_html: Optional[Dict] = (
                    await self.xhs_client.get_note_by_id_from_html(
                        note_id, xsec_source, xsec_token, enable_cookie=True
                    )
                )
                time.sleep(crawl_interval)
                if not note_detail_from_html:
                    # 如果网页版笔记详情获取失败，则尝试不使用cookie获取
                    note_detail_from_html = (
                        await self.xhs_client.get_note_by_id_from_html(
                            note_id, xsec_source, xsec_token, enable_cookie=False
                        )
                    )
                    utils.logger.error(
                        f"[XiaoHongShuCrawler.get_note_detail_async_task] Get note detail error, note_id: {note_id}"
                    )
                if not note_detail_from_html:
                    # 如果网页版笔记详情获取失败，则尝试API获取
                    note_detail_from_api: Optional[Dict] = (
                        await self.xhs_client.get_note_by_id(
                            note_id, xsec_source, xsec_token
                        )
                    )
                note_detail = note_detail_from_html or note_detail_from_api
                if note_detail:
                    note_detail.update(
                        {"xsec_token": xsec_token, "xsec_source": xsec_source}
                    )
                    return note_detail
            except DataFetchError as ex:
                utils.logger.error(
                    f"[XiaoHongShuCrawler.get_note_detail_async_task] Get note detail error: {ex}"
                )
                return None
            except KeyError as ex:
                utils.logger.error(
                    f"[XiaoHongShuCrawler.get_note_detail_async_task] have not fund note detail note_id:{note_id}, err: {ex}"
                )
                return None
   */
  async getNoteDetailAsyncTask(noteId: string, xsecSource: string, xsecToken: string, semaphore: Semaphore): Promise<NoteDetail | null> {
    if (!this.xhsClient || !this.browserContext) {
      throw new Error("XiaoHongShu client is not initialized");
    }

    let noteDetailFromHtml, noteDetailFromApi;

    const [value, release] = await semaphore.acquire();
    try {
      const crawlInterval = Math.random() + 1;
      noteDetailFromHtml = await this.xhsClient.getNoteByIdFromHtml(noteId, xsecSource, xsecToken, true);
      await new Promise(resolve => setTimeout(resolve, crawlInterval * 1000));
      if (!noteDetailFromHtml) {
        noteDetailFromHtml = await this.xhsClient.getNoteByIdFromHtml(noteId, xsecSource, xsecToken, false);
      }
      if (!noteDetailFromHtml) {
        noteDetailFromApi = await this.xhsClient.getNoteById(noteId, xsecSource, xsecToken);
      }

      return noteDetailFromHtml || noteDetailFromApi || null;
    }
    catch (error) {
      console.error("[XiaoHongShuCrawler.getNoteDetailAsyncTask] Get note detail error", error);
      return null;
    } finally {
      release();
    }
  }

  async createXhsClient(httpxProxy: string | null): Promise<XiaoHongShuClient> {
    if (!this.browserContext || !this.contextPage) {
      throw new Error("Browser context is not initialized");
    }

    console.info("[XiaoHongShuCrawler.create_xhs_client] Begin create xiaohongshu API client ...");
    const cookies = await this.browserContext.cookies();
    const cookieStr = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');

    return new XiaoHongShuClient(
      {
        "User-Agent": this.userAgent,
        "Cookie": cookieStr,
        "Origin": "https://www.xiaohongshu.com",
        "Referer": "https://www.xiaohongshu.com",
        "Content-Type": "application/json;charset=UTF-8"
      },
      this.contextPage,
      {},
      10000,
      httpxProxy,
    );
  }

}