import { hasChanged, hasOwn, isFunction, isObject } from '@vue/shared'
import { VNode } from './vnode'
import { isRef, reactive } from '@vue/reactivity'
import { onBeforeMount, onMounted } from './apiLifecycle'
import { initProps } from './componentProps'

export interface ComponentInstance {
    uid: number
    ctx: any
    provides: any
    parent: any
    vnode: VNode
    type: any
    subTree: any
    effect: any
    update: any
    render: any
    isMounted: boolean
    state: any // 状态
    next: any
    [LifecycleHooks.BEFORE_CREATE]: any
    [LifecycleHooks.CREATED]: any
    [LifecycleHooks.BEFORE_MOUNT]: any
    [LifecycleHooks.MOUNTED]: any
    [LifecycleHooks.BEFORE_UPDATE]: any
    [LifecycleHooks.UPDATED]: any
    props: any
    attrs: any
    emits: any
    slots: any
    propsOptions: any
    proxy: any // 渲染上下文
    setupState: any // setup 函数返回值
}

// 生命周期
export const enum LifecycleHooks {
    BEFORE_CREATE = 'bc',
    CREATED = 'c',
    BEFORE_MOUNT = 'bm',
    MOUNTED = 'm',
    BEFORE_UPDATE = 'bu',
    UPDATED = 'u'
}

export let currentInstance: ComponentInstance | null = null
export function setCurrentInstance(instance: ComponentInstance | null) {
    currentInstance = instance
}
export function getCurrentInstance() {
    return currentInstance
}

let uid = 0
let compile: any = null
/**
 * 创建组件实例
 * @param vnode vnode
 */
export function createComponentInstance(
    vnode: VNode,
    parent: any
): ComponentInstance {
    const type = vnode.type

    const instance = {
        uid: uid++,
        ctx: {}, // 组件实例上下文
        // 所有组件使用的都是父组件的 provides
        provides: parent ? parent.provides : Object.create(null),
        parent, // 父组件实例
        vnode,
        type,
        subTree: null, // 组件内部渲染的树
        effect: null, // 组件渲染effect
        update: null, // 组件更新effect
        render: null, // 组件渲染函数
        isMounted: false, // 组件是否挂载
        state: null, // 状态
        next: null,
        [LifecycleHooks.BEFORE_CREATE]: null,
        [LifecycleHooks.CREATED]: null,
        [LifecycleHooks.BEFORE_MOUNT]: null,
        [LifecycleHooks.MOUNTED]: null,
        [LifecycleHooks.BEFORE_UPDATE]: null,
        [LifecycleHooks.UPDATED]: null,
        props: {},
        attrs: {},
        emits: {},
        slots: {},
        propsOptions: {},
        proxy: null, // 渲染上下文
        setupState: null // setup 函数返回值
    }

    return instance
}

/**
 * 初始化组件
 * @param instance 组件实例
 */
export function setupComponent(instance: ComponentInstance) {
    const Component = instance.type
    const { setup, props: propsOptions = {} } = Component

    // 初始化 props
    instance.propsOptions = propsOptions
    initProps(instance, propsOptions)

    // 获取 setup 函数的上下文
    const setupContext = {
        attrs: instance.attrs,
        // emit 本质就是发布与订阅，在 vnode.props 中注册事件，在 emit 中触发事件
        emit(event, ...payload) {
            const eventName = `on${event[0].toUpperCase() + event.slice(1)}`
            const handler = instance.vnode.props[eventName]
            if (handler) {
                handler(...payload)
            } else {
                console.warn(`Event "${event}" is not defined.`)
            }
        },
        // 插槽实际就是 children
        slots: instance.vnode.children
    }

    instance.emits = setupContext.emit
    instance.slots = setupContext.slots

    // 如果存在 setup 函数，则表示认为是 composition api
    if (isFunction(setup)) {
        setCurrentInstance(instance)
        // 传递给 setup 函数的参数
        //  - 参数一： props
        //  - 参数二： setup上下文
        const setupResult = setup(instance.props, setupContext)
        setCurrentInstance(null)
        // 处理 setup 函数的返回值
        handleSetupResult(instance, setupResult)
    }

    // 不存在则认为是 options api
    finishComponentSetup(instance)
}

function handleSetupResult(instance: ComponentInstance, setupResult: any) {
    if (isFunction(setupResult)) {
        // 如果 setup 返回值为函数，则将其作为 render 函数
        instance.render = setupResult
    } else {
        // 如果不是函数则使用自动脱 ref 处理
        if (isObject(setupResult)) {
            instance.setupState = proxyRefs(setupResult)
        }
        // 为 undefined 则表示没有返回值，则直接初始化一个空对象
        else if (setupResult === undefined) {
            instance.setupState = {}
        }
        // 其他情况则抛出一个警告
        else {
            console.warn('setup 的返回值需要是一个对象或函数')
        }
    }
}

