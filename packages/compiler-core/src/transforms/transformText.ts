import { PatchFlags } from 'packages/shared/src/patchFlags'
import { createCallExpression, NodeTypes } from '../ast'
import { TransformContext } from '../transform'
import { CREATE_TEXT_VNODE } from '../runtimeHelpers'

export function transformText(node, context: TransformContext) {
    // 利用后置函数来实现先处理子级在处理父级
    if (
        node.type === NodeTypes.ROOT ||
        node.type === NodeTypes.ELEMENT ||
        node.type === NodeTypes.FOR ||
        node.type === NodeTypes.IF_BRANCH
    ) {
        return () => {
            const children = node.children

            let currentContainer: any = null
            let hasText = false
            for (let i = 0; i < children.length; i++) {
                const child = children[i]
                if (isText(child)) {
                    hasText = true
                    // 如果当前节点是文本节点，则继续看下一个节点是不是文本节点
                    for (let j = i + 1; j < children.length; j++) {
                        const next = children[j]
                        // 检测是否是文本节点
                        if (isText(next)) {
                            // 没有容器则创建容器
                            if (!currentContainer) {
                                // 此时就要以本次拼接开始的第一个节点为基础，将后面这些能拼接的节点加入进去
                                currentContainer = children[i] = {
                                    type: NodeTypes.COMPOUND_EXPRESSION,
                                    children: [child]
                                }
                            }

                            // 将当前 next 加入容器，需要拼接 + 号
                            currentContainer.children.push(' + ', next)
                            // 将 next 从 children 中移除
                            children.splice(j, 1)
                            // 更新索引
                            j--
                        } else {
                            currentContainer = null
                            break
                        }
                    }
                }
            }

            // 经过上面的复合节点处理之后，如果 children 只有一个文本节点的话，那么就需要进行后续的优化处理
            if (!hasText || children.length === 1) {
                return
            }

            //  需要给多个儿子中的创建文本节点添加 patchFlag
            for (let i = 0; i < children.length; i++) {
                const child = children[i]

                const callArgs: any[] = []

                const type = child.type
                if (isText(child) || type === NodeTypes.COMPOUND_EXPRESSION) {
                    callArgs.push(child)
                    if (type !== NodeTypes.TEXT) {
                        // 动态节点
                        callArgs.push(`${PatchFlags.TEXT}`) // 靶向更新
                    }
                    children[i] = {
                        type: NodeTypes.TEXT_CALL, // 表示需要通过 createTextVNode 创建文本节点
                        content: child,
                        codegenNode: createCallExpression(context, callArgs)
                    }
                }
            }
        }
    }
}

function isText(node) {
    return node.type === NodeTypes.TEXT || node.type === NodeTypes.INTERPOLATION
}
