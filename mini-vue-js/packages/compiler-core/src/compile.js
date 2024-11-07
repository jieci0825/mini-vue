import { extend } from '@vue/shared'
import { baseParse } from './parse'
import { transform } from './transform'
import { transformElement } from './transforms/transformElement'
import { transformText } from './transforms/transformText'
import { transformRoot } from './transforms/transformRoot'
import { generate } from './codegen'

export function baseCompile(template, options = {}) {
  // 模板 AST
  const ast = baseParse(template)
  // 将模板 AST 转换为 JavaScript AST
  transform(
    ast,
    extend(options, {
      // todo 待补充插值、注释、指令等的转换
      nodeTransforms: [transformElement, transformText, transformRoot]
    })
  )
  // 代码生成
  const code = generate(ast.jsNode)
  return code
}
