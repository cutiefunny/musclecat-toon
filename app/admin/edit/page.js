// app/admin/edit/page.js
'use client';

import { useState, useEffect, useRef } from 'react';
import { db, storage } from '../../../lib/firebase/clientApp';
import { collection, getDocs, doc, writeBatch, query, orderBy, addDoc } from 'firebase/firestore';
import { ref, deleteObject, uploadBytes, getDownloadURL } from 'firebase/storage';
import Image from 'next/image';
import styles from './page.module.css';

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
  
  const fileInputRef = useRef(null);

  const handleEditClick = () => {
    fileInputRef.current.click();
  };
  
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(id, e.target.files[0]);
    }
  };

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
        onPointerDown={(e) => e.stopPropagation()}
        className={styles.editButton}
      >
        수정
      </button>
      <button 
        onClick={() => onDelete(id)}
        onPointerDown={(e) => e.stopPropagation()}
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
  const [originalImages, setOriginalImages] = useState([]);
  
  const [selectedComicId, setSelectedComicId] = useState('');
  const [selectedEpisodeId, setSelectedEpisodeId] = useState('');
  
  const [loadingComics, setLoadingComics] = useState(true);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [loadingImages, setLoadingImages] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const addFileInputRef = useRef(null); // 이미지 추가를 위한 ref

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const fetchComics = async () => {
      const comicsSnapshot = await getDocs(collection(db, 'Comics'));
      setComics(comicsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoadingComics(false);
    };
    fetchComics();
  }, []);

  useEffect(() => {
    if (!selectedComicId) {
      setEpisodes([]); setImages([]); setSelectedEpisodeId(''); return;
    }
    const fetchEpisodes = async () => {
      setLoadingEpisodes(true);
      const q = query(collection(db, `Comics/${selectedComicId}/Episodes`), orderBy('uploadDate', 'desc'));
      const snapshot = await getDocs(q);
      setEpisodes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoadingEpisodes(false);
    };
    fetchEpisodes();
  }, [selectedComicId]);

  useEffect(() => {
    if (!selectedComicId || !selectedEpisodeId) {
      setImages([]); setOriginalImages([]); return;
    }
    const fetchImages = async () => {
      setLoadingImages(true);
      const q = query(collection(db, `Comics/${selectedComicId}/Episodes/${selectedEpisodeId}/Images`), orderBy('order'));
      const snapshot = await getDocs(q);
      const fetchedImages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setImages(fetchedImages);
      setOriginalImages(fetchedImages);
      setLoadingImages(false);
    };
    fetchImages();
  }, [selectedComicId, selectedEpisodeId]);

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
  
  const handleFileSelect = (imageId, file) => {
    setImages(current => current.map(img => img.id === imageId ? { ...img, newFile: file } : img));
  };
  
  // 💡 새로운 이미지 추가 핸들러
  const handleAddImages = (e) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map(file => ({
        id: `new-${file.name}-${Date.now()}`, // 임시 고유 ID
        isNew: true, // 새 파일임을 표시
        newFile: file,
        imageUrl: URL.createObjectURL(file) // 미리보기용 URL
      }));
      setImages(current => [...current, ...newFiles]);
    }
  };

  const handleDeleteImage = (imageIdToDelete) => {
    if (confirm('이 이미지를 삭제하시겠습니까? "변경사항 저장"을 눌러야 최종 반영됩니다.')) {
      setImages(images.filter(image => image.id !== imageIdToDelete));
    }
  };

  const handleSaveChanges = async () => {
    if (!selectedComicId || !selectedEpisodeId) return;
    setIsSaving(true);
    
    try {
      const batch = writeBatch(db);
      const imagesCollectionRef = collection(db, `Comics/${selectedComicId}/Episodes/${selectedEpisodeId}/Images`);
      
      const currentImageIds = new Set(images.map(img => img.id));
      const deletedImages = originalImages.filter(img => !currentImageIds.has(img.id));
      for (const imageToDelete of deletedImages) {
        const imageStorageRef = ref(storage, imageToDelete.imageUrl);
        await deleteObject(imageStorageRef);
        batch.delete(doc(imagesCollectionRef, imageToDelete.id));
      }

      for (const [index, image] of images.entries()) {
        if (image.isNew) { // 새로 추가된 이미지
          const newStorageRef = ref(storage, `comics/${selectedComicId}/${selectedEpisodeId}/${Date.now()}_${image.newFile.name}`);
          await uploadBytes(newStorageRef, image.newFile);
          const newImageUrl = await getDownloadURL(newStorageRef);
          
          // batch.set()은 ID가 없는 새 문서에 사용할 수 없으므로 addDoc을 별도로 호출해야 함
          // 여기서는 batch를 사용하지 않고 바로 추가 후, 순서 업데이트는 나중에 일괄 처리
          const newDocRef = doc(collection(db, 'tmp')); // 임시 ID 생성용
          batch.set(doc(imagesCollectionRef, newDocRef.id), {
            imageUrl: newImageUrl,
            order: index
          });
        } else if (image.newFile) { // 기존 이미지 파일 교체
          const imageRef = doc(imagesCollectionRef, image.id);
          const originalImage = originalImages.find(img => img.id === image.id);
          if (originalImage) {
            const oldStorageRef = ref(storage, originalImage.imageUrl);
            await deleteObject(oldStorageRef);
          }
          const newStorageRef = ref(storage, `comics/${selectedComicId}/${selectedEpisodeId}/${Date.now()}_${image.newFile.name}`);
          await uploadBytes(newStorageRef, image.newFile);
          const newImageUrl = await getDownloadURL(newStorageRef);
          batch.update(imageRef, { order: index, imageUrl: newImageUrl });
        } else { // 순서만 변경된 기존 이미지
          const imageRef = doc(imagesCollectionRef, image.id);
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

      {loadingImages && <p>로딩 중...</p>}
      
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
          
          {/* 💡 이미지 추가 버튼 및 숨겨진 input */}
          <div className={styles.buttonGroup}>
              <input
                type="file"
                multiple
                ref={addFileInputRef}
                onChange={handleAddImages}
                style={{ display: 'none' }}
                accept="image/*"
              />
              <button onClick={() => addFileInputRef.current.click()} className={styles.addButton}>
                이미지 추가
              </button>
              <button onClick={handleSaveChanges} disabled={isSaving} className={styles.saveButton}>
                {isSaving ? '저장 중...' : '변경사항 저장'}
              </button>
          </div>
        </>
      )}
    </main>
  );
}