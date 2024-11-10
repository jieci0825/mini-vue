import { ShapeFlags } from 'packages/shared/src/shapFlags'
import { Comment, Fragment, isSameVNodeType, Text, VNode } from './vnode'
import {
    EMPTY_ARR,
    EMPTY_OBJ,
    hasChanged,
    invokeArrayFns,
    isFunction,
    isString
} from '@vue/shared'
import {
    type ComponentInstance,
    createComponentInstance,
    setupComponent
} from './component'
import { ReactiveEffect } from 'packages/reactivity/src/effect'
import { queuePreFlushCbs } from './scheduler'
import { normalizeVNode, renderComponentRoot } from './componentRenderUtils'
import { hasPropsChanged, updateProps } from './componentProps'

export interface CustomElement extends Element {
    _vnode?: VNode
}

export interface RendererOptions {
    /**
     * 为指定的 el 的属性打补丁
     */
    patchProp(
        el: CustomElement,
        key: string,
        prevValue: any,
        nextValue: any
    ): void
    /**
     * 未指定的 element 设置 text
     */
    setText(el: CustomElement, text: string): void
    /**
     * 将一个元素插入到父元素中，anchor 表示插入的位置，即：锚点
     */
    insert(el: CustomElement, parent: CustomElement, anchor?: any): void
    /**
     * 创建一个元素
     */
    createElement(tag: string): CustomElement
    /**
     * 创建一个文本节点
     */
    createTextNode(text: string): Text
    /**
     * 创建一个注释节点
     */
    createComment(text: string): Comment
    /**
     * 设置元素文本内容
     */
    setText(el: CustomElement, text: string): void
    /**
     * 移除元素
     */
    remove(el: CustomElement): void
}

/**
 * 创建渲染器
 */
export function createRenderer(options: RendererOptions) {
    return baseCreateRenderer(options)
}

interface baseCreateRendererReturn {
    render: (vnode: VNode, container: CustomElement) => void
}

