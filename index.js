'use strict';

import Blocky from './libs/blocky';

module.exports = Blocky;
if (global.self && global.self instanceof Object && global.self === global.self.self) {
  global.self.Blocky = Blocky;
}