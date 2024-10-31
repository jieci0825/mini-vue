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

  if (j > oldEnd && j <= newEnd) {
    // 省略
  } else if (oldEnd >= j && j > newEnd) {
    // 省略
  } else {
    // 省略

    for (let i = oldStart; i <= oldEnd; i++) {
      // 省略
    }

    if (moved) {
      const seq = lis(source)

      // s 指向最长递增子序列的最后一个元素的索引
      let s = seq.length - 1
      // i 指向新的一组子节点的最后一个节点的索引
      let i = count - 1
      // 从后向前遍历，依次处理需要移动的节点
      for (i; i >= 0; i--) {
        if (i !== seq[s]) {
          // 如果节点的索引 i 不等于最长递增子序列的最后一个元素的索引 s
          // 则说明该节点需要移动
        } else {
          // 如果节点的索引 i 等于最长递增子序列的最后一个元素的索引 s
          // 则说明该节点不需要移动，更新 s 的值
          s--
        }
      }
    }
  }
}

if (moved) {
  const seq = lis(source)
  let s = seq.length - 1
  let i = count - 1
  for (i; i >= 0; i--) {
    if (source[i] === -1) {
      // 省略
    } else if (i !== seq[s]) {
      // 获取这个节点在 newChildren 中的位置索引
      const pos = i + newStart
      const newVNode = c2[pos]
      // 这个节点的下一个节点位置索引
      const nextPos = pos + 1
      // 获取锚点元素
      const anchor = nextPos < c2.length ? c2[nextPos].el : null
      // 移动
      hostInsert(newVNode.el, container, anchor)
    } else {
      s--
    }
  }
}
