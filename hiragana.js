/**
 * @file hiragana.js
 * @description ひらがな・えあわせパズルモジュール
 * - ドラッグ＆ドロップ（タッチデバイス最適化）
 * - SPAライフサイクル（mount/unmount）準拠
 */

import { saveData, loadData, audioContext } from './main.js';

export default class HiraganaGame {
  constructor(container) {
    this.container = container;
    this.wrapper = null;
    this.draggedElement = null;
    this.offsetX = 0;
    this.offsetY = 0;
    this.initialX = 0;
    this.initialY = 0;
    this.state = loadData().progress.hiragana || { solved: [] };
    
    // サンプルデータ
    this.items = [
      { id: 'item_a', label: 'あ', targetId: 'target_a' },
      { id: 'item_i', label: 'い', targetId: 'target_i' },
      { id: 'item_u', label: 'う', targetId: 'target_u' }
    ];

    // イベントバインディング
    this.handleStart = this.handleStart.bind(this);
    this.handleMove = this.handleMove.bind(this);
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
      justify-content: space-around;
      background-color: #fffde7;
    `;

    const title = document.createElement('h2');
    title.textContent = 'ひらがな・えあわせパズル';
    title.style.color = '#f57f17';
    this.wrapper.appendChild(title);

    const targetContainer = document.createElement('div');
    targetContainer.style.cssText = 'display: flex; gap: 20px;';
    
    const sourceContainer = document.createElement('div');
    sourceContainer.style.cssText = 'display: flex; gap: 20px; flex-wrap: wrap; justify-content: center;';

    this.items.forEach(item => {
      // ターゲット作成
      const target = document.createElement('div');
      target.id = item.targetId;
      target.dataset.match = item.id;
      target.style.cssText = `
        width: 80px;
        height: 80px;
        border: 3px dashed #ccc;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2rem;
        color: #ddd;
        background-color: #fafafa;
      `;
      target.textContent = item.label;
      targetContainer.appendChild(target);

      // ドラッグアイテム作成（クリア済みでない場合のみ）
      if (!this.state.solved.includes(item.id)) {
        const piece = document.createElement('div');
        piece.id = item.id;
        piece.textContent = item.label;
        piece.style.cssText = `
          width: 80px;
          height: 80px;
          background-color: #ffb74d;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          color: white;
          font-weight: bold;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          cursor: grab;
          user-select: none;
          touch-action: none;
          position: relative;
          z-index: 10;
        `;
        
        piece.addEventListener('touchstart', this.handleStart, { passive: false });
        piece.addEventListener('mousedown', this.handleStart);
        
        sourceContainer.appendChild(piece);
      } else {
        // クリア済みの場合、ターゲットのスタイルを変更
        target.style.backgroundColor = '#aed581';
        target.style.color = 'white';
        target.style.borderStyle = 'solid';
        target.style.borderColor = '#8bc34a';
      }
    });

    this.wrapper.appendChild(targetContainer);
    this.wrapper.appendChild(sourceContainer);
    
    // グローバルイベント
    document.addEventListener('touchmove', this.handleMove, { passive: false });
    document.addEventListener('touchend', this.handleEnd);
    document.addEventListener('mousemove', this.handleMove);
    document.addEventListener('mouseup', this.handleEnd);

    this.container.appendChild(this.wrapper);
  }

  unmount() {
    if (!this.wrapper) return;

    document.removeEventListener('touchmove', this.handleMove);
    document.removeEventListener('touchend', this.handleEnd);
    document.removeEventListener('mousemove', this.handleMove);
    document.removeEventListener('mouseup', this.handleEnd);

    this.container.innerHTML = '';
    this.wrapper = null;
  }

  handleStart(e) {
    if (e.type === 'touchstart') e.preventDefault(); // スクロール防止
    
    this.draggedElement = e.target;
    this.draggedElement.style.cursor = 'grabbing';
    this.draggedElement.style.zIndex = 100;
    this.draggedElement.style.position = 'absolute';
    
    const rect = this.draggedElement.getBoundingClientRect();
    const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
    
    this.offsetX = clientX - rect.left;
    this.offsetY = clientY - rect.top;
    
    // 初期位置を記憶
    if (!this.initialX && !this.initialY) {
        this.initialX = this.draggedElement.offsetLeft;
        this.initialY = this.draggedElement.offsetTop;
    }

    this.moveElement(clientX, clientY);
    this.playTone(440); // ピコッという音
  }

  handleMove(e) {
    if (!this.draggedElement) return;
    if (e.type === 'touchmove') e.preventDefault();

    const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
    
    this.moveElement(clientX, clientY);
  }

  moveElement(clientX, clientY) {
    const parentRect = this.wrapper.getBoundingClientRect();
    const x = clientX - parentRect.left - this.offsetX;
    const y = clientY - parentRect.top - this.offsetY;
    
    this.draggedElement.style.left = `${x}px`;
    this.draggedElement.style.top = `${y}px`;
  }

  handleEnd(e) {
    if (!this.draggedElement) return;

    const rect = this.draggedElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    this.draggedElement.style.display = 'none'; // hitTestのために一時的に隠す
    const elemBelow = document.elementFromPoint(centerX, centerY);
    this.draggedElement.style.display = '';

    const target = elemBelow ? elemBelow.closest('[data-match]') : null;

    if (target && target.dataset.match === this.draggedElement.id) {
      // 正解
      this.playTone(880, 'sine');
      target.style.backgroundColor = '#aed581';
      target.style.color = 'white';
      target.style.borderStyle = 'solid';
      target.style.borderColor = '#8bc34a';
      
      this.state.solved.push(this.draggedElement.id);
      saveData({ hiragana: this.state });
      
      this.draggedElement.remove();
      this.checkClear();
    } else {
      // 不正解：元の位置に戻す
      this.playTone(200, 'sawtooth');
      this.draggedElement.style.position = 'relative';
      this.draggedElement.style.left = 'auto';
      this.draggedElement.style.top = 'auto';
      this.draggedElement.style.zIndex = 10;
    }

    this.draggedElement.style.cursor = 'grab';
    this.draggedElement = null;
  }

  checkClear() {
    if (this.state.solved.length === this.items.length) {
      setTimeout(() => {
        alert('よくできました！');
      }, 300);
    }
  }

  playTone(freq, type = 'sine') {
    if (!audioContext) return;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioContext.currentTime);
    
    gain.gain.setValueAtTime(0.1, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(audioContext.destination);
    
    osc.start();
    osc.stop(audioContext.currentTime + 0.1);
  }
}
