import { isArray, isString } from '@vue/shared'
import { type RootNode, NodeTypes, ParentNode, TemplateChildNode } from './ast'
import { TO_DISPLAY_STRING } from './runtimeHelpers'
import { isSingleElementRoot } from './transforms/cacheStatic'

export interface TransformContext {
    root: RootNode
    nodeTransforms: Array<Function>
    parent: ParentNode | null
    childIndex: number
    currentNode: RootNode | TemplateChildNode | null // 当前处理的节点
    helpers: Map<symbol, number>
    helper<T extends symbol>(name: T): T
    replaceNode(node): void // 替换当前的处理节点
}

export function transform(root: RootNode, options) {
    // 创建上下文
    const context = createTransformContext(root, options)
    // 遍历AST-转化节点
    traverseNode(root, context)
    createRootCodegen(root)

    root.helpers.push(...context.helpers.keys())
}

export function traverseNode(node, context: TransformContext) {
    // * 节点转化遵循深度优化，子 --> 父

    context.currentNode = node
    const { nodeTransforms } = context
    const exitFns: any = []

    for (let i = 0; i < nodeTransforms.length; i++) {
        // 执行并拿到函数返回的结果
        const onExit = nodeTransforms[i](node, context)
        if (onExit) {
            if (isArray(onExit)) {
                exitFns.push(...onExit)
            } else {
                exitFns.push(onExit)
            }
        }

        if (!context.currentNode) {
            return
        } else {
            node = context.currentNode
        }
    }

    switch (node.type) {
        // 处理元素和根节点
        case NodeTypes.IF_BRANCH:
        case NodeTypes.ELEMENT:
        case NodeTypes.ROOT:
            traverseChildren(node, context)
            break
        // 处理插值语法节点
        case NodeTypes.INTERPOLATION:
            context.helper(TO_DISPLAY_STRING)
            break
        case NodeTypes.IF:
            for (let i = 0; i < node.branches.length; i++) {
                traverseNode(node.branches[i], context)
            }
            break
    }

    // 倒叙执行处理的节点函数，保证子节点先处理
    context.currentNode = node

    let i = exitFns.length
    // 使用 while 是要比 for 快 (可以使用 https://jsbench.me/ 来测试一下)
    while (i--) {
        exitFns[i]()
    }
}

export function traverseChildren(parent: ParentNode, context: TransformContext) {
    parent.children.forEach((node, index) => {
        node.parent = parent // 父节点
        node.childIndex = index // 当前节点索引
        traverseNode(node, context)
    })
}

// 创建转化上下文
function createTransformContext(root: RootNode, { nodeTransforms = [] }): TransformContext {
    const context = {
        root,
        nodeTransforms,
        parent: null,
        childIndex: 0,
        currentNode: root,
        helpers: new Map(),
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
        }
    }
    return context
}

function createRootCodegen(root: RootNode) {
    const { children } = root
    // 处理单个根节点
    if (children.length) {
        const child = children[0]
        // 如果是 element 类型的话 ， 那么我们需要把它的 codegenNode 赋值给 root
        // root 其实是个空的什么数据都没有的节点
        // 所以这里需要额外的处理 codegenNode
        // codegenNode 的目的是专门为了 codegen 准备的  为的就是和 ast 的 node 分离开
        if (isSingleElementRoot(root, child) && child.codegenNode) {
            root.codegenNode = child.codegenNode
        } else {
            root.codegenNode = child
        }
    }

    // todo: 处理多个根节点
}

/**
 * 处理指令
 * @param name 指令名称
 * @param fn 指令的具体处理方法，通常为闭包函数
 * @returns 返回一个闭包函数
 */
export function createStructuralDirectiveTransform(name: string | RegExp, fn: Function) {
    const matches = isString(name) ? (n: string) => n === name : (n: string) => name.test(n)

    return (node, context) => {
        if (node.type === NodeTypes.ELEMENT) {
            const { props } = node
            const exitFns: any[] = []

            for (let i = 0; i < props.length; i++) {
                const prop = props[i]
                // 处理指令-如果是一个指令节点类型且指令名称匹配
                if (prop.type === NodeTypes.DIRECTIVE && matches(prop.name)) {
                    // 从 props 中拿出这个指令，并将其从 props 中删除
                    props.splice(i, 1)
                    i--
                    // fn 会返回具体的指令函数
                    const onExit = fn(node, prop, context)
                    if (onExit) {
                        exitFns.push(onExit)
                    }
                }
            }

            // 返回一个数组，数组中存放的是当前元素上所有指令函数
            return exitFns
        }
    }
}
