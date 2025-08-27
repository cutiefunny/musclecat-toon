// app/admin/edit/page.js
'use client';

import { useState, useEffect, useRef } from 'react';
import { db, storage } from '../../../lib/firebase/clientApp';
import { collection, getDocs, doc, writeBatch, query, orderBy, deleteDoc } from 'firebase/firestore';
import { ref, deleteObject, uploadBytes, getDownloadURL } from 'firebase/storage';
import Image from 'next/image';
import styles from './page.module.css';

// @dnd-kit 라이브러리에서 필요한 모듈을 import 합니다.
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

// Draggable 아이템을 위한 별도의 컴포넌트를 생성합니다.
function SortableItem({ id, image, index, onDelete, onFileSelect }) {
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

  // 숨겨진 파일 입력을 위한 ref
  const fileInputRef = useRef(null);

  const handleEditClick = () => {
    fileInputRef.current.click();
  };
  
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(id, e.target.files[0]);
    }
  };

  // 미리보기를 위한 URL 생성
  const imagePreviewUrl = image.newFile ? URL.createObjectURL(image.newFile) : image.imageUrl;

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={styles.imageItem}>
      <span>{index + 1}.</span>
      <Image src={imagePreviewUrl} alt={`Image ${index + 1}`} width={80} height={80} style={{ objectFit: 'cover' }} />
      <span className={styles.imageName}>{image.newFile ? image.newFile.name : image.id}</span>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        accept="image/*"
      />
      <button 
        onClick={handleEditClick}
        onPointerDown={(e) => e.stopPropagation()} // 이벤트 전파 방지
        className={styles.editButton}
      >
        수정
      </button>
      <button 
        onClick={() => onDelete(id)}
        onPointerDown={(e) => e.stopPropagation()} // 이벤트 전파 방지
        className={styles.deleteButton}
      >
        삭제
      </button>
    </div>
  );
}


