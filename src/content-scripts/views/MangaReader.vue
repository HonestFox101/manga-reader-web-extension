<script setup lang="ts">
import { onKeyStroke, useTemplateRefsList, useToggle } from "@vueuse/core";
import { onUnmounted } from "vue";
import type { MangaReaderChannel, MangaReaderEvent, MangaWebPageWorker, Page } from "../types";

// 常量定义
const PRELOAD_COUNT = 5; // 预加载图片数量
const loadingImageUrl = browser.runtime.getURL("/assets/loading.png");

// 扩展HTMLImageElement类型以支持保存ObjectURL引用
interface ImageElement extends HTMLImageElement {}

// ObjectURL缓存 Map
const imageBlobUrlMap = new Map<HTMLImageElement, string>();

const props = defineProps<{
  mangaWorker: MangaWebPageWorker;
}>();

const show = defineModel<boolean>({ default: false });
const toggleShow = (value?: boolean) => {
  show.value = typeof value === "undefined" ? !show.value : value;
  channel.emit("mangaReaderToggled", show.value);
};

const pageUpdatedHandler = async (pages: Page[]) => {
  for (const element of pageRefs.value) {
    if (element.getAttribute("src") && element.src === loadingImageUrl) {
      const targetIndex = pages.findIndex((_, i) => element.classList.contains(`page-${i}`));
      if (targetIndex !== -1) {
        await renderImage({ ...pages[targetIndex], index: targetIndex }, element as ImageElement);
      }
    }
  }
};

const channel: MangaReaderChannel = new Emittery<MangaReaderEvent>();

onMounted(async () => {
  // 创建漫画页渲染通道
  const { mangaWorker } = props;
  mangaWorker.subscribeReaderChannel(channel);

  // 开发模式下暴露到全局
  __DEV__ &&
    Object.assign(self, {
      channel,
      mangaWorker,
    });

  // 监听漫画页更新事件，漫画图片替换加载图片
  mangaWorker.events.on("pageUpdated", pageUpdatedHandler);

  const baseKeyStrokeOption = { dedupe: true };
  // 监听键盘事件
  onKeyStroke(
    ["ArrowLeft", "a", "A"],
    (e) => (e.preventDefault(), jumpTo("next")),
    baseKeyStrokeOption,
  );
  onKeyStroke(
    ["ArrowRight", "d", "D"],
    (e) => (e.preventDefault(), jumpTo("prev")),
    baseKeyStrokeOption,
  );
  onKeyStroke([" "], (e) => (e.preventDefault(), toggleMenu()), baseKeyStrokeOption);

  await jumpTo(0); // 加载第一页
  toggleShow(true);
});

// 组件卸载时清理事件监听器和ObjectURL
onUnmounted(() => {
  props.mangaWorker.events.off("pageUpdated", pageUpdatedHandler);

  // 清理所有 ObjectURL
  for (const url of imageBlobUrlMap.values()) {
    URL.revokeObjectURL(url);
  }
  imageBlobUrlMap.clear();
});

const currentPageIndex = ref<number | [number, number]>(0);

const pageRefs = useTemplateRefsList<HTMLImageElement>();

// 计算当前需要显示的页面数据
const currentPages = computed(() => {
  const indexes = Array.isArray(currentPageIndex.value)
    ? currentPageIndex.value
    : [currentPageIndex.value];
  return indexes.map((i) => {
    const pages = props.mangaWorker.pages;
    if (i >= pages.length) {
      return { url: loadingImageUrl, index: i };
    }
    return { ...pages[i], index: i };
  });
});

// 监听页面变化，渲染图片
watch(
  currentPages,
  async (pages) => {
    await nextTick();
    for (let i = 0; i < pageRefs.value.length; i++) {
      const page = pages[i];
      const element = pageRefs.value[i];
      if (page && element) {
        await renderImage(page as Page & { index: number }, element as ImageElement);
      }
    }
  },
  { immediate: true },
);

