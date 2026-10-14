<script setup lang="ts">
import {ref,onMounted,onBeforeUnmount} from 'vue'
const button=ref<HTMLButtonElement>(),active=ref(false),error=ref('')
let root:HTMLElement|undefined,fallback=false
function sync(){active.value=fallback||document.fullscreenElement===root}
async function toggle(){root=button.value?.closest<HTMLElement>('main')??undefined;if(!root)return;error.value='';try{if(active.value){if(document.fullscreenElement===root)await document.exitFullscreen();fallback=false;root.classList.remove('is-immersive');document.documentElement.classList.remove('constellation-immersive')}else if(root.requestFullscreen&&!document.fullscreenElement){await root.requestFullscreen()}else{fallback=true;root.classList.add('is-immersive');document.documentElement.classList.add('constellation-immersive')}sync()}catch{fallback=true;root.classList.add('is-immersive');document.documentElement.classList.add('constellation-immersive');error.value='浏览器全屏受限，已进入窗口沉浸模式';sync()}}
function escape(event:KeyboardEvent){if(event.key==='Escape'&&active.value&&!root?.querySelector('[role=dialog]')){event.preventDefault();event.stopImmediatePropagation();void toggle()}}
onMounted(()=>{document.addEventListener('fullscreenchange',sync);window.addEventListener('keydown',escape,true)})
onBeforeUnmount(()=>{document.removeEventListener('fullscreenchange',sync);window.removeEventListener('keydown',escape,true);if(root&&document.fullscreenElement===root)void document.exitFullscreen();root?.classList.remove('is-immersive');document.documentElement.classList.remove('constellation-immersive')})
</script>
<template><button ref="button" class="immersive-toggle" :aria-label="active?'退出沉浸全屏':'进入沉浸全屏'" :title="error||(active?'退出全屏':'全屏')" :aria-pressed="active" @click="toggle"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.2"><path v-if="!active" d="M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5"/><path v-else d="M4 9h5V4m6 0v5h5M9 20v-5H4m11 5v-5h5"/></svg></button></template>
<style scoped>.immersive-toggle{display:grid;place-items:center;width:44px;height:44px;border:1px solid #b6cad433;border-radius:50%;background:#c9d4e008;color:#e6ebef;cursor:pointer}.immersive-toggle svg{width:21px;height:21px}.immersive-toggle:focus-visible{outline:2px solid #dfc394;outline-offset:3px}</style>
<style>
:is(.family-space,.constellation-study):fullscreen{width:100vw;height:100svh;overflow:auto;background:#17212a}
:is(.family-space,.constellation-study):fullscreen :is(.family-stage,.constellation-stage){height:calc(100svh - 130px)!important;min-height:300px}
html.constellation-immersive .floating-module:has(.is-immersive){inset:0!important;width:100vw!important;height:100svh!important;max-width:none;max-height:none;border:0;border-radius:0;transform:none!important;background:#17212a}
html.constellation-immersive .floating-module:has(.is-immersive)>.spatial-return{display:none}
html.constellation-immersive .floating-content:has(.is-immersive){height:100svh;max-height:none}
.is-immersive{position:fixed!important;inset:0;z-index:100;width:100vw;height:100svh;overflow:auto;background:#17212a}
:is(.family-space,.constellation-study):fullscreen header a{visibility:visible!important}
.is-immersive :is(.family-stage,.constellation-stage){height:calc(100svh - 130px)!important;min-height:300px}
</style>
