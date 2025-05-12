import Emittery from "emittery";
import {
  MangaReaderChannel,
  MangaWebPageWorker,
  MangaWebPageWorkerEvent,
  Page,
} from "./manga";
import { base64ToBlob, exec, getImageSizeFromBlob } from "~/utils";
import { fetchCors } from "./fetchCors.mjs";

class CopyMangaWorker implements MangaWebPageWorker {
  public static readonly matchPattern =
    /^https?:\/\/(copymanga\.tv|mangacopy\.com|www\.copy-manga\.com|www\.copy20\.com)\/comic\/\w+\/chapter\/[\w-]+$/g;
  public readonly pageCount;
  public readonly pages: Page[] = [];
  public readonly episodeName;
  public get loaded() {
    return this.pages.length === this.pageCount;
  }
  public get events() {
    return this._emitter;
  }

  private readonly _emitter = new Emittery<MangaWebPageWorkerEvent>();

  private constructor(
    pageCount: number,
    episodeName: string,
    goToNextEpisode?: (() => Promise<void>) | null,
    prevEpisodeSelector?: (() => Promise<void>) | null
  ) {
    this.pageCount = pageCount;
    this.episodeName = episodeName;
    this.goToNextEpisode = goToNextEpisode || null;
    this.goToPrevEpisode = prevEpisodeSelector || null;
  }

  public goToNextEpisode: (() => Promise<void>) | null = null;
  public goToPrevEpisode: (() => Promise<void>) | null = null;


  public async loadImage(pageIndex: number): Promise<Page> {
    if (this.pages[pageIndex].cachBlob) return this.pages[pageIndex];
    const page = this.pages[pageIndex];
    const base64 = await fetchCors(page.url, "base64");
    this.pages[pageIndex].cachBlob = base64ToBlob(base64, "image/webp");
    this.pages[pageIndex].size = await getImageSizeFromBlob(
      this.pages[pageIndex].cachBlob
    );
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
          document.querySelector<HTMLDivElement>(
            "body > h4.header"
          )!.style.display = val ? "none" : "";
        },
        [val]
      );
    });
  }

  /**
   * 类数据初始化，从DOM中获取信息
   */
  public static async build(): Promise<MangaWebPageWorker> {
    const [total, episodeName] = (await exec(() => {
      return [
        parseInt(
          document.querySelector<HTMLSpanElement>(
            "body > div:nth-child(2) > span.comicCount"
          )!.innerText
        ) as number,
        document
          .querySelector<HTMLDivElement>("body > h4")!
          .innerHTML.replace("/", " | ") as string,
      ];
    }))!;
    const goToNextEipisode = await CopyMangaWorker.buildJumpEpisodeFunc(
      "body > div.footer > div.comicContent-next > a"
    );
    const goToPrevEpisode = await CopyMangaWorker.buildJumpEpisodeFunc(
      "body > div.footer > div.comicContent-prev:not(.index) > a"
    );
    const initMeta = await new CopyMangaWorker(
      total,
      episodeName,
      goToNextEipisode,
      goToPrevEpisode
    ).init();
    return initMeta as MangaWebPageWorker;
  }

  /**
   * 根据CSS Selector构建跳转章节的函数
   */
  private static async buildJumpEpisodeFunc(selector: string) {
    const ret = await exec(
      (selector) =>
        Boolean(
          document
            .querySelector<HTMLAnchorElement>(selector)
            ?.getAttribute("href")
        ),
      [selector]
    );
    if (ret) {
      const func = async () => {
        exec(
          (selector) =>
            document.querySelector<HTMLAnchorElement>(selector)?.click(),
          [selector]
        );
      };
      return func;
    }
    return null;
  }

  /**
   * 初始化
   */
  public async init() {
    this.updatePage();
    return this;
  }

  /**
   * 持续更新漫画的url
   */
  private async updatePage() {
    const imgUrls = (await exec(() => {
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

export default class WebsiteInjector {
  private constructor() { }

  public static async inject(): Promise<{ mangaWorker?: MangaWebPageWorker }> {
    if (CopyMangaWorker.matchPattern.exec(self.location.href)) {
      const mangaWorker = await CopyMangaWorker.build();
      return { mangaWorker };
    }
    return {};
  }
}
