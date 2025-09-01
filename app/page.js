// app/page.js
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'; // query와 orderBy를 import 합니다.
import { db } from '../lib/firebase/clientApp';
import styles from './page.module.css';
import { FaDownload } from 'react-icons/fa'; // 💡 아이콘 import

export default function Home() {
  const [comics, setComics] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 💡 PWA 설치 버튼 관련 상태 추가
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstallButton, setShowInstallButton] = useState(false);

  useEffect(() => {
    const comicsCollectionRef = collection(db, 'Comics');
    // 💡 order 필드를 기준으로 오름차순으로 정렬하는 쿼리를 추가합니다.
    const q = query(comicsCollectionRef, orderBy("order", "asc"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const comicsData = [];
      querySnapshot.forEach((doc) => {
        comicsData.push({ id: doc.id, ...doc.data() });
      });
      setComics(comicsData);
      setLoading(false);
    });

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };

    // PWA 설치 프롬프트 이벤트를 감지합니다.
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // 컴포넌트가 마운트될 때 배너 닫힘 여부를 확인합니다.
    const isDismissed = localStorage.getItem('pwaInstallDismissed') === 'true';
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

    if (isDismissed && !isStandalone) {
      setShowInstallButton(true);
    }

    return () => {
      unsubscribe();
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);
  
  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('PWA 설치가 수락되었습니다.');
      setShowInstallButton(false); // 설치 후 버튼 숨김
    }
  };

  if (loading) {
    return <main className={styles.main}><p>로딩 중...</p></main>;
  }

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>근육고양이<img src="/images/icon.png" alt="근육고양이 아이콘" width={'40px'} style={{ marginBottom: '-8px' }} />만화책</h1>
      <div className={styles.grid}>
        {comics.map((comic) => {
          const imageUrl = comic.thumbnailUrl && (comic.thumbnailUrl.startsWith('http') || comic.thumbnailUrl.startsWith('/'))
            ? comic.thumbnailUrl
            : '/images/icon-512.png';

          return (
            <Link href={`/${comic.id}`} key={comic.id} className={styles.card}>
              <Image src={imageUrl} alt={comic.title} width={200} height={200} />
              <h2>{comic.title}</h2>
            </Link>
          );
        })}
      </div>

      {/* 💡 조건부로 홈 화면 설치 버튼을 렌더링합니다. */}
      {showInstallButton && installPrompt && (
        <button onClick={handleInstallClick} className={styles.homeInstallButton}>
          <FaDownload />
          <span>앱 설치</span>
        </button>
      )}
    </main>
  );
}