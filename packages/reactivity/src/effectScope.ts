import { type ReactiveEffect } from './effect'

export let activeEffectScope: EffectScope | null = null

class EffectScope {
    active: boolean = true
    // 另一种解决嵌套的方法，定义一个 parent 属性，保存父级 effectScope
    parent: any = null
    effects: ReactiveEffect[] = []
    scopes: EffectScope[] = [] // 保存嵌套的 effectScope，即收集子级的 effectScope
    constructor(public detached = false) {
        // 直接把当前 activeEffectScope 赋值给 parent
        //  - 要在 run 方法中 activeEffectScope = this 这句代码之前
        //  - 这样如果 activeEffectScope 为 null，则表示目前使用的 effectScope 是最外层的
        //  - 而如果 activeEffectScope 不为 null(即是父级的 activeEffectScope)，则表示目前使用的 effectScope 是嵌套的，记录下父级
        this.parent = activeEffectScope

        // detached 为 false 表示不独立，需要收集子级的 effectScope
        //  - 即外层收集内层，此时还没有调用 run 方法，所以 activeEffectScope 为父级
        if (!detached && activeEffectScope) {
            activeEffectScope.scopes.push(this)
        }
    }

    run(fn: Function) {
        if (!this.active) return fn()

        if (this.active) {
            activeEffectScope = this
            try {
                // run 的返回值就是 fn 的返回值
                return fn()
            } finally {
                // 这样嵌套的 子activeEffectScope 执行完毕后，把 activeEffectScope 恢复成父级
                // 父级继续执行也不影响后续的正常工作
                activeEffectScope = this.parent
            }
        }
    }

    stop() {
        if (this.active) {
            for (let i = 0; i < this.effects.length; i++) {
                this.effects[i].stop()
            }
            for (let i = 0; i < this.scopes.length; i++) {
                this.scopes[i].stop()
            }
            this.active = false
        }
    }
}

export function recordEffectScope(effect: ReactiveEffect) {
    if (activeEffectScope && activeEffectScope.active) {
        activeEffectScope.effects.push(effect)
    }
}

export function effectScope(detached: boolean) {
    return new EffectScope(detached)
}
