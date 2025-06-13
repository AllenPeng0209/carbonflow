import { LoginForm } from '~/components/auth/LoginForm';
import { Typography } from 'antd';
import { AuthProvider } from '~/contexts/AuthContext';

const { Title, Paragraph } = Typography;

// 簡化版的登錄頁面
export default function Login() {
  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        width: '100%',
      }}
    >
      {/* 左侧表单区域 */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '40px',
          background: '#ffffff',
        }}
      >
        <div style={{ width: '100%', maxWidth: 400 }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <img src="/images/logo.png" alt="Climate Seal Logo" style={{ height: '60px' }} />
          </div>

          <AuthProvider>
            <LoginForm />
          </AuthProvider>
        </div>
      </div>

      {/* 右侧品牌信息区域 - 使用视频背景 */}
      <div
        style={{
          flex: 2,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative',
          backgroundColor: 'rgba(0,0,0,0.7)',
        }}
      >
        <video
          autoPlay
          loop
          muted
          playsInline
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 0,
          }}
        >
          <source src="/images/2711134-uhd_3840_2160_24fps.mp4" type="video/mp4" />
        </video>

        {/* 注册页特定内容 */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            color: 'white',
            textAlign: 'center',
            padding: '40px',
            backgroundColor: 'rgba(0,0,0,0.5)',
            borderRadius: '8px',
            maxWidth: '80%',
          }}
        >
          <Title level={2} style={{ color: 'white', marginBottom: '20px' }}>
            行动起来！留给下一代更好的地球
            <br />
            
          </Title>
          
          <div style={{ marginTop: '40px', borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '30px' }}>
            <Paragraph style={{ fontSize: '16px', lineHeight: '1.8', color: 'white' }}>
              » 精准洞察，量化您的碳足迹
            </Paragraph>
            <Paragraph style={{ fontSize: '16px', lineHeight: '1.8', color: 'white' }}>
              » 智能驱动，规划您的减排路径
            </Paragraph>
            <Paragraph style={{ fontSize: '16px', lineHeight: '1.8', color: 'white' }}>
              » 携手并进，共创可持续商业价值
            </Paragraph>
          </div>
        </div>
      </div>
    </div>
  );
}