function baseCreateRenderer(
    options: RendererOptions
): baseCreateRendererReturn {
    const {
        createElement: hostCreateElement,
        createTextNode: hostCreateTextNode,
        createComment: hostCreateComment,
        setText: hostSetText,
        insert: hostInsert,
        patchProp: hostPatchProp,
        remove: hostRemove
    } = options

    /**
     * 卸载元素
     */
    function unmount(vnode: VNode) {
        hostRemove(vnode.el)
    }

    /**
     * 批量卸载子节点
     */
    function unmountChildren(children: VNode[]) {
        for (let i = 0; i < children.length; i++) {
            unmount(children[i])
        }
    }

    /**
     * 移动元素
     */
    function move(vnode: VNode, container: CustomElement, anchor?: any) {
        const { el } = vnode
        hostInsert(el, container, anchor)
    }

    /**
     * 更新Text
     */
    function updateTextNode(oldVNode: VNode, newVNode: VNode) {
        // 节点进行复用，只需要更新文本内容即可
        const el = (newVNode.el = oldVNode.el)
        if (oldVNode.children !== newVNode.children) {
            hostSetText(el, newVNode.children)
        }
    }

    /**
     * 挂载Text
     */
    function mountTextNode(
        vnode: VNode,
        container: CustomElement,
        anchor?: any
    ) {
        const textNode = (vnode.el = hostCreateTextNode(
            vnode.children
        ) as unknown as Element)
        hostInsert(textNode, container, anchor)
    }

    /**
     * 更新Comment
     */
    function updateCommentNode(oldVNode: VNode, newVNode: VNode) {
        const el = (newVNode.el = oldVNode.el)
        if (oldVNode.children !== newVNode.children) {
            hostSetText(el, newVNode.children)
        }
    }

    /**
     * 挂载Comment
     */
    function mountCommentNode(
        vnode: VNode,
        container: CustomElement,
        anchor?: any
    ) {
        const commentNode = (vnode.el = hostCreateComment(
            vnode.children
        ) as unknown as Element)
        hostInsert(commentNode, container, anchor)
    }

    /**
     * 挂载 children
     */
    function mountChildren(
        children: VNode[],
        container: CustomElement,
        anchor?: any
    ) {
        // 处理 Cannot assign to read only property '0' of string 'xxx'
        if (isString(children)) {
            children = children.split('').map((item) => normalizeVNode(item))
        }
        for (let i = 0; i < children.length; i++) {
            const child = (children[i] = normalizeVNode(children[i]))
            patch(null, child, container, anchor)
        }
    }

    /**
     * 挂载元素
     */
    function mountElement(
        vnode: VNode,
        container: CustomElement,
        anchor?: any
    ) {
        const { type, shapeFlag, props } = vnode

        // 1、创建元素
        const el = (vnode.el = hostCreateElement(type))
        // 2、处理 children 为文本节点的情况
        if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
            hostSetText(el, vnode.children)
        }
        // 3、处理 children 为数组的情况，也只会为数组，就算值传低了一个虚拟节点，也会被封装成数组，在 h 函数中处理了
        else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            // 这里直接挂载子节点即可
            mountChildren(vnode.children, el, anchor)
        }
        // 4、设置元素属性
        if (props) {
            for (const key in props) {
                // 这里是挂在，所以上一个值是 null
                hostPatchProp(el, key, null, props[key])
            }
        }
        // 5、插入
        hostInsert(el, container, anchor)
    }

    /**
     * 挂载组件
     */
    function mountComponent(
        initialVNode: VNode,
        container: CustomElement,
        anchor?: any
    ) {
        const instance = (initialVNode.component =
            createComponentInstance(initialVNode))

        // 在 setupComponent 主要进行 render 函数的绑定
        //  - 并且会在里面进行组件实例化和生命周期函数的处理等
        setupComponent(instance)

        // 触发实际的渲染，即render函数执行
        setupRenderEffect(instance, initialVNode, container, anchor)
    }

    function shouldUpdateComponent(n1: VNode, n2: VNode) {
        const { props: prevProps, children: prevChildren } = n1
        const { props: nextProps, children: nextChildren } = n2

        // 插槽就是 Children
        //  - 只要有插槽，则一定需要更新
        if (prevChildren || nextChildren) {
            return true
        }

        // 检查属性是否一样，如果一样则不需要更新
        if (prevProps === nextProps) return false
        // 检测属性是否发生变化，如果发生变化则需要进行更新
        return hasPropsChanged(prevProps, nextProps)
    }

    /**
     * 更新组件
     */
    function updateComponent(n1: VNode, n2: VNode) {
        // * 被动更新，比如父传子，子组件的 props 发生变化，子组件会触发更新
        // 此时子组件发生的更新就是被动更新

        // 在组件初次挂载的时候，会同步给 component 属性也赋值为实例
        const instance = (n2.component = n1.component)

        // 判断是否需要进行更新，做统一更新入口
        //  - 被动更新一定需要吗？比如父传子的 props 并没有发生变化，此时就不需要进行被动更新
        //  - 这里通过这个方法来判断是否需要更新，只要有变化就强制更新
        if (shouldUpdateComponent(n1, n2)) {
            // 将新的 vnode 赋值给组件实例的 next 属性
            n2.component.next = n2
            // 强制更新
            n2.component.update()
        }
        // updateProps(instance, n1, n2)
    }

    function updateComponentPreRender(
        instance: ComponentInstance,
        next: VNode
    ) {
        instance.vnode = next
        instance.next = null

        // next 即为本次更新的 vnode
        // instance.props 存在的就是初次挂载时，经过和组件的props合并后的 props，记录的是子组件需要的 props
        updateProps(instance.props, next.props)
    }

    function setupRenderEffect(
        instance: ComponentInstance,
        initialVNode: VNode,
        container: CustomElement,
        anchor?: any
    ) {
        // 组件的更新函数--组件 render 函数内数据变化，触发更新
        const componentUpdateFn = () => {
            // 为 false 表示初次挂载
            if (!instance.isMounted) {
                // 从这里将 beforeMount 和 mounted 函数取出进行调用
                const { bm, m } = instance

                invokeArrayFns(bm)

                // 得到组件的渲染函数返回的 VNode
                //  - 这里是组件对象里面的 render 而非是渲染器里面的 render
                const subTree = renderComponentRoot(instance)
                // 执行挂载
                patch(null, subTree, container, anchor)

                // 在组件被挂载之后调用
                invokeArrayFns(m)

                instance.subTree = subTree
                initialVNode.el = subTree.el
                instance.isMounted = true
            } else {
                let { next, bu, u } = instance

                invokeArrayFns(bu)

                if (next) {
                    // 更新前，拿到最新属性来进行更新
                    updateComponentPreRender(instance, next)
                }

                // 重新执行组件的 render 函数，得到新的
                const nextTree = renderComponentRoot(instance)
                // 上一次组件的 subTree 作为旧的 vnode
                const prevTree = instance.subTree
                // 重新将本次的 nextTree 赋值给 subTree，作为下一次更新的旧的 vnode
                instance.subTree = nextTree

                // 更新
                patch(prevTree, nextTree, container)

                instance.vnode.el = nextTree.el

                invokeArrayFns(u)
            }
        }

        // 使用 effect 来包裹组件的更新函数
        const effect = (instance.effect = new ReactiveEffect(
            componentUpdateFn,
            () => {
                queuePreFlushCbs(update)
            }
        ))

        function update() {
            effect.run()
        }
        instance.update = update
        // 手动触发第一次
        update()
    }

    /**
     * 处理节点的 prop
     */
    function patchProps(
        el: CustomElement,
        vnode: VNode,
        oldProps: any,
        newProps: any
    ) {
        if (oldProps !== newProps) {
            // 进行新旧的 props 的属性值 对比
            for (const key in newProps) {
                const next = newProps[key]
                const prev = oldProps[key]
                // 如果新旧值发生变化，则更新
                if (hasChanged(prev, next)) {
                    hostPatchProp(el, key, prev, next)
                }
            }

            if (oldProps !== EMPTY_OBJ) {
                // 新旧对比完成之后，在遍历一次 oldProps，如果 oldProps 中有，而 newProps 中没有，则说明是需要删除的
                // 比如：第一次节点有 class，第二次没有，则需要删除 class
                for (const key in oldProps) {
                    if (!newProps.hasOwnProperty(key)) {
                        hostPatchProp(el, key, oldProps[key], null)
                    }
                }
            }
        }
    }

    /**
     * 处理子节点
     */
    function patchChildren(
        oldVNode: VNode,
        newVNode: VNode,
        container: CustomElement,
        anchor?: any
    ) {
        //获取旧节点的 children
        const c1 = oldVNode && oldVNode.children
        // 获取旧节点的 shapeFlag
        const prevShapeFlag = oldVNode ? oldVNode.shapeFlag : 0
        //获取新节点的 children
        let c2: any = newVNode && newVNode.children
        if (c2) {
            if (!isString(c2)) {
                for (let i = 0; i < c2.length; i++) {
                    c2[i] = normalizeVNode(c2[i])
                }
            }
        }
        const { shapeFlag } = newVNode

        // debugger

        // 进行不同状态的判断

        // 新节点的children是文本节点的分支
        if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
            // 如果旧节点的一个数组的，则将旧节点的 children 都卸载掉
            //  - 这里在 h 函数中进行了 children 的参数处理，如果 h(div,null,vnode) 会包装为 h(div,null,[vnode])
            //  - 所以如果不是数组，就是字符串
            if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                unmountChildren(oldVNode.children)
            }

            // 如果新旧节点的字符串内容不一样，则直接更新文本内容
            if (c1 !== c2) {
                hostSetText(container, c2)
            }
        }
        // 新节点的children不是一个文本节点的分支
        else {
            // 如果新节点和旧节点的children都是数组，则进行 diff 算法
            if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                    // 进行简略的判断，只要两个子数组第一个数据有 key 属性，即表示都有 key
                    if (c1[0]?.key && c2[0]?.key) {
                        patchKeyChildren(c1, c2, container, anchor)
                    } else {
                        patchUnkeyedChildren(c1, c2, container, anchor)
                    }
                }
                // 新节点的 children 不是一个数组，也不是一个文本节点，则需要进行卸载，则卸载旧节点的 children
                else {
                    // todo 卸载旧节点的 children
                    unmountChildren(c1)
                }
            }
            // 旧节点的 children 也不是数组的处理
            else {
                // 检测旧节点的children是否是一个文本节点，如果是则清空
                if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
                    hostSetText(container, '')
                }

                // 如果新节点是一个数组，则将新节点的 children 进行单独的挂载
                if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                    mountChildren(c2, container, anchor)
                }
            }
        }
    }

    /**
     * 处理虚拟节点没有key时，进行 diff 算法
     */
    function patchUnkeyedChildren(
        c1: VNode[],
        c2: VNode[],
        container: CustomElement,
        anchor: any
    ) {
        const oldLen = c1.length
        const newLen = c2.length

        // 获取新旧数组的最小长度
        const minLen = Math.min(oldLen, newLen)

        // 根据最小长度来进行遍历公共节点部分。进行 patch
        for (let i = 0; i < minLen; i++) {
            const oldVNode = c1[i]
            const newVNode = c2[i]
            patch(oldVNode, newVNode, container, anchor)
        }

        // 公共节点对比完后的处理
        //  - 如果 c1 大于 c2 则存在多余的旧节点，进行卸载
        if (oldLen > newLen) {
            unmountChildren(c1.slice(minLen))
        }

        //  - 如果 c1 小于 c2，则表示需要新增元素
        if (oldLen < newLen) {
            mountChildren(c2.slice(minLen), container, anchor)
        }
    }

    /**
     * 处理虚拟节点有key时，进行 diff 算法
     */
    function patchKeyChildren(
        c1: VNode[],
        c2: VNode[],
        container: CustomElement,
        parentAnchor: any
    ) {
        const oldChildren = c1 // 旧子节点数组
        const newChildren = c2 // 新子节点数组

        let i = 0 // 当前遍历的索引
        let oldIndexEnd = oldChildren.length - 1 // 旧节点的最后一个索引
        let newIndexEnd = newChildren.length - 1 // 新节点的最后一个索引

        // 遍历新节点，进行 diff 算法
        // ***** step1：自前向后 *****
        // (a b) c d
        // (a b) d e f
        // 这里只处理新旧节点一致的更新，卸载和创建不负责
        while (i <= oldIndexEnd && i <= newIndexEnd) {
            const prevChild = oldChildren[i] // 旧节点
            const nextChild = normalizeVNode(newChildren[i]) // 新节点-新节点可能会更换为文本节点，所以将节点标准化
            // 如果新旧节点不相等，则进行 patch，否则直接跳过
            if (isSameVNodeType(prevChild, nextChild)) {
                // 一样的vnode，不需要传入锚点，只需要更新即可
                patch(prevChild, nextChild, container, null)
            } else {
                break
            }
            i++
        }

        // ***** step2：自后向前 *****
        // d (b c)
        // d e (b c)
        // 经过 step 的步骤之后，i 已经从 0 变为了一个头部对比结束的索引值，也一直只处理一样节点的更新
        // 所以从尾部开始对比的时候，不在对 i 进行增加，改为每次减少 oldIndexEnd 和 newIndexEnd
        while (i <= oldIndexEnd && i <= newIndexEnd) {
            const prevChild = oldChildren[oldIndexEnd] // 旧节点
            const nextChild = normalizeVNode(newChildren[newIndexEnd]) // 新节点
            if (isSameVNodeType(prevChild, nextChild)) {
                patch(prevChild, nextChild, container, null)
            } else {
                break
            }
            oldIndexEnd--
            newIndexEnd--
        }

        /****************** 处理完头部和尾部之后，就处理中间部分，中间部分分为了三种情况 ******************/

        // ***** step3：前面两步完成了前后对比时新旧节点一致时的更新，这一步处理新节点多余旧节点的时候 *****
        // (a b)
        // (a b) c
        // 自前向后对比后的值：i = 2, oldIndexEnd = 1, newIndexEnd = 2
        // (a b)
        // c (a b)
        // 自后向前对比后的值：i = 0, oldIndexEnd = -1, newIndexEnd = 0
        // 若 i 大于 oldIndexEnd，则说明新节点比旧节点多，此时需要将新节点进行挂载
        if (i > oldIndexEnd) {
            // 且只有 i <= newIndexEnd 的时候，才表示是一个新节点
            if (i <= newIndexEnd) {
                // 插入的位置不一定就在最后，所以要确定锚点的位置
                // 1. 获取新节点的下一个节点
                const nextPos = newIndexEnd + 1
                // 2. 获取新节点的下一个节点的锚点，如果不存在，则使用默认加入到容器末尾(锚点为null即可 parentAnchor = null)
                const anchor =
                    nextPos < newChildren.length
                        ? newChildren[nextPos].el
                        : parentAnchor
                while (i <= newIndexEnd) {
                    patch(null, newChildren[i], container, anchor)
                    i++
                }
            }
        }

        // ***** step4：旧节点多余新节点，进行卸载 *****
        // (a b) c
        // (a b)
        // 自前向后对比后的值：i = 2, oldIndexEnd = 2, newIndexEnd = 1
        // a (b c)
        // (b c)
        // 自后向前对比后的值：i = 0, oldIndexEnd = 1, newIndexEnd = -1
        // 若 i 大于 newIndexEnd，则说明旧节点比新节点多，此时需要将旧节点进行卸载
        else if (i > newIndexEnd) {
            // 索引 i 必须要处于 oldIndexEnd 之内，才表示是一个有效的旧节点
            while (i <= oldIndexEnd) {
                unmount(oldChildren[i])
                i++
            }
        }
        // ***** step5：处理剩余的中间部分-未知顺序 *****
        // (a b) c d e (f g)
        // (a b) e c d x (f g)
        else {
            // * 新老节点都存在，顺序不稳定，需要处理
            // 暂存初始索引-因为后续 i 会被改变
            const oldStartIndex = i // 旧节点的开始索引-源码为 s1
            const newStartIndex = i // 新节点的结束索引-源码为 s2

            // 把 newChildren 中的 vnode 映射到一个 key -> index 的 map 中
            const keyToNewIndexMap = new Map()
            for (i = newStartIndex; i <= newIndexEnd; i++) {
                const nextChild = newChildren[i]
                if (nextChild.key) {
                    keyToNewIndexMap.set(nextChild.key, i)
                }
            }

            // 需要更新的节点数量：新节点的索引 - 新节点的开始索引，+1 是因为索引从 0 开始，变为数量时需要 +1
            const toBePatched = newIndexEnd - newStartIndex + 1
            // 记录更新的次数：每新增或者更新一个节点，就 +1
            let patched = 0

            let moved = false // 是否需要移动
            let maxNewIndexSoFar = 0 // 记录新节点中最大的索引值，用于后续判断是否需要移动

            // * 下标是新元素的相对下标，初始值是 0，如果这个节点被复用了，值就是老元素的下标 + 1
            const newIndexToOldIndexMap = new Array(toBePatched)
            for (i = 0; i < toBePatched; i++) {
                newIndexToOldIndexMap[i] = 0
            }

            // 遍历旧节点，进行对比
            //  - 完成元素的复用和卸载
            for (i = oldStartIndex; i <= oldIndexEnd; i++) {
                const prevChild = oldChildren[i]
                if (patched >= toBePatched) {
                    // 如果更新的次数大于等于需要更新的节点数量，则说明剩下的节点都是需要卸载的
                    unmount(prevChild)
                    continue // 不使用 break，因为可能还有剩余的节点需要卸载
                }

                // 使用旧节点的key去map中招找新节点，如果找到就表示这个节点需要更新
                let newIndex = keyToNewIndexMap.get(prevChild.key)
                if (newIndex === undefined) {
                    // 如果没找到，则说明这个节点需要卸载
                    unmount(prevChild)
                } else {
                    // old: a b (c d)
                    // new: b a (c d)
                    // 比如这个例子，(old a)的index是 0，(new a)的index是 1，(old b)的index是 1，(new b)的index是 0
                    // 那么经过 a 的循环之后 maxNewIndexSoFar 的值就是 1，当 b 的循环开始时，newIndex 的值是 0，小于 maxNewIndexSoFar，所以表示 b 需要触发移动
                    // 如果从前先后遍历时发现当前最新的 newIndex 小于上一次记录的 maxNewIndexSoFar，则说明需要移动
                    if (newIndex >= maxNewIndexSoFar) {
                        maxNewIndexSoFar = newIndex
                    } else {
                        // 相对位置发生了变化，需要移动
                        moved = true
                    }

                    // 如果找到了，则说明这个节点需要复用
                    // 新节点的相对下标 = newIndex - newStartIndex
                    newIndexToOldIndexMap[newIndex - newStartIndex] = i + 1

                    patch(prevChild, newChildren[newIndex], container, null)
                    patched++
                }
            }

            // 获取最长递增子序列的索引-(这里的索引是新数组里面的相对下标)
            const increasingNewIndexSequence = moved
                ? getSequence(newIndexToOldIndexMap)
                : EMPTY_ARR

            // 如果 increasingNewIndexSequence 返回一个空数组，长度为0，则说明不存在最长递增子序列，所有的节点都是需要移动的
            let lastSequenceIndex = increasingNewIndexSequence.length - 1
            // 遍历新节点
            //  - 完成新增和移动
            //  - 这里使用 toBePatched 利用的是相对位置
            for (i = toBePatched - 1; i >= 0; i--) {
                // 起始位置 + i = 新节点的索引
                const nextChildIndex = newStartIndex + i
                const nextChild = newChildren[nextChildIndex]
                // 1. 获取新节点的下一个节点
                const nextPos = nextChildIndex + 1
                // 2. 获取新节点的下一个节点的锚点，如果不存在，则使用默认加入到容器末尾(锚点为null即可 parentAnchor = null)
                const anchor =
                    nextPos < newChildren.length
                        ? newChildren[nextPos].el
                        : parentAnchor

                // 判断节点是否需要进行 mount
                // - 如果 newIndexToOldIndexMap[i] === 0，则说明这个节点是新增的
                if (newIndexToOldIndexMap[i] === 0) {
                    patch(null, nextChild, container, anchor)
                } else if (moved) {
                    // 可能需要 move
                    // 如果 lastSequenceIndex < 0，则说明不存在最长递增子序列，所有的节点都是需要移动的
                    // 如果 i 不等于 increasingNewIndexSequence[lastSequenceIndex]，则说明这个节点需要移动，i 是相对索引， increasingNewIndexSequence[lastSequenceIndex] 返回的也是一个相对索引
                    // 如果 i 等于 increasingNewIndexSequence[lastSequenceIndex]，则说明这个节点不需要移动，因为它是最长递增子序列的一部分
                    if (
                        lastSequenceIndex < 0 ||
                        i !== increasingNewIndexSequence[lastSequenceIndex]
                    ) {
                        move(nextChild, container, anchor)
                    } else {
                        lastSequenceIndex--
                    }
                }
            }
        }
    }

    /**
     *
     * @param oldVNode 旧的 vnode
     * @param newVNode 新的 vnode
     */
    function updateElement(oldVNode: VNode, newVNode: VNode) {
        // 将 dom 也保存到新的 vnode 中，方便后续对比
        const el = (newVNode.el = oldVNode.el)

        const oldProps = oldVNode.props || EMPTY_OBJ
        const newProps = newVNode.props || EMPTY_OBJ

        patchChildren(oldVNode, newVNode, el, null)

        patchProps(el, newVNode, oldProps, newProps)
    }

    /**
     * 处理Text
     */
    function processText(
        oldVNode: VNode | null,
        newVNode: VNode,
        container: CustomElement,
        anchor?: any
    ) {
        // 旧节点不存在则直接挂载
        if (oldVNode === null) {
            mountTextNode(newVNode, container, anchor)
        } else {
            updateTextNode(oldVNode, newVNode)
        }
    }

    /**
     * 处理Comment
     */
    function processComment(
        oldVNode: VNode | null,
        newVNode: VNode,
        container: CustomElement,
        anchor?: any
    ) {
        // 旧节点不存在则直接挂载
        if (oldVNode === null) {
            mountCommentNode(newVNode, container, anchor)
        } else {
            updateCommentNode(oldVNode, newVNode)
        }
    }

    /**
     * 处理 Fragment
     */
    function processFragment(
        oldVNode: VNode | null,
        newVNode: VNode,
        container: CustomElement,
        anchor?: any
    ) {
        // 旧节点不存在则直接挂载
        if (oldVNode === null) {
            mountChildren(newVNode.children, container, anchor)
        } else {
            patchChildren(oldVNode, newVNode, container, anchor)
        }
    }

    /**
     * 处理元素
     */
    function processElement(
        oldVNode: VNode | null,
        newVNode: VNode,
        container: CustomElement,
        anchor?: any
    ) {
        if (oldVNode === null) {
            // 如果 oldVNode 为 null，则表示需要执行挂载操作
            mountElement(newVNode, container, anchor)
        } else {
            // 如果 oldVNode 不为 null，则表示需要执行更新操作
            updateElement(oldVNode, newVNode)
        }
    }

    /**
     * 处理组件
     */
    function processComponent(
        oldVNode: VNode | null,
        newVNode: VNode,
        container: CustomElement,
        anchor?: any
    ) {
        if (oldVNode === null) {
            // 如果 oldVNode 为 null，则表示需要执行挂载操作
            mountComponent(newVNode, container, anchor)
        } else {
            updateComponent(oldVNode, newVNode)
        }
    }

    /**
     * 打补丁
     * @param oldVNode 旧的 vnode
     * @param newVNode 新的 vnode
     * @param container 容器
     * @param anchor 锚点
     */
    function patch(
        oldVNode: VNode | null,
        newVNode: VNode,
        container: CustomElement,
        anchor?: any
    ) {
        if (oldVNode === newVNode) return

        // 若旧节点存在，且两个节点类型不一致，则卸载旧节点，在挂载新节点
        //  - 如果是组件，每次都是不同的组件对象，type 就是 render，所以类型一定不一致
        if (oldVNode && !isSameVNodeType(oldVNode, newVNode)) {
            unmount(oldVNode)
            // 卸载后将 oldVNode 设置为 null，后续就会执行挂载操作
            oldVNode = null
        }

        // 根据 type 来判断如何处理
        const { type, shapeFlag } = newVNode

        switch (type) {
            case Text:
                processText(oldVNode, newVNode, container, anchor)
                break
            case Comment:
                processComment(oldVNode, newVNode, container, anchor)
                break
            case Fragment:
                processFragment(oldVNode, newVNode, container, anchor)
                break
            default:
                // 如果都不是，则分为元素和组件来处理
                if (shapeFlag & ShapeFlags.ELEMENT) {
                    processElement(oldVNode, newVNode, container, anchor)
                } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
                    processComponent(oldVNode, newVNode, container, anchor)
                }
        }
    }

    /**
     * 将vnode渲染到容器中
     * @param vnode vnode
     * @param container 挂载的容器
     */
    function render(vnode: VNode, container: CustomElement) {
        // 如果 vnode 为 null，则表示需要执行卸载操作
        if (vnode == null) {
            // 卸载容器里面的元素
            if (container._vnode) {
                unmount(container._vnode)
            }
        } else {
            // 如果不为 null，则进行 patch 操作
            //  - 实际比对的是一个根节点下面的所有vnode
            patch(container._vnode || null, vnode, container)
        }
        // 将本次的 vnode 作为下一次对比时旧的 vnode
        container._vnode = vnode
    }

    return {
        render
    }
}

