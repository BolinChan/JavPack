// ==UserScript==
// @name            JavDB.match115
// @namespace       JavDB.match115@blc
// @version         0.0.1
// @author          blc
// @description     115 网盘匹配
// @match           https://javdb.com/*
// @icon            https://javdb.com/favicon.ico
// @require         https://github.com/bolin-dev/JavPack/raw/main/libs/JavPack.Grant.lib.js
// @require         https://github.com/bolin-dev/JavPack/raw/main/libs/JavPack.Magnet.lib.js
// @require         https://github.com/bolin-dev/JavPack/raw/main/libs/JavPack.Req.lib.js
// @require         https://github.com/bolin-dev/JavPack/raw/main/libs/JavPack.Req115.lib.js
// @require         https://github.com/bolin-dev/JavPack/raw/main/libs/JavPack.Util.lib.js
// @connect         115.com
// @run-at          document-end
// @grant           GM_xmlhttpRequest
// @grant           GM_deleteValues
// @grant           GM_deleteValue
// @grant           GM_listValues
// @grant           unsafeWindow
// @grant           GM_openInTab
// @grant           GM_getValue
// @grant           GM_setValue
// @grant           GM_info
// @require         https://github.com/Tampermonkey/utils/raw/d8a4543a5f828dfa8eefb0a3360859b6fe9c3c34/requires/gh_2215_make_GM_xhr_more_parallel_again.js
// ==/UserScript==

Util.upStore();

const TARGET_TXT = "匹配中";
const TARGET_CLASS = "x-match";
const VOID = "javascript:void(0);";
const CHANNEL = new BroadcastChannel(GM_info.script.name);

const listenClick = (onclose, defaultAction) => {
  const actions = {
    click: {
      val: "pc",
      url: "https://v.anxia.com/?pickcode=%s",
    },
    contextmenu: {
      val: "cid",
      url: "https://115.com/?cid=%s&offset=0&tab=&mode=wangpan",
    },
  };

  const onclick = (e) => {
    const { target, type } = e;
    if (!target.classList.contains(TARGET_CLASS)) return;

    e.preventDefault();
    e.stopPropagation();

    const action = actions[type];
    if (!action) return;

    const val = target.dataset[action.val];
    if (!val) return defaultAction?.(e);

    const tab = Grant.openTab(action.url.replaceAll("%s", val));
    tab.onclose = () => setTimeout(() => onclose?.(target), 750);
  };

  document.addEventListener("click", onclick);
  document.addEventListener("contextmenu", onclick);
};

