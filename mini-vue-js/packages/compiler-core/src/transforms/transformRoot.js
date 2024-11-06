import { NodeTypes } from '../ast'

export function transformRoot(node) {
  return () => {
    if (node.type !== NodeTypes.ROOT) return

    // node 是根节点，根节点的第一个子节点就是模板的根节点，
    // 当然，这里我们暂时不考虑模板存在多个根节点的情况
    const vnodeJSAST = node.children[0].jsNode
    // 创建 render 函数的声明语句节点，将 vnodeJSAST 作为 render 函数体的返回语句
    node.jsNode = {
      type: NodeTypes.FUNCTION_DECL,
      id: { type: NodeTypes.IDENTIFIER, name: 'render' },
      params: [],
      body: [
        {
          type: NodeTypes.RETURN_STATEMENT,
          return: vnodeJSAST
        }
      ]
    }
  }
}
