import { NextResponse } from 'next/server';
import { configService } from '@/lib/services/config-service';

export async function GET() {
  try {
    console.log('Testing ConfigService...');

    // 1. 단일 설정값 테스트
    const buildingName = await configService.get('building.name');
    console.log('Building name:', buildingName);

    // 2. 카테고리별 설정값 테스트
    const paymentConfig = await configService.getByCategory('payment');
    console.log('Payment config:', paymentConfig);

    // 3. 납부 안내 메시지 테스트 (템플릿 변수 치환 포함)
    const notices = await configService.getNotices();
    console.log('Notices with template replacement:', notices);

    // 4. 필수 설정값 검증
    const validation = await configService.validateRequiredConfigs();
    console.log('Required configs validation:', validation);

    // 5. 전체 설정 가져오기
    const allConfigs = await configService.getAll();

    return NextResponse.json({
      success: true,
      data: {
        single_value_test: {
          building_name: buildingName
        },
        category_test: {
          payment: paymentConfig
        },
        notices_test: notices,
        validation: validation,
        all_configs: allConfigs
      }
    });
  } catch (error) {
    console.error('Config test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}