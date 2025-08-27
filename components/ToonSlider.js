// components/ToonSlider.js
'use client';

import { useState } from 'react'; // useState 훅을 import 합니다.
import Slider from 'react-slick';
import Image from 'next/image';
import CommentSection from './CommentSection';
import styles from '../app/page.module.css'; // page.module.css에서 스타일을 가져옵니다.

import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

export default function ToonSlider({ images, comicId, episodeId }) {
  // 현재 보고 있는 이미지의 댓글 섹션이 보이는지 여부를 저장하는 상태
  const [showComments, setShowComments] = useState({}); 

  const settings = {
    dots: true,
    infinite: false,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: true
  };

  // 이미지 클릭 시 해당 이미지의 댓글 섹션 가시성을 토글하는 함수
  const toggleComments = (imageId) => {
    setShowComments(prev => ({
      ...prev,
      [imageId]: !prev[imageId] // 해당 이미지 ID의 댓글 상태를 반전시킵니다.
    }));
  };

  return (
    <div className="toon-slider-container">
      <Slider {...settings}>
        {images.map((image) => {
          const isValidUrl = image.imageUrl && (image.imageUrl.startsWith('http') || image.imageUrl.startsWith('/'));
          if (!isValidUrl) {
            console.error('Invalid image URL found:', image.imageUrl);
            return null;
          }
          return (
            <div key={image.id}>
              {/* 이미지 컨테이너에 클릭 이벤트 추가 */}
              <div 
                className={styles.imageWrapper} // 새로운 Wrapper 스타일 적용
                onClick={() => toggleComments(image.id)}
              >
                {/* fill 속성과 objectFit 속성을 사용하여 이미지를 컨테이너에 꽉 채웁니다. */}
                <Image 
                  src={image.imageUrl} 
                  alt={`Image ${image.order}`} 
                  fill 
                  style={{ objectFit: 'contain' }} // 이미지가 잘리지 않고 비율 유지
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 100vw, 100vw"
                />
              </div>
              
              {/* showComments 상태에 따라 CommentSection을 렌더링 */}
              {showComments[image.id] && (
                <div className={styles.commentSectionVisible}> {/* 댓글 섹션 가시성 스타일 */}
                  <CommentSection comicId={comicId} episodeId={episodeId} imageId={image.id} />
                </div>
              )}
            </div>
          );
        })}
      </Slider>
    </div>
  );
}