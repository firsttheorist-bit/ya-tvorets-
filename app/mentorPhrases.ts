// app/mentorPhrases.ts
// Stable API (object-params only)

// ---------- Types ----------
export type AppLanguage = 'ua' | 'en';
export type AppGender = 'neutral' | 'male' | 'female';
export type MentorId = 'lev' | 'lana' | 'bro' | 'katana';

export type TraitKey =
  | 'focus'
  | 'calm'
  | 'confidence'
  | 'discipline'
  | 'creativity'
  | 'empathy';

export type MentorMode = 'neutral' | 'support' | 'push';

export type JournalMood = 'low' | 'neutral' | 'high';

// ---------- Helpers ----------
function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function safeName(lang: AppLanguage, name?: string): string {
  const t = (name ?? '').trim();
  if (t.length > 0) return t;
  return lang === 'ua' ? 'Творець' : 'Creator';
}

// ---------- Trait labels ----------
const TRAIT_LABELS_UA: Record<TraitKey, string> = {
  focus: 'фокус',
  calm: 'спокій',
  confidence: 'впевненість',
  discipline: 'дисципліну',
  creativity: 'креативність',
  empathy: 'емпатію',
};

const TRAIT_LABELS_EN: Record<TraitKey, string> = {
  focus: 'focus',
  calm: 'calm',
  confidence: 'confidence',
  discipline: 'discipline',
  creativity: 'creativity',
  empathy: 'empathy',
};

function traitLabel(trait: TraitKey, lang: AppLanguage): string {
  return lang === 'ua' ? TRAIT_LABELS_UA[trait] : TRAIT_LABELS_EN[trait];
}

// ---------- Mentor mode ----------
export function computeMentorMode(params: {
  streak: number;
  lastSuccessDate: string | null;
}): MentorMode {
  const { streak, lastSuccessDate } = params;
  const today = todayIso();
  const yesterday = yesterdayIso();

  if (streak >= 3 && lastSuccessDate === today) return 'push';
  if (!lastSuccessDate) return 'support';
  if (lastSuccessDate !== today && lastSuccessDate !== yesterday) return 'support';
  return 'neutral';
}

// ---------- 🌅 MORNING ENTRY ----------
export function getMorningEntryLine(params: {
  mentor: MentorId;
  lang: AppLanguage;
  growth: TraitKey | null;
  mode: MentorMode;
  gender?: AppGender;
  name?: string;
}): string {
  const { mentor, lang, growth, mode } = params;
  void params.gender;

  const name = safeName(lang, params.name);

  const gUa = growth ? ` у ${TRAIT_LABELS_UA[growth]}` : '';
  const gEn = growth ? ` in ${TRAIT_LABELS_EN[growth]}` : '';

  if (lang === 'ua') {
    const packs: Record<MentorId, string[]> = {
      lev: [
        `Лев: ${name}, стартуємо з однієї точної дії${gUa}.`,
        `Лев: ${name}, сьогодні — одна дія до кінця. Без шуму.`,
      ],
      lana: [
        `Лана: ${name}, м’який старт. Один теплий крок${gUa} — і досить.`,
        `Лана: ${name}, почни з турботи: маленький крок і далі по відчуттях.`,
      ],
      bro: [
        `Bro: ${name}, включайся. Один рух${gUa} — і день вже не нуль.`,
        `Bro: ${name}, без розгону: зроби 1 штуку. Все.`,
      ],
      katana: [
        `Катана: ${name}, відріж зайве. Одна точна дія${gUa}.`,
        `Катана: ${name}, чистий старт: одна дія, одна лінія.`,
      ],
    };

    const extra =
      mode === 'push'
        ? ' Можна трохи більше, але без хаосу.'
        : mode === 'support'
        ? ' Якщо важко — зменш крок, не скасовуй рух.'
        : '';

    return rand(packs[mentor]) + extra;
  }

  const packs: Record<MentorId, string[]> = {
    lev: [
      `Lev: ${name}, start with one precise action${gEn}.`,
      `Lev: ${name}, one action to completion. No noise.`,
    ],
    lana: [
      `Lana: ${name}, a gentle start. One caring step${gEn} is enough.`,
      `Lana: ${name}, begin with care: a small step, then follow the feeling.`,
    ],
    bro: [
      `Bro: ${name}, switch on. One move${gEn} and the day is not zero.`,
      `Bro: ${name}, no warm-up: do 1 thing. That’s it.`,
    ],
    katana: [
      `Katana: ${name}, cut the noise. One precise action${gEn}.`,
      `Katana: ${name}, clean start: one action, one line.`,
    ],
  };

  const extra =
    mode === 'push'
      ? ' You can do a bit more — without chaos.'
      : mode === 'support'
      ? ' If it’s hard, shrink the step — keep the motion.'
      : '';

  return rand(packs[mentor]) + extra;
}

