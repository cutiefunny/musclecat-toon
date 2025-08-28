// app/admin/page.js
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { db, storage } from '../../lib/firebase/clientApp';
import { collection, getDocs, doc, deleteDoc, query, orderBy, collectionGroup, updateDoc, writeBatch } from 'firebase/firestore';
import { ref, deleteObject, listAll, uploadBytes, getDownloadURL } from 'firebase/storage';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import styles from './page.module.css';
import Modal from '../../components/Modal';
import { SortableEpisodeItem } from '../../components/SortableEpisodeItem';
import { SortableComicItem } from '../../components/SortableComicItem';

export default function AdminDashboard() {
  const [comics, setComics] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState({ comics: true, comments: true });
  const [deleting, setDeleting] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingComic, setEditingComic] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [newThumbnailFile, setNewThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const [selectedComicForEpisodes, setSelectedComicForEpisodes] = useState('');
  const [episodes, setEpisodes] = useState([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [savingComicOrder, setSavingComicOrder] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor));

  const fetchData = useCallback(async () => {
    setLoading(prev => ({ ...prev, comics: true, comments: true }));
    
    try {
      // 💡 **[수정]** orderBy를 제거하고 모든 만화를 가져옵니다.
      const comicsSnapshot = await getDocs(collection(db, 'Comics'));
      const comicsData = comicsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // 💡 order 필드가 없는 경우를 대비해 기본값을 설정합니다.
        order: doc.data().order ?? Infinity 
      }));
      
      // 💡 클라이언트 사이드에서 order 값으로 정렬합니다.
      comicsData.sort((a, b) => a.order - b.order);
      setComics(comicsData);

      const commentsQuery = query(collectionGroup(db, 'Comments'), orderBy('timestamp', 'desc'));
      const commentsSnapshot = await getDocs(commentsQuery);
      const commentsData = commentsSnapshot.docs.map(doc => {
        const pathParts = doc.ref.path.split('/');
        return { id: doc.id, comicId: pathParts[1], episodeId: pathParts[3], imageId: pathParts[5], ...doc.data() };
      });
      setComments(commentsData);

    } catch (error) {
      console.error("데이터 로딩 실패:", error);
    } finally {
      setLoading(prev => ({ ...prev, comics: false, comments: false }));
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchEpisodes = useCallback(async () => {
    if (!selectedComicForEpisodes) {
      setEpisodes([]);
      return;
    }
    setLoadingEpisodes(true);
    try {
      const episodesQuery = query(collection(db, `Comics/${selectedComicForEpisodes}/Episodes`), orderBy('uploadDate', 'asc'));
      const episodesSnapshot = await getDocs(episodesQuery);
      setEpisodes(episodesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("에피소드 목록 로딩 실패:", error);
    } finally {
      setLoadingEpisodes(false);
    }
  }, [selectedComicForEpisodes]);

  useEffect(() => {
    fetchEpisodes();
  }, [fetchEpisodes]);

  const handleEditClick = (comic) => {
    setEditingComic(comic);
    setNewTitle(comic.title);
    setThumbnailPreview(comic.thumbnailUrl);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingComic(null);
    setNewThumbnailFile(null);
    setThumbnailPreview('');
  };

  const handleThumbnailChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setNewThumbnailFile(file);
      setThumbnailPreview(URL.createObjectURL(file));
    }
  };

  const handleUpdateComic = async (e) => {
    e.preventDefault();
    if (!editingComic || !newTitle) return;
    setIsUpdating(true);
    try {
      const comicRef = doc(db, 'Comics', editingComic.id);
      let updatedData = { title: newTitle };
      if (newThumbnailFile) {
        if (editingComic.thumbnailUrl) {
          try {
            const oldThumbnailRef = ref(storage, editingComic.thumbnailUrl);
            await deleteObject(oldThumbnailRef);
          } catch (error) {
            console.error("기존 썸네일 삭제 실패:", error);
          }
        }
        const newThumbnailRef = ref(storage, `comics/${editingComic.id}/thumbnail/${newThumbnailFile.name}`);
        await uploadBytes(newThumbnailRef, newThumbnailFile);
        updatedData.thumbnailUrl = await getDownloadURL(newThumbnailRef);
      }
      await updateDoc(comicRef, updatedData);
      alert('만화 정보가 성공적으로 수정되었습니다.');
      closeModal();
      await fetchData();
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
      await fetchData();
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

  const handleEpisodeDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setEpisodes((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleComicDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setComics((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSaveComicOrder = async () => {
    setSavingComicOrder(true);
    try {
      const batch = writeBatch(db);
      comics.forEach((comic, index) => {
        const comicRef = doc(db, 'Comics', comic.id);
        batch.update(comicRef, { order: index });
      });
      await batch.commit();
      alert('만화 순서가 저장되었습니다.');
      await fetchData();
    } catch (error) {
      console.error("만화 순서 저장 오류:", error);
      alert('순서 저장 중 오류가 발생했습니다.');
    } finally {
      setSavingComicOrder(false);
    }
  };

  const handleSaveEpisodeOrder = async () => {
    if (!selectedComicForEpisodes) return;
    setSavingOrder(true);
    try {
      const batch = writeBatch(db);
      episodes.forEach((episode, index) => {
        const episodeRef = doc(db, `Comics/${selectedComicForEpisodes}/Episodes`, episode.id);
        const baseDate = new Date(2024, 0, 1);
        baseDate.setSeconds(index);
        batch.update(episodeRef, { uploadDate: baseDate });
      });
      await batch.commit();
      alert('에피소드 순서가 저장되었습니다.');
      await fetchEpisodes();
    } catch (error) {
      console.error("에피소드 순서 저장 오류:", error);
      alert('순서 저장 중 오류가 발생했습니다.');
    } finally {
      setSavingOrder(false);
    }
  };

  const handleRenameEpisode = async (episodeId, newTitle) => {
    try {
      const episodeRef = doc(db, `Comics/${selectedComicForEpisodes}/Episodes`, episodeId);
      await updateDoc(episodeRef, { episodeTitle: newTitle });
      setEpisodes(episodes.map(ep => ep.id === episodeId ? { ...ep, episodeTitle: newTitle } : ep));
      alert('에피소드 제목이 변경되었습니다.');
    } catch (error) {
      console.error("에피소드 제목 변경 오류:", error);
      alert('제목 변경 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteEpisode = async (episodeToDelete) => {
    if (!confirm(`'${episodeToDelete.episodeTitle}' 에피소드를 정말 삭제하시겠습니까?\n모든 이미지가 영구적으로 삭제됩니다.`)) return;
    setDeleting(episodeToDelete.id);
    try {
      const episodeRef = doc(db, `Comics/${selectedComicForEpisodes}/Episodes`, episodeToDelete.id);
      const imagesSnapshot = await getDocs(collection(episodeRef, 'Images'));
      
      for (const imageDoc of imagesSnapshot.docs) {
        const imageUrl = imageDoc.data().imageUrl;
        if (imageUrl) {
          try {
            const imageStorageRef = ref(storage, imageUrl);
            await deleteObject(imageStorageRef);
          } catch (storageError) {
             console.error(`Storage 파일 삭제 실패: ${imageUrl}`, storageError);
          }
        }
        const commentsSnapshot = await getDocs(collection(imageDoc.ref, 'Comments'));
        for (const commentDoc of commentsSnapshot.docs) {
          await deleteDoc(commentDoc.ref);
        }
        await deleteDoc(imageDoc.ref);
      }
      await deleteDoc(episodeRef);
      setEpisodes(episodes.filter(ep => ep.id !== episodeToDelete.id));
      alert('에피소드가 삭제되었습니다.');
    } catch (error) {
      console.error("에피소드 삭제 오류:", error);
      alert('에피소드 삭제 중 오류가 발생했습니다.');
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
          <Link href="/admin/edit" className={styles.navLink}>이미지 편집</Link>
        </div>
      </section>

      <section className={styles.section}>
        <h2>만화 관리</h2>
        {loading.comics ? <p>로딩 중...</p> : (
          <>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleComicDragEnd}>
              <SortableContext items={comics.map(c => c.id)} strategy={verticalListSortingStrategy}>
                <div className={styles.list}>
                  {comics.map(comic => (
                    <SortableComicItem
                      key={comic.id}
                      comic={comic}
                      onEdit={handleEditClick}
                      onDelete={deleteComic}
                      isDeleting={deleting === comic.id}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            <button onClick={handleSaveComicOrder} disabled={savingComicOrder} className={styles.saveOrderButton}>
              {savingComicOrder ? '저장 중...' : '만화 순서 저장'}
            </button>
          </>
        )}
      </section>

      <section className={styles.section}>
        <h2>에피소드 목록 관리</h2>
        <select value={selectedComicForEpisodes} onChange={e => setSelectedComicForEpisodes(e.target.value)} className={styles.comicSelector}>
          <option value="">만화 선택</option>
          {comics.map(comic => <option key={comic.id} value={comic.id}>{comic.title}</option>)}
        </select>

        {loadingEpisodes && <p>에피소드 로딩 중...</p>}

        {episodes.length > 0 && (
          <>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleEpisodeDragEnd}>
              <SortableContext items={episodes.map(e => e.id)} strategy={verticalListSortingStrategy}>
                <div className={styles.episodeList}>
                  {episodes.map((episode) => (
                    <SortableEpisodeItem
                      key={episode.id}
                      episode={episode}
                      onRename={handleRenameEpisode}
                      onDelete={handleDeleteEpisode}
                      isDeleting={deleting === episode.id}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            <button onClick={handleSaveEpisodeOrder} disabled={savingOrder} className={styles.saveOrderButton}>
              {savingOrder ? '저장 중...' : '에피소드 순서 저장'}
            </button>
          </>
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

      <Modal show={isModalOpen} onClose={closeModal}>
        {editingComic && (
          <form onSubmit={handleUpdateComic} className={styles.modalForm}>
            <h3>'{editingComic.title}' 정보 수정</h3>
            <div className={styles.formGroup}>
              <label htmlFor="comicTitle">만화 제목</label>
              <input id="comicTitle" type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className={styles.modalInput} required />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="thumbnail">썸네일 이미지</label>
              <input id="thumbnail" type="file" onChange={handleThumbnailChange} accept="image/*" className={styles.modalInput} />
              {thumbnailPreview && <Image src={thumbnailPreview} alt="썸네일 미리보기" width={100} height={100} className={styles.thumbnailPreview} />}
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