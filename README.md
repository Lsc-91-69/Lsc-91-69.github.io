# 李尚禅 · 个人档案站

单页长滚动个人站。**七个板块，13 张可点开放大的原件**（实验记录表、实习推荐信、急救证书、奖牌、导盲眼镜现场照）。
零构建、零外部依赖：打开 `index.html` 就能看，丢到 GitHub Pages 就能上线。

---

## 怎么本地打开

最简单：双击 `index.html`。

想要更像线上环境（推荐，图片懒加载和相对路径都按真实情况走）：

```powershell
# 在本目录下
python -m http.server 8000
# 然后浏览器打开 http://127.0.0.1:8000/
```

## 文件结构

```
lishangchan-site/
├─ index.html          页面内容（所有文字都在这里，直接改）
├─ styles.css          设计系统与样式（令牌在文件顶部 :root）
├─ app.js              原件查看器 + 进场动效 + 滚动视差 + 背景音乐 + 导航高亮 + 深链
├─ assets/
│  ├─ plate/           版式用图（已按 3:4 / 3:2 / 1:1 裁好，页面里不再裁切）
│  ├─ full/            查看器用的大图（长边 1600px）
│  ├─ thumb/           首屏原件条用的小图
│  ├─ audio/           背景音乐（从本人的视频里抽出来的音轨）
│  ├─ brand/           头像
│  └─ fonts/           Instrument Serif + JetBrains Mono（OFL，附许可文件）
├─ PRODUCT.md          这个站是给谁看的、目标是什么、内容真实性来源表
├─ DESIGN.md           设计决策记录：设计读法、令牌、质量底线执行、偏离与原因、验证记录
├─ _config.yml         GitHub Pages 构建配置：把上面三份文档排除在发布内容之外
└─ README.md           本文件
```

> **`_config.yml` 是干什么的**：站点发布时，只有 `index.html`、`styles.css`、`app.js`、`assets/` 会被发布。
> `PRODUCT.md` / `DESIGN.md` / `README.md` 留在仓库里（GitHub 上照样能看），但**不会被发布成网页**——
> 否则任何人都能直接访问 `https://lsc-91-69.github.io/DESIGN.md` 读到设计笔记和待确认清单。
> 要改发布范围，编辑 `_config.yml` 的 `exclude` 列表。

## 怎么改内容

- **改文字**：全部在 `index.html` 里，按板块分好注释（`<!-- ===== 科研与实习 ===== -->`）。
- **改配色 / 字号 / 间距**：`styles.css` 顶部的 `:root` 令牌。改令牌就能改全站。
- **加一张原件**：把图放进 `assets/plate/`（版式）和 `assets/full/`（大图），然后照抄一段：

  ```html
  <figure class="plate js-exhibit" data-exhibit="my-id" data-reveal
          data-full="assets/full/my-id.jpg"
          data-caption="查看器里的说明文字"
          data-meta="图 14 · 出处 · 日期">
    <button class="plate-btn" type="button">
      <span class="mat"><span class="media">
        <img src="assets/plate/my-id.jpg" alt="图片说明" width="900" height="1200" loading="lazy">
      </span></span>
    </button>
    <figcaption>
      <span class="fig-no">图 14</span>
      <span>列表里的短标题<span class="cap-meta">一行元数据</span></span>
    </figcaption>
  </figure>
  ```

  查看器的翻页顺序 = 这些 `<figure>` 在页面里出现的先后顺序。`data-exhibit` 是深链用的 id：
  `index.html#exhibit-my-id` 可以直接打开某一张原件。

## 上线到 GitHub Pages

1. 新建仓库，建议命名 `Lsc-91-69.github.io`（这样地址就是 `https://lsc-91-69.github.io/`）；
   如果叫别的名字，地址会是 `https://lsc-91-69.github.io/仓库名/`。
2. 把本目录里的**所有文件**推到仓库根目录（`index.html` 必须在根目录）。
3. 仓库 Settings → Pages → Source 选 `Deploy from a branch`，分支选 `main`，目录选 `/ (root)`。
4. 等一两分钟，访问上面的地址。

> 全部是静态文件，不需要构建步骤，也不需要 Node。

## 中英双语

导航右上角有「中 / EN」开关，点一下整站换语言，选择记在浏览器里（`localStorage` 的 `lsc-lang`），
下次打开还是上次那个。**第一次来的访客**：浏览器语言不是中文就直接显示英文，省一步点击。

