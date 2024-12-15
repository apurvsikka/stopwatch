const BaseURL = "https://anitaku.bz";
import * as Cheerio from "cheerio";
import CryptoJS from "crypto-js";

export const gogo = {
  name: "gogo",

  async scrapeTopAnime(page = 1, max = 10) {
    const response = await fetch(
      BaseURL + "/popular.html?page=" + page.toString(),
    );
    let html = await response.text();
    let $ = Cheerio.load(html);
    const popularAnime = [];

    $("ul.items li").each(function (i, elem) {
      $ = Cheerio.load($(elem).html());
      const anime = {
        title: $("p.name a").text() || null,
        releaseDate:
          $("p.released").text().replace("Released:", "").trim() || null,
        image: $("div.img img").attr("src") || null,
        link: BaseURL + $("div.img a").attr("href") || null,
        id: $("div.img a").attr("href").split("/category/")[1] || null,
      };
      popularAnime.push(anime);
    });
    return popularAnime.slice(0, max);
  },

  async searchAnime(name, page = 1) {
    const response = await fetch(
      "https://anitaku.bz/search.html?keyword=" + name + "&page=" + page,
    );
    let html = await response.text();
    let $ = Cheerio.load(html);
    const searchResults = [];

    $("ul.items li").each(function (i, elem) {
      let anime = {};
      $ = Cheerio.load($(elem).html());
      anime.title = $("p.name a").text() || null;
      anime.img = $("div.img a img").attr("src") || null;
      anime.link = $("div.img a").attr("href") || null;
      anime.id = anime.link.split("/category/")[1] || null;
      anime.releaseDate = $("p.released").text().trim() || null;
      if (anime.link) anime.link = `https://anitaku.bz` + anime.link;

      searchResults.push(anime);
    });

    return searchResults;
  },
  async getEpisode(id) {
    const link = `${BaseURL}/${id}`;

    const response = await fetch(link);
    let html = await response.text();
    let $ = Cheerio.load(html);
    const episodeCount = $("ul#episode_page li a.active").attr("ep_end");
    const iframe = $("div.play-video iframe").attr("src");
    const serverList = $("div.anime_muti_link ul li");
    const servers = {};
    serverList.each(function (i, elem) {
      elem = $(elem);
      if (elem.attr("class") != "anime") {
        servers[elem.attr("class")] = elem.find("a").attr("data-video");
      }
    });
    const ScrapedAnime = {
      name:
        $("div.anime_video_body h1")
          .text()
          .replace("at gogoanime", "")
          .trim() || null,
      episodes: episodeCount,
      stream: await getM3U8(iframe),
      servers,
    };

    return ScrapedAnime;
  },
  async getAnime(id) {
    let response = await fetch(BaseURL + "/category/" + id);
    let html = await response.text();
    let $ = Cheerio.load(html);
    let animeData = {
      name: $("div.anime_info_body_bg h1").text(),
      image: $("div.anime_info_body_bg img").attr("src"),
      id: id,
    };

    $("div.anime_info_body_bg p.type").each(function (i, elem) {
      const $x = Cheerio.load($(elem).html());
      let keyName = $x("span")
        .text()
        .toLowerCase()
        .replace(":", "")
        .trim()
        .replace(/ /g, "_");
      if (/plot_summary|released|other_name/g.test(keyName))
        animeData[keyName] = $(elem)
          .html()
          .replace(`<span>${$x("span").text()}</span>`, "");
      else animeData[keyName] = $x("a").text().trim() || null;
    });

    const animeid = $("input#movie_id").attr("value");
    response = await fetch(
      "https://ajax.gogocdn.net/ajax/load-list-episode?ep_start=0&ep_end=13&id=" +
        animeid,
    );
    html = await response.text();
    $ = Cheerio.load(html);

    let episodes = [];
    for (const element of $("ul#episode_related a")) {
      const name = $(element)
        .find("div")
        .text()
        .trim()
        .split(" ")[1]
        .slice(0, -3);
      const link = $(element).attr("href").trim().slice(1);
      episodes.push([name, link]);
    }
    episodes = episodes.reverse();
    animeData.episodes = episodes;

    return animeData;
  },
};

