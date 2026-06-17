export interface GrammarPattern {
  id: string
  pattern: string
  meaning: string
  formality: "casual" | "polite" | "formal"
  examples: {
    korean: string
    romanization: string
    english: string
  }[]
}

export const GRAMMAR_PATTERNS: GrammarPattern[] = [
  {
    id: "gp1",
    pattern: "~입니다 / ~입니까?",
    meaning: "is / is it? (formal polite ending)",
    formality: "formal",
    examples: [
      {
        korean: "개발자입니다",
        romanization: "Gae-bal-ja-im-ni-da",
        english: "I am a developer",
      },
      {
        korean: "이것이 프로젝트입니까?",
        romanization: "I-geos-i peu-ro-jek-teu-im-ni-kka?",
        english: "Is this the project?",
      },
    ],
  },
  {
    id: "gp2",
    pattern: "~해요 / ~하세요",
    meaning: "do / please do (polite)",
    formality: "polite",
    examples: [
      {
        korean: "코딩해요",
        romanization: "Ko-ding-hae-yo",
        english: "I code",
      },
      {
        korean: "앉으세요",
        romanization: "Anj-eu-se-yo",
        english: "Please sit down",
      },
    ],
  },
  {
    id: "gp3",
    pattern: "~고 싶습니다",
    meaning: "I want to~ (formal)",
    formality: "formal",
    examples: [
      {
        korean: "입사하고 싶습니다",
        romanization: "Ip-sa-ha-go sip-seum-ni-da",
        english: "I want to join the company",
      },
      {
        korean: "더 배우고 싶습니다",
        romanization: "Deo bae-u-go sip-seum-ni-da",
        english: "I want to learn more",
      },
    ],
  },
  {
    id: "gp4",
    pattern: "~ㄹ/을 수 있습니다",
    meaning: "can / is able to~ (formal)",
    formality: "formal",
    examples: [
      {
        korean: "영어로 소통할 수 있습니다",
        romanization: "Yeong-eo-ro so-tong-hal su it-seum-ni-da",
        english: "I can communicate in English",
      },
      {
        korean: "이 문제를 해결할 수 있습니다",
        romanization: "I mun-je-reul hae-gyeol-hal su it-seum-ni-da",
        english: "I can solve this problem",
      },
    ],
  },
  {
    id: "gp5",
    pattern: "~았/었습니다",
    meaning: "did / past tense (formal)",
    formality: "formal",
    examples: [
      {
        korean: "프로젝트를 완료했습니다",
        romanization: "Peu-ro-jek-teu-reul wal-lyo-haet-seum-ni-da",
        english: "I completed the project",
      },
      {
        korean: "3년간 일했습니다",
        romanization: "Sam-nyeon-gan il-haet-seum-ni-da",
        english: "I worked for 3 years",
      },
    ],
  },
  {
    id: "gp6",
    pattern: "~겠습니다",
    meaning: "I will~ / intend to~ (formal)",
    formality: "formal",
    examples: [
      {
        korean: "열심히 하겠습니다",
        romanization: "Yeol-sim-hi ha-get-seum-ni-da",
        english: "I will work hard",
      },
      {
        korean: "확인하겠습니다",
        romanization: "Hwak-in-ha-get-seum-ni-da",
        english: "I will check on that",
      },
    ],
  },
  {
    id: "gp7",
    pattern: "~때문에 / ~기 때문에",
    meaning: "because of~ / because~",
    formality: "polite",
    examples: [
      {
        korean: "경험이 있기 때문에 자신 있습니다",
        romanization: "Gyeong-heom-i it-gi ttae-mun-e ja-sin it-seum-ni-da",
        english: "I'm confident because I have experience",
      },
      {
        korean: "관심이 많기 때문에 지원했습니다",
        romanization: "Gwan-sim-i man-ki ttae-mun-e ji-won-haet-seum-ni-da",
        english: "I applied because I'm very interested",
      },
    ],
  },
  {
    id: "gp8",
    pattern: "~(으)면",
    meaning: "if / when~",
    formality: "polite",
    examples: [
      {
        korean: "궁금한 점이 있으면 말씀해 주세요",
        romanization: "Gung-geum-han jeom-i iss-eu-myeon mal-sseum-hae ju-se-yo",
        english: "If you have questions, please let me know",
      },
      {
        korean: "시간이 되면 미팅하겠습니다",
        romanization: "Si-gan-i doe-myeon mi-ting-ha-get-seum-ni-da",
        english: "If there's time, I'll have a meeting",
      },
    ],
  },
  {
    id: "gp9",
    pattern: "~는 것 같습니다",
    meaning: "I think that~ / it seems~ (humble)",
    formality: "formal",
    examples: [
      {
        korean: "좋은 기회인 것 같습니다",
        romanization: "Jo-eun gi-hoe-in geot gat-seum-ni-da",
        english: "I think it's a good opportunity",
      },
      {
        korean: "잘 맞을 것 같습니다",
        romanization: "Jal maj-eul geot gat-seum-ni-da",
        english: "I think it would be a good fit",
      },
    ],
  },
  {
    id: "gp10",
    pattern: "~(으)려고 합니다",
    meaning: "I plan to~ / I'm going to~",
    formality: "formal",
    examples: [
      {
        korean: "한국에서 일하려고 합니다",
        romanization: "Han-gug-e-seo il-ha-ryeo-go ham-ni-da",
        english: "I plan to work in Korea",
      },
      {
        korean: "새로운 기술을 배우려고 합니다",
        romanization: "Sae-ro-un gi-sul-eul bae-u-ryeo-go ham-ni-da",
        english: "I plan to learn new technology",
      },
    ],
  },
  {
    id: "gp11",
    pattern: "~아/어 주세요",
    meaning: "please do~ for me (request)",
    formality: "polite",
    examples: [
      {
        korean: "설명해 주세요",
        romanization: "Seol-myeong-hae ju-se-yo",
        english: "Please explain",
      },
      {
        korean: "기회를 주세요",
        romanization: "Gi-hoe-reul ju-se-yo",
        english: "Please give me a chance",
      },
    ],
  },
  {
    id: "gp12",
    pattern: "~(으)ㄴ 적이 있습니다",
    meaning: "I have experience of~ / I have done~",
    formality: "formal",
    examples: [
      {
        korean: "팀을 리드한 적이 있습니다",
        romanization: "Tim-eul ri-deu-han jeog-i it-seum-ni-da",
        english: "I have experience leading a team",
      },
      {
        korean: "대규모 프로젝트를 한 적이 있습니다",
        romanization: "Dae-gyu-mo peu-ro-jek-teu-reul han jeog-i it-seum-ni-da",
        english: "I have worked on large-scale projects",
      },
    ],
  },
  {
    id: "gp13",
    pattern: "~(으)면서",
    meaning: "while doing~ / at the same time",
    formality: "polite",
    examples: [
      {
        korean: "일하면서 공부했습니다",
        romanization: "Il-ha-myeon-seo gong-bu-haet-seum-ni-da",
        english: "I studied while working",
      },
      {
        korean: "개발하면서 디자인도 합니다",
        romanization: "Gae-bal-ha-myeon-seo di-ja-in-do ham-ni-da",
        english: "I also design while developing",
      },
    ],
  },
  {
    id: "gp14",
    pattern: "~에 대해서",
    meaning: "about~ / regarding~",
    formality: "polite",
    examples: [
      {
        korean: "이 프로젝트에 대해서 설명하겠습니다",
        romanization: "I peu-ro-jek-teu-e dae-hae-seo seol-myeong-ha-get-seum-ni-da",
        english: "I will explain about this project",
      },
      {
        korean: "회사에 대해서 질문이 있습니다",
        romanization: "Hoe-sa-e dae-hae-seo jil-mun-i it-seum-ni-da",
        english: "I have a question about the company",
      },
    ],
  },
  {
    id: "gp15",
    pattern: "~도록 하겠습니다",
    meaning: "I will make sure to~ (strong commitment)",
    formality: "formal",
    examples: [
      {
        korean: "최선을 다하도록 하겠습니다",
        romanization: "Choe-seon-eul da-ha-do-rok ha-get-seum-ni-da",
        english: "I will make sure to do my best",
      },
      {
        korean: "빨리 적응하도록 하겠습니다",
        romanization: "Ppal-li jeok-eung-ha-do-rok ha-get-seum-ni-da",
        english: "I will make sure to adapt quickly",
      },
    ],
  },
]
