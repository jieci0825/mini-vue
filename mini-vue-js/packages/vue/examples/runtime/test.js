function mountComponent(vnode, container, anchor) {
  // 省略

  effect(
    () => {
      const subTree = render.call(renderContext, renderContext)
      if (instance.isMounted) {
        // 省略
      } else {
        beforeMount && beforeMount.call(renderContext)

        patch(null, subTree, container, anchor)
        instance.isMounted = true

        mounted && mounted.call(renderContext)

        // 调用
        instance.mounted &&
          instance.mounted.forEach(hook => hook.call(renderContext))
      }

      instance.subTree = subTree
    },
    {
      scheduler: ect => {
        queuePreFlushCbs(ect.fn)
      }
    }
  )
}