export function getMorningEntryHint(params: { lang: AppLanguage }): string {
  return params.lang === 'ua'
    ? '30 секунд. Просто познач старт — і вибери 1 маленький крок.'
    : '30 seconds. Mark the start, then pick 1 small step.';
}

// ---------- 🌙 EVENING REFLECTION QUESTION ----------
export function getEveningReflectionQuestion(params: {
  mentor: MentorId;
  lang: AppLanguage;
  growth: TraitKey | null;
}): string {
  const { lang, growth } = params;
  void params.mentor;

  if (lang === 'ua') {
    const base = [
      'Що сьогодні було трохи краще, ніж учора?',
      'Де ти сьогодні не зник(ла), навіть якщо було важко?',
      'Який маленький крок варто просто зарахувати?',
    ];

    const growthTail = growth
      ? [
          `Що було одним чесним кроком у напрямку ${TRAIT_LABELS_UA[growth]}?`,
          `Як сьогодні проявився твій фокус на ${TRAIT_LABELS_UA[growth]}?`,
        ]
      : [];

    return rand([...base, ...growthTail]);
  }

  const base = [
    'What was slightly better today than yesterday?',
    'Where did you not disappear today, even if it was hard?',
    'Which small step is worth counting?',
  ];

  const growthTail = growth
    ? [
        `What was one honest step toward ${TRAIT_LABELS_EN[growth]}?`,
        `How did your ${TRAIT_LABELS_EN[growth]} show up today?`,
      ]
    : [];

  return rand([...base, ...growthTail]);
}

// ---------- 🌙 EVENING MENTOR LINE ----------
export function getEveningReflectionMentorLine(params: {
  mentor: MentorId;
  lang: AppLanguage;
  growth: TraitKey | null;
  gender: AppGender;
  name: string;
}): string {
  const { lang } = params;
  void params.mentor;
  void params.growth;
  void params.gender;

  const who = safeName(lang, params.name);

  if (lang === 'ua') {
    return `${who}, день зафіксовано. Не ідеально — але чесно. Це і є рух.`;
  }
  return `${who}, day closed. Not perfect — but honest. That is movement.`;
}

export function getEveningQuietCloseLine(params: {
  mentor: MentorId;
  lang: AppLanguage;
  growth: TraitKey | null;
  gender?: AppGender;
  name?: string;
}): string {
  const { mentor, lang, growth } = params;
  void params.gender;

  const name = safeName(lang, params.name);

  if (lang === 'ua') {
    const tail = growth ? ` Завтра повернемося до ${TRAIT_LABELS_UA[growth]}.` : ' Завтра продовжимо.';
    if (mentor === 'lev') return `Лев: ${name}, день можна закрити без слів. Ти тут.${tail}`;
    if (mentor === 'lana') return `Лана: ${name}, тиша теж форма турботи. Я з тобою.${tail}`;
    if (mentor === 'bro') return `Bro: ${name}, окей, без тексту. Головне — ти не зник.${tail}`;
    return `Катана: ${name}, закрий день чисто. Без шуму.${tail}`;
  }

  const tail = growth ? ` Tomorrow we return to ${TRAIT_LABELS_EN[growth]}.` : ' Tomorrow we continue.';
  if (mentor === 'lev') return `Lev: ${name}, you can close the day without words. You are here.${tail}`;
  if (mentor === 'lana') return `Lana: ${name}, silence can be care too. I am with you.${tail}`;
  if (mentor === 'bro') return `Bro: ${name}, okay, no text. The point is: you did not disappear.${tail}`;
  return `Katana: ${name}, close the day cleanly. No noise.${tail}`;
}

