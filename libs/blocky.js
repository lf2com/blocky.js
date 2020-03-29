import { TYPES as EVENT_TYPES, addListener, addGlobalListener, removeGlobalListener, removeListener } from './event-handler';
import BLOCKY_TYPES from './types';
import { pointDist, stdFloat, objMap, isstr, isfunc } from './stdlib';
import { shapeStackTop, shapeStackMiddle, shapeStackBottom, shapeComposite, shapeContained, shapeExpression, shapeExpressionHole } from './shape';

function getEventPosition({
  clientX: mx,
  clientY: my,
  touches: [{
    clientX: x = mx,
    clientY: y = my,
  } = {}] = []
}) {
  return [x, y];
}

const LINK_TYPES = {
  last: 'last',
  next: 'next',
  parent: 'parent',
  child: 'child',
};
Object.freeze(LINK_TYPES);

const ATTRIBUTES = {
  type: 'type',
  disabled: 'disabled',
  attract: 'attract',
  last: 'last-linked',
  next: 'next-linked',
  parent: 'parent-linked',
  child: 'child-linked',
  focused: 'focused',
  x: 'x',
  y: 'y',
};
Object.freeze(ATTRIBUTES);

let _attractDistance = 20;
let _onSetBlockyOffset = null;

class BlockyBlock extends HTMLElement {
  static get observedAttributes() {
    return [
      ATTRIBUTES.type,
      ATTRIBUTES.relative,
    ];
  }
  
