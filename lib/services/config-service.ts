import { query } from '@/lib/db-utils';

interface ConfigRecord {
  id: number;
  config_key: string;
  config_value: string;
  config_type: 'string' | 'number' | 'boolean' | 'json' | 'array';
  category: string;
  subcategory?: string;
  display_order: number;
  is_active: boolean;
  is_required: boolean;
  description?: string;
  validation_rules?: any;
  metadata?: any;
}

interface Notice {
  order: number;
  text: string;
  type: 'info' | 'warning' | 'important';
  active: boolean;
}

interface CacheEntry {
  value: any;
  timestamp: number;
}

class ConfigService {
  private static instance: ConfigService;
  private cache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5분

  private constructor() {}

  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  /**
   * 캐시 확인 및 가져오기
   */
  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached) {
      const now = Date.now();
      if (now - cached.timestamp < this.CACHE_TTL) {
        return cached.value;
      } else {
        this.cache.delete(key);
      }
    }
    return null;
  }

  /**
   * 캐시에 저장
   */
  private setCache(key: string, value: any): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  /**
   * 타입에 따른 값 변환
   */
  private convertValue(value: string, type: ConfigRecord['config_type']): any {
    if (!value) return null;

    switch (type) {
      case 'number':
        return Number(value);
      case 'boolean':
        return value.toLowerCase() === 'true' || value === '1';
      case 'json':
      case 'array':
        try {
          return JSON.parse(value);
        } catch (e) {
          console.error(`Failed to parse JSON for value: ${value}`, e);
          return null;
        }
      case 'string':
      default:
        return value;
    }
  }

  /**
   * 템플릿 변수 치환
   * {관리사무소} -> contact.management_phone 값으로 치환
   */
  private async replaceTemplateVariables(text: string): Promise<string> {
    const templateMap: { [key: string]: string } = {
      '{관리사무소}': 'contact.management_phone',
      '{납부일}': 'billing.payment_due_day',
      '{연체시작일}': 'billing.late_fee_start_day',
      '{검침시작}': 'billing.meter_reading_start',
      '{검침종료}': 'billing.meter_reading_end',
      '{건물명}': 'building.name',
      '{계좌번호}': 'payment.account_number',
      '{은행명}': 'payment.bank_name',
      '{예금주}': 'payment.account_holder'
    };

    let result = text;

    for (const [template, configKey] of Object.entries(templateMap)) {
      if (result.includes(template)) {
        const value = await this.get(configKey);
        if (value !== null) {
          result = result.replace(new RegExp(template, 'g'), String(value));
        }
      }
    }

    return result;
  }

  /**
   * 단일 설정값 가져오기
   */
  public async get(key: string): Promise<any> {
    // 캐시 확인
    const cached = this.getFromCache(key);
    if (cached !== null) {
      return cached;
    }

    try {
      const results = await query<ConfigRecord[]>(`
        SELECT * FROM app_configurations
        WHERE config_key = ? AND is_active = true
        LIMIT 1
      `, [key]);

      if (results.length === 0) {
        return null;
      }

      const config = results[0];
      const value = this.convertValue(config.config_value, config.config_type);

      // 캐시에 저장
      this.setCache(key, value);

      return value;
    } catch (error) {
      console.error(`Failed to get config for key: ${key}`, error);
      return null;
    }
  }

  /**
   * 카테고리별 설정값 가져오기
   */
  public async getByCategory(category: string): Promise<{ [key: string]: any }> {
    const cacheKey = `category:${category}`;
    const cached = this.getFromCache(cacheKey);
    if (cached !== null) {
      return cached;
    }

    try {
      const results = await query<ConfigRecord[]>(`
        SELECT * FROM app_configurations
        WHERE category = ? AND is_active = true
        ORDER BY display_order, config_key
      `, [category]);

      const categoryConfig: { [key: string]: any } = {};

      for (const config of results) {
        const key = config.config_key.replace(`${category}.`, '');
        categoryConfig[key] = this.convertValue(config.config_value, config.config_type);
      }

      // 캐시에 저장
      this.setCache(cacheKey, categoryConfig);

      return categoryConfig;
    } catch (error) {
      console.error(`Failed to get configs for category: ${category}`, error);
      return {};
    }
  }

  /**
   * 설정값 저장/업데이트
   */
  public async set(key: string, value: any): Promise<void> {
    try {
      // 기존 설정 확인
      const existing = await query<ConfigRecord[]>(`
        SELECT * FROM app_configurations
        WHERE config_key = ?
        LIMIT 1
      `, [key]);

      let valueStr: string;

      // 값을 문자열로 변환
      if (typeof value === 'object') {
        valueStr = JSON.stringify(value);
      } else {
        valueStr = String(value);
      }

      if (existing.length > 0) {
        // 업데이트
        await query(`
          UPDATE app_configurations
          SET config_value = ?, updated_at = NOW()
          WHERE config_key = ?
        `, [valueStr, key]);
      } else {
        // 새로 추가 (카테고리 추론)
        const category = key.split('.')[0] || 'general';
        await query(`
          INSERT INTO app_configurations (config_key, config_value, category)
          VALUES (?, ?, ?)
        `, [key, valueStr, category]);
      }

      // 캐시 무효화
      this.clearCache();
    } catch (error) {
      console.error(`Failed to set config for key: ${key}`, error);
      throw error;
    }
  }

  /**
   * 여러 설정값 일괄 업데이트
   */
  public async setMultiple(configs: { [key: string]: any }): Promise<void> {
    for (const [key, value] of Object.entries(configs)) {
      await this.set(key, value);
    }
  }

  /**
   * 납부 안내 메시지 가져오기 (템플릿 변수 치환 포함)
   */
  public async getNotices(): Promise<Notice[]> {
    try {
      const noticesJson = await this.get('notices.payment_notices');

      if (!noticesJson || !Array.isArray(noticesJson)) {
        return [];
      }

      // 템플릿 변수 치환
      const processedNotices: Notice[] = [];
      for (const notice of noticesJson) {
        if (notice.active) {
          const processedText = await this.replaceTemplateVariables(notice.text);
          processedNotices.push({
            ...notice,
            text: processedText
          });
        }
      }

      // 순서대로 정렬
      processedNotices.sort((a, b) => a.order - b.order);

      return processedNotices;
    } catch (error) {
      console.error('Failed to get notices', error);
      return [];
    }
  }

  /**
   * 납부 안내 메시지 업데이트
   */
  public async updateNotices(notices: Notice[]): Promise<void> {
    await this.set('notices.payment_notices', notices);
  }

  /**
   * 전체 설정 가져오기
   */
  public async getAll(): Promise<{ [category: string]: { [key: string]: any } }> {
    try {
      const results = await query<ConfigRecord[]>(`
        SELECT * FROM app_configurations
        WHERE is_active = true
        ORDER BY category, display_order, config_key
      `);

      const allConfigs: { [category: string]: { [key: string]: any } } = {};

      for (const config of results) {
        if (!allConfigs[config.category]) {
          allConfigs[config.category] = {};
        }

        const key = config.config_key.replace(`${config.category}.`, '');
        allConfigs[config.category][key] = this.convertValue(
          config.config_value,
          config.config_type
        );
      }

      return allConfigs;
    } catch (error) {
      console.error('Failed to get all configs', error);
      return {};
    }
  }

  /**
   * 캐시 초기화
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * 필수 설정값 검증
   */
  public async validateRequiredConfigs(): Promise<{ valid: boolean; missing: string[] }> {
    try {
      const results = await query<ConfigRecord[]>(`
        SELECT config_key FROM app_configurations
        WHERE is_required = true
      `);

      const missing: string[] = [];

      for (const config of results) {
        const value = await this.get(config.config_key);
        if (value === null || value === undefined || value === '') {
          missing.push(config.config_key);
        }
      }

      return {
        valid: missing.length === 0,
        missing
      };
    } catch (error) {
      console.error('Failed to validate required configs', error);
      return {
        valid: false,
        missing: []
      };
    }
  }

  /**
   * 설정 내보내기 (백업용)
   */
  public async export(): Promise<any> {
    try {
      const results = await query<ConfigRecord[]>(`
        SELECT * FROM app_configurations
        ORDER BY category, display_order, config_key
      `);

      return results.map(config => ({
        key: config.config_key,
        value: this.convertValue(config.config_value, config.config_type),
        type: config.config_type,
        category: config.category,
        description: config.description,
        is_required: config.is_required,
        is_active: config.is_active
      }));
    } catch (error) {
      console.error('Failed to export configs', error);
      return [];
    }
  }

  /**
   * 설정 가져오기 (복원용)
   */
  public async import(configs: any[]): Promise<void> {
    for (const config of configs) {
      await this.set(config.key, config.value);
    }
  }
}

// 싱글톤 인스턴스 내보내기
export const configService = ConfigService.getInstance();

// 타입 내보내기
export type { ConfigRecord, Notice };