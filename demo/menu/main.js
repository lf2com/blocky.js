(function(Blocky) {
  const domRoot = document.getElementById('root');
  const domMenu = document.getElementById('menu');
  let blockyIdCount = 0;
  
  const getEventPosition = ({
    clientX: mx,
    clientY: my,
    touches: [{
      clientX: x = mx,
      clientY: y = my
    } = {}] = [],
  }) => [x, y];

  const createMenuItem = (callForParams) => {
    const domItem = document.createElement('div');
    const blocky = new Blocky(callForParams());
    const blockyDom = blocky.getDOM();
    const onStartDrag = (args) => {
      const [stX, stY] = getEventPosition(args);
      const { x: posX, y: posY } = blockyDom.getBoundingClientRect();
      const dx = (stX - posX);
      const dy = (stY - posY);
      const clonedBlocky = new Blocky({
        ...callForParams(),
        id: ++blockyIdCount,
      });
      const clonedBlockyDom = clonedBlocky.getDOM();
      const onDragging = (evt) => {
        const [x, y] = getEventPosition(evt);
        clonedBlockyDom.style.top = (y - dy);
        clonedBlockyDom.style.left = (x - dx);
      };
      const onEnd = () => {
        document.removeEventListener('mousemove', onDragging);
        document.removeEventListener('touchmove', onDragging);
        document.removeEventListener('mouseup', onEnd);
        document.removeEventListener('mouseleave', onEnd);
        document.removeEventListener('touchend', onEnd);
      };
      document.addEventListener('mousemove', onDragging);
      document.addEventListener('touchmove', onDragging);
      document.addEventListener('mouseup', onEnd);
      document.addEventListener('mouseleave', onEnd);
      document.addEventListener('touchend', onEnd);
      clonedBlockyDom.style.top = posY;
      clonedBlockyDom.style.left = posX;
      domRoot.appendChild(clonedBlockyDom);
    };
    blocky.setEnabled(false);
    blockyDom.addEventListener('mousedown', onStartDrag);
    blockyDom.addEventListener('touchstart', onStartDrag);
    blockyDom.style.top = 10;
    blockyDom.style.left = 20;
    domItem.appendChild(blockyDom);
    return domItem;
  };

  const addMenuItem = (callForBlockyParams, title) => {
    const domItem = document.createElement('div');
    const domSample = createMenuItem(callForBlockyParams);
    const domTitle = document.createElement('div');
    domItem.classList.add('item');
    domTitle.classList.add('title');
    domSample.classList.add('sample');
    domTitle.innerHTML = title;
    domItem.appendChild(domTitle);
    domItem.appendChild(domSample);
    domMenu.appendChild(domItem);
  };

  // stackTop
  addMenuItem(() => ({
    type: 'stackTop',
    content: 'top',
  }), '#stackTop');

  // stackMiddle
  addMenuItem(() => ({
    type: 'stackMiddle',
    content: 'middle',
  }), '#stackMiddle');

  // stackBottom
  addMenuItem(() => ({
    type: 'stackBottom',
    content: 'bottom',
  }), '#stackBottom');

  // composite
  addMenuItem(() => ({
    type: 'composite',
    content: 'comp',
  }), '#composite');

  // contained
  addMenuItem(() => ({
    type: 'contained',
    content: 'cont',
  }), '#contained');

  // expression
  addMenuItem(() => ({
    type: 'expression',
    content: 'expr',
  }), '#expression');

  // expression in expression
  addMenuItem(() => ({
    type: 'expression',
    contents: [
      Blocky.createExpressionHoleDOM(),
      ' + ',
      Blocky.createExpressionHoleDOM(),
    ],
  }), '#expression combo');

  // expression in stackMiddle
  addMenuItem(() => ({
    type: 'stackMiddle',
    contents: [
      'middle: ',
      Blocky.createExpressionHoleDOM(),
    ],
  }), '#expression in stackMiddle');

  // expression in contained
  addMenuItem(() => ({
    type: 'contained',
    contents: [
      'cont: ',
      Blocky.createExpressionHoleDOM(),
    ],
  }), '#expression in contained');

})(this.Blocky);