// Based on https://codepen.io/inlet/pen/yLVmPWv.
// Copyright (c) 2018 Patrick Brouwer, distributed under the MIT license.

import { PixiComponent, useApp } from '@pixi/react';
import { Viewport } from 'pixi-viewport';
import { Application } from 'pixi.js';
import { MutableRefObject, ReactNode } from 'react';

export type ViewportProps = {
  app: Application;
  viewportRef?: MutableRefObject<Viewport | undefined>;

  screenWidth: number;
  screenHeight: number;
  worldWidth: number;
  worldHeight: number;
  children?: ReactNode;
  // WUXIA-PATCH(W1): w01-skin 時可以縮小到看見整張小鎮（預設只能看半張）；截圖頁可指定初始縮放與中心
  wuxiaMinScale?: number;
  wuxiaFocus?: { x: number; y: number; scale: number };
};

// https://davidfig.github.io/pixi-viewport/jsdoc/Viewport.html
export default PixiComponent('Viewport', {
  create(props: ViewportProps) {
    // WUXIA-PATCH(W1): 拿掉 wuxia 專用的 props，不傳給 Viewport
    const { app, children, viewportRef, wuxiaMinScale, wuxiaFocus, ...viewportProps } = props;
    const viewport = new Viewport({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      events: app.renderer.events,
      passiveWheel: false,
      ...viewportProps,
    });
    if (viewportRef) {
      viewportRef.current = viewport;
    }
    // Activate plugins
    viewport
      .drag()
      .pinch({})
      .wheel()
      .decelerate()
      .clamp({ direction: 'all', underflow: 'center' })
      .setZoom(-10)
      .clampZoom({
        // WUXIA-PATCH(W1): w01-skin 時用 wuxiaMinScale（看得見整張小鎮）
        minScale: wuxiaMinScale ?? (1.04 * props.screenWidth) / (props.worldWidth / 2),
        maxScale: 3.0,
      });
    // WUXIA-PATCH(W1): w01-skin 一開始置中顯示整張小鎮；截圖頁可指定焦點
    if (wuxiaMinScale !== undefined) {
      viewport.moveCenter(props.worldWidth / 2, props.worldHeight / 2);
    }
    if (wuxiaFocus) {
      viewport.setZoom(wuxiaFocus.scale, true);
      viewport.moveCenter(wuxiaFocus.x, wuxiaFocus.y);
    }
    // WUXIA-PATCH(A4): 回首頁／再玩一次時 Stage 先拆掉 renderer.events，Viewport.destroy 再去 removeEventListener 會丟 TypeError；吞掉這一個
    const destroy = viewport.destroy.bind(viewport);
    viewport.destroy = (opts?: Parameters<Viewport['destroy']>[0]) => {
      try {
        destroy(opts);
      } catch (e) {
        if (!(e instanceof TypeError)) throw e;
      }
    };
    return viewport;
  },
  applyProps(viewport, oldProps: any, newProps: any) {
    Object.keys(newProps).forEach((p) => {
      // WUXIA-PATCH(W1): wuxia 專用的 props 不寫進 viewport；畫面尺寸確定後重設最小縮放，第一次順便置中顯示整張小鎮
      if (p === 'wuxiaMinScale' || p === 'wuxiaFocus') {
        if (p === 'wuxiaMinScale' && newProps.wuxiaMinScale !== undefined && oldProps[p] !== newProps[p]) {
          viewport.clampZoom({ minScale: newProps.wuxiaMinScale, maxScale: 3.0 });
          if (!(viewport as any).wuxiaFitted && newProps.screenWidth > 0 && !newProps.wuxiaFocus) {
            (viewport as any).wuxiaFitted = true;
            viewport.setZoom(newProps.wuxiaMinScale, true);
            viewport.moveCenter(newProps.worldWidth / 2, newProps.worldHeight / 2);
          }
        }
        return;
      }
      if (p !== 'app' && p !== 'viewportRef' && p !== 'children' && oldProps[p] !== newProps[p]) {
        // @ts-expect-error Ignoring TypeScript here
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        viewport[p] = newProps[p];
      }
    });
  },
});
