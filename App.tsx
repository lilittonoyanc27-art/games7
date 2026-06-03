import { useState, useEffect } from 'react';
import { 
  Languages, 
  BookOpen, 
  Grid, 
  Check, 
  HelpCircle, 
  Volume2, 
  RotateCcw, 
  Trophy, 
  Award, 
  Sparkles, 
  ChevronRight, 
  CheckCircle2, 
  XCircle, 
  Play, 
  Heart, 
  Volume1, 
  VolumeX, 
  Undo2, 
  Lightbulb,
  Gamepad,
  Flame,
  Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { VOCABULARY, CATEGORIES } from './vocabulary';
import { VocabularyItem, ActiveGameType, MatchCard } from './types';
import { playSound } from './audio';

export default function App() {
  // General Stats / States
  const [activeTab, setActiveTab] = useState<ActiveGameType>('dictionary');
  const [stars, setStars] = useState<number>(() => {
    const saved = localStorage.getItem('arm_esp_stars');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [streak, setStreak] = useState<number>(() => {
    const saved = localStorage.getItem('arm_esp_streak');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [selectedWord, setSelectedWord] = useState<VocabularyItem | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  
  // Save stats to localStorage
  useEffect(() => {
    localStorage.setItem('arm_esp_stars', stars.toString());
  }, [stars]);

  useEffect(() => {
    localStorage.setItem('arm_esp_streak', streak.toString());
  }, [streak]);

  // Audio helper
  const triggerSound = (type: 'click' | 'correct' | 'wrong' | 'match' | 'levelup') => {
    if (soundEnabled) {
      playSound(type);
    }
  };

  // TTS browser speaking helper
  const playVoice = (text: string) => {
    triggerSound('click');
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES';
      utterance.rate = 0.8;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Award stars with nice sound
  const addStars = (amount: number) => {
    setStars(prev => prev + amount);
    setStreak(prev => prev + 1);
  };

  const resetStreak = () => {
    setStreak(0);
  };

  // Determine learner rank level based on stars
  const getLearnerLevel = () => {
    if (stars < 30) return { name: 'Սկսնակ (Principiante)', icon: '🌱', max: 30, color: 'bg-[#EAF6ED]' };
    if (stars < 100) return { name: 'Հետախույզ (Explorador)', icon: '🧭', max: 100, color: 'bg-[#EEF6F9]' };
    if (stars < 250) return { name: 'Գիտակ (Conocedor)', icon: '🎓', max: 250, color: 'bg-[#FFF9EA]' };
    return { name: 'Փորձագետ (Maestro)', icon: '👑', max: 99999, color: 'bg-[#F5EEF9]' };
  };

  const levelInfo = getLearnerLevel();

  // ------------------------------------------------------------------
  // GAME 1 STATE: WORD MATCHING (Գտիր զույգերը)
  // ------------------------------------------------------------------
  const [matchCards, setMatchCards] = useState<MatchCard[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [matchedPairsCount, setMatchedPairsCount] = useState<number>(0);
  const [matchedWordExplanation, setMatchedWordExplanation] = useState<VocabularyItem | null>(null);

  const initWordMatchGame = () => {
    triggerSound('click');
    setMatchedWordExplanation(null);
    setMatchedPairsCount(0);
    setSelectedMatchId(null);
    
    // Pick 4 random words
    const shuffledVocab = [...VOCABULARY].sort(() => 0.5 - Math.random());
    const selectedVocab = shuffledVocab.slice(0, 4);

    // Create cards
    const cards: MatchCard[] = [];
    selectedVocab.forEach((item) => {
      // Spanish card
      cards.push({
        id: `es-${item.id}`,
        vocabId: item.id,
        text: item.es,
        lang: 'es',
        isMatched: false,
        isSelected: false
      });
      // Armenian card
      cards.push({
        id: `hy-${item.id}`,
        vocabId: item.id,
        text: item.hy,
        lang: 'hy',
        isMatched: false,
        isSelected: false
      });
    });

    // Shuffle replay/random
    setMatchCards(cards.sort(() => 0.5 - Math.random()));
  };

  useEffect(() => {
    if (activeTab === 'word-match' && matchCards.length === 0) {
      initWordMatchGame();
    }
  }, [activeTab]);

  const handleMatchCardClick = (clickedCard: MatchCard) => {
    if (clickedCard.isMatched) return;
    triggerSound('click');

    // If no card selected yet
    if (!selectedMatchId) {
      setSelectedMatchId(clickedCard.id);
      setMatchCards(prev => prev.map(c => c.id === clickedCard.id ? { ...c, isSelected: true } : c));
      
      // Auto-speak if it's Spanish
      if (clickedCard.lang === 'es') {
        playVoice(clickedCard.text);
      }
      return;
    }

    const firstCard = matchCards.find(c => c.id === selectedMatchId);
    if (!firstCard) return;

    // Clicked the same card
    if (firstCard.id === clickedCard.id) {
      setSelectedMatchId(null);
      setMatchCards(prev => prev.map(c => c.id === clickedCard.id ? { ...c, isSelected: false } : c));
      return;
    }

    // Try to match
    if (firstCard.vocabId === clickedCard.vocabId && firstCard.lang !== clickedCard.lang) {
      // Success Match!
      triggerSound('match');
      setMatchCards(prev => prev.map(c => 
         c.vocabId === clickedCard.vocabId ? { ...c, isMatched: true, isSelected: false } : c
      ));
      setSelectedMatchId(null);
      setMatchedPairsCount(prev => prev + 1);

      // Find vocabulary info to show explanations
      const vocabItem = VOCABULARY.find(v => v.id === clickedCard.vocabId);
      if (vocabItem) {
        setMatchedWordExplanation(vocabItem);
        // Play vocal audio on success match
        playVoice(vocabItem.es);
      }

      // Check if all matched
      if (matchedPairsCount + 1 === 4) {
        setTimeout(() => {
          triggerSound('levelup');
          addStars(10);
        }, 600);
      }
    } else {
      // Mismatch
      triggerSound('wrong');
      // Briefly show selection, then reset
      setMatchCards(prev => prev.map(c => c.id === clickedCard.id ? { ...c, isSelected: true } : c));
      
      setTimeout(() => {
        setMatchCards(prev => prev.map(c => c.id === clickedCard.id || c.id === selectedMatchId ? { ...c, isSelected: false } : c));
        setSelectedMatchId(null);
      }, 800);
    }
  };


  // ------------------------------------------------------------------
  // GAME 2 STATE: WORD BUILDER (Հավաքիր բառը)
  // ------------------------------------------------------------------
  const [builderTarget, setBuilderTarget] = useState<VocabularyItem | null>(null);
  const [availableLetters, setAvailableLetters] = useState<{ id: string; char: string; isUsed: boolean }[]>([]);
  const [selectedLetters, setSelectedLetters] = useState<{ slotId: string; letterId: string; char: string }[]>([]);
  const [builderStatus, setBuilderStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [builderHintShown, setBuilderHintShown] = useState<boolean>(false);

  const initWordBuilderGame = () => {
    triggerSound('click');
    setBuilderStatus('idle');
    setBuilderHintShown(false);
    setSelectedLetters([]);

    // Select a random word
    const randomItem = VOCABULARY[Math.floor(Math.random() * VOCABULARY.length)];
    setBuilderTarget(randomItem);

    // Build unique available letters from Spanish term
    const chars = randomItem.es.replace(/\s+/g, '').split('');
    const lettersPool = chars.map((char, index) => ({
      id: `letter-${index}-${char}`,
      char: char,
      isUsed: false
    }));

    // Add 1-2 random distractor letters to make it fun for words under 6 chars
    if (chars.length < 6) {
      const distractors = ['a', 'e', 'o', 's', 'r', 't', 'l', 'm', 'n'];
      const addCount = 6 - chars.length;
      for (let i = 0; i < addCount; i++) {
        const randChar = distractors[Math.floor(Math.random() * distractors.length)];
        lettersPool.push({
          id: `distractor-${i}-${randChar}`,
          char: randChar,
          isUsed: false
        });
      }
    }

    // Shuffle letters pool
    setAvailableLetters(lettersPool.sort(() => 0.5 - Math.random()));
  };

  useEffect(() => {
    if (activeTab === 'word-builder' && !builderTarget) {
      initWordBuilderGame();
    }
  }, [activeTab]);

  const handleLetterTap = (letter: { id: string; char: string; isUsed: boolean }) => {
    if (letter.isUsed || builderStatus === 'correct') return;
    triggerSound('click');

    // Add to selected list
    setSelectedLetters(prev => [...prev, { slotId: `slot-${Date.now()}`, letterId: letter.id, char: letter.char }]);
    // Set as used
    setAvailableLetters(prev => prev.map(l => l.id === letter.id ? { ...l, isUsed: true } : l));
  };

  const handleRemoveBuilderLetter = (selectedItem: { slotId: string; letterId: string; char: string }) => {
    if (builderStatus === 'correct') return;
    triggerSound('click');

    // Remove from slots
    setSelectedLetters(prev => prev.filter(item => item.slotId !== selectedItem.slotId));
    // Re-enable in letters board
    setAvailableLetters(prev => prev.map(l => l.id === selectedItem.letterId ? { ...l, isUsed: false } : l));
    // Reset status back to idle
    if (builderStatus === 'wrong') {
      setBuilderStatus('idle');
    }
  };

  const handleClearLetters = () => {
    triggerSound('click');
    setSelectedLetters([]);
    setAvailableLetters(prev => prev.map(l => ({ ...l, isUsed: false })));
    setBuilderStatus('idle');
  };

  const checkBuilderWord = () => {
    if (!builderTarget) return;

    const constructed = selectedLetters.map(s => s.char.toLowerCase()).join('');
    const target = builderTarget.es.replace(/\s+/g, '').toLowerCase();

    if (constructed === target) {
      setBuilderStatus('correct');
      triggerSound('correct');
      addStars(5);
      playVoice(builderTarget.es);
    } else {
      setBuilderStatus('wrong');
      triggerSound('wrong');
      resetStreak();
    }
  };


  // ------------------------------------------------------------------
  // GAME 3 STATE: EMOJI & TERM QUIZ (Վիկտորինա)
  // ------------------------------------------------------------------
  const [quizTarget, setQuizTarget] = useState<VocabularyItem | null>(null);
  const [quizOptions, setQuizOptions] = useState<VocabularyItem[]>([]);
  const [quizSelectedId, setQuizSelectedId] = useState<string | null>(null);
  const [quizCorrect, setQuizCorrect] = useState<boolean | null>(null);

  const initQuizGame = () => {
    triggerSound('click');
    setQuizSelectedId(null);
    setQuizCorrect(null);

    // Pick 1 target
    const targetItem = VOCABULARY[Math.floor(Math.random() * VOCABULARY.length)];
    setQuizTarget(targetItem);

    // Pick 3 high-quality distractors
    const otherOptions = VOCABULARY.filter(item => item.id !== targetItem.id);
    const shuffledOthers = otherOptions.sort(() => 0.5 - Math.random());
    const distractors = shuffledOthers.slice(0, 3);

    // Join and shuffle options
    const merged = [targetItem, ...distractors];
    setQuizOptions(merged.sort(() => 0.5 - Math.random()));
  };

  useEffect(() => {
    if (activeTab === 'quiz' && !quizTarget) {
      initQuizGame();
    }
  }, [activeTab]);

  const handleQuizAnswer = (option: VocabularyItem) => {
    if (quizSelectedId) return; // Already answered
    if (!quizTarget) return;

    setQuizSelectedId(option.id);
    const isCorrect = option.id === quizTarget.id;
    setQuizCorrect(isCorrect);
    
    if (isCorrect) {
      triggerSound('correct');
      addStars(5);
      playVoice(quizTarget.es);
    } else {
      triggerSound('wrong');
      resetStreak();
    }
  };


  // ------------------------------------------------------------------
  // GAME 4 STATE: AUDIO CHALLENGE (Լսիր և ընտրիր)
  // ------------------------------------------------------------------
  const [audioTarget, setAudioTarget] = useState<VocabularyItem | null>(null);
  const [audioOptions, setAudioOptions] = useState<VocabularyItem[]>([]);
  const [audioSelectedId, setAudioSelectedId] = useState<string | null>(null);
  const [audioCorrect, setAudioCorrect] = useState<boolean | null>(null);
  const [audioHintToggle, setAudioHintToggle] = useState<boolean>(false);

  const initAudioGame = () => {
    triggerSound('click');
    setAudioSelectedId(null);
    setAudioCorrect(null);
    setAudioHintToggle(false);

    // Pick 1 target
    const targetItem = VOCABULARY[Math.floor(Math.random() * VOCABULARY.length)];
    setAudioTarget(targetItem);

    // Pick 3 distractors
    const otherOptions = VOCABULARY.filter(item => item.id !== targetItem.id);
    const shuffledOthers = otherOptions.sort(() => 0.5 - Math.random());
    const distractors = shuffledOthers.slice(0, 3);

    const merged = [targetItem, ...distractors];
    setAudioOptions(merged.sort(() => 0.5 - Math.random()));

    // Wait a brief moment and auto-play audio
    setTimeout(() => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(targetItem.es);
        utterance.lang = 'es-ES';
        utterance.rate = 0.8;
        window.speechSynthesis.speak(utterance);
      }
    }, 400);
  };

  useEffect(() => {
    if (activeTab === 'audio-quiz' && !audioTarget) {
      initAudioGame();
    }
  }, [activeTab]);

  const handleAudioAnswer = (option: VocabularyItem) => {
    if (audioSelectedId) return;
    if (!audioTarget) return;

    setAudioSelectedId(option.id);
    const isCorrect = option.id === audioTarget.id;
    setAudioCorrect(isCorrect);

    if (isCorrect) {
      triggerSound('correct');
      addStars(5);
    } else {
      triggerSound('wrong');
      resetStreak();
    }
  };

  // Dictionary Filtering
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Բոլորը');

  const filteredVocabulary = VOCABULARY.filter(item => {
    const matchesSearch = 
      item.es.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.hy.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.explanation_hy.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'Բոլորը' || item.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-transparent text-[#3d3d3d] font-sans selection:bg-[#FFE5EC] selection:text-[#FF5E89] pb-16">
      
      {/* GLOWING PREMIUM HEADER BAR */}
      <header className="sticky top-0 z-40 bg-white/75 backdrop-blur-lg border-b border-rose-100 px-4 md:px-8 py-4 shadow-sm shadow-rose-100/40">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* TITLE / LOGO CONTAINER */}
          <div className="flex items-center gap-3.5">
            <div 
              onClick={() => triggerSound('click')}
              className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#FF5E89] to-[#FF8FAB] flex items-center justify-center text-white shadow-lg shadow-rose-200 hover:scale-[1.04] duration-150 cursor-pointer active:scale-95"
            >
              <Languages className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-display font-black tracking-tight text-gray-800">
                  Aprende <span className="text-[#FF5E89] italic font-serif">&</span> Սովորիր
                </h1>
                <span className="text-[10px] bg-rose-50 text-[#FF5E89] border border-rose-200/60 px-2 py-0.5 rounded-full font-black font-mono shadow-xs">
                  A1
                </span>
              </div>
              <p className="text-[10px] text-gray-500 font-bold tracking-wide opacity-90 mt-0.5 font-mono">
                🇦🇲 Արևելահայերեն • 🇪🇸 Español
              </p>
            </div>
          </div>

          {/* SYSTEM STATS HEADER PANEL */}
          <div className="flex items-center gap-2 md:gap-3 flex-wrap justify-center">
            {/* Rank Level Container */}
            <div className="bg-white/90 border border-rose-100/80 px-3.5 py-1.5 rounded-2xl flex items-center gap-2.5 shadow-xs">
              <span className="text-lg">{levelInfo.icon}</span>
              <div className="leading-tight">
                <p className="text-[9px] text-gray-400 font-black uppercase tracking-wider font-mono">Level</p>
                <p className="text-xs font-black text-gray-700">{levelInfo.name}</p>
              </div>
            </div>

            {/* Stars score card badge */}
            <div className="bg-white/90 border border-rose-100/80 px-3.5 py-1.5 rounded-2xl flex items-center gap-2 shadow-xs">
              <div className="w-5 h-5 bg-amber-50 rounded-lg flex items-center justify-center">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500 stroke-[1.5]" />
              </div>
              <div className="leading-tight">
                <p className="text-[9px] text-gray-400 font-black uppercase tracking-wider font-mono">Stars</p>
                <p className="text-xs font-extrabold text-gray-800 font-mono">{stars}</p>
              </div>
            </div>

            {/* Daily Streaks badge */}
            <div className="bg-white/90 border border-rose-100/80 px-3.5 py-1.5 rounded-2xl flex items-center gap-2 shadow-xs">
              <div className="w-5 h-5 bg-rose-50 rounded-lg flex items-center justify-center">
                <Flame className="w-3.5 h-3.5 fill-rose-500 text-rose-500 stroke-[1.5]" />
              </div>
              <div className="leading-tight">
                <p className="text-[9px] text-gray-400 font-black uppercase tracking-wider font-mono">Streak</p>
                <p className="text-xs font-extrabold text-gray-800 font-mono">{streak}</p>
              </div>
            </div>

            {/* Sound controls on-off toggle */}
            <button 
              id="sound-toggle-btn"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl border transition-all cursor-pointer hover:scale-105 active:scale-95 ${
                soundEnabled 
                  ? 'bg-rose-50/80 border-rose-100 text-[#FF5E89] shadow-xs' 
                  : 'bg-stone-100/80 border-stone-200 text-stone-400 shadow-xs'
              }`}
              title={soundEnabled ? 'Mute' : 'Unmute'}
            >
              {soundEnabled ? <Volume1 className="w-4.5 h-4.5 stroke-[2]" /> : <VolumeX className="w-4.5 h-4.5 stroke-[2]" />}
            </button>

            {/* Reset progress button */}
            <button 
              id="reset-stats-btn"
              onClick={() => { triggerSound('click'); setShowResetConfirm(true); }}
              className="p-2 rounded-xl border border-rose-100/60 bg-white/90 text-stone-500 hover:text-[#FF5E89] hover:border-[#FF5E89]/40 hover:bg-rose-50/30 transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-xs"
              title="Զրոյացնել / Сбросить"
            >
              <RotateCcw className="w-4.5 h-4.5 stroke-[2]" />
            </button>
          </div>
        </div>
      </header>

      {/* NEW BENTO GRID WRAPPER */}
      <main className="max-w-6xl mx-auto px-4 md:px-8 mt-8">
        
        {/* TAB NAVIGATION PANEL BAR */}
        <div 
          id="tab-navigation" 
          className="bg-white/60 backdrop-blur-md p-1.5 rounded-3xl border border-rose-100/60 shadow-sm shadow-rose-200/10 flex flex-wrap justify-center gap-1.5 mb-8 max-w-4xl mx-auto"
        >
          {/* DICTIONARY TAB */}
          <button
            id="tab-dictionary"
            onClick={() => { triggerSound('click'); setActiveTab('dictionary'); }}
            className={`flex items-center gap-2 px-4.5 py-3 rounded-2xl text-xs font-black uppercase tracking-wide transition-all cursor-pointer ${
              activeTab === 'dictionary' 
                ? 'bg-gradient-to-r from-[#FF5E89] to-[#FF8FAB] text-white shadow-md shadow-rose-200 scale-[1.02]' 
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-rose-50/50'
            }`}
          >
            <BookOpen className="w-4 h-4 stroke-[2]" />
            <span>📖 Բառարան</span>
          </button>

          {/* GAME 1 */}
          <button
            id="tab-word-match"
            onClick={() => { triggerSound('click'); setActiveTab('word-match'); initWordMatchGame(); }}
            className={`flex items-center gap-2 px-4.5 py-3 rounded-2xl text-xs font-black uppercase tracking-wide transition-all cursor-pointer ${
              activeTab === 'word-match' 
                ? 'bg-gradient-to-r from-[#FF5E89] to-[#FF8FAB] text-white shadow-md shadow-rose-200 scale-[1.02]' 
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-rose-50/50'
            }`}
          >
            <Grid className="w-4 h-4 stroke-[2]" />
            <span>🧩 Զույգեր</span>
          </button>

          {/* GAME 2 */}
          <button
            id="tab-word-builder"
            onClick={() => { triggerSound('click'); setActiveTab('word-builder'); initWordBuilderGame(); }}
            className={`flex items-center gap-2 px-4.5 py-3 rounded-2xl text-xs font-black uppercase tracking-wide transition-all cursor-pointer ${
              activeTab === 'word-builder' 
                ? 'bg-gradient-to-r from-[#FF5E89] to-[#FF8FAB] text-white shadow-md shadow-rose-200 scale-[1.02]' 
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-rose-50/50'
            }`}
          >
            <Lightbulb className="w-4 h-4 stroke-[2]" />
            <span>✍️ Բառակազմ</span>
          </button>

          {/* GAME 3 */}
          <button
            id="tab-quiz"
            onClick={() => { triggerSound('click'); setActiveTab('quiz'); initQuizGame(); }}
            className={`flex items-center gap-2 px-4.5 py-3 rounded-2xl text-xs font-black uppercase tracking-wide transition-all cursor-pointer ${
              activeTab === 'quiz' 
                ? 'bg-gradient-to-r from-[#FF5E89] to-[#FF8FAB] text-white shadow-md shadow-rose-200 scale-[1.02]' 
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-rose-50/50'
            }`}
          >
            <Gamepad className="w-4 h-4 stroke-[2]" />
            <span>🎯 Վիկտորինա</span>
          </button>

          {/* GAME 4 */}
          <button
            id="tab-audio-quiz"
            onClick={() => { triggerSound('click'); setActiveTab('audio-quiz'); initAudioGame(); }}
            className={`flex items-center gap-2 px-4.5 py-3 rounded-2xl text-xs font-black uppercase tracking-wide transition-all cursor-pointer ${
              activeTab === 'audio-quiz' 
                ? 'bg-gradient-to-r from-[#FF5E89] to-[#FF8FAB] text-white shadow-md shadow-rose-200 scale-[1.02]' 
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-rose-50/50'
            }`}
          >
            <Volume2 className="w-4 h-4 stroke-[2]" />
            <span>📢 Լսիր</span>
          </button>
        </div>

        {/* ACTIVE MODULE CONTAINER ATTACHMENT */}
        <div className="max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            
            {/* 📖 DICTIONARY VIEW */}
            {activeTab === 'dictionary' && (
              <motion.div
                key="dictionary-view"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-8"
              >
                {/* Search & Categories Bento-Header (Creamy pink) */}
                <div className="bg-white/75 backdrop-blur-md p-6 rounded-[28px] border border-rose-100 shadow-sm shadow-rose-200/10 space-y-4">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h2 className="text-lg md:text-xl font-display font-black text-gray-800 flex items-center gap-2">
                        📖 A1 Իսպաներեն-Հայերեն Բառարան 
                      </h2>
                      <p className="text-xs text-gray-500 font-bold mt-1">
                        Ուսումնասիրիր իսպաներեն A1 մակարդակի հիմնական բառերը կարևոր բացատրություններով, արտասանությամբ և օրինակներով:
                      </p>
                    </div>
                  </div>

                  {/* Playful clean custom categories tag clouds */}
                  <div className="flex gap-1.5 flex-wrap pt-3 border-t border-dashed border-rose-100">
                    {['Բոլորը', ...CATEGORIES].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => { triggerSound('click'); setSelectedCategory(cat); }}
                        className={`text-[11px] px-3.5 py-1.5 rounded-full font-black border transition-all cursor-pointer ${
                          selectedCategory === cat 
                            ? 'bg-gradient-to-r from-[#FF5E89] to-[#FF8FAB] border-none text-white shadow-xs shadow-rose-200 -translate-y-0.5' 
                            : 'bg-white border-rose-100 text-gray-500 hover:text-gray-800 hover:bg-rose-50/50'
                        }`}
                      >
                        {cat === 'Բոլորը' ? 'Բոլորը' : cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Elegant Search input element */}
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Փնտրել բառեր... (օր. Hola, Բարև, Կատու, Семья)"
                    className="w-full bg-white border border-rose-100 px-5 py-4 pl-12 rounded-2xl text-xs font-bold text-gray-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#FF5E89]/10 focus:border-[#FF5E89] shadow-sm shadow-rose-100/10 transition-all duration-150"
                  />
                  <Languages className="w-5 h-5 text-rose-400 absolute left-4 top-1/2 -translate-y-1/2 stroke-[1.8]" />
                </div>

                {/* Vocabulary Card Bento Grid list */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {filteredVocabulary.length > 0 ? (
                    filteredVocabulary.map((item) => (
                      <motion.div
                        key={item.id}
                        layout
                        id={`vocab-card-${item.id}`}
                        onClick={() => { setSelectedWord(item); playVoice(item.es); }}
                        className="bg-white border border-rose-100/70 hover:-translate-y-1 hover:shadow-lg hover:shadow-rose-100/50 active:translate-y-0 duration-200 p-5 rounded-[24px] shadow-sm shadow-rose-100/10 transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden group min-h-[180px]"
                      >
                        {/* Decorative clean offset corner block */}
                        <div className="absolute top-0 right-0 w-12 h-12 bg-rose-50/40 border-b border-l border-rose-100 rounded-bl-2xl z-0 flex items-center justify-center">
                          <span className="text-xl select-none" role="img">{item.emoji}</span>
                        </div>

                        <div className="z-10 pr-10">
                          <span className="text-[9px] bg-rose-50/80 text-[#FF5E89] border border-rose-100/40 px-2 py-0.5 rounded-full font-black uppercase tracking-wider font-mono">
                            {item.category}
                          </span>
                          <h3 className="text-xl font-display font-black text-gray-800 mt-2 group-hover:text-[#FF5E89] transition-colors flex items-center gap-1.5">
                            {item.es}
                          </h3>
                        </div>

                        <div className="border-t border-rose-50/80 mt-3 pt-3 flex flex-col justify-between flex-grow z-10">
                          <div className="space-y-0.5">
                            <span className="text-gray-400 font-extrabold text-[9px] uppercase font-mono tracking-wider">🇦🇲 Armenian Translation</span>
                            <p className="font-extrabold text-[#3a3a3a] text-base leading-tight mt-0.5">
                              {item.hy}
                            </p>
                          </div>

                          <div className="bg-rose-50/30 border border-rose-100/40 p-3 rounded-xl mt-3 space-y-1">
                            <p className="text-[9px] text-gray-400 font-black uppercase font-mono tracking-wider">🗣️ Արտասանություն</p>
                            <div className="text-[11px] font-mono font-black text-[#FF5E89]">
                              [{item.transliteration_hy}]
                            </div>
                          </div>
                        </div>

                        {/* Speaker absolute button inside */}
                        <button
                          id={`listen-btn-${item.id}`}
                          onClick={(e) => { e.stopPropagation(); playVoice(item.es); }}
                          className="absolute bottom-5 right-5 w-8 h-8 rounded-full bg-rose-100/50 border border-rose-100 text-[#FF5E89] flex items-center justify-center hover:bg-[#FF5E89] hover:border-transparent hover:text-white hover:scale-105 active:scale-95 transition-all cursor-pointer"
                          title="Արտասանել / Pronounce"
                        >
                          <Volume2 className="w-4.5 h-4.5 stroke-[2]" />
                        </button>
                      </motion.div>
                    ))
                  ) : (
                    <div className="col-span-full py-16 text-center bg-white border border-dashed border-rose-200 rounded-[28px] p-8 space-y-4 shadow-xs">
                      <HelpCircle className="w-12 h-12 text-rose-300 mx-auto stroke-[1.5]" />
                      <p className="text-gray-600 font-black text-base">Բառ չի գտնվել</p>
                      <button 
                        onClick={() => { setSearchQuery(''); setSelectedCategory('Բոլորը'); }}
                        className="text-xs bg-white hover:bg-[#FFEAF0] text-[#FF5E89] border border-rose-100 hover:border-[#FF5E89]/80 px-4 py-2 rounded-xl transition-all font-black cursor-pointer shadow-xs active:scale-95 duration-150"
                      >
                        Մաքրել որոնումը
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* 🧩 GAME 1: WORD MATCHING (Գտիր զույգերը - Pink themed) */}
            {activeTab === 'word-match' && (
              <motion.div
                key="word-match-view"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-8"
              >
                {/* Modern Bento instructions bar (Glass overlay layout background) */}
                <div className="bg-white/80 backdrop-blur-md p-6 rounded-[28px] border border-rose-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <span className="text-[9px] bg-rose-50 text-[#FF5E89] border border-rose-100/60 px-3 py-1 rounded-full font-black uppercase tracking-wider font-mono shadow-xs">
                      Խաղ 1 • GAME 1
                    </span>
                    <h2 className="text-lg md:text-xl font-display font-black text-gray-800 mt-2 flex items-center gap-2">
                      🧩 Գտիր զույգերը
                    </h2>
                    <p className="text-xs text-gray-500 font-semibold mt-1">
                      Միացրու իսպաներեն բառերը համապատասխան հայերեն թարգմանությունների հետ!
                    </p>
                  </div>
                  <button 
                    onClick={initWordMatchGame}
                    className="flex items-center gap-1.5 bg-rose-50/50 hover:bg-rose-50 border border-rose-100/80 text-[#FF5E89] px-4 py-2.5 rounded-xl text-xs font-black transition-all hover:scale-103 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 stroke-[2]" />
                    <span>Նոր բառեր</span>
                  </button>
                </div>

                {/* Matching Card Elements Matrix (Grid) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {matchCards.map((card) => {
                    const matchedItem = VOCABULARY.find(v => v.id === card.vocabId);
                    return (
                      <motion.button
                        key={card.id}
                        id={`match-card-${card.id}`}
                        disabled={card.isMatched}
                        onClick={() => handleMatchCardClick(card)}
                        className={`min-h-[140px] p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between text-center relative overflow-hidden group/card cursor-pointer ${
                          card.isMatched 
                            ? 'bg-rose-50/20 border-rose-100/40 text-rose-300 opacity-60 shadow-xs' 
                            : card.isSelected 
                              ? 'bg-[#FFEAF0] border-[#FF5E89] text-[#FF5E89] ring-2 ring-[#FF5E89]/20 shadow-md scale-[1.02]'
                              : 'bg-white border-rose-100 hover:border-[#FF5E89]/40 hover:-translate-y-0.5 hover:shadow-md hover:shadow-rose-100/30 text-gray-800 shadow-xs'
                        }`}
                      >
                        {/* Mini lang badge inside */}
                        <div className="absolute top-2.5 left-2.5 flex items-center gap-1">
                          <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase text-center border ${
                            card.lang === 'es' ? 'bg-amber-50 border-amber-100 text-amber-600' : 'bg-sky-50 border-sky-100 text-sky-600'
                          }`}>
                            {card.lang === 'es' ? 'ESP' : 'ARM'}
                          </span>
                        </div>

                        {/* Card Match State Check Icon */}
                        {card.isMatched && (
                          <div className="absolute top-2.5 right-2.5 text-emerald-500 bg-white rounded-full border border-emerald-100 p-0.5 shadow-xs">
                            <Check className="w-3 h-3 stroke-[3.5]" />
                          </div>
                        )}

                        <div className="my-auto flex flex-col items-center justify-center gap-1.5 pt-4">
                          <span className="text-lg block select-none">
                            {card.lang === 'es' ? '🇪🇸' : '🇦🇲'}
                          </span>
                          <span className="text-xs font-black tracking-tight leading-tight block text-gray-805">
                            {card.text}
                          </span>
                        </div>

                        {/* Bottom helper pronunciation representation */}
                        {card.lang === 'es' && matchedItem && !card.isMatched && (
                          <div className="text-[9px] font-black text-rose-300 group-hover/card:text-[#FF5E89] transition-colors mt-2">
                            🔉 {matchedItem.transliteration_hy}
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                {/* MATCHED WORD DETAIL EXPLANATION DISPLAY PANEL */}
                <AnimatePresence>
                  {matchedWordExplanation && (
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-white/80 backdrop-blur-md border border-rose-100 p-6 rounded-[24px] shadow-md shadow-rose-200/10"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5">
                          <span className="text-3xl bg-rose-50/50 border border-rose-100 p-3 rounded-2xl block" role="img" aria-label={matchedWordExplanation.es}>
                            {matchedWordExplanation.emoji}
                          </span>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-xl font-display font-black text-gray-800">
                                {matchedWordExplanation.es}
                              </h3>
                              <span className="text-[9px] bg-rose-50 text-[#FF5E89] border border-rose-100/50 px-2 py-0.5 rounded-full font-black uppercase">
                                {matchedWordExplanation.category}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 font-extrabold mt-0.5">🇦🇲 {matchedWordExplanation.hy}</p>
                          </div>
                        </div>

                        <button
                          id="matched-explain-sound"
                          onClick={() => playVoice(matchedWordExplanation.es)}
                          className="self-start sm:self-center flex items-center gap-1.5 bg-[#FF5E89] hover:bg-[#fe4774] text-white px-4.5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm shadow-rose-200 hover:scale-103 duration-100 cursor-pointer"
                        >
                          <Volume2 className="w-4 h-4 stroke-[2]" />
                          <span>Լսել արտասանությունը</span>
                        </button>
                      </div>

                      <div className="mt-4 border-t border-rose-100 pt-3.5 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        {/* Pronunciation section */}
                        <div className="space-y-1 bg-rose-50/30 p-3.5 rounded-xl border border-rose-100/40">
                          <h4 className="font-black text-[9px] uppercase tracking-wider text-[#FF5E89] font-mono">🗣️ Արտասանություն:</h4>
                          <p className="font-mono text-[11px] font-black text-[#FF5E89]">
                            {matchedWordExplanation.transliteration_hy}
                          </p>
                        </div>
                        {/* Explanation detail block */}
                        <div className="space-y-1 bg-rose-50/30 p-3.5 rounded-xl border border-rose-100/40">
                          <h4 className="font-black text-[9px] uppercase tracking-wider text-[#FF5E89] font-mono">📝 Իմացիր ավելին:</h4>
                          <p className="leading-relaxed font-bold text-[11px] text-gray-600">
                            {matchedWordExplanation.explanation_hy}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* GAME WORKOUT COMPLETION CARD */}
                {matchedPairsCount === 4 && (
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white border border-rose-100 p-8 rounded-[28px] text-center space-y-5 shadow-lg shadow-rose-200/10"
                  >
                    <div className="space-y-3">
                      <div className="inline-flex bg-rose-50 p-4 rounded-full text-4xl animate-bounce">
                        🎉
                      </div>
                      <h2 className="text-xl md:text-2xl font-display font-black text-gray-800">Հրաշալի է! ¡Excelente!</h2>
                      <p className="max-w-md mx-auto text-xs text-gray-500 leading-relaxed font-bold">
                        Դու բոլոր 4 զույգերը ճիշտ միացրիր և ստացար <strong className="text-[#FF5E89] font-black">+10 աստղ</strong>: Շարունակիր խաղալ նոր բառերով:
                      </p>
                    </div>

                    <div className="flex justify-center gap-4">
                      <button
                        id="match-next-btn"
                        onClick={initWordMatchGame}
                        className="bg-gradient-to-r from-[#FF5E89] to-[#FF8FAB] hover:scale-103 duration-150 text-white font-black uppercase tracking-wider px-6 py-3.5 rounded-2xl text-[11px] shadow-sm shadow-rose-200 cursor-pointer"
                      >
                        Հաջորդ բառերը / Следующий раунд
                      </button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* ✍️ GAME 2: WORD BUILDER (Հավաքիր բառը - Pink themed) */}
            {activeTab === 'word-builder' && builderTarget && (
              <motion.div
                key="word-builder-view"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-8"
              >
                <div className="bg-white/80 backdrop-blur-md p-6 rounded-[28px] border border-rose-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <span className="text-[9px] bg-rose-50 text-[#FF5E89] border border-rose-100/60 px-3 py-1 rounded-full font-black uppercase tracking-wider font-mono shadow-xs">
                      Խաղ 2 • GAME 2
                    </span>
                    <h2 className="text-lg md:text-xl font-display font-black text-gray-800 mt-2 flex items-center gap-2">
                      ✍️ Բառակազմ
                    </h2>
                    <p className="text-xs text-gray-500 font-semibold mt-1">
                      Տրված տառերից հավաքիր իսպաներեն թարգմանությունը համապատասխան հայերեն բառի համար:
                    </p>
                  </div>
                  <button 
                    onClick={initWordBuilderGame}
                    className="flex items-center gap-1.5 bg-rose-50/50 hover:bg-rose-50 border border-rose-100/80 text-[#FF5E89] px-4 py-2.5 rounded-xl text-xs font-black transition-all hover:scale-103 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Բաց թողնել</span>
                  </button>
                </div>

                {/* TARGET CARD PROMPT */}
                <div className="bg-white border border-rose-100 rounded-[24px] p-6 shadow-sm shadow-rose-100/20 flex flex-col items-center justify-center text-center space-y-4 relative overflow-hidden">
                  <span className="text-[9px] bg-rose-50 text-[#FF5E89] border border-rose-100/50 font-black px-3 py-1 rounded-full uppercase tracking-wider font-mono shadow-xs">
                    {builderTarget.category}
                  </span>
                  
                  <div className="space-y-1">
                    <span className="text-5xl block select-none" role="img" aria-label={builderTarget.es}>
                      {builderTarget.emoji}
                    </span>
                    <h3 className="text-2xl font-display font-black text-gray-850 tracking-tight">
                      {builderTarget.hy}
                    </h3>
                  </div>

                  {/* Toggleable hint section */}
                  {builderHintShown ? (
                    <motion.div 
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="bg-rose-50/40 text-rose-700 px-4 py-3 rounded-2xl border border-rose-100/50 text-[11px] text-center font-bold max-w-sm"
                    >
                      💡 Հուշում (Արտասանվում է <strong>{builderTarget.transliteration_hy}</strong>, սկսվում է <strong>«{builderTarget.es[0]}»</strong> տառով)
                    </motion.div>
                  ) : (
                    <button
                      id="builder-hint-btn"
                      onClick={() => { triggerSound('click'); setBuilderHintShown(true); }}
                      className="text-xs font-black text-[#FF5E89] hover:text-[#fe4774] hover:underline inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Lightbulb className="w-4 h-4 text-amber-500 stroke-[2]" />
                      <span>Ցույց տալ հուշումը</span>
                    </button>
                  )}
                </div>

                {/* SLOTS BOARD INDICATORS FOR COMPLETED LETTER DROPS */}
                <div className="flex flex-wrap justify-center gap-2 py-2">
                  {builderTarget.es.replace(/\s+/g, '').split('').map((_, idx) => {
                    const filled = selectedLetters[idx];
                    return (
                      <button
                        key={`slot-${idx}`}
                        disabled={builderStatus === 'correct'}
                        onClick={() => filled && handleRemoveBuilderLetter(filled)}
                        className={`w-11 h-13 md:w-13 md:h-15 flex items-center justify-center text-base md:text-lg font-black rounded-xl border transition-all cursor-pointer ${
                          filled 
                            ? builderStatus === 'correct'
                              ? 'bg-rose-50 border-rose-150 text-rose-500 shadow-xs'
                              : builderStatus === 'wrong'
                                ? 'bg-[#FFF0F3] border-rose-200 text-rose-500 animate-pulse'
                                : 'bg-white border-rose-150 text-gray-800 hover:border-[#FF5E89] shadow-xs'
                            : 'bg-rose-50/15 border-rose-100/40 border-dashed text-transparent'
                        }`}
                      >
                        {filled ? filled.char : ''}
                      </button>
                    );
                  })}
                </div>

                {/* AVAILABLE LETTERS TO CHOOSE FROM */}
                <div className="bg-white border border-rose-100 p-6 rounded-[24px] shadow-sm shadow-rose-200/5">
                  <p className="text-center text-[10px] text-gray-400 font-extrabold uppercase tracking-wider mb-4 font-mono">
                    Ընտրիր տառերը հերթականությամբ
                  </p>
                  
                  <div className="flex flex-wrap justify-center gap-2">
                    {availableLetters.map((item) => (
                      <button
                        key={item.id}
                        disabled={item.isUsed || builderStatus === 'correct'}
                        onClick={() => handleLetterTap(item)}
                        className={`w-11 h-11 flex items-center justify-center text-base font-black rounded-xl border transition-all cursor-pointer ${
                          item.isUsed 
                            ? 'bg-stone-50 border-stone-200 text-stone-350 opacity-20 cursor-not-allowed' 
                            : 'bg-white border-rose-100 text-gray-700 hover:text-[#FF5E89] hover:border-[#FF5E89] hover:scale-110 shadow-xs'
                        }`}
                      >
                        {item.char}
                      </button>
                    ))}
                  </div>

                  {/* Helper Actions controls */}
                  {selectedLetters.length > 0 && builderStatus !== 'correct' && (
                    <div className="flex items-center justify-center gap-2.5 mt-6">
                      <button
                        id="builder-clear-btn"
                        onClick={handleClearLetters}
                        className="text-stone-500 hover:text-stone-700 font-extrabold text-xs uppercase tracking-wider flex items-center gap-1.5 bg-rose-50/30 border border-rose-100 px-4.5 py-2.5 rounded-xl hover:scale-103 transition-all cursor-pointer shadow-xs"
                      >
                        <Undo2 className="w-4 h-4 stroke-[2]" />
                        <span>Մաքրել</span>
                      </button>
                      
                      <button
                        id="builder-check-btn"
                        onClick={checkBuilderWord}
                        className="bg-gradient-to-r from-[#FF5E89] to-[#FF8FAB] text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 px-6 py-2.5 rounded-xl hover:scale-103 transition-all cursor-pointer shadow-sm shadow-rose-200"
                      >
                        <Check className="w-4 h-4 stroke-[2]" />
                        <span>Ստուգել</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* GAME WORD BUILDER ANSWER OUTCOME STATE CARD */}
                <AnimatePresence>
                  {builderStatus === 'correct' && (
                    <motion.div
                       initial={{ scale: 0.95, opacity: 0 }}
                       animate={{ scale: 1, opacity: 1 }}
                       exit={{ scale: 0.95, opacity: 0 }}
                       className="bg-[#FFEAF0] text-[#2D2D2D] rounded-[32px] p-6 text-center space-y-4 shadow-[5px_5px_0px_0px_#2D2D2D] border-3 border-[#2D2D2D]"
                    >
                      <div className="inline-flex bg-white border-2 border-[#2D2D2D] p-3 rounded-full text-2xl shadow-[2px_2px_0px_0px_#2D2D2D]">
                        🏆
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-xl md:text-2xl font-display font-black">Ճիշտ է! ¡Excelente!</h3>
                        <p className="text-xs font-bold max-w-sm mx-auto opacity-90">
                          Դու հավաքեցիր <strong>{builderTarget.es}</strong> բառը և ստացար <strong className="text-[#FF5E89]">+5 աստղ</strong>!
                        </p>
                      </div>

                      {/* Pronunciations on correct panel builder */}
                      <div className="bg-white border-2 border-[#2D2D2D] p-4 rounded-2xl max-w-md mx-auto space-y-2 text-xs shadow-[2px_2px_0px_0px_#2D2D2D]">
                        <p className="font-mono flex flex-col items-center">
                          <span className="font-black text-base text-[#FF5E89]">🗣️ {builderTarget.es}</span>
                          <span className="text-stone-600 font-bold mt-1">🗣️ Արտասանվում է՝ {builderTarget.transliteration_hy}</span>
                        </p>
                        <p className="text-[11px] leading-relaxed opacity-90 italic">
                          {builderTarget.explanation_hy}
                        </p>
                      </div>

                      <div>
                        <button
                          id="builder-next-btn"
                          onClick={initWordBuilderGame}
                          className="bg-[#FF5E89] hover:bg-[#fe4774] font-black uppercase tracking-wider text-white px-6 py-2.5 rounded-xl text-xs shadow-[2.5px_2.5px_0px_0px_#2D2D2D] border-2 border-[#2D2D2D] transition-transform hover:-translate-y-0.5 active:translate-y-0.5 duration-100 cursor-pointer"
                        >
                          Խաղալ հաջորդ բառը / Дальше
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {builderStatus === 'wrong' && (
                    <motion.div
                      initial={{ y: 5, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 5, opacity: 0 }}
                      className="bg-[#FFF0F3] border-3 border-[#2D2D2D] p-5 rounded-[24px] text-center space-y-3 shadow-[4px_4px_0px_0px_#2D2D2D]"
                    >
                      <div className="inline-flex bg-white text-rose-600 p-2.5 rounded-full border-2 border-[#2D2D2D] shadow-[2px_2px_0px_0px_#2D2D2D]">
                        <XCircle className="w-5 h-5 animate-spin" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-rose-900 font-black text-sm">Սխալ է, փորձիր նորից ։(</h4>
                        <p className="text-rose-700 text-xs font-bold">Տառերի դասավորությունը սխալ է: Ստուգիր հուշումը կամ փոփոխիր տառերը:</p>
                      </div>
                      <button
                        id="builder-retry-btn"
                        onClick={handleClearLetters}
                        className="text-xs bg-white hover:bg-stone-50 text-[#2D2D2D] border-2 border-[#2D2D2D] shadow-[2px_2px_0px_0px_#2D2D2D] px-4 py-2 rounded-xl transition-all cursor-pointer hover:-translate-y-0.5 active:translate-y-0.5"
                      >
                        Մաքրել և փորձել
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* 🎯 GAME 3: EMOJI & TERM QUIZ (Վիկտորինա - Pink themed) */}
            {activeTab === 'quiz' && quizTarget && (
              <motion.div
                key="quiz-view"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-8"
              >
                <div className="bg-white/80 backdrop-blur-md p-6 rounded-[28px] border border-rose-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <span className="text-[9px] bg-rose-50 text-[#FF5E89] border border-rose-100/60 px-3 py-1 rounded-full font-black uppercase tracking-wider font-mono shadow-xs">
                      Խաղ 3 • GAME 3
                    </span>
                    <h2 className="text-lg md:text-xl font-display font-black text-gray-800 mt-2 flex items-center gap-2">
                      🎯 Էմոջի-Վիկտորինա / Викторина
                    </h2>
                    <p className="text-xs text-gray-500 font-semibold mt-1">
                      Ընտրիր ճիշտ իսպաներեն թարգմանությունը համապատասխան էմոջիի և բառի համար:
                    </p>
                  </div>
                  <button 
                    onClick={initQuizGame}
                    className="flex items-center gap-1.5 bg-rose-50/50 hover:bg-rose-50 border border-rose-100/80 text-[#FF5E89] px-4 py-2.5 rounded-xl text-xs font-black transition-all hover:scale-103 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Բաց թողնել / Пропустить</span>
                  </button>
                </div>

                {/* VISUAL QUESTION CONTAINER */}
                <div className="bg-white border border-rose-100 rounded-[24px] p-8 shadow-xs flex flex-col items-center justify-center text-center space-y-4">
                  <span className="text-5xl bg-rose-50/50 border border-rose-100 p-4.5 rounded-full select-none" role="img" aria-label="Question emoji">
                    {quizTarget.emoji}
                  </span>
                  
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-black tracking-widest text-rose-455 font-mono">Ինչպե՞ս կլինի իսպաներեն / Как на испанском</p>
                    <h3 className="text-2xl font-display font-black text-gray-800 tracking-tight">
                      « {quizTarget.hy} »
                    </h3>
                  </div>
                </div>

                {/* MULTIPLE CHOICE OPTIONS PANEL */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {quizOptions.map((option) => {
                    const isSelected = quizSelectedId === option.id;
                    const isCorrect = option.id === quizTarget.id;
                    
                    let bgBorderClass = 'bg-white border-rose-100 text-gray-700 hover:text-[#FF5E89] hover:border-[#FF5E89]/60 hover:bg-rose-50/20 shadow-xs hover:-translate-y-0.5';
                    if (quizSelectedId) {
                      if (isCorrect) {
                        bgBorderClass = 'bg-rose-50 border-[#FF5E89]/80 text-[#FF5E89] font-black shadow-xs';
                      } else if (isSelected) {
                        bgBorderClass = 'bg-[#FFF0F3] border-red-200 text-red-505 font-black';
                      } else {
                        bgBorderClass = 'border-dashed border-rose-100/40 text-gray-350 opacity-40 shadow-none pointer-events-none';
                      }
                    }

                    return (
                      <button
                        key={option.id}
                        id={`quiz-option-${option.id}`}
                        disabled={!!quizSelectedId}
                        onClick={() => handleQuizAnswer(option)}
                        className={`p-4.5 rounded-2xl border text-left justify-between items-center flex transition-all text-sm cursor-pointer duration-150 ${bgBorderClass}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs bg-rose-50 text-[#FF5E89] border border-rose-100 px-2.5 py-1 rounded-lg font-black font-mono">
                            {option.id === quizOptions[0].id ? 'A' : option.id === quizOptions[1].id ? 'B' : option.id === quizOptions[2].id ? 'C' : 'D'}
                          </span>
                          <span className="font-extrabold tracking-tight">{option.es}</span>
                        </div>

                        {/* Visual markers after answer */}
                        {quizSelectedId && isCorrect && (
                          <div className="bg-rose-100/50 rounded-full p-0.5">
                            <Check className="w-3.5 h-3.5 text-[#FF5E89] stroke-[3]" />
                          </div>
                        )}
                        {quizSelectedId && isSelected && !isCorrect && (
                          <div className="bg-red-50 rounded-full p-0.5">
                            <XCircle className="w-3.5 h-3.5 text-red-500 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* QUIZ RESPONSE DETAIL INFORMATION */}
                <AnimatePresence>
                  {quizSelectedId && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-6 rounded-[24px] border shadow-xs ${
                        quizCorrect 
                          ? 'bg-rose-50/40 border-rose-100' 
                          : 'bg-[#FFF0F3]/60 border-rose-100/80'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h4 className="font-black text-sm flex items-center gap-2">
                            {quizCorrect ? (
                              <>
                                <CheckCircle2 className="w-5 h-5 text-rose-500" />
                                <span className="text-gray-800">Ճիշտ է! (+5 աստղ) / Excelente</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-5 h-5 text-red-500" />
                                <span className="text-rose-900">Ոչ, սխալ պատասխան է:</span>
                              </>
                            )}
                          </h4>
                          
                          <p className="text-xs font-bold mt-1.5 text-gray-500">
                            Ճիշտ տարբերակն է՝ <strong className="font-mono text-sm underline text-[#FF5E89]">{quizTarget.es}</strong> ({quizTarget.hy}) — Արտասանվում է՝ <strong>«{quizTarget.transliteration_hy}»</strong>
                          </p>
                        </div>

                        <button
                          id="quiz-listen-voice-btn"
                          onClick={() => playVoice(quizTarget.es)}
                          className="self-start sm:self-center bg-white hover:bg-rose-50 text-[#FF5E89] border border-rose-100 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs hover:scale-103"
                        >
                          🔉 Լսել արտասանությունը
                        </button>
                      </div>

                      {/* Explanation content context */}
                      <p className="mt-4 text-xs border-t border-rose-100/80 pt-4 text-gray-500 leading-relaxed font-bold">
                        <strong>Մանրամասն / Подробнее:</strong> {quizTarget.explanation_hy}
                        {quizTarget.explanation_ru && (
                          <span className="block mt-1 text-slate-400 font-semibold italic">({quizTarget.explanation_ru})</span>
                        )}
                      </p>

                      <div className="mt-5 flex justify-end">
                        <button
                          id="quiz-next-question-btn"
                          onClick={initQuizGame}
                          className="bg-gradient-to-r from-[#FF5E89] to-[#FF8FAB] text-white font-black uppercase tracking-wider px-5 py-3 rounded-xl text-xs hover:scale-103 transition-all cursor-pointer shadow-sm shadow-rose-250"
                        >
                          Հաջորդ հարցը / Дальше
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* 📢 GAME 4: AUDIO CHALLENGE (Լսիր և ընտրիր - Pink themed) */}
            {activeTab === 'audio-quiz' && audioTarget && (
              <motion.div
                key="audio-quiz-view"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-8"
              >
                <div className="bg-white/80 backdrop-blur-md p-6 rounded-[28px] border border-rose-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <span className="text-[9px] bg-rose-50 text-[#FF5E89] border border-rose-100/60 px-3 py-1 rounded-full font-black uppercase tracking-wider font-mono shadow-xs">
                      Խաղ 4 • GAME 4
                    </span>
                    <h2 className="text-lg md:text-xl font-display font-black text-gray-800 mt-2 flex items-center gap-2">
                      📢 Լսիր և ընտրիր / Аудио-тест
                    </h2>
                    <p className="text-xs text-gray-500 font-semibold mt-1">
                      Լսիր արտասանվող իսպաներեն բառը և ընտրիր համապատասխան հայերեն թարգմանությունը:
                    </p>
                  </div>
                  <button 
                    onClick={initAudioGame}
                    className="flex items-center gap-1.5 bg-rose-50/50 hover:bg-rose-50 border border-rose-100/80 text-[#FF5E89] px-4 py-2.5 rounded-xl text-xs font-black transition-all hover:scale-103 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Բաց թողնել / Пропустить</span>
                  </button>
                </div>

                {/* AUDIO CONTROLLER CAPSULE */}
                <div className="bg-white border border-rose-100 rounded-[24px] p-8 shadow-sm flex flex-col items-center justify-center text-center space-y-6">
                  
                  {/* Speaker interactive button pulse */}
                  <button
                    id="audio-speaker-play-btn"
                    onClick={() => playVoice(audioTarget.es)}
                    className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#FF5E89] to-[#FF8FAB] flex items-center justify-center text-white shadow-md shadow-rose-200 hover:scale-105 active:scale-95 duration-100 cursor-pointer"
                    title="Լսել բառը / Прослушать"
                  >
                    <Volume2 className="w-9 h-9 stroke-[2]" />
                  </button>

                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-black tracking-widest text-rose-455 font-mono">Կտտացրեք նվագարկելու համար</p>
                    <h3 className="text-xs font-black text-gray-400">
                      (Ունկնդրիր բառը ուշադիր / Послушайте внимательно)
                    </h3>
                  </div>

                  {/* Verbal pronunciation hint help if TTS voice synthesis is absent */}
                  {audioHintToggle ? (
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="bg-rose-50/50 text-rose-700 px-4 py-2.5 rounded-xl border border-rose-100/50 text-xs font-bold"
                    >
                      🗣️ Արտասանության հուշում՝ <em className="not-italic font-mono underline text-[#FF5E89]">« {audioTarget.transliteration_hy} »</em>
                    </motion.div>
                  ) : (
                    <button
                      id="audio-hint-reveal-btn"
                      onClick={() => { triggerSound('click'); setAudioHintToggle(true); }}
                      className="text-xs font-black text-[#FF5E89]/80 hover:text-[#FF5E89] cursor-pointer flex items-center justify-center gap-1 hover:underline pt-2"
                    >
                      <span>Չլսեցի՞ք: Ցույց տալ գրավոր տառադարձումը</span>
                    </button>
                  )}
                </div>

                {/* OPTIONS SELECTION DECK */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {audioOptions.map((option) => {
                    const isSelected = audioSelectedId === option.id;
                    const isCorrect = option.id === audioTarget.id;

                    let bgBorderClass = 'bg-white border-rose-100 text-gray-700 hover:text-[#FF5E89] hover:border-[#FF5E89]/60 hover:bg-rose-50/20 shadow-xs hover:-translate-y-0.5 duration-150';
                    if (audioSelectedId) {
                      if (isCorrect) {
                        bgBorderClass = 'bg-rose-50 border-[#FF5E89]/80 text-[#FF5E89] font-black shadow-xs';
                      } else if (isSelected) {
                        bgBorderClass = 'bg-[#FFF0F3] border-red-200 text-red-500 font-black';
                      } else {
                        bgBorderClass = 'border-dashed border-rose-100/40 text-gray-300 opacity-40 shadow-none pointer-events-none';
                      }
                    }

                    return (
                      <button
                        key={option.id}
                        id={`audio-option-${option.id}`}
                        disabled={!!audioSelectedId}
                        onClick={() => handleAudioAnswer(option)}
                        className={`p-4 rounded-2xl border text-left justify-between items-center flex transition-all text-sm cursor-pointer duration-150 ${bgBorderClass}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-3xl bg-rose-50/50 border border-rose-100 p-1.5 rounded-xl select-none" role="img" aria-label={option.es}>
                            {option.emoji}
                          </span>
                          <div>
                            <p className="text-[9px] text-[#FF5E89] uppercase tracking-widest font-black font-mono">{option.category}</p>
                            <span className="font-extrabold text-gray-705">{option.hy}</span>
                          </div>
                        </div>

                        {/* Status Check Icons */}
                        {audioSelectedId && isCorrect && (
                          <div className="bg-rose-100/55 rounded-full p-0.5">
                            <Check className="w-3.5 h-3.5 text-[#FF5E89] stroke-[3]" />
                          </div>
                        )}
                        {audioSelectedId && isSelected && !isCorrect && (
                          <div className="bg-red-50 rounded-full p-0.5">
                            <XCircle className="w-3.5 h-3.5 text-red-500 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* AUDIO CHALLENGE RESPONSE DETAIL INFORMATION */}
                <AnimatePresence>
                  {audioSelectedId && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-6 rounded-[24px] border shadow-xs ${
                        audioCorrect 
                          ? 'bg-rose-50/40 border-rose-100' 
                          : 'bg-[#FFF0F3]/60 border-rose-100/80'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h4 className="font-black text-sm flex items-center gap-2">
                            {audioCorrect ? (
                              <>
                                <CheckCircle2 className="w-5 h-5 text-rose-500" />
                                <span className="text-gray-800">Լիովին Ճիշտ է! (+5 աստղ) / Excelente</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-5 h-5 text-red-500" />
                                <span className="text-rose-900">Սխալվեցիր, բայց սա լավ առիթ է սովորելու։</span>
                              </>
                            )}
                          </h4>
                          
                          <p className="text-xs font-bold mt-1.5 text-gray-500">
                            Հնչող բառն էր՝ <strong className="font-mono text-sm underline text-[#FF5E89]">{audioTarget.es}</strong> ({audioTarget.hy}) — Արտասանվում է՝ <strong>«{audioTarget.transliteration_hy}»</strong>
                          </p>
                        </div>
                        <button
                          id="audio-repeat-voice"
                          onClick={() => playVoice(audioTarget.es)}
                          className="self-start sm:self-center bg-white hover:bg-rose-50 text-[#FF5E89] border border-rose-100 px-4 py-2 rounded-xl text-xs font-black shadow-xs hover:scale-103 transition-all cursor-pointer"
                        >
                          🔊 Կրկնել
                        </button>
                      </div>

                      {/* Explicit category content note */}
                      <p className="mt-4 text-xs border-t border-rose-100/80 pt-4 text-gray-500 leading-relaxed font-bold">
                        <strong>Բացատրություն:</strong> {audioTarget.explanation_hy}
                      </p>

                      <div className="mt-5 flex justify-end">
                        <button
                          id="audio-next-question-btn"
                          onClick={initAudioGame}
                          className="bg-gradient-to-r from-[#FF5E89] to-[#FF8FAB] text-white font-black uppercase tracking-wider px-5 py-3 rounded-xl text-xs hover:scale-103 transition-all cursor-pointer shadow-sm shadow-rose-250"
                        >
                          Հաջորդ բառը
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </main>

      {/* DETAILED WORD POPUP OVERLAY INFO MODAL */}
      <AnimatePresence>
        {selectedWord && (
          <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-rose-100 rounded-[28px] max-w-lg w-full p-6 shadow-xl space-y-5 relative"
            >
              <button
                id="word-modal-close"
                onClick={() => { triggerSound('click'); setSelectedWord(null); }}
                className="absolute top-4 right-4 text-stone-400 hover:text-[#FF5E89] hover:bg-rose-50/50 w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer font-bold text-lg"
              >
                ×
              </button>

              <div className="flex items-center gap-4 pt-1">
                <span className="text-4xl bg-rose-50/50 border border-rose-100 p-3 rounded-2xl block select-none" role="img">
                  {selectedWord.emoji}
                </span>
                <div>
                  <span className="text-[9px] bg-rose-50 text-[#FF5E89] border border-rose-100/50 px-2.5 py-1 rounded-full font-black uppercase tracking-wider font-mono">
                    {selectedWord.category}
                  </span>
                  <h3 className="text-2xl font-display font-black text-gray-800 mt-2">{selectedWord.es}</h3>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-rose-100">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-rose-50/30 p-3.5 rounded-xl border border-rose-100/50 col-span-2 sm:col-span-1">
                    <p className="text-[9px] text-[#FF5E89]/80 font-black uppercase tracking-wider font-mono">🇦🇲 Հայերեն</p>
                    <p className="text-sm font-extrabold text-gray-800 mt-1">{selectedWord.hy}</p>
                  </div>
                  <div className="bg-rose-50/30 p-3.5 rounded-xl border border-rose-100/50 col-span-2 sm:col-span-1">
                    <p className="text-[9px] text-[#FF5E89]/80 font-black uppercase tracking-wider font-mono">🗣️ Արտասանություն</p>
                    <p className="text-[11px] font-mono font-black text-[#FF5E89] mt-1">
                      [{selectedWord.transliteration_hy}]
                    </p>
                  </div>
                </div>

                {/* Cultural/Grammar detail */}
                <div className="space-y-1 text-xs bg-rose-50/30 p-4.5 rounded-xl border border-rose-100/50">
                  <h4 className="font-black text-gray-750 flex items-center gap-1.5">
                    📖 Բացատրություն
                  </h4>
                  <p className="text-gray-600 leading-relaxed font-bold">
                    {selectedWord.explanation_hy}
                  </p>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2.5 z-10 relative">
                <button
                  id="word-modal-speak"
                  onClick={() => playVoice(selectedWord.es)}
                  className="bg-gradient-to-r from-[#FF5E89] to-[#FF8FAB] text-white font-black text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm shadow-rose-200 font-black hover:scale-103 transition-all cursor-pointer"
                >
                  <Volume2 className="w-4 h-4 stroke-[2]" />
                  <span>Լսել</span>
                </button>
                <button
                  id="word-modal-ok-close"
                  onClick={() => { triggerSound('click'); setSelectedWord(null); }}
                  className="bg-rose-100/80 hover:bg-rose-200/50 text-[#FF5E89] font-black text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl cursor-pointer hover:scale-103 transition-all"
                >
                  Փակել
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRM RESET MODAL */}
      <AnimatePresence>
        {showResetConfirm && (
          <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-rose-100 rounded-[28px] max-w-sm w-full p-6 shadow-xl space-y-5 text-center relative"
            >
              <button
                onClick={() => { triggerSound('click'); setShowResetConfirm(false); }}
                className="absolute top-4 right-4 text-stone-400 hover:text-[#FF5E89] hover:bg-rose-50/50 w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer font-bold text-lg"
              >
                ×
              </button>

              <div className="mx-auto w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-[#FF5E89] mb-2 scale-110">
                <RotateCcw className="w-6 h-6 stroke-[2]" />
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-display font-black text-gray-800">Զրոյացնե՞լ առաջընթացը</h3>
                <p className="text-xs text-gray-500 font-semibold leading-relaxed">
                  Դուք պատրաստվում եք զրոյացնել ձեր բոլոր աստղերը և առաջընթացը։ Այս գործողությունը հնարավոր չէ չեղարկել։
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    triggerSound('click');
                    setStars(0);
                    setStreak(0);
                    localStorage.removeItem('arm_esp_stars');
                    localStorage.removeItem('arm_esp_streak');
                    setShowResetConfirm(false);
                  }}
                  className="flex-1 bg-gradient-to-r from-red-500 to-[#FF5E89] text-white font-black text-xs uppercase tracking-wider py-3 rounded-xl hover:scale-103 transition-all cursor-pointer shadow-sm"
                >
                  Այո
                </button>
                <button
                  onClick={() => {
                    triggerSound('click');
                    setShowResetConfirm(false);
                  }}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-black text-xs uppercase tracking-wider py-3 rounded-xl cursor-pointer hover:scale-103 transition-all"
                >
                  Չեղարկել
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FOOTER BRIDGES EXPOSITIONS */}
      <footer className="text-center text-[#2D2D2D]/55 text-xs py-10 space-y-2 border-t-3 border-[#2D2D2D]/10 mt-16 max-w-4xl mx-auto">
        <div className="flex justify-center items-center gap-2 text-sm text-[#2D2D2D]/80 font-semibold mb-1">
          <span>🇪🇸</span>
          <span className="text-[#2D2D2D]/35">🤝</span>
          <span>🇦🇲</span>
        </div>
        <p className="font-black text-[13px] text-[#2D2D2D]">Aprende Español A1 - Ստեղծված է բառերը զվարճալի և արագ սովորելու համար:</p>
        <p className="text-[11px] font-bold text-[#2D2D2D]/60 pt-0.5">Բոլոր նյութերը հարմարեցված են A1 մակարդակի սկսնակների համար:</p>
      </footer>
      
    </div>
  );
}
