'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { collection, onSnapshot, query, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase/clientApp';
// 새로 만든 ToonSlider 컴포넌트를 import 합니다.
import ToonSlider from '../../../components/ToonSlider';
import styles from '../../page.module.css';

export default function ToonViewerPage() {
  const params = useParams();
  const { toonId = '', episodeId = '' } = params || {};

  const [comicTitle, setComicTitle] = useState('');
  const [episodeTitle, setEpisodeTitle] = useState('');
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!toonId || !episodeId) return;

    const decodedEpisodeId = decodeURIComponent(episodeId);

    const fetchData = async () => {
      try {
        const comicDocRef = doc(db, 'Comics', toonId);
        const comicSnap = await getDoc(comicDocRef);
        if (comicSnap.exists()) {
          setComicTitle(comicSnap.data().title);
        }

        const episodeDocRef = doc(db, 'Comics', toonId, 'Episodes', decodedEpisodeId);
        const episodeSnap = await getDoc(episodeDocRef);
        if (episodeSnap.exists()) {
          setEpisodeTitle(episodeSnap.data().episodeTitle);
        }

        const imagesCollectionRef = collection(db, 'Comics', toonId, 'Episodes', decodedEpisodeId, 'Images');
        const q = query(imagesCollectionRef, orderBy('order'));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
          const imagesData = [];
          querySnapshot.forEach((doc) => {
            imagesData.push({ id: doc.id, ...doc.data() });
          });
          setImages(imagesData);
          setLoading(false);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error("데이터를 가져오는 중 오류 발생:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, [toonId, episodeId]);

  if (loading) {
    return <main className={styles.main}><p>로딩 중...</p></main>;
  }

  return (
    <main className={styles.main}>
      {/* <h1 className={styles.title}>{`${comicTitle} - ${episodeTitle}`}</h1> */}
      <div className={styles.viewer}>
        {/* 기존의 map 함수 대신 ToonSlider 컴포넌트를 사용합니다. */}
        <ToonSlider 
          images={images} 
          comicId={toonId} 
          episodeId={decodeURIComponent(episodeId)} 
        />
      </div>
    </main>
  );
}