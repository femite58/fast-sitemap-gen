const axios = require("axios");
const fs = require("fs");
const cheerio = require("cheerio");
const server = require("express")();
const path = require("path");
let sRes;
server.get("/generate-sitemap", (req, res) => {
    const baseUrl = req.query["baseUrl"]; // "http://localhost:4000";
    const limit = req.query["limit"];
    console.log(baseUrl, limit);
    sRes = res;
    loopFetcher(baseUrl, limit);
});

function finalRes(baseUrl) {
    let res = sRes;
    console.log(indArr.length);
    const urls = indArr.map((u) => `<li>${u}</li>`).join("");
    const xurls = indArr
        .map(
            (u) => `
    <url>
        <loc>${baseUrl}${u.replace(new RegExp(baseUrl, "g"), "")}</loc>
        <lastmod>${new Date().toISOString()}</lastmod>
        <changefreq>daily</changefreq>
    </url>
    `
        )
        .join("");
    let content = `<?xml version="1.0" encoding="UTF-8"?>

<urlset
    xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:xhtml="http://www.w3.org/1999/xhtml"
    xsi:schemaLocation="
            http://www.sitemaps.org/schemas/sitemap/0.9
            http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
    ${xurls}
</urlset>`;
    const filePath = path.join(__dirname, "sitemap.xml");
    fs.writeFileSync(filePath, content);
    res.download(filePath, () => {
        indArr = ["/"];
        // res.end();
        checked = [];
        indexed = 0;
    });
}
server.get("/", (req, res) => {
    let viewhtml = path.join(__dirname, "view.html");
    res.sendFile(viewhtml);
});

let indArr = ["/"];
let checked = [];
let indexed = 0;
errors = 0;
function loopFetcher(baseUrl, limit) {
    let toLoop = indArr.slice(checked.length, checked.length + 70);
    // console.log(toLoop.length, checked.length, indArr.length);
    if (!toLoop.length) {
        finalRes(baseUrl);
        return;
    }
    for (let u of toLoop) {
        console.log(u, indArr.indexOf(u), indArr.length);
        checked.push(u);
        fetchAx(`${baseUrl}${u.replace(new RegExp(baseUrl, "g"), "")}`).then(
            (resp) => {
                indexed++;
                // let prevUrls = [...indArr];
                const html = resp?.data;
                if (!html) {
                    errors++;
                    console.log("Oops! something went wrong. Try again later");
                } else {
                    const $ = cheerio.load(html);
                    const atags = $("a");
                    if (atags) {
                        const atagArr = atags
                            .filter(function (i, el) {
                                return $(this)
                                    .attr("href")
                                    ?.match(
                                        new RegExp(
                                            `^(\/[a-z]+|${baseUrl})`,
                                            "i"
                                        )
                                    );
                            })
                            .filter(function (i, el) {
                                return !$(this)
                                    .attr("href")
                                    ?.match(/^\/user|\/cdn-cgi\/l/);
                            })
                            .toArray();
                        let gottenArr = atagArr.map((e) => e.attribs["href"]);
                        for (let ur of gottenArr) {
                            if (!indArr.includes(ur)) {
                                indArr.push(ur);
                            }
                        }
                    }
                }
                indArr = indArr.slice(0, limit);
                console.log(
                    indArr.length,
                    limit,
                    u,
                    checked.length,
                    indArr.indexOf(u),
                    indexed
                );
                if (indArr.length == limit || indexed == indArr.length) {
                    finalRes(baseUrl);
                    return;
                }
                if (checked.length == indexed) {
                    setTimeout(() => {
                        loopFetcher(baseUrl, limit);
                    }, 500);
                }
            }
        );
        // if (indArr.length == limit) {
        //     break;
        // }
    }
    // return indArr;
}

async function fetchAx(url) {
    const res = await axios(url).catch((err) => {
        console.log("error fetching site");
    });
    if (res?.status !== 200) {
        console.log("error fetching the site", res?.status);
        return;
    }
    return res;
}

server.listen(5000, () => {
    console.log(`serving on http://localhost:5000`);
});
