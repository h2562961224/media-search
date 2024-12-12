import { ChatCompletionContentPart } from "openai/resources";
import { SSEPromise } from "../base/PartPromise";
import { PlatformRegister, Source } from "../platform/PlatformRegister";
import { SearchRequest, SearchResponse } from "./types/Search";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import config from "../base/config";
import { batchDownload2Base64 } from "../util/downloadUtil";
import { getRandomElements } from "../util/arrayUtil";

const event = z.object({
  thinking: z.string(),
  imageInfo: z.string(),
  answer: z.string(),
  relatedQuestions: z.array(z.string())
});

const openai = new OpenAI({
  baseURL: config.OPENAI_BASE_URL,
  apiKey: config.OPENAI_API_KEY
});
const platformRegister = new PlatformRegister();

async function summary(sources: Source[], q: string): Promise<[string, string[]]> {
  const useImages = config.SEARCH_ENGINE_USE_IMAGE === 'true';
  try {
    const sourceMessages: ChatCompletionContentPart[] = [];
    sourceMessages.push({
      type: "text",
      text: `# 搜索结果:\n\n`,
    })
    let url2Base64: Record<string, string> = {};
    if (useImages) {
      const allImages = sources.flatMap(source => {
        const images = source.images || [];
        return getRandomElements(images, 3);
      });
      //乱序取前40张图片
      url2Base64 = await batchDownload2Base64(getRandomElements(allImages, 40));
    }
    for (let i = 0; i < sources.length; i++) {
      const source = sources[i];
      sourceMessages.push({
        type: "text",
        text: `## 结果 ${i} \n\n ${source.title}\n\n${source.snippet}\n\n`
      });
      if (useImages) {
        const images = source.images || [];
        for (const j of images) {
          const base64 = url2Base64[j];
          if (base64) {
            sourceMessages.push({
              type: "image_url",
              image_url: {
                url: base64,
                detail: 'low'
              }
            });
          }
        }
      }
    }
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system", content:
            `
你是一个有用的AI智能搜索引擎。现在有许多的搜索结果，根据这些搜索结果（文字与图片）和用户的问题总结并回答用户真正想要的。
# 规则
1. 你的回答要尽可能的详尽;
2. 用markdown语法回答, 注重结构与细节，帮助用户更好的理解; 
3. 信息来源仅为搜索结果而不是你的认知或者其他东西,不要回答任何和搜索结果不相关的东西; 
4. 如果搜索结果与问题毫不相干，你应该直接回答不知道，表示歉意，并且总结搜索结果的内容; 
5. 图片当中有非常重要的信息，可能搜索结果有用信息都在图片里面; 
6. 根据<步骤>结构化地输出你的思考过程，不要遗漏任何一步;
# 步骤
1. 不要遗漏任何细节地输出图片中的信息(如果存在的话)，特别是图片中的文字信息，他十分重要;
2. 根据图片中的文字信息，搜索结果的文字信息，总结出用户问题的答案;
3. 在你的回答里，使用搜索结果的下标，用markdown的语法标记信息来源(例如 "[0](0)","[2](2)")
` },
        {
          role: "system",
          content: `# 用户的问题: ${q}`,
        },
        {
          role: "user",
          content: sourceMessages,
        }
      ],
      response_format: zodResponseFormat(event, 'event'),
    });
    const content = completion.choices[0].message.content;
    if (content) {
      const parsedMessage = JSON.parse(content);
      const { answer, relatedQuestions, thinking, imageInfo } = parsedMessage;
      console.log(thinking);
      console.log(imageInfo);
      return [answer, relatedQuestions];
    }
  } catch (error) {
    console.error(error);
  }
  return ['', []];
}

export async function search(request: SearchRequest, sse: SSEPromise<SearchResponse>): Promise<SearchResponse> {
  const { platform = 'xhs', q } = request;
  const platformInstance = await platformRegister.getPlatform(platform);
  const sourceSSE = new SSEPromise<Source[]>();
  sourceSSE.then(
    (sources) => {
      sse.partResolve({
        sources,
        summary: '',
        relatedQuestions: []
      });
    },
    () => { }
  );
  const sources = await platformInstance.search(q, sourceSSE);
  const [summaryText, relatedQuestions] = await summary(sources, q);
  //将summaryText中形如[0](0)的内容替换为对应的source的链接
  const sourceTexts = sources.map((source, index) => `[[${index}]](${source.url})`);
  let finalSummaryText = summaryText;
  sourceTexts.forEach((sourceText, index) => {
    finalSummaryText = finalSummaryText.replace(new RegExp(`\\[${index}\\]\\(${index}\\)`, 'g'), sourceText);
  });

  const response: SearchResponse = {
    sources,
    summary: finalSummaryText,
    relatedQuestions
  };
  sse.partResolve(response);
  sse.resolve();
  return response;
}