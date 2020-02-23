'use strict';

import { isfunc, isarray, isset, isstr, dist, objMap } from './stdlib';

let _attractDistance = 30; // setAttractDistance / getAttractDistance

// Sass.render({
//   file: '../styles/blocky.scss',
// });
require('../styles/blocky.scss');

const NODE_NAMES = {
  blocky: 'blocky',
};

const ATTRIBUTES = objMap({
  type: 'type',
  linkedType: 'linkedType',
  container: 'container',
  content: 'content',
  shape: 'shape',
}, (value) => `data-${value}`);

const CLASS_NAMES = {
  lastIndent: 'lastIndent',
  parentBump: 'parentBump',
  nextBump: 'nextBump',
  childPool: 'childPool',
};

const BLOCKY_TYPES = {
  stackTop: 'stackTop', // next
  stackMiddle: 'stackMiddle', // last/next
  stackBottom: 'stackBottom', // last
  composite: 'composite', // last/next/child
  contained: 'contained', // (parent/last)/next
  expression: 'expression', // parent
  _expressionHole: 'expressionHole', // parent/child
};

const EVENT_TYPES = {
  dragStart: ['touchstart', 'mousedown'],
  dragEnd: ['touchend', 'mouseup', 'mouseleave'],
  dragMove: ['touchmove', 'mousemove'],
  // link status changed (link/unlink/changed)
  // content changed
};

/**
 * Trigger blocky event
 * 
 * @param {Blocky} self blocky
 * @param {String|[String]} eventNames event names
 * @param {Any} data would be passed to event listener
 */
const triggerBlockyEvent = (self, eventNames, data) => {
  if (!Blocky.isBlocky(self)) {
    throw new Error(`Not blocky: ${self}`);
  }
  (isarray(eventNames) ?eventNames :[eventNames]).forEach((eventName) => {
    if (!isstr(eventNames)) {
      throw new Error(`Invalid event name: ${eventNames}`);
    }
    const event = document.createEvent('CustomEvent');
    event.initCustomEvent(eventName, true, true, data);
    self.__dom.dispatchEvent(event);
  });
  return self;
};

/**
 * Find the closet parent which is not blocky and has no static position.
 * Return document.body if not found
 * 
 * @param {DOM} dom 
 * @returns DOM
 */
const findNonblockyRelativeParentDOM = (dom) => {
  const parentDom = dom.parentNode;
  if (parentDom instanceof Window || parentDom instanceof Document) {
    return document.body;
  }
  if (new RegExp(`^${NODE_NAMES.blocky}$`, 'i').test(parentDom.nodeName)) {
    return findNonblockyRelativeParentDOM(parentDom);
  }
  const { position } = getComputedStyle(parentDom);
  if (!position || 'static' === position) {
    return findNonblockyRelativeParentDOM(parentDom);
  }
  return parentDom;
};

/**
 * Handler of global event. Mainly used for drag related events
 */
const globalSingleEventHandler = (() => {
  const events = {};

  /**
   * Add event listener to global
   * 
   * @param {String} eventName 
   * @param {Function} eventFunc 
   */
  const addEvent = (eventName, eventFunc) => {
    removeEvent(eventName);
    document.body.addEventListener(eventName, eventFunc);
    events[eventName] = eventFunc;
  };

  /**
   * Remove event listener from global
   * 
   * @param {Name} eventName 
   */
  const removeEvent = (eventName) => {
    const eventFunc = events[eventName];
    if (isfunc(eventFunc)) {
      document.body.removeEventListener(eventName, eventFunc);
      delete events[eventName];
    }
  };
  return {
    addEvent,
    removeEvent,
  };
})();

/**
 * Create a <div> with specific class name
 * 
 * @param {String} classname 
 * @return DOM
 */
const createDOMWithClass = (classname) => {
  const dom = document.createElement('div');
  dom.classList.add(classname);
  return dom;
};

/**
 * Create blocky DOM
 * 
 * @param {Blocky} blocky 
 * @returns DOM
 */
