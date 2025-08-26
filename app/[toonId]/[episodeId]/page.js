import Image from 'next/image';
import CommentSection from '../../../components/CommentSection';
import styles from '../../page.module.css';

// 임시 데이터
const images = {
  'muscle-cat-daily': {
    'ep1': [
      { id: 'img1', url: '/images/screenshot.png' },
      { id: 'img2', url: '/images/screenshot2.png' },
      { id: 'img3', url: '/images/screenshot3.png' },
    ]
  }
};


export default function ToonViewerPage({ params }) {
    const { toonId, episodeId } = params;
    const imageList = images[toonId]?.[episodeId] || [];

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>{`${toonId} - ${episodeId}`}</h1>
      <div className={styles.viewer}>
        {imageList.map((image) => (
          <div key={image.id} className={styles.imageContainer}>
            <Image src={image.url} alt={`Image ${image.id}`} width={800} height={1200} layout="responsive" />
            <CommentSection comicId={toonId} episodeId={episodeId} imageId={image.id} />
          </div>
        ))}
      </div>
    </main>
  );
}