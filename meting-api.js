/**
 * @name        MeT-Music
 * @id          dev.splayer.meting-api
 * @version     1.0.2
 * @description 基于 MeT-Music API 的 QQ音乐 音源插件（支持 HQ/SQ/Hi-Res/杜比/臻品全景声/臻品母带等音质）
 * @author      1412
 * @type        source
 * @apiLevel    1
 */

splayer.register({
  sources: {
    tx: {
      name: "MeT-Music",
      actions: ["musicUrl"],
      qualities: ["hi-res", "lossless", "hq", "sq", "lq"],
    },
  },
});

/**
 * 音质 Level 映射表
 * 支持 SPlayer 标准音质标签与 API 扩展音质（HQ/SQ/RS/DTS/Q360V1/Q360V2/QAI/DTSX/RA360/DA）
 */
const QUALITY_MAP = {
  // SPlayer 标准音质标签
  "hi-res": "rs",
  lossless: "sq",
  hq: "hq",
  sq: "sq",
  lq: "hq",

  // API 原生音质级别（直接匹配）
  rs: "rs",
  dts: "dts",
  q360v1: "q360v1",
  q360v2: "q360v2",
  qai: "qai",
  dtsx: "dtsx",
  ra360: "ra360",
  da: "da",
};

splayer.on("musicUrl", async (req) => {
  const songId = req.musicInfo?.songmid || req.musicInfo?.id;
  if (!songId) throw new Error("缺少歌曲 ID");

  const qKey = String(req.quality || "").toLowerCase();
  const level = QUALITY_MAP[qKey] || qKey || "hq";
  const apiUrl = `https://music.met6.top:444/api/web/song/url/v1?id=${encodeURIComponent(songId)}&level=${encodeURIComponent(level)}&tamp=${Date.now()}`;

  const resp = await splayer.request(apiUrl, { responseType: "json" });
  const item = resp.body?.data?.[0];
  const url = item?.url;

  if (!url) throw new Error("获取音频链接失败");

  return {
    url,
    quality: req.quality,
  };
});