const createBlockyDOM = (blocky) => {
  const dom = document.createElement(NODE_NAMES.blocky);
  const shape = document.createElement('div');
  const type = blocky.getType();
  shape.setAttribute(ATTRIBUTES.shape, '');
  dom.setAttribute(ATTRIBUTES.type, type);
  dom.__blocky = blocky;
  dom.style.top = 0;
  dom.style.left = 0;
  dom.style.display = 'inline-block';
  dom.style.overflow = 'visible';
  dom.style.userSelect = 'none';
  
  // do shape
  if (BLOCKY_TYPES.stackTop === type) {
    shape.appendChild(createDOMWithClass(CLASS_NAMES.nextBump));
  } else if (BLOCKY_TYPES.stackMiddle === type) {
    shape.appendChild(createDOMWithClass(CLASS_NAMES.lastIndent));
    shape.appendChild(createDOMWithClass(CLASS_NAMES.nextBump));
  } else if (BLOCKY_TYPES.stackBottom === type) {
    shape.appendChild(createDOMWithClass(CLASS_NAMES.lastIndent));
  } else if (BLOCKY_TYPES.composite === type) {
    shape.appendChild(createDOMWithClass(CLASS_NAMES.lastIndent));
    shape.appendChild(createDOMWithClass(CLASS_NAMES.nextBump));
    shape.appendChild(createDOMWithClass(CLASS_NAMES.childPool));
  } else if (BLOCKY_TYPES.contained === type) {
    shape.appendChild(createDOMWithClass(CLASS_NAMES.lastIndent));
    shape.appendChild(createDOMWithClass(CLASS_NAMES.nextBump));
    // shape.appendChild(createDOMWithClass(CLASS_NAMES.parentBump));
  } else if (BLOCKY_TYPES.expression === type) {
    shape.appendChild(createDOMWithClass(CLASS_NAMES.parentBump));
  } else if (BLOCKY_TYPES._expressionHole === type) {
    shape.appendChild(createDOMWithClass(CLASS_NAMES.parentBump));
  }
  
  dom.appendChild(shape);
  return dom;
};

/**
 * Get attractable blocky types of specific blocky type
 * 
 * @param {Blocky.TYPE} type of blocky
 */
const getTargetTypes = (type) => {
  if (BLOCKY_TYPES.stackTop === type) {
    return [
      BLOCKY_TYPES.stackMiddle,
      BLOCKY_TYPES.stackBottom,
      BLOCKY_TYPES.composite,
    ];
  } else if (BLOCKY_TYPES.stackMiddle === type) {
    return [
      BLOCKY_TYPES.stackTop,
      BLOCKY_TYPES.stackMiddle,
      BLOCKY_TYPES.stackBottom,
      BLOCKY_TYPES.composite,
    ];
  } else if (BLOCKY_TYPES.stackBottom === type) {
    return [
      BLOCKY_TYPES.stackTop,
      BLOCKY_TYPES.stackMiddle,
      BLOCKY_TYPES.composite,
    ];
  } else if (BLOCKY_TYPES.expression === type) {
    return [
      BLOCKY_TYPES._expressionHole,
    ];
  } else if (BLOCKY_TYPES.composite === type) {
    return [
      BLOCKY_TYPES.stackTop,
      BLOCKY_TYPES.stackMiddle,
      BLOCKY_TYPES.stackBottom,
      BLOCKY_TYPES.composite,
    ];
  } else if (BLOCKY_TYPES.contained === type) {
    return [
      BLOCKY_TYPES.composite,
      BLOCKY_TYPES.contained,
    ];
  }
  return [];
};

/**
 * Calculate distance between DOM assigned rectangle and another DOM
 * 
 * @param {DOM} selfDom blocky DOM
 * @param {Object} selfRect specific rectangle { x, y, width, height }
 * @param {DOM} targetDom target blocky DOM
 */
