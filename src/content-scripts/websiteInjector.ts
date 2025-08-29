import Emittery from "emittery";
import { base64ToBlob, exec, getImageSizeFromBlob } from "~/utils";
import { fetchCors } from "./fetchCors";
import type {
  MangaReaderChannel,
  MangaWebPageWorker,
  MangaWebPageWorkerEvent,
  Page,
} from "./types";

class CopyMangaWorker implements MangaWebPageWorker {
  public static readonly matchPattern =
    /^https?:\/\/(copymanga\.tv|mangacopy\.com|copy-manga\.com|www\.copy20\.com|www\.copy\.com|(www\.)?2025copy\.com)\/comic\/\w+\/chapter\/[\w-]+$/g;

  public readonly pages: Page[] = [];
  public get loaded() {
    return this.pages.length > 0 && this.pages.length === this.pageCount;
  }
  public get events() {
    return this._emitter;
  }

  private readonly _emitter = new Emittery<MangaWebPageWorkerEvent>();

  private constructor(
    public readonly pageCount: number,
    public readonly episodeName: string,
    public readonly goToNextEpisode?: () => Promise<void>,
    public readonly goToPrevEpisode?: () => Promise<void>,
    public readonly prevEpisodeSelector?: () => Promise<void>,
    public readonly goToCatalogPage?: () => Promise<void>,
  ) {
    this.updatePage();
  }

  public async loadImage(pageIndex: number): Promise<Page> {
    if (this.pages[pageIndex].cachBlob) return this.pages[pageIndex];
    const page = this.pages[pageIndex];
    const base64 = await fetchCors(page.url, "base64");
    this.pages[pageIndex].cachBlob = base64ToBlob(base64, "image/webp");
    this.pages[pageIndex].size = await getImageSizeFromBlob(this.pages[pageIndex].cachBlob);
    this.events.emit("pageLoaded", {
      page: this.pages[pageIndex],
      index: pageIndex,
    });
    return this.pages[pageIndex];
  }

  public subscribeReaderChannel(channel: MangaReaderChannel): void {
    channel.on("mangaReaderToggled", (val) => {
      exec(
        (val) => {
          if (val) {
            const styleEl = document.createElement("style");
            styleEl.id = "custom-style";
            styleEl.innerHTML = `* { scrollbar-width: none; }\n`;
            styleEl.innerHTML += `body > h4.header { display: none }\n`;
            document.head.appendChild(styleEl);
          } else {
            document.head.querySelector("#custom-style")?.remove();
          }
        },
        [val],
      );
    });
  }

  /**
   * 类数据初始化，从DOM中获取信息
   */
  public static async build(): Promise<MangaWebPageWorker> {
    const [total, episodeName] = (await exec(() => [
      parseInt(
        document.querySelector<HTMLSpanElement>("body > div:nth-child(2) > span.comicCount")!
          .innerText,
      ) as number,
      document.querySelector<HTMLDivElement>("body > h4")!.innerHTML.replace("/", " | ") as string,
    ]))!;
    if (!total || !episodeName) throw new Error("Failed to init manga info");
    const goToNextEipisode = await CopyMangaWorker.buildJumpEpisodeFunc(
      "body > div.footer > div.comicContent-next > a",
    );
    const goToPrevEpisode = await CopyMangaWorker.buildJumpEpisodeFunc(
      "body > div.footer > div.comicContent-prev:not(.index) > a",
    );
    const goToCatalogPage = await CopyMangaWorker.buildJumpEpisodeFunc(
      "body > div.footer > div.comicContent-prev.list > a",
    );
    const initMeta = new CopyMangaWorker(
      total,
      episodeName,
      goToNextEipisode,
      goToPrevEpisode,
      goToCatalogPage,
    );
    return initMeta as MangaWebPageWorker;
  }

  /**
   * 根据CSS Selector构建跳转章节的函数
   */
  private static async buildJumpEpisodeFunc(selector: string) {
    const ret = await exec(
      (selector) =>
        Boolean(document.querySelector<HTMLAnchorElement>(selector)?.getAttribute("href")),
      [selector],
    );
    if (ret) {
      const func = async () => {
        exec(
          (selector) => document.querySelector<HTMLAnchorElement>(selector)?.click(),
          [selector],
        );
      };
      return func;
    }
    return undefined;
  }

  /**
   * 持续更新漫画的url
   */
  private async updatePage() {
    const imgUrls = (await exec(() => {
      const randint = (start: number, size: number) => start + Math.floor(Math.random() * size);
      randint(0, 15) >= 1 ? self.scrollBy(0, randint(300, 300)) : scrollTo(0, 0);
      const imgUrls: string[] = Array.from(
        document.querySelectorAll(".container-fluid.comicContent > div > ul > li > img"),
      ).map((e) => e.getAttribute("data-src")!);
      return imgUrls;
    }))!;
    for (let i = 0; i < this.pages.length; i++) {
      if (this.pages[i].url !== imgUrls[i]) this.pages[i] = { url: imgUrls[i] };
    }
    for (let i = this.pages.length; i < imgUrls.length; i++) {
      this.pages.push({ url: imgUrls[i] });
    }
    this.events.emit("pageUpdated", this.pages);
    if (!this.loaded) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      this.updatePage();
    }
  }
}

export default abstract class WebsiteInjectorFactory {
  public static async setup(): Promise<{ mangaWorker?: MangaWebPageWorker }> {
    if (CopyMangaWorker.matchPattern.test(self.location.href)) {
      const mangaWorker = await CopyMangaWorker.build();
      return { mangaWorker };
    }
    return {};
  }
}