const keys = {
  key: CryptoJS.enc.Utf8.parse("37911490979715163134003223491201"),
  second_key: CryptoJS.enc.Utf8.parse("54674138327930866480207815084989"),
  iv: CryptoJS.enc.Utf8.parse("3134003223491201"),
};

/**
 * Parses the embedded video URL to encrypt-ajax.php parameters
 * @param {cheerio} $ Cheerio object of the embedded video page
 * @param {string} id Id of the embedded video URL
 */
async function generateEncryptAjaxParameters($, id) {
  // encrypt the key
  const encrypted_key = CryptoJS.AES["encrypt"](id, keys.key, {
    iv: keys.iv,
  });

  const script = $("script[data-name='episode']").data().value;
  const token = CryptoJS.AES["decrypt"](script, keys.key, {
    iv: keys.iv,
  }).toString(CryptoJS.enc.Utf8);

  return "id=" + encrypted_key + "&alias=" + id + "&" + token;
}
/**
 * Decrypts the encrypted-ajax.php response
 * @param {object} obj Response from the server
 */
function decryptEncryptAjaxResponse(obj) {
  const decrypted = CryptoJS.enc.Utf8.stringify(
    CryptoJS.AES.decrypt(obj.data, keys.second_key, {
      iv: keys.iv,
    }),
  );
  return JSON.parse(decrypted);
}

async function getGogoAuthKey() {
  const response = await fetch(
    "https://github.com/TechShreyash/TechShreyash/blob/main/gogoCookie.txt",
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 9; vivo 1916) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Mobile Safari/537.36",
      },
    },
  );
  const data = await response.json();
  const cookie = data["content"].replaceAll("\n", "");
  return cookie;
}
async function getGogoAuthKey() {
  const response =
    "YjprSTfuJcZeOdLwEH0Tjd%2Fp22ZLA4FP2SiU%2BRF2PhlECARLecP%2FnJF8bATxlNslkWwKE2sb5Tu6GiwoXeFe8g%3D%3D";
  return cookie;
}

async function GogoDLScrapper(animeid, cookie) {
  try {
    cookie = atob(cookie);
    const response = await fetch(`${BaseURL}/${animeid}`, {
      headers: {
        Cookie: `auth=${cookie}`,
      },
    });
    const html = await response.text();
    // const cheerio = require("cheerio");
    const body = Cheerio.load(html);
    let data = {};
    const links = body("div.cf-download").find("a");
    links.each((i, link) => {
      const a = body(link);
      data[a.text().trim()] = a.attr("href").trim();
    });
    return data;
  } catch (e) {
    return e;
  }
}

async function getM3U8(iframe_url) {
  let sources = [];
  let sources_bk = [];
  let serverUrl = new URL(iframe_url);

  const goGoServerPage = await fetch(serverUrl.href, {
    headers: { "User-Agent": USER_AGENT },
  });
  const $$ = Cheerio.load(await goGoServerPage.text());

  const params = await generateEncryptAjaxParameters(
    $$,
    serverUrl.searchParams.get("id"),
  );

  const fetchRes = await fetch(
    `${serverUrl.protocol}//${serverUrl.hostname}/encrypt-ajax.php?${params}`,
    {
      headers: {
        "User-Agent": USER_AGENT,
        "X-Requested-With": "XMLHttpRequest",
      },
    },
  );

  const res = decryptEncryptAjaxResponse(await fetchRes.json());
  res.source.forEach((source) => sources.push(source));
  res.source_bk.forEach((source) => sources_bk.push(source));

  return {
    Referer: serverUrl.href,
    sources: sources,
    sources_bk: sources_bk,
  };
}