const distanceBetween = (selfDom, selfRect, targetDom) => {
  const selfBlocky = selfDom.__blocky;
  const targetBlocky = targetDom.__blocky;
  if (!Blocky.isBlocky(selfBlocky)) {
    throw new Error(`Not a blocky DOM`);
  } else if (!Blocky.isBlocky(targetBlocky)) {
    throw new Error(`Not a target blocky DOM`);
  }
  const selfType = selfBlocky.getType();
  const targetType = targetBlocky.getType();
  const targetRect = targetDom.getBoundingClientRect();
  const { x: sX, y: sY, width: sW, height: sH } = selfRect;
  const { x: tX, y: tY, width: tW, height: tH } = targetRect;
  const defaultResult = {
    target: {
      type: targetType,
      blocky: targetBlocky,
      dom: targetDom,
      rect: targetRect,
    },
  };
  if (selfType === BLOCKY_TYPES.stackTop) {
    if (
      targetType === BLOCKY_TYPES.stackMiddle ||
      targetType === BLOCKY_TYPES.composite ||
      targetType === BLOCKY_TYPES.stackBottom
    ) {
      const bottomToTop = (tY - (sY + sH));
      const leftToLeft = (tX - sX);
      return {
        ...defaultResult,
        anchor: [tX, tY],
        linkType: {
          self: 'next',
          target: 'last',
        },
        distance: dist(leftToLeft, bottomToTop),
      };
    }
    console.warn(`Unsupported target blocky type: ${targetType}`);
    return { distance: Infinity };
  } else if (selfType === BLOCKY_TYPES.stackMiddle) {
    if (targetType === BLOCKY_TYPES.stackTop) {
      const topToBottom = ((tY + tH) - sY);
      const leftToLeft = (tX - sX);
      return {
        ...defaultResult,
        anchor: [tX, (tY + tH)],
        linkType: {
          self: 'last',
          target: 'next',
        },
        distance: dist(leftToLeft, topToBottom),
      };
    } else if (
      targetType === BLOCKY_TYPES.stackMiddle ||
      targetType === BLOCKY_TYPES.composite
    ) {
      const topToBottom = ((tY + tH) - sY);
      const bottomToTop = (tY - (sY + sH));
      const leftToLeft = (tX - sX);
      const distanceTopToBottom = dist(leftToLeft, topToBottom);
      const distanceBottomToTop = dist(leftToLeft, bottomToTop);
      if (distanceTopToBottom < distanceBottomToTop) {
        return {
          ...defaultResult,
          anchor: [tX, (tY + tH)],
          linkType: {
            self: 'last',
            target: 'next',
          },
          distance: distanceTopToBottom,
        };
      } else {
        return {
          ...defaultResult,
          anchor: [tX, tY],
          linkType: {
            self: 'next',
            target: 'last',
          },
          distance: distanceBottomToTop,
        };
      }
    } else if (targetType === BLOCKY_TYPES.stackBottom) {
      const bottomToTop = (tY - (sY + sH));
      const leftToLeft = (tX - sX);
      return {
        ...defaultResult,
        anchor: [tX, tY],
        linkType: {
          self: 'next',
          target: 'last',
        },
        distance: dist(leftToLeft, bottomToTop),
      };
    }
    console.warn(`Unsupported target blocky type: ${targetType}`);
    return { distance: Infinity };
  } else if (selfType === BLOCKY_TYPES.stackBottom) {
    if (
      targetType === BLOCKY_TYPES.stackTop ||
      targetType === BLOCKY_TYPES.stackMiddle ||
      targetType === BLOCKY_TYPES.composite
    ) {
      const topToBottom = ((tY + tH) - sY);
      const leftToLeft = (tX - sX);
      return {
        ...defaultResult,
        anchor: [tX, (tY + tH)],
        linkType: {
          self: 'last',
          target: 'next',
        },
        distance: dist(leftToLeft, topToBottom),
      };
    }
    console.warn(`Unsupported target blocky type: ${targetType}`);
    return { distance: Infinity };
  } else if (selfType === BLOCKY_TYPES.composite) {
    if (targetType === BLOCKY_TYPES.stackTop) {
      const topToBottom = ((tY + tH) - sY);
      const leftToLeft = (tX - sX);
      return {
        ...defaultResult,
        anchor: [tX, (tY + tH)],
        linkType: {
          self: 'last',
          target: 'next',
        },
        distance: dist(leftToLeft, topToBottom),
      };
    } else if (
      targetType === BLOCKY_TYPES.stackMiddle ||
      targetType === BLOCKY_TYPES.composite
    ) {
      const topToBottom = ((tY + tH) - sY);
      const bottomToTop = (tY - (sY + sH));
      const leftToLeft = (tX - sX);
      const distanceTopToBottom = dist(leftToLeft, topToBottom);
      const distanceBottomToTop = dist(leftToLeft, bottomToTop);
      if (distanceTopToBottom < distanceBottomToTop) {
        return {
          ...defaultResult,
          anchor: [tX, (tY + tH)],
          linkType: {
            self: 'last',
            target: 'next',
          },
          distance: distanceTopToBottom,
        };
      } else {
        return {
          ...defaultResult,
          anchor: [tX, tY],
          linkType: {
            self: 'next',
            target: 'last',
          },
          distance: distanceBottomToTop,
        };
      }
    } else if (targetType === BLOCKY_TYPES.stackBottom) {
      const bottomToTop = (tY - (sY + sH));
      const leftToLeft = (tX - sX);
      return {
        ...defaultResult,
        anchor: [tX, tY],
        linkType: {
          self: 'next',
          target: 'last',
        },
        distance: dist(leftToLeft, bottomToTop),
      };
    }
    console.warn(`Unsupported target blocky type: ${targetType}`);
    return { distance: Infinity };
  } else if (selfType === BLOCKY_TYPES.expression) {
    if (targetType === BLOCKY_TYPES._expressionHole) {
      const leftToLeft = (tX - sX);
      const topToTop = (tY - sY);
      return {
        ...defaultResult,
        anchor: [tX, tY],
        linkType: {
          self: 'parent',
          target: 'child',
        },
        distance: dist(leftToLeft, topToTop),
      };
    }
    console.warn(`Unsupported target blocky type: ${targetType}`);
    return { distance: Infinity };
  } else if (selfType === BLOCKY_TYPES.contained) {
    if (targetType === BLOCKY_TYPES.composite) {
      const childBlocky = targetBlocky.getChild();
      if (!childBlocky) {
        const leftToRight = ((tX + tW) - sX);
        const topToTop = (tY - sY);
        return {
          ...defaultResult,
          anchor: [(tX + tW), tY],
          linkType: {
            self: 'parent',
            target: 'child',
          },
          distance: dist(leftToRight, topToTop),
        };
      } else {
        let min = { distance: Infinity };
        for (let min = { distance: Infinity }, currBlocky = childBlocky; currBlocky; currBlocky = currBlocky.getNext()) {
          let curr = distanceBetween(selfDom, selfRect, currBlocky.getDOM());
          if (curr.distance < min.distance) {
            min = curr;
          }
        }
        return min;
      }
    } else if (targetType === BLOCKY_TYPES.contained) {
      const topToBottom = ((tY + tH) - sY);
      const bottomToTop = (tY - (sY + sH));
      const leftToLeft = (tX - sX);
      const distanceTopToBottom = dist(leftToLeft, topToBottom);
      const distanceBottomToTop = dist(leftToLeft, bottomToTop);
      if (distanceTopToBottom < distanceBottomToTop) {
        return {
          ...defaultResult,
          anchor: [tX, (tY + tH)],
          linkType: {
            self: 'last',
            target: 'next',
          },
          distance: distanceTopToBottom,
        };
      } else {
        return {
          ...defaultResult,
          anchor: [tX, tY],
          linkType: {
            self: 'next',
            target: 'last',
          },
          distance: distanceBottomToTop,
        };
      }
    }
    console.warn(`Unsupported target blocky type: ${targetType}`);
    return { distance: Infinity };
  }
  console.warn(`Unsupported blocky type: ${selfType}`);
  return { distance: Infinity };
};

