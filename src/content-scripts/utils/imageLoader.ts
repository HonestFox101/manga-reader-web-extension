import { fetchCors } from "./fetchCors";
import { base64ToBlob, getImageSizeFromBlob } from "~/utils";
import type { Page } from "../types";

/**
 * ImageLoader - 图片加载管理器
 * 负责图片的缓存、预加载和内存管理
 */
export class ImageLoader {
  private static readonly PRELOAD_BATCH_SIZE = 3;
  private static readonly DEFAULT_PRELOAD_COUNT = 5;
  private static readonly MIN_PRELOAD_DELAY = 100;

  /**
   * 预加载指定索引的图片
   */
  static async preloadImage(
    page: Page,
    pageIndex: number,
    onLoaded?: (page: Page, index: number) => void,
  ): Promise<Page> {
    if (page.cacheBlob) return page;

    const base64 = await fetchCors(page.url, "base64");
    const cacheBlob = base64ToBlob(base64, "image/webp");
    const size = await getImageSizeFromBlob(cacheBlob);

    const loadedPage: Page = {
      ...page,
      cacheBlob,
      size,
    };

    onLoaded?.(loadedPage, pageIndex);
    return loadedPage;
  }

  /**
   * 批量预加载图片 - 使用并行加载
   */
  static async preloadImages(
    pages: Page[],
    indexes: number[],
    onLoaded?: (page: Page, index: number) => void,
  ): Promise<void> {
    const validIndexes = indexes.filter((i) => i >= 0 && i < pages.length && !pages[i].cacheBlob);

    if (validIndexes.length === 0) return;

    // 使用 Promise.all 并行加载
    await Promise.all(validIndexes.map((i) => this.preloadImage(pages[i], i, onLoaded)));
  }

  /**
   * 智能预加载 - 根据当前索引预加载前后图片
   */
  static async smartPreload(
    pages: Page[],
    currentIndex: number,
    preloadCount = this.DEFAULT_PRELOAD_COUNT,
    onLoaded?: (page: Page, index: number) => void,
  ): Promise<void> {
    const indexesToPreload: number[] = [];

    // 预加载当前页之后的图片
    for (let i = 1; i <= preloadCount; i++) {
      const nextIndex = currentIndex + i;
      if (nextIndex < pages.length && !pages[nextIndex].cacheBlob) {
        indexesToPreload.push(nextIndex);
      }
    }

    // 预加载当前页之前的图片
    for (let i = 1; i <= preloadCount; i++) {
      const prevIndex = currentIndex - i;
      if (prevIndex >= 0 && !pages[prevIndex].cacheBlob) {
        indexesToPreload.push(prevIndex);
      }
    }

    await this.preloadImages(pages, indexesToPreload, onLoaded);
  }

  /**
   * 清理图片的 ObjectURL
   */
  static revokeObjectURL(url: string | null | undefined): void {
    if (url && url.startsWith("blob:")) {
      URL.revokeObjectURL(url);
    }
  }
}