  static TYPE = Object.defineProperties({}, objMap(BLOCKY_TYPES, (val) => ({
    get: () => val,
  })))
  static LINK_TYPE = Object.defineProperties({}, objMap(LINK_TYPES, (val) => ({
    get: () => val,
  })))
  static get nodeName() { return 'blocky-block'; }
  static get attractDistance() { return _attractDistance; }
  static set attractDistance(val) {
    const d = parseFloat(val);
    if (isNaN(d)) {
      throw new Error(`Invalid attract distance: ${typeof val}`);
    } else if (d < 0) {
      throw new Error(`Illegal attract distance: ${val}`);
    }
    _attractDistance = val;
  }
  static get onSetBlockyOffset() { return _onSetBlockyOffset; }
  static set onSetBlockyOffset(func) {
    if (!isfunc(func)) {
      throw new Error(`Invalid callback function: ${typeof func}`);
    }
    _onSetBlockyOffset = func;
  }
  static getReversedLinkType(linkType) {
    switch (linkType) {
      case BlockyBlock.LINK_TYPE.last: return BlockyBlock.LINK_TYPE.next;
      case BlockyBlock.LINK_TYPE.next: return BlockyBlock.LINK_TYPE.last;
      case BlockyBlock.LINK_TYPE.parent: return BlockyBlock.LINK_TYPE.child;
      case BlockyBlock.LINK_TYPE.child: return BlockyBlock.LINK_TYPE.parent;
    }
  }
  static escapeBlockyFrom(blocky, linkType, fromBlocky) {
    const offset = [0, 0];
    let fromDom = null;
    switch (linkType) {
      case BlockyBlock.LINK_TYPE.last:
        fromDom = fromBlocky.nextBlockyContainerDOM;
        break;

      case BlockyBlock.LINK_TYPE.parent:
        fromDom = fromBlocky.childBlockyContainerDOM;
        break;
    }
    const parentNode = fromBlocky.rootestBlocky.parentNode;
    parentNode.appendChild(blocky);
    offset[0] += parentNode.scrollLeft;
    offset[1] += parentNode.scrollTop;
    if (fromDom) {
      const { x, y } = fromDom.getBoundingClientRect();
      offset[0] += x;
      offset[1] += y;
    }
    offset[0] -= (blocky.offsetLeft);
    offset[1] -= (blocky.offsetTop);
    blocky.setBlockyOffset(offset[0], offset[1]);
    fromBlocky.unlinkBlocky(BlockyBlock.getReversedLinkType(linkType));
  }
  static dragstartEventListener(startEvent) {
    const self = this.parentNode.host;
    const interrupe = () => startEvent.stopImmediatePropagation();
    startEvent.stopPropagation();
    startEvent.preventDefault();
    if (self.disabled) {
      return interrupe(); // disabled
    }
    switch (self.type) {
      case BlockyBlock.TYPE.expressionHole:
        return interrupe(); // no drag
    }
    (self.unlinkBlocky(BlockyBlock.LINK_TYPE.parent) || self.unlinkBlocky(BlockyBlock.LINK_TYPE.last));
    const attractable = self.rootableBlockyTypes.concat(self.nextBlocky ?[] :self.nextableBlockyTypes);
    let targetBlockys = [];
    let targetRects = [];
    const mutationCallback = () => {
      const rootBlockys = self.parentNode.querySelectorAll(`:scope > ${BlockyBlock.nodeName}`);
      targetBlockys = [];
      for (let blockyIndex = (rootBlockys.length - 1); 0 <= blockyIndex; blockyIndex--) {
        let blocky = rootBlockys[blockyIndex];
        let leaves = blocky.querySelectorAll(BlockyBlock.nodeName);
        let candidates = [blocky];
        for (let leafIndex = (leaves.length - 1); 0 <= leafIndex; leafIndex--) {
          candidates.push(leaves[leafIndex]);
        }
        for (let candidateIndex = (candidates.length - 1); 0 <= candidateIndex; candidateIndex--) {
          let candidate = candidates[candidateIndex];
          if (
            candidate !== self &&
            !candidate.disabled &&
            !targetBlockys.includes(candidate) &&
            attractable.includes(candidate.type)
          ) {
            targetBlockys.push(candidate);
          }
        }
      }
      targetRects = targetBlockys.map((blocky) => {
        return blocky.blockyContainerDOM.getBoundingClientRect();
      });
    };
    self.__eventMutationObserver = new MutationObserver(mutationCallback);
    self.__eventMutationObserver.observe(self.parentNode, {
      childList: true,
    });
    mutationCallback();
    const [startX, startY] = getEventPosition(startEvent);
    const selfRect = self.blockyContainerDOM.getBoundingClientRect();
    const {
      x: selfX,
      y: selfY,
      width: selfW,
      height: selfH,
    } = selfRect;
    let _nearestResult = null;
    let lastX = startX;
    let lastY = startY;
    const removeHighlights = () => {
      targetBlockys.forEach((blocky) => {
        blocky.removeAttribute(ATTRIBUTES.attract);
      });
    };
    const removeListeners = () => {
      removeGlobalListener(EVENT_TYPES.dragMove);
      removeGlobalListener(EVENT_TYPES.dragEnd);
    };
    const dragmoveEventListener = (moveEvent) => {
      const [moveX, moveY] = getEventPosition(moveEvent);
      const newX = (moveX - startX);
      const newY = (moveY - startY);
      const newRect = {
        x: (newX + selfX),
        y: (newY + selfY),
        width: selfW,
        height: selfH,
      };
      const nearest = targetRects.reduce((min, targetRect, targetIndex) => {
        const curr = self.linkBlockyTest(targetBlockys[targetIndex], {
          targetRect,
          selfRect: newRect,
        });
        if (min.distance < curr.distance) {
          return min;
        } else {
          return curr;
        }
      }, { distance: Infinity });
      if (_nearestResult) {
        _nearestResult.target.blocky.removeAttribute(ATTRIBUTES.attract);
      }
      if (nearest.distance < BlockyBlock.attractDistance) {
        const { target: { blocky }, linkType } = nearest;
        blocky.setAttribute(ATTRIBUTES.attract, BlockyBlock.getReversedLinkType(linkType));
        _nearestResult = nearest;
      } else {
        _nearestResult = null;
      }
      self.addBlockyOffset((moveX - lastX), (moveY - lastY));
      lastX = moveX;
      lastY = moveY;
    };
    const dragendEventListener = () => {
      self.__eventMutationObserver.disconnect();
      self.style.zIndex = '';
      removeHighlights();
      removeListeners();
      if (_nearestResult) {
        const { target: { blocky }, linkType } = _nearestResult;
        self.linkBlocky(linkType, blocky);
      }
      if (self.parentNode) {
        self.parentNode.appendChild(self);
        self.removeAttribute(ATTRIBUTES.focused);
      }
    };
    self.style.zIndex = 10;
    self.setAttribute(ATTRIBUTES.focused, '');
    addGlobalListener(EVENT_TYPES.dragMove, dragmoveEventListener);
    addGlobalListener(EVENT_TYPES.dragEnd, dragendEventListener);
    dragmoveEventListener(startEvent);
  }

