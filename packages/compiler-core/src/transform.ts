import { Fragment } from '@vue/runtime-core'
import {
    type RootNode,
    createVNodeCall,
    NodeTypes,
    ParentNode,
    TemplateChildNode
} from './ast'
import {
    CREATE_ELEMENT_BLOCK,
    CREATE_ELEMENT_VNODE,
    FRAGMENT,
    OPEN_BLOCK,
    TO_DISPLAY_STRING
} from './runtimeHelpers'

export interface TransformContext {
    root: RootNode
    nodeTransforms: Array<Function>
    parent: ParentNode | null
    childIndex: number
    currentNode: RootNode | TemplateChildNode | null // 当前处理的节点
    helpers: Map<symbol, number>
    helper<T extends symbol>(name: T): T
    replaceNode(node): void // 替换当前的处理节点
    removeHelper(name: symbol): void
}

// 创建转化上下文
function createTransformContext(
    root: RootNode,
    { nodeTransforms = [] }
): TransformContext {
    const context = {
        root,
        nodeTransforms,
        parent: null,
        childIndex: 0,
        currentNode: root, // 当前处理的节点
        helpers: new Map(), // 优化，收集调用的次数，超过20个相同节点会被字符串化
        helper(name) {
            // 这里会收集调用的次数
            // 收集次数是为了给删除做处理的， （当只有 count 为0 的时候才需要真的删除掉）
            // helpers 数据会在后续生成代码的时候用到
            const count = context.helpers.get(name) || 0
            context.helpers.set(name, count + 1)
            return name
        },
        replaceNode(node) {
            context.currentNode = node
            if (context.parent) {
                ;(context.parent as any).children[context.childIndex] = node
            }
        },
        removeHelper(name) {
            const count = context.helpers.get(name)
            if (count) {
                const currentCount = count - 1
                if (!currentCount) {
                    context.helpers.delete(name)
                } else {
                    context.helpers.set(name, currentCount)
                }
            }
        }
    }
    return context
}

export function transform(root: RootNode, options) {
    // 创建上下文
    const context = createTransformContext(root, options)

    traverse(root, context)

    createRootCodegenNode(root, context)
}

function traverse(node, context: TransformContext) {
    context.currentNode = node

    const exitFns: Function[] = []
    const transforms = context.nodeTransforms
    for (let i = 0; i < transforms.length; i++) {
        const onExit = transforms[i](node, context)
        if (onExit) {
            exitFns.push(onExit)
        }

        // 当前节点如果被删掉，则不需要继续处理
        if (!context.currentNode) return
    }

    switch (node.type) {
        case NodeTypes.INTERPOLATION:
            context.helper(TO_DISPLAY_STRING)
            break
        case NodeTypes.ELEMENT:
        case NodeTypes.ROOT:
            // 遍历子节点
            for (let i = 0; i < node.children.length; i++) {
                // 设置父元素
                context.parent = node
                // 递归遍历孩子
                const child = node.children[i]
                traverse(child, context)
            }
            break
    }

    // 由于上面 switch 语句中，可能对节点进行了替换，所以这里需要重新获取
    //  - 利用闭包存住的 node 重新正确的更新当前处理的节点
    context.currentNode = node
    // 执行退出函数
    //  - 倒叙执行
    //  - 因为转化的时候 [ transformElement, transformText, transformExpression ]
    //  - 先转化的元素然后才是文本，所以退出的时候需要先退出文本，再退出元素
    let i = exitFns.length
    while (i--) {
        exitFns[i]()
    }
}

function createRootCodegenNode(root: RootNode, context: TransformContext) {
    const { children } = root
    if (children.length === 1) {
        const child = children[0]
        if (child.type === NodeTypes.ELEMENT) {
            // 如果是单元素根节点，则直接返回该元素的 codegenNode
            root.codegenNode = children[0].codegenNode
            // 但是调用的不再是 createElementVNode，而是 openBlock createElementBlock

            // 删除掉 createElementVNode
            context.removeHelper(CREATE_ELEMENT_VNODE)
            // 添加 openBlock createElementBlock
            context.helper(OPEN_BLOCK)
            context.helper(CREATE_ELEMENT_BLOCK)

            // 设置 isBlock 为 true，表示该节点是块节点，并且使用的是 createElementBlock
            root.codegenNode.isBlock = true
        } else {
            // 如果是单文本根节点，则简单处理一下
            root.codegenNode = child.content
        }
    } else {
        // 如果是多个根节点，则添加一个 Fragment
        root.codegenNode = createVNodeCall(
            context,
            context.helper(FRAGMENT),
            [],
            children
        )
        context.helper(OPEN_BLOCK)
        context.helper(CREATE_ELEMENT_BLOCK)
        root.codegenNode.isBlock = true
    }
}
