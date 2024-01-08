import React, { useState, useEffect } from 'react';
import './App.css';
import { debounce } from 'lodash';
import { NoteBoard } from './note-board/note-board';
import { init } from './init';
import { Radio } from 'antd';
import { Tool } from './note-board/enums';

function App() {
  const [noteBoard, setNoteBoard] = useState<NoteBoard | null>(null);
  const [size, setSize] = useState({
    width: 0,
    height: 0,
  });
  const { width, height } = size;

  useEffect(() => {
    const onResize = debounce(() => {
      setSize({
        width: document.body.clientWidth,
        height: document.body.clientHeight,
      });
    }, 100);
    window.addEventListener('resize', onResize);
    onResize();
    return () => {
      window.removeEventListener('resize', onResize);
    };
  }, []);

  useEffect(() => {
    if (!noteBoard) return;
    if (!width || !height) return;
    noteBoard.whiteboardResize(width, height);
  }, [width, height, noteBoard]);

  useEffect(() => {
    if (!width || !height) return;
    if (noteBoard) return;
    setNoteBoard(init(width, height));
  }, [width, height, noteBoard]);

  return (
    <>
      <div id="root-container">
        <canvas id="pixi-view" style={{ width, height, userSelect: 'none' }} />
      </div>
      {noteBoard && (
        <div className="top-bar">
          <Radio.Group
            defaultValue={Tool.Pointer}
            buttonStyle="solid"
            onChange={(e) => noteBoard.setTool(e.target.value)}
          >
            <Radio.Button value={Tool.Pointer}>Pointer</Radio.Button>
            <Radio.Button value={Tool.Selector}>Selector</Radio.Button>
          </Radio.Group>
        </div>
      )}
    </>
  );
}

export default App;
