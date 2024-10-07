import { extend } from '@vue/shared'
import { baseParse } from './parse'
import { transform } from './transform'
import { transformElement } from './transforms/transformElement'
import { transformText } from './transforms/transformText'
import { generate } from './codegen'

export function baseCompile(template: string, options = {}) {
    const ast = baseParse(template)
    transform(
        ast,
        extend(options, {
            nodeTransforms: [transformElement, transformText]
        })
    )
    console.log(ast)
    return generate(ast)
}
