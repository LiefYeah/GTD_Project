import { useState, useEffect } from 'react';
import type { Project } from '../../types';
import type { CSSVars, ProjectDraft } from './helpers';
import { PROJECT_ICONS, PROJECT_COLORS, COLOR_NAMES, getIcon, loadIconOverrides } from './helpers';

export type { ProjectDraft };

interface ProjectEditorProps {
  project?: Project;
  isNew?: boolean;
  onSave: (d: ProjectDraft) => void;
  onDelete?: () => void;
  onCancel: () => void;
}

export function ProjectEditor({ project, isNew, onSave, onDelete, onCancel }: ProjectEditorProps) {
  const defaultIcon = project ? getIcon(project.id, loadIconOverrides()) : PROJECT_ICONS[0];
  const [draft, setDraft] = useState<ProjectDraft>({
    name:        project?.name        ?? '',
    description: project?.description ?? '',
    color:       project?.color       ?? PROJECT_COLORS[0],
    icon:        defaultIcon,
  });

  const set = <K extends keyof ProjectDraft>(k: K) => (v: ProjectDraft[K]) =>
    setDraft(d => ({ ...d, [k]: v }));

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onCancel]);

  const handleSave = () => {
    if (!draft.name.trim()) return;
    onSave({ ...draft, name: draft.name.trim(), description: draft.description.trim() });
  };

  return (
    <div className="so-root">
      <div className="so-backdrop" onClick={onCancel} />
      <aside className="so">
        <div className="so__head">
          <div>
            <div className="so__eyebrow">{isNew ? '新建项目' : '编辑项目'}</div>
            <div className="so__title">{isNew ? '把一类相关的任务收集起来' : '更新项目的基本信息'}</div>
          </div>
          <button className="pj-icon-btn" onClick={onCancel} title="关闭">✕</button>
        </div>

        <div className="so__body">
          <div className="pe__preview" style={{ '--pe-accent': draft.color } as CSSVars}>
            <div className="pe__preview-icon">{draft.icon}</div>
            <div>
              <div className="pe__preview-name">{draft.name || '项目名称'}</div>
              <div className="pe__preview-desc">{draft.description || '一句话描述这个项目…'}</div>
            </div>
          </div>

          <label className="so__field">
            <span className="so__label">项目名称</span>
            <input
              className="so__input so__input--lg"
              autoFocus
              placeholder="例如：年度阅读计划"
              value={draft.name}
              onChange={e => set('name')(e.target.value)}
            />
          </label>

          <label className="so__field">
            <span className="so__label">简介</span>
            <textarea
              className="so__textarea"
              placeholder="一句话说明这个项目的目标…"
              rows={2}
              value={draft.description}
              onChange={e => set('description')(e.target.value)}
            />
          </label>

          <label className="so__field">
            <span className="so__label">主题色</span>
            <div className="pe__colors">
              {PROJECT_COLORS.map((c, i) => (
                <button
                  key={c}
                  title={COLOR_NAMES[i]}
                  className={`pe__color ${draft.color === c ? 'is-on' : ''}`}
                  style={{ background: c }}
                  onClick={() => set('color')(c)}
                />
              ))}
            </div>
          </label>

          <label className="so__field">
            <span className="so__label">图标</span>
            <div className="pe__icons">
              {PROJECT_ICONS.map(g => (
                <button
                  key={g}
                  className={`pe__icon ${draft.icon === g ? 'is-on' : ''}`}
                  onClick={() => set('icon')(g)}
                >
                  {g}
                </button>
              ))}
            </div>
          </label>
        </div>

        <footer className="so__foot">
          {onDelete && (
            <button
              className="pj-btn pj-btn--danger"
              onClick={() => { if (confirm('删除此项目及其全部任务？')) onDelete(); }}
            >
              删除项目
            </button>
          )}
          <div className="so__foot-r">
            <button className="pj-btn" onClick={onCancel}>取消</button>
            <button className="pj-btn pj-btn--solid" onClick={handleSave}>
              {isNew ? '创建项目' : '保存'}
            </button>
          </div>
        </footer>
      </aside>
    </div>
  );
}
