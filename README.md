
## 特性

* 纯chrome extensions api实现，没有依赖外部组件ffmpeg

* 简约界面，支持中英双文国际化

* 支持HLS: .m3u8 playlist + .ts video files

* 支持HLS: .m3u8 playlist + _init.mp4 + .m4s video files

* 支持m3u8标准AES-128加密流

* 支持m3u8 Variant Stream

* 支持2种m3u8处理方式

* 支持主流视频、音频下载，不局限于web规范的视音频

* 支持自定义监控规则

* 全自动化，为下片而生

## 运行环境

* Windows操作系统

| chrome/chromium版本 | 3.0.0以下版本支持功能 | 3.0.0及以上版本支持功能 |
|-------|------|------|
| 52.0.2743.82 | 全部 | 未验证 |
| 56.0.2924.87 | 全部 | 未验证 |
| 59.0.3071.115 | 全部 | 未验证 |
| 60及以上 | 除部分网页不支持监控之外，其他都支持 | 除部分网页不支持监控之外，其他都支持 |

推荐使用chrome/chromium 59

* macOS操作系统

| chrome/chromium版本 | 操作系统 | 支持功能 |
|-------|------|------|
| 99.0.4844.51以下 | 所有 | 未验证 |
| 99.0.4844.51 | macOS Big Sur 11.6.4 | 不支持m3u8处理程序自动打开 |
| 99.0.4844.51以上 | 所有 | 未验证 |

## 使用教程

WeChat 1459669836

安装，扩展程序 > 打开 开发者模式 > 加载已解压的扩展程序，选择文件夹，加载后建议关闭 开发者模式

安装后显示插件图标

![readme](https://raw.githubusercontent.com/yangwk/m3u8-downloader/master/readme/01.png)

点击插件图标，查看插件弹窗

![readme](https://raw.githubusercontent.com/yangwk/m3u8-downloader/master/readme/02.PNG)

英文界面

![readme](https://raw.githubusercontent.com/yangwk/m3u8-downloader/master/readme/02-1.PNG)

打开视频网站，监控到多媒体，插件图标有绿色标记

![readme](https://raw.githubusercontent.com/yangwk/m3u8-downloader/master/readme/03.PNG)

插件弹窗导航到 监控 页面，点击 刷新，查看监控详情

![readme](https://raw.githubusercontent.com/yangwk/m3u8-downloader/master/readme/04.PNG)

输入保存的文件名，点击 下载

如果是m3u8媒体，并且使用m3u8处理器模式（阈值等于0），那么会优先下载m3u8处理程序

![readme](https://raw.githubusercontent.com/yangwk/m3u8-downloader/master/readme/05.PNG)

保留m3u8处理程序

![readme](https://raw.githubusercontent.com/yangwk/m3u8-downloader/master/readme/06.PNG)

下载完毕后会通知打开m3u8处理程序，点击 是

![readme](https://raw.githubusercontent.com/yangwk/m3u8-downloader/master/readme/07.PNG)

m3u8处理程序处理完毕后，会自动打开处理后的文件所处位置

![readme](https://raw.githubusercontent.com/yangwk/m3u8-downloader/master/readme/08.PNG)

更多设置

![readme](https://raw.githubusercontent.com/yangwk/m3u8-downloader/master/readme/09.PNG)

## 案例

* 音乐

![readme](https://raw.githubusercontent.com/yangwk/m3u8-downloader/master/readme/10.png)

* 视频

![readme](https://raw.githubusercontent.com/yangwk/m3u8-downloader/master/readme/11.png)

![readme](https://raw.githubusercontent.com/yangwk/m3u8-downloader/master/readme/13.png)

* 社交

![readme](https://raw.githubusercontent.com/yangwk/m3u8-downloader/master/readme/12.png)

## 注意事项

* 为了避免糟糕的下载体验，请关闭浏览器选项 设置 -> 高级 -> 下载内容 -> 下载前询问每个文件的保存位置

* 使用m3u8处理器模式下载m3u8时，浏览器会提示m3u8处理程序是一个有风险的文件，该处理程序安全可靠，请保留该文件，让下载继续

## 特殊技巧

* 主流视频网站，都会有广告视频，同样被监控到，可以根据监控详情的长度鉴别是否为广告（广告长度都很短）

* 同一个标签页，可能会监控到多个视音频，同样根据监控详情的长度鉴别哪个是下载目标

* 一些网站将视频和音频拆分，比如 YouTube，需要完整下载video和audio文件

* 一些网站会防止下载，比如 某b，解决方法是：将插件弹窗设置的 模拟环境 切换为 手机，刷新网站页面后即可监控下载
