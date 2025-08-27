'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { collection, onSnapshot, query, orderBy, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase/clientApp';
import ToonSlider from '../../../components/ToonSlider';
import ToonViewerNav from '../../../components/ToonViewerNav';
import styles from '../../page.module.css';

export default function ToonViewerPage() {
  const params = useParams();
  const { toonId = '', episodeId = '' } = params || {};

  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [prevEpisodeId, setPrevEpisodeId] = useState(null);
  const [nextEpisodeId, setNextEpisodeId] = useState(null);

  useEffect(() => {
    if (!toonId || !episodeId) return;

    const decodedEpisodeId = decodeURIComponent(episodeId);

    const fetchData = async () => {
      try {
        const episodesQuery = query(collection(db, `Comics/${toonId}/Episodes`), orderBy('uploadDate', 'asc'));
        const episodesSnapshot = await getDocs(episodesQuery);
        const allEpisodes = episodesSnapshot.docs.map(doc => doc.id);
        
        const currentIndex = allEpisodes.findIndex(id => id === decodedEpisodeId);
        
        setPrevEpisodeId(currentIndex > 0 ? allEpisodes[currentIndex - 1] : null);
        setNextEpisodeId(currentIndex < allEpisodes.length - 1 ? allEpisodes[currentIndex + 1] : null);

        const imagesCollectionRef = collection(db, 'Comics', toonId, 'Episodes', decodedEpisodeId, 'Images');
        const q = query(imagesCollectionRef, orderBy('order'));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
          setImages(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
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
      {/* 💡 불필요한 props 제거 */}
      <ToonViewerNav
        comicId={toonId}
        prevEpisodeId={prevEpisodeId}
        nextEpisodeId={nextEpisodeId}
      />
      <div className={styles.viewer}>
        <ToonSlider 
          images={images} 
          comicId={toonId} 
          episodeId={decodeURIComponent(episodeId)}
          nextEpisodeId={nextEpisodeId}
        />
      </div>
    </main>
  );
}