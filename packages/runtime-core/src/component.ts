import { CustomElement } from './renderer'
import { VNode } from './vnode'

export interface ComponentInstance {
    uid: number
    vnode: VNode
    type: any
    subTree: any
    effect: any
    update: any
    render: any
    isMounted: boolean
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
        isMounted: false // 组件是否挂载
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
    finishComponentSetup(instance)
}

function finishComponentSetup(instance: ComponentInstance) {
    // 获取实例的 type，在 shapeFlag 为 组件时，type 为组件的对象
    const Component = instance.type
    instance.render = Component.render
}
