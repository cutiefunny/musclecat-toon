// app/admin/page.js
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { db, storage } from '../../lib/firebase/clientApp';
import { collection, getDocs, doc, deleteDoc, query, orderBy, collectionGroup, updateDoc } from 'firebase/firestore';
import { ref, deleteObject, listAll, uploadBytes, getDownloadURL } from 'firebase/storage';
import styles from './page.module.css';
import Modal from '../../components/Modal'; // 💡 Modal 컴포넌트 import

export default function AdminDashboard() {
  const [comics, setComics] = useState([]);
  const [comments, setComments] = useState([]);
  
  const [loading, setLoading] = useState({ comics: true, comments: true });
  const [deleting, setDeleting] = useState(null);

  // 💡 모달 및 편집 상태 추가
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingComic, setEditingComic] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [newThumbnailFile, setNewThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(prev => ({ ...prev, comics: true, comments: true }));
    
    const comicsSnapshot = await getDocs(collection(db, 'Comics'));
    setComics(comicsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    setLoading(prev => ({ ...prev, comics: false }));

    const commentsQuery = query(collectionGroup(db, 'Comments'), orderBy('timestamp', 'desc'));
    const commentsSnapshot = await getDocs(commentsQuery);
    const commentsData = commentsSnapshot.docs.map(doc => {
      const pathParts = doc.ref.path.split('/');
      return {
        id: doc.id, comicId: pathParts[1], episodeId: pathParts[3], imageId: pathParts[5], ...doc.data()
      };
    });
    setComments(commentsData);
    setLoading(prev => ({ ...prev, comments: false }));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 💡 수정 모달 열기 핸들러
  const handleEditClick = (comic) => {
    setEditingComic(comic);
    setNewTitle(comic.title);
    setThumbnailPreview(comic.thumbnailUrl);
    setIsModalOpen(true);
  };

  // 💡 모달 닫기 핸들러
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingComic(null);
    setNewThumbnailFile(null);
    setThumbnailPreview('');
  };

  // 💡 썸네일 파일 변경 핸들러
  const handleThumbnailChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setNewThumbnailFile(file);
      setThumbnailPreview(URL.createObjectURL(file));
    }
  };

  // � 만화 정보 업데이트 핸들러
  const handleUpdateComic = async (e) => {
    e.preventDefault();
    if (!editingComic || !newTitle) return;
    setIsUpdating(true);

    try {
      const comicRef = doc(db, 'Comics', editingComic.id);
      let updatedData = { title: newTitle };

      if (newThumbnailFile) {
        // 기존 썸네일 삭제 (URL이 존재할 경우)
        if (editingComic.thumbnailUrl) {
          try {
            const oldThumbnailRef = ref(storage, editingComic.thumbnailUrl);
            await deleteObject(oldThumbnailRef);
          } catch (error) {
            // 기존 파일이 없거나 삭제에 실패해도 계속 진행 (예: URL이 잘못된 경우)
            console.error("기존 썸네일 삭제 실패:", error);
          }
        }
        
        // 새 썸네일 업로드
        const newThumbnailRef = ref(storage, `comics/${editingComic.id}/thumbnail/${newThumbnailFile.name}`);
        await uploadBytes(newThumbnailRef, newThumbnailFile);
        updatedData.thumbnailUrl = await getDownloadURL(newThumbnailRef);
      }

      await updateDoc(comicRef, updatedData);
      
      alert('만화 정보가 성공적으로 수정되었습니다.');
      closeModal();
      fetchData(); // 목록 새로고침
    } catch (error) {
      console.error("만화 정보 수정 오류:", error);
      alert('정보 수정 중 오류가 발생했습니다.');
    } finally {
      setIsUpdating(false);
    }
  };
  
  const deleteComic = async (comicId) => {
    if (!confirm(`'${comics.find(c => c.id === comicId)?.title}' 만화를 정말 삭제하시겠습니까?\n모든 에피소드와 이미지가 영구적으로 삭제됩니다.`)) return;
    setDeleting(comicId);
    try {
      const comicStorageRef = ref(storage, `comics/${comicId}`);
      const res = await listAll(comicStorageRef);
      for (const folderRef of res.prefixes) {
        const episodeFiles = await listAll(folderRef);
        for (const itemRef of episodeFiles.items) {
          await deleteObject(itemRef);
        }
      }
      
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
      
      await deleteDoc(doc(db, 'Comics', comicId));
      
      alert('만화가 삭제되었습니다.');
      fetchData();
    } catch (error) {
      console.error("만화 삭제 오류:", error);
      alert('만화 삭제 중 오류가 발생했습니다.');
    } finally {
      setDeleting(null);
    }
  };

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
                {/* 💡 수정 및 삭제 버튼 그룹 */}
                <div className={styles.buttonGroup}>
                  <button onClick={() => handleEditClick(comic)} className={styles.editButton}>
                    수정
                  </button>
                  <button onClick={() => deleteComic(comic.id)} disabled={deleting === comic.id} className={styles.deleteButton}>
                    {deleting === comic.id ? '삭제 중...' : '삭제'}
                  </button>
                </div>
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
                <button onClick={() => deleteComment(comment)} disabled={deleting === comment.id} className={styles.deleteButton}>
                  {deleting === comment.id ? '삭제 중...' : '삭제'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 💡 수정 모달 */}
      <Modal show={isModalOpen} onClose={closeModal}>
        {editingComic && (
          <form onSubmit={handleUpdateComic} className={styles.modalForm}>
            <h3>'{editingComic.title}' 정보 수정</h3>
            <div className={styles.formGroup}>
              <label htmlFor="comicTitle">만화 제목</label>
              <input
                id="comicTitle"
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className={styles.modalInput}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="thumbnail">썸네일 이미지</label>
              <input
                id="thumbnail"
                type="file"
                onChange={handleThumbnailChange}
                accept="image/*"
                className={styles.modalInput}
              />
              {thumbnailPreview && (
                <Image src={thumbnailPreview} alt="썸네일 미리보기" width={100} height={100} className={styles.thumbnailPreview} />
              )}
            </div>
            <div className={styles.modalActions}>
              <button type="button" onClick={closeModal} className={styles.cancelButton}>취소</button>
              <button type="submit" disabled={isUpdating} className={styles.saveButton}>
                {isUpdating ? '저장 중...' : '저장'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </main>
  );
}