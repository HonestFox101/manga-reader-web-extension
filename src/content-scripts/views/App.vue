<script setup lang="ts">
import WebsiteInjectorFactory from "~/content-scripts/websiteInjector";
import MangaReader from "./MangaReader.vue";
import { MangaWebPageWorker } from "../types";

const mangaWorker = shallowRef<MangaWebPageWorker | undefined>(undefined);
const mangaReader = useTemplateRef("manga-reader");

onMounted(async () => {
  mangaWorker.value = (await WebsiteInjectorFactory.setup()).mangaWorker;
  await nextTick();
  mangaWorker.value!.subscribeReaderChannel(mangaReader.value!.channel);
  __DEV__ &&
    Object.assign(self, {
      channel: mangaReader.value!.channel,
      mangaWorker: mangaWorker.value,
      mangaReader: mangaReader.value,
    });
});
</script>

<template>
  <div class="manga-reader-container">
    <MangaReader v-if="mangaWorker" ref="manga-reader" :manga-worker="mangaWorker" />
  </div>
</template>