**中文写在元素里，英文写在属性上**，两种语言挨着放，改的时候不用跳文件：

| 属性 | 管什么 | 例子 |
|---|---|---|
| `data-en` | 元素里的文字（可以嵌 HTML，用来保留 `<span class="mono">` 这类标记） | `<h2 data-en="About">关于</h2>` |
| `data-en-alt` | 图片的 `alt` | `<img alt="奖牌" data-en-alt="Medals">` |
| `data-en-aria` | `aria-label`（读屏用） | `<nav aria-label="板块导航" data-en-aria="Section navigation">` |
| `data-en-caption` / `data-en-meta` | 查看器里只读给屏幕阅读器的图注与出处 | 写在 `<figure class="js-exhibit">` 上 |

**加一句新的双语文案**：中文照常写，再挂一个 `data-en` 属性就行。

```html
<p data-en="I am 16, in Grade 11.">我 16 岁，读高二。</p>
```

**几处刻意不翻译**：左上角品牌字「李尚禅」、背景音乐的曲名（曲名在 `app.js` 的 `TRACKS` 里用
`titleEn` 单独写）、姓名区（英文模式下 `Danny Li` 变大标题、中文名缩成小注，靠 `styles.css`
里的 `html[lang="en"] .name` 两条规则实现，不是换文字）。

> 写英文属性时的两个坑：属性里的 `&` 要写成 `&amp;`；要在属性里嵌 HTML，双引号写成 `&quot;`。

## 背景音乐

右下角有个开关，**点一下才开始播**——浏览器本来就禁止网页自动出声，所以默认是关的，这是设计不是故障。
四段音频随机播放，每首结束前 1.8 秒淡出、下一首淡入（不重叠），开关关掉时也会淡出。

音频来自本人拍摄的视频（`lsc_information/` 里那四个 mp4）：抽出音轨、统一响度到 −16 LUFS、压成 128 kbps mp3。

| 文件 | 来源视频 | 时长 |
|---|---|---|
| `assets/audio/daotangzhu.mp3` | 🍬捣 唐 猪🍬(整完版).mp4 | 2:02 |
| `assets/audio/tangtumengjin.mp3` | 🍬糖突猛进🍬：路人乐队的组成方法.mp4 | 1:24 |
| `assets/audio/haotang-xiongdi.mp3` | 🍬好 唐，兄 弟🍬.mp4 | 1:16 |
| `assets/audio/shuizhao.mp3` | 听完能睡着的是神😂.mp4 | 0:32 |

**换歌 / 加歌**：把新的 mp3 放进 `assets/audio/`，再改 `app.js` 里「3. 背景音乐」那一段的 `TRACKS` 数组，一行一首：

```js
var TRACKS = [
  { src: 'assets/audio/文件名.mp3', title: '界面上显示的名字' },
  // ...
];
```

页面上的 `<audio>` 写了 `preload="none"`：不点开关，一个字节都不会下载。

> **版权提醒**：这四段音频是本人视频里的声音。如果视频里用的是别人的音乐（抖音热门曲之类），
> 放到公开站点上严格来说是侵权的——自己拍的、自己弹的、或用无版权音乐就没问题。

## 素材与许可

- **照片与文件**：实验记录表、实习推荐信、急救证书、奖牌、现场照片均由李尚禅本人提供。
  站点**不做修图、不做旋转矫正**——档案不该修饰证据。构图问题用版式裁切和衬纸解决。
- **字体**：中文使用系统字体（Noto Serif SC / Noto Sans SC / 思源系列 / 苹方 / 微软雅黑）。
  拉丁标题 **Instrument Serif**、等宽 **JetBrains Mono** 为自托管 OFL 字体，许可原文见
  `assets/fonts/LICENSES.txt`。
- **GitHub 数据**（仓库名、描述、star、协议、日期）抓取于 2026-10-10，重跑
  `https://api.github.com/users/Lsc-91-69/repos` 可以核对。

## 已知限制

1. **中文没有自托管 webfont**。CJK 字体动辄数 MB，不适合静态站自托管；用系统字体栈。
   代价：Android 上中文衬线可能回退成黑体。
2. **没有深色模式**。这个世界的本体是纸；反色版本会让「原件」读起来像截图。
3. **图片是手机拍的**（部分带 HUAWEI P60 水印），没有做后期。
4. 首屏原件条里的四张图与正文中的展品是同一批（同一编号），不是重复内容。
