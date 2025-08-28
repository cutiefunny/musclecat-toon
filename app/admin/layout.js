// app/admin/layout.js
'use client';

import { useState, useEffect } from 'react';
import { auth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from '../../lib/firebase/clientApp';
import styles from './layout.module.css';

// 💡 관리자 이메일을 상수로 정의합니다.
const ADMIN_EMAIL = "cutiefunny@gmail.com";

export default function AdminLayout({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // Firebase 인증 상태 변경을 감지하는 리스너를 등록합니다.
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // 로그인된 사용자의 이메일이 관리자 이메일과 일치하는지 확인합니다.
        if (currentUser.email === ADMIN_EMAIL) {
          setIsAuthorized(true);
        } else {
          setIsAuthorized(false);
        }
      } else {
        setUser(null);
        setIsAuthorized(false);
      }
      setLoading(false);
    });

    // 컴포넌트가 언마운트될 때 리스너를 정리합니다.
    return () => unsubscribe();
  }, []);

  // 구글 로그인 팝업을 띄우는 함수입니다.
  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Google 로그인 실패:", error);
      alert("로그인에 실패했습니다. 콘솔을 확인해주세요.");
    }
  };

  // 로그아웃 함수입니다.
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("로그아웃 실패:", error);
    }
  };

  // 인증 상태를 확인하는 동안 로딩 화면을 보여줍니다.
  if (loading) {
    return (
      <div className={styles.container}>
        <p>인증 상태를 확인하는 중...</p>
      </div>
    );
  }

  // 로그인되지 않은 사용자에게는 로그인 버튼을 보여줍니다.
  if (!user) {
    return (
      <div className={styles.container}>
        <h1>관리자 페이지</h1>
        <p>콘텐츠를 관리하려면 Google 계정으로 로그인하세요.</p>
        <button onClick={handleGoogleLogin} className={styles.loginButton}>
          Google 계정으로 로그인
        </button>
      </div>
    );
  }

  // 로그인했지만 권한이 없는 사용자에게는 접근 거부 메시지를 보여줍니다.
  if (!isAuthorized) {
    return (
      <div className={styles.container}>
        <h1>접근 거부</h1>
        <p>이 페이지에 접근할 권한이 없습니다.</p>
        <p><strong>로그인된 계정:</strong> {user.email}</p>
        <button onClick={handleLogout} className={styles.logoutButton}>
          다른 계정으로 로그인
        </button>
      </div>
    );
  }

  // 인증 및 인가가 완료된 관리자에게만 실제 페이지 내용을 보여줍니다.
  return (
    <div>
      <header className={styles.adminHeader}>
        <span>관리자: {user.email}</span>
        <button onClick={handleLogout} className={styles.logoutButton}>
          로그아웃
        </button>
      </header>
      <main>{children}</main>
    </div>
  );
}
