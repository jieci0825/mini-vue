import {
    ComponentInstance,
    getCurrentInstance,
    LifecycleHooks,
    setCurrentInstance
} from './component'

export function injectHook(
    type: LifecycleHooks,
    hook: Function,
    target: ComponentInstance
) {
    if (target) {
        // 将用户在组件中使用的生命周期钩子函数，根据不同的类型存储到一个不同的数组中，因为可能存在多个相同类型的钩子函数
        const typeHooks = target[type] || (target[type] = [])

        // 保证外部可以在钩子函数里面通过 getCurrentInstance 获取到当前组件实例
        //  - 利用闭包包装函数
        const wrappedHook = () => {
            // 在调用钩子函数之前，先设置当前组件实例，这里是存在闭包的，可以正确拿到组件实例
            //  - 设置之后，在钩子函数里面调用 getCurrentInstance 就可以获取到当前组件实例
            setCurrentInstance(target)
            // 在包装的函数里面调用钩子函数
            hook()
            // 调用完之后，将当前组件实例设置为 null
            setCurrentInstance(null)
        }
        typeHooks.push(wrappedHook)
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