  constructor() {
    super();
    this.__shadowRoot = this.attachShadow({ mode: 'open' });
    this.__selfMutationCallback = () => {
      for (let leafIndex = 0; leafIndex < this.children.length; leafIndex++) {
        let leaf = this.children[leafIndex];
        if (!(leaf instanceof BlockyBlock) || leaf.disabled) {
          continue;
        }
        let leafType = leaf.type;
        switch (leafType) {
          default:
            break;
  
          case BlockyBlock.TYPE.expressionHole:
            continue;
        }
        if (this.childableBlockyTypes.includes(leafType)) {
          this.linkBlocky('child', leaf);
        } else if (this.nextableBlockyTypes.includes(leafType)) {
          this.linkBlocky('next', leaf);
        }
      }
    };
    this.__selfMutationObserver = new MutationObserver(this.__selfMutationCallback);
  }
  connectedCallback() {
    this.removeAttribute(ATTRIBUTES.focused);
    this.__selfMutationObserver.observe(this, {
      childList: true,
    });
    this.__selfMutationCallback();
    switch (this.type) {
      default:
        {
          const layers = this.layersOfBlocky;
          this.style.setProperty('--layers', layers);
          this.style.setProperty('--layers-odd', (layers % 2));
        }
        break;

      case BlockyBlock.TYPE.expressionHole:
        break;
    }
    addListener(this.blockyContainerDOM, EVENT_TYPES.dragStart, BlockyBlock.dragstartEventListener);
  }
  disconnectedCallback() {
    if (this.__eventMutationObserver) {
      this.__eventMutationObserver.disconnect();
    }
    this.__selfMutationObserver.disconnect();
    removeListener(this.blockyContainerDOM, EVENT_TYPES.dragStart, BlockyBlock.dragstartEventListener);
  }
  attributeChangedCallback(attrName, oldVal, newVal) {
    switch (attrName) {
      case ATTRIBUTES.type:
        this.unlinkAllBlockys();
        this.__lastable = [];
        this.__nextable = [];
        this.__parentable = [];
        this.__childable = [];
        switch (this.type) {
          case BlockyBlock.TYPE.stackTop:
            this.__shadowRoot.appendChild(shapeStackTop.content.cloneNode(true));
            this.__nextable = [BlockyBlock.TYPE.stackMiddle, BlockyBlock.TYPE.stackBottom, BlockyBlock.TYPE.composite];
            break;

          case BlockyBlock.TYPE.stackMiddle:
            this.__shadowRoot.appendChild(shapeStackMiddle.content.cloneNode(true));
            this.__lastable = [BlockyBlock.TYPE.stackTop, BlockyBlock.TYPE.stackMiddle, BlockyBlock.TYPE.composite];
            this.__nextable = [BlockyBlock.TYPE.stackMiddle, BlockyBlock.TYPE.composite, BlockyBlock.TYPE.stackBottom];
            break;

          case BlockyBlock.TYPE.stackBottom:
            this.__shadowRoot.appendChild(shapeStackBottom.content.cloneNode(true));
            this.__lastable = [BlockyBlock.TYPE.stackTop, BlockyBlock.TYPE.stackMiddle, BlockyBlock.TYPE.composite];
            break;

          case BlockyBlock.TYPE.composite:
            this.__shadowRoot.appendChild(shapeComposite.content.cloneNode(true));
            this.__lastable = [BlockyBlock.TYPE.stackTop, BlockyBlock.TYPE.stackMiddle, BlockyBlock.TYPE.composite]
            this.__nextable = [BlockyBlock.TYPE.stackMiddle, BlockyBlock.TYPE.composite, BlockyBlock.TYPE.stackBottom];
            this.__childable = [BlockyBlock.TYPE.contained];
            break;

          case BlockyBlock.TYPE.contained:
            this.__shadowRoot.appendChild(shapeContained.content.cloneNode(true));
            this.__lastable = [BlockyBlock.TYPE.contained];
            this.__nextable = [BlockyBlock.TYPE.contained];
            this.__parentable = [BlockyBlock.TYPE.composite];
            break;

          case BlockyBlock.TYPE.expression:
            this.__shadowRoot.appendChild(shapeExpression.content.cloneNode(true));
            this.__parentable = [BlockyBlock.TYPE.expressionHole];
            break;

          case BlockyBlock.TYPE.expressionHole:
            this.__shadowRoot.appendChild(shapeExpressionHole.content.cloneNode(true));
            this.__childable = [BlockyBlock.TYPE.expression];
            break;
        }
        break;
    }
  }
  adoptedCallback() {}

  set type(val) {
    switch (val) {
      case BlockyBlock.TYPE.stackTop:
      case BlockyBlock.TYPE.stackMiddle:
      case BlockyBlock.TYPE.stackBottom:
      case BlockyBlock.TYPE.composite:
      case BlockyBlock.TYPE.contained:
      case BlockyBlock.TYPE.expression:
      case BlockyBlock.TYPE.expressionHole:
        this.setAttribute(ATTRIBUTES.type, val);
        break;

      default:
        throw new Error(`Invalid type: ${typeof val}`);
    }
  }
  get type() { return this.getAttribute(ATTRIBUTES.type); }
  set disabled(val) {
    if (val) {
      this.setAttribute(ATTRIBUTES.disabled, '');
    } else {
      this.removeAttribute(ATTRIBUTES.disabled);
    }
  }
  get disabled() { return this.hasAttribute(ATTRIBUTES.disabled); }

