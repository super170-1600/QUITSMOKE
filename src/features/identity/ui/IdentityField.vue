<script setup lang="ts">
withDefaults(defineProps<{modelValue:string;label:string;readonly?:boolean;error?:string}>(),{readonly:false})
defineEmits<{'update:modelValue':[value:string]}>()
</script>
<template><label class="identity-field"><span>{{label}}</span><input :value="modelValue" :readonly="readonly" :aria-invalid="Boolean(error)" maxlength="40" @input="$emit('update:modelValue',($event.target as HTMLInputElement).value)"/><small v-if="error" role="alert">{{error}}</small></label></template>
<style scoped>
.identity-field{display:block;margin:16px 0 24px;color:#7d888d;font-size:11px}.identity-field>span{display:block;margin-bottom:10px}.identity-field input{width:100%;padding:12px 2px;background:#fff3;border:0;border-bottom:1px solid #9daab355;color:#465257;font:inherit;font-size:22px;letter-spacing:.05em;outline:none;transition:border-color .2s,box-shadow .2s}.identity-field input:focus{border-color:#b49a6b;box-shadow:0 2px 0 #bda97d38}.identity-field input[aria-invalid=true]{border-color:#a5604e}.identity-field small{display:block;margin-top:9px;color:#975443;font-size:12px}@media(prefers-reduced-motion:reduce){.identity-field input{transition:none}}
</style>
