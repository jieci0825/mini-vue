// provide 和 inject 是依赖注入，provide 提供数据，inject 获取数据

import { hasOwn } from '@vue/shared'
import { currentInstance } from './component'

type InjectionKey = symbol | string

export function provide(key: InjectionKey, value: any) {
    // provide 只能在 setup 中使用，因此需要根据当前组件实例是否存在来判断是否执行
    if (!currentInstance) {
        console.warn('provide 只能在 setup 中使用')
        return
    }

    const praentProvides = currentInstance.parent?.provides

    // 拿到当前激活组件实例的 provides，即自己的 provides
    let myProvides = currentInstance.provides

    if (praentProvides === myProvides) {
        // 自己的 provides 不能和父组件的 provides 是同一个引用，否则会导致子组件提供的 provide 数据，父组件也能访问到
        // 因此需要断开同一个引用对象的关系，也要实现且子组件也会有父组件 provides 中的值
        //  - 通过 Object.create 创建一个新对象，新对象的 __proto__ 指向父组件的 provides 即可
        //  - 为什么还会有呢？本质就是通过原型链的关系往上查找
        // https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/create
        myProvides = currentInstance.provides = Object.create(myProvides)
    }

    // 将 key 和 value 存入 provides 中
    //  - 无需考虑父组件的 key 为 aaa，子组件 key 也为 aaa，且值都是对象时，子组件是否需要合并父组件的 provide 数据
    myProvides[key] = value

    // 而如果没有调用 provide 进行数据覆盖，则子组件会直接使用父组件的 provide 数据，这样孙子组件也能访问到
}

export function inject(key: InjectionKey, defaultValue: any) {
    if (!currentInstance) {
        console.warn('inject 只能在 setup 中使用')
        return
    }

    // 这里不使用的自己的 provides，而是使用父组件的 provides
    // 因为如果父组件中通过 provide 注入的响应数据发生变化之后，子组件需要重新获取最新的数据
    const provides = currentInstance.parent?.provides

    if (provides && key in provides) {
        return provides[key]
    } else {
        return defaultValue
    }
}