  get lastableBlockyTypes() { return this.__lastable.concat(); }
  get nextableBlockyTypes() { return this.__nextable.concat(); }
  get parentableBlockyTypes() { return this.__parentable.concat(); }
  get childableBlockyTypes() { return this.__childable.concat(); }
  get rootableBlockyTypes() { return this.lastableBlockyTypes.concat(this.parentableBlockyTypes); }
  get leafableBlockyTypes() { return this.nextableBlockyTypes.concat(this.childableBlockyTypes); }
  get attractableBlockyTypes() { return this.rootableBlockyTypes.concat(this.leafableBlockyTypes); }
  get lastBlocky() { return (this.__last || null); }
  get nextBlocky() { return (this.__next || null); }
  get parentBlocky() { return (this.__parent || null); }
  get childBlocky() { return (this.__child || null); }
  get blockyContainerDOM() { return this.__shadowRoot.querySelector('.block'); }
  get nextBlockyContainerDOM() { return this.blockyContainerDOM.querySelector('[data-container="next"]'); }
  get childBlockyContainerDOM() { return this.blockyContainerDOM.querySelector('[data-container="child"]'); }
  get rootestBlocky() {
    let root = this;
    while (root) {
      let parentNode = root.parentNode;
      if (parentNode instanceof BlockyBlock) {
        root = parentNode;
      } else {
        return root;
      }
    }
  }
  get layersOfBlocky() {
    let layers = 0;
    let root = this;
    while (root) {
      let parentNode = root.parentNode;
      if (parentNode instanceof BlockyBlock) {
        root = parentNode;
        switch (parentNode.type) {
          default:
            layers++;
            break;

          case BlockyBlock.TYPE.expressionHole:
            break;
        }
      } else {
        return layers;
      }
    }
  }
  get nextBlockys() {
    const nexts = [];
    let nextBlocky = this.nextBlocky;
    while (nextBlocky) {
      nexts.push(nextBlocky);
      nextBlocky = nextBlocky.nextBlocky;
    }
    return nexts;
  }
  get nextestBlocky() { return (this.nextBlocky ?this.nextBlocky.nextestBlocky :this); }
  get childBlockys() { return (this.childBlocky ?[this.childBlocky].concat(this.childBlocky.nextBlockys) :[]); }
  
