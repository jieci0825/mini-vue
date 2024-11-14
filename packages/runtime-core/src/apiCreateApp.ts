import { isString } from '@vue/shared'
import { createVNode } from './vnode'

export function createAppAPI(render): any {
    return function createApp(rootComponent, rootProps = null) {
        // 创建 app 实例
        const app = {
            _component: rootComponent,
            _container: null,
            mount(rootContainer) {
                const vnode = createVNode(rootComponent, rootProps, null)
                render(vnode, rootContainer)
            }
        }

        return app
    }
}
