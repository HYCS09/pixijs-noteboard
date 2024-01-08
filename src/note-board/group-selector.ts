import { Container, DisplayObject, Polygon, Transform } from 'pixi.js';

export class GroupSelector extends Container {
  constructor() {
    super();
    this.cursor = 'pointer';
    this.interactive = true;
    this.interactiveChildren = false;
  }
  setXAndY(x: number, y: number) {
    this.position.set(x, y);
    this.transform.updateTransform(new Transform());
  }
  addChildrenFromStage(objList: DisplayObject[]) {
    this.addChild(...objList);
    objList.forEach((obj) => {
      obj.position.set(
        obj.position.x - this.position.x,
        obj.position.y - this.position.y
      );
    });
    const localBounds = this.getLocalBounds();
    this.hitArea = new Polygon([
      0,
      0,
      localBounds.width,
      0,
      localBounds.width,
      localBounds.height,
      0,
      localBounds.height,
    ]);
  }
  putChildrenBackToStage(stage: Container) {
    const groupSelectorMatrix = this.localTransform.clone();

    const children = [...this.children];
    children.forEach((obj) => {
      stage.addChild(obj);

      // (每个child相对container的变换矩阵)左乘(container相对stage的变换矩阵)就得到了(每个child相对于stage的变换矩阵)
      const finalMatrix = groupSelectorMatrix
        .clone()
        .append(obj.localTransform);
      obj.transform.setFromMatrix(finalMatrix);
    });
  }
}
