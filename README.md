# Blocky.js

Blocky.js is a JavaScript library for us to create blockys to build customized blocky chain. To know more about it, have a try [here](https://lf2com.github.io/blocky.js/demo/chain.html).

## Demo

### [Chain Demo](https://lf2com.github.io/blocky.js/demo/chain.html)

> Drag blockys from template rows to the platform and composite them into a chain. Also we can get the root chain result in detail.

## Element

Blocky is a custom element extending native HTMLElement so that we could treat it as a HTML element.

Create blocky elements by the following ways:

### HTML

Create a blocky by HTML tag:

```html
<blocky-block type="stackTop">
  This is a stackTop blocky
</blocky-block>
```

### JavaScript

Create a blocky by JavaScript:

```js
let blocky = document.createElement('blocky-block');
blocky.setAttribute('type', 'stackTop');
blocky.innerHTML = 'This is a stackTop blocky';
document.body.appendChild(blocky);
```

Or create a blocky by newing a blocky object:

```js
let blocky = new BlockyBlack(); // if use released blocky.js
blocky.type = 'stackTop';
blocky.innerHTML = 'This is a stackTop blocky';
document.body.appendChild(blocky);
```

Create a series of blockys:

```html
<blocky-block type="stackTop">
  #top
  <blocky-block type="stackMiddle">
    #middle
    <blocky-block type="stackBottom">
      #bottom
    </blocky-block>
  </blocky-block>
</blocky-block>

<blocky-block type="composite">
    #composite
    <blocky-block type="contained">
      #contained-1
      <blocky-block type="contained">
        #contained-2
      </blocky-block>
    </blocky-block>
  </blocky-block>
```

Equals to

```js
function createBlocky(type, html) {
  let blocky = document.createElement('blocky-block');
  blocky.type = type;
  blocky.innerHTML = html;
  return blocky;
}
let topBlocky = createBlocky('stackTop', '#top');
let middleBlocky = createBlocky('stackMiddle', '#middle');
let bottomBlocky = createBlocky('stackBottom', '#bottom');
topBlocky.appendChild(middleBlocky);
middleBlocky.appendChild(bottomBlocky);
document.body.appendChild(topBlocky);

let compositeBlocky = createBlocky('composite', '#composite');
let contained1Blocky = createBlocky('contained', '#contained-1');
let contained2Blocky = createBlocky('contained', '#contained-2');
compositeBlocky.appendChild(contained1Blocky);
contained1Blocky.appendChild(contained2Blocky);
document.body.appendChild(compositeBlocky);
```

## Global Properties

### TYPE

Types of blocky that we can use to create blocky.

|Type|Value|
|:-:|:-:|
|[stackTop](#stackTop)|`stackTop`|
|[stackMiddle](#stackMiddle)|`stackMiddle`|
|[stackBottom](#stackBottom)|`stackBottom`|
|[composite](#composite)|`composite`|
|[contained](#contained)|`contained`|
|[expression](#expression)|`expression`|
|[expressionHole](#expressionHole)|`expressionHole`|

```js
console.log(Blocky.TYPE.stackTop); // "stackTop"
```

### LINK_TYPE

Types of link way that blockys connect to each other.

|Type|Value|Reversed Type|
|:-:|:-:|:-:|
|last|`last`|next|
|next|`next`|last|
|parent|`parent`|parent|
|child|`child`|child|

```js
console.log(Blocky.LINK_TYPE.last); // "last"
```

### nodeName

Node name of blocky.

Always get `blocky-block`.

```js
console.log(Blocky.nodeName); // "blocky-block"
```

### attractDistance

Get/set the distance of attracting blockys.

`20` in pixel for default.

```js
console.log(Blocky.attractDistance); // 20
Blocky.attractDistance = 30;
console.log(Blocky.attractDistance); // 30
```

### onSetBlockyOffset

Get/set the handler that sets the position of blocky offset.

```js
console.log(Blocky.onSetBlockyOffset); // null

// What the default handler does is like
Blocky.onSetBlockyOffset = function(x, y) {
  // Set translate of transform on the blockyContainerDOM
  this.blockyContainerDOM.style.transform = `translate(${x}px, ${y}px)`;
};
console.log(Blocky.onSetBlockyOffset); // The above function
```

## Properties

### type

Get/set blocky type.

```js
console.log(blocky.type);
// equals to
console.log(blocky.getAttribute('type'));
```

```js
blocky.type = 'stackTop';
// equals to
blocky.setAttribute('type', 'stackTop');
```

Blocky supports the following types:

#### stackTop

Used as the root/topest blocky of the chain.

```js
console.log(Blocky.TYPE.stackTop); // "stackTop"
```

> **Last**: none
>
> **Next**: [stackMiddle](#stackMiddle), [stackBottom](#stackBottom), [composite](#composite)
>
> **Parent**: none
>
> **Child**: none

#### stackMiddle

Used as the middle blocky to link blockys on the main chain.

```js
console.log(Blocky.TYPE.stackMiddle); // "stackMiddle"
```

> **Last**: [stackTop](#stackTop), [stackMiddle](#stackMiddle), [composite](#composite)
>
> **Next**: [stackMiddle](#stackMiddle), [composite](#composite), [stackBottom](#stackBottom)
>
> **Parent**: none
>
> **Child**: none

#### stackBottom

Used as the end blocky of the chain.

```js
console.log(Blocky.TYPE.stackBottom); // "stackBottom"
```

> **Last**: [stackTop](#stackTop), [stackMiddle](#stackMiddle), [composite](#composite)
>
> **Next**: none
>
> **Parent**: none
>
> **Child**: none

#### composite

Similar to [stackMiddle](#stackMiddle) blocky but could hold child blocky.

```js
console.log(Blocky.TYPE.composite); // "composite"
```

> **Last**: [stackTop](#stackTop), [stackMiddle](#stackMiddle), [composite](#composite)
>
> **Next**: [stackMiddle](#stackMiddle), [composite](#composite), [stackBottom](#stackBottom)
>
> **Parent**: none
>
> **Child**: [contained](#contained)

#### contained

Similar to [stackMiddle](#stackMiddle) blocky but could only exist as a child blocky.

```js
console.log(Blocky.TYPE.contained); // "contained"
```

> **Last**: [contained](#contained)
>
> **Next**: [contained](#contained)
>
> **Parent**: [composite](#composite)
>
> **Child**: none

#### expression

Used to connect to [expressionHole](#expressionHole) blocky as parent blocky.

```js
console.log(Blocky.TYPE.expression); // "expression"
```

> **Last**: none
>
> **Next**: none
>
> **Parent**: [expressionHole](#expressionHole)
>
> **Child**: none

#### expressionHole

Used to hold [expression](#expression) blocky as child blocky.

```js
console.log(Blocky.TYPE.expressionHole); // "expressionHole"
```

> **Last**: none
>
> **Next**: none
>
> **Parent**: none
>
> **Child**: [expression](#expression)

### disabled

Get/set whether the blocky is **draggable** and **attractable** or not `true|false`.

```js
console.log(blocky.disabled);
// equals to
console.log(blocky.getAttribute('disabled'));
```

```js
blocky.disabled = true;
// equals to
blocky.setAttribute('disabled', '');
```

### lastableBlockyTypes

The array of blocky types that can be the last blocky for this blocky.

```js
console.log(stackTopBlocky.lastableBlockyTypes); // []
console.log(stackBottomBlocky.lastableBlockyTypes); // ["stackTop", "stackMiddle", "composite"]
```

### nextableBlockyTypes

The array of blocky types that can be the next blocky for this blocky.

```js
console.log(stackTopBlocky.nextableBlockyTypes); // ["stackMiddle", "stackBottom", "composite"]
console.log(stackBottomBlocky.nextableBlockyTypes); // []
```

### parentableBlockyTypes

The array of blocky types that can be the parent blocky for this blocky.

```js
console.log(stackTopBlocky.parentableBlockyTypes); // []
console.log(containedBlocky.parentableBlockyTypes); // ["composite"]
```

### childableBlockyTypes

The array of blocky types that can be the child blocky for this blocky.

```js
console.log(stackTopBlocky.childableBlockyTypes); // []
console.log(compositeBlocky.childableBlockyTypes); // ["contained"]
```

### rootableBlockyTypes

The array of blocky types that can be the top blocky for this blocky. That is the combination of [lastableBlockyTypes](#lastableBlockyTypes) and [parentableBlockyTypes](#parentableBlockyTypes).

```js
console.log(containedBlocky.lastableBlockyTypes); // ["contained"]
console.log(containedBlocky.parentableBlockyTypes); // ["composite"]
console.log(containedBlocky.rootableBlockyTypes); // ["contained", "composite"]
```

### leafableBlockyTypes

The array of blocky types that can be the bottom blocky for this blocky. That is the combination of [nextableBlockyTypes](#nextableBlockyTypes) and [childableBlockyTypes](#childableBlockyTypes).

```js
console.log(compositeBlocky.nextableBlockyTypes); // ["stackMiddle", "composite", "stackBottom"]
console.log(compositeBlocky.childableBlockyTypes); // ["contained"]
console.log(compositeBlocky.leafableBlockyTypes); // ["stackMiddle", "composite", "stackBottom", "contained"]
```

### attractableBlockyTypes

The array of blocky types that can be any linkable blocky for the blocky. That is the combination of [rootableBlockyTypes](#rootableBlockyTypes) and [leafableBlockyTypes](#leafableBlockyTypes).

```js
console.log(stackTopBlocky.attractableBlockyTypes); // ["stackMiddle", "stackBottom", "composite"]
```

### lastBlocky

The last blocky of this blocky.

`null` if not exist.

### nextBlocky

The next blocky of this blocky.

`null` if not exist.

### parentBlocky

The parent blocky of this blocky.

`null` if not exist.

### childBlocky

The child blocky of this blocky.

`null` if not exist.

### blockyContainerDOM

The container DOM hosting the shape and content of this blocky.

### nextBlockyContainerDOM

The next blocky container DOM hosting the next blocky of this blocky.

To access the next blocky, call [nextBlocky](#nextBlocky).

### childBlockyContainerDOM

The child blocky container DOM hosting the child blocky of this blocky.

To access the child blocky, call [childBlocky](#childBlocky).

### rootestBlocky

The topest blocky of this blocky. That is finding the last/parent blocky until hits the root.

Return `this` if there is no last/parent blocky for this blocky.

### layersOfBlocky

The layers from the [rootestBlocky](#rootestBlocky) of this blocky.

`0` if this blocky is the topest blocky.

### nextBlockys

The array of all the next blockys from this blocky.

### nextestBlocky

The last blocky of [nextBlockys](#nextBlockys) from this blocky.

`this` if there is no next blocky for this blocky.

### childBlockys

The array of all child blockys belong to this blocky.

## Methods

### getBlockyOffset

> **Syntax**: getBlockyOffset()

Return offset `[x, y]` of this blocky in pixel unit.

### setBlockyOffset

> **Syntax**: setBlockyOffset(_x_, _y_)

Set offset `[x, y]` of this blocky in pixel unit.

### addBlockyOffset

> **Syntax**: addBlockyOffset(_dx_, _dy_)

Add offset differences `[dx, dy]` of this blocky in pixel unit.

```js
let [x, y] = blocky.getBlockyOffset();
blocky.setBlokcyOffset((x + 10), (y + 20));
// equals to
blocky.addBlockyOffset(10, 20);
```

### linkBlockyTest

> **Syntax**: linkBlockyTest(_target_[, _options_])

Get the result of attraction between this blocky and target blocky.

**Options**

|Property|Type|Description|
|:-:|:-:|:-|
|targetRect|_Object_|Rectangle (`x`, `y`, `width`, `height`) of target blocky to detect attraction|
|selfRect|_Object_|Rectangle (`x`, `y`, `width`, `height`) of this blocky to detect attraction|

**Return**

|Property|Type|Description|
|:-:|:-:|:-|
|distance|_Number_|Distance between this blocky and target blocky. `Infinity` if unable to attract.|
|linkType|_String_|[Link type](#linkType) for this blocky to connect to target blocky. `null` if unable to attract.|
|target.type|_String_|[Blocky type](#type) of target blocky.|
|target.blocky|_Blocky_|Target [blocky element](#element).|
|self.type|_String_|[Blocky type](#type) of this blocky.|
|self.blocky|_Blocky_|This [blocky element](#element).|

### linkBlocky

> **Syntax**: linkBlocky(_linkType_, _target_)

Connect a target blocky to this blocky by specific [link type](#linkType).

```js
stackTopBlocky.linkBlocky('next', stackBottomBlocky);
// equals to
stackBottomBlocky.linkBlocky('last', stackTopBlocky);

compositeBlocky.linkBlocky('child', containedBlocky);
// equals to
containedBlocky.linkBlocky('parent', compositeBlocky);
```

### unlinkBlocky

> **Syntax**: unlinkBlocky(linkType)

Disconnect specific [link type](#linkType) of this blocky.

**Return**

Disconnected blocky.

`null` if there is no connected blocky.

```js
stackTopBlocky.unlinkBlocky('next'); // null

stackTopBlocky.linkBlocky('next', stackBottomBlocky);
stackTopBlocky.unlinkBlocky('next'); // stackBottomBlocky
```

### unlinkAllBlockys

> **Syntax**: unlinkAllBlockys()

Disconnect all link types of this blocky.

```js
stackTopBlocky.unlinkAllBlockys();
```

## Applications

### Position of Blocky

Except [expressionHole](#expressionHole) blocky, all the other blocky types are default set their style as:

```css
position: absolute;
height: 0;
```

> The mission of [expressionHole](#expressionHole) blocky is not to be dragged for connecting but to be the container of [expression](#expression) blocky. So it is designed to be used as a normal inline HTML element such as `<span>`.

Until the blocky is connected as one's child/next blocky, its style would be set as:

```css
position: relative;
height: auto;
```

#### Set Position

> _**NOTICE:** The DOM handling position of a blocky is the shadow DOM element belong to the blocky element. Setting position on the blocky element might cause unexpected result on dragging and connecting._

To change the position of blockys, use [setBlockyOffset](#setBlockyOffset) to set the `[x, y]` in pixel on the actual blocky DOM.

#### Get Position

To get the current position of blockys, use [getBlockyOffset](#getBlockyOffset) to get the `[x, y]` of the blocky in pixel.

#### Handle Position Ourselves

Currently the default handler sets `[x, y]` by unit of pixel. We can replace [onSetBlockyOffset](#onSetBlockyOffset) to handle the changes ourselves.

### Chain of Blockys

Based on the [demo](#chain-demo). Here are 2 samples about getting chain of blockys:

#### Array of Blockys

Get the array of next blockys with branches of child's next blockys.

**Each element of array in result**

|Property|Type|Description|
|:-:|:-:|:-|
|target|_Blocky_|[Blocky element](#element).|
|child|_Array_|Array of child [chain](#array-of-blockys) if exist.|

```js
let chain = [rootBlocky]
  .concat(rootBlocky.nextBlockys)
  .map(function(node) {
    return {
      target: node,
      child: node.childBlockys,
    };
  });
```

#### Object of Blockys

Get the linked list of next/child blockys.

**Each element in result**

|Property|Type|Description|
|:-:|:-:|:-|
|target|_Blocky_|[Blocky element](#element).|
|next|_Object_|Object of next [chain](#object-of-blockys). `null` if not exist.|
|child|_Object_|Object of child [chain](#object-of-blockys). `null` if not exist.|

```js
function getLeaf(node) {
  if (!node) {
    return null;
  }
  return {
    target: node,
    next: getLeaf(node.nextBlocky),
    child: getLeaf(node.childBlocky),
  };
}

let chain = getLeaf(rootBlocky);
```
