// src/components/modules/puzzle/config.js

// =========================================================================
// 1. 网格模板数据 - 按图片数量分组
// =========================================================================
export const gridTemplates = {
  1: [
    {
      id: '1-1',
      label: '全屏单图',
      wrapStyle: { 'grid-template-columns': '1fr', 'grid-template-rows': '1fr' },
      gridAreas: ['1 / 1 / 2 / 2'],
    }
  ],
  2: [
    {
      id: '2-1',
      label: '左右均分',
      wrapStyle: { 'grid-template-columns': '1fr 1fr', 'grid-template-rows': '1fr' },
      gridAreas: ['1 / 1 / 2 / 2', '1 / 2 / 2 / 3'],
    },
    {
      id: '2-2',
      label: '上下均分',
      wrapStyle: { 'grid-template-columns': '1fr', 'grid-template-rows': '1fr 1fr' },
      gridAreas: ['1 / 1 / 2 / 2', '2 / 1 / 3 / 2'],
    },
    {
      id: '2-3',
      label: '左2右1',
      wrapStyle: { 'grid-template-columns': '2fr 1fr', 'grid-template-rows': '1fr' },
      gridAreas: ['1 / 1 / 2 / 2', '1 / 2 / 2 / 3'],
    },
    {
      id: '2-4',
      label: '上2下1',
      wrapStyle: { 'grid-template-columns': '1fr', 'grid-template-rows': '2fr 1fr' },
      gridAreas: ['1 / 1 / 2 / 2', '2 / 1 / 3 / 2'],
    }
  ],
  3: [
    {
      id: '3-1',
      label: '三列均分',
      wrapStyle: { 'grid-template-columns': '1fr 1fr 1fr', 'grid-template-rows': '1fr' },
      gridAreas: ['1 / 1 / 2 / 2', '1 / 2 / 2 / 3', '1 / 3 / 2 / 4'],
    },
    {
      id: '3-2',
      label: '三行均分',
      wrapStyle: { 'grid-template-columns': '1fr', 'grid-template-rows': '1fr 1fr 1fr' },
      gridAreas: ['1 / 1 / 2 / 2', '2 / 1 / 3 / 2', '3 / 1 / 4 / 2'],
    },
    {
      id: '3-3',
      label: '左主右副',
      wrapStyle: { 'grid-template-columns': '2fr 1fr', 'grid-template-rows': '1fr 1fr' },
      gridAreas: ['1 / 1 / 3 / 2', '1 / 2 / 2 / 3', '2 / 2 / 3 / 3'],
    },
    {
      id: '3-4',
      label: '上主下副',
      wrapStyle: { 'grid-template-columns': '1fr 1fr', 'grid-template-rows': '2fr 1fr' },
      gridAreas: ['1 / 1 / 2 / 3', '2 / 1 / 3 / 2', '2 / 2 / 3 / 3'],
    }
  ],
  4: [
    {
      id: '4-1',
      label: '田字格',
      wrapStyle: { 'grid-template-columns': '1fr 1fr', 'grid-template-rows': '1fr 1fr' },
      gridAreas: ['1 / 1 / 2 / 2', '1 / 2 / 2 / 3', '2 / 1 / 3 / 2', '2 / 2 / 3 / 3'],
    },
    {
      id: '4-2',
      label: '四列胶片',
      wrapStyle: { 'grid-template-columns': '1fr 1fr 1fr 1fr', 'grid-template-rows': '1fr' },
      gridAreas: ['1 / 1 / 2 / 2', '1 / 2 / 2 / 3', '1 / 3 / 2 / 4', '1 / 4 / 2 / 5'],
    },
    {
      id: '4-3',
      label: '左一右三',
      wrapStyle: { 'grid-template-columns': '1.5fr 1fr', 'grid-template-rows': '1fr 1fr 1fr' },
      gridAreas: ['1 / 1 / 4 / 2', '1 / 2 / 2 / 3', '2 / 2 / 3 / 3', '3 / 2 / 4 / 3'],
    },
    {
      id: '4-4',
      label: '上一下三',
      wrapStyle: { 'grid-template-columns': '1fr 1fr 1fr', 'grid-template-rows': '2fr 1fr' },
      gridAreas: ['1 / 1 / 2 / 4', '2 / 1 / 3 / 2', '2 / 2 / 3 / 3', '2 / 3 / 3 / 4'],
    },
    {
      id: '4-5',
      label: '错位布局',
      wrapStyle: { 'grid-template-columns': '1fr 1fr', 'grid-template-rows': '1fr 1fr 1fr' },
      gridAreas: ['1 / 1 / 2 / 2', '1 / 2 / 3 / 3', '2 / 1 / 4 / 2', '3 / 2 / 4 / 3'],
    }
  ],
  5: [
    {
      id: '5-1',
      label: '上二下三',
      wrapStyle: { 'grid-template-columns': 'repeat(6, 1fr)', 'grid-template-rows': '1fr 1fr' },
      gridAreas: [
        '1 / 1 / 2 / 4', '1 / 4 / 2 / 7',
        '2 / 1 / 3 / 3', '2 / 3 / 3 / 5', '2 / 5 / 3 / 7'
      ],
    },
    {
      id: '5-2',
      label: '左一右四',
      wrapStyle: { 'grid-template-columns': '1.5fr 1fr 1fr', 'grid-template-rows': '1fr 1fr' },
      gridAreas: [
        '1 / 1 / 3 / 2',
        '1 / 2 / 2 / 3', '1 / 3 / 2 / 4',
        '2 / 2 / 3 / 3', '2 / 3 / 3 / 4'
      ],
    },
    {
      id: '5-3',
      label: '中心环绕',
      wrapStyle: { 'grid-template-columns': '1fr 2fr 1fr', 'grid-template-rows': '1fr 1fr' },
      gridAreas: [
        '1 / 1 / 2 / 2', '1 / 2 / 3 / 3', '1 / 3 / 2 / 4',
        '2 / 1 / 3 / 2', '2 / 3 / 3 / 4'
      ],
    },
    {
      id: '5-4',
      label: '砌砖布局',
      wrapStyle: { 'grid-template-columns': '1fr 1fr', 'grid-template-rows': '1fr 1fr 1fr' },
      gridAreas: [
        '1 / 1 / 2 / 3',
        '2 / 1 / 3 / 2', '2 / 2 / 3 / 3',
        '3 / 1 / 4 / 2', '3 / 2 / 4 / 3'
      ]
    }
  ],
  6: [
    {
      id: '6-1',
      label: '标准2x3',
      wrapStyle: { 'grid-template-columns': 'repeat(3, 1fr)', 'grid-template-rows': '1fr 1fr' },
      gridAreas: [
        '1 / 1 / 2 / 2', '1 / 2 / 2 / 3', '1 / 3 / 2 / 4',
        '2 / 1 / 3 / 2', '2 / 2 / 3 / 3', '2 / 3 / 3 / 4'
      ],
    },
    {
      id: '6-2',
      label: '标准3x2',
      wrapStyle: { 'grid-template-columns': '1fr 1fr', 'grid-template-rows': 'repeat(3, 1fr)' },
      gridAreas: [
        '1 / 1 / 2 / 2', '1 / 2 / 2 / 3',
        '2 / 1 / 3 / 2', '2 / 2 / 3 / 3',
        '3 / 1 / 4 / 2', '3 / 2 / 4 / 3'
      ],
    },
    {
      id: '6-3',
      label: '左大右碎',
      wrapStyle: { 'grid-template-columns': '2fr 1fr', 'grid-template-rows': 'repeat(5, 1fr)' },
      gridAreas: [
        '1 / 1 / 6 / 2',
        '1 / 2 / 2 / 3', '2 / 2 / 3 / 3', '3 / 2 / 4 / 3', '4 / 2 / 5 / 3', '5 / 2 / 6 / 3'
      ],
    },
    {
      id: '6-4',
      label: '上大下碎',
      wrapStyle: { 'grid-template-columns': 'repeat(5, 1fr)', 'grid-template-rows': '2fr 1fr' },
      gridAreas: [
        '1 / 1 / 2 / 6',
        '2 / 1 / 3 / 2', '2 / 2 / 3 / 3', '2 / 3 / 3 / 4', '2 / 4 / 3 / 5', '2 / 5 / 3 / 6'
      ],
    }
  ],
  7: [
    {
      id: '7-1',
      label: '上三中四',
      wrapStyle: { 'grid-template-columns': 'repeat(4, 1fr)', 'grid-template-rows': 'repeat(2, 1fr)' },
      // 为了对齐，使用 12 列网格 (3和4的公倍数)
      wrapStyle: { 'grid-template-columns': 'repeat(12, 1fr)', 'grid-template-rows': '1fr 1fr' },
      gridAreas: [
        '1 / 1 / 2 / 5', '1 / 5 / 2 / 9', '1 / 9 / 2 / 13', // 上3 (每格4列)
        '2 / 1 / 3 / 4', '2 / 4 / 3 / 7', '2 / 7 / 3 / 10', '2 / 10 / 3 / 13' // 下4 (每格3列)
      ],
    },
    {
      id: '7-2',
      label: '主图环绕',
      wrapStyle: { 'grid-template-columns': 'repeat(3, 1fr)', 'grid-template-rows': 'repeat(3, 1fr)' },
      gridAreas: [
        '1 / 1 / 3 / 3', // 左上大图 2x2
        '1 / 3 / 2 / 4', '2 / 3 / 3 / 4',
        '3 / 1 / 4 / 2', '3 / 2 / 4 / 3', '3 / 3 / 4 / 4',
        '2 / 2 / 2 / 2' // (修正：补充缺口) -> 下面这种布局更稳
      ],
      // 修正版：左大 + 右3 + 下3
      wrapStyle: { 'grid-template-columns': '2fr 1fr', 'grid-template-rows': 'repeat(6, 1fr)' },
      gridAreas: [
        '1 / 1 / 5 / 2', // 左大
        '1 / 2 / 2 / 3', '2 / 2 / 3 / 3', '3 / 2 / 4 / 3', '4 / 2 / 5 / 3', // 右4
        '5 / 1 / 7 / 2', '5 / 2 / 7 / 3' // 下2? 这样是7张
      ],
      // 简单且好看的7张：1大 + 6小
      wrapStyle: { 'grid-template-columns': 'repeat(3, 1fr)', 'grid-template-rows': 'repeat(3, 1fr)' },
      gridAreas: [
        '1 / 1 / 3 / 3', // 左上大图 2x2
        '1 / 3 / 2 / 4', // 右1
        '2 / 3 / 3 / 4', // 右2
        '3 / 1 / 4 / 2', // 下1
        '3 / 2 / 4 / 3', // 下2
        '3 / 3 / 4 / 4', // 下3
        // 缺了一张? 上面只有6张。
        // 重来：3x3网格，1个占2x2(4格)，剩下5格放5张。共6张。
        // 7张图方案：上1大(全宽)，下2行3列
      ],
      wrapStyle: { 'grid-template-columns': 'repeat(3, 1fr)', 'grid-template-rows': '2fr 1fr 1fr' },
      gridAreas: [
        '1 / 1 / 2 / 4', // 上大
        '2 / 1 / 3 / 2', '2 / 2 / 3 / 3', '2 / 3 / 3 / 4',
        '3 / 1 / 4 / 2', '3 / 2 / 4 / 3', '3 / 3 / 4 / 4'
      ]
    },
    {
      id: '7-3',
      label: '非对称拼贴',
      wrapStyle: { 'grid-template-columns': 'repeat(4, 1fr)', 'grid-template-rows': 'repeat(4, 1fr)' },
      gridAreas: [
        '1 / 1 / 3 / 3', // 左上 2x2
        '3 / 3 / 5 / 5', // 右下 2x2
        '1 / 3 / 2 / 5', // 右上长条
        '2 / 3 / 3 / 5',
        '3 / 1 / 4 / 2', '3 / 2 / 4 / 3',
        '4 / 1 / 5 / 3'  // 左下长条
      ]
    }
  ],
  8: [
    {
      id: '8-1',
      label: '4x2网格',
      wrapStyle: { 'grid-template-columns': 'repeat(4, 1fr)', 'grid-template-rows': '1fr 1fr' },
      gridAreas: [
        '1 / 1 / 2 / 2', '1 / 2 / 2 / 3', '1 / 3 / 2 / 4', '1 / 4 / 2 / 5',
        '2 / 1 / 3 / 2', '2 / 2 / 3 / 3', '2 / 3 / 3 / 4', '2 / 4 / 3 / 5'
      ],
    },
    {
      id: '8-2',
      label: '2x4网格',
      wrapStyle: { 'grid-template-columns': '1fr 1fr', 'grid-template-rows': 'repeat(4, 1fr)' },
      gridAreas: [
        '1 / 1 / 2 / 2', '1 / 2 / 2 / 3',
        '2 / 1 / 3 / 2', '2 / 2 / 3 / 3',
        '3 / 1 / 4 / 2', '3 / 2 / 4 / 3',
        '4 / 1 / 5 / 2', '4 / 2 / 5 / 3'
      ],
    },
    {
      id: '8-3',
      label: '双主图对角',
      wrapStyle: { 'grid-template-columns': 'repeat(4, 1fr)', 'grid-template-rows': 'repeat(3, 1fr)' },
      gridAreas: [
        '1 / 1 / 3 / 3', // 左上大图
        '2 / 3 / 4 / 5', // 右下大图
        '1 / 3 / 2 / 4', '1 / 4 / 2 / 5',
        '2 / 3 / 3 / 4', '2 / 4 / 3 / 5', // 这里的2/3/4/5其实就是右下大图
        // 修正：
        '1 / 3 / 2 / 4', '1 / 4 / 2 / 5', // 右上两张
        '3 / 1 / 4 / 2', '3 / 2 / 4 / 3', // 左下两张
        '2 / 3 / 2 / 4', '2 / 4 / 2 / 5'  // 补位? 复杂了，换简单方案：
      ],
      // 8图方案：中间2大，两边各3
      wrapStyle: { 'grid-template-columns': '1fr 2fr 1fr', 'grid-template-rows': '1fr 1fr 1fr' },
      gridAreas: [
        '1 / 1 / 2 / 2', '2 / 1 / 3 / 2', '3 / 1 / 4 / 2', // 左3
        '1 / 2 / 2.5 / 3', '2.5 / 2 / 4 / 3', // 中2 (横向切分? 不支持小数) -> 改为上下各占1.5
        // 修正：用 6行
        '1 / 3 / 2 / 4', '2 / 3 / 3 / 4', '3 / 3 / 4 / 4'  // 右3
      ],
      // 稳妥方案：上3 中2 下3
      wrapStyle: { 'grid-template-columns': 'repeat(6, 1fr)', 'grid-template-rows': '1fr 1.5fr 1fr' },
      gridAreas: [
        '1 / 1 / 2 / 3', '1 / 3 / 2 / 5', '1 / 5 / 2 / 7', // 上3 (每格2列)
        '2 / 1 / 3 / 4', '2 / 4 / 3 / 7',                  // 中2 (每格3列)
        '3 / 1 / 4 / 3', '3 / 3 / 4 / 5', '3 / 5 / 4 / 7'  // 下3 (每格2列)
      ]
    }
  ],
  9: [
    {
      id: '9-1',
      label: '九宫格',
      wrapStyle: { 'grid-template-columns': 'repeat(3, 1fr)', 'grid-template-rows': 'repeat(3, 1fr)' },
      gridAreas: [
        '1 / 1 / 2 / 2', '1 / 2 / 2 / 3', '1 / 3 / 2 / 4',
        '2 / 1 / 3 / 2', '2 / 2 / 3 / 3', '2 / 3 / 3 / 4',
        '3 / 1 / 4 / 2', '3 / 2 / 4 / 3', '3 / 3 / 4 / 4'
      ],
    },
    {
      id: '9-2',
      label: '中心聚焦',
      wrapStyle: { 'grid-template-columns': 'repeat(3, 1fr)', 'grid-template-rows': 'repeat(3, 1fr)' },
      gridAreas: [
        '1 / 1 / 2 / 2', '1 / 2 / 2 / 3', '1 / 3 / 2 / 4',
        '2 / 1 / 3 / 2', '2 / 2 / 3 / 3', '2 / 3 / 3 / 4',
        '3 / 1 / 4 / 2', '3 / 2 / 4 / 3', '3 / 3 / 4 / 4'
      ],
      // 修正：9图布局，中间大图，四周8图，需要 4x4 网格
      wrapStyle: { 'grid-template-columns': 'repeat(4, 1fr)', 'grid-template-rows': 'repeat(4, 1fr)' },
      gridAreas: [
        '2 / 2 / 4 / 4', // 中间大图 2x2
        '1 / 1 / 2 / 2', '1 / 2 / 2 / 3', '1 / 3 / 2 / 4', '1 / 4 / 2 / 5', // 上4
        '2 / 1 / 3 / 2', // 左中
        '2 / 4 / 3 / 5', // 右中
        '3 / 1 / 4 / 2', // 左下
        '3 / 4 / 4 / 5', // 右下
        // 哎呀，下面还缺一行？4x4是16格。大图占4格，剩12格。我们只有8张小图。
        // 所以这个布局是 9 张图，中间大图占 2x2，周围需要12格？不对。
        // 3x3网格，中间大图占1格？那就是九宫格。
        // 正确的“中心大图+周围”通常是 1大8小 = 9图。
        // 布局：3x3，中间格分裂为4小格？不，是反过来：3x3，周围格分裂。
        // 方案：4x4网格。中间 2x2 占4格。剩余 16-4 = 12 格。
        // 如果要放8张小图，有些小图要占 1.5格？
        // 简单方案：3行错位。
      ],
      wrapStyle: { 'grid-template-columns': 'repeat(6, 1fr)', 'grid-template-rows': 'repeat(6, 1fr)' },
      gridAreas: [
        '2 / 2 / 6 / 6', // 中间极大 4x4
        '1 / 1 / 2 / 3', '1 / 3 / 2 / 5', '1 / 5 / 2 / 7', // 上3
        '2 / 1 / 4 / 2', // 左1
        '4 / 1 / 6 / 2', // 左2
        '2 / 6 / 4 / 7', // 右1
        '4 / 6 / 6 / 7', // 右2
        '6 / 1 / 7 / 4', // 下1
        '6 / 4 / 7 / 7'  // 下2
      ]
    }
  ],
  10: [
    {
      id: '10-1',
      label: '5x2均分',
      wrapStyle: { 'grid-template-columns': 'repeat(5, 1fr)', 'grid-template-rows': '1fr 1fr' },
      gridAreas: [
        '1 / 1 / 2 / 2', '1 / 2 / 2 / 3', '1 / 3 / 2 / 4', '1 / 4 / 2 / 5', '1 / 5 / 2 / 6',
        '2 / 1 / 3 / 2', '2 / 2 / 3 / 3', '2 / 3 / 3 / 4', '2 / 4 / 3 / 5', '2 / 5 / 3 / 6'
      ]
    },
    {
      id: '10-2',
      label: '2x5均分',
      wrapStyle: { 'grid-template-columns': '1fr 1fr', 'grid-template-rows': 'repeat(5, 1fr)' },
      gridAreas: [
        '1 / 1 / 2 / 2', '1 / 2 / 2 / 3',
        '2 / 1 / 3 / 2', '2 / 2 / 3 / 3',
        '3 / 1 / 4 / 2', '3 / 2 / 4 / 3',
        '4 / 1 / 5 / 2', '4 / 2 / 5 / 3',
        '5 / 1 / 6 / 2', '5 / 2 / 6 / 3'
      ]
    },
    {
      id: '10-3',
      label: '4-3-3布局',
      wrapStyle: { 'grid-template-columns': 'repeat(12, 1fr)', 'grid-template-rows': 'repeat(3, 1fr)' },
      gridAreas: [
        '1 / 1 / 2 / 4', '1 / 4 / 2 / 7', '1 / 7 / 2 / 10', '1 / 10 / 2 / 13', // 第一行4张
        '2 / 1 / 3 / 5', '2 / 5 / 3 / 9', '2 / 9 / 3 / 13', // 第二行3张
        '3 / 1 / 4 / 5', '3 / 5 / 4 / 9', '3 / 9 / 4 / 13'  // 第三行3张
      ]
    }
  ],
  11: [
    {
      id: '11-1',
      label: '4-4-3布局',
      wrapStyle: { 'grid-template-columns': 'repeat(12, 1fr)', 'grid-template-rows': 'repeat(3, 1fr)' },
      gridAreas: [
        '1 / 1 / 2 / 4', '1 / 4 / 2 / 7', '1 / 7 / 2 / 10', '1 / 10 / 2 / 13', // 上4
        '2 / 1 / 3 / 4', '2 / 4 / 3 / 7', '2 / 7 / 3 / 10', '2 / 10 / 3 / 13', // 中4
        '3 / 1 / 4 / 5', '3 / 5 / 4 / 9', '3 / 9 / 4 / 13' // 下3
      ]
    },
    {
      id: '11-2',
      label: '3-4-4布局',
      wrapStyle: { 'grid-template-columns': 'repeat(12, 1fr)', 'grid-template-rows': 'repeat(3, 1fr)' },
      gridAreas: [
        '1 / 1 / 2 / 5', '1 / 5 / 2 / 9', '1 / 9 / 2 / 13', // 上3
        '2 / 1 / 3 / 4', '2 / 4 / 3 / 7', '2 / 7 / 3 / 10', '2 / 10 / 3 / 13', // 中4
        '3 / 1 / 4 / 4', '3 / 4 / 4 / 7', '3 / 7 / 4 / 10', '3 / 10 / 4 / 13'  // 下4
      ]
    }
  ],
  12: [
    {
      id: '12-1',
      label: '3x4网格',
      wrapStyle: { 'grid-template-columns': 'repeat(3, 1fr)', 'grid-template-rows': 'repeat(4, 1fr)' },
      gridAreas: Array.from({ length: 12 }, (_, i) => {
        const r = Math.floor(i / 3) + 1;
        const c = (i % 3) + 1;
        return `${r} / ${c} / ${r + 1} / ${c + 1}`;
      })
    },
    {
      id: '12-2',
      label: '4x3网格',
      wrapStyle: { 'grid-template-columns': 'repeat(4, 1fr)', 'grid-template-rows': 'repeat(3, 1fr)' },
      gridAreas: Array.from({ length: 12 }, (_, i) => {
        const r = Math.floor(i / 4) + 1;
        const c = (i % 4) + 1;
        return `${r} / ${c} / ${r + 1} / ${c + 1}`;
      })
    },
    {
      id: '12-3',
      label: '中心聚焦',
      wrapStyle: { 'grid-template-columns': 'repeat(4, 1fr)', 'grid-template-rows': 'repeat(3, 1fr)' },
      gridAreas: [
        '1 / 1 / 2 / 2', '1 / 2 / 2 / 3', '1 / 3 / 2 / 4', '1 / 4 / 2 / 5', // 上4
        '2 / 1 / 3 / 2', /* 中间空2格 */  '2 / 4 / 3 / 5', // 中2
        '3 / 1 / 4 / 2', '3 / 2 / 4 / 3', '3 / 3 / 4 / 4', '3 / 4 / 4 / 5', // 下4
        // 补中间大图 (2x2)
        '2 / 2 / 3 / 4' // 注意：这里只占了1行高度(Row 2)，宽度占2列。如果想是正方形大图需调整行高
      ],
      // 修正：1大 + 11小 = 12图
      wrapStyle: { 'grid-template-columns': 'repeat(4, 1fr)', 'grid-template-rows': 'repeat(4, 1fr)' },
      gridAreas: [
        '2 / 2 / 4 / 4', // 中间大图 2x2
        '1 / 1 / 2 / 2', '1 / 2 / 2 / 3', '1 / 3 / 2 / 4', '1 / 4 / 2 / 5', // Row 1 (4)
        '2 / 1 / 3 / 2', '2 / 4 / 3 / 5', // Row 2 sides (2)
        '3 / 1 / 4 / 2', '3 / 4 / 4 / 5', // Row 3 sides (2)
        '4 / 1 / 5 / 2', '4 / 2 / 5 / 3', '4 / 3 / 5 / 4' // Row 4 (3, 缺一个？)
        // 4+2+2+3 = 11小图。正好。
      ]
    }
  ],
  13: [
    {
      id: '13-1',
      label: '中心大图+12',
      wrapStyle: { 'grid-template-columns': 'repeat(4, 1fr)', 'grid-template-rows': 'repeat(4, 1fr)' },
      gridAreas: [
        '2 / 2 / 4 / 4', // 中间大图 2x2
        // 周围环绕12张
        '1 / 1 / 2 / 2', '1 / 2 / 2 / 3', '1 / 3 / 2 / 4', '1 / 4 / 2 / 5',
        '2 / 1 / 3 / 2', '2 / 4 / 3 / 5',
        '3 / 1 / 4 / 2', '3 / 4 / 4 / 5',
        '4 / 1 / 5 / 2', '4 / 2 / 5 / 3', '4 / 3 / 5 / 4', '4 / 4 / 5 / 5'
      ]
    }
  ],
  14: [
    {
      id: '14-1',
      label: '5-5-4布局',
      wrapStyle: { 'grid-template-columns': 'repeat(20, 1fr)', 'grid-template-rows': 'repeat(3, 1fr)' },
      gridAreas: [
        // Row 1 (5张): 20/5 = 4
        '1/1/2/5', '1/5/2/9', '1/9/2/13', '1/13/2/17', '1/17/2/21',
        // Row 2 (5张)
        '2/1/3/5', '2/5/3/9', '2/9/3/13', '2/13/3/17', '2/17/3/21',
        // Row 3 (4张): 20/4 = 5
        '3/1/4/6', '3/6/4/11', '3/11/4/16', '3/16/4/21'
      ]
    },
    {
      id: '14-2',
      label: '对称双大图',
      wrapStyle: { 'grid-template-columns': 'repeat(4, 1fr)', 'grid-template-rows': 'repeat(4, 1fr)' },
      gridAreas: [
        '1 / 1 / 2 / 3', // 左上大图 2x1 (横向)
        '1 / 3 / 2 / 5', // 右上大图 2x1 (横向)
        '1 / 1 / 2 / 2', '1 / 2 / 2 / 3', '1 / 3 / 2 / 4', '1 / 4 / 2 / 5', // Row 1 (4)
        '2 / 1 / 3 / 2', '2 / 2 / 3 / 3', '2 / 3 / 3 / 4', '2 / 4 / 3 / 5', // Row 2 (4)
        '3 / 1 / 4 / 2', '3 / 2 / 4 / 3', '3 / 3 / 4 / 4', '3 / 4 / 4 / 5', // Row 3 (4)
        '4 / 1 / 5 / 3', // 左下大图 2x1
        '4 / 3 / 5 / 5'  // 右下大图 2x1
        // 这样是 4+4+4+2 = 14张。
      ]
    }
  ],
  15: [
    {
      id: '15-1',
      label: '3x5网格',
      wrapStyle: { 'grid-template-columns': 'repeat(3, 1fr)', 'grid-template-rows': 'repeat(5, 1fr)' },
      gridAreas: Array.from({ length: 15 }, (_, i) => {
        const r = Math.floor(i / 3) + 1;
        const c = (i % 3) + 1;
        return `${r} / ${c} / ${r + 1} / ${c + 1}`;
      })
    },
    {
      id: '15-2',
      label: '5x3网格',
      wrapStyle: { 'grid-template-columns': 'repeat(5, 1fr)', 'grid-template-rows': 'repeat(3, 1fr)' },
      gridAreas: Array.from({ length: 15 }, (_, i) => {
        const r = Math.floor(i / 5) + 1;
        const c = (i % 5) + 1;
        return `${r} / ${c} / ${r + 1} / ${c + 1}`;
      })
    }
  ],
  16: [
    {
      id: '16-1',
      label: '4x4标准',
      wrapStyle: { 'grid-template-columns': 'repeat(4, 1fr)', 'grid-template-rows': 'repeat(4, 1fr)' },
      gridAreas: Array.from({ length: 16 }, (_, i) => {
        const r = Math.floor(i / 4) + 1;
        const c = (i % 4) + 1;
        return `${r} / ${c} / ${r + 1} / ${c + 1}`;
      })
    }
  ]
};

