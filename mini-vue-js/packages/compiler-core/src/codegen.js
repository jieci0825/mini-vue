import { NodeTypes } from './ast'

function createCodegenContext(ast) {
  const context = {
    // 存储最终生成的渲染函数代码
    code: '',
    // 在生成代码时，通过调用 push 函数完成代码的拼接
    push(code) {
      context.code += code
    },
    // 当前缩进的级别，初始值为 0，即没有缩进
    indentLevel: 0,
    // 该函数用来换行，即在代码字符串的后面追加 \n 字符，
    // 另外，换行时应该保留缩进，所以我们还要追加 currentIndent * 2 个空格字符
    newline() {
      context.code += '\n' + `  `.repeat(context.indentLevel)
    },
    // 用来缩进，即让 currentIndent 自增后，调用换行函数
    indent() {
      context.indentLevel++
      context.newline()
    },
    // 取消缩进，即让 currentIndent 自减后，调用换行函数
    deIndent() {
      context.indentLevel--
      context.newline()
    }
  }

  return context
}

export function generate(ast) {
  const context = createCodegenContext(ast)

  // 调用 genNode 函数完成代码生成的工作
  genNode(ast, context)

  // 返回渲染函数代码
  return context.code
}

function genNode(node, context) {
  switch (node.type) {
    case NodeTypes.FUNCTION_DECL:
      genFunctionDecl(node, context)
      break
    case NodeTypes.RETURN_STATEMENT:
      genReturnStatement(node, context)
      break
    case NodeTypes.STRING_LITERAL:
      genStringLiteral(node, context)
      break
    case NodeTypes.ARRAY_EXPRESSION:
      genArrayExpression(node, context)
      break
    case NodeTypes.CALL_EXPRESSION:
      genCallExpression(node, context)
      break
  }
}

function genCallExpression(node, context) {
  const { push } = context
  // 取得被调用函数名称和参数列表
  const { callee, args } = node
  // 生成函数调用代码
  push(`${callee.name}(`)
  // 调用 genNodeList 生成参数代码
  genNodeList(args, context)
  // 补全右括号
  push(`)`)
}

function genFunctionDecl(node, context) {
  const { push, indent, deIndent } = context
  // node.id 是一个标识符，用来描述函数的名称，即 node.id.name
  push(`function ${node.id.name} `)
  push(`(`)

  // 调用 genNodeList 为函数的参数生成代码
  genNodeList(node.params, context)
  // 参数生成完毕后，添加一个右括号
  push(`) `)
  // 函数体开始
  push(`{`)
  // 缩进
  indent()
  // 为函数体生成代码，这里递归地调用了 genNode 函数
  node.body.forEach(node => {
    genNode(node, context)
  })
  // 取消缩进
  deIndent()
  // 函数体结束
  push(`}`)
}

function genArrayExpression(node, context) {
  const { push } = context
  // 追加方括号
  push('[')
  genNodeList(node.elements, context)
  // 补全方括号
  push(']')
}

function genReturnStatement(node, context) {
  const { push } = context
  // 追加 return 关键字
  push('return ')
  // 为返回值生成代码，这里递归地调用了 genNode 函数
  genNode(node.return, context)
}

function genStringLiteral(node, context) {
  const { push } = context
  // 对于字符串字面量，只需要追加与 node.value 对应的字符串即可
  push(`'${node.value}'`)
}

function genNodeList(nodes, context) {
  const { push } = context
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    genNode(node, context)
    // 添加参数分隔符
    if (i < nodes.length - 1) {
      push(', ')
    }
  }
}
