import { hasChanged, hasOwn, isFunction, isOn, startsWith } from '@vue/shared'
import { reactive } from '@vue/reactivity'
import type { ComponentInstance } from './component'
import { ShapeFlags } from 'packages/shared/src/shapFlags'

export function initProps(instance: ComponentInstance, compProps: any) {
    // 获取生成 vnode 时传入的 props
    const options = instance.vnode.props || {}

    const props: any = {}
    const attrs: any = {}

    // 如果 options 中的属性也在 compProps 中存在，则将其赋值给 props，否则赋值给 attrs
    for (const key in options) {
        const value = options[key]
        if (compProps && hasOwn(compProps, key)) {
            // 如果是 on 开头的属性，这个表示自定义事件，也将其赋值给 props
            props[key] = value
        } else {
            attrs[key] = value
        }
    }

    // * 实际上应该使用 shallowReactive，只负责第一层，浅层的
    instance.props = reactive(props)
    instance.attrs = attrs

    // * 注意：如果是函数组件的话，则 attrs 就是 props
    if (instance.vnode.shapeFlag & ShapeFlags.FUNCTIONAL_COMPONENT) {
        instance.props = attrs
    }
}

/**
 * 解析组件的 props
 * @param compPropsOtions 组件的 props 选项
 * @param rawProps 生成 vnode 时传入的 props
 */
export function resolveProps(compPropsOtions: any, rawProps: any) {
    const props = {}
    const attrs = {}

    for (const key in rawProps) {
        // 以 on 开头的属性，和存在于组件的 props 选项中的属性，都应该放入 props
        if (isOn(key) || hasOwn(compPropsOtions, key)) {
            // 则将 vnode 中的传入的属性值赋值给 props
            props[key] = rawProps[key]
        } else {
            attrs[key] = rawProps[key]
        }
    }

    return { props, attrs }
}

export function updateProps(prevProps: any, nextProps: any) {
    // 更新 props
    for (const k in nextProps) {
        prevProps[k] = nextProps[k]
    }
    // 删除之前 instance.props 上有，但是本次不存在的属性
    for (const k in prevProps) {
        if (!(k in nextProps)) {
            delete prevProps[k]
        }
    }
}

export function hasPropsChanged(prevProps: any = {}, nextProps: any = {}) {
    const nextKeys = Object.keys(nextProps)

    // 如果属性数量不同，则直接返回 true，表示发生了变化
    if (nextKeys.length !== Object.keys(prevProps).length) {
        return true
    }

    // 比较值
    for (let i = 0; i < nextKeys.length; i++) {
        const key = nextKeys[i]
        // 检测值是否发生了变化
        if (hasChanged(prevProps[key], nextProps[key])) {
            return true
        }
    }

    return false
}
