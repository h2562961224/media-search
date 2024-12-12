import { Page, BrowserContext } from 'playwright';

declare global {
  interface Window {
    _webmsxyw: (url: string, data: any) => Record<string, string>;
  }
}
import axios, { AxiosRequestConfig } from 'axios';
import { getSearchId, sign } from './helper';
import { SearchNoteType, SearchSortType } from './models';
import { converJsonFromCamel2Underline } from '../../util/jsonUtil';

interface NoteDetail {
  xsec_token: string;
  image_list: {
    url_pre: string;
    url_default: string;
    stream: object;
    height: number;
    width: number;
    trace_id: string;
    info_list: {
      image_scene: string;
      url: string;
    }[];
    live_photo: boolean;
    file_id: string;
    url: string;
  }[];
  tag_list: {
    id: string;
    name: string;
    type: string;
  }[];
  at_user_list: any[];
  time: number;
  share_info: {
    un_share: boolean;
  };
  title: string;
  user: {
    user_id: string;
    nickname: string;
    avatar: string;
  };
  interact_info: {
    relation: string;
    liked: boolean;
    liked_count: string;
    collected: boolean;
    collected_count: string;
    comment_count: string;
    share_count: string;
    followed: boolean;
  };
  last_update_time: number;
  note_id: string;
  type: string;
  desc: string;
}


class XiaoHongShuClient {
  private proxies: any;
  private timeout: number;
  private headers: Record<string, string>;
  private _host: string;
  private _domain: string;
  private IP_ERROR_STR: string;
  private IP_ERROR_CODE: number;
  private NOTE_ABNORMAL_STR: string;
  private NOTE_ABNORMAL_CODE: number;
  private playwrightPage: Page;
  private cookieDict: Record<string, string>;

  constructor(headers: Record<string, string>, playwrightPage: Page, cookieDict: Record<string, string>, timeout = 10000, proxies: string | null) {
    this.proxies = proxies;
    this.timeout = timeout;
    this.headers = headers;
    this._host = "https://edith.xiaohongshu.com";
    this._domain = "https://www.xiaohongshu.com";
    this.IP_ERROR_STR = "网络连接异常，请检查网络设置或重启试试";
    this.IP_ERROR_CODE = 300012;
    this.NOTE_ABNORMAL_STR = "笔记状态异常，请稍后查看";
    this.NOTE_ABNORMAL_CODE = -510001;
    this.playwrightPage = playwrightPage;
    this.cookieDict = cookieDict;
  }

  private async _preHeaders(url: string, data?: any): Promise<Record<string, string>> {
    const encryptParams: Record<string, string> = await this.playwrightPage.evaluate(
      ([url, data]) => window._webmsxyw(url, data), [url, data]
    );
    const localStorage = await this.playwrightPage.evaluate(() => window.localStorage);
    const signs = sign(
      this.cookieDict['a1'] || '',
      localStorage['b1'] || '',
      encryptParams['X-s'] || '',
      String(encryptParams['X-t'] || '')
    );

    const headers = {
      'X-S': signs['x-s'],
      'X-T': signs['x-t'],
      'x-S-Common': signs['x-s-common'],
      'X-B3-Traceid': signs['x-b3-traceid']
    };
    return { ...this.headers, ...headers };
  }

  async request(method: string, url: string, options: AxiosRequestConfig = {}): Promise<any> {
    try {
      const response = await axios({
        method,
        url,
        timeout: this.timeout,
        ...options,
        proxy: this.proxies
      });

      if (response.status === 471 || response.status === 461) {
        const verifyType = response.headers['Verifytype'];
        const verifyUuid = response.headers['Verifyuuid'];
        throw new Error(`出现验证码，请求失败，Verifytype: ${verifyType}，Verifyuuid: ${verifyUuid}`);
      }

      const data = response.data;
      if (data.success) {
        return data.data || data.success;
      } else if (data.code === this.IP_ERROR_CODE) {
        throw new Error(this.IP_ERROR_STR);
      } else {
        throw new Error(data.msg);
      }
    } catch (error) {
      throw new Error((error as Error).message);
    }
  }

