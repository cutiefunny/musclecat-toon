// app/admin/upload/page.js
'use client';

import { useState, useEffect, useRef } from 'react';
import { db, storage } from '../../../lib/firebase/clientApp';
import { collection, addDoc, getDocs, doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Image from 'next/image';
import styles from './page.module.css';

// 💡 browser-image-compression 라이브러리 import
import imageCompression from 'browser-image-compression';

// @dnd-kit 라이브러리 import
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// 드래그 가능한 아이템 컴포넌트
function SortableFileItem({ id, file, index, onDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  
  const imagePreviewUrl = URL.createObjectURL(file);

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={styles.imageItem}>
      <span>{index + 1}.</span>
      <Image src={imagePreviewUrl} alt={file.name} width={80} height={80} style={{ objectFit: 'cover' }} onLoad={() => URL.revokeObjectURL(imagePreviewUrl)} />
      <span className={styles.imageName}>{file.name}</span>
      <button 
        type="button" 
        onClick={() => onDelete(id)}
        onPointerDown={(e) => e.stopPropagation()}
        className={styles.deleteButton}
      >
        삭제
      </button>
    </div>
  );
}

export default function AdminUploadPage() {
  const [comics, setComics] = useState([]);
  const [selectedComicId, setSelectedComicId] = useState('');
  const [isNewComic, setIsNewComic] = useState(false);

  const [newComicTitle, setNewComicTitle] = useState('');
  const [newComicAuthor, setNewComicAuthor] = useState('');
  const [thumbnailFile, setThumbnailFile] = useState(null);

  const [episodeTitle, setEpisodeTitle] = useState('');
  // imageFiles를 객체 배열로 관리하여 고유 ID를 부여합니다.
  const [imageFiles, setImageFiles] = useState([]); 

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const fetchComics = async () => {
      const comicsCollectionRef = collection(db, 'Comics');
      const querySnapshot = await getDocs(comicsCollectionRef);
      const comicsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setComics(comicsList);
    };
    fetchComics();
  }, []);

  const handleFileChange = (e) => {
    // 각 파일에 고유 ID를 부여하여 상태에 저장
    const files = Array.from(e.target.files).map(file => ({
      id: `${file.name}-${Date.now()}`, // 간단한 고유 ID 생성
      file: file,
    }));
    setImageFiles(files);
  };

  const handleDeleteImage = (fileIdToDelete) => {
    setImageFiles(currentFiles => currentFiles.filter(item => item.id !== fileIdToDelete));
  };
  
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setImageFiles((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    setProgress(0);

    // 💡 이미지 압축 옵션 설정
    const options = {
      maxSizeMB: 1,          // 최대 파일 크기 (1MB)
      maxWidthOrHeight: 800, // 최대 너비 또는 높이
      useWebWorker: true,    // 웹 워커 사용으로 UI 블로킹 방지
    };

    let comicId = selectedComicId;
    let comicData = comics.find(c => c.id === comicId);
    let comicTitle = isNewComic ? newComicTitle : comicData?.title;


    try {
      if (isNewComic) {
        if (!newComicTitle || !newComicAuthor || !thumbnailFile) {
          alert('새로운 만화의 제목, 작가, 썸네일을 모두 입력해주세요.');
          setUploading(false);
          return;
        }
        // 💡 썸네일도 압축
        const compressedThumbnail = await imageCompression(thumbnailFile, options);
        const thumbnailRef = ref(storage, `comics/${newComicTitle}/thumbnail/${compressedThumbnail.name}`);
        await uploadBytes(thumbnailRef, compressedThumbnail);
        const thumbnailUrl = await getDownloadURL(thumbnailRef);

        const newComicRef = await addDoc(collection(db, 'Comics'), {
          title: newComicTitle,
          author: newComicAuthor,
          thumbnailUrl: thumbnailUrl,
        });
        comicId = newComicRef.id;
      }

      if (!comicId || !comicTitle) {
        alert('만화를 선택해주세요.');
        setUploading(false);
        return;
      }
      if (!episodeTitle) {
        alert('에피소드 제목을 입력해주세요.');
        setUploading(false);
        return;
      }
      if (imageFiles.length === 0) {
        alert('이미지 파일을 한 개 이상 선택해주세요.');
        setUploading(false);
        return;
      }

      const episodeRef = doc(db, 'Comics', comicId, 'Episodes', episodeTitle);
      await setDoc(episodeRef, {
        episodeTitle: episodeTitle,
        uploadDate: new Date(),
      });

      for (let i = 0; i < imageFiles.length; i++) {
        const { file } = imageFiles[i];
        
        // 💡 업로드 전에 각 이미지 파일을 압축합니다.
        const compressedFile = await imageCompression(file, options);

        const imageRef = ref(storage, `comics/${comicId}/${episodeTitle}/${Date.now()}_${compressedFile.name}`);
        await uploadBytes(imageRef, compressedFile); // 압축된 파일 업로드
        const imageUrl = await getDownloadURL(imageRef);

        const imageDocRef = collection(episodeRef, 'Images');
        await addDoc(imageDocRef, {
          imageUrl: imageUrl,
          order: i,
        });
        
        setProgress(((i + 1) / imageFiles.length) * 100);
      }

      alert('업로드 완료!');
      setSelectedComicId('');
      setNewComicTitle('');
      setNewComicAuthor('');
      setThumbnailFile(null);
      setEpisodeTitle('');
      setImageFiles([]);
      setIsNewComic(false);
      
    } catch (error) {
      console.error("업로드 실패:", error);
      alert('업로드 중 오류가 발생했습니다.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>만화 업로드</h1>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.section}>
          <h2>만화 선택 또는 추가</h2>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={isNewComic}
              onChange={(e) => setIsNewComic(e.target.checked)}
            />
            새로운 만화 만들기
          </label>

          {isNewComic ? (
            <>
              <input type="text" value={newComicTitle} onChange={(e) => setNewComicTitle(e.target.value)} placeholder="만화 제목" className={styles.input} />
              <input type="text" value={newComicAuthor} onChange={(e) => setNewComicAuthor(e.target.value)} placeholder="작가 이름" className={styles.input} />
              <label>썸네일 이미지:</label>
              <input type="file" onChange={(e) => setThumbnailFile(e.target.files[0])} accept="image/*" className={styles.input} />
            </>
          ) : (
            <select value={selectedComicId} onChange={(e) => setSelectedComicId(e.target.value)} className={styles.select}>
              <option value="">기존 만화 선택</option>
              {comics.map((comic) => (
                <option key={comic.id} value={comic.id}>{comic.title}</option>
              ))}
            </select>
          )}
        </div>

        <div className={styles.section}>
          <h2>에피소드 정보</h2>
          <input type="text" value={episodeTitle} onChange={(e) => setEpisodeTitle(e.target.value)} placeholder="에피소드 제목 (예: 1화. 새로운 시작)" className={styles.input} />
        </div>

        <div className={styles.section}>
          <h2>이미지 파일</h2>
          <input type="file" multiple onChange={handleFileChange} accept="image/*" className={styles.input} />
          
          {imageFiles.length > 0 && (
             <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={imageFiles.map(f => f.id)} strategy={verticalListSortingStrategy}>
                  <div className={styles.imageList}>
                    {imageFiles.map((item, index) => (
                      <SortableFileItem key={item.id} id={item.id} file={item.file} index={index} onDelete={handleDeleteImage} />
                    ))}
                  </div>
                </SortableContext>
            </DndContext>
          )}
        </div>

        <button type="submit" disabled={uploading} className={styles.button}>
          {uploading ? `업로드 중... (${Math.round(progress)}%)` : '업로드'}
        </button>
      </form>
    </main>
  );
}