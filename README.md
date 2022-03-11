
## 特性

* 纯chrome extensions api实现，没有依赖外部组件ffmpeg

* 简约界面，支持中英双文国际化

* 支持m3u8原子下载，任何一个ts下载失败，都会停止下载，避免文件不完整

* 支持主流视频、音频下载，不局限于web规范的视音频

* 全自动化，为下片而生

## 运行环境

* Windows操作系统

| chrome/chromium版本 | 支持功能 |
|-------|------|
| 52.0.2743.82 | 全部 |
| 56.0.2924.87 | 全部 |
| 59.0.3071.115 | 全部 |
| 60及以上 | 除部分网页不支持监控之外，其他都支持 |

推荐使用chrome/chromium 59

* macOS操作系统

| chrome/chromium版本 | 操作系统 | 支持功能 |
|-------|------|------|
| 99.0.4844.51以下 | 所有 | 未验证 |
| 99.0.4844.51 | macOS Big Sur 11.6.4 | 不支持m3u8处理程序自动打开 |
| 99.0.4844.51以上 | 所有 | 未验证 |


## m3u8播放列表解析局限性

not support encrypted stream

not support EXT-X-STREAM-INF for Variant Stream

## 使用教程

WeChat 1459669836

安装，扩展程序 > 打开 开发者模式 > 加载已解压的扩展程序，选择文件夹，加载后建议关闭 开发者模式

安装后显示插件图标

![readme](https://raw.githubusercontent.com/yangwk/m3u8-downloader/master/readme/01.png)

点击插件图标，查看插件弹窗

![readme](https://raw.githubusercontent.com/yangwk/m3u8-downloader/master/readme/02.PNG)

英文界面

![readme](https://raw.githubusercontent.com/yangwk/m3u8-downloader/master/readme/02-1.PNG)

打开视频网站，监控到视频或音频，插件图标有绿色标记

![readme](https://raw.githubusercontent.com/yangwk/m3u8-downloader/master/readme/03.PNG)

插件弹窗导航到 监控 页面，点击 刷新，查看监控详情

![readme](https://raw.githubusercontent.com/yangwk/m3u8-downloader/master/readme/04.PNG)

输入保存的文件名，点击 下载，如果是m3u8媒体，那么会优先下载m3u8处理程序

![readme](https://raw.githubusercontent.com/yangwk/m3u8-downloader/master/readme/05.PNG)

如果是m3u8媒体，保留m3u8处理程序

![readme](https://raw.githubusercontent.com/yangwk/m3u8-downloader/master/readme/06.PNG)

如果是m3u8媒体，下载完毕后会通知你打开m3u8处理程序，点击 是

![readme](https://raw.githubusercontent.com/yangwk/m3u8-downloader/master/readme/07.PNG)

如果是m3u8媒体，m3u8处理程序处理完毕后，会自动打开处理后的文件所处位置

![readme](https://raw.githubusercontent.com/yangwk/m3u8-downloader/master/readme/08.PNG)

更多设置

![readme](https://raw.githubusercontent.com/yangwk/m3u8-downloader/master/readme/09.PNG)

## 注意事项

* 为了避免糟糕的下载体验，请关闭浏览器选项 设置 -> 高级 -> 下载内容 -> 下载前询问每个文件的保存位置

* 下载m3u8时，浏览器会提示m3u8处理程序是一个有风险的文件，该处理程序安全可靠，请保留该文件，让下载继续

* 下载m3u8时，在没有全部下载完毕前，不可以删除该m3u8的任何下载记录（在浏览器的下载内容里操作）

## 特殊技巧

* 主流视频网站，都会有广告视频，同样被监控到，可以根据监控详情的长度鉴别是否为广告（广告长度都很短）

* 同一个标签页，可能会监控到多个视音频，同样可根据监控详情的长度鉴别哪个是下载目标

* 一些网站会防止下载，比如 某b，解决方法是：将插件弹窗设置的 模拟环境 切换为 手机，刷新网站页面后即可监控下载
