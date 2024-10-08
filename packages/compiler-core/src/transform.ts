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
}

export function transform(root: RootNode, options) {
    // 创建上下文
    const context = createTransformContext(root, options)
    // 遍历AST-转化节点
    traverseNode(root, context)
    createRootCodegen(root)

    root.helpers.push(...context.helpers.keys())
}

export function traverseNode(node: RootNode | TemplateChildNode, context: TransformContext) {
    // * 节点转化遵循深度优化，子 --> 父

    context.currentNode = node
    const { nodeTransforms } = context
    const existFn: any = []

    for (let i = 0; i < nodeTransforms.length; i++) {
        // 执行并拿到函数返回的结果
        const onExist = nodeTransforms[i](node, context)
        if (onExist) {
            existFn.push(onExist)
        }
    }

    switch (node.type) {
        // 处理元素和根节点
        case NodeTypes.ELEMENT:
        case NodeTypes.ROOT:
            traverseChildren(node, context)
            break
        // 处理插值语法节点
        case NodeTypes.INTERPOLATION:
            context.helper(TO_DISPLAY_STRING)
            break
    }

    // 倒叙执行处理的节点函数，保证子节点先处理
    context.currentNode = node

    let i = existFn.length
    // 使用 while 是要比 for 快 (可以使用 https://jsbench.me/ 来测试一下)
    while (i--) {
        existFn[i]()
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
