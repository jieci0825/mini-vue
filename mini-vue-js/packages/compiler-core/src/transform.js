import { isArray } from '@vue/shared'

export function transform(root, options) {
  const context = createTransformContext(root, options)
  traverseNode(root, context)
}

function createTransformContext(root, { nodeTransforms = [] }) {
  const context = {
    // 根节点
    root,
    // 处理节点转换的函数
    nodeTransforms,
    // 存储当前正在转换的节点
    currentNode: null,
    // 存储当前节点在父节点的 children 中的位置索引
    childIndex: 0,
    // 存储当前转换节点的父节点
    parent: null,
    // 替换节点的函数，接收新节点作为参数
    replaceNode(node) {
      // 为了替换节点，我们需要修改 AST
      // 找到当前节点在父节点的 children 中的位置：context.childIndex
      // 然后使用新节点替换即可
      context.parent.children[context.childIndex] = node
      // 由于当前节点已经被新节点替换掉了，因此我们需要将 currentNode 更新为新节点
      context.currentNode = node
    },
    // 用于删除当前节点
    removeNode() {
      if (context.parent) {
        // 调用数组的 splice 方法，根据当前节点的索引删除当前节点
        context.parent.children.splice(context.childIndex, 1)
        // 将 context.currentNode 置空
        context.currentNode = null
      }
    }
  }
  return context
}

function traverseNode(node, context) {
  // 设置当前转换的节点信息 context.currentNode
  context.currentNode = node

  // 增加退出阶段的回调函数数组
  const exitFns = []

  // context.nodeTransforms 是一个数组，其中每一个元素都是一个函数
  const transforms = context.nodeTransforms
  for (let i = 0; i < transforms.length; i++) {
    // 转换函数可以返回另外一个函数，该函数即作为退出阶段的回调函数
    const onExit = transforms[i](context.currentNode, context)
    if (onExit) {
      // 将退出阶段的回调函数添加到 exitFns 数组中
      exitFns.push(onExit)
    }
    // 由于任何转换函数都可能移除当前节点，因此每个转换函数执行完毕后，都应该检查当前节点是否已经被移除，如果被移除了，直接返回即可
    if (!context.currentNode) return
  }

  // 如果有子节点，则递归地调用 traverseNode 函数进行遍历
  const children = context.currentNode.children
  if (isArray(children)) {
    for (let i = 0; i < children.length; i++) {
      // 递归地调用 traverseNode 转换子节点之前，将当前节点设置为父节点
      context.parent = context.currentNode
      // 设置当前节点在父节点的 children 中的位置索引
      context.childIndex = i
      // 递归地调用 traverseNode 转换子节点，并将 context 进行透传
      traverseNode(children[i], context)
    }
  }

  // 在节点处理的最后阶段执行缓存到 exitFns 中的回调函数
  // 注意，这里我们要反序执行
  let i = exitFns.length
  while (i--) {
    exitFns[i]()
  }
}