//
function finishComponentSetup(instance: ComponentInstance) {
    // 获取实例的 type，在 shapeFlag 为 组件时，type 为组件的对象
    const Component = instance.type

    // 如果实例上没有 render 函数，则从组件对象中获取 render 属性，并赋值给实例
    // 且需要判断 Component 本身是否是一个函数，如果本身就是一个函数，表示这是一个函数式组件，则 Component 就是 render 函数
    if (!instance.render && !isFunction(Component)) {
        // 如果组件对象中存在 render 属性，则将其赋值给实例的 render 函数
        if (Component.render) {
            instance.render = Component.render
        } else {
            // 如果没有，则读取 template 属性，并使用编译器生成的 render 函数
            instance.render = compile(Component.template)
        }
    }

    applyOptions(instance)
}

export function registerRuntimeCompiler(_compile: Function) {
    compile = _compile
}

function applyOptions(instance: ComponentInstance) {
    // 提取组件对象中的 data 属性，以及生命周期等函数
    const {
        data: dataOptions,
        beforeCreate,
        created,
        beforeMount,
        mounted
    } = instance.type

    const publickProxyMap = {
        $attrs: (i: ComponentInstance) => i.attrs,
        $emits: (i: ComponentInstance) => i.emits,
        $slots: (i: ComponentInstance) => i.slots
    }

    const renderContext = createRenderContext(instance, publickProxyMap)
    instance.proxy = renderContext

    // 初始化-适配 options api
    if (beforeCreate) {
        callHook(beforeCreate, instance.proxy)
    }

    // 如果 data 属性存在，即为一个函数，直接触发
    if (dataOptions) {
        if (!isFunction(dataOptions)) {
            return console.warn('data 属性必须是一个函数')
        }

        const data = dataOptions()
        if (isObject(data)) {
            // 如果是一个对象，则将其用 reactive 进行包裹，进行响应式处理
            instance.state = reactive(data)
        }
    }

    // 等待 data 处理完成之后，再执行 created 钩子函数
    //  - 这里 beforeCreate 和 created 钩子函数的执行无需经过 effect，所以直接调用即可
    if (created) {
        callHook(created, instance.proxy)
    }

    // function registerLifecycleHooks(register: Function, hook?: Function) {
    //     // 如果 hook 存在，则将其 this 绑定到 instance.proxy 上，
    //     register(hook?.bind(instance.proxy), instance)
    // }

    // 注册钩子函数
    // registerLifecycleHooks(onBeforeMount, beforeMount)
    // registerLifecycleHooks(onMounted, mounted)
}

function callHook(hook: Function, proxy: any) {
    hook.bind(proxy)()
}

// 创建渲染上下文
function createRenderContext(
    instance: ComponentInstance,
    publickProxyMap: any
) {
    const renderContext = new Proxy(instance, {
        get(target, key) {
            const { state, props, attrs, setupState } = target
            // 处理 state、props、attrs、setupState
            if (state && hasOwn(state, key)) {
                return state[key]
            } else if (setupState && hasOwn(setupState, key)) {
                return setupState[key]
            } else if (props && hasOwn(props, key)) {
                return props[key]
            }

            const getter = publickProxyMap[key]
            if (getter) {
                return getter(instance)
            }

            return target[key]
        },
        // 将数据写入组件自身的状态数据中
        set(target, key, value) {
            const { state, props, setupState } = target
            if (state && hasOwn(state, key)) {
                state[key] = value
            } else if (setupState && hasOwn(setupState, key)) {
                setupState[key] = value
            } else if (props && hasOwn(props, key)) {
                // 从这里代理进行屏蔽，防止用户在子组件内修改 props
                // 但是用户还是可以通过 instance 这个实例身上进行修改，例如：instance.props.xxx = xxx
                console.warn(
                    `Attempting to mutate prop ` + key + ` Props are readonly`
                )
                return false
            }
            return true
        }
    })

    return renderContext
}

/**
 * 对 setup 返回的结果进行自动脱 ref
 */
export function proxyRefs(target: any) {
    return new Proxy(target, {
        get(target, key, receiver) {
            const value = Reflect.get(target, key, receiver)
            // 如果是 ref，则返回 ref.value
            return isRef(value) ? value.value : value
        },
        set(target, key, newValue, receiver) {
            const oldValue = target[key]

            // 如果旧值是一个 ref 对象，则直接修改 ref.value
            if (isRef(oldValue)) {
                oldValue.value = newValue
                return true
            }

            // 不是 ref 对象，则直接修改
            return Reflect.set(target, key, newValue, receiver)
        }
    })
}
