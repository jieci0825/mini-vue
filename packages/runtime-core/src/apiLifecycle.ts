import { LifecycleHooks } from './component'

export function injectHook(type: LifecycleHooks, hook: Function, target: object) {
    if (target) {
        // 将用户在组件中使用的生命周期钩子函数，根据不同的类型存储到一个不同的数组中，因为可能存在多个相同类型的钩子函数
        const typeHooks = target[type] || (target[type] = [])
        typeHooks.push(hook)
        return hook
    }
}
export function createHook(lifecycle: LifecycleHooks) {
    // 此处的 target 即为组件实例
    return (hook: Function, target: object) => {
        return injectHook(lifecycle, hook, target)
    }
}

export const onBeforeMount = createHook(LifecycleHooks.BEFORE_MOUNT)
export const onMounted = createHook(LifecycleHooks.MOUNTED)
