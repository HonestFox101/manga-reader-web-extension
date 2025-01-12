<script setup lang="ts">
import { storageDemo } from "~/logic/storage";

function openOptionsPage() {
  browser.runtime.openOptionsPage();
}
</script>

<template>
  <main class="popup">
    <Logo />
    <div class="title">Popup</div>
    <SharedSubtitle />
    <button @click="openOptionsPage">Open Options</button>
    <div class="footer"><span>Storage:</span> {{ storageDemo }}</div>
  </main>
</template>

<style lang="scss" scoped>
.popup {
  min-width: 400px;
  min-height: 360px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;

  .title {
    font-size: 2rem;
  }

  button {
    padding: 0.5rem 1rem;
    margin-top: 1rem;
    border: 1px solid #333;
    border-radius: 0.25rem;
    background-color: #fff;
    cursor: pointer;
  }

  .footer {
    margin-top: 1rem;
  }
}
</style>
