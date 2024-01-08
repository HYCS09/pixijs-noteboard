import { DisplayObject, Graphics } from 'pixi.js';

export class ControlPoint extends Graphics {
  controlTarget: DisplayObject;
  constructor(target: DisplayObject) {
    super();
    this.controlTarget = target;
  }
}
