import { ShapeFlags } from 'packages/shared/src/shapFlags'
import { ComponentInstance } from './component'
import { isObject } from '@vue/shared'
import { createVNode, Text } from './vnode'

export function renderComponentRoot(instance: ComponentInstance) {
    const { vnode, render, data } = instance

    let result

    try {
        if (vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
            // 改变 this 指向，让模板内部的数据可以通过 this 访问到
            result = normalizeVNode(render.call(data))
        }
    } catch (error) {
        console.error(error)
    }

    return result
}

export function normalizeVNode(child) {
    if (isObject(child)) {
        return cloneIfMounted(child)
    } else {
        return createVNode(Text, null, String(child))
    }
}

export function cloneIfMounted(child) {
    return child
}
