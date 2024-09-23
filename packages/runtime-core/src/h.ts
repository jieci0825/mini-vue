import { isArray, isObject } from '@vue/shared'
import { IsVNode } from './constants'
import { createVNode, isVNode, VNode } from './vnode'

export function h(vnode: any, propsOrChildren?: any, children?: any): VNode {
    const argsLen = arguments.length

    // 参数长度为 2 表示没有传递 children
    if (argsLen === 2) {
        // 先判断 propsOrChildren 是否是对象且是否为一个数组
        if (isObject(propsOrChildren) && !isArray(propsOrChildren)) {
            // 如果 propsOrChildren 是一个对象也不是一个数组，并且是一个 VNode，则将其作为 children
            if (isVNode(propsOrChildren)) {
                return createVNode(vnode, null, propsOrChildren)
            }
            // 如果不是一个 VNode，则将其作为 props
            return createVNode(vnode, propsOrChildren, [])
        }
        // 如果 propsOrChildren 是一个数组或者其他(字符串，函数)，则将其作为 children
        else {
            return createVNode(vnode, null, propsOrChildren)
        }
    }
    // 处理其他情况
    else {
        // 参数大于 3 的话，则将第二个参数之后的参数都作为 children 处理
        if (argsLen > 3) {
            children = Array.prototype.slice.call(arguments, 2)
        }
        // 参数为 3 的话，判断第三个参数是否为 VNode，如果是则将其作为 children，并包裹为数组
        else if (argsLen === 3 && isVNode(children)) {
            // 这里需要将 children 包裹为数组，是因为后续在处理一个元素的子节点时，统一处理为数组比较方便，不需要额外进行判断
            children = [children]
        }
        return createVNode(vnode, propsOrChildren, children)
    }
}
