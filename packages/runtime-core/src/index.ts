export { TeleportImpl, isTeleportComponent } from './components/Teleport'
export {
    onMounted,
    onBeforeMount,
    onBeforeUpdate,
    onUpdated
} from './apiLifecycle'
export { watch } from './apiWatch'
export { queuePreFlushCbs } from './scheduler'
export { h } from './h'
export * from './vnode'
export { createRenderer } from './renderer'
export type { CustomElement } from './renderer'
export { getCurrentInstance, registerRuntimeCompiler } from './component'
export * from './apiInject'
export { defineAsyncComponent } from './defineAsyncComponent'
