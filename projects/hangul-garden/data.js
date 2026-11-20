const topics = [
  { id: 'greetings', name: '问候表达', mark: '안', tone: 'lavender' },
  { id: 'daily', name: '日常生活', mark: '집', tone: 'peach' },
  { id: 'food', name: '美食点餐', mark: '밥', tone: 'green' },
  { id: 'travel', name: '旅行出行', mark: '길', tone: 'blue' },
  { id: 'study', name: '学习校园', mark: '책', tone: 'pink' },
  { id: 'verbs', name: '常用动词', mark: '가', tone: 'yellow' },
  { id: 'course', name: '课程词汇' },
  { id: 'custom', name: '自定义', mark: '+', tone: 'blue' }
];

// 主题 | 韩文 | 罗马字 | 中文 | 词性 | 韩文例句 | 例句翻译
const entries = `greetings|안녕하세요|annyeonghaseyo|您好；你好|感叹词|안녕하세요, 처음 뵙겠습니다.|您好，初次见面。
greetings|감사합니다|gamsahamnida|谢谢|惯用语|도와주셔서 감사합니다.|谢谢您帮忙。
greetings|괜찮아요|gwaenchanayo|没关系；还好|惯用语|조금 늦어도 괜찮아요.|晚一点也没关系。
greetings|죄송합니다|joesonghamnida|对不起|惯用语|늦어서 죄송합니다.|对不起，我迟到了。
greetings|반갑습니다|bangapseumnida|很高兴见到您|惯用语|만나서 반갑습니다.|很高兴见到您。
greetings|안녕히 가세요|annyeonghi gaseyo|再见（对离开的人说）|惯用语|내일 뵙겠습니다. 안녕히 가세요!|明天见。再见！
greetings|안녕히 계세요|annyeonghi gyeseyo|再见（对留下的人说）|惯用语|저 먼저 갈게요. 안녕히 계세요.|我先走了。再见。
greetings|네|ne|是的；好的|感叹词|네, 알겠습니다.|好的，我知道了。
greetings|아니요|aniyo|不；不是|感叹词|아니요, 제 것이 아니에요.|不，这不是我的。
greetings|잠깐만요|jamkkanmanyo|请稍等|惯用语|잠깐만요, 지금 갈게요.|请稍等，我现在就去。
daily|사람|saram|人|名词|여기는 사람이 많아요.|这里人很多。
daily|친구|chingu|朋友|名词|친구하고 영화를 봐요.|我和朋友看电影。
daily|가족|gajok|家人；家庭|名词|가족과 함께 저녁을 먹어요.|我和家人一起吃晚饭。
daily|집|jip|家；房子|名词|지금 집에 있어요.|现在在家。
daily|오늘|oneul|今天|名词|오늘 날씨가 좋아요.|今天天气很好。
daily|내일|naeil|明天|名词|내일 다시 만나요.|明天再见。
daily|아침|achim|早晨；早饭|名词|아침에 산책해요.|我早上散步。
daily|저녁|jeonyeok|傍晚；晚饭|名词|저녁에 전화할게요.|我晚上给你打电话。
daily|시간|sigan|时间|名词|지금 시간 있어요?|现在有时间吗？
daily|날씨|nalssi|天气|名词|서울은 날씨가 추워요.|首尔的天气很冷。
food|물|mul|水|名词|물 한 잔 주세요.|请给我一杯水。
food|밥|bap|米饭；饭|名词|같이 밥 먹어요.|一起吃饭吧。
food|김치|gimchi|泡菜|名词|이 김치는 조금 매워요.|这个泡菜有点辣。
food|커피|keopi|咖啡|名词|아이스커피 한 잔 주세요.|请给我一杯冰咖啡。
food|우유|uyu|牛奶|名词|아침마다 우유를 마셔요.|我每天早上都喝牛奶。
food|빵|ppang|面包|名词|빵을 두 개 샀어요.|我买了两个面包。
food|메뉴|menyu|菜单|名词|메뉴 좀 보여 주세요.|请给我看一下菜单。
food|맛있어요|masisseoyo|好吃|形容词（口语形）|이 음식 정말 맛있어요.|这道菜真好吃。
food|주세요|juseyo|请给我|惯用语|이거 하나 주세요.|请给我一个这个。
food|식당|sikdang|餐馆；食堂|名词|학교 앞에 식당이 있어요.|学校前面有一家餐馆。
travel|지하철|jihacheol|地铁|名词|지하철로 가요.|坐地铁去。
travel|버스|beoseu|公交车|名词|버스가 곧 와요.|公交车马上就来。
travel|공항|gonghang|机场|名词|공항까지 얼마나 걸려요?|到机场要多久？
travel|역|yeok|车站|名词|역 앞에서 만나요.|在车站前见面吧。
travel|길|gil|路|名词|길을 잘못 들었어요.|我走错路了。
travel|여기|yeogi|这里|代词|여기 앉아도 돼요?|我可以坐这里吗？
travel|어디|eodi|哪里|代词|화장실이 어디예요?|洗手间在哪里？
travel|표|pyo|票|名词|서울까지 가는 표 한 장 주세요.|请给我一张到首尔的票。
travel|여행|yeohaeng|旅行|名词|다음 달에 부산으로 여행을 가요.|我下个月去釜山旅行。
travel|화장실|hwajangsil|洗手间|名词|화장실은 이 층에 있어요.|洗手间在二楼。
study|학교|hakgyo|学校|名词|매일 학교에 가요.|我每天去学校。
study|학생|haksaeng|学生|名词|저는 한국어를 배우는 학생이에요.|我是学韩语的学生。
study|선생님|seonsaengnim|老师|名词|선생님께 질문했어요.|我问了老师一个问题。
study|책|chaek|书|名词|책을 읽고 있어요.|我正在看书。
study|공부|gongbu|学习|名词|도서관에서 공부해요.|我在图书馆学习。
study|한국어|hangugeo|韩国语；韩语|名词|요즘 한국어를 배워요.|我最近在学韩语。
study|시험|siheom|考试|名词|다음 주에 시험이 있어요.|下周有考试。
study|숙제|sukje|作业|名词|집에서 숙제를 해요.|我在家做作业。
study|질문|jilmun|问题；提问|名词|질문이 있어요.|我有一个问题。
study|도서관|doseogwan|图书馆|名词|도서관에서 책을 빌려요.|我在图书馆借书。
verbs|가다|gada|去|动词|주말에 시장에 가요.|我周末去市场。
verbs|오다|oda|来|动词|친구가 우리 집에 와요.|朋友来我家。
verbs|먹다|meokda|吃|动词|점심을 먹어요.|我吃午饭。
verbs|마시다|masida|喝|动词|차를 마셔요.|我喝茶。
verbs|보다|boda|看|动词|저녁에 드라마를 봐요.|我晚上看电视剧。
verbs|읽다|ikda|读|动词|매일 신문을 읽어요.|我每天读报纸。
verbs|쓰다|sseuda|写；使用|动词|이름을 써 주세요.|请写下名字。
verbs|듣다|deutda|听|动词|음악을 들어요.|我听音乐。
verbs|배우다|baeuda|学习；学会|动词|한국어를 배워요.|我学韩语。
verbs|하다|hada|做|动词|아침에 운동을 해요.|我早上做运动。`;

