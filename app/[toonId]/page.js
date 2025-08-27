'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
// getDoc과 doc을 import 합니다.
import { collection, onSnapshot, query, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase/clientApp';
import styles from '../page.module.css';

export default function EpisodeListPage() {
  const params = useParams();
  const { toonId } = params;
  
  // 만화 제목을 저장할 상태 추가
  const [comicTitle, setComicTitle] = useState(''); 
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!toonId) return;

    // 만화 제목을 가져오는 함수
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

    // 에피소드 목록을 가져오는 로직
    const episodesCollectionRef = collection(db, 'Comics', toonId, 'Episodes');
    const q = query(episodesCollectionRef, orderBy('uploadDate', 'desc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const episodesData = [];
      querySnapshot.forEach((doc) => {
        episodesData.push({ id: doc.id, ...doc.data() });
      });
      setEpisodes(episodesData);
      setLoading(false);
    });

    fetchComicTitle(); // 함수 호출

    return () => unsubscribe();
  }, [toonId]);

  if (loading) {
    return <main className={styles.main}><p>로딩 중...</p></main>;
  }

  return (
    <main className={styles.main}>
      {/* toonId 대신 comicTitle 상태를 사용합니다. */}
      <h1 className={styles.title}>{comicTitle}</h1>
      <div className={styles.list}>
        {episodes.map((episode) => (
          <Link href={`/${toonId}/${episode.id}`} key={episode.id} className={styles.listItem}>
            {episode.episodeTitle}
          </Link>
        ))}
      </div>
    </main>
  );
}