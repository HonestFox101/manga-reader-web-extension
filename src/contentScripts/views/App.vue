<script setup lang="ts">
import { onKeyStroke, useTemplateRefsList, useToggle } from "@vueuse/core";
import {
  MangaWebPageWorker,
  MangaReaderChannel,
  Page,
  MangaReaderEvent,
} from "../manga";
import Emittery from "emittery";

const loadingImageUrl = browser.runtime.getURL("/assets/loading.png");

const props = defineProps<{
  mangaWorker: MangaWebPageWorker;
}>();

const show = defineModel<boolean>({ default: false });
const toggleShow = (value?: boolean) => {
  show.value = typeof value === "undefined" ? !show.value : value;
  channel.emit("mangaReaderToggled", show.value);
};

onMounted(async () => {
  // 监听漫画页更新事件，漫画图片替换加载图片
  props.mangaWorker.events.on("pageUpdated", async (pages) =>
    pageRefs.value.forEach(async (element) => {
      if (element.getAttribute("src") && element.src === loadingImageUrl) {
        const targetIndex = pages.findIndex((_, i) =>
          element.classList.contains(`page-${i}`)
        );
        if (targetIndex !== -1) {
          await renderImage(
            { ...pages[targetIndex], index: targetIndex },
            element
          );
        }
      }
    })
  );
  const baseKeyStrokeOption = { dedupe: true };
  // 监听键盘事件
  onKeyStroke(
    ["ArrowLeft", "a", "A"],
    (e) => (e.preventDefault(), jumpTo("next")),
    baseKeyStrokeOption
  );
  onKeyStroke(
    ["ArrowRight", "d", "D"],
    (e) => (e.preventDefault(), jumpTo("prev")),
    baseKeyStrokeOption
  );
  onKeyStroke(
    [" "],
    (e) => (e.preventDefault(), toggleMenu()),
    baseKeyStrokeOption
  );
  await jumpTo(0);
  toggleShow(true);
});

const channel: MangaReaderChannel = new Emittery<MangaReaderEvent>();

const currentPageIndex = ref<number | [number, number]>(0);

const pageRefs = useTemplateRefsList<HTMLImageElement>();

const currentPages = computed(() => {
  const indexes = Array.isArray(currentPageIndex.value)
    ? currentPageIndex.value
    : [currentPageIndex.value];
  const pages: (Page & { index: number })[] = indexes.map((i) => {
    const pages = props.mangaWorker.pages;
    if (i >= pages.length) {
      return { url: loadingImageUrl };
    }
    return { ...pages[i], index: i } as any;
  });
  // 等待下一次渲染周期，同步更新<img>元素
  nextTick().then(() => {
    for (let i = 0; i < pageRefs.value.length; i++) {
      const page = pages[i];
      const element = pageRefs.value[i];
      renderImage(page, element);
    }
  });
  return pages;
});

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
  preloadImages(...Array.from({ length: 5 }, (_, i) => i + index)); // 根据跳转到的页面预加载图片
}

/**
 * 预加载图片
 */
async function preloadImages(...indexes: number[]) {
  indexes = indexes.filter(
    (i) =>
      i >= 0 &&
      i < props.mangaWorker.pages.length &&
      !props.mangaWorker.pages[i].cachBlob
  );
  for (const i of indexes) {
    await props.mangaWorker.loadImage(i);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

/**
 * 渲染漫画图片
 */
async function renderImage(
  page: Page & { index: number },
  element: HTMLImageElement
) {
  element.getAttribute("src") && URL.revokeObjectURL(element.src); // 清除图片缓存
  element.classList.remove(
    ...Array.from(element.classList).filter((c) => c.startsWith("page-"))
  );
  element.classList.add(`page-${page.index}`);
  return new Promise<void>((resolve) => {
    element.onload = () => resolve();
    element.src = page.cachBlob ? URL.createObjectURL(page.cachBlob) : page.url;
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
            @click="
              mangaWorker.goToNextEpisode && mangaWorker.goToNextEpisode()
            "
            title="下一话"
          >
            <uil-arrow-left class="action-icon" />
          </span>
          <span class="action-button" @click="jumpTo('fix')" title="修复分页">
            <lucide-wrench class="action-icon" />
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
          <span
            class="action-button"
            @click="
              mangaWorker.goToCatalogPage && mangaWorker.goToCatalogPage()
            "
            title="返回目录"
          >
            <carbon-catalog class="action-icon" />
          </span>
          <span
            class="change-episode-button action-button"
            :class="mangaWorker.goToPrevEpisode ? '' : 'disable'"
            @click="
              mangaWorker.goToPrevEpisode && mangaWorker.goToPrevEpisode()
            "
            title="上一话"
          >
            <uil-arrow-right class="action-icon" />
          </span>
        </div>
      </div>
    </div>
    <a class="switch-button-box" title="切换显示">
      <button @click="toggleShow()">
        <uil-book-open class="logo" />
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
