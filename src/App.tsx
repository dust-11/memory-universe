import { Scene } from './components/Scene';
import { SidePanel } from './components/SidePanel';
import { useStore } from './store';
import './App.css';

export default function App() {
  const { loadingLevel, selectedAnchor } = useStore();

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* 三维场景：右侧面板打开时缩小宽度 */}
      <div style={{
        position: 'absolute', top: 0, left: 0, bottom: 0,
        right: selectedAnchor ? 320 : 0,
        transition: 'right 0.3s ease',
      }}>
        <Scene />
      </div>

      {/* 顶部标题 */}
      <div style={{
        position: 'absolute', top: 20, left: 24,
        color: '#d8c89a', fontFamily: 'serif', userSelect: 'none',
        pointerEvents: 'none', zIndex: 10,
      }}>
        <div style={{ fontSize: 20, letterSpacing: '0.25em' }}>记忆宇宙</div>
        <div style={{ fontSize: 10, opacity: 0.45, marginTop: 2, letterSpacing: '0.1em' }}>
          Memory Universe
        </div>
      </div>

      {/* 加载提示 */}
      {loadingLevel > 0 && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          color: '#b9c2d6', fontSize: 13, letterSpacing: '0.1em',
          pointerEvents: 'none', zIndex: 20,
        }}>
          {loadingLevel === 1 && '正在点亮锚点星系…'}
          {loadingLevel === 2 && '正在展开记忆…'}
          {loadingLevel === 3 && '正在读取详情…'}
        </div>
      )}

      {/* 底部操作提示 */}
      <div style={{
        position: 'absolute', bottom: 16, left: '50%',
        transform: 'translateX(-50%)',
        color: '#b9c2d6', fontSize: 10, opacity: 0.4,
        userSelect: 'none', whiteSpace: 'nowrap',
        pointerEvents: 'none', zIndex: 10,
      }}>
        拖拽旋转 · 滚轮缩放 · 点击行星展开记忆
      </div>

      {/* 右侧记忆详情面板 */}
      <SidePanel />
    </div>
  );
}
