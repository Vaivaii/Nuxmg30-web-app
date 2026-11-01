import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const moduleSource = readFileSync(new URL('../www/nam-model-library-ui.js', import.meta.url), 'utf8');
const irSource = readFileSync(new URL('../www/ir-transfer.js', import.meta.url), 'utf8');

class FakeClassList {
  constructor() { this.values = new Set(); }
  contains(value) { return this.values.has(value); }
  toggle(value, force) {
    const next = force === undefined ? !this.values.has(value) : Boolean(force);
    if (next) this.values.add(value); else this.values.delete(value);
    return next;
  }
}

class FakeElement {
  constructor(id = '') {
    this._id = id;
    this.hidden = false;
    this.classList = new FakeClassList();
    this.attributes = new Map();
    this.children = [];
    this.parentElement = null;
    this.listeners = new Map();
    this.textContent = '';
    this._innerHTML = '';
  }
  get id() { return this._id; }
  set id(value) {
    this._id = value;
    if (this.ownerDocument?.elements) this.ownerDocument.elements[value] = this;
  }
  set innerHTML(value) {
    this._innerHTML = value;
    if (this.id === 'namModelLibrary' && this.ownerDocument) {
      const doc = this.ownerDocument;
      const head = doc.getElementById('namModelLibraryHead');
      const heading = doc.getElementById('namModelLibraryHeading');
      const meta = doc.getElementById('namModelLibraryMeta');
      const toggle = doc.getElementById('namModelLibraryToggle');
      const content = doc.getElementById('namModelLibraryContent');
      const empty = doc.getElementById('namModelLibraryEmpty');
      head.appendChild(heading);
      heading.appendChild(meta);
      head.appendChild(toggle);
      content.appendChild(empty);
      this.appendChild(head);
      this.appendChild(content);
    }
  }
  get innerHTML() { return this._innerHTML; }
  appendChild(node) {
    if (node.parentElement) {
      const old = node.parentElement;
      old.children = old.children.filter(child => child !== node);
    }
    node.parentElement = this;
    this.children.push(node);
    return node;
  }
  insertBefore(node, before) {
    if (node.parentElement) {
      const old = node.parentElement;
      old.children = old.children.filter(child => child !== node);
    }
    node.parentElement = this;
    const index = this.children.indexOf(before);
    if (index < 0) this.children.push(node);
    else this.children.splice(index, 0, node);
    return node;
  }
  contains(node) {
    if (node === this) return true;
    return this.children.some(child => child === node || child.contains(node));
  }
  querySelector(selector) {
    if (selector === ':scope > .nam-ir-tools-frame' || selector === '.nam-ir-tools-frame') return this.toolsFrame || null;
    return null;
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null; }
  addEventListener(name, callback) {
    const list = this.listeners.get(name) || [];
    list.push(callback);
    this.listeners.set(name, list);
  }
  click() {
    for (const callback of this.listeners.get('click') || []) callback();
    if (this.id === 't3kCatalogueToggle') {
      const expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', String(!expanded));
      const list = this.ownerDocument.getElementById('t3kModelList');
      list.hidden = expanded;
    }
  }
}

class FakeMutationObserver {
  static all = [];
  constructor(callback) {
    this.callback = callback;
    this.target = null;
    this.options = null;
    this.disconnected = false;
    FakeMutationObserver.all.push(this);
  }
  observe(target, options) {
    this.target = target;
    this.options = options;
    this.disconnected = false;
  }
  disconnect() { this.disconnected = true; }
  fire() { if (!this.disconnected) this.callback([]); }
}

