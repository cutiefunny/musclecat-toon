// components/CommentSection.js
'use client';

import { useState, useEffect, useMemo } from 'react';
import { db } from '../lib/firebase/clientApp';
import { collection, query, onSnapshot, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import styles from '../app/page.module.css'; // page.module.css 재사용

// 댓글 입력 폼 컴포넌트
const CommentForm = ({ onSubmit, placeholder = "댓글을 입력하세요..." }) => {
  const [comment, setComment] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (comment.trim() === '') return;
    onSubmit(comment);
    setComment('');
  };

  return (
    <form onSubmit={handleSubmit} className={styles.commentForm}>
      <input
        type="text"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder={placeholder}
        className={styles.commentInput}
      />
      <button type="submit" className={styles.commentButton}>등록</button>
    </form>
  );
};

// 개별 댓글 렌더링 컴포넌트
const Comment = ({ comment, allComments, onReplySubmit, level = 0 }) => {
  const [isReplying, setIsReplying] = useState(false);
  
  // 현재 댓글의 자식 댓글들(대댓글)을 찾습니다.
  const replies = allComments.filter(c => c.parentId === comment.id);

  const handleReply = (replyText) => {
    onReplySubmit(replyText, comment.id);
    setIsReplying(false);
  };

  return (
    <div style={{ marginLeft: `${level * 20}px` }} className={styles.commentItem}>
      <div className={styles.commentContent}>
        <p>{comment.comment}</p>
        <button onClick={() => setIsReplying(!isReplying)} className={styles.replyButton}>
          {isReplying ? '취소' : '답글'}
        </button>
      </div>
      
      {isReplying && <CommentForm onSubmit={handleReply} placeholder="답글을 입력하세요..." />}
      
      {replies.length > 0 && (
        <div className={styles.repliesContainer}>
          {replies.map(reply => (
            <Comment key={reply.id} comment={reply} allComments={allComments} onReplySubmit={onReplySubmit} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

// 메인 댓글 섹션 컴포넌트
export default function CommentSection({ comicId, episodeId, imageId }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!comicId || !episodeId || !imageId) return;
    const commentsRef = collection(db, 'Comics', comicId, 'Episodes', episodeId, 'Images', imageId, 'Comments');
    const q = query(commentsRef, orderBy('timestamp', 'asc')); // 시간순으로 정렬

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const commentsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setComments(commentsData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [comicId, episodeId, imageId]);
  
  // 최상위 댓글만 필터링 (parentId가 null이거나 없는 경우)
  const topLevelComments = useMemo(() => comments.filter(c => !c.parentId), [comments]);
  
  // 댓글 제출 핸들러 (최상위 댓글, 대댓글 모두 처리)
  const handleCommentSubmit = async (commentText, parentId = null) => {
    const commentsRef = collection(db, 'Comics', comicId, 'Episodes', episodeId, 'Images', imageId, 'Comments');
    await addDoc(commentsRef, {
      comment: commentText,
      parentId: parentId,
      timestamp: serverTimestamp(),
      // userId: currentUser.uid // 실제 앱에서는 사용자 인증 정보 추가
    });
  };

  if (loading) return <p>댓글을 불러오는 중...</p>;

  return (
    <div className={styles.commentSection}>
      <h4>댓글</h4>
      {topLevelComments.map(comment => (
        <Comment key={comment.id} comment={comment} allComments={comments} onReplySubmit={handleCommentSubmit} />
      ))}
      <hr className={styles.commentDivider} />
      <CommentForm onSubmit={(commentText) => handleCommentSubmit(commentText, null)} />
    </div>
  );
}