// 2. 图片数量下拉 (扩展至16)
export const countOptions = [
  { value: 'all', label: '全部' },
  ...Array.from({ length: 16 }, (_, i) => ({
    value: String(i + 1),
    label: `${i + 1}张`
  }))
];

// =========================================================================
// 3. 核心工具函数：生成和解析网格
// =========================================================================

/**
 * 动态生成 NxM 网格的单元格数据
 * @param {Number} rows 行数
 * @param {Number} cols 列数
 * @returns {Array} 单元格数组
 */
export const generateGridCells = (rows, cols) => {
  const cells = [];
  const w = 1 / cols;
  const h = 1 / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({
        index: r * cols + c,
        x: c * w,
        y: r * h,
        w: w,
        h: h
      });
    }
  }
  return cells;
};

/**
 * 解析 CSS Grid Area 模板为百分比坐标
 * 兼容格式如: "1 / 1 / 2 / 2" (rowStart / colStart / rowEnd / colEnd)
 * @param {Object} tpl 模板对象
 */
export const parseTemplateToCells = (tpl) => {
  if (!tpl || !tpl.gridAreas) return [];

  let maxR = 1, maxC = 1;

  const getCountFromStyle = (styleStr) => {
    if (!styleStr) return 1;
    const repeatMatch = styleStr.match(/repeat\((\d+)/);
    if (repeatMatch) return parseInt(repeatMatch[1]);
    const spaceMatch = styleStr.trim().split(/\s+/);
    return spaceMatch.length;
  };

  if (tpl.wrapStyle) {
    maxC = Math.max(maxC, getCountFromStyle(tpl.wrapStyle['grid-template-columns']));
    maxR = Math.max(maxR, getCountFromStyle(tpl.wrapStyle['grid-template-rows']));
  }

  tpl.gridAreas.forEach(area => {
    const parts = area.split('/').map(s => parseInt(s.trim()));
    if (parts.length >= 4) {
      if (parts[2] - 1 > maxR) maxR = parts[2] - 1;
      if (parts[3] - 1 > maxC) maxC = parts[3] - 1;
    }
  });

  return tpl.gridAreas.map((area, index) => {
    const [r1, c1, r2, c2] = area.split('/').map(s => parseInt(s.trim()));
    const x = (c1 - 1) / maxC;
    const y = (r1 - 1) / maxR;
    const w = (c2 - c1) / maxC;
    const h = (r2 - r1) / maxR;

    return { index, x, y, w, h };
  });
};