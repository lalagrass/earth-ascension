// 武俠小鎮 A1：單機版入口（src/wuxia/local/index.html）。
import './allowConvexDefs';
import './basePath';
import React from 'react';
import ReactDOM from 'react-dom/client';
import '../../index.css';
import '../wuxia.css';
import './local.css';
import { LocalApp } from './LocalApp';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LocalApp />
  </React.StrictMode>,
);
