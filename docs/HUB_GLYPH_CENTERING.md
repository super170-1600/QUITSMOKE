# 功能面图标调整

五个图标以各自切割主面的几何中心为目标，在面内坐标系下对整体轮廓包围盒居中。宽高相对原资产放大 1.65 倍；厚度单独放大 2.3 倍，保留部分嵌入玻璃的结构。精密倒角由 .001 增至 .002，金属粗糙度调整为 .21，以增强侧面和局部高光。04 仍无任何图标。

资产在 Blender 中修改并重新导出 GLB；六个面、faceId、navigationNormal、内部香烟、光效和 Phase 2 控制器保持原结构。

文件：新增 `scripts/blender/glyph_layout.py`、`scripts/blender/update_face_glyphs.py`，修改 `scripts/blender/build_seal_study.py`、`assets/blender/quitsmoke-seal-study.blend` 和 `public/models/quitsmoke-seal-study.glb`。更新脚本从原 blueprint 重新计算，可重复执行而不累积缩放。

验证：构建通过（保留已有包体积与混合导入警告）；浏览器五面键盘与鼠标选择、方向键、拖动不误确认、惯性停止及移动触控检查全部通过。截图更新于 `artifacts/hub-phase2/`；调整前后总览和打卡面保存在 `artifacts/hub-glyphs-centered/`。没有业务、数据库或 API 修改。