function createHarness({ withCatalogue = true } = {}) {
  FakeMutationObserver.all = [];
  const ids = [
    'page-nam','ir-import-content','namIrTonePane','namModelLibraryHead',
    'namModelLibraryHeading','namModelLibraryMeta','namModelLibraryToggle',
    'namModelLibraryContent','namModelLibraryEmpty','t3kToneDetails',
    't3kCatalogueToggle','t3kModelList','t3kCatalogueCount','t3kCatalogueTitle'
  ];
  const elements = Object.fromEntries(ids.map(id => [id, new FakeElement(id)]));
  for (const element of Object.values(elements)) element.ownerDocument = null;

  const toolsFrame = new FakeElement('toolsFrame');
  const page = elements['page-nam'];
  page.ownerDocument = null;
  page.toolsFrame = toolsFrame;
  page.appendChild(toolsFrame);
  const irContent = elements['ir-import-content'];
  page.appendChild(irContent);

  const tonePane = elements['namIrTonePane'];
  if (withCatalogue) {
    const catalogue = elements['t3kToneDetails'];
    catalogue.classList.toggle('t3k-catalogue', true);
    catalogue.hidden = true;
    const state = elements['t3kCatalogueToggle'];
    state.setAttribute('aria-expanded', 'false');
    catalogue.appendChild(state);
    catalogue.appendChild(elements['t3kModelList']);
    tonePane.appendChild(catalogue);
  }

  const document = {
    elements,
    readyState: 'complete',
    documentElement: new FakeElement('documentElement'),
    getElementById: id => elements[id] || null,
    createElement: () => {
      const node = new FakeElement();
      node.ownerDocument = document;
      return node;
    },
    addEventListener() {}
  };
  for (const element of Object.values(elements)) element.ownerDocument = document;
  const panelChildren = ['namModelLibraryHead','namModelLibraryHeading','namModelLibraryMeta','namModelLibraryToggle','namModelLibraryContent','namModelLibraryEmpty'];
  for (const id of panelChildren) elements[id].ownerDocument = document;
  toolsFrame.ownerDocument = document;
  toolsFrame.classList.toggle('nam-ir-tools-frame', true);

  const context = {
    document,
    MutationObserver: FakeMutationObserver,
    console,
    setTimeout,
    clearTimeout,
  };
  vm.runInNewContext(moduleSource, context, { timeout: 1000 });

  return { elements, page, tonePane, document };
}

test('NAM library header stays visible before a TONE3000 catalogue is loaded', () => {
  const { elements, page } = createHarness({ withCatalogue: false });
  const panel = elements.namModelLibrary;
  assert.ok(panel, 'library panel is mounted');
  assert.equal(panel.parentElement, page, 'library remains a direct page row');
  assert.equal(panel.hidden, false, 'outer panel is never hidden before a tone loads');
  assert.equal(elements.namModelLibraryMeta.textContent, 'Pilih tone untuk memuat model');
  assert.equal(elements.namModelLibraryToggle.textContent, 'Show⌄');
  assert.equal(elements.namModelLibraryContent.hidden, true);

  elements.namModelLibraryToggle.click();
  assert.equal(elements.namModelLibraryContent.hidden, false);
  assert.equal(panel.classList.contains('is-expanded'), true);
});

test('NAM library moves the real catalogue, keeps header state and avoids page-wide observer loops', () => {
  const { elements, page, tonePane } = createHarness({ withCatalogue: true });
  const panel = elements.namModelLibrary;
  const catalogue = elements.t3kToneDetails;
  const toggle = elements.namModelLibraryToggle;

  assert.equal(panel.parentElement, page);
  assert.equal(catalogue.parentElement, elements.namModelLibraryContent);
  assert.equal(panel.hidden, false, 'catalogue hidden state must not hide its library header');
  assert.equal(toggle.textContent, 'Show⌄');

  const observers = FakeMutationObserver.all;
  assert.equal(observers.some(observer => observer.target === page && !observer.disconnected), false);
  assert.equal(observers.some(observer => observer.target === tonePane && !observer.disconnected), false,
    'tone-pane observer disconnects after moving the catalogue');
  assert.equal(observers.some(observer => observer.target === catalogue && !observer.disconnected), true,
    'only the catalogue subtree remains observed');

  catalogue.hidden = false;
  elements.t3kCatalogueCount.textContent = '8 MODELS';
  elements.t3kCatalogueTitle.textContent = 'Peavey 5150';
  observers.find(observer => observer.target === catalogue && !observer.disconnected).fire();
  assert.equal(elements.namModelLibraryMeta.textContent, '8 models · Peavey 5150');

  toggle.click();
  assert.equal(elements.t3kCatalogueToggle.getAttribute('aria-expanded'), 'true');
  assert.equal(panel.classList.contains('is-expanded'), true);
  assert.equal(elements.namModelLibraryContent.hidden, false);

  toggle.click();
  assert.equal(elements.t3kCatalogueToggle.getAttribute('aria-expanded'), 'false');
  assert.equal(panel.classList.contains('is-expanded'), false);
  assert.equal(elements.namModelLibraryContent.hidden, true);
  assert.equal(panel.hidden, false);
});

test('IR page observer does not move the NAM library into the collapsible NAM import pane', () => {
  assert.match(irSource, /node\.id\s*===\s*'namModelLibrary'/);
  assert.doesNotMatch(moduleSource, /observe\(page\s*,\s*\{\s*childList\s*:\s*true\s*,\s*subtree\s*:\s*true/);
  assert.match(moduleSource, /node\.textContent\s*!==\s*value/);
});
