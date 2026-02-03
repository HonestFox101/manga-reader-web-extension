import Emittery from "emittery";
import { base64ToBlob, exec, getImageSizeFromBlob } from "~/utils";
import { fetchCors } from "../utils/fetchCors";
import { copyMangaSelectors, mangaSites } from "../utils/selectors";
import type {
  MangaReaderChannel,
  MangaWebPageWorker,
  MangaWebPageWorkerEvent,
  Page,
} from "../types";

class CopyMangaWorker implements MangaWebPageWorker {
  private static readonly selectors = copyMangaSelectors;

  public static readonly matchPattern = mangaSites.copyManga.matchPattern;

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
    if (this.pages[pageIndex].cacheBlob) return this.pages[pageIndex];
    const page = this.pages[pageIndex];
    const base64 = await fetchCors(page.url, "base64");
    this.pages[pageIndex].cacheBlob = base64ToBlob(base64, "image/webp");
    this.pages[pageIndex].size = await getImageSizeFromBlob(this.pages[pageIndex].cacheBlob);
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
          const headerEl = document.querySelector<HTMLElement>("body > h4.header");
          if (val) {
            document.body.style.overflow = "hidden";
            if (headerEl) headerEl.style.display = "none";
          } else {
            document.body.style.overflow = "";
            if (headerEl) headerEl.style.display = "";
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
    const result = await exec(() => {
      const selectors = this.selectors;
      const totalEl = document.querySelector<HTMLSpanElement>(selectors.totalPages);
      const nameEl = document.querySelector<HTMLDivElement>(selectors.episodeName);

      if (!totalEl || !nameEl) {
        throw new Error("DOM elements not found for manga info");
      }

      const total = parseInt(totalEl.innerText);
      if (isNaN(total)) {
        throw new Error("Failed to parse total page count");
      }

      return [total, nameEl.innerHTML.replace("/", " | ")] as [number, string];
    });

    if (!result) {
      throw new Error("Failed to execute DOM extraction");
    }

    const [total, episodeName] = result;
    ``;
    const goToNextEipisode = await CopyMangaWorker.buildJumpEpisodeFunc(this.selectors.nextChapter);
    const goToPrevEpisode = await CopyMangaWorker.buildJumpEpisodeFunc(this.selectors.prevChapter);
    const goToCatalogPage = await CopyMangaWorker.buildJumpEpisodeFunc(this.selectors.catalog);
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
  private static readonly MAX_RETRY_COUNT = 3;
  private static readonly UPDATE_INTERVAL = 500;

  private async updatePage(retryCount = 0): Promise<void> {
    try {
      const imgUrls = await exec(() => {
        const randint = (start: number, size: number) => start + Math.floor(Math.random() * size);
        randint(0, 15) >= 1 ? self.scrollBy(0, randint(300, 300)) : scrollTo(0, 0);

        const imgElements = document.querySelectorAll(CopyMangaWorker.selectors.imageList);
        return Array.from(imgElements)
          .map((e) => e.getAttribute("data-src"))
          .filter((url): url is string => url !== null);
      });

      if (!imgUrls || imgUrls.length === 0) {
        throw new Error("No images found on page");
      }

      // 更新页面数据
      for (let i = 0; i < this.pages.length; i++) {
        if (this.pages[i].url !== imgUrls[i]) {
          this.pages[i] = { url: imgUrls[i] };
        }
      }
      for (let i = this.pages.length; i < imgUrls.length; i++) {
        this.pages.push({ url: imgUrls[i] });
      }

      this.events.emit("pageUpdated", this.pages);

      if (!this.loaded) {
        await new Promise((resolve) => setTimeout(resolve, CopyMangaWorker.UPDATE_INTERVAL));
        this.updatePage(0); // 重置重试计数
      }
    } catch (error) {
      console.error(`Failed to update page (attempt ${retryCount + 1}):`, error);

      if (retryCount < CopyMangaWorker.MAX_RETRY_COUNT) {
        await new Promise((resolve) =>
          setTimeout(resolve, CopyMangaWorker.UPDATE_INTERVAL * (retryCount + 1)),
        );
        this.updatePage(retryCount + 1);
      } else {
        // 使用指数退避策略
        const backoff =
          CopyMangaWorker.UPDATE_INTERVAL *
          Math.pow(2, retryCount - CopyMangaWorker.MAX_RETRY_COUNT);
        await new Promise((resolve) => setTimeout(resolve, backoff));
        this.updatePage(CopyMangaWorker.MAX_RETRY_COUNT);
      }
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
