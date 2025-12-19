// 网格模板数据 - 按图片数量分组
export const gridTemplates = {
  1: [
    {
      id: '1-1',
      wrapStyle: {
        'grid-template-columns': 'repeat(1, 1fr)',
        'grid-template-rows': 'repeat(1, 1fr)',
      },
      gridAreas: ['1 / 1 / 2 / 2'],
    }
  ],
  2: [
    {
      id: '2-1',
      wrapStyle: {
        'grid-template-columns': 'repeat(2, 1fr)',
        'grid-template-rows': 'repeat(2, 1fr)',
      },
      gridAreas: ['1 / 1 / 3 / 2', '1 / 2 / 3 / 3'],
    },
    {
      id: '2-2',
      wrapStyle: {
        'grid-template-columns': 'repeat(2, 1fr)',
        'grid-template-rows': 'repeat(2, 1fr)',
      },
      gridAreas: ['1 / 1 / 2 / 3', '2 / 1 / 3 / 3'],
    }
  ],
  3: [
    {
      id: '3-1',
      wrapStyle: {
        'grid-template-columns': 'repeat(3, 1fr)',
        'grid-template-rows': 'repeat(3, 1fr)',
      },
      gridAreas: ['1 / 1 / 3 / 3', '1 / 3 / 3 / 4', '3 / 1 / 4 / 4'],
    },
    {
      id: '3-2',
      wrapStyle: {
        'grid-template-columns': 'repeat(3, 1fr)',
        'grid-template-rows': 'repeat(3, 1fr)',
      },
      gridAreas: ['1 / 1 / 2 / 4', '2 / 1 / 4 / 3', '2 / 3 / 4 / 4'],
    },
    {
      id: '3-3',
      wrapStyle: {
        'grid-template-columns': 'repeat(2, 1fr)',
        'grid-template-rows': 'repeat(2, 1fr)',
      },
      gridAreas: [
        '1 / 1 / 3 / 2',
        '1 / 2 / 2 / 3',
        '2 / 2 / 3 / 3'
      ],
    },
    {
      id: '3-4',
      wrapStyle: {
        'grid-template-columns': 'repeat(2, 1fr)',
        'grid-template-rows': 'repeat(2, 1fr)',
      },
      gridAreas: [
        '1 / 1 / 2 / 2',
        '1 / 2 / 3 / 3',
        '2 / 1 / 3 / 2'
      ],
    },
    {
      id: '3-5',
      wrapStyle: {
        'grid-template-columns': 'repeat(2, 1fr)',
        'grid-template-rows': 'repeat(2, 1fr)',
      },
      gridAreas: [
        '1 / 1 / 2 / 3',
        '2 / 1 / 3 / 2',
        '2 / 2 / 3 / 3'
      ],
    },
    {
      id: '3-6',
      wrapStyle: {
        'grid-template-columns': 'repeat(2, 1fr)',
        'grid-template-rows': 'repeat(2, 1fr)',
      },
      gridAreas: [
        '1 / 1 / 2 / 2',
        '1 / 2 / 2 / 3',
        '2 / 1 / 3 / 3'
      ],
    },
    {
      id: '3-7',
      wrapStyle: {
        'grid-template-columns': 'repeat(3, 1fr)',
        'grid-template-rows': 'repeat(3, 1fr)',
      },
      gridAreas: [
        '1 / 1 / 4 / 2',
        '1 / 2 / 4 / 3',
        '1 / 3 / 4 / 4'
      ],
    },
    {
      id: '3-8',
      wrapStyle: {
        'grid-template-columns': 'repeat(3, 1fr)',
        'grid-template-rows': 'repeat(3, 1fr)',
      },
      gridAreas: [
        '1 / 1 / 2 / 4',
        '2 / 1 / 3 / 4',
        '3 / 1 / 4 / 4'
      ],
    }
  ],
  4: [
    {
      id: '4-1',
      wrapStyle: {
        'grid-template-columns': 'repeat(2, 1fr)',
        'grid-template-rows': 'repeat(2, 1fr)',
      },
      gridAreas: [
        '1 / 1 / 2 / 2',
        '1 / 2 / 2 / 3',
        '2 / 1 / 3 / 2',
        '2 / 2 / 3 / 3'
      ],
    },
    {
      id: '4-2',
      wrapStyle: {
        'grid-template-columns': 'repeat(6, 1fr)',
        'grid-template-rows': 'repeat(6, 1fr)',
      },
      gridAreas: [
        '1 / 1 / 4 / 3',
        '1 / 3 / 4 / 7',
        '4 / 1 / 7 / 5',
        '4 / 5 / 7 / 7'
      ],
    },
    {
      id: '4-3',
      wrapStyle: {
        'grid-template-columns': 'repeat(6, 1fr)',
        'grid-template-rows': 'repeat(6, 1fr)',
      },
      gridAreas: [
        '1 / 1 / 7 / 3',
        '1 / 3 / 4 / 5',
        '4 / 3 / 7 / 5',
        '1 / 5 / 7 / 7'
      ],
    },
    {
      id: '4-4',
      wrapStyle: {
        'grid-template-columns': 'repeat(6, 1fr)',
        'grid-template-rows': 'repeat(6, 1fr)',
      },
      gridAreas: [
        '1 / 1 / 3 / 7',
        '3 / 1 / 5 / 4',
        '3 / 4 / 5 / 7',
        '5 / 1 / 7 / 7'
      ],
    },
    {
      id: '4-5',
      wrapStyle: {
        'grid-template-columns': 'repeat(4, 1fr)',
        'grid-template-rows': 'repeat(4, 1fr)',
      },
      gridAreas: [
        '1 / 1 / 5 / 2',
        '1 / 2 / 5 / 3',
        '1 / 3 / 5 / 4',
        '1 / 4 / 5 / 5'
      ],
    },
    {
      id: '4-6',
      wrapStyle: {
        'grid-template-columns': 'repeat(4, 1fr)',
        'grid-template-rows': 'repeat(4, 1fr)',
      },
      gridAreas: [
        '1 / 1 / 2 / 5',
        '2 / 1 / 3 / 5',
        '3 / 1 / 4 / 5',
        '4 / 1 / 5 / 5'
      ],
    },
    {
      id: '4-7',
      wrapStyle: {
        'grid-template-columns': 'repeat(6, 1fr)',
        'grid-template-rows': 'repeat(6, 1fr)',
      },
      gridAreas: [
        '1 / 1 / 3 / 4',
        '3 / 1 / 5 / 4',
        '5 / 1 / 7 / 4',
        '1 / 4 / 7 / 7'
      ],
    },
    {
      id: '4-8',
      wrapStyle: {
        'grid-template-columns': 'repeat(6, 1fr)',
        'grid-template-rows': 'repeat(6, 1fr)',
      },
      gridAreas: [
        '1 / 1 / 7 / 4',
        '1 / 4 / 3 / 7',
        '3 / 4 / 5 / 7',
        '5 / 4 / 7 / 7'
      ],
    },
    {
      id: '4-9',
      wrapStyle: {
        'grid-template-columns': 'repeat(6, 1fr)',
        'grid-template-rows': 'repeat(6, 1fr)',
      },
      gridAreas: [
        '1 / 1 / 4 / 3',
        '1 / 3 / 4 / 5',
        '1 / 5 / 4 / 7',
        '4 / 1 / 7 / 7'
      ],
    },
    {
      id: '4-10',
      wrapStyle: {
        'grid-template-columns': 'repeat(6, 1fr)',
        'grid-template-rows': 'repeat(6, 1fr)',
      },
      gridAreas: [
        '1 / 1 / 4 / 7',
        '4 / 1 / 7 / 3',
        '4 / 3 / 7 / 5',
        '4 / 5 / 7 / 7'
      ],
    },
    {
      id: '4-11',
      wrapStyle: {
        'grid-template-columns': 'repeat(4, 1fr)',
        'grid-template-rows': 'repeat(4, 1fr)',
      },
      gridAreas: [
        '1 / 1 / 3 / 5',
        '3 / 1 / 5 / 3',
        '3 / 3 / 4 / 5',
        '4 / 3 / 5 / 5'
      ],
    },
    {
      id: '4-12',
      wrapStyle: {
        'grid-template-columns': 'repeat(4, 1fr)',
        'grid-template-rows': 'repeat(4, 1fr)',
      },
      gridAreas: [
        '1 / 1 / 5 / 3',
        '1 / 3 / 3 / 4',
        '1 / 4 / 3 / 5',
        '3 / 3 / 5 / 5'
      ],
    },
    {
      id: '4-13',
      wrapStyle: {
        'grid-template-columns': 'repeat(4, 1fr)',
        'grid-template-rows': 'repeat(4, 1fr)',
      },
      gridAreas: [
        '1 / 1 / 2 / 3',
        '2 / 1 / 3 / 3',
        '1 / 3 / 3 / 5',
        '3 / 1 / 5 / 5'
      ],
    },
    {
      id: '4-14',
      wrapStyle: {
        'grid-template-columns': 'repeat(4, 1fr)',
        'grid-template-rows': 'repeat(4, 1fr)',
      },
      gridAreas: [
        '1 / 1 / 3 / 3',
        '3 / 1 / 5 / 2',
        '3 / 2 / 5 / 3',
        '1 / 3 / 5 / 5'
      ],
    },
  ]
};

// 图片数量下拉
export const countOptions = [
  { value: 'all', label: '全部' },
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
];
