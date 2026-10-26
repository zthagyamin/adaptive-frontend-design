# 把体验描述转成可实现的选择

> 公开分发版：相对原项目指导做了去标识与可移植性改写，来源与第三方许可见[来源](../SOURCES.md)。

用户可以描述“拖起来有重量”“点开像同一件东西”“滚到这里才变化”，无需先选术语或动画库。先指出要改变的对象、内容与操作结果，再区分这是输入行为、状态、视觉过程、渲染能力还是媒体播放。术语用于澄清关系，不为页面增加效果。

## 先写一条操作，再找机制

把当前目标写成：**什么输入 → 谁改变 → 何时算抵达 → 中途改意怎么办 → 如何返回。** 例如从目录打开同一作品，首先需要作品身份、入口和详情的真实几何、可读正文与返回位置；之后才决定现有栈里的CSS、WAAPI、布局动画或View Transition是否适合。

先复用当前项目。简单状态变化可以由原生CSS完成；需要程序控制时再评估[Web Animations API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API)或已有库。跨视图的视觉连续性可研究[View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API)，但真实导航、内容和失败退路仍须独立成立。现有对象或库支持哪些中断、反向与手势能力，按实际版本和入口核对。

需要多层时间关系时先按[运动语言](motion-language.md)安排主体与支撑层；需要真实空间时按[实时空间路线](route-realtime-space.md)核对几何、资产和输入；连续拖动、重定向与返回按[交互接续](interaction-craft.md)实施。不要为了容易测试，用静态图替代已明确需要的实时操作；也不要为了“高级”加入没有内容工作的GPU或插件。

## 从控件语义确定状态

短暂按压只表示此刻输入，持续选中则表达保留的值；键盘焦点指出下一输入位置，悬停只适用于对应指针。它们不能互相冒充。先确定控件究竟是导航、命令、选择还是设置，再按真实角色使用原生HTML及适用ARIA状态。

切换按钮可用稳定名称与`aria-pressed`表达持续开关；“播放/暂停”若以名称说明下一命令，也可以是普通动作按钮，不把瞬时鼠标按下写成持续选中。[APG按钮模式](https://www.w3.org/WAI/ARIA/apg/patterns/button/)可核对命名与键盘行为；菜单、标签页、单选等分别按其模式实现，不能因外观相像就复用全部语义。

弹出层先分清是否模态。[Popover API](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API)本身提供非模态机制，不自动建立模态焦点回路；需要模态时核对[dialog](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog)的实际打开方式、背景不可操作、关闭与焦点恢复。组件库同名组件也可能有不同合同。

选值先看是否需要编辑查询、只选一项还是多选；原生`select`、listbox和combobox不是可按品牌互换的外壳。[APG Combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)给出具体模式条件，选用自定义实现前保留名字、键盘与返回路径。

## 从驱动方式确定运动含义

滚到阈值后播放时间过程，与滚动位置直接决定进度，是两种行为。额外时间平滑又是第三种选择；非线性进度映射本身不一定产生滞后。明确停止、倒退、锚点跳转和重排后的结果，再选[CSS滚动驱动动画](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll-driven_animations)或项目已有机制，采用时核对目标浏览器支持。

“弹性”也不能指定唯一实现。曲线制造的弹性感、物理参数弹簧、按时长配置的spring在速度继承、停止和中断上可能不同；按具体API核对，例如[Motion transitions](https://motion.dev/docs/react-transitions)。数值/指针命中应直接跟随真实输入，装饰层的迟滞不写回输入值。

共享元素描述同一对象在两个视图里的对应关系，不保证任何库自动管理对象身份、焦点和生命周期。复制层、快照或布局动画都要检查当前对象、起止矩形、途中关闭与改选；换到B后不能收回A的缩略图。完整方法见[三类动态](motion-systems.md)。

## 让材料与性能名称对应实际成本

界面的玻璃外观、实时3D材料和物理模拟是不同工作。`filter`处理元素本身，`backdrop-filter`处理背后内容；浏览器近似系统材质，不继承操作系统全部行为。PBR、shader或bloom是实现工具，不能凭名称证明光学准确、可读或好看。

优化先问瓶颈在哪一段。实例化可以减少可共享几何/材质的重复提交，却不消除顶点、像素、透明叠加和更新成本；几何传输压缩需要解码，文件更小不等于GPU几何内存同比变小；KTX2容器的转码格式与设备支持另核对。[InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html)、[DRACOLoader](https://threejs.org/docs/pages/DRACOLoader.html)、[KTX2Loader](https://threejs.org/docs/pages/KTX2Loader.html)提供对应接口，渲染与所有权方法见[Three.js工作流](threejs-workflow.md)。

## 用当前路径确认选择

核对实际受理、当前状态、抵达/失败、返回、可见焦点和必要的等价入口。`aria-live`只公告有意义变化，不逐帧报告动画。[APG键盘实践](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)与[减少动态](https://web.dev/articles/prefers-reduced-motion)可以作为实现入口；真实键盘、触摸、正常速度体验及性能仍按当前环境分别检查。

工具名称与旧教程不自动触发依赖迁移；库、插件、许可、费用和兼容性在采用时核对。链接是公开技术入口，不表示所有示例已运行或最新兼容矩阵已验证；本页也不构成安装、外部服务调用或新增费用授权。
