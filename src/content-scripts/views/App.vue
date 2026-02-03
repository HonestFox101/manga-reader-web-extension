<script setup lang="ts">
import { onMounted, ref, shallowRef, watch } from "vue";
import MangaReader from "./MangaReader.vue";
import WebsiteInjectorFactory from "../core/website-worker";
import type { MangaWebPageWorker } from "../types";

// 状态管理
const mangaWorker = shallowRef<MangaWebPageWorker | undefined>(undefined);
const mangaReader = useTemplateRef<InstanceType<typeof MangaReader>>("mangaReader");
const showReader = ref(false);
const enabled = computed(() => Boolean(mangaWorker.value && mangaReader.value));

// 初始化逻辑
onMounted(async () => {
  const { mangaWorker: worker } = await WebsiteInjectorFactory.setup();
  mangaWorker.value = worker;

  if (worker) {
    showReader.value = true;
  }
});

// 监听 mangaReader ref 变化，确保组件已挂载后再订阅
const unsubscribe = watch(
  enabled,
  () => {
    if (enabled) {
      const worker = mangaWorker.value!;
      const reader = mangaReader.value!;
      worker!.subscribeReaderChannel(reader.channel);

      // 开发模式下暴露到全局
      __DEV__ &&
        Object.assign(self, {
          channel: reader.channel,
          mangaWorker: worker,
          mangaReader: reader,
        });
      unsubscribe(); // 只执行一次后取消监听
    }
  },
  { immediate: true },
);
</script>

<template>
  <div class="manga-reader-container">
    <MangaReader ref="mangaReader" v-if="enabled" :manga-worker="mangaWorker!" />
  </div>
</template>
