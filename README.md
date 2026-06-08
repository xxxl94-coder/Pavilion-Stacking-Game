# 展馆叠叠乐

一个纯前端网页小游戏 Demo，适合部署到 GitHub Pages。

## 在线玩法

- 点击“开始游戏”进入倒计时。
- 楼层开始左右移动后，需要在顶部操作进度条走完前点击“主播落层”。
- 系统根据当前楼层和上一层的重叠比例判定 `Perfect / Good / Normal / Fail`。
- 点赞、弹幕、礼物按钮可以增加建设能量，降低操作难度。
- 自动模式会在倒计时结束前自动落层，适合录制演示视频。

## 文件结构

```text
index.html
styles.css
game.js
手感参数说明.md
assets/
```

## 后续优化方向

- 把 emoji 工人替换成统一风格图片素材。
- 增加真实展馆楼层材质和礼物光效。
- 调整 `game.js` 顶部的 `CONFIG` 来改变速度、判定和倒计时。
- 增加移动端横屏提示和触控优化。

## GitHub Pages

这个项目不需要构建工具。发布时在 GitHub Pages 里选择：

- Source: `Deploy from a branch`
- Branch: `main`
- Folder: `/root`

保存后，GitHub 会生成一个可访问的网址。
