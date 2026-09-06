# splayer-plugin-met-music

基于 MeT-Music API 的 QQ 音乐 SPlayer-Next 音源插件 (`dev.splayer.meting-api`)。

## 功能特性

- **完美适配 SPlayer-Next 插件规范**：支持与 SPlayer-Next 官方音源路由标准无缝对接。
- **精确音质映射**：
  - `hi-res` -> 高解析度无损（Hi-Res FLAC）
  - `lossless` -> 标准无损（16-bit FLAC）
  - `hq` / `sq` -> 极高 / 标准品质（320kbps MP3）
  - `lq` -> 普通品质（128kbps AAC/M4A）
- **支持扩展音质偏好配置**：原生集成 SPlayer-Next 插件配置面板，可在应用内自主选择：
  - 臻品母带 (`QAI`)
  - 杜比全景声 (`Dolby Atmos`)
  - 臻品全景声 V2 (`Q360V2`)
  - 360 Reality Audio (`RA360`)
  - DTS:X (`DTSX`)
- **平滑降级容错**：当歌曲无对应超高音质或无损资源时，自动平滑回退，确保 100% 播放成功率。

## 安装与配置

1. 打开 SPlayer-Next，进入 **设置 -> 插件管理**。
2. 点击 **本地导入**，选择本插件脚本 `meting-api.js`。
3. 导入成功并启用后，点击插件卡片上的 **配置**（设置）按钮，即可自由设置「扩展音质偏好」。

