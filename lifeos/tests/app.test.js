/*
 * Behaviour tests for LIFEOS, run in a simulated browser (jsdom).
 * They cover the first-visit intro, sign up, sample items and the empty state.
 * They do not check how the page looks. Run with: npm test
 */
const fs = require("fs");
const path = require("path");
const { JSDOM, VirtualConsole } = require("jsdom");
const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

let fails = 0;
function ok(c, m) {
  if (!c) {
    fails++;
    console.log("FAIL:", m);
  } else console.log("pass:", m);
}

function boot(store) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => {
    if (!/not implemented/i.test(e.message)) errors.push(e.message);
  });
  vc.on("error", (e) => errors.push(String(e)));
  const dom = new JSDOM(html, {
    runScripts: "dangerously",
    url: "http://localhost/",
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(w) {
      Object.keys(store || {}).forEach((k) => w.localStorage.setItem(k, store[k]));
      w.scrollTo = () => {};
    },
  });
  return { dom, w: dom.window, d: dom.window.document, errors };
}
const $ = (d, s) => d.querySelector(s);
const click = (w, el) => el.dispatchEvent(new w.MouseEvent("click", { bubbles: true, cancelable: true }));
const key = (w, el, k) => el.dispatchEvent(new w.KeyboardEvent("keydown", { key: k, bubbles: true }));
function snap(w) {
  const o = {};
  for (let i = 0; i < w.localStorage.length; i++) {
    const k = w.localStorage.key(i);
    o[k] = w.localStorage.getItem(k);
  }
  return o;
}

// ---- 1. first visit
let { w, d, errors } = boot();
let tour = $(d, "#tour");
ok(tour.classList.contains("on"), "tour opens on first visit");
ok(/Step 1 of 4/.test(tour.textContent), "step 1 of 4 shown");
ok($(d, "#tt").textContent === "Keep every deadline in one place.", "step 1 title");
ok(d.activeElement && d.activeElement.id === "tt", "title receives focus");
ok(tour.querySelectorAll(".pl .pr").length === 6, "step 1 lists 6 record types");
ok($(d, "#auth").hasAttribute("inert"), "page behind tour is inert");
ok(!!tour.querySelector('[data-a="ts"]') && /Skip intro/.test(tour.textContent), "skip button on first visit");
ok(!tour.querySelector('[data-a="tp"]'), "no Back button on step 1");

// ---- 2. step through
click(w, tour.querySelector('[data-a="tn"]'));
ok($(d, "#tt").textContent === "Add it once. Reminders follow.", "step 2 title");
ok(/Press Save purchase/.test($(d, "#made").textContent), "step 2 shows hint before saving");
click(w, tour.querySelector('[data-a="tsave"]'));
ok(tour.querySelectorAll("#made .item").length === 4, "saving creates 4 linked rows");
ok(tour.querySelector('[data-a="tsave"]').textContent === "Saved", "save button reads Saved");
click(w, tour.querySelector('[data-a="tn"]'));
ok($(d, "#tt").textContent === "Countdowns show what’s urgent.", "step 3 title");
let rows = () => [...tour.querySelectorAll("#sim .cd")].map((c) => c.className.replace("cd ", "") + ":" + c.textContent);
console.log("  sim at 0:", rows().join(" | "));
ok(rows().join() === "u1:2days,u2:5days,u2:7days", "sim initial state (amber, blue, blue)");
const sl = $(d, "#tr");
sl.value = "2";
sl.dispatchEvent(new w.Event("input", { bubbles: true }));
console.log("  sim at 2:", rows().join(" | "), "/", $(d, "#trl").textContent);
ok(rows().join() === "u0:0today,u1:3days,u2:5days", "sim at +2 days (red today, amber, blue)");
ok($(d, "#trl").textContent === "2 days from now", "slider label updates");
sl.value = "5";
sl.dispatchEvent(new w.Event("input", { bubbles: true }));
console.log("  sim at 5:", rows().join(" | "));
ok(/day.* late|days late/.test(rows()[0]), "late state shown for overdue item");
key(w, sl, "ArrowRight");
ok(/Step 3 of 4/.test(tour.textContent), "arrow keys on slider do not change step");
click(w, tour.querySelector('[data-a="tp"]'));
ok(/Step 2 of 4/.test(tour.textContent) && tour.querySelectorAll("#made .item").length === 4, "Back keeps saved state on step 2");
key(w, d.body, "ArrowRight");
ok(/Step 3 of 4/.test(tour.textContent), "ArrowRight advances");
click(w, tour.querySelector('.pg button:nth-child(4)'));
ok(/Step 4 of 4/.test(tour.textContent), "progress dot jumps to step 4");
ok(tour.querySelector(".tnext").textContent === "Create my account", "final CTA: create account on a fresh browser");
ok(/sample items/.test(tour.querySelector(".fine").textContent), "sample/data note on last step");
ok(tour.querySelectorAll(".pl.nb .pr").length === 4, "step 4 lists 4 rows");
click(w, tour.querySelector(".tnext"));
ok(!tour.classList.contains("on"), "tour closes on CTA");
ok(w.localStorage.getItem("lifeos-intro") === "1", "intro flag stored");
ok(!$(d, "#auth").hasAttribute("inert"), "inert removed");
ok(d.body.classList.contains("locked"), "auth screen still showing");
ok(!!$(d, ".how"), "auth page has How LIFEOS works link");
const store1 = snap(w);

