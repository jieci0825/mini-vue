import { createStringLiteral, NodeTypes } from '../ast'

export function transformText(node, context) {
  if (node.type !== NodeTypes.TEXT) return
  // 文本节点对应的 JavaScript AST 节点其实就是一个字符串字面量,
  // 因此只需要使用 node.content 创建一个 StringLiteral 类型的节点即可
  // 最后将文本节点对应的 JavaScript AST 节点添加到 node.jsNode 属性下
  node.jsNode = createStringLiteral(node.content)
}
