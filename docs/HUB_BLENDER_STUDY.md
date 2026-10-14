# QUITSMOKE 双层封印：Blender 资产与实时光照评估

本轮是 Phase 1.5 的美术结构样板与资产管线验证。已经使用真正的 Blender 4.5.9 LTS 创建、保存、重新打开并导出资产，网页通过 Three.js GLTFLoader 加载 GLB。尚未达到封面概念图的视觉品质，不能把管线验证通过等同于视觉验收通过。未进入 Phase 2，未修改数据库、API、统计、认证、业务 store 或权限守卫；保留其他未提交修改。

## 封面光效能否复用

当前首页不是整套实时玻璃模型。`LandingView.vue` 与 `sculptureScene.ts` 使用 `public/images/breath-portal-v3.webp` 和净化版本图片作为底图，再通过 shader 做扰动、光圈响应和消散。因此底图里的折射、地面焦散、细密光丝已经包含在像素中。

晶体可以采用相同的暖白背景、暖金主光、银蓝轮廓、高光节奏与粒子语言。仅复制光圈代码不会产生底图里的折射层次。本轮加入实际 HDR 环境和仅参与反射的三块窄灯板，避免通过提高曝光或 Bloom 将整幅图漂白。距离目标仍有差距：当前丝带较像金属叶片，外壳还偏盒状，地面没有封面那样的焦散和投影。这些是明确未解决的美术问题。

下一轮美术重点应当先在 Blender 固定机位下确定非规则轮廓、丝带扭转截面、烟与流线方向，以及大面积柔光/细条高光/局部暗反射的关系，再导出网页对照。封面地面光纹可以烘焙成贴图或在实时场景近似生成；烘焙结果只对选定灯光和姿态成立，不能宣称任意角度下都是真实焦散。静态底图可以直接维持封面品质，但它不能替代需要独立面选择和分离的导航模型。

## 资产与结构

- 原生可编辑文件：`assets/blender/quitsmoke-seal-study.blend`。包含评估工作室、模型、纸张法线图和 HDR。Blender 自动生成的 `.blend1` 是本轮备份。
- 网页资产：`public/models/quitsmoke-seal-study.glb`，1,586,804 字节，模型与纹理内嵌，不包含评估工作室。
- 环境：`public/environments/studio_small_09_1k.hdr`，1,615,248 字节；来源与 CC0 许可见同目录 ATTRIBUTION.md。
- 根节点：`QUITSMOKE_SealStudy`。分组：NavigationShell、CigaretteCore、OpticalSeal、ModuleGlyphs。
- 外层沿用已有 6 主面、12 边切与 6 角切的基础布局。每面单独有厚度、细小倒角和局部原点；没有增加粗框。此布局仍需要进一步美术雕琢，尚不能说已经摆脱骰子/盒子印象。
- 主面 ID：checkin、progress、achievements、reserved、support、profile。reserved 对应 04，无标识，selectable=false。所有六个主面都是独立网格，可为后续动画保留选择与分离数据；本轮未开发选择或分离交互。
- 香烟倾斜悬浮，纸张带内嵌法线，过滤嘴保留细小纹理；删除完整灰色端盖，以局部碎裂和粒子流替代。
- 三条非闭合螺旋丝带，每条 100 段、12 点椭圆横截面，具有真实宽度和厚度，端点靠近内壁并保留 anchorFaceId/anchorPosition；两片独立透明晶片。香烟前方宽度平滑减弱，避免遮挡。
- 230 个黑色碎片合并为一个网格，粗/中/细三种尺度，沿上升空间曲线扩散。它们是静态雕塑的一部分，不是实时粒子动力学。
- 五个原有立体标识减小并靠近表面，背向相机时隐藏。04 完全空白。

## 两套实时材质比较

| 项目 | physical：物理透射 | hybrid：内部可见性优先（当前默认） |
| --- | --- | --- |
| 外层 | transmission=1、opacity=1 | transmission=0、transparent=true |
| 主面/切面 alpha | 不使用 alpha 窗口 | .22 / .40，加视角相关 Fresnel alpha |
| IOR / roughness | 1.46 / .015 | 外壳不计算折射；粗糙度 .015 |
| 壁厚 | .025 / .032 场景单位 | 几何保留厚度，着色为透明反射近似 |
| 内部丝带 | transmission=.35、roughness=.035 | 同左 |
| 内部晶片 | transmission=.90、roughness=.025 | 同左 |
| 结果 | 外壳层次较实，但内部透明丝带明显丢失 | 香烟与丝带可见，但外壳真实折射不足 |

两套均为 FrontSide，玻璃 depthWrite=false；物理方案外层不是 alpha 混合。真实 HDR 经 PMREM 预滤波；环境旋转 .65，暖向光 1.6、冷向光 .9、半球光 .6。增加三块反射灯板：暖金竖条、银蓝竖条、暖白横条，辐亮度倍率 5/4/3，仅进入环境贴图。NeutralToneMapping，exposure=1；无 Bloom。大背景渐变只作背景，不承担玻璃反射。

