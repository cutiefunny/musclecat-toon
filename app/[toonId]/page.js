'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { collection, onSnapshot, query, orderBy, doc, getDoc, getDocs, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase/clientApp';
import Image from 'next/image';
import styles from '../page.module.css';
import { FaArrowLeft, FaPlayCircle } from 'react-icons/fa'; // 💡 FaPlayCircle 아이콘 추가

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
    // 💡 첫 화를 찾기 위해 오름차순으로 정렬합니다.
    const q = query(episodesCollectionRef, orderBy('uploadDate', 'asc'));

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
      
      // 💡 화면에는 최신순으로 보여주기 위해 배열을 뒤집습니다.
      setEpisodes(episodesWithThumbnails.reverse());
      setLoading(false);
    });

    return () => unsubscribe();
  }, [toonId]);
  
  // 💡 첫 에피소드의 ID를 찾습니다. episodes 배열은 현재 내림차순이므로 마지막 요소가 첫 에피소드입니다.
  const firstEpisodeId = episodes.length > 0 ? episodes[episodes.length - 1].id : null;

  if (loading) {
    return <main className={styles.main}><p>로딩 중...</p></main>;
  }

  return (
    <main className={styles.main}>
      <div className={styles.episodeHeader}>
        <button onClick={handlePrev} className={styles.homeButton}>
          <FaArrowLeft />
        </button>
        <h1 className={styles.title}>{comicTitle}</h1>
      </div>
      <div className={styles.list}>
        {/* 💡 '처음부터 보기' 버튼 추가 */}
        {firstEpisodeId && (
          <Link href={`/${toonId}/${firstEpisodeId}`} className={`${styles.listItem} ${styles.firstEpisodeButton}`}>
            <div className={styles.episodeInfo}>
              <FaPlayCircle />
              <span>처음부터 보기</span>
            </div>
          </Link>
        )}
        
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