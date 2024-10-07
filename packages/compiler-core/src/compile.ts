import { extend } from '@vue/shared'
import { baseParse } from './parse'
import { transform } from './transform'
import { transformElement } from './transforms/transformElement'
import { transformText } from './transforms/transformText'
import { generate } from './codegen'

export function baseCompile(template: string, options = {}) {
    const ast = baseParse(template)
    console.log('输出 ast', JSON.stringify(ast, null, 2))
    transform(
        ast,
        extend(options, {
            nodeTransforms: [transformElement, transformText]
        })
    )
    return generate(ast)
}
