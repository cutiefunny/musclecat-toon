'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { collection, onSnapshot, query, orderBy, doc, getDoc, getDocs, limit } from 'firebase/firestore'; // getDocs, limit 추가
import { db } from '../../lib/firebase/clientApp';
import Image from 'next/image'; // Image 컴포넌트 import
import styles from '../page.module.css';

export default function EpisodeListPage() {
  const params = useParams();
  const { toonId } = params;
  
  const [comicTitle, setComicTitle] = useState(''); 
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);

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
        thumbnailUrl: null // 썸네일 필드 초기화
      }));

      // 각 에피소드의 첫 번째 이미지 URL을 가져옵니다.
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
      <h1 className={styles.title}>{comicTitle}</h1>
      <div className={styles.list}>
        {episodes.map((episode) => (
          <Link href={`/${toonId}/${episode.id}`} key={episode.id} className={styles.listItem}>
            {/* 💡 썸네일 이미지 추가 */}
            <div className={styles.episodeInfo}>
              <span>{episode.episodeTitle}</span>
              {/* uploadDate를 표시하고 싶다면 아래 주석 해제 */}
              {/* <small>{new Date(episode.uploadDate.toDate()).toLocaleDateString()}</small> */}
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