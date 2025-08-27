// components/ToonViewerNav.js
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from '../app/page.module.css';

import { FaArrowLeft, FaListUl, FaArrowRight } from 'react-icons/fa';

export default function ToonViewerNav({ comicId, prevEpisodeId, nextEpisodeId }) {
  const router = useRouter();

  const handlePrev = () => {
    if (prevEpisodeId) {
      router.push(`/${comicId}/${encodeURIComponent(prevEpisodeId)}`);
    }
  };

  const handleNext = () => {
    if (nextEpisodeId) {
      router.push(`/${comicId}/${encodeURIComponent(nextEpisodeId)}`);
    }
  };

  return (
    <header className={styles.viewerHeader}>
      <button onClick={handlePrev} disabled={!prevEpisodeId} className={styles.iconButton}>
        <FaArrowLeft />
        <span className={styles.buttonText}>이전화</span> 
      </button>
      
      <Link href={`/${comicId}`} className={`${styles.iconButton} ${styles.listButton}`}>
        <FaListUl />
      </Link>
      
      <button onClick={handleNext} disabled={!nextEpisodeId} className={styles.iconButton}>
        {/* 💡 '다음화' 텍스트 추가 */}
        <span className={styles.buttonText}>다음화</span>
        <FaArrowRight />
      </button>
    </header>
  );
}