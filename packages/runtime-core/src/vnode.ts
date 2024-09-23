import { ShapeFlags } from 'packages/shared/src/shapFlags'
import { IsVNode } from './constants'
import { isArray, isFunction, isObject, isString } from '@vue/shared'
import { normalizeClass } from './normalizeProp'

export const Text = Symbol('Text')
export const Comment = Symbol('Comment')
export const Fragment = Symbol('Fragment')

export interface VNode {
    [IsVNode]: true
    type: any
    props: any
    children: any
    shapeFlag: number
    el: any
}

export const isVNode = (vnode: any) => {
    return vnode && vnode[IsVNode]
}

export function createVNode(type: any, props: any, children: any): VNode {
    // 处理 props
    if (props) {
        const { class: klass, style } = props
        klass && (props.class = normalizeClass(klass))
    }

    // 处理 shapeFlag
    let shapeFlag = 0
    //  - 如果是一个 string 则当做一个 html 标签来处理
    if (isString(type)) {
        shapeFlag = ShapeFlags.ELEMENT
    }
    // - 如果是一个对象，则当做一个组件来处理
    else if (isObject(type)) {
        shapeFlag = ShapeFlags.STATEFUL_COMPONENT
    }

    return createBaseVNode(type, props, children, shapeFlag)
}

function createBaseVNode(type: any, props: any, children: any, shapeFlag: number): VNode {
    const vnode: VNode = {
        [IsVNode]: true,
        type,
        props,
        children,
        shapeFlag,
        el: null
    }

    normalizeChildren(vnode, children)

    return vnode
}

/**
 * 标准化 children
 */
export function normalizeChildren(vnode: VNode, children: any) {
    let type = 0

    // 如果是 null 表示没有子节点
    if (children === null || children === undefined) {
        children = null
    } else if (isArray(children)) {
        type = ShapeFlags.ARRAY_CHILDREN
    } else if (isObject(children)) {
        type = ShapeFlags.STATEFUL_COMPONENT
    } else if (isFunction(children)) {
        // todo 组件如果是一个函数，暂未处理
        type = ShapeFlags.FUNCTIONAL_COMPONENT
    }
    // 都不是，则当做一个文本节点处理
    else {
        // 如果是一个 children 是一个字符串，则 ShapeFlags 需要包含这个类型，便于后续创建元素的时候可以通过这个来是否生成文本节点
        type = ShapeFlags.TEXT_CHILDREN
        children = String(children)
    }

    vnode.children = children
    // 将之前的 shapeFlag 和新的 type 进行或运算，即合并起来，得到新的 shapeFlag
    vnode.shapeFlag |= type
}
