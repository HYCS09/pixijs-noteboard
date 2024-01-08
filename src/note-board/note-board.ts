import {
  Application,
  IApplicationOptions,
  Graphics,
  Point,
  Transform,
  InteractionEvent,
  DisplayObject,
  Text,
} from 'pixi.js';
import { Tool } from './enums';
import { copyPoint } from './utils';
import { ControlPoint } from './control-point';
import { SelectorTool } from './selector-tool';
import { Box } from './type';
import { GroupSelector } from './group-selector';

class NoteBoard extends Application {
  private onLoad?: () => void;
  private viewClientRect?: DOMRect;
  private stageBorder?: Graphics;
  private minZoom: number = 0.2;
  private maxZoom: number = 5;
  private curTool: Tool = Tool.Pointer;
  private touchBlank: boolean = false;
  private mouseDownPoint: Point = new Point(0, 0);
  private stageOriginalPos: Point = new Point(0, 0);
  private curDragTarget?: DisplayObject;
  private curDragTargetOriginalPos: Point = new Point(0, 0);
  private activeObject?: DisplayObject;
  private activeObjBorder?: Graphics;
  private activeObjControlPoint?: ControlPoint;
  private rotatingActiveObject = false;
  private originalAngle: number = 0;
  private originalCenter: Point = new Point(0, 0);
  private selectorTool?: SelectorTool;
  private groupSelector?: GroupSelector;
  private lastPointerUpTime: number = 0;
  private textEditor?: HTMLDivElement;
  constructor(args: Partial<IApplicationOptions>) {
    super(args);

    const rootContainer = document.getElementById(
      'root-container'
    ) as HTMLDivElement;
    rootContainer.appendChild(this.view as HTMLCanvasElement);

    // window.__PIXI_APP__ = this;

    this.stage.position.set(0, 0);

    this.addStageBorder();
    // this.ticker.add(this.updateStageBorder);
    this.ticker.add(this.updateActiveTargetBorder);
    this.ticker.add(this.updateActiveTargetControlPoint);
    this.ticker.add(this.updateTextEditor);

    (this.view as HTMLCanvasElement).addEventListener('wheel', (event) => {
      if (this.viewClientRect) {
        const { x, y } = this.viewClientRect;
        const globalPos = new Point(event.clientX - x, event.clientY - y);
        const delta = event.deltaY;
        const oldZoom = this.getZoom();
        let newZoom = oldZoom * 0.999 ** delta;
        if (newZoom > this.maxZoom) newZoom = this.maxZoom;
        if (newZoom < this.minZoom) newZoom = this.minZoom;
        this.applyZoom(oldZoom, newZoom, globalPos);
      }
    });

    this.renderer.plugins.interaction.on(
      'pointerdown',
      (event: InteractionEvent) => {
        const globalPos = event.data.global;
        this.stageOriginalPos = copyPoint(this.stage.position);
        this.mouseDownPoint = new Point(globalPos.x, globalPos.y);

        if (this.textEditor) {
          this.deleteTextEditor();
        }

        if (!event.target) {
          // 点到了画布的空白位置

          this.touchBlank = true;
          this.removeActiveObject();

          if (this.groupSelector) {
            this.groupSelector.putChildrenBackToStage(this.stage);
            this.stage.removeChild(this.groupSelector);
            this.removeActiveObject();
          }

          if (this.curTool === Tool.Selector) {
            const stagePos = this.stage.localTransform
              .clone()
              .applyInverse(copyPoint(globalPos));
            this.selectorTool = new SelectorTool(this, stagePos);
          }
        } else {
          if (event.target instanceof ControlPoint) {
            this.rotatingActiveObject = true;
            this.originalAngle = event.target.controlTarget.angle;
            const bound = this.getObjectStageBound(this.activeObject!);
            const [tl, _tr, br, _bl] = bound;
            this.originalCenter = new Point(
              (tl.x + br.x) / 2,
              (tl.y + br.y) / 2
            );
            return;
          }

          this.curDragTarget = event.target;
          this.curDragTargetOriginalPos = copyPoint(event.target.position);

          if (this.activeObject && this.activeObject === event.target) {
            // 如果点击的对象是当前的activeObject，则什么都不做
          } else {
            this.removeActiveObject();
            this.setActiveObject(event.target);
          }
        }
      }
    );
    this.renderer.plugins.interaction.on(
      'pointermove',
      (event: InteractionEvent) => {
        const globalPos = event.data.global;
        const stagePos = this.stage.localTransform.applyInverse(
          copyPoint(globalPos)
        );

        if (this.touchBlank) {
          if (this.curTool === Tool.Pointer) {
            // 拖拽画布
            const dx = globalPos.x - this.mouseDownPoint.x;
            const dy = globalPos.y - this.mouseDownPoint.y;
            this.stage.position.set(
              this.stageOriginalPos.x + dx,
              this.stageOriginalPos.y + dy
            );
          }

          if (this.curTool === Tool.Selector) {
            this.selectorTool?.move(stagePos);
          }
        }
        if (this.rotatingActiveObject) {
          // 拖拽控制点
          const pointerDownStagePos = this.stage.localTransform.applyInverse(
            this.mouseDownPoint
          );
          const curPointerStagePos =
            this.stage.localTransform.applyInverse(globalPos);

          const v1 = new Point(
            pointerDownStagePos.x - this.originalCenter.x,
            pointerDownStagePos.y - this.originalCenter.y
          );
          const v2 = new Point(
            curPointerStagePos.x - this.originalCenter.x,
            curPointerStagePos.y - this.originalCenter.y
          );

          // 计算v1向量和v2向量的夹角
          const v1mv2 = v1.x * v2.x + v1.y * v2.y; // v1和v2的点积
          const modV1V2 =
            Math.sqrt(Math.pow(v1.x, 2) + Math.pow(v1.y, 2)) *
            Math.sqrt(Math.pow(v2.x, 2) + Math.pow(v2.y, 2));
          const cos = v1mv2 / modV1V2; // v1向量和v2向量的夹角的cos值
          const angle = (180 * Math.acos(cos)) / Math.PI;

          // 判断应该顺时针 旋转还是逆时针旋转(这里注意：坐标系是倒过来的)
          const v2xv1 = v2.x * v1.y - v2.y * v1.x; // v1向量和v2向量的叉积
          const dAngle = v2xv1 > 0 ? -angle : angle; // 叉积为正说明v1向量在v2向量的顺时针方向

          this.setActiveObjAngle((this.originalAngle + dAngle) % 360);
        }
        if (this.curDragTarget) {
          // 拖拽单个对象
          const startPoint = this.stage.localTransform
            .clone()
            .applyInverse(this.mouseDownPoint);
          const curPoint = this.stage.localTransform
            .clone()
            .applyInverse(globalPos);
          const dx = curPoint.x - startPoint.x;
          const dy = curPoint.y - startPoint.y;
          const { x: originalX, y: originalY } = this.curDragTargetOriginalPos;
          this.curDragTarget.position.set(originalX + dx, originalY + dy);
          this.curDragTarget.updateTransform();
        }
      }
    );
    this.renderer.plugins.interaction.on(
      'pointerup',
      (event: InteractionEvent) => {
        this.touchBlank = false;
        this.curDragTarget = undefined;
        this.rotatingActiveObject = false;
        // this.originalAngle

        if (this.selectorTool) {
          this.selectorTool.end();
          this.selectorTool = undefined;
        }

        const now = Date.now();
        const isDoubleClick = now - this.lastPointerUpTime < 200;
        this.lastPointerUpTime = now;
        if (isDoubleClick) {
          this.handleDoubleClick(event);
        }
      }
    );
  }
  createTextEditor(textTarget: Text) {
    textTarget.visible = false;
    const editor = document.createElement('div');
    editor.contentEditable = 'plaintext-only';
    editor.style.position = 'fixed';
    editor.classList.add('whiteboard-editor');
    editor.style.color = `${textTarget.style.fill}`;
    editor.style.fontFamily = `OpenSans, Arial, sans-serif, "Noto Sans Hebrew", "Noto Sans", "Noto Sans JP", "Noto Sans KR"`;
    editor.style.transformOrigin = 'left top';
    editor.style.fontWeight = '400';
    editor.innerText = textTarget.text;
    document.body.appendChild(editor);
    editor.focus();
    this.textEditor = editor;
    editor.oninput = () => {
      textTarget.text = editor.innerText;
      textTarget.updateTransform();
    };
  }
  updateTextEditor = () => {
    if (this.textEditor) {
      const text = this.activeObject as Text;
      if (!text) {
        return;
      }

      text.updateTransform();

      const clientBounding = this.viewClientRect as DOMRect;
      this.textEditor.style.left = `${clientBounding.x}px`;
      this.textEditor.style.top = `${clientBounding.y}px`;
      this.textEditor.style.fontSize = `14px`;
      this.textEditor.style.lineHeight = `${14 * 1.2}px`;

      const { a, b, c, d, tx, ty } = text.worldTransform;
      this.textEditor.style.transform = `matrix(${a},${b},${c},${d},${tx},${ty})`;
    }
  };
  deleteTextEditor = () => {
    const textEditor = this.textEditor!;
    document.body.removeChild(textEditor);

    const textObj = this.activeObject as Text;
    textObj.visible = true;
    this.textEditor = undefined;
  };
  handleDoubleClick(event: InteractionEvent) {
    const { target } = event;
    if (target instanceof Text) {
      this.createTextEditor(target);
    }
  }
  getObjectListLeftTop(objList: DisplayObject[]) {
    const posList = objList.map((item) => {
      return this.getObjectStageAABB(item).tl;
    });
    const xList = posList.map((pos) => pos.x);
    const yList = posList.map((pos) => pos.y);
    return {
      left: Math.min(...xList),
      top: Math.min(...yList),
    };
  }
  createGroupSelector(objList: DisplayObject[]) {
    const groupSelector = new GroupSelector();
    const { left, top } = this.getObjectListLeftTop(objList);
    groupSelector.setXAndY(left, top);
    groupSelector.addChildrenFromStage(objList);
    this.stage.addChild(groupSelector);
    this.setActiveObject(groupSelector);
    this.groupSelector = groupSelector;
  }
  setActiveObject(activeObj: DisplayObject) {
    this.activeObject = activeObj;
    this.addActiveTargetBorder();
    this.addActiveTargetControlPoint(activeObj);
  }
  removeActiveObject() {
    this.activeObject = undefined;
    this.removeActiveTargetBorder();
    this.removeActiveTargetControlPoint();
  }
  setActiveObjAngle(angle: number) {
    if (this.activeObject) {
      this.activeObject.angle = angle;
      this.activeObject.updateTransform();
      const newBound = this.getObjectStageBound(this.activeObject);
      const [tl, _tr, br, _bl] = newBound;
      const newCenter = new Point((tl.x + br.x) / 2, (tl.y + br.y) / 2);
      const dx = newCenter.x - this.originalCenter.x;
      const dy = newCenter.y - this.originalCenter.y;
      this.activeObject.position.set(
        this.activeObject.position.x - dx,
        this.activeObject.position.y - dy
      );
      this.activeObject.updateTransform();
    }
  }
  addActiveTargetBorder() {
    const bound = this.getObjectStageBound(this.activeObject!);
    const border = new Graphics();
    border.lineStyle(3 / this.getZoom(), 0x5b97fc);
    border.drawPolygon(bound);
    this.stage.addChild(border);
    this.activeObjBorder = border;
  }
  updateActiveTargetBorder = () => {
    if (this.activeObject && this.activeObjBorder) {
      const bound = this.getObjectStageBound(this.activeObject);
      this.activeObjBorder.clear();
      this.activeObjBorder.lineStyle(3 / this.getZoom(), 0x5b97fc);
      this.activeObjBorder.drawPolygon(bound);
    }
  };
  removeActiveTargetBorder() {
    if (this.activeObjBorder) {
      this.stage.removeChild(this.activeObjBorder);
      this.activeObjBorder = undefined;
    }
  }
  addActiveTargetControlPoint(activeObj: DisplayObject) {
    const controlPoint = new ControlPoint(activeObj);
    this.activeObjControlPoint = controlPoint;
    controlPoint.interactive = true;
    controlPoint.cursor = 'pointer';
    this.stage.addChild(controlPoint);
    controlPoint.lineStyle(2 / this.getZoom(), 0xc66965);
    const radius = 5 / this.getZoom();
    controlPoint.beginFill(0xffffff);
    controlPoint.drawCircle(0, 0, radius);
    controlPoint.endFill();
    const bound = this.getObjectStageBound(this.activeObject!);
    const [tl, tr] = bound;
    controlPoint.position.set((tl.x + tr.x) / 2, (tl.y + tr.y) / 2);
  }
  updateActiveTargetControlPoint = () => {
    if (this.activeObject && this.activeObjControlPoint) {
      this.activeObjControlPoint.clear();
      this.activeObjControlPoint.lineStyle(2 / this.getZoom(), 0xc66965);
      const radius = 5 / this.getZoom();
      this.activeObjControlPoint.beginFill(0xffffff);
      this.activeObjControlPoint.drawCircle(0, 0, radius);
      this.activeObjControlPoint.endFill();
      const bound = this.getObjectStageBound(this.activeObject);
      const [tl, tr] = bound;
      this.activeObjControlPoint.position.set(
        (tl.x + tr.x) / 2,
        (tl.y + tr.y) / 2
      );
    }
  };
  removeActiveTargetControlPoint() {
    if (this.activeObjControlPoint) {
      this.stage.removeChild(this.activeObjControlPoint);
      this.activeObjControlPoint = undefined;
    }
  }
  applyZoom(oldZoom: number, newZoom: number, pointerGlobalPos: Point) {
    const oldStageMatrix = this.stage.localTransform.clone();
    const oldStagePos = oldStageMatrix.applyInverse(pointerGlobalPos);
    const dx = oldStagePos.x * oldZoom - oldStagePos.x * newZoom;
    const dy = oldStagePos.y * oldZoom - oldStagePos.y * newZoom;

    this.stage.setTransform(
      this.stage.position.x + dx,
      this.stage.position.y + dy,
      newZoom,
      newZoom,
      0,
      0,
      0,
      0,
      0
    );
    this.stage.transform.updateTransform(new Transform());
  }
  getObjectStageBound(obj: DisplayObject) {
    const localBounds = obj.getLocalBounds();
    const tl = new Point(localBounds.x, localBounds.y);
    const tr = new Point(localBounds.x + localBounds.width, localBounds.y);
    const br = new Point(
      localBounds.x + localBounds.width,
      localBounds.y + localBounds.height
    );
    const bl = new Point(localBounds.x, localBounds.y + localBounds.height);
    const localPoints = [tl, tr, br, bl];
    return localPoints.map((p) => obj.localTransform.apply(p));
  }
  // 获取包围盒(AABB)
  getObjectStageAABB(obj: DisplayObject): Box {
    const arr = this.getObjectStageBound(obj);
    const xList = arr.map((p) => p.x);
    const yList = arr.map((p) => p.y);
    let xMin = Math.min(...xList);
    let yMin = Math.min(...yList);
    let xMax = Math.max(...xList);
    let yMax = Math.max(...yList);
    return {
      tl: new Point(xMin, yMin),
      br: new Point(xMax, yMax),
    };
  }
  setTool(tool: Tool) {
    this.curTool = tool;
  }
  getZoom(): number {
    // stage是宽高等比例缩放的，所以取x或者取y是一样的
    return this.stage.scale.x;
  }
  getStageBounds = () => {
    const localBounds = this.stage.getLocalBounds();
    const { x, y, width, height } = localBounds;
    const tl = new Point(x, y);
    const tr = new Point(x + width, y);
    const br = new Point(x + width, y + height);
    const bl = new Point(x, y + height);
    return [tl, tr, br, bl];
  };
  addStageBorder = () => {
    const stageBorder = new Graphics();
    this.stageBorder = stageBorder;
    this.stage.addChild(stageBorder);
    stageBorder.lineStyle(3 / this.getZoom(), 0xcf5b68);
    const stageBounds = this.getStageBounds();
    stageBorder.drawPolygon(stageBounds);
  };
  updateStageBorder = () => {
    if (this.stageBorder) {
      this.stageBorder.clear();
      this.stageBorder.lineStyle(3 / this.getZoom(), 0xcf5b68);
      const stageBounds = this.getStageBounds();
      this.stageBorder.drawPolygon(stageBounds);
    }
  };
  onNoteBoardLoad = (onLoad: () => void) => {
    this.onLoad = onLoad;
  };
  whiteboardResize(w: number, h: number) {
    this.renderer.resize(w, h);
    if (!this.viewClientRect) {
      this.ticker.addOnce(() => {
        setTimeout(() => {
          this.onLoad?.();
        }, 300);
      });
    }
    this.viewClientRect = (
      this.view as HTMLCanvasElement
    ).getBoundingClientRect();
  }
}

export { NoteBoard };
