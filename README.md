# CAC Art Lab

## 项目目标

这是我的个人项目，由我负责设计与开发。

计划做一个比较人和 AI 艺术偏好的网页：先并排展示两幅不标作者和画名的画作，用户选择更喜欢的一幅，再查看 AI 裁判组的偏好、已有模型的预测和两幅画的特征差异。一轮结束后，比较用户与 AI 的选择一致程度，并回顾分歧画对。

## 当前完成

当前已完成 M1 的数据处理代码：固定抽样、数据关联、全部 28 个特征的差异计算、每对 top 3、60 条完整 JSON 和 106 张缩略图，并补齐检查工具、环境和文档。

**2026-09-11 实测：60→40→60 正式验收通过，最终恢复 N=60。** 每个设置都运行了两轮“生成→检查”，两种 N 的复现记录保存在检查器生成的 [verification.txt](verification.txt)，过程见 [devlog.md](devlog.md)。

M2 英文静态网页已完成：第一对画作与 JSON 对应，页面包含唯一主问题、英文提示、两张画作卡片、选择按钮及图片来源；支持宽屏并排、窄屏纵向排列和按钮悬停、键盘焦点样式。

M3 交互已完成：通过 JavaScript 加载 60 对真实数据，选择 A/B 后锁定按钮并显示用户、AI 裁判组和特征模型的偏好，再切换下一对。页面显示题号、已答数及两类偏好一致率，支持刷新恢复、重新开始和整轮完成提示。

2026-09-20 已检查前两题统计、选择后与 Next 后刷新、重置后刷新、连续完成 60 对，以及完成页恢复与重新开始。特征差异面板、分歧画对回顾、完整结果页、部署和赛事提交材料仍待完成。

## 数据来源

根据数据包说明，画作图片来自大都会艺术博物馆（The Metropolitan Museum of Art）Open Access，属于公有领域。原始数据及字段说明见 [Data/README.md](Data/README.md)。

M1 读取画作、特征、AI 裁判结果和模型预测，完成数据处理与导出；此阶段不训练模型，也不在线调用 AI 裁判。

| 文件 | 使用的内容 |
|---|---|
| `Data/paintings.json`、`Data/images/` | 300 幅画的元数据与原始图片 |
| `Data/pairs.json` | 594 个画对及 A、B 的画作 ID |
| `Data/silver.json` | 按 `pair_id` 关联的裁判组加权偏好 `q_A` |
| `Data/predictions.json` | 按 `pair_id` 关联的已有模型预测 `model_q_A` |
| `Data/features.json` | 每幅画的 28 个数值特征，画作 ID 的键为字符串 |
| `Data/votes/`、`Data/judge_weights.json` | 6 个 AI 裁判的原始投票与权重 |

以实际数据为准：图片分类包含 283 幅 Paintings、16 幅 Miniatures 和 1 幅 Pastels & Oil Sketches on Paper；裁判结果中有 1 对的 `n_judges=5`，其余为 6。原始说明中的概括不用于修改这些数据。

## 预览与使用网页

在 VS Code 打开现有 `cac-art-lab` 项目与 `web/index.html`，通过已安装的 Preview Web 入口打开预览。修改后保存文件，并在预览中确认效果。

宽窗口中两张画左右排列；预览区域缩窄到 700px 以下时上下排列。图片使用 `object-fit: contain` 保持完整与比例；鼠标悬停按钮可查看颜色变化，按 Tab 可查看焦点轮廓。

选择 A 或 B 后显示三方偏好，当前题只能记录一次选择。点击 Next pair 进入下一对；最后一对选择后，点击 Finish round 显示整轮完成提示和最终统计。Restart round 清空当前轮答案并回到第一对。

进度保存在当前浏览器的 localStorage 中，包含答案、当前题号和画对编号。选择之后与切换下一对之后都会保存；刷新会保留当前题的已答或未答状态，完成页也能恢复。请始终使用同一浏览器和同一个 HTTP 预览地址（包括端口）；不同地址或浏览器不会共享存档，不要直接双击 HTML 文件代替 HTTP 预览。若插件内嵌页面限制存储，可在外部浏览器打开插件提供的同一地址。

Restart round 只移除本应用的存档，不清空浏览器其他数据。坏存档会显示提示并允许重新开始；存储被禁止或已满时仍可继续答题，但页面会提示刷新可能丢失进度。数据加载失败时显示英文错误提示并禁用按钮，修复预览地址后刷新重试。

## 统计与状态说明

- 已答数取 `answers.length`，表示已经做出的选择；`currentIndex + 1` 只是当前题号，刚进入下一题时尚未回答。
- 两类一致率分别计算“用户与该类 AI 选择相同的次数 / 可比较的已答次数”。无可比较记录时显示 `No comparisons yet`；若某类 AI 为 Tie，仅从该类分母排除。这里不是正确率。
- 选择后保存答案和当前题号；Next 后再次保存题号，才能区分“当前题已答”和“下一题未答”。
- Restart round 同时清空内存中的状态与本地存档，避免刷新又恢复旧答案。

## 开发与提交

继续在同一个 `vincentliu0111-blip/cac-art-lab` 仓库开发，按真实进展 Commit 并 Push；旧的“只发布最新快照”做法已停止。Commit 将本次修改记录到本地历史，Push 才把提交上传到 GitHub；不为每节课或每次修改重新建仓库。

开发记录见 [devlog.md](devlog.md)。本周无需提交截图、evidence 目录或实验报告；下次课演示完整流程并解释对应代码。

