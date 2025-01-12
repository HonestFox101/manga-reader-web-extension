<script setup lang="ts">
import logo from "~/assets/logo.svg";
import { storageDemo } from "~/logic/storage";
</script>

<template>
  <main class="option-page">
    <img :src="logo" class="" alt="extension icon" />
    <div class="title">Options Page</div>
    <SharedSubtitle />
    <input v-model="storageDemo" class="input-field" />
    <div class="footer">
      Powered by Vite <pixelarticons-zap class="align-middle inline-block" />
    </div>
  </main>
</template>

<style lang="scss" scoped>
.option-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background-color: #a3a8d4;

  .title {
    font-size: 2rem;
  }

  .input-field {
    padding: 0.5rem;
    border: 1px solid #333;
    border-radius: 0.25rem;
  }

  .footer {
    margin-top: 1rem;
  }
}
</style>