/**
 * Get container DOM of blocky
 * 
 * @param {DOM} refDom 
 * @return DOM
 */
const getContainerDOM = (refDom, linkedType) => Array.prototype.find.call(refDom.children, (dom) => {
  if (!new RegExp(`^${NODE_NAMES.blocky}$`, 'i').test(dom.nodeName)) {
    return false;
  } else if (isset(linkedType) && linkedType !== dom.getAttribute(ATTRIBUTES.container)) {
    return false;
  }
  return true;
});

/**
 * Fit size of blocky that has children
 * 
 * @param {Blocky} self blocky to fit
 */
const fitBlockySize = (self) => {
  const selfDom = self.getDOM();
  let width = 0;
  let height = 0;
  for (let nextChild = self.getChild(); nextChild; nextChild = nextChild.getNext()) {
    let dom = nextChild.getDOM();
    width += dom.clientWidth;
    height += dom.clientHeight;
  }
  if (BLOCKY_TYPES._expressionHole === self.getType()) {
    selfDom.style.minWidth = width;
  }
  selfDom.style.minHeight = height;

  const containerDom = getContainerDOM(selfDom);
  if (containerDom) {
    const [width, height] = Array.prototype.reduce.call(containerDom.children, (val, dom) => {
      const styles = getComputedStyle(dom);
      return [
        Math.max(val[0], (dom.clientWidth + parseFloat(styles.marginRight||0) + parseFloat(styles.marginLeft||0))),
        (val[1] + (dom.clientHeight + parseFloat(styles.marginTop||0) + parseFloat(styles.marginBottom||0))),
      ];
    }, [0, 0]);
    containerDom.style.minWidth = width;
    containerDom.style.minHeight = height;
  }

  let lastBlock = self;
  while (lastBlock) {
    let parent = lastBlock.getParent();
    if (parent) {
      fitBlockySize(parent);
      break;
    }
    lastBlock = lastBlock.getLast();
  }
};

