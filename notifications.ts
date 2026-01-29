// app/notifications.ts (обновлённый «стаб» без expo-notifications)

import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATION_ID_KEY = '@ya_tvorets_daily_notification_id';
const NOTIFICATION_TIME_KEY = '@ya_tvorets_daily_notification_time';
const NOTIFICATION_META_KEY = '@ya_tvorets_daily_notification_meta';

export type AppLanguage = 'ua' | 'en';
export type MentorId = 'lev' | 'lana' | 'bro' | 'katana';

export interface DailyReminderInfo {
  enabled: boolean;
  hour: number | null;
  minute: number | null;
}

// Набор коротких "цитат" для кожного наставника
const MENTOR_QUOTES: Record<
  MentorId,
  { ua: string[]; en: string[] }
> = {
  lev: {
    ua: [
      'Система сильніша за настрій. Одна маленька дія — цеглинка в систему.',
      'Не потрібно ідеального дня. Потрібен один чесний крок сьогодні.',
      'Твоя увага — головний ресурс. Віддай їй хоч 5 хвилин зараз.',
      'Якщо складно — зменшити крок, а не скасувати рух.',
      'Коли не знаєш, що робити, зроби найпростіший наступний крок.',
      'Не вимірюй себе чужими результатами. Твоя гра — між тобою вчора і сьогодні.',
      'Ритм будується з повернень, а не з ідеальних днів.',
      'Помилка — це не провал, а дані для наступного кроку.',
      'Ти маєш право почати знову стільки разів, скільки потрібно.',
      'Важливо не те, скільки разів ти падав, а скільки разів встав.',
      'Краще один реальний крок, ніж десять планів у голові.',
      'Стабільність народжується з дрібних повторюваних дій.',
      'Твоя система може бути простою. Головне — щоб вона була живою.',
      'Зроби сьогоднішній день хоч на 1% більш усвідомленим, ніж учора.',
    ],
    en: [
      'Systems are stronger than moods. One small action is a brick in the system.',
      'You do not need a perfect day. You need one honest step today.',
      'Your attention is the main resource. Give it at least 5 minutes now.',
      'If it feels hard, shrink the step, not the whole journey.',
      'When you do not know what to do, take the simplest next step.',
      'Do not measure yourself by others. Your game is between you yesterday and you today.',
      'Rhythm is built from returns, not from perfect days.',
      'A mistake is not a failure, it is data for the next step.',
      'You have the right to start again as many times as you need.',
      'What matters is not how many times you fell, but how many times you got back up.',
      'One real step is better than ten plans in your head.',
      'Stability is born from small repeated actions.',
      'Your system can be simple. What matters is that it is alive.',
      'Make today at least 1% more conscious than yesterday.',
    ],
  },
  lana: {
    ua: [
      'Мʼякість до себе не проти дисципліни. Вона робить дисципліну живою.',
      'Ти можеш рухатися повільно і все одно залишатися у грі.',
      'Одна турботлива дія до себе сьогодні змінює тон усього дня.',
      'Не обовʼязково тягнути все. Важливо не кинути себе.',
      'Ти маєш право на відпочинок так само, як і на розвиток.',
      'Навіть коли ти робиш паузу, це теж частина шляху, якщо вона усвідомлена.',
      'Спробуй сьогодні бути до себе трохи добрішим, ніж учора.',
      'Твої почуття — це не помилка, а сигнал, що з тобою щось важливе відбувається.',
      'Ти можеш бути втомленим(ою) і все одно гідним(ою) поваги.',
      'Не знецінюй дрібні кроки — саме з них складається нове життя.',
      'Якщо не виходить ідеально — це все одно твій шлях, а не чийсь сценарій.',
      'Ти не зобовʼязаний(а) бути “сильним(ою)” весь час, щоб рухатися вперед.',
      'Будь обережним з внутрішнім критиком — він часто говорить голосом чужих очікувань.',
      'Ти вже робиш більше, ніж думаєш. Просто ти до цього звик(ла).',
    ],
    en: [
      'Softness towards yourself does not oppose discipline. It makes discipline alive.',
      'You can move slowly and still stay in the game.',
      'One caring action toward yourself today changes the tone of the whole day.',
      'You do not have to carry everything. What matters is not to abandon yourself.',
      'You have the right to rest just as much as to grow.',
      'Even when you pause, it is still part of the path if it is conscious.',
      'Try being a bit kinder to yourself today than you were yesterday.',
      'Your feelings are not a bug, they are a signal that something important is happening inside you.',
      'You can be tired and still deserving of respect.',
      'Do not devalue small steps — they are what your new life is built from.',
      'If it is not perfect, it is still your path, not someone else’s script.',
      'You do not have to be “strong” all the time to move forward.',
      'Be careful with your inner critic — it often speaks with the voice of others’ expectations.',
      'You are already doing more than you think. You just got used to it.',
    ],
  },
  bro: {
    ua: [
      'Голова, по нулям залишитися — це теж вибір. Одна дія — і вже не нуль.',
      'Не обовʼязково “тащити день”. Достатньо не здатися самому собі.',
      'Ти не зламаний(а), ти просто в процесі апдейту.',
      'Маленький крок > великий самокоп. Серйозно.',
      'Давай чесно: 3 хвилини дії краще, ніж 30 хвилин прокрутки.',
      'Ти можеш бути в лайні й все одно зробити один рух уперед.',
      'Не чекай мотивації. Зроби рух — мотивація підтягнеться.',
      'Сьогодні не обовʼязково бути героєм. Бути чесним із собою — вже нормально.',
      'Якщо мозок розказує, що ти “нічого не можеш” — покажи йому одну виконану дрібницю.',
      'Перфекціонізм — це часто просто красиво упакований страх.',
      'Навіть якщо день розвалився, ти все ще можеш зібрати один маленький фрагмент.',
      'Твої думки можуть нити скільки завгодно, але рішення все одно за тобою.',
      'Половина проблем — не реальність, а те, як ти себе накручуєш.',
      'Якщо вже й “зливатися”, то хоча б чесно собі це скажи. Але краще зроби мінікрок.',
    ],
    en: [
      'Hey, staying at zero is also a choice. One action — and you are not at zero anymore.',
      'You do not have to “crush the day”. Just do not give up on yourself.',
      'You are not broken, you are just in an update process.',
      'Small step > big overthinking. Seriously.',
      'Let’s be honest: 3 minutes of action beat 30 minutes of scrolling.',
      'You can feel like crap and still make one move forward.',
      'Do not wait for motivation. Move first — motivation will catch up.',
      'You do not need to be a hero today. Being honest with yourself is already solid.',
      'If your mind says “you cannot do anything”, show it one completed tiny task.',
      'Perfectionism is often just fear in a nice package.',
      'Even if the day fell apart, you can still pick up one small piece.',
      'Your thoughts can complain all they want, but the decision is still yours.',
      'Half of the problem is not reality, it is how you twist it in your head.',
      'If you plan to give up, at least admit it honestly to yourself. Or better, take one micro-step.',
    ],
  },
  katana: {
    ua: [
      'Точність сильніша за хаос. Обери одну дію замість десяти думок.',
      'План без руху — це мрія. Одна конкретна дія робить його реальністю.',
      'Якщо не знаєш, з чого почати — почни з найменшого точного кроку.',
      'Відріж усе зайве сьогодні: одну задачу, один шум, одну відмовку.',
      'Чітка межа “так” і “ні” — теж інструмент архітектора.',
      'Твоя сила не в швидкості, а в послідовності точних дій.',
      'Сконцентруйся на тому, що можеш вплинути протягом наступних 10 хвилин.',
      'Невизначеність скорочується не думками, а діями.',
      'Коли все виглядає заплутано, знайди одну нитку та потягни за неї.',
      'Відкидай те, що не рухає тебе вперед, навіть якщо це красиво звучить.',
      'Не всі цілі твої. Відфільтруй навʼязані — стане легше дихати.',
      'Дисципліна — це не тюрма, а спосіб захистити свій фокус.',
      'Точний “ні” сьогодні економить десятки “чому я це зробив(ла)?” завтра.',
      'Не розмазуй дію на цілий день. Зроби її коротко й чітко.',
    ],
    en: [
      'Precision is stronger than chaos. Choose one action instead of ten thoughts.',
      'A plan without movement is just a dream. One concrete action makes it real.',
      'If you do not know where to start, start with the smallest precise step.',
      'Cut off the excess today: one task, one source of noise, one excuse.',
      'A clear “yes” and “no” is also a tool of the architect.',
      'Your strength is not in speed, but in a sequence of precise moves.',
      'Focus on what you can influence in the next 10 minutes.',
      'Uncertainty shrinks not from thinking, but from acting.',
      'When everything looks tangled, find one thread and pull it.',
      'Discard what does not move you forward, even if it sounds beautiful.',
      'Not every goal is yours. Filter out the imposed ones and you will breathe easier.',
      'Discipline is not a prison, it is a way to protect your focus.',
      'A precise “no” today saves dozens of “why did I do that?” tomorrow.',
      'Do not smear an action across the whole day. Do it briefly and clearly.',
    ],
  },
};

