/**
 * @file factory.js
 * @description かたち・いろファクトリーモジュール
 * - フリック（高速スワイプ）による仕分けアクション
 * - SPAライフサイクル（mount/unmount）準拠
 * - 速度と方向ベクトルによるフリック判定アルゴリズム
 */

import { saveData, loadData, audioContext } from './main.js';

export default class FactoryGame {
  constructor(container) {
    this.container = container;
    this.wrapper = null;
    this.itemElement = null;
    this.scoreDisplay = null;
    
    this.state = loadData().progress.factory || { score: 0 };
    
    // フリック検知用パラメータ
    this.startX = 0;
    this.startY = 0;
    this.startTime = 0;
    this.flickThresholdVel = 0.5; // px/ms
    this.flickThresholdDist = 30; // px
    
    // ゲームデータ設定 (左:あか, 右:あお)
    this.items = [
      { color: 'red', shape: 'circle', target: 'left', html: '🔴' },
      { color: 'blue', shape: 'square', target: 'right', html: '🟦' },
      { color: 'red', shape: 'heart', target: 'left', html: '❤️' },
      { color: 'blue', shape: 'diamond', target: 'right', html: '🔷' }
    ];
    this.currentItem = null;

    this.handleStart = this.handleStart.bind(this);
    this.handleEnd = this.handleEnd.bind(this);
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
      justify-content: center;
      background-color: #e0f7fa;
      overflow: hidden;
      touch-action: none;
    `;

    // ヘッダーUI
    const header = document.createElement('div');
    header.style.cssText = 'position: absolute; top: 10%; text-align: center; width: 100%;';
    
    const title = document.createElement('h2');
    title.textContent = 'いろわけ ファクトリー';
    title.style.color = '#006064';
    
    this.scoreDisplay = document.createElement('div');
    this.scoreDisplay.style.cssText = 'font-size: 2rem; font-weight: bold; color: #ff5722; margin-top: 10px;';
    this.scoreDisplay.textContent = `できたかず: ${this.state.score}`;

    header.appendChild(title);
    header.appendChild(this.scoreDisplay);

    // 仕分けボックス（背景ガイド）
    const boxLeft = this.createBox('あか', 'left: 10%; background-color: rgba(255, 0, 0, 0.1); border-color: red;');
    const boxRight = this.createBox('あお', 'right: 10%; background-color: rgba(0, 0, 255, 0.1); border-color: blue;');

    // 中央のアイテム生成領域
    this.itemElement = document.createElement('div');
    this.itemElement.style.cssText = `
      font-size: 6rem;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      transition: transform 0.2s ease-out, opacity 0.2s;
      user-select: none;
      cursor: grab;
      z-index: 10;
    `;

    this.wrapper.appendChild(header);
    this.wrapper.appendChild(boxLeft);
    this.wrapper.appendChild(boxRight);
    this.wrapper.appendChild(this.itemElement);

    this.itemElement.addEventListener('touchstart', this.handleStart, { passive: false });
    this.itemElement.addEventListener('mousedown', this.handleStart);
    
    this.wrapper.addEventListener('touchend', this.handleEnd);
    this.wrapper.addEventListener('mouseup', this.handleEnd);

    this.container.appendChild(this.wrapper);
    
    this.spawnItem();
  }

  unmount() {
    if (!this.wrapper) return;
    this.wrapper.removeEventListener('touchend', this.handleEnd);
    this.wrapper.removeEventListener('mouseup', this.handleEnd);
    this.container.innerHTML = '';
    this.wrapper = null;
  }

  createBox(label, extraStyles) {
    const box = document.createElement('div');
    box.textContent = label;
    box.style.cssText = `
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: 80px;
      height: 150px;
      border: 4px dashed;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 1.5rem;
      color: #333;
      ${extraStyles}
    `;
    return box;
  }

  spawnItem() {
    this.currentItem = this.items[Math.floor(Math.random() * this.items.length)];
    this.itemElement.textContent = this.currentItem.html;
    this.itemElement.style.transform = 'translate(-50%, -50%) scale(1)';
    this.itemElement.style.opacity = '1';
    this.itemElement.style.transition = 'none'; // リセット時はアニメーションなし
  }

  handleStart(e) {
    e.preventDefault();
    const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
    
    this.startX = clientX;
    this.startY = clientY;
    this.startTime = Date.now();
    this.itemElement.style.cursor = 'grabbing';
  }

  handleEnd(e) {
    if (!this.startTime) return;

    const clientX = e.type.includes('touch') ? e.changedTouches[0].clientX : e.clientX;
    const clientY = e.type.includes('touch') ? e.changedTouches[0].clientY : e.clientY;

    const dx = clientX - this.startX;
    const dy = clientY - this.startY;
    const dt = Date.now() - this.startTime;
    
    this.startX = 0;
    this.startY = 0;
    this.startTime = 0;
    this.itemElement.style.cursor = 'grab';

    // フリック判定: 移動距離と速度
    const distance = Math.sqrt(dx * dx + dy * dy);
    const velocity = distance / dt;

    if (distance > this.flickThresholdDist && velocity > this.flickThresholdVel) {
      // 主な移動方向を判定 (水平方向のフリックか)
      if (Math.abs(dx) > Math.abs(dy)) {
        const direction = dx > 0 ? 'right' : 'left';
        this.processFlick(direction);
        return;
      }
    }
    
    // フリック失敗時は元の位置に戻るバウンス効果
    this.itemElement.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    this.itemElement.style.transform = 'translate(-50%, -50%) scale(1)';
  }

  processFlick(direction) {
    const isCorrect = direction === this.currentItem.target;
    
    // 物理的な吹っ飛びアニメーション
    const moveX = direction === 'left' ? '-200%' : '100%';
    this.itemElement.style.transition = 'transform 0.3s ease-in, opacity 0.3s ease-in';
    this.itemElement.style.transform = `translate(calc(-50% + ${moveX}), -50%) scale(0.5) rotate(${direction === 'left' ? '-' : ''}45deg)`;
    this.itemElement.style.opacity = '0';

    if (isCorrect) {
      this.playTone(880, 'sine', 0.1);
      this.state.score += 1;
      this.scoreDisplay.textContent = `できたかず: ${this.state.score}`;
      saveData({ factory: this.state });
    } else {
      this.playTone(200, 'sawtooth', 0.2);
    }

    // アニメーション完了後に次のアイテムを生成
    setTimeout(() => {
      this.spawnItem();
    }, 350);
  }

  playTone(freq, type = 'sine', duration = 0.1) {
    if (!audioContext) return;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioContext.currentTime);
    if(isCorrect && type === 'sine') {
       osc.frequency.exponentialRampToValueAtTime(freq * 1.5, audioContext.currentTime + duration);
    }
    
    gain.gain.setValueAtTime(0.1, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(audioContext.destination);
    
    osc.start();
    osc.stop(audioContext.currentTime + duration);
  }
}
