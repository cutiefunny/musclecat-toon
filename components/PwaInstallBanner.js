// components/PwaInstallBanner.js
'use client';

import { useState, useEffect } from 'react';
import styles from './PwaInstallBanner.module.css';

export default function PwaInstallBanner() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // PWA가 이미 설치되어 독립 실행 모드인지 확인합니다.
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    // 사용자가 배너를 이미 닫았는지 확인합니다.
    const isDismissed = localStorage.getItem('pwaInstallDismissed') === 'true';

    if (isStandalone || isDismissed) {
      return;
    }

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault(); // 기본 설치 프롬프트를 막습니다.
      setInstallPrompt(event);
      setIsVisible(true); // 배너를 표시합니다.
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;

    // 설치 프롬프트를 표시합니다.
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('PWA 설치가 수락되었습니다.');
    } else {
      console.log('PWA 설치가 거부되었습니다.');
    }
    // 프롬프트 이벤트를 초기화하고 배너를 숨깁니다.
    setInstallPrompt(null);
    setIsVisible(false);
  };

  const handleDismissClick = () => {
    // localStorage에 배너를 닫았음을 기록합니다.
    localStorage.setItem('pwaInstallDismissed', 'true');
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className={styles.banner}>
      <div className={styles.bannerContent}>
        <p>앱을 설치하세요! 근육고양이잡화점의 이름을 걸고 이 앱은 무해합니다!</p>
        <div className={styles.buttonGroup}>
          <button onClick={handleInstallClick} className={styles.installButton}>
            앱 설치
          </button>
          <button onClick={handleDismissClick} className={styles.dismissButton}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}