const formatBytes = (bytes, k = 1024) => {
  if (bytes < k) return "0KB";
  const units = ["KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)) - 1, units.length - 1);
  const size = (bytes / Math.pow(k, i + 1)).toFixed(2);
  return `${size}${units[i]}`;
};

const extractData = (data, keys = ["pc", "cid", "n", "s", "t"], format = "s") => {
  return data.map((item) => ({ ...JSON.parse(JSON.stringify(item, keys)), [format]: formatBytes(item[format]) }));
};

(function () {
  const CONT = document.querySelector(".movie-panel-info");
  if (!CONT) return;

  const render = ({ pc, cid, n, s, t }) => {
    return `
    <a
      href="${VOID}"
      class="${TARGET_CLASS}"
      title="${n} - ${s} / ${t}"
      data-pc="${pc}"
      data-cid="${cid}"
    >
      ${n}
    </a>
    `;
  };

  const matchCode = async ({ code, codes, regex }, { load, cont }) => {
    const loadTxt = load.dataset.loadTxt;
    const currTxt = load.textContent;
    if (currTxt === loadTxt) return;
    load.textContent = loadTxt;

    try {
      const { data = [] } = await Req115.filesSearchVideosAll(codes.join(" "));
      const sources = extractData(data.filter((it) => regex.test(it.n)));
      cont.innerHTML = sources.map(render).join("") || "暂无匹配";
      GM_setValue(code, sources);
    } catch (err) {
      cont.innerHTML = "匹配失败";
      Util.print(err?.message);
    }

    load.textContent = currTxt;
  };

  const addBlock = () => {
    const load = `${TARGET_CLASS}-load`;
    const cont = `${TARGET_CLASS}-cont`;

    CONT.querySelector(".review-buttons + .panel-block").insertAdjacentHTML(
      "afterend",
      `<div class="panel-block">
        <strong><a href="${VOID}" class="${load}" data-load-txt="${TARGET_TXT}">115</a>:</strong>
        &nbsp;<span class="value ${cont}">${TARGET_TXT}...</span>
      </div>`,
    );

    return {
      load: CONT.querySelector(`.${load}`),
      cont: CONT.querySelector(`.${cont}`),
    };
  };

  const code = CONT.querySelector(".first-block .value").textContent.trim();
  const codeDetails = Util.codeParse(code);
  const block = addBlock();

  window.addEventListener("beforeunload", () => CHANNEL.postMessage(code));
  const matcher = () => matchCode(codeDetails, block);
  block.load.addEventListener("click", matcher);
  unsafeWindow["reMatch"] = matcher;
  listenClick(matcher);
  matcher();
})();

(function () {
  const SELECTOR = ".movie-list .item";
  const TARGET_HTML = `<a href="${VOID}" class="tag is-normal ${TARGET_CLASS}">${TARGET_TXT}</a>`;

  const currList = document.querySelectorAll(SELECTOR);
  if (!currList.length) return;

  const parseCodeCls = (code) => ["x", ...code.split(/\s|\.|-|_/)].filter(Boolean).join("-");

  const matchAfter = ({ code, regex, target }, data) => {
    target.closest(SELECTOR).classList.add(parseCodeCls(code));
    const sources = data.filter((it) => regex.test(it.n));
    const length = sources.length;

    let pc = "";
    let cid = "";
    let title = "";
    let className = "is-normal";
    let textContent = "未匹配";

    if (length) {
      const zhs = sources.filter((it) => Magnet.zhReg.test(it.n));
      const crack = sources.find((it) => Magnet.crackReg.test(it.n));

      const zh = zhs[0];
      const both = zhs.find((it) => Magnet.crackReg.test(it.n));
      const active = both ?? zh ?? crack ?? sources[0];

      pc = active.pc;
      cid = active.cid;
      title = sources.map(({ n, s, t }) => `${n} - ${s} / ${t}`).join("\n");
      className = both ? "is-danger" : zh ? "is-warning" : crack ? "is-info" : "is-success";
      textContent = "已匹配";
      if (length > 1) textContent += ` ${length}`;
    }

    const node = target.querySelector(`.${TARGET_CLASS}`);
    node.title = title;
    node.className = `tag ${className} ${TARGET_CLASS}`;
    node.dataset.pc = pc;
    node.dataset.cid = cid;
    node.textContent = textContent;
  };

  const matchBefore = (node) => {
    if (node.classList.contains("is-hidden")) return;

    const title = node.querySelector(".video-title");
    if (!title) return;

    const code = title.querySelector("strong")?.textContent.trim();
    if (!code) return;

    if (!title.querySelector(`.${TARGET_CLASS}`)) title.insertAdjacentHTML("afterbegin", TARGET_HTML);
    return { ...Util.codeParse(code), target: title };
  };

  const useMatchQueue = (before, after) => {
    const wait = {};
    const queue = [];
    let loading = false;

    const over = (pre, data = []) => {
      wait[pre].forEach((it) => after?.(it, data));
      delete wait[pre];
    };

    const match = async () => {
      if (loading || !queue.length) return;
      const prefix = queue[0];
      loading = true;

      try {
        const { data = [] } = await Req115.filesSearchVideosAll(prefix);
        const sources = extractData(data);
        GM_setValue(prefix, sources);
        over(prefix, sources);
      } catch (err) {
        over(prefix);
        Util.print(err?.message);
      }

      loading = false;
      queue.shift();
      match();
    };

    const dispatch = (node) => {
      const details = before?.(node);
      if (!details) return;

      const { code, prefix } = details;
      const cache = GM_getValue(code) ?? GM_getValue(prefix);
      if (cache) return after?.(details, cache);

      if (!wait[prefix]) wait[prefix] = [];
      wait[prefix].push(details);

      if (queue.includes(prefix)) return;
      queue.push(prefix);
      match();
    };

    const callback = (entries, obs) => {
      entries.forEach(({ isIntersecting, target }) => {
        if (isIntersecting) obs.unobserve(target) || requestAnimationFrame(() => dispatch(target));
      });
    };

    const obs = new IntersectionObserver(callback, { threshold: 0.25 });
    return (nodeList) => nodeList.forEach((node) => obs.observe(node));
  };

  const matchQueue = useMatchQueue(matchBefore, matchAfter);
  matchQueue(currList);

  window.addEventListener("JavDB.scroll", ({ detail }) => matchQueue(detail));
  CHANNEL.onmessage = ({ data }) => matchQueue(document.querySelectorAll(`.${parseCodeCls(data)}`));

  const getCode = (node) => node.closest(SELECTOR)?.querySelector(".video-title strong")?.textContent.trim();

  const publish = (code) => {
    if (!code) return;
    matchQueue(document.querySelectorAll(`.${parseCodeCls(code)}`));
    CHANNEL.postMessage(code);
  };

  const matchPrefix = async (target) => {
    const code = getCode(target);
    if (!code) return;

    const rematch = "x-rematch";
    if (target.classList.contains(rematch)) return;

    target.classList.add(rematch);
    const { prefix } = Util.codeParse(code);

    try {
      const { data = [] } = await Req115.filesSearchVideosAll(prefix);
      const sources = extractData(data);

      GM_setValue(prefix, sources);
      GM_deleteValue(code);
      publish(code);
    } catch (err) {
      Util.print(err?.message);
    }

    target.classList.remove(rematch);
  };

  const refresh = ({ type, target }) => {
    if (type === "contextmenu") return matchPrefix(target);
    if (type === "click") publish(getCode(target));
  };

  unsafeWindow["reMatch"] = matchPrefix;
  listenClick(matchPrefix, refresh);
})();
