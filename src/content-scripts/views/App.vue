<script setup lang="ts">
import { onMounted, ref, shallowRef } from "vue";
import MangaReader from "./MangaReader.vue";
import WebsiteInjectorFactory from "../core/website-worker";
import type { MangaWebPageWorker } from "../types";

// 状态管理
const mangaWorker = shallowRef<MangaWebPageWorker | undefined>(undefined);
const showReader = ref(false);

// 初始化逻辑
onMounted(async () => {
  const { mangaWorker: worker } = await WebsiteInjectorFactory.setup();
  mangaWorker.value = worker;

  if (worker) {
    showReader.value = true;
  }
});
</script>

<template>
  <div class="manga-reader-container">
    <MangaReader v-if="showReader" :manga-worker="mangaWorker!" />
  </div>
</template>
