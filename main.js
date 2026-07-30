/**
 * @file main.js
 * @description 教育系SPAプラットフォーム コアロジック (ES Modules)
 * - キャッシュファースト（localStorage）の状態管理
 * - Text/PlainフェッチによるGAS同期とBlobローカルバックアップ
 * - AudioContextのアンロックとSPAルーティング基盤（動的インポート）
 */

const STORAGE_KEY = 'edu_spa_savedata';
const USER_ID_KEY = 'edu_spa_userid';
const GAS_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbx-PAl2A5P6bvW_gp9V153-SI5YyVg3stVQsTTTIwi2SSlH2CrOQWaJ78CZ5KZVruP1/exec';

export let audioContext = null;
let currentActiveModule = null;

/**
 * ユーザーID（UUID）の取得または生成
 * @returns {string} UUID
 */
function getUserId() {
  let id = localStorage.getItem(USER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : 'user_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
    localStorage.setItem(USER_ID_KEY, id);
  }
  return id;
}

/**
 * ローカルデータの読み込み
 * @returns {Object} セーブデータオブジェクト
 */
export function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : { progress: {}, lastModified: 0, syncedAt: 0 };
}

/**
 * ローカルデータの保存（モジュールから呼び出される）
 * @param {Object} updateObj 更新する差分データ
 */
export function saveData(updateObj) {
  const data = loadData();
  data.progress = { ...data.progress, ...updateObj };
  data.lastModified = Date.now();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  updateSyncButtonUI();
}

/**
 * 「きろくする」ボタンのUI更新
 */
function updateSyncButtonUI() {
  const data = loadData();
  const syncBtn = document.getElementById('sync-btn');
  
  if (data.lastModified > data.syncedAt) {
    syncBtn.classList.add('unsynced');
    syncBtn.disabled = false;
  } else {
    syncBtn.classList.remove('unsynced');
    syncBtn.disabled = true;
  }
}

/**
 * クラウド同期とローカルへのBlobダウンロードを実行
 */
async function syncData() {
  const syncBtn = document.getElementById('sync-btn');
  syncBtn.disabled = true;

  const data = loadData();
  const userId = getUserId();
  const payload = {
    userId: userId,
    timestamp: data.lastModified,
    saveData: data.progress
  };

  const payloadString = JSON.stringify(payload);

  try {
    fetch(GAS_WEBAPP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: payloadString
    }).then(response => {
      if (!response.ok) throw new Error('Network response was not ok');
      return response.json();
    }).then(result => {
      console.log('GAS Sync Success:', result);
    }).catch(err => {
      console.error('GAS Sync Error:', err);
    });

    downloadBlobBackup(payloadString, userId);

    data.syncedAt = data.lastModified;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    updateSyncButtonUI();

  } catch (error) {
    console.error("Sync Process Failed:", error);
    syncBtn.disabled = false;
  }
}

/**
 * セーブデータJSONのローカル自動ダウンロード
 */
function downloadBlobBackup(jsonString, userId) {
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  
  const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
  a.download = `backup_${userId}_${dateStr}.json`;
  
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * SPA ルーティング・モジュールマウント基盤
 */
async function mountModule(moduleName) {
  const container = document.getElementById('game-container');
  
  if (currentActiveModule && typeof currentActiveModule.unmount === 'function') {
    currentActiveModule.unmount();
    currentActiveModule = null;
  }

  container.innerHTML = `<h2 style="color: #666;">Loading...</h2>`;

  try {
    const module = await import(`./${moduleName}.js`);
    container.innerHTML = '';
    
    const backBtn = document.createElement('button');
    backBtn.textContent = '🏠 もどる';
    backBtn.style.cssText = `
      position: absolute; top: 10px; left: 10px; z-index: 100;
      padding: 10px 15px; border-radius: 8px; border: none;
      background-color: #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      font-weight: bold; cursor: pointer;
    `;
    backBtn.onclick = initApp;
    container.appendChild(backBtn);

    currentActiveModule = new module.default(container);
    currentActiveModule.mount();
  } catch (error) {
    console.error(`Failed to load module: ${moduleName}`, error);
    container.innerHTML = `<h2 style="color: red;">エラーが発生しました</h2>`;
  }
}

/**
 * メインメニュー（トップ画面）の初期化
 */
function initApp() {
  updateSyncButtonUI();
  
  if (currentActiveModule && typeof currentActiveModule.unmount === 'function') {
    currentActiveModule.unmount();
    currentActiveModule = null;
  }

  const container = document.getElementById('game-container');
  container.innerHTML = `
    <div style="display:flex; flex-direction: column; gap: 20px; align-items: center;">
      <h2 style="color: #333; margin-bottom: 20px;">あそぶゲームをえらんでね</h2>
      <button class="menu-btn" data-module="hiragana" style="padding: 20px 40px; font-size: 1.5rem; background: #ffb74d; border-radius: 20px; border: none; color: #fff; font-weight: bold; cursor: pointer;">ひらがな・えあわせ</button>
      <button class="menu-btn" data-module="rocket" style="padding: 20px 40px; font-size: 1.5rem; background: #4fc3f7; border-radius: 20px; border: none; color: #fff; font-weight: bold; cursor: pointer;">かずとばし・ロケット</button>
      <button class="menu-btn" data-module="factory" style="padding: 20px 40px; font-size: 1.5rem; background: #81c784; border-radius: 20px; border: none; color: #fff; font-weight: bold; cursor: pointer;">かたち・いろファクトリー</button>
    </div>
  `;

  container.querySelectorAll('.menu-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const moduleName = e.target.getAttribute('data-module');
      mountModule(moduleName);
    });
  });
}

// ==========================================
// イベントリスナー登録
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  const startBtn = document.getElementById('start-btn');
  const syncBtn = document.getElementById('sync-btn');
  const startScreen = document.getElementById('start-screen');

  syncBtn.addEventListener('click', syncData);

  startBtn.addEventListener('click', () => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioContext = new AudioContextClass();
      
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      gain.gain.value = 0;
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.start(0);
      osc.stop(audioContext.currentTime + 0.001);
    }

    startScreen.style.display = 'none';
    initApp();
  });
});