// ---------- Daily mentor line ----------
export function getDailyMentorLine(params: {
  mentor: MentorId;
  lang: AppLanguage;
  growth: TraitKey | null;
  mode: MentorMode;
  gender?: AppGender;
  name?: string;
}): string {
  const { mentor, lang } = params;
  void params.growth;
  void params.mode;
  void params.gender;

  const name = safeName(lang, params.name);

  if (lang === 'ua') {
    if (mentor === 'lev') return `Лев: ${name}, система сильніша за настрій. Один крок — і достатньо.`;
    if (mentor === 'lana') return `Лана: ${name}, будь мʼяким(ою) до себе. Один крок — вже турбота.`;
    if (mentor === 'bro') return `Bro: ${name}, коротко — зроби щось одне.`;
    return `Катана: ${name}, точність важливіша за кількість.`;
  }

  if (mentor === 'lev') return `Lev: ${name}, systems beat moods. One step is enough.`;
  if (mentor === 'lana') return `Lana: ${name}, be gentle. One step already counts.`;
  if (mentor === 'bro') return `Bro: ${name}, short — do one thing.`;
  return `Katana: ${name}, precision over quantity.`;
}

// ---------- Journal mood line ----------
export function getJournalMoodLine(params: {
  mentor: MentorId;
  lang: AppLanguage;
  mood: JournalMood;
  gender?: AppGender;
  name?: string;
}): string {
  const { mentor, lang, mood } = params;
  void params.gender;

  const name = safeName(lang, params.name);

  if (lang === 'ua') {
    if (mood === 'low') return `${mentor}: ${name}, важкий день — теж частина шляху.`;
    if (mood === 'neutral') return `${mentor}: ${name}, стабільність народжується з повторів.`;
    return `${mentor}: ${name}, зафіксуй цей стан.`;
  }

  if (mood === 'low') return `${mentor}: ${name}, hard days are part of the path.`;
  if (mood === 'neutral') return `${mentor}: ${name}, stability comes from repetition.`;
  return `${mentor}: ${name}, lock this state.`;
}

// ---------- Challenges header ----------
export function getChallengesHeaderLine(params: {
  mentor: MentorId;
  lang: AppLanguage;
  growth: TraitKey | null;
  gender?: AppGender;
  name?: string;
}): string {
  const { mentor, lang, growth } = params;
  void params.gender;
  void params.name;

  if (lang === 'ua') {
    if (growth) return `${mentor}: один крок у ${TRAIT_LABELS_UA[growth]}.`;
    return `${mentor}: обери одну дію і зроби її.`;
  }

  if (growth) return `${mentor}: one step in ${TRAIT_LABELS_EN[growth]}.`;
  return `${mentor}: choose one action and do it.`;
}

// ---------- Challenge mentor line (success/skip) ----------
export function getChallengeMentorLine(params: {
  mentor: MentorId;
  lang: AppLanguage;
  trait: TraitKey | null;
  succeeded: boolean;
  gender?: AppGender;
  name?: string;
}): string {
  const { mentor, lang, trait, succeeded } = params;
  void params.gender;
  void params.name;

  const tUa = trait ? TRAIT_LABELS_UA[trait] : 'обрану рису';
  const tEn = trait ? TRAIT_LABELS_EN[trait] : 'the chosen trait';

  if (lang === 'ua') {
    if (succeeded) {
      if (mentor === 'lev') return `Лев: крок зараховано. Тримай курс у ${tUa}.`;
      if (mentor === 'lana') return `Лана: дбайливо і чесно. Закріплюємо прогрес у ${tUa}.`;
      if (mentor === 'bro') return `Bro: done. Плюс один крок у ${tUa}.`;
      return `Катана: точність збережено. Структура міцнішає у ${tUa}.`;
    }

    if (mentor === 'lev') return 'Лев: “не сьогодні” — теж стратегія. Завтра повернемося.';
    if (mentor === 'lana') return 'Лана: твій стан важливіший за чекбокс. Без провини.';
    if (mentor === 'bro') return 'Bro: окей, пропустили. Головне — не зливати весь день.';
    return 'Катана: чітке “ні” інколи економить сили. Повернемося.';
  }

  if (succeeded) {
    if (mentor === 'lev') return `Lev: step registered. Keep course in ${tEn}.`;
    if (mentor === 'lana') return `Lana: caring and honest. Lock progress in ${tEn}.`;
    if (mentor === 'bro') return `Bro: done. One step in ${tEn}.`;
    return `Katana: precision preserved. Structure strengthens in ${tEn}.`;
  }

  if (mentor === 'lev') return 'Lev: “not today” is strategy. We return tomorrow.';
  if (mentor === 'lana') return 'Lana: your state matters more than a checkbox. No guilt.';
  if (mentor === 'bro') return 'Bro: okay, skipped. Just do not flush the whole day.';
  return 'Katana: a clear “no” can save energy. Return later.';
}

