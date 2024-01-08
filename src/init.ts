import { NoteBoard } from './note-board/note-board';
import { createText } from './note-board/text';

export function init(w: number, h: number) {
  const noteBoard = new NoteBoard({
    width: w,
    height: h,
    backgroundAlpha: 0,
    antialias: true,
    resolution: window.devicePixelRatio,
    view: document.getElementById('pixi-view') as HTMLCanvasElement,
  });
  noteBoard.onNoteBoardLoad(() => {
    for (let i = 0; i < 500; i++) {
      const randomX = Math.random();
      const randomY = Math.random();
      const text = createText();
      noteBoard.stage.addChild(text);
      text.position.set(800 * 10 * randomX, 600 * 10 * randomY);
    }
  });
  return noteBoard;
}
