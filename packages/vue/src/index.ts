export {
    reactive,
    effect,
    isReactive,
    ref,
    isRef,
    computed
} from '@vue/reactivity'
export {
    watch,
    queuePreFlushCbs,
    h,
    createVNode,
    Fragment,
    Text,
    Comment,
    openBlock,
    createTextVNode,
    createElementBlock,
    onBeforeMount,
    onMounted,
    onBeforeUpdate,
    onUpdated,
    getCurrentInstance,
    inject,
    provide,
    TeleportImpl as Teleport,
    defineAsyncComponent,
    KeepAliveImpl as KeepAlive
} from '@vue/runtime-core'
export { render, createApp } from '@vue/runtime-dom'
// export { compile } from '@vue/compiler-dom'
export { compile } from '@vue/vue-compat'
export * from '@vue/shared'
