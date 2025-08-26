import Link from 'next/link';
import styles from '../page.module.css'; // page.module.css 재사용

// 임시 데이터
const episodes = {
  'muscle-cat-daily': [
    { id: 'ep1', title: '1화: 첫 만남' },
    { id: 'ep2', title: '2화: 헬스장 등록' },
  ],
};

export default function EpisodeListPage({ params }) {
  const { toonId } = params;
  const episodeList = episodes[toonId] || [];

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>{toonId}</h1>
      <div className={styles.list}>
        {episodeList.map((episode) => (
          <Link href={`/${toonId}/${episode.id}`} key={episode.id} className={styles.listItem}>
            {episode.title}
          </Link>
        ))}
      </div>
    </main>
  );
}