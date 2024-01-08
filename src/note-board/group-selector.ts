import { Container, DisplayObject, Rectangle, Transform } from 'pixi.js';

export class GroupSelector extends Container {
  constructor() {
    super();
    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.interactiveChildren = false;
  }
  setXAndY(x: number, y: number) {
    this.position.set(x, y);
    this.transform.updateTransform(new Transform());
  }
  addChildrenFromRootContainer(objList: DisplayObject[]) {
    this.addChild(...objList);
    objList.forEach((obj) => {
      obj.position.set(
        obj.position.x - this.position.x,
        obj.position.y - this.position.y
      );
    });
    const localBounds = this.getLocalBounds();
    this.hitArea = new Rectangle(0,0,localBounds.width,localBounds.height)
  }
  putChildrenBackToRootContainer(rootContainer: Container) {
    const groupSelectorMatrix = this.localTransform.clone();

    const children = [...this.children];
    children.forEach((obj) => {
      rootContainer.addChild(obj);

      // (每个child相对container的变换矩阵)左乘(container相对rootContainer的变换矩阵)就得到了(每个child相对于rootContainer的变换矩阵)
      const finalMatrix = groupSelectorMatrix
        .clone()
        .append(obj.localTransform);
      obj.transform.setFromMatrix(finalMatrix);
    });
  }
}