/**
 * Get mouse/touch position of event
 * 
 * @param {Event} event from listener
 * @returns [x, y]
 */
const getEventPosition = ({ clientX: mx, clientY: my, touches: [{ clientX: x = mx, clientY: y = my } = {}] = [] }) => [x, y];

/**
 * Initialize blocky events
 * 
 * @param {Blocky} self blocky
 */
const initBlocky = (self) => {
  const selfDom = self.__dom;
  const type = self.__type;
  const targetTypes = getTargetTypes(type);
  const startEventFunc = (args) => {
    if (!self.getEnabled()) {
      return;
    }
    args.stopPropagation();
    self.unlink('last');
    self.unlink('parent');

    let _attractResult = null;
    const [stX, stY] = getEventPosition(args);
    const { x: posX, y: posY, width, height } = selfDom.getBoundingClientRect();
    const dx = (stX - posX);
    const dy = (stY - posY);
    const targetDoms = Array.prototype.filter.call(selfDom.parentNode.querySelectorAll('blocky'), (dom) => {
      if (dom === selfDom || !isset(dom.__blocky) || selfDom.contains(dom)) {
        return false;
      }
      const blockType = dom.getAttribute(ATTRIBUTES.type);
      return targetTypes.includes(blockType);
    });
    const removeListeners = () => []
      .concat(EVENT_TYPES.dragMove)
      .concat(EVENT_TYPES.dragEnd)
      .forEach((eventName) => globalSingleEventHandler.removeEvent(eventName));
    const removeHighlight = () => {
      Array.prototype.forEach.call(document.querySelectorAll(`${NODE_NAMES.blocky}[${ATTRIBUTES.linkedType}]`), (dom) => {
        dom.removeAttribute(ATTRIBUTES.linkedType);
      });
    };
    const moveEventFunc = (args) => {
      const [x, y] = getEventPosition(args);
      const rect = {
        x: (x - dx),
        y: (y - dy),
        width,
        height,
      };
      selfDom.style.top = rect.y;
      selfDom.style.left = rect.x;
      const nearest = targetDoms.reduce((min, dom) => {
        const curr = distanceBetween(selfDom, rect, dom);
        if (min.distance < curr.distance) {
          return min;
        } else {
          return curr;
        }
      }, { distance: Infinity });
      if (_attractDistance < nearest.distance) {
        if (_attractResult) {
          removeHighlight();
          _attractResult = null;
        }
        return;
      }
      const { target, linkType } = nearest;
      _attractResult = nearest;
      removeHighlight();
      target.dom.setAttribute(ATTRIBUTES.linkedType, linkType.target);
    };
    const endEventFunc = () => {
      if (_attractResult) {
        const { target, linkType } = _attractResult;
        self.link(linkType.self, target.blocky);
      }
      removeHighlight();
      removeListeners();
    };
    removeListeners();
    EVENT_TYPES.dragMove.forEach((eventName) => globalSingleEventHandler.addEvent(eventName, moveEventFunc));
    EVENT_TYPES.dragEnd.forEach((eventName) => globalSingleEventHandler.addEvent(eventName, endEventFunc));
    selfDom.parentNode.appendChild(selfDom);
  };
  EVENT_TYPES.dragStart.forEach((eventName) => {
    const eventFunc = self.__events[eventName];
    if (isfunc(eventFunc)) {
      selfDom.removeEventListener(eventName, eventFunc);
    }
    selfDom.addEventListener(eventName, startEventFunc);
    self.__events[eventName] = startEventFunc;
  });
};

