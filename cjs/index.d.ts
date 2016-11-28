/**
 * CommonJS Type Definition Mixin for CJS Interop Library
 * Copyright (c) 2016 Fadhli Dzil Ikram
 */

import * as main from '../dist'

declare interface Mixin {
  <TObj, TSrc>(TObj: TObj, TSrc: TSrc): TObj & TSrc
}

declare const Mixin:Mixin

export = Mixin(main.default, main)
