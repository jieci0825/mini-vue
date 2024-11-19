import { isArray, isEmpty, isRegExp, isString } from '@vue/shared'
import { h } from '../h'
import { Fragment, isVNode, VNode } from '../vnode'
import { ComponentInstance, getCurrentInstance } from '../component'
import { ShapeFlags } from 'packages/shared/src/shapFlags'
import { onMounted, onUpdated } from '../apiLifecycle'

const isKeepAlive = Symbol('__v_isKeepAlive')

// 使用了 keepAlive 之后，就不关心组件内部的状态了，所以提供了钩子函数来实现更新
export const KeepAliveImpl = {
    name: `KeepAlive`,
    [isKeepAlive]: true,
    props: {
        include: [String, RegExp, Array],
        exclude: [String, RegExp, Array],
        max: [String, Number]
    },
    setup(props, { slots }) {
        // 缓存的 key
        const keys = new Set()
        // 缓存的对象 - 那个 key 对应的 vnode
        const cache = new Map()

        const instance = getCurrentInstance()
        // 从实例上的组件上下文获取操作 dom 的方法
        const { createElement, move } = instance?.ctx.renderer

        // 创建缓存容器
        const storageContainer = createElement('div')
        // 创建 keepAlive 组件的激活/失活钩子
        // 失活
        instance!.ctx.deactivate = function (vnode: VNode) {
            // 将 keepAlive 组件包裹的组件移动到缓存容器中
            //  - 因为我们针对 keepAlive 是假卸载，如果不将这个组件移动到缓存容器中，那么这个组件还会存在于页面上
            //  - 就会导致后续更新的时候，keepAlive 包裹的旧组件和新组件都存在于页面上，导致没有出现我们预期的渲染结果
            // * 总结来说，就是利用移动操作，伪造了卸载操作，实现了一个假卸载的过程
            move(vnode, storageContainer)

            // todo 调用组件的失活钩子
        }
        // 激活
        instance!.ctx.activate = function (vnode: VNode, container, anchor) {
            // 将缓存容器中的组件移出来，渲染到页面上
            move(vnode, container, anchor)

            // todo 调用组件的激活钩子
        }

        // 等待缓存的 key
        let pendingCacheKey: any = null
        onMounted(() => {
            // keepAlive onMounted 的组件只有挂载的时候才会执行
            // 后续 keepAlive 组件包裹的组件更新的时候，不会执行
            // 等待 dom 渲染完毕之后，在缓存
            addCacheSubTree()
        })

        onUpdated(() => {
            // 当 keepAlive 组件包裹的组件更新的时候，也要执行，保证后续的组件更新的时候，也要缓存
            addCacheSubTree()
        })

        function addCacheSubTree() {
            if (pendingCacheKey) {
                cache.set(pendingCacheKey, instance?.subTree)
            }
        }

        const { include, exclude, max } = props

        // 保存当前的 vnode
        //  - 因为 keepAlive 组件包裹的组件只会采用第一个，所以这个当前就是根节点
        let current: any = null
        function pruneCacheEntry(key) {
            resetShapeFlag(current)
            // 根据 key 删除缓存
            cache.delete(key)
            // 根据 key 删除等待缓存的 key
            keys.delete(key)
        }

        function resetShapeFlag(vnode) {
            if (vnode.shapeFlag & ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE) {
                vnode.shapeFlag -= ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE
            }
            if (vnode.shapeFlag & ShapeFlags.COMPONENT_KEPT_ALIVE) {
                vnode.shapeFlag -= ShapeFlags.COMPONENT_KEPT_ALIVE
            }
        }

        return () => {
            // keepAlive 默认会获取 slots 的 Default 属性，返回的第一个虚拟节点
            // 获取 keepAlive 组件里面包裹的组件
            // 这个 rootVNode 是 keepAlive 组件包裹的组件，而不是 keepAlive 组件本身
            let rootVNode: VNode = slots?.default()

            // 如果是一个vnode，且是一个状态组件(不包含函数式组件)的话，则表示符合条件
            if (
                isVNode(rootVNode) &&
                rootVNode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT
            ) {
                // 就算是数组，传递了多个，也只取第一个
                rootVNode = isArray(rootVNode) ? rootVNode[0] : rootVNode
            } else {
                console.warn('keepAlive 组件包裹的必须是一个带状态组件')
                return h(Fragment, null, [])
            }

            // 拿到正确的 vnode 之后，需要缓存组件
            // 获取组件，即 vnode.type
            const comp = rootVNode.type
            // 获取组件的 key
            //  - 如果 keepAlive 包裹的组件写了 key，则使用组件的 key，否则使用组件本身
            const key = isEmpty(rootVNode.key) ? comp : rootVNode.key

            const componentName = comp.name
            // 如果设置了 include 或者 exclude，则表示需要过滤
            //  - 如果当前组件名称在 include 的规则中，则表示需要缓存，结果取反，需要缓存则执行后面的代码
            //  - 如果当前组件名称在 exclude 的规则中，则表示不需要缓存，如果为 true，则表示不执行后续代码
            const isInclude = include && !matches(include, componentName)
            const isExclude = exclude && matches(exclude, componentName)
            if (componentName && (isInclude || isExclude)) {
                return rootVNode
            }

            // 如果缓存中存在这个 key，则表示已经缓存过，直接取缓存中存储的 dom
            const cachedVNode = cache.get(key)
            if (cachedVNode) {
                // 将缓存的组件的 dom 挂载到 keepAlive 组件的 dom 上，进行复用
                rootVNode.component = cachedVNode.component
                // 添加激活标识-即创建的时候不要直接挂载了，从 storageContainer 中取出来
                rootVNode.shapeFlag |= ShapeFlags.COMPONENT_KEPT_ALIVE
                // * 为什么会走到挂载的逻辑呢？因为判断节点是否一致的时候，会判断类型，而两个不同的组件，他们的组件配置对象肯定不是一个，自然就不一样，就会走挂载

                // 如果复用了，表示进行了激活，则更新 key，让这个 key 变为最新的
                // 即先删除旧的 key，再把这个 key 新添加一次
                keys.delete(key)
                keys.add(key)
            }
            // 如果缓存中不存在这个 key，则表示没有缓存过，需要缓存
            else {
                // 缓存 key
                keys.add(key)
                // 这里不应该存储 rootVNode，因为这个 rootVNode 是组件的虚拟节点，不是组件的 dom
                // 所以这里需要存储组件的 dom
                pendingCacheKey = key

                // 限制缓存数量
                if (max && keys.size > max) {
                    // 获取第一个 key
                    //  - 因为 keys 是一个 Set，所以不能使用下标获取
                    //  - 使用 value 方法获取迭代器，使用 next 方法获取第一个值
                    const first = keys.values().next().value
                    pruneCacheEntry(first)
                }
            }

            // 添加标识，表示这个 vnode 是被 keepAlive 包裹的，需要缓存，在 unmount 删除组件的时候，不能真删除
            rootVNode.shapeFlag |= ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE

            // 将当前 vnode 进行保存
            current = rootVNode

            return rootVNode
        }
    }
}

// 函数matches，用于判断name是否匹配pattern
function matches(pattern, name) {
    // 如果pattern是数组，则遍历数组中的每个元素，判断name是否匹配
    if (isArray(pattern)) {
        return pattern.some((p: string | RegExp) => matches(p, name))
        // 如果pattern是字符串，则将字符串按逗号分隔，判断name是否在分隔后的数组中
    } else if (isString(pattern)) {
        return pattern.split(',').includes(name)
        // 如果pattern是正则表达式，则使用正则表达式测试name
    } else if (isRegExp(pattern)) {
        return pattern.test(name)
    }
    // 如果pattern不是数组、字符串或正则表达式，则返回false
    return false
}

export const isKeepAliveComponent = type => {
    return !!type && type[isKeepAlive]
}