class Blocky {
  constructor(...args) {
    const [{
      id = Date.now(),
      type,
      content,
      contents = (isset(content) ?[content] :[]),
    } = {}] = args;

    if (!Object.keys(BLOCKY_TYPES)
      .map((prop) => BLOCKY_TYPES[prop])
      .includes(type)
    ) {
      throw new Error(`Invalid blocky type: ${type}`);
    }

    this.setId(id);
    this.__type = type;
    this.__links = {};
    this.__events = {};
    this.__dom = createBlockyDOM(this);
    this.__content = document.createElement('div');
    this.__content.setAttribute(ATTRIBUTES.content, '');
    this.__dom.appendChild(this.__content);
    if (!/^_/.test(Object.keys(BLOCKY_TYPES).find((prop) => (type === BLOCKY_TYPES[prop])))) {
      initBlocky(this);
    }
    document.body.appendChild(this.getDOM());
    this.setContent(...contents);
    this.setEnabled(true);
  }
  destroy = () => {
    const dom = this.__dom;
    dom.parentNode.removeChild(dom);
  }
  getId = () => this.__id
  setId = (id) => (this.__id = id)
  getType = () => this.__type
  getDOM = () => this.__dom
  getContent = () => this.__content.children
  setContent = (...contents) => {
    const refDom = this.__content;
    while (refDom.firstChild) {
      refDom.removeChild(refDom.firstChild);
    }
    contents.forEach((content) => {
      if (content instanceof Element) {
        refDom.appendChild(content);
      } else {
        refDom.appendChild(document.createTextNode(content));
      }
    });
  }
  getParent = () => this.__links.parent
  getChild = () => this.__links.child
  getLast = () => this.__links.last
  getNext = () => this.__links.next
  setEnabled = (enabled) => (this.__enabled = (enabled ?true :false))
  getEnabled = () => this.__enabled
}

Blocky.isBlocky = (b) => (b instanceof Blocky);

/**
 * Create DOM of expression hole
 */
Blocky.createExpressionHoleDOM = () => new Blocky({
  type: BLOCKY_TYPES._expressionHole,
}).getDOM();

/**
 * Get/set attract distance
 */
Blocky.getAttractDistance = () => _attractDistance;
Blocky.setAttractDistance = (distance) => {
  const d = parseFloat(distance);
  if (isNaN(d)) {
    throw new Error(`Invalid attract distance: ${distance}`);
  }
  _attractDistance = d;
  return d;
};

Blocky.TYPE = Object.keys(BLOCKY_TYPES)
  .filter((prop) => !/^_/.test(prop))
  .reduce((types, prop) => ({
    ...types,
    [prop]: BLOCKY_TYPES[prop],
  }), {});
Object.freeze(Blocky.TYPE);

