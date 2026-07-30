/**
 * @file rocket.js
 * @description かずとばし・ロケットモジュール
 * - スワイプ（上方向）による「かずとばし」インクリメント
 * - SPAライフサイクル（mount/unmount）準拠
 * - タッチデバイスにおけるY軸スワイプの正確な検知とネイティブスクロールの防止
 */

import { saveData, loadData, audioContext } from './main.js';

export default class RocketGame {
  constructor(container) {
    this.container = container;
    this.wrapper = null;
    this.rocket = null;
    this.counterDisplay = null;
    
    // スキップカウントの設定（2とばし）
    this.step = 2;
    this.state = loadData().progress.rocket || { count: 0 };
    
    // スワイプ検知用座標
    this.startY = 0;
    this.startX = 0;
    this.swipeThreshold = 50; // スワイプ判定のピクセル閾値

    // コンテキストバインド
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
  }

  mount() {
    this.wrapper = document.createElement('div');
    this.wrapper.style.cssText = `
      width: 100%;
      height: 100%;
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      background: linear-gradient(to bottom, #000033 0%, #003366 100%);
      overflow: hidden;
      color: white;
    `;

    const header = document.createElement('div');
    header.style.cssText = 'position: absolute; top: 10%; text-align: center;';
    
    const title = document.createElement('h2');
    title.textContent = `${this.step}とばし ロケット！`;
    title.style.color = '#ffeb3b';
    title.style.marginBottom = '10px';
    
    this.counterDisplay = document.createElement('div');
    this.counterDisplay.style.cssText = 'font-size: 4rem; font-weight: bold;';
    this.counterDisplay.textContent = this.state.count;

    header.appendChild(title);
    header.appendChild(this.counterDisplay);
    
    const instruction = document.createElement('div');
    instruction.textContent = '↑ うえに スワイプしてね ↑';
    instruction.style.cssText = 'position: absolute; bottom: 25%; font-size: 1.2rem; opacity: 0.8;';

    this.rocket = document.createElement('div');
    this.rocket.textContent = '🚀';
    this.rocket.style.cssText = `
      font-size: 5rem;
      position: absolute;
      bottom: 10%;
      transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      user-select: none;
      touch-action: none;
    `;

    this.wrapper.appendChild(header);
    this.wrapper.appendChild(instruction);
    this.wrapper.appendChild(this.rocket);

    // イベントリスナー登録 (タッチデバイス最適化)
    this.wrapper.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    this.wrapper.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    this.wrapper.addEventListener('touchend', this.handleTouchEnd);

    this.container.appendChild(this.wrapper);
  }

  unmount() {
    if (!this.wrapper) return;
    
    this.wrapper.removeEventListener('touchstart', this.handleTouchStart);
    this.wrapper.removeEventListener('touchmove', this.handleTouchMove);
    this.wrapper.removeEventListener('touchend', this.handleTouchEnd);
    
    this.container.innerHTML = '';
    this.wrapper = null;
  }

  handleTouchStart(e) {
    if (e.touches.length > 1) return;
    this.startX = e.touches[0].clientX;
    this.startY = e.touches[0].clientY;
    this.rocket.style.transition = 'none'; // 操作中のアニメーションを無効化
  }

  handleTouchMove(e) {
    e.preventDefault(); // スクロールバウンスを防止
    if (!this.startY) return;

    const currentY = e.touches[0].clientY;
    const diffY = currentY - this.startY;

    // 上方向へのドラッグ中のみロケットを追従させる（視覚的フィードバック）
    if (diffY < 0) {
      this.rocket.style.transform = `translateY(${diffY}px)`;
    }
  }

  handleTouchEnd(e) {
    if (!this.startY) return;

    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;

    const diffX = this.startX - endX;
    const diffY = this.startY - endY; // 正の値なら上方向

    // Y軸の移動量がX軸より大きく、かつ閾値を超えているか判定（上方向スワイプ）
    if (Math.abs(diffY) > Math.abs(diffX) && diffY > this.swipeThreshold) {
      this.launch();
    } else {
      // スワイプキャンセル時、元の位置に戻す
      this.resetRocketPosition();
    }

    this.startX = 0;
    this.startY = 0;
  }

  launch() {
    this.playLaunchSound();
    
    // ロケットを画面外へ飛ばすアニメーション
    this.rocket.style.transition = 'transform 0.5s ease-in';
    this.rocket.style.transform = 'translateY(-1000px)';

    // カウントアップとデータ保存
    this.state.count += this.step;
    this.counterDisplay.textContent = this.state.count;
    
    // 非同期でLocalStorageのみ更新（クラウド通信は伴わない）
    requestAnimationFrame(() => {
      saveData({ rocket: this.state });
    });

    // 0.6秒後に元の位置へリセット
    setTimeout(() => {
      this.resetRocketPosition(false);
    }, 600);
  }

  resetRocketPosition(animate = true) {
    this.rocket.style.transition = animate ? 'transform 0.3s ease-out' : 'none';
    this.rocket.style.transform = 'translateY(0)';
  }

  playLaunchSound() {
    if (!audioContext) return;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    osc.type = 'square';
    // 発射音風の周波数スイープ
    osc.frequency.setValueAtTime(150, audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.3);
    
    gain.gain.setValueAtTime(0.1, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
    
    osc.connect(gain);
    gain.connect(audioContext.destination);
    
    osc.start();
    osc.stop(audioContext.currentTime + 0.3);
  }
}
