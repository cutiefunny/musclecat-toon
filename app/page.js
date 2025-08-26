import Link from 'next/link';
import Image from 'next/image';
import styles from './page.module.css';

// 임시 데이터. 실제로는 Firestore에서 데이터를 가져와야 합니다.
const comics = [
  {
    id: 'muscle-cat-daily',
    title: '근육고양이의 일상',
    author: '김근육',
    thumbnailUrl: '/images/icon-512.png', // 임시 썸네일
  },
  // 다른 만화들...
];

export default function Home() {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>근육고양이 만화책</h1>
      <div className={styles.grid}>
        {comics.map((comic) => (
          <Link href={`/${comic.id}`} key={comic.id} className={styles.card}>
            <Image src={comic.thumbnailUrl} alt={comic.title} width={200} height={200} />
            <h2>{comic.title}</h2>
            <p>{comic.author}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}