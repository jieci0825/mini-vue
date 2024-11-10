import { extend } from '@vue/shared'
import { baseParse } from './parse'
import { transform } from './transform'
import { transformElement } from './transforms/transformElement'
import { transformText } from './transforms/transformText'
import { generate } from './codegen'
import { transformIf } from './transforms/vIf'

export function baseCompile(template: string, options = {}) {
    const ast = baseParse(template)
    console.log('ast:', ast)
    // transform(
    //     ast,
    //     extend(options, {
    //         nodeTransforms: [transformElement, transformText, transformIf]
    //     })
    // )
    // return generate(ast)
    return ast
}
