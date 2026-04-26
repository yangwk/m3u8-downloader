
## 特性

* 支持中英双文国际化

* 支持HLS标准AES-128加密流

* 支持HLS直播

* 支持2种m3u8处理方式

* 支持视频、音频、字幕独立下载

* 支持自定义监控规则

## 运行环境

* 浏览器

基于Chromium

* 扩展程序

Manifest version 2

## 使用教程

WeChat 1459669836

浏览器设置 扩展程序 > 打开 开发者模式 > 加载已解压的扩展程序，选择文件夹，加载扩展程序后建议关闭 开发者模式

安装后显示扩展程序图标

![readme](https://raw.githubusercontent.com/yangwk/m3u8-downloader/master/readme/001.png)

点击扩展程序图标，查看扩展程序弹窗

![readme](https://raw.githubusercontent.com/yangwk/m3u8-downloader/master/readme/002.png)

打开视频网站，监控到媒体，扩展程序图标有绿色标记

![readme](https://raw.githubusercontent.com/yangwk/m3u8-downloader/master/readme/003.png)

扩展程序弹窗导航到 监控 页面，点击 刷新，查看监控详情

![readme](https://raw.githubusercontent.com/yangwk/m3u8-downloader/master/readme/004.png)

输入保存的文件名（可选），点击 下载

如果下载m3u8媒体，并且使用m3u8处理器，那么下载完成时下载m3u8处理器

保留m3u8处理器

![readme](https://raw.githubusercontent.com/yangwk/m3u8-downloader/master/readme/005.png)

通知运行m3u8处理器，点击 是

![readme](https://raw.githubusercontent.com/yangwk/m3u8-downloader/master/readme/006.png)

m3u8处理器运行完毕后，自动打开处理后的文件所处目录

![readme](https://raw.githubusercontent.com/yangwk/m3u8-downloader/master/readme/007.png)

## 应用案例

* 音乐

![readme](https://raw.githubusercontent.com/yangwk/m3u8-downloader/master/readme/008.png)

* 直播

![readme](https://raw.githubusercontent.com/yangwk/m3u8-downloader/master/readme/009.png)

## 注意事项

* 为了避免糟糕的下载体验，请关闭浏览器 设置 -> 高级 -> 下载内容 -> 下载前询问每个文件的保存位置

* 浏览器提示m3u8处理器是一个有风险的文件，该文件安全可靠，请保留该文件让下载继续

* 仅Windows操作系统支持自动运行m3u8处理器，其他操作系统需要手动运行

## 特殊技巧

* 根据监控详情的长度，鉴别哪个媒体是下载目标

* 一些网站将视频、音频、字幕分开，需要分别下载video和audio和subtitles文件

* 一些网站防止下载，解决方法：将扩展程序弹窗设置 模拟环境 切换为 手机，刷新网站即可监控下载

* m3u8结果文件处理，忽略阈值使用m3u8处理器，完整下载原始数据，更适合超大文件或二次处理场景

* 开启代理地址，使用外部程序下载