const starterWords = entries.split('\n').map((row, index) => {
  const [topic, ko, roman, zh, type, sentence, translation] = row.split('|');
  return { id: `w${index + 1}`, topic, ko, roman, zh, type, sentence, translation };
});

const chinesePartsOfSpeech = {
  '명사': '名词', '대명사': '代词', '동사': '动词', '형용사': '形容词',
  '감탄사': '感叹词', '부사': '副词', '수사': '数词', '관형사': '冠形词',
  '의존 명사': '依存名词', '조사': '助词', '접사': '词缀', '어미': '词尾', '보조 동사': '辅助动词',
  '보조 형용사': '辅助形容词'
};

const curriculumWords = curriculumEntries.map(([id, ko, grade, pos, pronunciation, senses]) => {
  const glosses = [...new Set(senses.map(([gloss]) => gloss))];
  const zh = glosses.slice(0, 2).join('；');
  return {
    id: `krd-${id}`, sourceId: id, ko, grade, zh, topic: 'course',
    type: chinesePartsOfSpeech[pos] ?? pos, pronunciation, senses, sentence: senses[0][2]
  };
});

const mergedCurriculumIds = new Set();
for (const word of starterWords) {
  const equivalent = curriculumWords.find(entry => entry.ko === word.ko && (
    entry.type === word.type ||
    entry.senses.some(([gloss]) => gloss.split(/[，、；]/).some(part => part.trim() && word.zh.includes(part.trim())))
  ));
  if (equivalent) {
    word.grade = equivalent.grade;
    mergedCurriculumIds.add(equivalent.id);
  }
}

