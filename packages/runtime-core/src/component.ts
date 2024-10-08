import { isFunction, isObject } from '@vue/shared'
import { VNode } from './vnode'
import { reactive } from '@vue/reactivity'
import { onBeforeMount, onMounted } from './apiLifecycle'

export interface ComponentInstance {
    uid: number
    vnode: VNode
    type: any
    subTree: any
    effect: any
    update: any
    render: any
    isMounted: boolean
    data: any
    next: any
    [LifecycleHooks.BEFORE_CREATE]: any
    [LifecycleHooks.CREATED]: any
    [LifecycleHooks.BEFORE_MOUNT]: any
    [LifecycleHooks.MOUNTED]: any
}

// 生命周期
export const enum LifecycleHooks {
    BEFORE_CREATE = 'beforeCreate',
    CREATED = 'created',
    BEFORE_MOUNT = 'beforeMount',
    MOUNTED = 'mounted'
}

let uid = 0
/**
 * 创建组件实例
 * @param vnode vnode
 */
export function createComponentInstance(vnode: VNode): ComponentInstance {
    const type = vnode.type

    const instance = {
        uid: uid++,
        vnode,
        type,
        subTree: null, // 组件内部渲染的树
        effect: null, // 组件渲染effect
        update: null, // 组件更新effect
        render: null, // 组件渲染函数
        isMounted: false, // 组件是否挂载
        data: null,
        next: null,
        [LifecycleHooks.BEFORE_CREATE]: null,
        [LifecycleHooks.CREATED]: null,
        [LifecycleHooks.BEFORE_MOUNT]: null,
        [LifecycleHooks.MOUNTED]: null
    }

    return instance
}

/**
 * 初始化组件
 * @param instance 组件实例
 */
export function setupComponent(instance: ComponentInstance) {
    setupStatefulComponent(instance)
}

function setupStatefulComponent(instance: ComponentInstance) {
    const Component = instance.type
    const { setup } = Component
    // 如果存在 setup 函数，则表示认为是 composition api
    if (isFunction(setup)) {
        const setupResult = setup()
        handleSetupResult(instance, setupResult)
    }
    // 不存在则认为是 options api
    else {
        finishComponentSetup(instance)
    }
}

function handleSetupResult(instance: ComponentInstance, setupResult: any) {
    // todo 暂时只处理 setup 返回值为函数情况
    if (isFunction(setupResult)) {
        // 如果 setup 返回值为函数，则将其作为 render 函数
        instance.render = setupResult
    }

    // 触发 finishComponentSetup
    finishComponentSetup(instance)
}

//
function finishComponentSetup(instance: ComponentInstance) {
    // 获取实例的 type，在 shapeFlag 为 组件时，type 为组件的对象
    const Component = instance.type

    // 如果实例上没有 render 函数，则从组件对象中获取 render 属性，并赋值给实例
    if (!instance.render) {
        instance.render = Component.render
    }

    applyOptions(instance)
}

function applyOptions(instance: ComponentInstance) {
    // 提取组件对象中的 data 属性，以及生命周期等函数
    const { data: dataOptions, beforeCreate, created, beforeMount, mounted } = instance.type

    // 初始化
    if (beforeCreate) {
        callHook(beforeCreate, instance.data)
    }

    // 如果 data 属性存在，即为一个函数，直接触发
    if (dataOptions) {
        const data = dataOptions()
        if (isObject(data)) {
            // 如果是一个对象，则将其用 reactive 进行包裹，进行响应式处理
            instance.data = reactive(data)
        }
    }

    // 等待 data 处理完成之后，再执行 created 钩子函数
    //  - 这里 beforeCreate 和 created 钩子函数的执行无需经过 effect，所以直接调用即可
    if (created) {
        callHook(created, instance.data)
    }

    function registerLifecycleHooks(register: Function, hook?: Function) {
        // 如果 hook 存在，则将其 this 绑定到 instance.data 上，
        register(hook?.bind(instance.data), instance)
    }

    // 注册钩子函数
    registerLifecycleHooks(onBeforeMount, beforeMount)
    registerLifecycleHooks(onMounted, mounted)
}

function callHook(hook: Function, proxy: any) {
    hook.bind(proxy)()
}
