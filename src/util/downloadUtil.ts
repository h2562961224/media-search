
import axios from 'axios';

export function batchDownload2Base64(imagesUrls: string[]): Promise<Record<string, string>> {
  return Promise.all(imagesUrls.map((url) => download2Base64(url)))
    .then((base64s) => {
      const result: Record<string, string> = {};
      imagesUrls.forEach((url, index) => {
        result[url] = base64s[index];
      });
      return result;
    });
}

export function download2Base64(url: string): Promise<string> {
  return axios.get(url, { responseType: 'arraybuffer' })
    .then((response) => {
      return `data:${response.headers['content-type']};base64,${Buffer.from(response.data, 'binary').toString('base64')}`;
    });
}