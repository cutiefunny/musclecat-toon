'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase/clientApp';
import styles from './page.module.css';

export default function Home() {
  const [comics, setComics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const comicsCollectionRef = collection(db, 'Comics');
    const unsubscribe = onSnapshot(comicsCollectionRef, (querySnapshot) => {
      const comicsData = [];
      querySnapshot.forEach((doc) => {
        comicsData.push({ id: doc.id, ...doc.data() });
      });
      setComics(comicsData);
      setLoading(false);
    });

    return () => unsubscribe(); // Clean up the listener on component unmount
  }, []);

  if (loading) {
    return <main className={styles.main}><p>로딩 중...</p></main>;
  }

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>근육고양이 만화책</h1>
      <div className={styles.grid}>
        {comics.map((comic) => {
          // 💡 thumbnailUrl이 유효한 URL 형식인지 확인하는 로직입니다.
          const imageUrl = comic.thumbnailUrl && (comic.thumbnailUrl.startsWith('http') || comic.thumbnailUrl.startsWith('/'))
            ? comic.thumbnailUrl
            : '/images/icon-512.png'; // 유효하지 않으면 기본 이미지를 사용합니다.

          return (
            <Link href={`/${comic.id}`} key={comic.id} className={styles.card}>
              <Image src={imageUrl} alt={comic.title} width={200} height={200} />
              <h2>{comic.title}</h2>
              <p>{comic.author}</p>
            </Link>
          );
        })}
      </div>
    </main>
  );
}