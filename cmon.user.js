// ==UserScript==
// @name         CCO Monitor
// @namespace    -
// @version      0.9
// @description  -
// @author       LianSheng
// @include      https://cybercodeonline.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=cybercodeonline.com
// @license      MIT
// @grant        none
// @run-at       document-start
// ==/UserScript==

const META = {
    name: "CMON",
    version: "v0.9a",
    date: "2022-06-20",
};

(function () {
    console.clear = () => { };
    window.ws = [];

    if (window.WebSocket2 === undefined) window.WebSocket2 = window.WebSocket;
    window.WebSocket = function () {
        const ws = new window.WebSocket2(...arguments);
        console.info("%c[WS_Wrapper]", "font-size: 16px; color: red", ...arguments);

        // 不能使用 Proxy，會導致錯誤（有檢查機制）
        // 只好改用循環檢查，直到有值後再做替換
        const id = setInterval(() => {
            if (ws.onmessage !== null && ws.send !== null) {
                ws.onmessage2 = ws.onmessage;
                ws.onmessage = function (...args) {
                    const data = JSON.parse(args[0].data);
                    const record = data.payload && data.payload.record;

                    function userTagsReplacer(m) {
                        let tags = m.match(/\$!\{player.+?\}/);
                        if (tags !== null) {
                            tags.forEach(tag => {
                                let t = decodeURIComponent(tag);
                                t = JSON.parse(t.replace("$!{player:", "").replace(/\}$/, ""));
                                m = m.replace(tag, `【${t.n}{${t.t != "none" ? t.t : "x"}}】`);
                            });
                        }

                        return m;
                    }

                    if (record && record.message && record.senderName) {
                        console.info(`%c[WS_Message-Chat]\n%c[${record.clanShortName != undefined ? record.clanShortName.toUpperCase() : ""}] ${record.senderName}{${record.effectName ? record.effectName : "x"}} (Lv.${record.lv}) - ${userTagsReplacer(record.message)}`, "font-size: 16px; color: cyan", "font-size: 13px; color: default;");
                    } else {
                        console.info("%c[WS_Message-Misc]", "font-size: 16px; color: gray", ...args);
                    }

                    // 地下城傷害統計（未完成）
                    if (data.t && data.t === "d" && data.d && data.d.b && data.d.b.d && data.d.b.d.hi) {
                        const remainingHp = data.d.b.d.h || data.d.b.d.s;
                        const players = Object.values(data.d.b.d.hi);
                        const totalHp = players.reduce((a, b) => a + b.v, remainingHp);

                        let dump = `[Total: ${totalHp}]\n`;
                        players.forEach(e => dump += `[${e.si}] ${e.v} (${(e.v / totalHp * 100).toFixed(2)} %)\n`);

                        console.info(dump);
                    }

                    return ws.onmessage2(...args);
                };

                ws.send2 = ws.send;
                ws.send = function (...args) {
                    console.info("%c[WS_Send]", "font-size: 16px; color: red", args);
                    return ws.send2(...args);
                };

                ws.onopen2 = ws.onopen;
                ws.onopen = function (...args) {
                    console.info("%c[WS_Open]", "font-size: 16px; color: orange", args);
                    return ws.onopen2(...args);
                };

                ws.onclose2 = ws.onclose;
                ws.onclose = function (...args) {
                    console.info("%c[WS_Close]", "font-size: 16px; color: orange", args);
                    return ws.onclose2(...args);
                };

                clearInterval(id);
            }
        }, 1);

        window.ws.push(ws);
        return ws;
    };


    if (JSON.stringify2 === undefined) JSON.stringify2 = JSON.stringify;
    JSON.stringify = function (A, B, C) {
        const a = Object.assign({}, A);
        let show = true;
        let type = "Unknown";
        let color = "";

        if (a && a.percent !== undefined && a.itemId === undefined) {
            // 已回報錯誤，等待處理中
            // 2022-05-07: 已修正。
            // a.percent = 999999999;
            type = "DungeonAttack";
            color = "#5ee7ff";
        }

        if (a && a.level !== undefined) {
            type = "NearbyEnemy";
            color = "#5ee7ff";
        }

        if (typeof a === "object" && Object.keys(a).length === 0) {
            type = "Empty";
            color = "#6881a1";
            show = false;
        }

        if (a && a.base64) {
            type = "Encrypted";
            color = "#78634a";
        }

        if (a && a.application_info) {
            type = "MetaInfo";
            color = "#6d4a78";
            show = false;
        }

        if (a && a.authToken) {
            type = "Player";
            color = "#ff5e5e";
            a.authToken = "<REDACTED>";
        }

        if (a && a.log_event) {
            type = "Logger";
            color = "#fff45e";
        }

        if (a && a.addTarget) {
            type = "DB_AddTarget";
            color = "#ff00f2";
        };

        if (a && a.removeTarget) {
            type = "DB_RemoveTarget";
            color = "#b000a7";
        }

        if (a && a.topic) {
            if (a.topic.startsWith("realtime")) {
                type = "WS_FetchMessage: Send";
                color = "#b15eff";
                show = false;
            } else if (a.topic == "phoenix") {
                type = "WS_Heartbeat";
                color = "#dc5eff";
                show = false;
            } else {
                type = "WS_UnknownTopic";
                color = "#85a8ab";
            }
        }

        if (a && a.a0 && a.a1) {
            type = "User_Interaction";
            color = "#00ddfa";
        }

        // 送禮物 -> 惡作劇，把一組多個拆成多組一個
        // 已刪除

        // v0.5: JSON 部分可能與 WS 衝突（導致大量記錄洗版）
        // 不能同時啓動記錄，暫時關閉
        false && show && type !== "Unknown" && console.info(`%c【 ${META.name} ${META.version} (${META.date}) 】 (${type})`, `font-weight: bold; color: ${color}`, a);
        return JSON.stringify2(...arguments);
    };

    // v0.6 [實驗] 追加強制覆蓋 local storage 的掛機驗證值
    // 確定無效，不過從 AppLayout 最根源的地方依然可行
    // 只不過要抓到那個物件恐怕比登天還難
    setInterval(() => {
        try {
            const data = JSON.parse(localStorage.getItem("store"));
            data.player.rc = false;
            localStorage.setItem("store", JSON.stringify(data));
        } catch (e) {
            console.error(e);
        }
    }, 1);

    // Util
    const UtilFunction = {};
    UtilFunction.fetchClanMemory = function fetchClanMemory() {
        fetch("https://mfrgjyclqnoizevhylbh.supabase.in/rest/v1/market_items?select=*&order=price.asc.nullslast&item-%3E%3Etype=eq.CLAN_MEMORY", {
            "headers": {
                "accept-language": "zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7",
                "accept-profile": "public",
                "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlhdCI6MTYxODEyNjQ2NywiZXhwIjoxOTMzNzAyNDY3fQ.9bTzNinSET3aNueYx1z1-gXGuiS55MjSFaGC05w-sek",
                "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlhdCI6MTYxODEyNjQ2NywiZXhwIjoxOTMzNzAyNDY3fQ.9bTzNinSET3aNueYx1z1-gXGuiS55MjSFaGC05w-sek",
                "x-client-info": "supabase-js/1.35.3"
            },
            "referrer": "https://cybercodeonline.com/",
            "referrerPolicy": "strict-origin-when-cross-origin",
            "mode": "cors",
            "credentials": "same-origin"
        }).then(
            r => r.json()
        ).then(
            r => console.info("%c[CLAN_MEMORY]\n", "font-size: 16px; color: yellow;", r.reduce((a, b) => a[b.id] = b.amount, {}))
        );
    };

    window.util = UtilFunction;
})();