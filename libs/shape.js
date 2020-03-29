import { isset, isstr } from './stdlib';
import BLOCKY_TYPES from './types';
import styles from '../styles/blocky.scss';

const CLASSES = {
  fill: 'fill',
  wrap: 'wrap',
  block: 'block',
  shape: 'shape',
};

const AREAS = [
  'topLeft',
  'topRight',
  'bottomLeft',
  'bottomRight',
  'fill',
].reduce((areas, area, index) => ({ ...areas, [area]: index }), {});

const COMPONENTS = {
  topBump: {
    area: AREAS.topLeft,
    translate: [0, '-50%'],
    size: [12, 5],
    path: 'M0 2.5 h5 q-.5 -1.5,1 -1.5 q1.5 0,1 1.5 h5 v2.5 h-12',
  },
  rightContainer: [
    {
      area: AREAS.topRight,
      translate: ['100%', 0],
      size: [12, 5],
      path: 'M0 0 h12 v3 h-5 q.5 -1.5,-1 -1.5 q-1.5 0,-1 1.5 h-3 a2 2,0 0 0,-2 2',
    }, {
      area: AREAS.bottomRight,
      translate: ['100%', 0],
      size: [12, 5],
      path: 'M0 0 a2 2,0 0 0,2 2 h10 v3 h-12',
    }
  ],
  bottomIndent: {
    area: AREAS.bottomLeft,
    translate: [0, 0],
    size: [12, 5],
    path: 'M0 0 v5 h5 q-.5 -1.5,1 -1.5 q1.5 0,1 1.5 h5 v-5 h12',
    noBackground: true,
  },
  leftBump: {
    area: AREAS.topLeft,
    translate: ['-50%', '75%'],
    rotate: '-90deg',
    size: [12, 5],
    path: 'M0 2.5 h5 q-.5 -1.5,1 -1.5 q1.5 0,1 1.5 h5 v2.5 h-12',
  },
};

function createDOM(node, attrs = {}, classes = []) {
  const dom = document.createElement(node);
  for (let name in attrs) {
    dom.setAttribute(name, attrs[name]);
  }
  classes.forEach((name) => dom.classList.add(name));
  return dom;
}

// create SVG
function createSVG({
  area,
  translate: [x, y],
  rotate,
  size: [w = 1, h = 1] = [],
  path,
  noBackground,
}) {
  const domWrap = createDOM('div', {}, [CLASSES.wrap]);
  const domSvg = createDOM('svg', {
    'data-area': area,
    viewBox: `0 0 ${w} ${h}`,
    'fill-rule': 'evenodd',
  });
  domSvg.style.transform = ` translate(${x}, ${y})`;
  (rotate && (domSvg.style.transform += ` rotate(${rotate})`));
  if (isset(path)) {
    const domPath = createDOM('path', { d: path });
    domSvg.appendChild(domPath);
  }
  if (noBackground) {
    domWrap.style.background = 'none';
  }
  domWrap.appendChild(domSvg);
  return domWrap;
}

const createRowDOM = (rowType = '') => createDOM('div', { 'data-row': rowType });
const createFillDOM = () => createDOM('div', {}, [CLASSES.fill]);
const createContainerDOM = (containerType = '', slotName = containerType) => {
  const dom = createDOM('div', { 'data-container': containerType });
  (isstr(slotName) && dom.appendChild(createDOM('slot', { name: slotName })));
  return dom;
}
const createHighlightDOM = (highlightType = '') => createDOM('div', { 'data-highlight': highlightType });
const createShape = (type, components = []) => {
  const domTemplate = createDOM('template');
  const domBlock = createDOM('div', { 'data-type': type }, [CLASSES.block]);
  const domShape = createDOM('div', {}, [CLASSES.shape]);
  const domRows = createContainerDOM('shape');
  const domTopRow = createRowDOM('top');
  const domMiddleRow = createRowDOM('middle');
  const domBottomRow = createRowDOM('bottom');
  const domNext = createContainerDOM('next');
  const domChild = createContainerDOM('child');
  domTopRow.appendChild(createFillDOM());
  domMiddleRow.appendChild(createContainerDOM('children', ''));
  domBottomRow.appendChild(createFillDOM());
  domRows.appendChild(createHighlightDOM('last'));
  domRows.appendChild(createHighlightDOM('parent'));
  domRows.appendChild(createHighlightDOM('next'));
  domRows.appendChild(createHighlightDOM('child'));
  components.flat().forEach((component) => {
    const { area } = component;
    const domSvg = createSVG(component);
    switch (area) {
      case AREAS.topLeft:
        domTopRow.insertBefore(domSvg, domTopRow.firstChild);
        break;

      case AREAS.topRight:
        domTopRow.appendChild(domSvg);
        break;

      case AREAS.bottomLeft:
        domBottomRow.insertBefore(domSvg, domBottomRow.firstChild);
        break;

      case AREAS.bottomRight:
        domBottomRow.appendChild(domSvg);
        break;
    }
  });
  domRows.appendChild(domTopRow);
  domRows.appendChild(domMiddleRow);
  domRows.appendChild(domBottomRow);
  domShape.appendChild(domRows);
  domShape.appendChild(domChild);
  domBlock.appendChild(domShape);
  domBlock.appendChild(domNext);
  domTemplate.innerHTML = `
    <style>${styles.innerHTML}</style>
    ${domBlock.outerHTML}
  `;
  return domTemplate;
}

export const shapeStackTop = createShape(
  BLOCKY_TYPES.stackTop,
  [COMPONENTS.bottomIndent],
);
export const shapeStackMiddle = createShape(
  BLOCKY_TYPES.stackMiddle,
  [COMPONENTS.topBump, COMPONENTS.bottomIndent],
);
export const shapeStackBottom = createShape(
  BLOCKY_TYPES.stackBottom,
  [COMPONENTS.topBump],
);
export const shapeComposite = createShape(
  BLOCKY_TYPES.composite,
  [COMPONENTS.topBump, COMPONENTS.bottomIndent, COMPONENTS.rightContainer],
);
export const shapeContained = createShape(
  BLOCKY_TYPES.contained,
  [COMPONENTS.topBump, COMPONENTS.bottomIndent],
);
export const shapeExpression = createShape(
  BLOCKY_TYPES.expression,
  [COMPONENTS.leftBump],
);
export const shapeExpressionHole = createShape(
  BLOCKY_TYPES.expressionHole,
  [COMPONENTS.leftBump],
);

export default createShape;