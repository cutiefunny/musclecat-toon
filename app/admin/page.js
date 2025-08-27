// app/admin/page.js
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { db, storage } from '../../lib/firebase/clientApp';
import { collection, getDocs, doc, writeBatch, query, orderBy, collectionGroup, deleteDoc } from 'firebase/firestore';
import { ref, deleteObject, listAll } from 'firebase/storage';
import styles from './page.module.css';

export default function AdminDashboard() {
  const [comics, setComics] = useState([]);
  const [episodes, setEpisodes] = useState([]);
  const [comments, setComments] = useState([]);
  
  const [selectedComicId, setSelectedComicId] = useState('');
  
  const [loading, setLoading] = useState({ comics: true, episodes: false, comments: true });
  const [deleting, setDeleting] = useState(null); // 'comic-id', 'episode-id', 'comment-id'

  // 데이터 로딩 함수
  const fetchData = useCallback(async () => {
    // 만화 목록
    setLoading(prev => ({ ...prev, comics: true }));
    const comicsSnapshot = await getDocs(collection(db, 'Comics'));
    setComics(comicsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    setLoading(prev => ({ ...prev, comics: false }));

    // 최근 댓글 20개
    setLoading(prev => ({ ...prev, comments: true }));
    const commentsQuery = query(collectionGroup(db, 'Comments'), orderBy('timestamp', 'desc'));
    const commentsSnapshot = await getDocs(commentsQuery);
    const commentsData = commentsSnapshot.docs.map(doc => {
      const pathParts = doc.ref.path.split('/');
      return {
        id: doc.id,
        comicId: pathParts[1],
        episodeId: pathParts[3],
        imageId: pathParts[5],
        ...doc.data()
      };
    });
    setComments(commentsData);
    setLoading(prev => ({ ...prev, comments: false }));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 만화 선택 시 에피소드 목록 불러오기
  useEffect(() => {
    if (!selectedComicId) {
      setEpisodes([]);
      return;
    }
    const fetchEpisodes = async () => {
      setLoading(prev => ({ ...prev, episodes: true }));
      const episodesQuery = query(collection(db, `Comics/${selectedComicId}/Episodes`), orderBy('uploadDate', 'desc'));
      const episodesSnapshot = await getDocs(episodesQuery);
      setEpisodes(episodesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(prev => ({ ...prev, episodes: false }));
    };
    fetchEpisodes();
  }, [selectedComicId]);

  // 만화 삭제 함수
  const deleteComic = async (comicId) => {
    if (!confirm(`'${comics.find(c => c.id === comicId)?.title}' 만화를 정말 삭제하시겠습니까?\n모든 에피소드와 이미지가 영구적으로 삭제됩니다.`)) return;
    setDeleting(comicId);
    try {
      // Storage에서 모든 관련 파일 삭제
      const comicStorageRef = ref(storage, `comics/${comicId}`);
      const res = await listAll(comicStorageRef);
      for (const folderRef of res.prefixes) {
        const episodeFiles = await listAll(folderRef);
        for (const itemRef of episodeFiles.items) {
          await deleteObject(itemRef);
        }
      }
      
      // Firestore에서 모든 하위 문서 삭제 (에피소드, 이미지, 댓글)
      const episodesSnapshot = await getDocs(collection(db, `Comics/${comicId}/Episodes`));
      for (const episodeDoc of episodesSnapshot.docs) {
        const imagesSnapshot = await getDocs(collection(db, episodeDoc.ref.path, 'Images'));
        for (const imageDoc of imagesSnapshot.docs) {
          const commentsSnapshot = await getDocs(collection(db, imageDoc.ref.path, 'Comments'));
          for (const commentDoc of commentsSnapshot.docs) {
            await deleteDoc(commentDoc.ref);
          }
          await deleteDoc(imageDoc.ref);
        }
        await deleteDoc(episodeDoc.ref);
      }
      
      // 최상위 만화 문서 삭제
      await deleteDoc(doc(db, 'Comics', comicId));
      
      alert('만화가 삭제되었습니다.');
      fetchData(); // 데이터 새로고침
    } catch (error) {
      console.error("만화 삭제 오류:", error);
      alert('만화 삭제 중 오류가 발생했습니다.');
    } finally {
      setDeleting(null);
    }
  };

  // 댓글 삭제 함수
  const deleteComment = async (comment) => {
    if (!confirm('이 댓글을 삭제하시겠습니까?')) return;
    setDeleting(comment.id);
    try {
      const commentRef = doc(db, `Comics/${comment.comicId}/Episodes/${comment.episodeId}/Images/${comment.imageId}/Comments`, comment.id);
      await deleteDoc(commentRef);
      setComments(prev => prev.filter(c => c.id !== comment.id));
    } catch (error) {
      console.error("댓글 삭제 오류:", error);
      alert('댓글 삭제 중 오류가 발생했습니다.');
    } finally {
      setDeleting(null);
    }
  };


  return (
    <main className={styles.main}>
      <h1 className={styles.title}>관리자 대시보드</h1>

      <section className={styles.section}>
        <h2>바로가기</h2>
        <div className={styles.navLinks}>
          <Link href="/admin/upload" className={styles.navLink}>새 에피소드 업로드</Link>
          <Link href="/admin/edit" className={styles.navLink}>에피소드 편집</Link>
        </div>
      </section>

      <section className={styles.section}>
        <h2>만화 관리</h2>
        {loading.comics ? <p>로딩 중...</p> : (
          <ul className={styles.list}>
            {comics.map(comic => (
              <li key={comic.id} className={styles.listItem}>
                <span>{comic.title} ({comic.author})</span>
                <button onClick={() => deleteComic(comic.id)} disabled={deleting === comic.id}>
                  {deleting === comic.id ? '삭제 중...' : '삭제'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.section}>
        <h2>댓글 관리</h2>
        {loading.comments ? <p>로딩 중...</p> : (
           <ul className={styles.list}>
            {comments.map(comment => (
              <li key={comment.id} className={styles.listItem}>
                <div className={styles.commentContent}>
                  <p>"{comment.comment}"</p>
                  <small>위치: {comment.comicId} / {decodeURIComponent(comment.episodeId)}</small>
                </div>
                <button onClick={() => deleteComment(comment)} disabled={deleting === comment.id}>
                  {deleting === comment.id ? '삭제 중...' : '삭제'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}