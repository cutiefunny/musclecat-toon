// components/CommentSection.js
'use client';

import { useState, useEffect } from 'react';
import { db } from '../lib/firebase/clientApp'; // Firebase 설정 파일
import { collection, query, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';

export default function CommentSection({ comicId, episodeId, imageId }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!comicId || !episodeId || !imageId) return;

    const commentsRef = collection(db, 'Comics', comicId, 'Episodes', episodeId, 'Images', imageId, 'Comments');
    const q = query(commentsRef); // 필요하다면 orderBy 추가

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const commentsData = [];
      querySnapshot.forEach((doc) => {
        commentsData.push({ id: doc.id, ...doc.data() });
      });
      setComments(commentsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [comicId, episodeId, imageId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newComment.trim() === '') return;

    const commentsRef = collection(db, 'Comics', comicId, 'Episodes', episodeId, 'Images', imageId, 'Comments');
    await addDoc(commentsRef, {
      comment: newComment,
      timestamp: serverTimestamp(),
      // userId: currentUser.uid // 실제 앱에서는 사용자 인증 정보 사용
    });
    setNewComment('');
  };

  if (loading) return <p>댓글을 불러오는 중...</p>;

  return (
    <div>
      <div style={{ marginTop: '20px', marginBottom: '20px' }}>
        {comments.map((comment) => (
          <div key={comment.id} style={{ borderBottom: '1px solid #eee', padding: '8px 0' }}>
            <p>{comment.comment}</p>
            {/* <small>{new Date(comment.timestamp?.toDate()).toLocaleString()}</small> */}
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="댓글을 입력하세요..."
          style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <button type="submit" style={{ padding: '8px 16px', borderRadius: '4px', border: 'none', backgroundColor: '#0070f3', color: 'white' }}>
          등록
        </button>
      </form>
    </div>
  );
}