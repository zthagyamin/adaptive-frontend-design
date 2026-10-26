# 把平面内容接进空间

> 公开分发版：相对原项目指导做了去标识与可移植性改写，来源与第三方许可见[来源](../SOURCES.md)。

用于品牌图形显露体积、图片与3D层对位、共享画布的局部窗口。普通CSS排版/淡入、独立全屏世界或已有正确投影的小修不加载。沿用项目版本和所有权；[投影工具](../assets/motion/projection.mjs)可按需复制，不要求引入React、R3F或新框架。

## 保留身份，再释放纵深

同一图形进入空间时，先保留轮廓、屏幕位置和阅读归属，再让厚度、侧面、遮挡或光线出现；换作品则按换件处理。14islands的[Jaws-effect作者文](https://www.14islands.com/journal/using-the-jaws-effect-to-transition-between-2d-and-3d)为Pluto示范了联动相机距离和zoom、压低透视后再显露纵深，并调整光照。学习的是这个关系，不是其距离常数或一套固定材质参数。

**只改镜头不会自动成为平面设计。** 高光、侧面和投影仍会暴露体积；按图形选择平面基线、统一着色或受控光线，再过渡到空间材料。roughness=1不会消除漫反射明暗或阴影。不同深度部件在dolly zoom中改变相对比例，不能声称整个场景真的变成正交投影。

## 对齐一个参考平面

对居中、无viewOffset/filmOffset的透视相机，参考平面与成像平面平行、轴向距离为d时：

`可见高度 = 2 × d × tan(fov / 2) / zoom`

这里的h是该距离处整个视野的世界高度；主体只占部分画面时，不能直接填主体高度。

要保持可见高度h，可改变d并用`fovForPlaneHeight(h, d, zoom)`计算垂直FOV；或固定fov，让distance/zoom保持比例。应用后更新投影矩阵，near/far覆盖全过程。参数由自己的尺度和构图决定，不靠极远距离制造精度或裁切问题。[相机定义](https://threejs.org/docs/pages/PerspectiveCamera.html)

`planeForDomRect({canvas, rect, distance, fov, zoom})`返回相机局部的`position`、`width`、`height`，使用canvas实际CSS边界和zoom，不把innerWidth当画布宽，也不把DPR乘进DOM坐标。宿主负责适配自己的场景层级与朝向，不能直接把结果当任意父级下的世界坐标。零尺寸目标返回null。

工具限于轴对齐DOM边界和居中透视；CSS旋转/skew、非居中视锥、斜参考面或非均匀父级缩放，需要按实际四角和投影矩阵处理。任意厚度模型也不因套上一个DOM矩形就能保持全部轮廓。

反过来把3D位置投成可操作HTML标签时，还需区分裁切、实体遮挡、正文避让和层叠；标签进入正文后的身份与合法返回目标按[场景与内容连续衔接](scene-content-continuity.md)处理，不以算出CSS坐标代替完整入口。

## 同一画布，多处内容窗口

先有可读HTML内容与稳定位置，只有对应3D层成功呈现后才接替静态图层；资源失败仍能阅读和操作。14islands的[2020作者文](https://develop.14islands.com/journal/progressive-enhancement-with-webgl-and-react)支持渐进增强与共享canvas；不采纳其中“屏幕尺寸代表算力”或框架未来稳定性的推测，也不据旧文确认当前部署。

`viewportForDomRect(canvasRect, elementRect)`返回两套CSS像素矩形：

- `viewport`保留整个内容窗口的位置/尺寸，`aspect`也取整个窗口；Y已转换为渲染器向上的方向。
- `scissor`是它与canvas的可见交集。部分滚出屏幕时只裁切，不拿交集重新拟合相机，避免画面随滚动改变比例。
- `visible=false`不绘制该窗口。按当前renderer版本传入逻辑像素；Three的像素比转换不要再重复一次。

绘制前清理正确区域，逐窗口设置相机/裁切，结束后恢复宿主所需状态；共享canvas不等于一个pass或自动更快。Three的[多场景说明](https://threejs.org/manual/pages/multiple-scenes.html)还讨论了快速滚动时固定画布的同步取舍。

renderer的逻辑尺寸也取canvas实际CSS宽高，与窗口矩形使用同一坐标系。若CSS画布排除了滚动条而setSize仍取innerWidth，viewport即使用正确矩形也会错位；检查CSS边界、逻辑尺寸与DPR后的backing尺寸是否对应。

## 测量与渲染各自失效

滚动可以基于已知布局更新位置；字体、媒体、展开或CSS变形改变边界时，需要重新测量。14islands的[固定源码](https://github.com/14islands/r3f-scroll-rig/tree/123663599e4b31af56f1845a19132d17e6a9b81f)区分缓存位置更新与重新测量；按框架真实reflow机制接入，不把本页当API替代。

静止窗口可按需绘制；过渡、控制或模拟仍在变化时继续更新，落定后收束。滚动/resize、布局和资源就绪需要重新请求画面。不能只画交互开始的一帧，也不为每个窗口另起永久循环。一个canvas仍可能有多个场景/后期pass，预算按实际负担判断。

## 在自己的内容上检查

走进入、反向、中途改意与返回；看身份、文字和遮挡。用实际Three投影检查参考平面四角，再在浏览器看全窗口、部分裁切与窄屏。几何通过不能代替材料与连续交接判断；减少动态可直接抵达，保留内容。

投影工具仅处理声明的几何与坐标条件，不是商业网站复刻。共享画布、相机交接和实际命中仍需在当前实现中验证；数值与截图不等于连续体验或用户接受。来源与归属见[来源说明](../SOURCES.md)。
