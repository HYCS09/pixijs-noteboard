import { Point, Graphics, DisplayObject, Text } from 'pixi.js';
import { NoteBoard } from './note-board';
import { copyPoint, AABBRectTest } from './utils';
import { Box } from './type';

export class SelectorTool {
  private noteBoard: NoteBoard;
  private p1: Point;
  private p2: Point;
  private rect: Graphics;
  constructor(noteBoard: NoteBoard, startPoint: Point) {
    this.noteBoard = noteBoard;
    this.noteBoard.removeActiveObject();
    this.p1 = copyPoint(startPoint);
    this.p2 = copyPoint(startPoint);
    this.rect = new Graphics();
    this.noteBoard.stage.addChild(this.rect);
  }
  getRect(): Box {
    const xMin = Math.min(this.p1.x, this.p2.x);
    const yMin = Math.min(this.p1.y, this.p2.y);
    const xMax = Math.max(this.p1.x, this.p2.x);
    const yMax = Math.max(this.p1.y, this.p2.y);
    return {
      tl: new Point(xMin, yMin),
      br: new Point(xMax, yMax),
    };
  }
  drawRect() {
    const rect = this.getRect();
    this.rect.clear();
    this.rect.beginFill(0x8888ff, 0.5);
    this.rect.drawRect(
      rect.tl.x,
      rect.tl.y,
      rect.br.x - rect.tl.x,
      rect.br.y - rect.tl.y
    );
    this.rect.endFill();
  }
  move(point: Point) {
    this.p2 = point;
    this.drawRect();
  }
  end() {
    this.noteBoard.stage.removeChild(this.rect);

    const selected: DisplayObject[] = [];
    this.noteBoard.stage.children
      .filter((child) => {
        if (child instanceof Text) {
          return true;
        }
      })
      .forEach((child) => {
        const objRect = this.noteBoard.getObjectStageAABB(child);
        const rst = AABBRectTest(this.getRect(), objRect);
        if (rst) {
          selected.push(child);
        }
      });

    if (selected.length === 1) {
      this.noteBoard.setActiveObject(selected[0]);
    }

    if (selected.length > 1) {
      this.noteBoard.createGroupSelector(selected);
    }
  }
}
