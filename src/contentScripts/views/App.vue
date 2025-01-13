<script setup lang="ts">
import { useTemplateRefsList, useToggle } from "@vueuse/core";
import { ref, onMounted } from "vue";
import { MangaMeta } from "../manga";
import { getImageSizeFromBlob } from "~/utils";

const props = defineProps<{
  mangaMeta: MangaMeta;
}>();

onMounted(async () => {
  Object.assign(self, { mangaMeta: props.mangaMeta });
  await jumpTo(0);
  toggleMangaReader(true);
});

const currentPagesIndex = ref<[number, number]>([0, 0]);
const currentPages = computed(() => {
  const [p1i, p2i] = currentPagesIndex.value;
  const pages = props.mangaMeta.pages;
  return p1i !== p2i ? [pages[p1i], pages[p2i]] : [pages[p1i]];
});
const pageRefs = useTemplateRefsList<HTMLImageElement>();
watch([currentPages], async ([pages]) => {
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const img = pageRefs.value[i];
    if ("src" in img) URL.revokeObjectURL(img.src);
    img.src = page.cachBlob ? URL.createObjectURL(page.cachBlob) : page.url;
  }
});
const [showMangaReader, toggleMangaReader] = useToggle(false);
const [showMenu, toggleMenu] = useToggle(false);

/**
 * 跳转到指定页
 */
const jumpTo = async (index: number) => {
  if (index < 0 || index >= props.mangaMeta.pageCount) {
    index = Math.max(0, Math.min(index, props.mangaMeta.pageCount - 1));
  }
  if (index < props.mangaMeta.pages.length - 1) {
    currentPagesIndex.value = [index, index + 1];
  }
  if (index === props.mangaMeta.pages.length - 1) {
    if (props.mangaMeta.loaded) {
      currentPagesIndex.value = [index, index];
    }
  }
  preloadImages(...Array.from({ length: 10 }, (_, i) => i + index)); // 预加载图片
};

/**
 * 预加载图片
 */
const preloadImages = async (...indexes: number[]) => {
  indexes = indexes.filter(
    (i) =>
      i >= 0 &&
      i < props.mangaMeta.pages.length &&
      !props.mangaMeta.pages[i].cachBlob
  );
  for (const i of indexes) {
    const blob = await props.mangaMeta.loadImage(i);
    const size = await getImageSizeFromBlob(blob!);
    props.mangaMeta.pages[i].cachBlob = blob!;
    props.mangaMeta.pages[i].size = size;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
};
</script>

<template>
  <div class="injected-content">
    <div
      class="manga-reader-container"
      :class="showMangaReader ? '' : 'hidden'"
    >
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
          <span>{{ mangaMeta.episodeName }}</span>
        </div>
        <div class="action-surface">
          <div class="go-left" @click="jumpTo(currentPagesIndex[1] + 1)"></div>
          <div @click="toggleMenu()"></div>
          <div class="go-right" @click="jumpTo(currentPagesIndex[0] - 2)"></div>
        </div>
        <div class="footer-bar menu-bar">
          <span
            >{{
              currentPagesIndex[0] === currentPagesIndex[1]
                ? currentPagesIndex[0] + 1
                : currentPagesIndex.map((i) => i + 1).join("-")
            }}/{{
              mangaMeta.loaded
                ? `${mangaMeta.pageCount}`
                : `${mangaMeta.pages.length}(${mangaMeta.pageCount})`
            }}
          </span>
        </div>
      </div>
    </div>
    <div class="switch-button">
      <button @click="toggleMangaReader()">
        <pixelarticons-power />
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
$base-z-index: 9000;
$menu-bar-height: 75px;

.injected-content {
  color: white;
  font-size: 22px;
  .switch-button {
    position: fixed;
    bottom: 10px;
    right: 10px;
    z-index: $base-z-index + 10;
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
    background-color: #000000ef;
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

button {
  border-radius: 0.5rem;
  padding: 0.5rem;
  text-align: center;
}

.hidden {
  display: none;
}
</style>