function getRandomQuote(mentor: MentorId, lang: AppLanguage): string {
  const list = MENTOR_QUOTES[mentor][lang];
  if (!list || list.length === 0) {
    return lang === 'ua'
      ? 'Один маленький крок сьогодні важливіший, ніж ідеальний план завтра.'
      : 'One small step today is more important than a perfect plan tomorrow.';
  }
  const index = Math.floor(Math.random() * list.length);
  return list[index];
}

function buildReminderText(
  lang: AppLanguage,
  mentor: MentorId
): { title: string; body: string } {
  const nameUa =
    mentor === 'lev'
      ? 'Лев'
      : mentor === 'lana'
      ? 'Лана'
      : mentor === 'bro'
      ? 'Bro'
      : 'Катана';

  const nameEn =
    mentor === 'lev'
      ? 'Lev'
      : mentor === 'lana'
      ? 'Lana'
      : mentor === 'bro'
      ? 'Bro'
      : 'Katana';

  const quote = getRandomQuote(mentor, lang);

  if (lang === 'ua') {
    return {
      title: `${nameUa} нагадує`,
      body: quote,
    };
  } else {
    return {
      title: `${nameEn} reminds you`,
      body: quote,
    };
  }
}

/**
 * "Стаб" планировщика:
 * - НИЧЕГО не планирует через expo-notifications
 * - Только сохраняет время и метаданные в AsyncStorage,
 *   чтобы UI мог показывать «напоминание включено».
 */
