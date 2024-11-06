export const NodeTypes = {
  ROOT: 'ROOT',
  ELEMENT: 'ELEMENT',
  TEXT: 'TEXT',
  SIMPLE_EXPRESSION: 'SIMPLE_EXPRESSION',
  TEXT_CALL: 'TEXT_CALL',
  COMPOUND_EXPRESSION: 'COMPOUND_EXPRESSION',
  IF: 'IF',
  IF_BRANCH: 'IF_BRANCH',
  FOR: 'FOR',
  FUNCTION_DECL: 'FUNCTION_DECL',
  RETURN_STATEMENT: 'RETURN_STATEMENT',
  IDENTIFIER: 'IDENTIFIER',
  INTERPOLATION: 'INTERPOLATION',
  ARRAY_EXPRESSION: 'ARRAY_EXPRESSION',
  STRING_LITERAL: 'STRING_LITERAL',
  CALL_EXPRESSION: 'CALL_EXPRESSION',
  ATTRIBUTE: 'ATTRIBUTE'
}

/**
 * @example 示例：描述一个渲染函数
 * const FunctionDeclNode = {
 *  type: 'FunctionDecl', // 代表该节点是函数声明
 *  函数的名称是一个标识符，标识符本身也是一个节点
 *  id: {
 *    type: 'Identifier',
 *    name: 'render' // name 用来存储标识符的名称
 *  },
 *  params: [], // 参数，目前渲染函数还不需要参数，所以这里是一个空数组
 *  渲染函数的函数体只有一个语句，即 return 语句
 *  body:[
 *    {
 *     type: 'ReturnStatement',
 *     return: null // return 语句的返回值，目前渲染函数没有返回值，所以是 null
 *    }
 *  ]
 */

// 用来创建 StringLiteral 节点
export function createStringLiteral(value) {
  return {
    type: NodeTypes.STRING_LITERAL,
    value
  }
}

export function createIdentifier(name) {
  return {
    type: NodeTypes.IDENTIFIER,
    name
  }
}

export function createArrayExpression(elements) {
  return {
    type: NodeTypes.ARRAY_EXPRESSION,
    elements
  }
}

export function createCallExpression(callee, args) {
  return {
    type: NodeTypes.CALL_EXPRESSION,
    // 描述被调用函数的名字称，它本身是一个标识符节点
    callee: createIdentifier(callee),
    // 被调用函数的形参，多个参数的话用数组来描述
    args
  }
}
