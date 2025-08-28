// components/ToonSlider.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Slider from 'react-slick';
import Image from 'next/image';
import CommentSection from './CommentSection';
import Modal from './Modal';
import styles from '../app/page.module.css';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

export default function ToonSlider({ images, comicId, episodeId, nextEpisodeId }) {
  const [modalImageId, setModalImageId] = useState(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const router = useRouter();

  // 💡 커스텀 화살표 컴포넌트를 ToonSlider 내부에 정의하여
  //    router, comicId, nextEpisodeId 등의 props에 접근할 수 있도록 합니다.
  function NextArrow(props) {
    const { onClick, currentSlide, slideCount } = props;
    const isLastSlide = currentSlide === slideCount - 1;

    const handleClick = () => {
      // 💡 PC 환경이고 마지막 슬라이드일 경우, 다음 에피소드로 이동시킵니다.
      if (isDesktop && isLastSlide && nextEpisodeId) {
        const nextUrl = `/${comicId}/${encodeURIComponent(nextEpisodeId)}`;
        router.push(nextUrl);
      } else if (onClick) {
        // 그 외의 경우에는 기본 슬라이드 이동 동작을 수행합니다.
        onClick();
      }
    };
    return (
      <button className={`${styles.slickArrow} ${styles.slickNext}`} onClick={handleClick}>
        <FaChevronRight />
      </button>
    );
  }

  function PrevArrow(props) {
    const { onClick } = props;
    return (
      <button className={`${styles.slickArrow} ${styles.slickPrev}`} onClick={onClick}>
        <FaChevronLeft />
      </button>
    );
  }

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 768px)');
    const handleResize = () => setIsDesktop(mediaQuery.matches);
    
    handleResize(); // 초기 렌더링 시 확인
    mediaQuery.addEventListener('change', handleResize);
    
    return () => mediaQuery.removeEventListener('change', handleResize);
  }, []);

  const settings = {
    dots: true,
    infinite: false,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: true,
    swipe: !isDesktop,
    nextArrow: <NextArrow />,
    prevArrow: <PrevArrow />,
    beforeChange: (currentSlide, nextSlide) => {
      // 모바일에서 스와이프로 마지막 페이지를 넘길 때 다음 에피소드로 이동하는 로직은 유지합니다.
      if (!isDesktop && currentSlide === images.length - 1 && nextSlide === currentSlide && nextEpisodeId) {
        const nextUrl = `/${comicId}/${encodeURIComponent(nextEpisodeId)}`;
        router.push(nextUrl);
      }
    }
  };
  
  const openComments = (imageId) => setModalImageId(imageId);
  const closeComments = () => setModalImageId(null);

  return (
    <div className={styles.toonSliderContainer}>
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