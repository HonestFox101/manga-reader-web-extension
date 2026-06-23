/**
 * 网站选择器配置
 */

/**
 * CopyManga 网站选择器
 */
export const copyMangaSelectors = {
  /** 总页数元素 */
  totalPages: "body > div:nth-child(2) > span.comicCount",
  /** 章节名称元素 */
  episodeName: "body > h4",
  /** 下一话链接 */
  nextChapter: "body > div.footer > div.comicContent-next > a",
  /** 上一话链接 */
  prevChapter: "body > div.footer > div.comicContent-prev:not(.index) > a",
  /** 目录页链接 */
  catalog: "body > div.footer > div.comicContent-prev.list > a",
  /** 漫画图片列表 */
  imageList: ".container-fluid.comicContent > div > ul > li > img",
} as const;

/**
 * MangaSiteConfig - 网站配置接口
 */
export interface MangaSiteConfig {
  /** URL 匹配模式 */
  matchPattern: RegExp;
  /** 选择器配置 */
  selectors: typeof copyMangaSelectors;
}

/**
 * 支持的漫画网站配置
 */
export const mangaSites: Record<string, MangaSiteConfig> = {
  copyManga: {
    matchPattern:
      /^https?:\/\/(www\.copy3000\.com|copymanga\.tv|mangacopy\.com|copy-manga\.com|www\.copy20\.com|www\.copy\.com|(www\.)?202[56]copy\.com)\/comic\/\w+\/chapter\/[\w-]+$/g,
    selectors: copyMangaSelectors,
  },
} as const;

/**
 * 根据URL获取对应的网站配置
 */
export function getSiteConfig(url: string): MangaSiteConfig | null {
  for (const siteName in mangaSites) {
    const config = mangaSites[siteName];
    if (config.matchPattern.test(url)) {
      return config;
    }
  }
  return null;
}

/**
 * 默认选择器（CopyManga）
 */
export const defaultSelectors = copyMangaSelectors;
