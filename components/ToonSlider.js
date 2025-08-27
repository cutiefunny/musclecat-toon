// components/ToonSlider.js
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Slider from 'react-slick';
import Image from 'next/image';
import CommentSection from './CommentSection';
import Modal from './Modal';
import styles from '../app/page.module.css';

import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

export default function ToonSlider({ images, comicId, episodeId, nextEpisodeId }) {
  const [modalImageId, setModalImageId] = useState(null);
  const router = useRouter();

  const settings = {
    dots: true,
    infinite: false,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: true,
    // 💡 onSwipe 대신 beforeChange 이벤트를 사용합니다.
    beforeChange: (currentSlide, nextSlide) => {
      // 💡 현재 슬라이드가 마지막이고, 다음 슬라이드로 넘어가려고 할 때
      if (currentSlide === images.length - 1 && nextSlide == currentSlide && nextEpisodeId) {
        const nextUrl = `/${comicId}/${encodeURIComponent(nextEpisodeId)}`;
        router.push(nextUrl);
      }
    }
  };
  
  const openComments = (imageId) => setModalImageId(imageId);
  const closeComments = () => setModalImageId(null);

  return (
    <div className="toon-slider-container">
      <Slider {...settings}>
        {images.map((image, index) => {
          const isValidUrl = image.imageUrl && (image.imageUrl.startsWith('http') || image.imageUrl.startsWith('/'));
          if (!isValidUrl) {
            console.error('Invalid image URL found:', image.imageUrl);
            return null;
          }
          return (
            <div key={image.id}>
              <div 
                className={styles.imageWrapper}
                onClick={() => openComments(image.id)}
              >
                <Image 
                  src={image.imageUrl} 
                  alt={`Image ${image.order}`} 
                  fill 
                  style={{ objectFit: 'contain' }}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 100vw, 100vw"
                  priority={index === 0}
                />
              </div>
            </div>
          );
        })}
      </Slider>

      <Modal show={!!modalImageId} onClose={closeComments}>
        {modalImageId && (
           <CommentSection
            comicId={comicId}
            episodeId={episodeId}
            imageId={modalImageId}
          />
        )}
      </Modal>
    </div>
  );
}