export default function AdminEditPage() {
  const [comics, setComics] = useState([]);
  const [episodes, setEpisodes] = useState([]);
  const [images, setImages] = useState([]);
  const [originalImages, setOriginalImages] = useState([]); // 원본 이미지 목록 저장
  
  const [selectedComicId, setSelectedComicId] = useState('');
  const [selectedEpisodeId, setSelectedEpisodeId] = useState('');
  
  const [loadingComics, setLoadingComics] = useState(true);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [loadingImages, setLoadingImages] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 만화 목록 불러오기
  useEffect(() => {
    const fetchComics = async () => {
      const comicsSnapshot = await getDocs(collection(db, 'Comics'));
      setComics(comicsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoadingComics(false);
    };
    fetchComics();
  }, []);

  // 만화 선택 시 에피소드 목록 불러오기
  useEffect(() => {
    if (!selectedComicId) {
      setEpisodes([]);
      setImages([]);
      setSelectedEpisodeId('');
      return;
    }
    const fetchEpisodes = async () => {
      setLoadingEpisodes(true);
      const episodesQuery = query(collection(db, `Comics/${selectedComicId}/Episodes`), orderBy('uploadDate', 'desc'));
      const episodesSnapshot = await getDocs(episodesQuery);
      setEpisodes(episodesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoadingEpisodes(false);
    };
    fetchEpisodes();
  }, [selectedComicId]);

  // 에피소드 선택 시 이미지 목록 불러오기
  useEffect(() => {
    if (!selectedComicId || !selectedEpisodeId) {
      setImages([]);
      setOriginalImages([]);
      return;
    }
    const fetchImages = async () => {
      setLoadingImages(true);
      const imagesQuery = query(collection(db, `Comics/${selectedComicId}/Episodes/${selectedEpisodeId}/Images`), orderBy('order'));
      const imagesSnapshot = await getDocs(imagesQuery);
      const fetchedImages = imagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setImages(fetchedImages);
      setOriginalImages(fetchedImages); // 원본 상태 저장
      setLoadingImages(false);
    };
    fetchImages();
  }, [selectedComicId, selectedEpisodeId]);

  // 드래그 종료 핸들러
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setImages((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };
  
  // 이미지 파일 교체 핸들러
  const handleFileSelect = (imageId, file) => {
    setImages(currentImages =>
      currentImages.map(image =>
        image.id === imageId ? { ...image, newFile: file } : image
      )
    );
  };

  // 이미지 삭제 핸들러
  const handleDeleteImage = (imageIdToDelete) => {
    if (confirm('정말로 이 이미지를 삭제하시겠습니까? "변경사항 저장"을 눌러야 최종 반영됩니다.')) {
      setImages(images.filter(image => image.id !== imageIdToDelete));
    }
  };

  // 변경사항 저장 핸들러
  const handleSaveChanges = async () => {
    if (!selectedComicId || !selectedEpisodeId) return;
    setIsSaving(true);
    
    try {
      const batch = writeBatch(db);
      const imagesCollectionRef = collection(db, `Comics/${selectedComicId}/Episodes/${selectedEpisodeId}/Images`);
      
      // 삭제된 이미지 처리
      const currentImageIds = new Set(images.map(img => img.id));
      const deletedImages = originalImages.filter(img => !currentImageIds.has(img.id));
      for (const imageToDelete of deletedImages) {
        const imageStorageRef = ref(storage, imageToDelete.imageUrl);
        await deleteObject(imageStorageRef);
        batch.delete(doc(imagesCollectionRef, imageToDelete.id));
      }

      // 순서 변경 및 이미지 교체 처리
      for (const [index, image] of images.entries()) {
        const imageRef = doc(imagesCollectionRef, image.id);
        if (image.newFile) { // 파일이 교체된 경우
          const originalImage = originalImages.find(img => img.id === image.id);
          if (originalImage) {
             // 기존 스토리지 파일 삭제
            const oldStorageRef = ref(storage, originalImage.imageUrl);
            await deleteObject(oldStorageRef);
          }
          // 새 파일 업로드
          const newStorageRef = ref(storage, `comics/${selectedComicId}/${selectedEpisodeId}/${Date.now()}_${image.newFile.name}`);
          await uploadBytes(newStorageRef, image.newFile);
          const newImageUrl = await getDownloadURL(newStorageRef);
          // Firestore 문서 업데이트 (순서와 URL)
          batch.update(imageRef, { order: index, imageUrl: newImageUrl });
        } else {
          // 순서만 업데이트
          batch.update(imageRef, { order: index });
        }
      }

      await batch.commit();
      alert('변경사항이 성공적으로 저장되었습니다.');
      // 데이터 새로고침
      const imagesQuery = query(collection(db, `Comics/${selectedComicId}/Episodes/${selectedEpisodeId}/Images`), orderBy('order'));
      const imagesSnapshot = await getDocs(imagesQuery);
      const fetchedImages = imagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setImages(fetchedImages);
      setOriginalImages(fetchedImages);
    } catch (error) {
      console.error("저장 중 오류 발생:", error);
      alert('변경사항 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>에피소드 편집</h1>
      
      <div className={styles.selectorContainer}>
        <select value={selectedComicId} onChange={e => setSelectedComicId(e.target.value)} disabled={loadingComics}>
          <option value="">만화 선택</option>
          {comics.map(comic => <option key={comic.id} value={comic.id}>{comic.title}</option>)}
        </select>
        
        <select value={selectedEpisodeId} onChange={e => setSelectedEpisodeId(e.target.value)} disabled={!selectedComicId || loadingEpisodes}>
          <option value="">에피소드 선택</option>
          {episodes.map(episode => <option key={episode.id} value={episode.id}>{episode.episodeTitle}</option>)}
        </select>
      </div>

      {loadingImages && <p>이미지를 불러오는 중...</p>}
      
      {images.length > 0 && (
        <>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={images.map(i => i.id)} strategy={verticalListSortingStrategy}>
              <div className={styles.imageList}>
                {images.map((image, index) => (
                  <SortableItem key={image.id} id={image.id} image={image} index={index} onDelete={handleDeleteImage} onFileSelect={handleFileSelect} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          <button onClick={handleSaveChanges} disabled={isSaving} className={styles.saveButton}>
            {isSaving ? '저장 중...' : '변경사항 저장'}
          </button>
        </>
      )}
    </main>
  );
}