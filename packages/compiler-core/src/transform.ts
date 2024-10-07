import { type RootNode, NodeTypes, ParentNode, TemplateChildNode } from './ast'
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

    root.helpers = [...context.helpers.keys()]
    root.components = []
    root.directives = []
    root.hoists = []
    root.imports = []
    root.temps = []
    root.cached = []
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
        case NodeTypes.ELEMENT:
        case NodeTypes.ROOT:
            traverseChildren(node, context)
            break
    }

    // 倒叙执行处理的节点函数，保证子节点先处理
    context.currentNode = node

    let i = existFn.length - 1
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
        if (isSingleElementRoot(root, child) && child.codegenNode) {
            root.codegenNode = child.codegenNode
        }
    }

    // todo: 处理多个根节点
}