这是明确的折衷：Three.js 当前常规屏幕空间透射管线不能保证任意叠层透明物体均可见，也不是离线路径追踪。GLB 能传递网格、法线、UV 和受支持的 PBR 参数，不能自动搬运 Cycles 世界光、多次反射与焦散。此次 physical 与 hybrid 的同机位截图实测显示这个差别。不能把 hybrid 称为完全真实光学玻璃。

参考：[Three.js MeshPhysicalMaterial](https://threejs.org/docs/pages/MeshPhysicalMaterial.html)、[Blender glTF 导入导出](https://docs.blender.org/manual/en/dev/addons/scene_gltf2.html)、[Poly Haven 许可](https://polyhaven.com/license)。

## 对比验收文件

`artifacts/seal-study-review/index.html`：同一 overview 机位、1440×900、DPR 1，八张网页截图。每行 physical / hybrid 对照：

| 组 | 内容 |
| --- | --- |
| A | 只有导航外壳 |
| B | 外壳 + 香烟与碎片流 |
| C | 再加晶片与立体丝带 |
| D | 再加五个功能标识 |

`artifacts/blender-study/cycles-reference.png` 是实际 Cycles 离线渲染，960×600、32 samples、降噪、12 次透射/总反弹；与网页截图分开标注。它也不是最终 CGI 美术成品。`artifacts/seal-study-regression/index.html` 包含正面、侧面、背面、顶部、六个功能面及手机截图。

预览入口（仅开发环境）：`/#/__hub-preview?view=overview&stage=D&scheme=hybrid`。可选择 stage=A/B/C/D、scheme=physical/hybrid、已有固定 view。生产 `/hub` 不暴露这些验收参数。没有增加导航侧栏、宣传文字或开始按钮。

## 文件级变更

| 文件 | 用途 |
| --- | --- |
| src/views/HubView.vue | 异步加载 GLB 场景；保留极简页头和异常降级 |
| src/visuals/hubAssetScene.ts | 本地 GLB/HDR、两套材质、阶段可见性、固定角度、资源释放 |
| src/visuals/modelBlueprint.ts | 从现有导航面、香烟和标识生成 Blender 起始蓝图；不进入产品运行路径 |
| src/visuals/hubAsset.test.ts | 校验实际 GLB 结构、六面 ID、04 空白、丝带体积、锚点和内嵌纹理 |
| scripts/prepare-blender-study.mjs | 导出建模蓝图 |
| scripts/blender/build_seal_study.py | 建立原生模型、导出 GLB、保存 .blend、生成离线参考 |
| scripts/blender/export_seal_asset.py | 从修改后的 .blend 重导出，只选择模型树，排除工作室 |
| scripts/verify-seal-study.mjs | 截取 A–D 和双材质对照，检查加载与 shader 错误 |
| assets/blender / public/models / public/environments | 原生模型、实时资产与环境许可 |
| docs/HUB_BLENDER_STUDY.md | 本轮评估和交付说明 |

旧 hubScene/hubAtmosphere 与前阶段记录保留用于比较；最新默认入口加载 hubAssetScene。既有 package、router 等未提交修改未被清理，本轮未增加 npm 依赖。

## 编辑与重导出

以下命令从项目根目录运行；Blender 路径指向忽略的便携工具目录，不要求系统安装。

```powershell
node scripts/prepare-blender-study.mjs
& 'artifacts/blender-runtime/blender-4.5.9-windows-x64/blender.exe' -b --python scripts/blender/build_seal_study.py
```

build 脚本会重新生成样板并覆盖样板 .blend/GLB。人工美术修改后应使用下面的 export 命令，**不要重新运行 build 覆盖修改**。保持根节点、6 个独立面及 faceId、assetRole、navigationNormal 数据；调整主面方向时同步更新导航法线与中心数据。

```powershell
& 'artifacts/blender-runtime/blender-4.5.9-windows-x64/blender.exe' -b assets/blender/quitsmoke-seal-study.blend --python scripts/blender/export_seal_asset.py
node scripts/verify-seal-study.mjs
npm test
npm run build
```

## 验证、性能与限制

已有测试加资产测试：28 个测试文件、124 项通过；类型检查与 Vite 构建通过。构建仍提示已有大 chunk 与混合动态/静态 import。八张 A–D 截图无页面或 shader 错误。固定角度、手机、WebGL context loss 降级、公开封面，以及 9 个匿名受保护路径的重定向均通过；未用真实登录账号执行数据库写入或后端权限测试。

完整 hybrid overview：约 58,346 三角形、81 draw calls、6 textures，DPR 1 验收条件。physical overview：59,246 三角形、84 calls。未测硬件帧率，不能承诺低端手机 60 FPS；物理透射还有额外渲染开销，三角形数不能代表全部成本。GLB+HDR 首次资源约 3.20 MB（十进制）；实时场景 JS 最终构建约 54.73 KB、gzip 17.61 KB。移动 DPR 限制为 1.4，桌面 1.75；减少动态偏移并处理隐藏页面与资源销毁。

结论：Blender→GLB→Three 的编辑与展示路径已经可用，但建模与实时光照仍需艺术制作。当前样板不应进入 Phase 2 作为已定稿视觉。先验收轮廓、透明层次和封面风格的光场；本轮完成后暂停。

