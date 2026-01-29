'use client';
import { useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function GoogleAuthCallbackPage() {
    const searchParams = useSearchParams();
  const router = useRouter();
  const processedRef = useRef(false); // 防止 React StrictMode 下请求两次

  useEffect(() => {
    const code = searchParams.get('code');

    if (code && !processedRef.current) {
      processedRef.current = true;
      
      // 向你的 Express 后端发送 Code
      fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      .then(res => res.json())
      .then(data => {
        console.log('Login response', data);
        if (data.appToken) {
          // 1. 存储业务 Token (用于常规 API)
          localStorage.setItem('snatch_token', data.appToken);
          
          // 2. 【核心】存储 Google id_token (用于 Web3 AA / ZK Proof)
          // 这一步是为了后续生成钱包签名
          sessionStorage.setItem('google_id_token', data.googleIdToken);

          // 3. 跳转到仪表盘
          router.push('/dashboard');
        } else {
            console.error('Login failed', data);
        }
      })
      .catch(err => console.error('Request failed', err));
    }
  }, [searchParams, router]);

  return <div>正在处理登录，请稍候...</div>;
}
