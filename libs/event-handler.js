import { isfunc, isarray } from "./stdlib";

const __listeners = {};

export const TYPES = {
  dragStart: ['touchstart', 'mousedown'],
  dragMove: ['touchmove', 'mousemove'],
  dragEnd: ['touchend', 'mouseup', 'mouseleave'],
};

export function triggerDOMEvent(dom, eventType, data) {
  const event = document.createEvent('CustomEvent');
  event.initCustomEvent(eventType, true, true, data);
  dom.dispatchEvent(event);
};

export function addListener(dom, eventType, listener, options) {
  (isarray(eventType) ?eventType :[eventType]).forEach((type) => {
    dom.addEventListener(type, listener, options);
  });
};
export function removeListener(dom, eventType, listener) {
  (isarray(eventType) ?eventType :[eventType]).forEach((type) => {
    dom.removeEventListener(type, listener);
  });
};

export function addGlobalListener(eventType, listener, options) {
  (isarray(eventType) ?eventType :[eventType]).forEach((type) => {
    const lastListener = __listeners[type];
    if (isfunc(lastListener)) {
      document.body.removeEventListener(type, lastListener);
    }
    document.body.addEventListener(type, listener, options);
    __listeners[type] = listener;
  });
};
export function removeGlobalListener(eventType) {
  (isarray(eventType) ?eventType :[eventType]).forEach((type) => {
    const listener = __listeners[type];
    if (isfunc(listener)) {
      document.body.removeEventListener(type, listener);
      delete __listeners[type];
    }
  });
};