/**
 * Link blocky on specific port
 * 
 * @param {String} linkedType either of last/next/parent/child
 * @param {Blocky} targetBlocky target to link
 */
Blocky.prototype.link = function(linkedType, targetBlocky) {
  const selfDom = this.getDOM();
  const targetDom = targetBlocky.getDOM();
  if ('parent' === linkedType) {
    const oriParent = this.getParent();
    if (oriParent) {
      this.unlink(linkedType);
      targetBlocky.link('parent', oriParent);
    }
    targetBlocky.link('child', this);
  } else if ('last' === linkedType) {
    const oriLast = this.getLast();
    if (oriLast) {
      this.unlink(linkedType);
      targetBlocky.link('last', oriLast);
    }
    targetBlocky.link('next', this);
  } else if ('next' === linkedType || 'child' === linkedType) {
    let containerDom = getContainerDOM(selfDom, linkedType);
    if (!containerDom) {
      containerDom = document.createElement(NODE_NAMES.blocky);
      containerDom.setAttribute(ATTRIBUTES.container, linkedType);
      selfDom.appendChild(containerDom);
    }
    if ('next' === linkedType) {
      const oriNext = this.getNext();
      if (oriNext) {
        this.unlink('next');
        targetBlocky.link('next', oriNext);
      }
      targetBlocky.__links.last = this;
    } else if ('child' === linkedType) {
      const oriChild = this.getChild();
      if (oriChild) {
        this.unlink('child');
        targetBlocky.link('child', oriChild);
      }
      targetBlocky.__links.parent = this;
    }
    
    try {
      const [width, height] = Array.prototype.reduce.call(containerDom.children, (val, dom) => ([
        Math.max(val[0], dom.clientWidth),
        (val[1] + dom.clientHeight),
      ]), [targetDom.clientWidth, targetDom.clientHeight]);
      containerDom.style.minWidth = width;
      containerDom.style.minHeight = height;
      containerDom.appendChild(targetDom);
    } catch (err) {
      console.warn('appendChild failed', err.message);
      console.warn(' `- this', this);
      console.warn(' `- target', targetBlocky);
      console.warn(' `- container', containerDom);
      console.warn(' `- stack', err.stack);
    }
    targetDom.style.top = 0;
    targetDom.style.left = 0;
    this.__links[linkedType] = targetBlocky;
    fitBlockySize(this);
  } else {
    throw new Error(`Not support link type: ${linkedType}`);
  }
  return this;
};

/**
 * Unlink blocky on specific port
 * 
 * @param {String} linkedType either of last/next/parent/child
 */
Blocky.prototype.unlink = function(linkedType) {
  const selfDom = this.getDOM();
  const targetBlocky = this.__links[linkedType];
  if (!targetBlocky) {
    return this;
  }
  if ('next' === linkedType || 'child' === linkedType) {
    if ('next' === linkedType) {
      targetBlocky.unlink('last');
    } else if ('child' === linkedType) {
      targetBlocky.unlink('parent');
    }
    return this;
  } else if ('last' === linkedType || 'parent' === linkedType) {
    const targetDom = targetBlocky.getDOM();
    if ('last' === linkedType) {
      targetBlocky.__links.next = null;
    } else if ('parent' === linkedType) {
      targetBlocky.__links.child = null;
    }
    const relativedDom = findNonblockyRelativeParentDOM(targetDom.parentNode);
    const relativedRect = relativedDom.getBoundingClientRect();
    const relativedStyles = getComputedStyle(relativedDom);
    const selfRect = selfDom.getBoundingClientRect();
    selfDom.style.top = (selfRect.y - relativedRect.y + parseFloat(relativedStyles.marginTop||0));
    selfDom.style.left = (selfRect.x - relativedRect.x + parseFloat(relativedStyles.marginLeft||0));
    relativedDom.appendChild(selfDom);
    this.__links[linkedType] = null;
    fitBlockySize(targetBlocky);
  } else {
    throw new Error(`Unsupport link type: ${linkedType}`);
  }
  return this;
};

export default Blocky;