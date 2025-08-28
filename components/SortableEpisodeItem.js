// components/SortableEpisodeItem.js
'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FaGripVertical } from 'react-icons/fa';
import styles from '../app/admin/page.module.css';

export function SortableEpisodeItem({ episode, onRename, onDelete, isDeleting }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: episode.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleRename = () => {
    const newTitle = prompt('새로운 에피소드 제목을 입력하세요:', episode.episodeTitle);
    if (newTitle && newTitle.trim() !== '' && newTitle !== episode.episodeTitle) {
      onRename(episode.id, newTitle);
    }
  };

  return (
    <div ref={setNodeRef} style={style} className={styles.episodeItem}>
      <div {...attributes} {...listeners} className={styles.dragHandle}>
        <FaGripVertical />
      </div>
      <span className={styles.episodeTitle}>{episode.episodeTitle}</span>
      <div className={styles.buttonGroup}>
        <button onClick={handleRename} className={styles.editButton}>
          제목 변경
        </button>
        <button onClick={() => onDelete(episode)} disabled={isDeleting} className={styles.deleteButton}>
          {isDeleting ? '삭제 중...' : '삭제'}
        </button>
      </div>
    </div>
  );
}