// ---------- NEW: Mentor memory line ----------
export type MentorMemory = {
  date: string; // YYYY-MM-DD (usually yesterday)
  goal: string;
  xpEarned: number;
  hasAnyAction: boolean;
  closedAs: 'evening' | 'bad_day';
  mentor: MentorId;
  mode: MentorMode;
  growth: TraitKey | null;
};

export function getMentorMemoryLine(params: {
  mentor: MentorId; // current mentor (voice)
  lang: AppLanguage;
  memory: MentorMemory;
}): string {
  const { mentor, lang, memory } = params;

  const goal = (memory.goal ?? '').trim();
  const xp = Math.max(0, Math.floor(Number(memory.xpEarned) || 0));
  const growthPart =
    memory.growth ? (lang === 'ua' ? `Фокус: ${traitLabel(memory.growth, 'ua')}.` : `Focus: ${traitLabel(memory.growth, 'en')}.`) : '';

  if (lang === 'ua') {
    const head = 'Вчора:';
    const g = goal.length ? `Ціль: “${goal}”.` : 'Ціль: —';
    const act = memory.hasAnyAction ? 'Був хоча б один крок — це рахується.' : 'Міг бути нуль дій — але день не загублено.';
    const close = memory.closedAs === 'bad_day' ? 'Важкий день теж можна пройти.' : 'Закривати день — теж навичка.';

    // Голос наставника (интонация)
    if (mentor === 'katana') {
      const tone = memory.mode === 'push' ? 'Сьогодні — коротко і чітко.' : memory.mode === 'support' ? 'Зменш крок. Збережи рух.' : 'Одна дія. Без шуму.';
      return `${head} ${g}\n+${xp} XP. ${growthPart}\n${act} ${close}\nКатана: ${tone}`;
    }
    if (mentor === 'bro') {
      const tone = memory.mode === 'push' ? 'Ти в формі. Додавай +1.' : memory.mode === 'support' ? 'Мінімум — теж результат.' : 'Просто зроби один рух.';
      return `${head} ${g}\n+${xp} XP. ${growthPart}\n${act} ${close}\nBro: ${tone}`;
    }
    if (mentor === 'lana') {
      const tone = memory.mode === 'push' ? 'Ти тримаєш ритм. Мʼяко додай 1%.' : memory.mode === 'support' ? 'Без провини. Малий крок — достатньо.' : 'Один чесний крок — і досить.';
      return `${head} ${g}\n+${xp} XP. ${growthPart}\n${act} ${close}\nЛана: ${tone}`;
    }

    // lev default
    const tone = memory.mode === 'push' ? 'Ритм формується. Тримай курс.' : memory.mode === 'support' ? 'Зменш крок, не скасовуй рух.' : 'Одна дія до кінця.';
    return `${head} ${g}\n+${xp} XP. ${growthPart}\n${act} ${close}\nЛев: ${tone}`;
  }

  const head = 'Yesterday:';
  const g = goal.length ? `Intention: “${goal}”.` : 'Intention: —';
  const act = memory.hasAnyAction ? 'At least one step happened — it counts.' : 'Maybe zero actions — but the day was not lost.';
  const close = memory.closedAs === 'bad_day' ? 'A hard day can still be carried through.' : 'Closing a day is a skill too.';

  if (mentor === 'katana') {
    const tone = memory.mode === 'push' ? 'Brief and precise today.' : memory.mode === 'support' ? 'Shrink the step. Keep motion.' : 'One action. No noise.';
    return `${head} ${g}\n+${xp} XP. ${growthPart}\n${act} ${close}\nKatana: ${tone}`;
  }
  if (mentor === 'bro') {
    const tone = memory.mode === 'push' ? 'You are in shape. Add +1.' : memory.mode === 'support' ? 'Minimum is still a result.' : 'Just do one move.';
    return `${head} ${g}\n+${xp} XP. ${growthPart}\n${act} ${close}\nBro: ${tone}`;
  }
  if (mentor === 'lana') {
    const tone = memory.mode === 'push' ? 'Your rhythm is there. Add 1% gently.' : memory.mode === 'support' ? 'No guilt. Small step is enough.' : 'One honest step is enough.';
    return `${head} ${g}\n+${xp} XP. ${growthPart}\n${act} ${close}\nLana: ${tone}`;
  }

  const tone = memory.mode === 'push' ? 'Rhythm is forming. Keep course.' : memory.mode === 'support' ? 'Shrink the step, keep the motion.' : 'One action to completion.';
  return `${head} ${g}\n+${xp} XP. ${growthPart}\n${act} ${close}\nLev: ${tone}`;
}
