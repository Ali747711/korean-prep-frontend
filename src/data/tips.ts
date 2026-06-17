export interface Tip {
  korean: string
  romanization: string
  english: string
}

/** Rotating motivational interview tips — keyed off the day so it's stable per day. */
export const TIPS: Tip[] = [
  {
    korean: "천천히, 또박또박 말하세요",
    romanization: "Cheon-cheon-hi, tto-bak-tto-bak mal-ha-se-yo",
    english: "Speak slowly and clearly — clarity beats speed in an interview.",
  },
  {
    korean: "존댓말을 일관되게 사용하세요",
    romanization: "Jon-daet-mal-eul il-gwan-doe-ge sa-yong-ha-se-yo",
    english:
      "Stay consistent with polite speech (존댓말) throughout the whole interview.",
  },
  {
    korean: "구체적인 예시로 답하세요",
    romanization: "Gu-che-jeo-gin ye-si-ro dap-ha-se-yo",
    english:
      "Answer with concrete examples from real projects, not vague statements.",
  },
  {
    korean: "끝에 질문을 준비하세요",
    romanization: "Kkeut-e jil-mun-eul jun-bi-ha-se-yo",
    english:
      "Prepare a thoughtful question to ask at the end — it shows genuine interest.",
  },
  {
    korean: "자신감 있게, 하지만 겸손하게",
    romanization: "Ja-sin-gam it-ge, ha-ji-man gyeom-son-ha-ge",
    english:
      "Be confident but humble — Korean interviews value balanced self-presentation.",
  },
  {
    korean: "매일 소리 내서 연습하세요",
    romanization: "Mae-il so-ri nae-seo yeon-seup-ha-se-yo",
    english:
      "Practice out loud every day — reading silently won't build speaking muscle.",
  },
  {
    korean: "모르면 정직하게 말하세요",
    romanization: "Mo-reu-myeon jeong-jik-ha-ge mal-ha-se-yo",
    english:
      "If you don't know, say so honestly — Koreans respect honesty over bluffing.",
  },
  {
    korean: "인사는 깊이 하세요",
    romanization: "In-sa-neun gip-i ha-se-yo",
    english:
      "Bow properly when greeting — a respectful bow makes a strong first impression.",
  },
  {
    korean: "숫자도 한국어로 말해 보세요",
    romanization: "Sut-ja-do han-gug-eo-ro mal-hae bo-se-yo",
    english:
      "Try saying numbers in Korean too — it shows you're committed to the language.",
  },
  {
    korean: "실수해도 괜찮아요, 계속 말하세요",
    romanization: "Sil-su-hae-do gwaen-chan-a-yo, gye-sok mal-ha-se-yo",
    english:
      "Mistakes are okay — keep talking. Fluency comes from momentum, not perfection.",
  },
  {
    korean: "한국 드라마로 듣기 연습하세요",
    romanization: "Han-guk deu-ra-ma-ro deut-gi yeon-seup-ha-se-yo",
    english:
      "Watch Korean dramas for listening practice — absorb natural speech rhythms.",
  },
  {
    korean: "식사 예절을 알아두세요",
    romanization: "Sik-sa ye-jeol-eul al-a-du-se-yo",
    english:
      "Learn dining etiquette — team lunches are common after interviews in Korea.",
  },
  {
    korean: "감사 표현을 자주 하세요",
    romanization: "Gam-sa pyo-hyeon-eul ja-ju ha-se-yo",
    english:
      "Express gratitude often — 감사합니다 goes a long way in Korean culture.",
  },
  {
    korean: "한글을 읽는 연습을 하세요",
    romanization: "Han-geul-eul ing-neun yeon-seup-eul ha-se-yo",
    english:
      "Practice reading Hangul — even basic reading skill shows dedication.",
  },
  {
    korean: "회사에 대해 미리 조사하세요",
    romanization: "Hoe-sa-e dae-hae mi-ri jo-sa-ha-se-yo",
    english:
      "Research the company beforehand — mentioning specifics impresses interviewers.",
  },
]

export function getTipOfTheDay(): Tip {
  const dayIndex = Math.floor(Date.now() / 86_400_000) % TIPS.length
  return TIPS[dayIndex]
}
