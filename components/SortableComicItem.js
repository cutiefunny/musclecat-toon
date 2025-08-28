// components/SortableComicItem.js
'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FaGripVertical } from 'react-icons/fa';
import styles from '../app/admin/page.module.css';

export function SortableComicItem({ comic, onEdit, onDelete, isDeleting }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: comic.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className={styles.listItem}>
      {/* 💡 드래그 핸들 추가 */}
      <div {...attributes} {...listeners} className={styles.dragHandle}>
        <FaGripVertical />
      </div>
      <span className={styles.comicTitle}>{comic.title} ({comic.author})</span>
      <div className={styles.buttonGroup}>
        <button onClick={() => onEdit(comic)} className={styles.editButton}>
          수정
        </button>
        <button onClick={() => onDelete(comic.id)} disabled={isDeleting} className={styles.deleteButton}>
          {isDeleting ? '삭제 중...' : '삭제'}
        </button>
      </div>
    </div>
  );
}