  getBlockyOffset() {
    const x = stdFloat(this.__x);
    const y = stdFloat(this.__y);
    return [(isNaN(x) ?0 :x), (isNaN(y) ?0 :y)];
  }
  setBlockyOffset(x, y) {
    this.__x = stdFloat(x);
    this.__y = stdFloat(y);
    if (_onSetBlockyOffset) {
      _onSetBlockyOffset.call(this, this.__x, this.__y);
    } else {
      this.blockyContainerDOM.style.transform = `translate(${this.__x}px, ${this.__y}px)`;
    }
  }
  addBlockyOffset(dx, dy) {
    const [x, y] = this.getBlockyOffset();
    this.setBlockyOffset((x + dx), (y + dy));
  }
  linkBlockyTest(target, {
    targetRect = target.blockyContainerDOM.getBoundingClientRect(),
    selfRect = this.blockyContainerDOM.getBoundingClientRect(),
  } = {}) {
    const targetType = target.type;
    const result = {
      distance: Infinity,
      linkType: null,
      target: {
        type: targetType,
        blocky: target,
      },
      self: {
        type: this.type,
        blocky: this,
      },
    };
    if (this.lastableBlockyTypes.includes(targetType) && !target.nextBlocky) {
      const targetNextRect = target.nextBlockyContainerDOM.getBoundingClientRect();
      const distance = pointDist([selfRect.x, selfRect.y], [targetNextRect.x, targetNextRect.y]);
      if (distance < result.distance) {
        result.distance = distance;
        result.linkType = BlockyBlock.LINK_TYPE.last;
      }
    }
    if (this.nextableBlockyTypes.includes(targetType) && !target.lastBlocky) {
      const selfNextRect = this.nextBlockyContainerDOM.getBoundingClientRect();
      const distance = pointDist([selfNextRect.x, selfNextRect.y], [targetRect.x, targetRect.y]);
      if (distance < result.distance) {
        result.distance = distance;
        result.linkType = BlockyBlock.LINK_TYPE.next;
      }
    }
    if (this.parentableBlockyTypes.includes(targetType) && !target.childBlocky) {
      const targetChildRect = target.childBlockyContainerDOM.getBoundingClientRect();
      const distance = pointDist([selfRect.x, selfRect.y], [targetChildRect.x, targetChildRect.y]);
      if (distance < result.distance) {
        result.distance = distance;
        result.linkType = BlockyBlock.LINK_TYPE.parent;
      }
    }
    // not to attract childable blockys
    //
    // if (this.childableBlockyTypes.includes(targetType) && !target.parentBlocky) {
    //   const selfChildRect = this.childBlockyContainerDOM.getBoundingClientRect();
    //   const distance = pointDist([selfChildRect.x, selfChildRect.y], [targetRect.x, targetRect.y]);
    //   if (distance < result.distance) {
    //     result.distance = distance;
    //     result.linkType = BlockyBlock.LINK_TYPE.child;
    //   }
    // }
    return result;
  }
  linkBlocky(linkType, target) {
    switch (linkType) {
      case BlockyBlock.LINK_TYPE.last:
        if (this.lastBlocky !== target) {
          this.unlinkBlocky(linkType);
          this.__last = target;
          this.setBlockyOffset(0, 0);
          this.setAttribute(ATTRIBUTES.last, target.type);
          target.linkBlocky(BlockyBlock.getReversedLinkType(linkType), this);
        }
        break;

      case BlockyBlock.LINK_TYPE.next:
        target.setAttribute('slot', 'next');
        if (this.nextBlocky !== target) {
          this.unlinkBlocky(linkType);
          this.__next = target;
          this.appendChild(target);
          this.setAttribute(ATTRIBUTES.next, target.type);
          target.linkBlocky(BlockyBlock.getReversedLinkType(linkType), this);
        }
        break;

      case BlockyBlock.LINK_TYPE.parent:
        if (this.parentBlocky !== target) {
          this.unlinkBlocky(linkType);
          this.__parent = target;
          this.setBlockyOffset(0, 0);
          this.setAttribute(ATTRIBUTES.parent, target.type);
          target.linkBlocky(BlockyBlock.getReversedLinkType(linkType), this);
        }
        break;

      case BlockyBlock.LINK_TYPE.child:
        target.setAttribute('slot', 'child');
        if (this.childBlocky !== target) {
          this.unlinkBlocky(linkType);
          this.__child = target;
          this.appendChild(target);
          this.setAttribute(ATTRIBUTES.child, target.type);
          target.linkBlocky(BlockyBlock.getReversedLinkType(linkType), this);
        }
        break;
    }
  }
  unlinkBlocky(linkType) {
    switch (linkType) {
      case BlockyBlock.LINK_TYPE.last:
        this.removeAttribute('slot');
        if (this.lastBlocky) {
          const { lastBlocky } = this;
          this.__last = null;
          this.removeAttribute(ATTRIBUTES.last);
          BlockyBlock.escapeBlockyFrom(this, linkType, lastBlocky);
          return lastBlocky;
        }
        break;

      case BlockyBlock.LINK_TYPE.next:
        if (this.nextBlocky) {
          const { nextBlocky } = this;
          this.__next = null;
          this.removeAttribute(ATTRIBUTES.next);
          nextBlocky.unlinkBlocky(BlockyBlock.getReversedLinkType(linkType));
          return nextBlocky;
        }
        break;

      case BlockyBlock.LINK_TYPE.parent:
        this.removeAttribute('slot');
        if (this.parentBlocky) {
          const { parentBlocky } = this;
          this.__parent = null;
          this.removeAttribute(ATTRIBUTES.parent);
          BlockyBlock.escapeBlockyFrom(this, linkType, parentBlocky);
          return parentBlocky;
        }
        break;

      case BlockyBlock.LINK_TYPE.child:
        if (this.childBlocky) {
          const { childBlocky } = this;
          this.__child = null;
          this.removeAttribute(ATTRIBUTES.child);
          childBlocky.unlinkBlocky(BlockyBlock.getReversedLinkType(linkType));
          return childBlocky;
        }
        break;
    }
    return null;
  }
  unlinkAllBlockys() {
    Object.keys(BlockyBlock.LINK_TYPE).forEach((key) => this.unlinkBlocky(BlockyBlock.LINK_TYPE[key]));
  }
}

customElements.define(BlockyBlock.nodeName, BlockyBlock);

export default BlockyBlock;