// ---- 3. returning visitor: no tour; replay from auth
({ w, d, errors: e2 } = boot(store1));
ok(!$(d, "#tour").classList.contains("on"), "no tour for returning visitor");
click(w, $(d, ".how"));
ok($(d, "#tour").classList.contains("on"), "replay opens from auth page");
ok(/Close/.test($(d, ".tb").textContent), "replay says Close");
key(w, d.body, "Escape");
ok(!$(d, "#tour").classList.contains("on"), "Escape closes tour");
ok(d.activeElement === $(d, ".how"), "focus returns to replay button");

// ---- 4. create account
click(w, $(d, '[data-a="am"][data-id="up"]'));
const f = $(d, "#af");
f.querySelector('[name="name"]').value = "Murun Test";
f.querySelector('[name="email"]').value = "m@example.com";
f.querySelector('[name="pw"]').value = "secret1";
f.dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
setTimeout(() => {
  ok(!d.body.classList.contains("locked"), "signed in");
  const main = $(d, "#main");
  ok(/Good (morning|afternoon|evening), Murun/.test(main.textContent), "greeting uses first name");
  ok(!!main.querySelector(".bar"), "sample banner visible");
  ok(main.querySelectorAll(".item").length >= 3, "sample reminders listed");
  ok(!!$(d, ".me .hw"), "sidebar has How it works");
  click(w, $(d, ".me .hw"));
  ok($(d, "#tour").classList.contains("on"), "replay from sidebar");
  click(w, $(d, '.pg button:nth-child(4)'));
  ok($(d, ".tnext").textContent === "Back to my overview", "final CTA when signed in");
  ok(!/We start you/.test($(d, ".fine").textContent), "no sample note when signed in");
  click(w, $(d, ".tnext"));
  ok(!$(d, "#tour").classList.contains("on"), "closes");

  // keep them
  click(w, $(d, '[data-a="hs"]'));
  ok(!$(d, "#main .bar"), "Keep them hides banner");
  // reset banner for clear test
  const st = JSON.parse(w.localStorage.getItem("lifeos-v1:m@example.com"));
  delete st.hs;
  w.localStorage.setItem("lifeos-v1:m@example.com", JSON.stringify(st));
  click(w, $(d, '[data-a="nav"][data-id="life"]'));
  click(w, $(d, '[data-a="nav"][data-id="overview"]'));
  // still hidden in memory state S (hs=1) -> expected; reload to test clear
  const store2 = snap(w);
  const b = boot(store2);
  const w2 = b.w, d2 = b.d;
  ok(!!$(d2, "#main .bar"), "banner back after reload with hs cleared");
  ok(!!st.r.length, "has sample records: " + st.r.length);
  click(w2, $(d2, '[data-a="cs"]'));
  ok(/Nothing tracked yet/.test($(d2, "#main").textContent), "empty state after clearing");
  ok(!$(d2, "#main .bar"), "banner gone after clearing");
  ok($(d2, "#toast").classList.contains("on") && /Undo/.test($(d2, "#toast").textContent), "undo toast");
  const after = JSON.parse(w2.localStorage.getItem("lifeos-v1:m@example.com"));
  ok(after.r.length === 0 && after.l.length === 0 && after.m.length === 0, "all sample records, links, reminders removed");
  click(w2, $(d2, "#ta"));
  ok(!!$(d2, "#main .bar") && !/Nothing tracked yet/.test($(d2, "#main").textContent), "Undo restores sample items");
  click(w2, $(d2, '[data-a="cs"]'));
  click(w2, $(d2, '[data-a="ft"][data-id="food"]'));
  ok($(d2, "#ov").classList.contains("on") && /Add food/.test($(d2, "#md").textContent), "empty-state Add food opens the food form");
  const lab = [...d2.querySelectorAll("label.ck")].map((x) => x.textContent.trim());
  click(w2, $(d2, '[data-a="ft"][data-id="purchase"]'));
  const lab2 = [...d2.querySelectorAll("#md label.ck")].map((x) => x.textContent.trim());
  ok(lab2.indexOf("Add it to My Life") >= 0, "purchase form says Add it to My Life");
  click(w2, $(d2, '[data-a="nav"][data-id="life"]'));
  ok(/No records yet/.test($(d2, "#list").textContent), "My Life empty message");
  console.log("\nJS errors:", errors.concat(b.errors).length ? errors.concat(b.errors) : "none");
  console.log(fails ? "\n" + fails + " FAILED" : "\nALL PASSED");
  process.exit(fails ? 1 : 0);
}, 200);