const courseEntries = curriculumWords.filter(word => !mergedCurriculumIds.has(word.id));
const sceneIds = new Set(topics.filter(topic => topic.mark && topic.id !== 'custom').map(topic => topic.id));
const courseByHeadword = new Map();
const starterHeadwords = new Set(starterWords.map(word => word.ko));
for (const word of courseEntries) {
  if (!courseByHeadword.has(word.ko)) courseByHeadword.set(word.ko, []);
  courseByHeadword.get(word.ko).push(word);
}
const selectedHeadwords = new Set(starterHeadwords);
for (const [topic, keys] of Object.entries(sceneSelections)) {
  for (const item of keys.split(' ')) {
    const [ko, hint] = item.split('|');
    if (selectedHeadwords.has(ko)) continue;
    const word = courseByHeadword.get(ko)?.find(entry => entry.senses.some(([gloss, detail]) =>
      !hint || gloss.includes(hint) || detail.includes(hint)));
    if (!word) continue;
    word.topic = topic;
    selectedHeadwords.add(ko);
  }
}
const greetings = greetingExpressions.split('\n').map((row, index) => {
  const [ko, zh, sentence, translation] = row.split('|');
  return { id: `greeting-${index + 1}`, topic: 'greetings', ko, zh, sentence, translation, type: '惯用语' };
});
const builtInWords = [...starterWords, ...greetings, ...courseEntries];

const letterGroups = [
  { title: '基本辅音', detail: '辅音和元音组成音节。点按字母，听它与 ㅏ 组合后的读音。', letters: [
    ['ㄱ','g / k','가'], ['ㄴ','n','나'], ['ㄷ','d / t','다'], ['ㄹ','r / l','라'], ['ㅁ','m','마'], ['ㅂ','b / p','바'], ['ㅅ','s','사'], ['ㅇ','词首无声','아'], ['ㅈ','j','자'], ['ㅊ','ch','차'], ['ㅋ','k','카'], ['ㅌ','t','타'], ['ㅍ','p','파'], ['ㅎ','h','하']
  ] },
  { title: '基本元音', detail: '元音开头的音节，写作 ㅇ 加元音，例如 아、오。', letters: [
    ['ㅏ','a','아'], ['ㅑ','ya','야'], ['ㅓ','eo','어'], ['ㅕ','yeo','여'], ['ㅗ','o','오'], ['ㅛ','yo','요'], ['ㅜ','u','우'], ['ㅠ','yu','유'], ['ㅡ','eu','으'], ['ㅣ','i','이']
  ] },
  { title: '紧音', detail: '双写的辅音需要更紧的发音。试听它们与 ㅏ 的组合。', letters: [
    ['ㄲ','kk','까'], ['ㄸ','tt','따'], ['ㅃ','pp','빠'], ['ㅆ','ss','싸'], ['ㅉ','jj','짜']
  ] },
  { title: '复合元音', detail: '这些元音也可以和辅音拼成一个音节。', letters: [
    ['ㅐ','ae','애'], ['ㅒ','yae','얘'], ['ㅔ','e','에'], ['ㅖ','ye','예'], ['ㅘ','wa','와'], ['ㅙ','wae','왜'], ['ㅚ','oe','외'], ['ㅝ','wo','워'], ['ㅞ','we','웨'], ['ㅟ','wi','위'], ['ㅢ','ui','의']
  ] }
];