/**
 * 获取最长递增子序列的值的索引
 * @description 传入的是 vnode，返回的需要是 vnode 的索引
 */
function getSequence(arr: any[]): number[] {
    // * arr [1, 8, 5, 3, 4, 9, 7, 6]

    // 备份一次，作为前驱索引(predecessor)
    const p = arr.slice(0)
    // 返回的是路径，即下标
    const result = [0] // 存储的也是下标，即新节点的相对下标
    const len = arr.length

    let start, end, middle

    for (let i = 0; i < len; i++) {
        const arrItem = arr[i]
        // 若值为 0 表示是新增的，无需移动，这里不需要考虑
        if (arrItem !== 0) {
            // 获取当前 result 的最后一个元素
            const lastIndex = result[result.length - 1]
            // 1
            // 1 8
            // 1 8 10
            // 这个 lastIndex 记录的就是上一次 arr 中追加的递增值的索引，所以通过索引来获取真实的值，然后与当前值进行比较
            // 如果当前这个值比上一次的值大，则追加到 result 中，表示递增
            // 判断当前元素是否能继续递增
            if (arr[lastIndex] < arrItem) {
                // 记住递增前一位的索引，这里在 push 前记录，即无需进行索引 -1 的操作
                p[i] = lastIndex
                // 这里要追加的是索引
                result.push(i)
                continue
            }

            start = 0
            end = result.length - 1

            // 利用二分查找，找到比当前值大的那个值，然后替换掉-这样效率比较高一点
            //  - 二分不能越界，因此 start 要小于 end
            // * 由于 result 里面存储的索引都是递增的，因此只要不满足 start < end 这个条件，就可以找到比 arrItem 大的最小元素的位置
            while (start < end) {
                // 获取中间值-利用右移运算符，将结果向右移动一位，相当于将结果除以 2 并取整
                middle = (start + end) >> 1
                // 通过这个索引获取到对应的值，来与 arrItem 进行比较，进行查找范围的缩小
                // 如果小于当前值，表示目标元素在 middle 的右边，因此将 start 移动到 middle + 1
                if (arr[result[middle]] < arrItem) {
                    start = middle + 1
                }
                // 如果大于当前值，表示目标元素在 middle 的左边，因此将 end 移动到 middle
                else {
                    end = middle
                }
            }

            // 前面已经将 start 赋值为比当前 arrItem 大的索引值，最后将 result 中的值替换掉即可
            if (arr[result[start]] > arrItem) {
                // 如果 start = 0 则没有记录的必要
                if (start > 0) {
                    // 记录前一位递增数的索引
                    p[i] = result[start - 1]
                }
                result[start] = i
            }
        }
    }

    // 最后根据 p 记录的索引进行纠正，保证返回的递增序列是正确的
    let tLen = result.length
    let last = result[tLen - 1]
    // 进行倒叙，因为 p 记录的是前驱索引
    while (tLen-- > 0) {
        // 获取前驱索引
        result[tLen] = last
        // 获取前驱索引对应的值
        // result[tLen] = arr[last]
        last = p[last]
    }

    return result
}

/**
 * 获取最长递增子序列的值
 */
function getSequenceValue(arr: number[]): number[] {
    if (arr.length === 0) return []
    if (arr.length === 1) return arr

    // 初始化一个二维数组，arr 第一项作为最初始的比对项
    const resultList = [[arr[0]]]

    function _update(item: number) {
        for (let i = resultList.length - 1; i >= 0; i--) {
            const result = resultList[i] // 当前的递增子序列
            const lastItem = result[result.length - 1] // 当前递增子序列的最后一个元素

            // 如果 item 大于递增子序列的最后一个元素，则将 item 与 result 合并，并加入到 resultList 中下一项
            if (item > lastItem) {
                // 这里不使用 push，是因为需要逐步更新 resultList
                resultList[i + 1] = [...result, item]
                return
            }
        }
        resultList[0] = [item]
    }

    for (let i = 0; i < arr.length; i++) {
        const item = arr[i]
        _update(item)
    }

    // 返回这个二维数组的最后一个数组，即最长递增子序
    return resultList[resultList.length - 1]
}
