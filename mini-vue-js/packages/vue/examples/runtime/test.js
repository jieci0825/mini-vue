function patchChildren(n1, n2, container) {
  if (isString(n2.children)) {
    // 省略
  } else if (isArray(n2.children)) {
    if (isArray(n1.children)) {
      const oldChildren = n1.children
      const newChildren = n2.children
      if (newChildren[0].key) {
        // 存储寻找过程中遇到的最大索引值
        let lastIndex = 0
        for (let i = 0; i < newChildren.length; i++) {
          // 省略
        }
        // 上一步更新操作完成之后
        // 卸载多余的节点
        for (let i = 0; i < oldChildren.length; i++) {
          const oldChild = oldChildren[i]
          // 如果旧节点在 newVhildren 中不存在，则卸载
          const has = newChildren.find(n => n.key === oldChild.key)
          if (!has) {
            unmount(oldChild)
          }
        }
      } else {
        patchUnkeyedChildren(oldChildren, newChildren, container)
      }
    } else {
      // 省略
    }
  } else {
    // 省略
  }
}
