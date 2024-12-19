class ReqMagnet extends Req {
  static btdig(code) {
    const word = code.toUpperCase();
    return this.tasks(`https://btdig.com/search?order=0&q=${code}`, [
      (dom) => {
        return [...dom.querySelectorAll(".one_result")]
          .map((node) => {
            return {
              url: node.querySelector(".torrent_magnet a")?.href,
              name: node.querySelector(".torrent_name")?.textContent.trim() ?? "",
              size: node.querySelector(".torrent_size")?.textContent.replace(/\s/g, "") ?? "",
              files: node.querySelector(".torrent_files")?.textContent.trim() ?? "",
              date: node.querySelector(".torrent_age")?.textContent.trim() ?? "",
            };
          })
          .filter(({ url, name }) => url && name.toUpperCase().includes(word));
      },
    ]);
  }

  static nyaa(code) {
    const word = code.toUpperCase();
    return this.tasks(`https://sukebei.nyaa.si/?f=0&c=2_2&q=${code}`, [
      (dom) => {
        return [...dom.querySelectorAll(".torrent-list tbody > tr")]
          .map((node) => {
            const [, name, link, size, date] = [...node.querySelectorAll("td")];
            return {
              url: link.querySelectorAll("a")?.[1]?.href,
              name: [...name.querySelectorAll("a")].at(-1)?.textContent.trim() ?? "",
              size: size?.textContent.replace(/\s/g, "") ?? "",
              date: date?.textContent.trim() ?? "",
            };
          })
          .filter(({ url, name }) => url && name.toUpperCase().includes(word));
      },
    ]);
  }
}