  async get(uri: string, params?: Record<string, any>): Promise<any> {
    const finalUri = params ? `${uri}?${new URLSearchParams(params).toString()}` : uri;
    const headers = await this._preHeaders(finalUri);
    let result;
    result = await this.request('GET', `${this._host}${finalUri}`, { headers });
      return result;
  }

  async post(uri: string, data: Record<string, any>): Promise<any> {
    const headers = await this._preHeaders(uri, data);
    let result;
    result = await this.request('POST', `${this._host}${uri}`, {
      headers,
      data: JSON.stringify(data)
    });
    return result;
  }

  async getNoteMedia(url: string): Promise<Buffer | null> {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: this.timeout,
        proxy: this.proxies
      });
      return response.data;
    } catch (error) {
      console.error(`[XiaoHongShuClient.getNoteMedia] request ${url} err, res: ${(error as Error).message}`);
      return null;
    }
  }

  async pong(): Promise<boolean> {
    console.info("[XiaoHongShuClient.pong] Begin to pong xhs...");
    try {
      const noteCard = await this.getNoteByKeyword('小红书');
      return noteCard.items ? true : false;
    } catch (error) {
      console.error(`[XiaoHongShuClient.pong] Ping xhs failed: ${(error as Error).message}, and try to login again...`);
      return false;
    }
  }

  async updateCookies(browserContext: BrowserContext): Promise<void> {
    const cookies = await browserContext.cookies();
    const cookieStr = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
    this.headers['Cookie'] = cookieStr;
    this.cookieDict = Object.fromEntries(cookies.map(cookie => [cookie.name, cookie.value]));
  }

  async getNoteByKeyword(keyword: string, searchId: string = getSearchId(), page: number = 1, pageSize: number = 20, sort: SearchSortType = SearchSortType.GENERAL, noteType: SearchNoteType = SearchNoteType.ALL): Promise<any> {
    const uri = "/api/sns/web/v1/search/notes";
    const data = {
      keyword,
      page,
      page_size: pageSize,
      search_id: searchId,
      sort,
      note_type: noteType
    };
    return await this.post(uri, data);
  }

  async getNoteById(noteId: string, xsecSource: string, xsecToken: string): Promise<NoteDetail | null> {
    if (!xsecSource) {
      xsecSource = "pc_search";
    }

    const data = {
      source_note_id: noteId,
      image_formats: ["jpg", "webp", "avif"],
      extra: { need_body_topic: 1 },
      xsec_source: xsecSource,
      xsec_token: xsecToken
    };
    const uri = "/api/sns/web/v1/feed";
    const res = await this.post(uri, data);
    if (res && res.items) {
      return res.items[0].note_card;
    }
    console.error(`[XiaoHongShuClient.getNoteById] get note id: ${noteId} empty and res: ${res}`);
    return null;
  }

  async getNoteByIdFromHtml(noteId: string, xsecSource: string, xsecToken: string, enableCookie = false): Promise<NoteDetail | null> {
    const url = `https://www.xiaohongshu.com/explore/${noteId}?xsec_token=${xsecToken}&xsec_source=${xsecSource}`;
    const copyHeaders = { ...this.headers };
    if (!enableCookie) {
      delete copyHeaders['Cookie'];
    }

    const response = await axios.get(url, {
      headers: copyHeaders,
      timeout: this.timeout,
      proxy: this.proxies
    });

    const state = response.data.match(/window.__INITIAL_STATE__=({.*})<\/script>/);
    if (state) {
      const raw = state[1].replace(/undefined/g, '""');
      const noteDict = JSON.parse(raw);
      return converJsonFromCamel2Underline(noteDict['note']['noteDetailMap'][noteId]['note']) as NoteDetail;
    }
    return null;
  }
}

export { XiaoHongShuClient, NoteDetail };
