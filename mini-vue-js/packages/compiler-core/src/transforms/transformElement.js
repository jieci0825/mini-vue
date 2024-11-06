import {
  createArrayExpression,
  createCallExpression,
  createStringLiteral,
  NodeTypes
} from '../ast'

export function transformElement(node, context) {
  // 将转换代码编写在退出阶段的回调函数中，这样可以保证该标签节点的子节点全部被处理完毕
  return function postTransformElement() {
    if (node.type !== NodeTypes.ELEMENT) return

    // 1. 创建 h 函数调用语句,
    // h 函数调用的第一个参数是标签名称，因此我们以 node.tag 来创建一个字符串字面量节点，作为第一个参数
    const callExp = createCallExpression('h', [createStringLiteral(node.tag)])

    // 2. 处理 h 函数调用的参数
    if (node.children.length === 1) {
      // 如果当前标签节点只有一个子节点，则直接使用子节点的 jsNode 作为参数
      //  - 这里会优先处理完成子节点的转换，因此子节点的 jsNode 属性已经存在
      callExp.args.push(node.children[0].jsNode)
    } else {
      // 如果当前标签节点有多个子节点，则创建一个 ArrayExpression 节点作为参数
      callExp.args.push(createArrayExpression(node.children.map(c => c.jsNode)))
    }

    // 3. 将当前标签节点对应的 JavaScript AST 添加到 jsNode 属性下
    node.jsNode = callExp
  }
}
