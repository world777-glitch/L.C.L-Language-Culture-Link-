export type CourseCategory = 'Conversation' | 'HSK' | 'Discussion' | 'Business' | 'Culture';

export interface Course {
  id: string;
  category: CourseCategory;
  title: string;
  levels: string[];
  description: string;
}

export const COURSES: Course[] = [
  {
    id: 'conv',
    category: 'Conversation',
    title: '회화 (Conversation)',
    levels: ['입문', '초급', '중급', '고급'],
    description: '일상 생활에서 즉각적으로 활용 가능한 실전 회화 중심 과정'
  },
  {
    id: 'hsk',
    category: 'HSK',
    title: 'HSK (Chinese Proficiency Test)',
    levels: ['1-2급', '3급', '4급', '5급', '6급'],
    description: '중국 언어학 박사의 노하우가 담긴 HSK 고득점 전략 과정'
  },
  {
    id: 'disc',
    category: 'Discussion',
    title: '토론 (Discussion)',
    levels: ['초급', '중급', '고급', '초고급'],
    description: '논리적 스피킹과 비판적 사고를 기르는 심화 토론 과정'
  },
  {
    id: 'biz',
    category: 'Business',
    title: '비즈니스 (Business)',
    levels: ['초급', '중급', '고급', '초고급'],
    description: '실무 회의, 계약, 프레젠테이션 중심의 전문 비즈니스 과정'
  },
  {
    id: 'cult',
    category: 'Culture',
    title: '문화 (Culture)',
    levels: ['Special Session'],
    description: '중국 사회와 문화에 대한 인문학적 심층 연구 과정'
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
  '1-2급': 99000,
  '3급': 99000,
  '4급': 99000,
  '5급': 109000,
  '6급': 119000,
  'Special Session': 129000,
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
  customEventDiscountRate?: number
): PriceResult {
  const basePrice = LEVEL_PRICES[level] || 99000;
  const sessionPrice = basePrice * sessionsPerWeek * (hours / 1);
  const baseTotalPrice = sessionPrice * (weeks / 4);
  
  let eventDiscountRate = isEventPeriod ? (customEventDiscountRate ?? 0.20) : 0;
  let weeksDiscountRate = 0;
  
  if (weeks === 8) weeksDiscountRate = 0.10;
  if (weeks === 12) weeksDiscountRate = 0.15;
  
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
