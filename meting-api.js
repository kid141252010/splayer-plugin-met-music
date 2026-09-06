/**
 * @name        MeT-Music
 * @id          dev.splayer.meting-api
 * @version     1.1.1
 * @description 基于 MeT-Music API 的 QQ音乐 音源插件（支持自定义服务端/优先臻品母带/杜比全景声/Hi-Res/无损等音质）
 * @author      1412
 * @homepage    https://github.com/kid141252010/splayer-plugin-met-music
 * @updateUrl   https://raw.githubusercontent.com/kid141252010/splayer-plugin-met-music/main/meting-api.js
 * @type        source
 * @apiLevel    2
 */

splayer.register({
  sources: {
    tx: {
      name: "MeT-Music",
      actions: ["musicUrl"],
      qualities: ["hi-res", "lossless", "hq", "sq", "lq"],
    },
  },
  // 注入 SPlayer-Next 设置面板，允许用户在播放器界面自主配置
  settings: [
    {
      key: "apiUrl",
      type: "text",
      label: "API 基础地址",
      description: "MeT-Music 服务端地址（例如：https://example.com:444）",
      default: "",
      placeholder: "https://your-met-music-api.com",
    },
    {
      key: "preferredEffect",
      type: "select",
      label: "扩展音质偏好",
      description: "播放高品质/Hi-Res时优先尝试获取的音质。如无资源将自动平滑降级",
      default: "auto",
      options: [
        { label: "跟随播放器默认 (Hi-Res/SQ/HQ)", value: "auto" },
        { label: "优先 臻品母带 (QAI)", value: "qai" },
        { label: "优先 杜比全景声 (Dolby Atmos)", value: "da" },
        { label: "优先 臻品全景声 V2 (Q360V2)", value: "q360v2" },
        { label: "优先 360 Reality Audio (RA360)", value: "ra360" },
        { label: "优先 DTS:X (DTSX)", value: "dtsx" },
      ],
    },
  ],
});

/**
 * SPlayer-Next 官方 5 档标准音质到 MeT-Music API 的精确对齐表
 * - hi-res   : 高解析度无损 (Hi-Res) -> API: rs
 * - lossless : 标准无损 (16bit FLAC) -> API: sq
 * - hq       : 极高有损 (320kbps MP3) -> API: hq
 * - sq       : 标准有损 (SPlayer 中为 Standard Quality 192k) -> API: hq
 * - lq       : 普通有损 (128kbps AAC/M4A) -> API: web
 */
const SPLAYER_QUALITY_TO_API = {
  "hi-res": "rs",
  lossless: "sq",
  hq: "hq",
  sq: "hq",
  lq: "web",
};

/**
 * 向 MeT-Music 请求单曲播放直链
 */
async function fetchSongUrl(baseUrl, songId, level) {
  const cleanBase = baseUrl.replace(/\/+$/, "");
  const apiUrl = `${cleanBase}/api/web/song/url/v1?id=${encodeURIComponent(songId)}&level=${encodeURIComponent(level)}&timestamp=${Date.now()}`;
  const resp = await splayer.request(apiUrl, { responseType: "json", timeout: 15000 });
  const item = resp.body?.data?.[0];
  return item?.url || "";
}

splayer.on("musicUrl", async (req) => {
  // 防御性校验源
  if (req.source && req.source !== "tx") {
    throw new Error(`[MeT-Music] 不支持的源类型: ${req.source}`);
  }

  const rawBaseUrl =
    (typeof splayer.getSetting === "function" ? splayer.getSetting("apiUrl") : "") || "";
  const baseUrl = String(rawBaseUrl).trim();

  if (!baseUrl) {
    throw new Error("[MeT-Music] 未配置 API 基础地址，请在 SPlayer 插件管理中点击「配置」填写服务端 URL");
  }

  const songId = req.musicInfo?.songmid || req.musicInfo?.id;
  if (!songId) throw new Error("[MeT-Music] 缺少歌曲 ID (songmid)");

  const splayerQuality = String(req.quality || "hq").toLowerCase();
  const preferredEffect =
    (typeof splayer.getSetting === "function" ? splayer.getSetting("preferredEffect") : null) ||
    "auto";

  // 构建尝试音质候选队列：扩展音质偏好 -> 目标标准音质 -> 降级兜底队列
  const candidateLevels = [];

  // 当用户在插件配置中开启了高阶扩展音质，且当前播放等级为 hi-res 或 lossless 时优先尝试
  if (preferredEffect !== "auto" && (splayerQuality === "hi-res" || splayerQuality === "lossless")) {
    candidateLevels.push(preferredEffect);
  }

  // 加入当前播放器所请求的标准音质映射
  const baseLevel = SPLAYER_QUALITY_TO_API[splayerQuality] || "hq";
  if (!candidateLevels.includes(baseLevel)) {
    candidateLevels.push(baseLevel);
  }

  // 兜底降级队列（若高音质无资源，平滑回退，确保 100% 播放成功）
  const fallbackChain = ["sq", "hq", "web"];
  for (const fb of fallbackChain) {
    if (!candidateLevels.includes(fb)) {
      candidateLevels.push(fb);
    }
  }

  let finalUrl = "";
  let mismatchedMasterUrl = ""; // 记录被服务端强行降级为臻品母带的直链，仅在所有常规音质均无资源时兜底使用

  for (const level of candidateLevels) {
    try {
      const url = await fetchSongUrl(baseUrl, songId, level);
      if (url) {
        const fileName = (url.split("?")[0] || "").split("/").pop() || "";
        // 若当前请求的并非臻品母带 (qai)，但服务端返回了以 AI00 开头的母带文件（如请求 da 时服务端私自回退为 AI00），
        // 则视为当前档位未命中，跳过并继续尝试降级链中的标准无损/高品质音质
        if (level !== "qai" && /^AI00/i.test(fileName)) {
          if (!mismatchedMasterUrl) mismatchedMasterUrl = url;
          continue;
        }
        finalUrl = url;
        break;
      }
    } catch {
      // 当前档位请求失败，平滑尝试下一个档位
    }
  }

  // 若常规音质全部未命中但存在母带，最后作为保底避免播放失败
  if (!finalUrl && mismatchedMasterUrl) {
    finalUrl = mismatchedMasterUrl;
  }

  if (!finalUrl) {
    throw new Error("[MeT-Music] 获取音频链接失败或歌曲未上架");
  }

  return {
    url: finalUrl,
    quality: req.quality,
  };
});
