'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { collection, onSnapshot, query, orderBy, doc, getDoc, getDocs, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase/clientApp';
import Image from 'next/image';
import styles from '../page.module.css';
import { FaArrowLeft } from 'react-icons/fa'; // 💡 react-icons에서 FaHome 아이콘을 import 합니다.

export default function EpisodeListPage() {
  const params = useParams();
  const { toonId } = params;
  
  const [comicTitle, setComicTitle] = useState(''); 
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  const handlePrev = () => {
    router.push(`/`);
  };

  useEffect(() => {
    if (!toonId) return;

    const fetchComicTitle = async () => {
      const comicDocRef = doc(db, 'Comics', toonId);
      const comicSnap = await getDoc(comicDocRef);
      if (comicSnap.exists()) {
        setComicTitle(comicSnap.data().title);
      } else {
        console.error("해당 ID의 만화를 찾을 수 없습니다.");
        setComicTitle('알 수 없는 만화');
      }
    };

    fetchComicTitle();

    const episodesCollectionRef = collection(db, 'Comics', toonId, 'Episodes');
    const q = query(episodesCollectionRef, orderBy('uploadDate', 'desc'));

    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      setLoading(true);
      const episodesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        thumbnailUrl: null
      }));

      const episodesWithThumbnails = await Promise.all(
        episodesData.map(async (episode) => {
          const imagesRef = collection(db, 'Comics', toonId, 'Episodes', episode.id, 'Images');
          const firstImageQuery = query(imagesRef, orderBy('order'), limit(1));
          const snapshot = await getDocs(firstImageQuery);
          if (!snapshot.empty) {
            episode.thumbnailUrl = snapshot.docs[0].data().imageUrl;
          }
          return episode;
        })
      );

      setEpisodes(episodesWithThumbnails);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [toonId]);

  if (loading) {
    return <main className={styles.main}><p>로딩 중...</p></main>;
  }

  return (
    <main className={styles.main}>
      {/* 💡 제목과 홈 버튼을 감싸는 헤더 컨테이너를 추가합니다. */}
      <div className={styles.episodeHeader}>
        <button onClick={handlePrev} className={styles.homeButton}>
          <FaArrowLeft />
        </button>
        <h1 className={styles.title}>{comicTitle}</h1>
      </div>
      <div className={styles.list}>
        {episodes.map((episode) => (
          <Link href={`/${toonId}/${episode.id}`} key={episode.id} className={styles.listItem}>
            <div className={styles.episodeInfo}>
              <span>{episode.episodeTitle}</span>
            </div>
            {episode.thumbnailUrl && (
              <Image 
                src={episode.thumbnailUrl} 
                alt={`${episode.episodeTitle} 썸네일`} 
                width={80} 
                height={50} 
                className={styles.episodeThumbnail}
              />
            )}
          </Link>
        ))}
      </div>
    </main>
  );
}
