export type LanguageCode = string;

export interface Language {
  code: LanguageCode;
  name: string;
  nativeName: string;
}

export const LANGUAGES: Language[] = [
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'jv', name: 'Javanese', nativeName: 'Basa Jawa' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی' },
];

export const TRANSLATIONS: Record<LanguageCode, any> = {
  ko: {
    nav: {
      systemName: 'L.C.L Language & Culture Link',
      curriculum: '커리큘럼',
      pricing: '수강료',
      archive: '자료실',
      community: '커뮤니티',
      inquiry: '수강 문의',
      aiStudio: 'AI 스튜디오',
      admin: '관리자',
      post: '게시',
      myPage: '마이페이지',
      login: '로그인',
    },
    footer: {
      quote: '"박사의 깊이를 더한 프리미엄 중국어, 이제 커피 한 잔 값으로 시작하세요."',
      contact: '연락처',
      social: '소셜',
      rights: '© 2026 Language & Culture Link. All rights reserved.',
      tagline: 'Excellence in Language & Culture',
    },
    hero: {
      badge: '언어학 박사의 깊이',
      title: '박사의 깊이를 더한 프리미엄 중국어',
      subtitle: '20년 현지 경력과 언어학적 분석력이 만나면 외국어 학습의 차원이 달라집니다.',
      cta: '코스 탐색하기',
    },
    archive: {
      title: '지식 라이브러리',
      subtitle: '언어학 박사의 20년 연구 데이터가 담긴 아카이브입니다.',
      search: '자료 검색...',
      all: '전체',
      download: '다운로드',
      access: {
        public: '공개',
        member: '회원',
        premium: '프리미엄',
      }
    },
    curriculum: {
      badge: '커리큘럼',
      title: 'L.C.L 프리미엄 커리큘럼',
      subtitle: '중국 언어학 박사의 전문성과 20년 현지 내공 및 교학 경력 15년+ 이 담긴 5대 핵심 카테고리입니다.',
      bookNow: '예약하기',
    },
    pricing: {
      badge: '수강료 정책',
      title: '합리적인 프리미엄',
      subtitle: '12주는 언어학적으로 실질적인 변화가 일어나는 상징적인 기간입니다. 장기 수강 시 파격적인 할인 혜택을 제공합니다.',
      weeks: '주 패키지',
      bestValue: '최고의 가치 (15% 할인)',
      startingFrom: '시작 가격 (입문 레벨, 주 1회 기준)',
      features: [
        '박사급 커리큘럼 마스터',
        '개별 학습 피드백 제공',
        '강의 자료 무상 제공',
        '장기 수강 할인 적용',
      ],
      selectPlan: '플랜 선택',
    },
    testimonial: {
      quote: '"4주만 경험해 보셔도 좋습니다. 하지만 12주 후의 당신은 완전히 다른 세계를 보게 될 것입니다."',
      author: '이박사',
      authorTitle: '언어학 박사, 20년 현지 경력',
    },
    community: {
      title: '커뮤니티',
      subtitle: '학습 질문이나 자료 요청을 자유롭게 남겨주세요.',
      newPost: '새 글 작성',
      inquiry: '학습 문의',
      request: '자료 요청',
      titleLabel: '제목',
      contentLabel: '내용',
      submit: '등록하기',
      cancel: '취소',
      loginRequired: '로그인이 필요합니다.',
      noPosts: '등록된 게시글이 없습니다.',
      loading: '로딩 중...',
      answered: '답변 완료',
      replyTitle: '이박사의 답변',
    },
    courses: [
      { id: 'conv', title: '회화 (Conversation)', description: '일상 생활에서 즉각적으로 활용 가능한 실전 회화 중심 과정', levels: ['입문', '초급', '중급', '고급', '초고급'] },
      { id: 'hsk', title: 'HSK (Chinese Proficiency Test)', description: '중국 언어학 박사의 노하우가 담긴 HSK 고득점 전략 과정', levels: ['HSK1', 'HSK2', 'HSK3', 'HSK4', 'HSK5', 'HSK6'] },
      { id: 'disc', title: '토론 (Discussion)', description: '논리적 스피킹과 비판적 사고를 기르는 심화 토론 과정', levels: ['초급', '중급', '고급', '초고급'] },
      { id: 'biz', title: '비즈니스 (Business)', description: '실무 회의, 계약, 프레젠테이션 중심의 전문 비즈니스 과정', levels: ['초급', '중급', '고급', '초고급'] },
      { id: 'cult', title: '문화 (Culture)', description: '중국 사회와 문화에 대한 인문학적 심층 연구 과정', levels: ['Special Session'] }
    ],
    resourceGroups: [
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
    ],
    admin: {
      title: '관리자 제어판',
      reservations: '예약 관리',
      resources: '자료 관리',
      community: '커뮤니티 관리',
      users: '회원 관리',
      stats: '통계',
      upload: '자료 업로드',
      list: '자료 목록',
      seed: '샘플 자료 생성',
      feedback: '학습 피드백 작성',
      reply: '답변 작성',
      totalDownloads: '총 다운로드',
      activeStudents: '활성 수강생',
      totalResources: '총 자료 수',
      recentDownloads: '최근 다운로드 기록',
    },
    globalStyle: {
      title: '글로벌 스타일',
      colors: '색상',
      paper: '배경색 (Paper)',
      ink: '글자색 (Ink)',
      gold: '포인트색 (Gold)',
      backgrounds: '배경 이미지',
      landingBg: '랜딩 페이지 배경 URL',
      landingOverlay: '랜딩 오버레이 투명도',
      allPagesBg: '전체 페이지 배경 URL',
      serifFont: '세리프 폰트 (명조체)',
      sansFont: '산세리프 폰트 (고딕체)',
      reset: '기본값으로 초기화',
    },
    aiStudio: {
      title: 'AI 학습 자료 생성',
      subtitle: '학습하고 싶은 상황이나 단어를 입력하면 AI가 시각 자료와 맞춤형 학습 콘텐츠를 생성해 드립니다.',
      placeholder: '학습 상황을 입력하세요...',
      generate: '생성하기',
      generating: '생성 중...',
      visualContext: '시각적 문맥',
      learningContent: '학습 콘텐츠',
      audioReady: '음원 준비 완료',
      generatingAudio: '음원 생성 중...',
      timerGenerating: '생성 중',
      timerCompleted: '완료 시간',
      example: '(예: "중국 상하이의 현대적인 카페에서 주문하는 상황")',
      error: '자료 생성 중 오류가 발생했습니다.',
      level: '학습 레벨',
      levels: {
        intro: '입문',
        beginner: '초급',
        intermediate: '중급',
        advanced: '고급',
        expert: '초고급',
      }
    },
    inquiry: {
      title: '[라떼언어연구소] 수강 문의 및 레벨 진단 신청서',
      subtitle: '"응용언어학 박사 이 쌤이 직접 분석하여 가장 적합한 그룹을 매칭해 드립니다."',
      badge: '상담 및 진단 (Consultation & Diagnosis)',
      nameLabel: '1. 성함 (Name)',
      namePlaceholder: '(예: 홍길동)',
      contactLabel: '2. 연락처 (연락 가능한 카톡 ID 또는 이메일)',
      contactPlaceholder: '상담 안내를 받으실 수 있는 연락처를 남겨주세요.',
      historyLabel: '3. 중국어 학습 이력 및 현지 경험 (History)',
      historyPlaceholder: '학습 기간이나 중국 거주/유학 경험이 있다면 간단히 적어주세요. (예: 독학 1년, 상하이 유학 6개월 등)',
      levelLabel: '4. 현재 레벨 및 학습 고민 (Level & Concerns)',
      levelOptions: [
        '기초 문법의 원리를 체계적으로 정리하고 싶다.',
        'HSK 급수(4~6급) 취득 및 고득점이 목표다.',
        '원어민처럼 자연스러운 회회 표현을 익히고 싶다.',
        '비즈니스/전문 분야(IT, 기술 등) 중국어가 필요하다.',
        '기타 (직접 입력)'
      ],
      goalsLabel: '5. 구체적인 학습 목표 (Specific Goals)',
      goalsPlaceholder: '예: 3개월 내 HSK 5급 취득, 비즈니스 미팅 가능 수준 등',
      classLabel: '6. 희망 수업 과정 (Desired Course)',
      classOptions: [
        '회화 (Conversation)',
        'HSK (Chinese Proficiency Test)',
        '토론 (Discussion)',
        '비즈니스 (Business)',
        '문화 (Culture)',
        '소수 그룹반',
        '기타 (직접 입력)'
      ],
      scheduleLabel: '7. 희망 수업 시간대 (Preferred Schedule)',
      requestsLabel: '8. 기타 요청 사항 (Additional Requests)',
      requestsPlaceholder: '수업 방식, 교재, 특별히 집중하고 싶은 부분 등',
      submit: '신청 완료 (Confirm)',
      successTitle: '신청 완료!',
      successMessage: '신청이 완료되었습니다. 박사님께서 직접 분석 후 곧 연락드릴 예정입니다.'
    }
  },
  en: {
    nav: {
      systemName: 'L.C.L Language & Culture Link',
      curriculum: 'Curriculum',
      pricing: 'Pricing',
      archive: 'Archive',
      community: 'Community',
      inquiry: 'Inquiry',
      aiStudio: 'AI Studio',
      admin: 'Admin',
      post: 'Post',
      myPage: 'My Page',
      login: 'Login',
    },
    inquiry: {
      title: '[L.C.L] Course Inquiry & Level Diagnosis',
      subtitle: 'Dr. Lee, a PhD in Applied Linguistics, will analyze and match you with the best group.',
      badge: 'Consultation & Diagnosis',
      nameLabel: '1. Name',
      namePlaceholder: '(e.g., John Doe)',
      contactLabel: '2. Contact (KakaoTalk ID or Email)',
      contactPlaceholder: 'Please leave a contact where you can receive consultation guidance.',
      historyLabel: '3. Chinese Learning History & Local Experience',
      historyPlaceholder: 'Briefly describe your learning period or experience living/studying in China. (e.g., 1 year self-study, 6 months in Shanghai, etc.)',
      levelLabel: '4. Current Level & Concerns',
      levelOptions: [
        'I want to systematically organize basic grammar principles.',
        'My goal is to obtain HSK level (4-6) and high scores.',
        'I want to learn natural conversation expressions like a native speaker.',
        'I need Chinese for business/professional fields (IT, technology, etc.).',
        'Other (Enter directly)'
      ],
      goalsLabel: '5. Specific Learning Goals',
      goalsPlaceholder: 'e.g., Obtain HSK 5 within 3 months, reach business meeting level, etc.',
      classLabel: '6. Desired Course',
      classOptions: [
        'Conversation',
        'HSK (Chinese Proficiency Test)',
        'Discussion',
        'Business',
        'Culture',
        'Small Group Class',
        'Other (Enter directly)'
      ],
      scheduleLabel: '7. Preferred Schedule',
      requestsLabel: '8. Additional Requests',
      requestsPlaceholder: 'Teaching style, materials, specific areas to focus on, etc.',
      submit: 'Apply for Diagnosis',
      successTitle: 'Application Complete!',
      successMessage: 'Your application has been submitted. Dr. Lee will contact you soon after analysis.'
    },
    footer: {
      quote: '"Premium Chinese with academic depth, starting at the price of a cup of coffee."',
      contact: 'Contact',
      social: 'Social',
      rights: '© 2026 Language & Culture Link. All rights reserved.',
      tagline: 'Excellence in Language & Culture',
    },
    hero: {
      badge: 'PhD in Chinese Linguistics',
      title: 'Premium Chinese with Academic Depth',
      subtitle: 'When 20 years of local experience meets linguistic analysis, language learning reaches a new dimension.',
      cta: 'Explore Courses',
    },
    archive: {
      title: 'Knowledge Library',
      subtitle: 'An archive containing 20 years of research data from a PhD in linguistics.',
      search: 'Search resources...',
      all: 'All',
      download: 'Download',
      access: {
        public: 'Public',
        member: 'Member',
        premium: 'Premium',
      }
    },
    curriculum: {
      badge: 'Curriculum',
      title: 'L.C.L Premium Curriculum',
      subtitle: '5 core categories containing the expertise of a PhD in Chinese linguistics and 20 years of local experience.',
      bookNow: 'Book Now',
    },
    pricing: {
      badge: 'Pricing Policy',
      title: 'Reasonable Premium',
      subtitle: '12 weeks is a symbolic period where linguistically substantial changes occur. We offer significant discounts for long-term enrollment.',
      weeks: 'Weeks Package',
      bestValue: 'Best Value (15% Off)',
      startingFrom: 'Starting from (Intro Level, 1hr/week)',
      features: [
        'PhD-level Curriculum Mastery',
        'Individual Learning Feedback',
        'Free Lecture Materials',
        'Long-term Enrollment Discount',
      ],
      selectPlan: 'Select Plan',
    },
    testimonial: {
      quote: '"Experience it for just 4 weeks. But after 12 weeks, you will see a completely different world."',
      author: 'Dr. Lee',
      authorTitle: 'PhD in Chinese Linguistics, 20 Years Experience',
    },
    community: {
      title: 'Community',
      subtitle: 'Feel free to leave learning questions or resource requests.',
      newPost: 'New Post',
      inquiry: 'Learning Inquiry',
      request: 'Resource Request',
      titleLabel: 'Title',
      contentLabel: 'Content',
      submit: 'Submit',
      cancel: 'Cancel',
      loginRequired: 'Login is required.',
      noPosts: 'No posts found.',
      loading: 'Loading...',
      answered: 'Answered',
      replyTitle: "Dr. Lee's Reply",
    },
    courses: [
      { id: 'conv', title: 'Conversation', description: 'Practical conversation-oriented course for immediate use in daily life', levels: ['Intro', 'Beginner', 'Intermediate', 'Advanced', 'Expert'] },
      { id: 'hsk', title: 'HSK (Chinese Proficiency Test)', description: 'HSK high-score strategy course with PhD know-how', levels: ['HSK1', 'HSK2', 'HSK3', 'HSK4', 'HSK5', 'HSK6'] },
      { id: 'disc', title: 'Discussion', description: 'Advanced discussion course to develop logical speaking and critical thinking', levels: ['Beginner', 'Intermediate', 'Advanced', 'Expert'] },
      { id: 'biz', title: 'Business', description: 'Professional business course focused on meetings, contracts, and presentations', levels: ['Beginner', 'Intermediate', 'Advanced', 'Expert'] },
      { id: 'cult', title: 'Culture', description: 'In-depth humanities research course on Chinese society and culture', levels: ['Special Session'] }
    ],
    resourceGroups: [
      {
        id: 'group-a',
        name: '📂 Group A: Standard & Test',
        description: 'Areas with the highest demand and systematic learning needs.',
        categories: [
          { id: 'hsk', name: 'HSK', description: 'Key summaries by level, latest exam variations.' },
          { id: 'conversation', name: 'Conversation', description: 'Essential sentence lists for various situations.' },
          { id: 'daily', name: 'Daily Life', description: 'Real-life expressions used in local markets, hospitals, etc.' },
        ]
      },
      {
        id: 'group-b',
        name: '📂 Group B: Professional & Academic',
        description: 'High-difficulty resource room showcasing PhD expertise.',
        categories: [
          { id: 'science', name: 'Science & Tech', description: 'Technical terminology and trend reports in IT, AI, engineering, etc.' },
          { id: 'business', name: 'Business', description: 'Contract forms, email templates, business etiquette guides.' },
          { id: 'debate', name: 'Debate', description: 'Current issue summaries and key expressions for debate.' },
        ]
      },
      {
        id: 'group-c',
        name: '📂 Group C: Culture & Trends',
        description: 'Interesting research room that brings out the flavor of language.',
        categories: [
          { id: 'culture', name: 'Culture', description: 'In-depth analysis columns on Chinese society observed for 20 years.' },
          { id: 'idioms', name: 'Idioms', description: 'Origins and usage of idioms linked to the <Easy Idioms> series.' },
          { id: 'slang', name: 'Slang & Trends', description: 'Latest terms just popped up on local SNS (Xiaohongshu, Weibo, etc.).' },
        ]
      }
    ],
    admin: {
      title: 'Admin Control Panel',
      reservations: 'Reservations',
      resources: 'Resources',
      community: 'Community',
      users: 'Users',
      stats: 'Stats',
      upload: 'Upload Resource',
      list: 'Resource List',
      seed: 'Seed Sample Data',
      feedback: 'Write Feedback',
      reply: 'Write Reply',
      totalDownloads: 'Total Downloads',
      activeStudents: 'Active Students',
      totalResources: 'Total Resources',
      recentDownloads: 'Recent Downloads',
    },
    globalStyle: {
      title: 'Global Styles',
      colors: 'Colors',
      paper: 'Paper',
      ink: 'Ink',
      gold: 'Gold',
      backgrounds: 'Backgrounds',
      landingBg: 'Landing Page Background URL',
      landingOverlay: 'Landing Overlay Opacity',
      allPagesBg: 'All Pages Background URL',
      serifFont: 'Serif Font',
      sansFont: 'Sans Font',
      reset: 'Reset to Default',
    },
    aiStudio: {
      title: 'AI Learning Material Generation',
      subtitle: 'Enter a situation or words you want to learn, and AI will generate visual materials and customized learning content.',
      placeholder: 'Enter learning situation...',
      generate: 'Generate',
      generating: 'Generating...',
      visualContext: 'Visual Context',
      learningContent: 'Learning Content',
      audioReady: 'Audio Ready',
      generatingAudio: 'Generating Audio...',
      timerGenerating: 'GENERATING',
      timerCompleted: 'COMPLETED IN',
      example: '(e.g., "Ordering at a modern cafe in Shanghai, China")',
      error: 'An error occurred during material generation.',
      level: 'Learning Level',
      levels: {
        intro: 'Introductory',
        beginner: 'Beginner',
        intermediate: 'Intermediate',
        advanced: 'Advanced',
        expert: 'Super Advanced',
      }
    }
  },
  zh: {
    nav: {
      systemName: 'L.C.L Language & Culture Link',
      curriculum: '课程体系',
      pricing: '学费',
      archive: '资料库',
      community: '社区',
      aiStudio: 'AI 工作室',
      admin: '管理员',
      myPage: '个人中心',
      login: '登录',
    },
    inquiry: {
      title: '[L.C.L] 课程咨询与水平诊断申请表',
      subtitle: '应用语言学博士李老师将直接分析并为您匹配最合适的课程。',
      badge: '咨询与诊断',
      nameLabel: '1. 姓名',
      namePlaceholder: '(例：张三)',
      contactLabel: '2. 联系方式 (KakaoTalk ID 或 邮箱)',
      contactPlaceholder: '请留下可以接收咨询指导的联系方式。',
      historyLabel: '3. 汉语学习经历及当地经验',
      historyPlaceholder: '请简要说明学习时间或在中国居住/留学的经历。(例：自学1年，上海留学6个月等)',
      levelLabel: '4. 目前的汉语水平及困扰',
      levelOptions: [
        '想系统地整理基础语法原理。',
        '目标是取得 HSK 等级(4-6级)及高分。',
        '想学习像母语者一样自然的会话表达。',
        '需要商务/专业领域(IT、技术等)汉语。',
        '其他 (直接输入)'
      ],
      classLabel: '5. 希望参加的课程',
      classOptions: [
        '会话 (Conversation)',
        'HSK (Chinese Proficiency Test)',
        '讨论 (Discussion)',
        '商务 (Business)',
        '文化 (Culture)',
        '小班课 (Small Group)',
        '其他 (直接输入)'
      ],
      submit: '申请诊断',
      successTitle: '申请完成！',
      successMessage: '申请已提交。李老师将在分析后尽快与您联系。'
    },
    curriculum: {
      badge: '课程体系',
      title: 'L.C.L 优质课程',
      subtitle: '包含语言学博士的专业性、20年当地经验及15年以上教学经验的5大核心类别。',
      bookNow: '立即预约',
    },
    pricing: {
      badge: '学费政策',
      title: '合理的优质服务',
      subtitle: '12周是语言学上发生实质性变化的象征性期间。长期报名可享受大幅折扣。',
      weeks: '周套餐',
      bestValue: '最佳价值 (15% 折扣)',
      startingFrom: '起步价 (入门级，每周1次)',
      features: [
        '博士级课程体系',
        '提供个人学习反馈',
        '免费提供教学资料',
        '适用长期报名折扣',
      ],
    },
    footer: {
      quote: '"富有学术深度的优质中文课程，仅需一杯咖啡的价格即可开始。"',
      contact: '联系方式',
      social: '社交媒体',
      rights: '© 2026 Language & Culture Link. 版权所有.',
      tagline: '卓越的语言与文化',
    },
    hero: {
      badge: '语言学博士的深度',
      title: '富有学术深度的优质中文课程',
      subtitle: '当20年的当地经验与语言学分析相结合，语言学习将进入一个新的维度。',
      cta: '探索课程',
    },
    archive: {
      title: '知识库',
      subtitle: '包含语言学博士20年研究数据的档案。',
      search: '搜索资源...',
      all: '全部',
      download: '下载',
      access: {
        public: '公开',
        member: '会员',
        premium: '高级',
      }
    },
    community: {
      title: '社区',
      subtitle: '欢迎随时留下学习问题或资料请求。',
      newPost: '发布新帖',
      inquiry: '学习咨询',
      request: '资料请求',
      titleLabel: '标题',
      contentLabel: '内容',
      submit: '提交',
      cancel: '取消',
      loginRequired: '需要登录。',
      noPosts: '未找到帖子。',
      loading: '加载中...',
      answered: '已回答',
      replyTitle: '李博士的回答',
    },
    courses: [
      { id: 'conv', title: '会话 (Conversation)', description: '日常生活中可立即使用的实战会话中心课程', levels: ['入门', '初级', '中级', '高级', '特级'] },
      { id: 'hsk', title: 'HSK (Chinese Proficiency Test)', description: '包含语言学博士秘诀的 HSK 高分策略课程', levels: ['HSK1', 'HSK2', 'HSK3', 'HSK4', 'HSK5', 'HSK6'] },
      { id: 'disc', title: '讨论 (Discussion)', description: '培养逻辑表达和批判性思维的深度讨论课程', levels: ['初级', '中级', '高级', '特级'] },
      { id: 'biz', title: '商务 (Business)', description: '以实务会议、合同、演示为中心的专业商务课程', levels: ['初级', '中级', '高级', '特级'] },
      { id: 'cult', title: '文化 (Culture)', description: '对中国社会与文化的人文深度研究课程', levels: ['Special Session'] }
    ],
    resourceGroups: [
      {
        id: 'group-a',
        name: '📂 A组：标准与考试 (Standard & Test)',
        description: '需求最大且需要系统学习的领域。',
        categories: [
          { id: 'hsk', name: 'HSK', description: '各级别核心摘要，最新真题变型。' },
          { id: 'conversation', name: '会话', description: '博士精选的各场景必备句型。' },
          { id: 'daily', name: '日常生活', description: '中国当地超市、医院等实用的实战表达。' },
        ]
      },
      {
        id: 'group-b',
        name: '📂 B组：专业与学术 (Professional & Academic)',
        description: '展现博士专业性的高难度资料室。',
        categories: [
          { id: 'science', name: '科学与技术', description: 'IT、AI、工程等专业领域的对译词及技术趋势报告。' },
          { id: 'business', name: '商务', description: '合同模板、邮件模板、商务礼仪指南。' },
          { id: 'debate', name: '讨论', description: '有时事争议的议题整理及核心表达。' },
        ]
      },
      {
        id: 'group-c',
        name: '📂 C组：文化与趋势 (Culture & Trends)',
        description: '提升语言趣味性的深度研究资料室。',
        categories: [
          { id: 'culture', name: '文化', description: '博士20年观察到的中国社会深度分析专栏。' },
          { id: 'idioms', name: '成语', description: '与《易成语》系列相关的成语典故及用法。' },
          { id: 'slang', name: '流行语与新词', description: '当地社交媒体（小红书、微博等）最新鲜的用语。' },
        ]
      }
    ],
    admin: {
      title: '管理员控制面板',
      reservations: '预约管理',
      resources: '资料管理',
      community: '社区管理',
      users: '用户管理',
      stats: '统计',
      upload: '上传资料',
      list: '资料列表',
      seed: '生成样本数据',
      feedback: '编写学习反馈',
      reply: '编写回复',
      totalDownloads: '总下载量',
      activeStudents: '活跃学员',
      totalResources: '总资料数',
      recentDownloads: '最近下载记录',
    },
    globalStyle: {
      title: '全局样式',
      colors: '颜色',
      paper: '背景色 (Paper)',
      ink: '文字色 (Ink)',
      gold: '主题色 (Gold)',
      backgrounds: '背景图片',
      landingBg: '着陆页背景 URL',
      landingOverlay: '着陆页叠加层透明度',
      allPagesBg: '所有页面背景 URL',
      serifFont: '衬线字体',
      sansFont: '无衬线字体',
      reset: '重置为默认',
    },
    aiStudio: {
      title: 'AI 学习资料生成',
      subtitle: '输入您想学习的情境或单词，AI 将生成视觉资料和定制的学习内容。',
      placeholder: '输入学习情境...',
      generate: '生成',
      generating: '生成中...',
      visualContext: '视觉背景',
      learningContent: '学习内容',
      audioReady: '音频已就绪',
      generatingAudio: '正在生成音频...',
      timerGenerating: '正在生成',
      timerCompleted: '生成耗时',
      example: '(例如："在中国上海的一家现代咖啡馆点餐")',
      error: '资料生成过程中发生错误。',
      level: '学习级别',
      levels: {
        intro: '入门',
        beginner: '初级',
        intermediate: '中级',
        advanced: '高级',
        expert: '特级',
      }
    }
  },
  ja: {
    nav: {
      systemName: 'L.C.L Language & Culture Link',
      curriculum: 'カリキュラム',
      pricing: '受講料',
      archive: '資料室',
      community: 'コミュニティ',
      aiStudio: 'AIスタジオ',
      admin: '管理者',
      myPage: 'マイページ',
      login: 'ログイン',
    },
    inquiry: {
      title: '[L.C.L] 受講相談およびレベル診断申請書',
      subtitle: '応用言語学博士の李先生が直接分析し、最適なカリキュラムをマッチングします。',
      badge: '相談・診断',
      nameLabel: '1. お名前',
      namePlaceholder: '(例: 山田太郎)',
      contactLabel: '2. 連絡先 (KakaoTalk ID または メール)',
      contactPlaceholder: '相談案内を受け取れる連絡先を残してください。',
      historyLabel: '3. 中国語学習歴および現地経験',
      historyPlaceholder: '学習期間や中国居住・留学経験を簡単に記入してください。(例: 独学1年、上海留学6ヶ月など)',
      levelLabel: '4. 現在の中国語の実力と悩み',
      levelOptions: [
        '基礎文法の原理を体系的に整理したい。',
        'HSK級(4-6級)の取得および高得点が目標。',
        'ネイティブのような自然な会話表現を学びたい。',
        'ビジネス・専門分野(IT、技术など)の中国語が必要。',
        'その他 (直接入力)'
      ],
      classLabel: '5. 受講を希望するコース',
      classOptions: [
        '会話 (Conversation)',
        'HSK (Chinese Proficiency Test)',
        '討論 (Discussion)',
        'ビジネス (Business)',
        '文化 (Culture)',
        '少人数グループ (Small Group)',
        'その他 (直接入力)'
      ],
      submit: '診断を申し込む',
      successTitle: '申し込み完了！',
      successMessage: '申し込みが完了しました。李博士が分析後、すぐにご連絡いたします。'
    },
    curriculum: {
      badge: 'カリキュラム',
      title: 'L.C.L プレミアムカリキュラム',
      subtitle: '言語学博士の専門性と20年の現地経験、そして15年以上の教授経験が詰まった5つの核心カテゴリーです。',
      bookNow: '予約する',
    },
    pricing: {
      badge: '受講料ポリシー',
      title: '合理的なプレミアム',
      subtitle: '12週間は言語学的に実質的な変化が起こる象徴的な期間です。長期受講時には大幅な割引特典を提供します。',
      weeks: '週パッケージ',
      bestValue: 'ベストバリュー (15% 割引)',
      startingFrom: '開始価格 (入門レベル、週1回基準)',
      features: [
        '博士級カリキュラムマスター',
        '個別学習フィードバック提供',
        '講義資料の無償提供',
        '長期受講割引適用',
      ],
    },
    footer: {
      quote: '"博士の深みを加えたプレミアム中国語、コーヒー1杯の価格から始めましょう。"',
      contact: 'お問い合わせ',
      social: 'ソーシャル',
      rights: '© 2026 Language & Culture Link. All rights reserved.',
      tagline: 'Excellence in Language & Culture',
    },
    hero: {
      badge: '言語学博士の深み',
      title: '博士の深みを加えたプレミアム中国語',
      subtitle: '20年の現地経験と言語学的分析力が融合し、外国語学習の次元が変わります.',
      cta: 'コースを探す',
    },
    archive: {
      title: 'ナレッジライブラリ',
      subtitle: '言語学博士の20年にわたる研究データが収められたアーカイブです。',
      search: '資料を検索...',
      all: 'すべて',
      download: 'ダウンロード',
      access: {
        public: '公開',
        member: '会員',
        premium: 'プレミアム',
      }
    },
    community: {
      title: 'コミュニティ',
      subtitle: '学習に関する質問や資料のリクエストを自由に残してください。',
      newPost: '新規投稿',
      inquiry: '学習相談',
      request: '資料リクエスト',
      titleLabel: 'タイトル',
      contentLabel: '内容',
      submit: '送信',
      cancel: 'キャンセル',
      loginRequired: 'ログインが必要です。',
      noPosts: '投稿が見つかりません。',
      loading: '読み込み中...',
      answered: '回答済み',
      replyTitle: '李博士의 답변',
    },
    courses: [
      { id: 'conv', title: '会話 (Conversation)', description: '日常生活ですぐに活用可能な実戦会話中心のコース', levels: ['入門', '初級', '中級', '上級', '最上級'] },
      { id: 'hsk', title: 'HSK (Chinese Proficiency Test)', description: '言語学博士のノウハウが詰まったHSK高得点戦略コース', levels: ['HSK1', 'HSK2', 'HSK3', 'HSK4', 'HSK5', 'HSK6'] },
      { id: 'disc', title: '討論 (Discussion)', description: '論理的なスピーキングと批判的思考を養う深化討論コース', levels: ['初級', '中級', '上級', '最上級'] },
      { id: 'biz', title: 'ビジネス (Business)', description: '実務会議、契約、プレゼンテーション中心の専門ビジネスコース', levels: ['初級', '中級', '上級', '最上級'] },
      { id: 'cult', title: '文化 (Culture)', description: '中国社会と文化に関する人文学的な深層研究コース', levels: ['Special Session'] }
    ],
    resourceGroups: [
      {
        id: 'group-a',
        name: '📂 A組: 標準および試験 (Standard & Test)',
        description: '最も需要が多く、体系的な学習が必要な領域です。',
        categories: [
          { id: 'hsk', name: 'HSK', description: '級別核心要約集、最新の過去問変形問題。' },
          { id: 'conversation', name: '会話', description: '博士が厳選した状況別必須文章リスト。' },
          { id: 'daily', name: '日常生活', description: '中国現地のスーパー、病院などで使われる生きた実戦表現。' },
        ]
      },
      {
        id: 'group-b',
        name: '📂 グループ B: 専門および学術 (Professional & Academic)',
        description: '博士の専門性が最も際立つ高難度資料室です。',
        categories: [
          { id: 'science', name: '科学および技術', description: 'IT、AI、工学など専門分野の中・韓対訳語および技術トレンドレポート。' },
          { id: 'business', name: 'ビジネス', description: '契約書様式、メールテンプレート、ビジネスエチケットガイド。' },
          { id: 'debate', name: '討論', description: '賛否両論がある時事問題の整理と核心表現。' },
        ]
      },
      {
        id: 'group-c',
        name: '📂 グループ C: 文化とトレンド (Culture & Trends)',
        description: '言語の味を活かしてくれる興味深い研究資料室です。',
        categories: [
          { id: 'culture', name: '文化', description: '博士が20年間観察した中国社会の深層分析コラム。' },
          { id: 'idioms', name: '四字熟語', description: '「易成語」シリーズと連携した故事成語の由来と活用法。' },
          { id: 'slang', name: '流行語および新造語', description: '現地SNS（小紅書、微博など）で今まさに話題の最新用語。' },
        ]
      }
    ],
    admin: {
      title: '管理者コントロールパネル',
      reservations: '予約管理',
      resources: '資料管理',
      community: 'コミュニティ管理',
      users: 'ユーザー管理',
      stats: '統計',
      upload: '資料アップロード',
      list: '資料リスト',
      seed: 'サンプルデータ生成',
      feedback: '学習フィードバック作成',
      reply: '返信作成',
      totalDownloads: '総ダウンロード数',
      activeStudents: 'アクティブ受講生',
      totalResources: '総資料数',
      recentDownloads: '最近のダウンロード履歴',
    },
    globalStyle: {
      title: 'グローバルスタイル',
      colors: 'カラー',
      paper: '背景色 (Paper)',
      ink: '文字色 (Ink)',
      gold: 'ポイントカラー (Gold)',
      backgrounds: '背景画像',
      landingBg: 'ラン딩ページ背景 URL',
      landingOverlay: 'ラン딩オーバーレイ不透明度',
      allPagesBg: '全ページ背景 URL',
      serifFont: 'セリフ体',
      sansFont: 'サンセリフ体',
      reset: 'デフォルトに戻す',
    },
    aiStudio: {
      title: 'AI 学習資料生成',
      subtitle: '学習したい状況や単語を入力すると、AIが視覚資料とカスタマイ즈された学習コンテンツを生成します。',
      placeholder: '学習状況を入力してください...',
      generate: '生成',
      generating: '生成中...',
      visualContext: '視覚的コンテキスト',
      learningContent: '学習コンテンツ',
      audioReady: '音声準備完了',
      generatingAudio: '音声を生成中...',
      timerGenerating: '生成中',
      timerCompleted: '完了時間',
      example: '（例：「中国・上海のモダンなカフェで注文하는 상황」）',
      error: '資料の生成中にエラーが発生しました。',
      level: '学習レベル',
      levels: {
        intro: '入門',
        beginner: '初級',
        intermediate: '中級',
        advanced: '上級',
        expert: '最上級',
      }
    }
  }
};

// Deep merge function to ensure all languages have the same structure as English
const deepMerge = (target: any, source: any) => {
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!target[key]) target[key] = {};
      deepMerge(target[key], source[key]);
    } else if (target[key] === undefined) {
      target[key] = source[key];
    }
  }
  return target;
};

// Fallback to English for other languages and fill missing keys
LANGUAGES.forEach(lang => {
  if (!TRANSLATIONS[lang.code]) {
    TRANSLATIONS[lang.code] = JSON.parse(JSON.stringify(TRANSLATIONS.en));
  } else {
    deepMerge(TRANSLATIONS[lang.code], TRANSLATIONS.en);
  }
});
