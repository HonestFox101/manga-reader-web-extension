import Emittery from "emittery";

/**
 * 漫画页数据
 */
export interface Page {
  url: string;
  size?: { width: number; height: number };
  cachBlob?: Blob;
}

export type MangaWebPageWorkerEvent = {
  pageUpdated: Page[];
  pageLoaded: { page: Page; index: number };
};

/**
 * MangaWebPageWorker主要负责在Content Script中与DOM交互，收集原网页数据
 */
export interface MangaWebPageWorker {
  /**
   * 采集到的漫画页图片数据
   */
  readonly pages: Page[];
  /**
   * DOM中采集到出现的漫画总页数
   */
  readonly pageCount: number;
  /**
   * 章节名称
   */
  readonly episodeName: string;
  /**
   * 数据是否已经加载完毕
   */
  readonly loaded: boolean;
  /**
   * 事件频道
   */
  readonly events: Pick<Emittery<MangaWebPageWorkerEvent>, "on" | "off" | "once" | "emit">;

  /**
   * 加载图片缓存
   */
  readonly loadImage: (pageIndex: number) => Promise<Page>;
  /**
   * 订阅Vue漫画阅读器的消息频道
   */
  readonly subscribeReaderChannel: (chan: MangaReaderChannel) => void;
  /**
   * 跳转到下一话
   */
  readonly goToNextEpisode: (() => Promise<void>) | null;
  /**
   * 跳转到上一话
   */
  readonly goToPrevEpisode: (() => Promise<void>) | null;
  /**
   * 跳转到目录页
   */
  readonly goToCatalogPage: (() => Promise<void>) | null;
}

export type MangaReaderEvent = {
  jump: number | [number, number];
  mangaReaderToggled: boolean;
};

/**
 * 漫画阅读器消息频道
 */
export type MangaReaderChannel = Pick<Emittery<MangaReaderEvent>, "on" | "off" | "once" | "emit">;