const [showMenu, toggleMenu] = useToggle(false);

defineExpose({ toggleShow, channel });

/**
 * 跳转到指定页
 */
async function jumpTo(index: number): Promise<void>;
async function jumpTo(action: "next" | "prev" | "fix"): Promise<void>;
async function jumpTo(index: number | "next" | "prev" | "fix") {
  if (typeof index === "string") {
    index = {
      next: Array.isArray(currentPageIndex.value)
        ? currentPageIndex.value[1] + 1
        : currentPageIndex.value + 1,
      prev: Array.isArray(currentPageIndex.value)
        ? currentPageIndex.value[0] - 2
        : currentPageIndex.value - 1,
      fix: Array.isArray(currentPageIndex.value)
        ? currentPageIndex.value[0] - 1
        : currentPageIndex.value - 1,
    }[index] as number;
  }
  if (index < 0 || index >= props.mangaWorker.pageCount) {
    index = Math.max(0, Math.min(index, props.mangaWorker.pageCount - 1));
  }
  if (index < props.mangaWorker.pageCount - 1) {
    currentPageIndex.value = [index, index + 1];
  } else if (index === props.mangaWorker.pageCount - 1) {
    currentPageIndex.value = index;
  }
  channel.emit("jump", currentPageIndex.value);
  preloadImages(...Array.from({ length: PRELOAD_COUNT }, (_, i) => i + index)); // 根据跳转到的页面预加载图片
}

/**
 * 预加载图片 - 使用并行加载优化
 */
async function preloadImages(...indexes: number[]) {
  indexes = indexes.filter(
    (i) => i >= 0 && i < props.mangaWorker.pages.length && !props.mangaWorker.pages[i].cacheBlob,
  );

  if (indexes.length === 0) return;

  // 使用Promise.all并行加载
  await Promise.all(indexes.map((i) => props.mangaWorker.loadImage(i)));
}

/**
 * 渲染漫画图片 - 优化ObjectURL内存管理
 */
async function renderImage(page: Page & { index: number }, element: ImageElement) {
  // 清理旧的 ObjectURL
  const oldUrl = imageBlobUrlMap.get(element);
  if (oldUrl) {
    URL.revokeObjectURL(oldUrl);
    imageBlobUrlMap.delete(element);
  }

  element.classList.remove(...Array.from(element.classList).filter((c) => c.startsWith("page-")));
  element.classList.add(`page-${page.index}`);

  return new Promise<void>((resolve) => {
    element.onload = () => resolve();

    if (page.cacheBlob) {
      const blobUrl = URL.createObjectURL(page.cacheBlob);
      imageBlobUrlMap.set(element, blobUrl);
      element.src = blobUrl;
    } else {
      element.src = page.url;
    }
  });
}
</script>

