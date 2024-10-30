function patchChildren(n1, n2, container) {
  if (isString(n2.children)) {
    // 省略
  } else if (isArray(n2.children)) {
    if (isArray(n1.children)) {
      const oldChildren = n1.children
      const newChildren = n2.children
      if (newChildren[0].key) {
        patchKeyedChildren(oldChildren, newChildren, container)
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

function patchKeyedChildren(c1, c2, container) {
  // 省略

  while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
    // 省略
  }

  // 循环结束之后检查索引值的情况
  if (oldEndIdx < oldStartIdx && newStartIdx <= newEndIdx) {
    // 挂载-省略
  } else if (newEndIdx < newStartIdx && oldStartIdx <= oldEndIdx) {
    // newEndIdx 小于 newStartIdx，表示新节点遍历完了
    // 且如果此时 oldStartIdx 小于或等于 oldEndIdx，表示还有旧节点没有处理，需要进行卸载
    // 可能存在多个，所以要使用 for 循环来处理
    for (let i = oldStartIdx; i <= oldEndIdx; i++) {
      unmount(c1[i])
    }
  }
}
