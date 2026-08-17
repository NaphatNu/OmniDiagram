import "@testing-library/jest-dom";

// react-flow (used by SchemaDiagramEditor) measures nodes via ResizeObserver,
// which jsdom doesn't implement; without a stub, mounting it throws
// "ResizeObserver is not defined". Real edge rendering still needs actual
// browser layout geometry jsdom can't provide even with this stubbed, so
// that behavior is covered by e2e/relationships.spec.ts instead.
class ResizeObserverStub {
  #callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.#callback = callback;
  }
  observe(target: Element) {
    const rect = { x: 0, y: 0, width: 220, height: 100, top: 0, left: 0, bottom: 100, right: 220 };
    const entry = { target, contentRect: rect } as unknown as ResizeObserverEntry;
    this.#callback([entry], this as unknown as ResizeObserver);
  }
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

class DOMMatrixReadOnlyStub {
  m22 = 1;
}
// @ts-expect-error jsdom doesn't implement DOMMatrixReadOnly, react-flow's viewport math needs a stand-in
globalThis.DOMMatrixReadOnly ??= DOMMatrixReadOnlyStub;

// jsdom's getBoundingClientRect() is always zero-sized, which react-flow
// treats as "not yet measured" and never renders edges for. Give every
// element a plausible non-zero rect so nodes/handles measure as visible.
Element.prototype.getBoundingClientRect = () => ({
  x: 0,
  y: 0,
  width: 220,
  height: 100,
  top: 0,
  left: 0,
  bottom: 100,
  right: 220,
  toJSON() {},
});
