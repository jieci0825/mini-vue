import { extend } from '@vue/shared'
import { baseParse } from './parse'
import { transform } from './transform'
import { transformElement } from './transforms/transformElement'
import { transformText } from './transforms/transformText'

export function baseCompile(template: string, options = {}) {
    const ast = baseParse(template)
    transform(
        ast,
        extend(options, {
            nodeTransforms: [transformElement, transformText]
        })
    )
    // console.log('输出 ast', JSON.stringify(ast, null, 2))
    console.log(ast)
    return {}
}