export async function scheduleDailyReminder(
  hour: number,
  minute: number,
  lang: AppLanguage,
  mentor: MentorId
): Promise<boolean> {
  try {
    // Генерируем фейковый id, чтобы логика UI не ломалась
    const fakeId = `local_${Date.now()}`;
    const { title, body } = buildReminderText(lang, mentor);

    await AsyncStorage.setItem(NOTIFICATION_ID_KEY, fakeId);
    await AsyncStorage.setItem(
      NOTIFICATION_TIME_KEY,
      JSON.stringify({ hour, minute })
    );
    await AsyncStorage.setItem(
      NOTIFICATION_META_KEY,
      JSON.stringify({
        lang,
        mentor,
        lastTitle: title,
        lastBody: body,
      })
    );

    // С точки зрения приложения напоминание «успешно настроено»
    // (в Expo Go реального пуша не будет, но предупреждений тоже)
    return true;
  } catch (e) {
    console.log('Error saving local reminder data (stub)', e);
    return false;
  }
}

/**
 * Возвращает инфо о текущем «напоминании» из локального стора.
 */
export async function getDailyReminderInfo(): Promise<DailyReminderInfo> {
  try {
    const id = await AsyncStorage.getItem(NOTIFICATION_ID_KEY);
    if (!id) {
      return { enabled: false, hour: null, minute: null };
    }

    const timeRaw = await AsyncStorage.getItem(NOTIFICATION_TIME_KEY);
    if (!timeRaw) {
      return { enabled: true, hour: null, minute: null };
    }

    const parsed = JSON.parse(timeRaw) as { hour?: number; minute?: number };
    return {
      enabled: true,
      hour: typeof parsed.hour === 'number' ? parsed.hour : null,
      minute: typeof parsed.minute === 'number' ? parsed.minute : null,
    };
  } catch (e) {
    console.log('Error reading reminder info (stub)', e);
    return { enabled: false, hour: null, minute: null };
  }
}

/**
 * Полностью «отключает» ежедневное напоминание в рамках стаба.
 */
export async function cancelDailyReminder(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      NOTIFICATION_ID_KEY,
      NOTIFICATION_TIME_KEY,
      NOTIFICATION_META_KEY,
    ]);
  } catch (e) {
    console.log('Error removing reminder keys (stub)', e);
  }
}
