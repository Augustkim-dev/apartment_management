import mysql from 'mysql2/promise';

// MySQL 연결 설정
const config: mysql.PoolOptions = {
  host: process.env.MYSQL_HOST,
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,

  // 연결 풀 설정
  waitForConnections: true,
  connectionLimit: parseInt(process.env.MYSQL_CONNECTION_LIMIT || '5'),
  queueLimit: parseInt(process.env.MYSQL_QUEUE_LIMIT || '0'),
  connectTimeout: parseInt(process.env.MYSQL_CONNECT_TIMEOUT || '60000'),

  // 성능 최적화
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,

  // 프로덕션 최적화
  decimalNumbers: true,
  timezone: '+00:00',
  charset: 'utf8mb4',
};

// SSL 설정 (프로덕션 환경)
if (process.env.NODE_ENV === 'production' && process.env.MYSQL_SSL === 'true') {
  config.ssl = {
    rejectUnauthorized: process.env.MYSQL_SSL_REJECT_UNAUTHORIZED !== 'false',
  };
}

// 연결 풀 싱글톤 패턴
let pool: mysql.Pool | null = null;

function createPool(): mysql.Pool {
  if (!pool) {
    try {
      pool = mysql.createPool(config);

      // 개발 환경에서만 연결 테스트 로그
      if (process.env.NODE_ENV === 'development') {
        console.log('Attempting to connect to MySQL:', {
          host: process.env.MYSQL_HOST,
          port: process.env.MYSQL_PORT,
          database: process.env.MYSQL_DATABASE,
          user: process.env.MYSQL_USER,
        });

        // 연결 테스트
        pool.getConnection()
          .then(connection => {
            console.log('✅ Database connected successfully');
            connection.release();
          })
          .catch(err => {
            console.error('❌ Database connection failed:', err.message);
          });
      }

      // 프로덕션 환경에서는 간단한 로그만
      if (process.env.NODE_ENV === 'production') {
        pool.getConnection()
          .then(connection => {
            connection.release();
            console.log('[DB] Connection pool initialized');
          })
          .catch(err => {
            console.error('[DB] Connection failed:', err.message);
            // 프로덕션에서는 에러를 throw하지 않고 재시도 로직 추가 가능
          });
      }

      // 연결 풀 이벤트 핸들러 (프로덕션 모니터링용)
      pool.on('acquire', function (connection) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[Pool] Connection %d acquired', connection.threadId);
        }
      });

      pool.on('release', function (connection) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[Pool] Connection %d released', connection.threadId);
        }
      });

      pool.on('enqueue', function () {
        if (process.env.NODE_ENV === 'development') {
          console.log('[Pool] Waiting for available connection slot');
        }
      });

    } catch (error) {
      console.error('Failed to create connection pool:', error);
      throw error;
    }
  }

  return pool;
}

// 연결 풀 export
const connectionPool = createPool();

// Graceful shutdown 처리
if (process.env.NODE_ENV === 'production') {
  process.on('SIGTERM', async () => {
    console.log('[DB] SIGTERM signal received: closing MySQL pool');
    if (pool) {
      await pool.end();
      console.log('[DB] MySQL pool closed');
    }
  });

  process.on('SIGINT', async () => {
    console.log('[DB] SIGINT signal received: closing MySQL pool');
    if (pool) {
      await pool.end();
      console.log('[DB] MySQL pool closed');
    }
  });
}

export default connectionPool;