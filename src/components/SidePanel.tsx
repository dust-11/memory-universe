import { useStore } from '../store';
import { loadMemoryDetail } from '../data/loadAnchors';
import type { MemoryNode } from '../types';

export function SidePanel() {
  const { selectedAnchor, anchorMemories, selectedMemory, selectMemory, setLoadingLevel } = useStore();

  if (!selectedAnchor) return null;

  async function handleMemoryClick(mem: MemoryNode) {
    setLoadingLevel(3);
    try {
      const detail = await loadMemoryDetail(mem.id as unknown as number);
      selectMemory(detail);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLevel(0);
    }
  }

  return (
    <div style={{
      position: 'absolute', right: 0, top: 0, bottom: 0,
      width: 320,
      background: 'rgba(7,8,15,0.92)',
      borderLeft: `1px solid ${selectedAnchor.color}44`,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      backdropFilter: 'blur(8px)',
    }}>
      {/* 头部 */}
      <div style={{
        padding: '18px 20px 12px',
        borderBottom: `1px solid ${selectedAnchor.color}33`,
      }}>
        <div style={{
          fontSize: 13, color: selectedAnchor.color,
          letterSpacing: '0.05em', marginBottom: 4,
        }}>
          锚点
        </div>
        <div style={{
          fontSize: 15, color: '#fff', fontWeight: 'bold',
          lineHeight: 1.4, wordBreak: 'break-all',
        }}>
          {selectedAnchor.name}
        </div>
        <div style={{ fontSize: 11, color: '#b9c2d6', marginTop: 6, opacity: 0.6 }}>
          {selectedAnchor.count} 条记忆
          {anchorMemories.length > 0 && ` · 已加载 ${anchorMemories.length} 条`}
        </div>
      </div>

      {/* 记忆详情（点击记忆后展开） */}
      {selectedMemory && (
        <div style={{
          padding: '14px 20px',
          borderBottom: `1px solid #ffffff18`,
          background: `${selectedAnchor.color}11`,
        }}>
          <div style={{
            fontSize: 10, color: selectedAnchor.color,
            letterSpacing: '0.1em', marginBottom: 8,
          }}>
            {selectedMemory.depth === 'deep' ? '◆ 深度记忆' : '◇ 浅度记忆'}
            {' · '}
            {selectedMemory.type === 'emotion' ? '情感' : '核心'}
          </div>
          <div style={{
            fontSize: 12, color: '#e0e8f0', lineHeight: 1.7,
            maxHeight: 200, overflowY: 'auto',
          }}>
            {selectedMemory.content || selectedMemory.summary}
          </div>
          {selectedMemory.created_at && (
            <div style={{ fontSize: 10, color: '#b9c2d6', marginTop: 8, opacity: 0.5 }}>
              {new Date(selectedMemory.created_at).toLocaleDateString('zh-CN')}
            </div>
          )}
          <button
            onClick={() => selectMemory(null)}
            style={{
              marginTop: 10, fontSize: 10, color: '#b9c2d6',
              background: 'none', border: '1px solid #ffffff22',
              borderRadius: 4, padding: '3px 10px', cursor: 'pointer',
            }}
          >
            收起
          </button>
        </div>
      )}

      {/* 记忆列表 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {anchorMemories.length === 0 ? (
          <div style={{
            padding: '24px 20px', color: '#b9c2d6',
            fontSize: 12, opacity: 0.5, textAlign: 'center',
          }}>
            加载中…
          </div>
        ) : (
          anchorMemories.map((mem) => (
            <div
              key={mem.id}
              onClick={() => handleMemoryClick(mem)}
              style={{
                padding: '10px 20px',
                cursor: 'pointer',
                borderBottom: '1px solid #ffffff08',
                background: selectedMemory?.id === mem.id ? `${selectedAnchor.color}18` : 'transparent',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = `${selectedAnchor.color}18`;
              }}
              onMouseLeave={(e) => {
                if (selectedMemory?.id !== mem.id)
                  (e.currentTarget as HTMLDivElement).style.background = 'transparent';
              }}
            >
              <div style={{
                fontSize: 11, color: '#e0e8f0', lineHeight: 1.6,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}>
                {mem.summary || '（无摘要）'}
              </div>
              <div style={{ fontSize: 9, color: '#b9c2d6', marginTop: 3, opacity: 0.4 }}>
                {mem.depth === 'deep' ? '◆' : '◇'} {mem.type}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
