import { getCurrentInstance, LifecycleHooks } from './component'

export function injectHook(
    type: LifecycleHooks,
    hook: Function,
    target: object
) {
    if (target) {
        // 将用户在组件中使用的生命周期钩子函数，根据不同的类型存储到一个不同的数组中，因为可能存在多个相同类型的钩子函数
        const typeHooks = target[type] || (target[type] = [])
        typeHooks.push(hook)
    }
}
export function createHook(lifecycle: LifecycleHooks) {
    // 此处的 target 即为组件实例
    //  - 需要将 hook 函数绑定到 target 上
    return (hook: Function, target: any = getCurrentInstance()) => {
        if (!target) {
            console.warn(`${lifecycle} 必须在 setup 中使用`)
            return
        }
        return injectHook(lifecycle, hook, target)
    }
}

export const onBeforeMount = createHook(LifecycleHooks.BEFORE_MOUNT)
export const onMounted = createHook(LifecycleHooks.MOUNTED)
export const onBeforeUpdate = createHook(LifecycleHooks.BEFORE_UPDATE)
export const onUpdated = createHook(LifecycleHooks.UPDATED)
