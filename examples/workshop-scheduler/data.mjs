export const dates = Array.from({ length: 7 }, (_, i) => new Date(Date.UTC(2026, 9, 26 + i)).toISOString().slice(0, 10));
export const devices = [
  { id: 'laser', name: '激光切割机', model: 'Trotec Speedy 100', tag: 'L01', kind: 'laser', description: '木材、亚克力切割与雕刻', area: 'A 区 · 靠窗工作台' },
  { id: 'printer', name: '3D 打印机', model: 'Bambu Lab X1C', tag: 'P01', kind: 'printer', description: 'PLA / PETG 结构与外观打样', area: 'B 区 · 打印工作台' },
  { id: 'cnc', name: 'CNC 雕刻机', model: 'Shapeoko 4', tag: 'C01', kind: 'cnc', description: '木材雕刻与精密铣削', area: 'C 区 · 独立加工间' },
];
const daily = [
  [['laser', 570, 660, '桦木灯罩打样', '陈雨', '3 mm 桦木板，先做小样。'], ['laser', 810, 900, '纸模切割', '周宁', ''], ['printer', 540, 690, '旋钮外壳 · 第三版', '林青', '白色 PLA，0.2 mm 层高。'], ['printer', 780, 960, '齿轮传动原型', '许舟', ''], ['cnc', 630, 750, '橡木托盘开槽', '沈禾', '自带材料。'], ['cnc', 900, 1020, '小型夹具', '吴言', '']],
  [['laser', 600, 690, '字体铭牌', '周宁', ''], ['printer', 570, 780, '花器结构测试', '陈雨', ''], ['cnc', 810, 930, '胡桃木底座', '沈禾', '']],
  [['laser', 540, 600, '亚克力面板', '林青', ''], ['laser', 750, 840, '展览指示牌', '许舟', ''], ['printer', 660, 870, '可拆卸连接件', '吴言', ''], ['cnc', 570, 690, '书架榫卯样件', '沈禾', '']],
  [['laser', 660, 750, '灯具挡片', '陈雨', ''], ['printer', 540, 720, '耳机支架', '林青', ''], ['cnc', 840, 960, '首饰展示台', '周宁', '']],
  [['laser', 570, 660, '作品集封面', '吴言', ''], ['printer', 780, 1020, '相机手柄', '许舟', ''], ['cnc', 630, 780, '桌面收纳槽', '沈禾', '']],
  [['laser', 600, 690, '社区活动标牌', '周宁', ''], ['printer', 570, 720, '课程演示模型', '陈雨', ''], ['cnc', 810, 900, '杯垫试制', '吴言', '']],
  [['laser', 780, 870, '建筑模型窗片', '林青', ''], ['printer', 600, 840, '微缩建筑构件', '许舟', '']],
];
export const seedReservations = daily.flatMap((items, day) => items.map(([deviceId, start, end, title, booker, note], index) => ({ id: `BK-${day + 1}${index + 1}01`, deviceId, date: dates[day], start, end, title, booker, note, revision: 1, status: 'active' })));
export const time = minutes => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
