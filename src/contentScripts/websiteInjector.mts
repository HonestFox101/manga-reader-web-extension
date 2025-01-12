import Emittery from "emittery";
import { MangaMeta, Page } from "./manga";
import { base64ToBlob, executeOnWebpage } from "~/utils";
import { fetchCors } from "./fetchCors.mjs";

class CopyMangaMeta implements MangaMeta {
  public static readonly matchPattern =
    /^https?:\/\/(copymanga\.tv|mangacopy\.com)\/comic\/\w+\/chapter\/[\w-]+$/g;
  public readonly pageCount;
  public readonly pages: Page[] = [];
  public readonly episodeName;
  public get loaded() {
    return this.pages.length === this.pageCount;
  }
  public get events() {
    return this.emitter;
  }

  private readonly emitter = new Emittery<{ pageChanged: Page[] }>();

  private constructor(pageCount: number, episodeName: string) {
    this.pageCount = pageCount;
    this.episodeName = episodeName;
  }

  public async loadImage(pageIndex: number): Promise<Blob | null> {
    const page = this.pages[pageIndex];
    const base64 = await fetchCors(page.url, "base64");
    return base64ToBlob(base64, "image/webp");
  }

  /**
   * meta数据初始化，从DOM中获取信息
   */
  public static async build(): Promise<MangaMeta> {
    const [total, episodeName] = (await executeOnWebpage({
      func: () => {
        document.querySelector<HTMLDivElement>(
          "body > h4.header"
        )!.style.display = "none";
        return [
          parseInt(
            document.querySelector<HTMLSpanElement>(
              "body > div:nth-child(2) > span.comicCount"
            )!.innerText
          ) as number,
          document
            .querySelector<HTMLDivElement>("body > h4")!
            .innerHTML.replace("/", "|") as string,
        ];
      },
    }))!;
    const initMeta = new CopyMangaMeta(total, episodeName).init();
    return initMeta as MangaMeta;
  }

  public init() {
    this.updatePage();
    return this;
  }

  /**
   * 持续更新漫画的url
   */
  private async updatePage() {
    const imgUrls = (await executeOnWebpage({
      func: () => {
        const randint = (start: number, size: number) =>
          start + Math.floor(Math.random() * size);
        randint(0, 15) >= 1
          ? self.scrollBy(0, randint(300, 300))
          : scrollTo(0, 0);
        let elements = document.querySelectorAll(
          "body > div.container-fluid.comicContent > div > ul > li > img"
        );
        const imgUrls: string[] = [];
        elements.forEach((e) => {
          imgUrls.push(e.getAttribute("data-src")!);
        });
        return imgUrls;
      },
    }))!;
    for (let i = 0; i < this.pages.length; i++) {
      if (this.pages[i].url !== imgUrls[i]) this.pages[i] = { url: imgUrls[i] };
    }
    for (let i = this.pages.length; i < imgUrls.length; i++) {
      this.pages.push({ url: imgUrls[i] });
    }
    this.events.emit("pageChanged", this.pages);
    if (!this.loaded) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      this.updatePage();
    }
  }
}

export default class WebsiteInjector {
  private constructor() {}

  public static async inject(): Promise<{ mangaMeta?: MangaMeta }> {
    const res = {};
    if (self.location.href.match(CopyMangaMeta.matchPattern)) {
      const mangaMeta = await CopyMangaMeta.build();
      Object.assign(res, { mangaMeta });
    }
    return res;
  }
}
