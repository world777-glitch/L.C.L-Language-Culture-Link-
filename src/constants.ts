export type CourseCategory = 'Conversation' | 'HSK' | 'Discussion' | 'Business' | 'Culture' | 'Academic';

export interface Course {
  id: string;
  category: CourseCategory;
  title: string;
  levels: string[];
  levelDescriptions?: string[];
  description: string;
}

export const COURSES: Course[] = [
  {
    id: 'conv',
    category: 'Conversation',
    title: '회화 (Conversation)',
    levels: ['입문', '초급', '중급', '고급', '초고급'],
    description: '일상 생활에서 즉각적으로 활용 가능한 실전 회화 중심 과정'
  },
  {
    id: 'hsk-1-6',
    category: 'HSK',
    title: 'HSK 1-6급 (Standard)',
    levels: ['HSK1', 'HSK2', 'HSK3', 'HSK4', 'HSK5', 'HSK6'],
    description: '최신 출제 경향을 반영한 전략적 접근으로 최단기 합격 실현'
  },
  {
    id: 'hsk-7-9',
    category: 'HSK',
    title: 'HSK 7-9급 (Advanced)',
    levels: ['HSK7', 'HSK8', 'HSK9'],
    description: '박사 학위 과정의 학술적 분석력을 바탕으로 한 고등 HSK 완벽 대비'
  },
  {
    id: 'acad',
    category: 'Academic',
    title: '중·고교 내신 및 제2외국어 (School Grades)',
    levels: ['Level 1 (기초)', 'Level 2 (심화)', 'Level 3 (완성)'],
    levelDescriptions: [
      '개념 정리 및 기본적인 문제를 통한 중국어 기초 다지기',
      '기출 문제 빈출 문법 분석과 고난도 응용 문제로 실전 감각 익히기',
      '심화 과정 및 수행평가 완벽 대비로 내신 1등급 굳히기'
    ],
    description: '국제학교 및 일반 중·고교 내신 1등급을 위한 밀착 관리 과정'
  },
  {
    id: 'biz-disc',
    category: 'Business',
    title: '토론 및 비즈니스 (Discussion & Biz)',
    levels: ['초급', '중급', '고급', '초고급'],
    description: '논리적 스피킹과 실무 중심의 전문 비즈니스 솔루션'
  }
];

export interface ResourceCategory {
  id: string;
  name: string;
  description: string;
}

export interface ResourceGroup {
  id: string;
  name: string;
  description: string;
  categories: ResourceCategory[];
}

export const RESOURCE_GROUPS: ResourceGroup[] = [
  {
    id: 'group-a',
    name: '📂 A조: 표준 및 시험 (Standard & Test)',
    description: '가장 수요가 많고 체계적인 학습이 필요한 영역입니다.',
    categories: [
      { id: 'hsk', name: 'HSK', description: '급수별 핵심 요약집, 최신 기출 변형 문제.' },
      { id: 'conversation', name: '회화', description: '박사님이 엄선한 상황별 필수 문장 리스트.' },
      { id: 'daily', name: '일상생활', description: '중국 현지 마트, 병원 등에서 쓰이는 생생한 실전 표현.' },
    ]
  },
  {
    id: 'group-b',
    name: '📂 그룹 B: 전문 및 학술 (Professional & Academic)',
    description: '박사님의 전문성이 가장 돋보이는 고난도 자료실입니다.',
    categories: [
      { id: 'science', name: '과학 및 기술', description: 'IT, AI, 공학 등 전문 분야의 중-한 대역어 및 기술 트렌드 리포트.' },
      { id: 'business', name: '비즈니스', description: '계약서 양식, 이메일 템플릿, 비즈니스 에티켓 가이드.' },
      { id: 'debate', name: '토론', description: '찬반 논쟁이 가능한 시사 이슈 정리 및 핵심 표현.' },
    ]
  },
  {
    id: 'group-c',
    name: '📂 그룹 C: 문화와 트렌드 (Culture & Trends)',
    description: '언어의 맛을 살려주는 흥미로운 연구 자료실입니다.',
    categories: [
      { id: 'culture', name: '문화', description: '박사님이 20년간 관찰한 중국 사회의 심층 분석 칼럼.' },
      { id: 'idioms', name: '사자성어', description: '<이성어(易成語)> 시리즈와 연계된 고사성어 유래 및 활용법.' },
      { id: 'slang', name: '유행어 및 신조어', description: '현지 SNS(샤오홍슈, 웨이보 등)에서 지금 막 터져 나온 최신 용어.' },
    ]
  }
];

export const LEVEL_PRICES: Record<string, number> = {
  '입문': 99000,
  '초급': 99000,
  '중급': 109000,
  '고급': 119000,
  '초고급': 129000,
  'HSK1': 99000,
  'HSK2': 99000,
  'HSK3': 99000,
  'HSK4': 109000,
  'HSK5': 119000,
  'HSK6': 129000,
  'Special Session': 129000,
  'Level 1 (기초)': 109000,
  'Level 2 (심화)': 119000,
  'Level 3 (완성)': 129000,
};

export interface PriceResult {
  originalPrice: number;
  discountedPrice: number;
  isEventDiscount: boolean;
  eventDiscountRate: number;
  weeksDiscountRate: number;
}

export function calculatePrice(
  level: string, 
  weeks: number, 
  sessionsPerWeek: number, 
  hours: number,
  isEventPeriod: boolean = false,
  customEventDiscountRate?: number,
  weeksDiscountRates?: Record<number, number>,
  customLevelPrices?: Record<string, number>
): PriceResult {
  const basePrice = (customLevelPrices && customLevelPrices[level]) || LEVEL_PRICES[level] || 99000;
  const sessionPrice = basePrice * sessionsPerWeek * (hours / 1);
  const baseTotalPrice = sessionPrice * (weeks / 4);
  
  let eventDiscountRate = isEventPeriod ? (customEventDiscountRate ?? 0.20) : 0;
  let weeksDiscountRate = 0;
  
  if (weeksDiscountRates && weeksDiscountRates[weeks] !== undefined) {
    weeksDiscountRate = weeksDiscountRates[weeks];
  } else {
    if (weeks === 8) weeksDiscountRate = 0.10;
    if (weeks === 10) weeksDiscountRate = 0.12;
    if (weeks === 12) weeksDiscountRate = 0.15;
  }
  
  const originalPrice = Math.floor(baseTotalPrice);
  const discountedPrice = Math.floor(baseTotalPrice * (1 - eventDiscountRate) * (1 - weeksDiscountRate));
  
  return {
    originalPrice,
    discountedPrice,
    isEventDiscount: isEventPeriod,
    eventDiscountRate,
    weeksDiscountRate
  };
}