<template>
  <div class="injected-content">
    <div class="manga-reader-container" :class="show ? '' : 'hidden'">
      <div class="background-panel layer"></div>
      <div class="display-panel layer">
        <img
          v-for="(_, i) in currentPages"
          :key="i"
          :style="{ maxWidth: currentPages.length > 1 ? '50%' : undefined }"
          :ref="pageRefs.set"
          class="page"
        />
        <!-- <img class="page" src="/assets/template/1.webp" alt="" />
        <img class="page" src="/assets/template/2.webp" alt="" /> -->
      </div>
      <div class="operation-panel layer" :class="showMenu ? 'show-menu' : ''">
        <div class="header-bar menu-bar">
          <span>{{ mangaWorker.episodeName }}</span>
        </div>
        <div class="action-surface">
          <div class="go-left" @click="jumpTo('next')"></div>
          <div @click="toggleMenu()"></div>
          <div class="go-right" @click="jumpTo('prev')"></div>
        </div>
        <div class="footer-bar menu-bar">
          <span
            class="change-episode-button action-button"
            :class="mangaWorker.goToNextEpisode ? '' : 'disable'"
            @click="mangaWorker.goToNextEpisode?.()"
            title="下一话"
          >
            <i-uil-arrow-left class="action-icon" />
          </span>
          <span class="action-button" @click="jumpTo('fix')" title="修复分页">
            <i-lucide-wrench class="action-icon" />
          </span>
          <span>
            {{
              typeof currentPageIndex === "number"
                ? currentPageIndex + 1
                : currentPageIndex.map((i) => i + 1).join("-")
            }}/{{
              mangaWorker.loaded
                ? `${mangaWorker.pageCount}`
                : `${mangaWorker.pages.length}(${mangaWorker.pageCount})`
            }}
          </span>
          <span class="action-button" @click="mangaWorker.goToCatalogPage?.()" title="返回目录">
            <i-carbon-catalog class="action-icon" />
          </span>
          <span
            class="change-episode-button action-button"
            :class="mangaWorker.goToPrevEpisode ? '' : 'disable'"
            @click="mangaWorker.goToPrevEpisode?.()"
            title="上一话"
          >
            <i-uil-arrow-right class="action-icon" />
          </span>
        </div>
      </div>
    </div>
    <a class="switch-button-box" title="切换显示">
      <button @click="toggleShow()">
        <i-uil-book-open class="logo" />
      </button>
    </a>
  </div>
</template>

<style lang="scss" scoped>
$base-z-index: 9000;
$menu-bar-height: 75px;

.injected-content {
  color: white;
  font-size: 22px;

  .switch-button-box {
    position: fixed;
    bottom: 10px;
    right: 10px;
    z-index: $base-z-index + 10;
    opacity: 60%;

    &:hover {
      opacity: 100%;
    }

    button {
      border-radius: 10px;
      padding: 1em;
      text-align: center;
    }

    .logo {
      width: 1.2rem;
      height: 1.2rem;
    }
  }
}

.manga-reader-container {
  padding: 0;
  margin: 0;
  top: 0px;
  left: 0px;
  z-index: $base-z-index + 1;
  &:not(.hidden) {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }

  .layer {
    position: fixed;
    top: 0px;
    left: 0px;
    height: 100vh;
    width: 100vw;
  }

  .background-panel {
    background-color: #4d4d4def;
  }

  .display-panel {
    display: flex;
    flex-flow: row-reverse nowrap;
    justify-content: center;
    align-items: center;
    padding: 0;
    margin: 0;
    .page {
      max-height: 100%;
      object-fit: scale-down;
      image-rendering: auto;
    }
  }

  .operation-panel {
    &.show-menu {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0;

      > * {
        width: 100%;
      }

      .menu-bar {
        height: $menu-bar-height;
      }

      .action-surface {
        height: calc(100vh - $menu-bar-height * 2);
      }

      .header-bar {
        display: flex;
        flex-flow: row nowrap;
        justify-content: center;
        align-items: center;
      }

      .footer-bar {
        display: flex;
        flex-flow: row nowrap;
        justify-content: center;
        align-items: center;
        gap: 12%;

        > * {
          display: flex;
          flex-flow: column nowrap;
          justify-content: center;
          align-items: center;
          height: 100%;
        }

        .action-button:not(.disable) {
          &:hover {
            background-color: #bbbbbbc4;
            color: #000000c4;
          }

          cursor: pointer;
          padding: 0 16px;
        }

        .action-icon {
          width: 40px;
          height: 40px;
        }
      }
    }

    &:not(.show-menu) {
      display: grid;
      grid-template-rows: 0fr 100vh 0fr;

      .menu-bar {
        display: none;
      }

      .action-surface {
        height: 100vh;
      }
    }

    .action-surface {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;

      .go-left {
        cursor: url("/assets/template/left.cur"), auto;
      }

      .go-right {
        cursor: url("/assets/template/right.cur"), auto;
      }
    }

    .menu-bar {
      background-color: #000000c4;
    }
  }
}

.hidden {
  display: none;
}

.disable {
  cursor: not-allowed;
  opacity: 0.3;
}
</style>
