import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../www/index.html", import.meta.url), "utf8");
const shellCss = readFileSync(new URL("../www/ui-redesign.css", import.meta.url), "utf8");
const studio = readFileSync(new URL("../www/studio-daw.js", import.meta.url), "utf8");

function studioMarkup() {
  const start = html.indexOf('<section id="page-studio"');
  const end = html.indexOf('<section id="page-device"', start);
  assert.ok(start >= 0 && end > start, "Studio page must exist before Device page");
  return html.slice(start, end);
}

test("Studio shell order is header, workspace selector, Jam mode selector, TIE section selector, content", () => {
  const markup = studioMarkup();
  const positions = [
    markup.indexOf('class="studio-page-heading"'),
    markup.indexOf('class="studio-workspace-tabs"'),
    markup.indexOf('class="studio-mode-tabs"'),
    markup.indexOf('class="tie-subnav"'),
    markup.indexOf('id="studioContentScroll"'),
  ];
  assert.ok(positions.every((value) => value >= 0));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
  assert.equal((markup.match(/class="studio-page-heading"/g) || []).length, 1);
  assert.equal((markup.match(/class="studio-workspace-tabs"/g) || []).length, 1);
  assert.equal((markup.match(/class="studio-mode-tabs"/g) || []).length, 1);
  assert.equal((markup.match(/class="tie-subnav"/g) || []).length, 1);
});

test("Studio scroll container owns all Jam/Record/DAW and Tone Analysis content but not dialogs", () => {
  const markup = studioMarkup();
  const scrollStart = markup.indexOf('<div id="studioContentScroll"');
  const tieStart = markup.indexOf('<section id="studio-tone-analysis-workspace"');
  const jamStart = markup.indexOf('data-studio-mode-panel="jam"');
  const recordStart = markup.indexOf('data-studio-mode-panel="record"');
  const dawStart = markup.indexOf('id="studio-daw-workspace"');
  const scrollEnd = markup.indexOf('</div>\n</section>', dawStart);
  const dialogStart = markup.indexOf('<dialog id="dawStemDialog"');
  assert.ok(scrollStart < tieStart);
  assert.ok(scrollStart < jamStart);
  assert.ok(scrollStart < recordStart);
  assert.ok(scrollStart < dawStart);
  assert.ok(scrollEnd > dawStart && scrollEnd < dialogStart);
  assert.ok(dialogStart > scrollEnd);
});

test("Studio shell itself does not scroll; only the content area has vertical scrolling", () => {
  assert.ok(shellCss.includes('body > .app > #page-studio:not(.hidden)'));
  assert.ok(shellCss.includes('overflow:hidden!important'));
  assert.ok(shellCss.includes('#page-studio .studio-content-scroll{'));
  assert.ok(shellCss.includes('overflow-y:auto!important'));
  assert.ok(shellCss.includes('overscroll-behavior-y:contain!important'));
  assert.ok(shellCss.includes('-webkit-overflow-scrolling:touch!important'));
  assert.ok(shellCss.includes('padding:0 0 calc(18px + env(safe-area-inset-bottom,0px))!important'));
});

test("Global app header and main five-tab navigation stay outside the Studio content scroller", () => {
  const appHeader = html.indexOf('<header class="top">');
  const mainNav = html.indexOf('<nav class="nav"');
  const studioPage = html.indexOf('<section id="page-studio"');
  const scroll = html.indexOf('<div id="studioContentScroll"');
  assert.ok(appHeader >= 0 && mainNav > appHeader && studioPage > mainNav);
  assert.ok(scroll > studioPage);
  for (const page of ["editor", "nam", "presets", "studio", "device"]) {
    assert.ok(html.includes('data-page="' + page + '"'));
  }
});

test("The five TIE sections remain unique and the repeated inner title block is removed", () => {
  const markup = studioMarkup();
  for (const section of ["analyzer", "compare", "signal-chain", "intelligence", "ai-consultant"]) {
    assert.equal((markup.match(new RegExp('data-tie-page="' + section + '"', "g")) || []).length, 1);
    assert.equal((markup.match(new RegExp('data-tie-page-panel="' + section + '"', "g")) || []).length, 1);
  }
  assert.ok(!markup.includes("class=\"tie-workspace-heading\""));
  assert.ok(!markup.includes("TONE INTELLIGENCE ENGINE"));
  assert.ok(!markup.includes("Measure · Compare · Understand"));
  assert.ok(!markup.includes("STUDIO ENGINE"));
});

test("Studio switching updates the persistent mode and section bars without rebuilding their content", () => {
  assert.ok(studio.includes("panel.classList.contains('studio-mode-tabs')"));
  assert.ok(studio.includes("display = 'grid'"));
  assert.ok(studio.includes("panel.classList.contains('tie-subnav') ? 'grid' : 'block'"));
  assert.ok(studio.includes("studio?.querySelectorAll('[data-studio-mode-panel]')"));
  assert.ok(studio.includes("button.addEventListener('click', () => setStudioWorkspace(button.dataset.studioWorkspace))"));
  assert.ok(studio.includes("button.addEventListener('click', () => setStudioMode(button.dataset.studioMode))"));
});

test("DAW viewport-fit calculation follows the inner Studio scroller rather than the outer page scrollTop", () => {
  assert.ok(studio.includes("const contentScroll = $('studioContentScroll')"));
  assert.ok(studio.includes("pageScrollTop: contentScroll?.scrollTop ?? studioPage.scrollTop"));
  assert.ok(studio.includes("$('studioContentScroll')?.addEventListener('scroll', syncStudioPinnedControls"));
});

test("Studio layout uses the existing shared design tokens instead of defining a second palette", () => {
  for (const token of ["--bg", "--panel", "--panel2", "--line", "--text", "--muted", "--lime"]) {
    assert.ok(shellCss.includes("var(" + token + ")"), "missing existing app token " + token);
  }
  assert.ok(!shellCss.includes("--studio-neon-cyan"));
  assert.ok(!shellCss.includes("--tie-new-accent"));
});