## 如何运行 M1 数据处理（Mac，终端位于仓库根目录）

本次项目虚拟环境实测为 Python **3.9.6**、Pillow **11.3.0**；Pillow 版本记录在 `requirements.txt`。系统其他 Python 安装的版本不代表本项目环境。首次创建前用 `python3 --version` 确认所选解释器；复现本次环境时使用 Python 3.9.6。已有 `.venv` 时只需激活，不必重新创建。

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python --version
python -c "import PIL; print('Pillow==' + PIL.__version__)"
python Data/ReadData.py
python tools/check_m1.py
```

生成脚本读取 `Data/`，将完整 JSON 写入根目录下的 `web/app_data.json`，将缩略图写入 `web/img/`。图片字段保留裸文件名，例如 `76938.jpg`。原始 `Data/images/` 不作为输出目录。生成结束时只打印一行统计，例如：`Selected 60 pairs; 5 have q_A in [0.4, 0.6].`

正式检查按下面的顺序进行。每次修改 `Data/ReadData.py` 的 `N` 后保存，再运行同一组四条命令：

1. 设为 `N=60`。
2. 设为 `N=40`。
3. 恢复 `N=60`，并重新生成最终输出。

```bash
python Data/ReadData.py
python tools/check_m1.py
python Data/ReadData.py
python tools/check_m1.py
```

每个 N 都要重新生成并检查两轮，不能只重复运行检查器。第一轮建立或核对指纹，第二轮核对重新生成的内容是否一致。`verification.txt` 由检查器实际运行生成，保留 N=40 和 N=60 的“复现=通过”记录。

以下为 2026-09-11 在本地项目仓库的**实际验收结果**，与规定的检查值一致：

| 设置 | JSON 条数 | `0.4 <= q_A <= 0.6` 的条数 | JSON 引用的不同图片数 |
|---|---:|---:|---:|
| N=60 | 60 | 5 | 106 |
| N=40 | 40 | 3 | 75 |

N=40 时不必删除之前生成的缩略图；75 指当前 JSON 引用的图片数。最终必须同时保留 `N=60` 的代码和 60 条 JSON。

## 抽样与特征规则

- 从完整 594 对中，先按 `pair_id` 字符串升序排序，再用 `random.Random(7).sample(ordered, N)` 抽样；默认及最终 `N=60`。输出只遍历 `selected`，保留抽样返回的顺序，不再排序，也不按时期或分数另选样本。
- `q_A` 从 `silver.json` 读取，`model_q_A` 从 `predictions.json` 读取，两者都保留连续数值。区间统计使用 `q_A`，并包含 0.4 和 0.6 两个端点。
- 对全部 300 幅画的每个特征计算 `range = max - min`，共 28 项；不只用抽中的画计算范围。
- 对每一对的全部 28 个特征计算 `delta = A - B`，再计算 `scaled_delta = delta / range`；当 `range == 0` 时，`scaled_delta = 0.0`。差值保留正负号，排序前不四舍五入。
- 按 `abs(scaled_delta)` 降序排列；绝对值相同时，按特征名称升序排列。取前 3 项，输出 `name`、`group`、`delta`、`scaled_delta`。`O` 表示秩序，`R` 表示丰富，`N` 表示暂未归类；M1 对全部 28 个特征执行同一规则。
- 按选中画对涉及的文件名去重生成缩略图。调用 `make_thumbnail()`：Pillow 的 `Image.Resampling.LANCZOS`，保持比例、长边不超过 400 像素，转为 RGB，保存为 JPEG，`quality=88`。

## 为什么每对选择差异最大的 3 个特征

每对画的差别不同，固定同样 3 个特征可能漏掉这对画最明显的数据差异。先用每个特征的极差缩放 A−B，减少不同数值尺度的影响，再按缩放后差值的绝对值取前 3 项；正号表示 A 的数值更高，负号表示 B 更高。这是在描述差异，不是在证明模型为什么做出选择。

当前 60 对的 180 个 top 3 项中，O 有 52 项，R 有 47 项，N 有 81 项。M1 保留全部 28 个特征参与排序；后续界面计划为 O、R 使用两种颜色，并为 N 增加灰色“未归类”标签，不把 N 强行归入 O 或 R。该界面尚未实现。

## 代码结构与依赖

`Data/ReadData.py` 负责读取、索引、抽样和导出；`Data/m1_tasks.py` 实现特征差异和图片处理；`tools/check_m1.py` 检查输出并记录复现结果。

`web/index.html` 提供英文页面结构，`web/style.css` 提供布局、响应式和按钮状态样式；`web/app.js` 负责数据加载、选择与揭晓、题号、一致率、进度保存恢复、重新开始和完成提示。

Pillow 提供图片处理功能，实际使用的版本记录在 `requirements.txt`。代码修改与运行结果见 `devlog.md` 和 `verification.txt`。

## 已知限制

`q_A` 和 `model_q_A` 表示 AI 偏好及预测，不能当作客观审美评分。比较选择得到的是偏好一致率。特征差异只描述两幅画的数据差别，不是模型归因，也不能据此断言“模型因为这个特征选择 A”或“特征值越大就越美”。部分 `N_` 特征可能反映图片拍摄或存档条件。

本数据包没有完整训练过程或人类原始投票，因此不在这里宣称独立验证了训练隔离、人类对比结果或“机器审美优于人类”。M1 验收与网页上线、CAC 赛事最终提交是不同阶段。
