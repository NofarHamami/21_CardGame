import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Animated,
  Platform,
  useWindowDimensions,
  Switch,
} from 'react-native';
import { colors } from '../theme/colors';

type Language = 'he' | 'en';

interface TutorialStep {
  title: string;
  body: string;
  illustration: 'welcome' | 'hand' | 'center' | 'pile21' | 'storage' | 'endTurn' | 'drag' | 'kings';
}

const STEPS_HE: TutorialStep[] = [
  {
    title: 'ברוכים הבאים!',
    body: 'במשחק 21, המטרה שלך היא לסיים את ערימת ה-21 קלפים שלך לפני היריבים.',
    illustration: 'welcome',
  },
  {
    title: 'היד שלך',
    body: 'יש לך עד 5 קלפים ביד. הקש על קלף כדי לבחור אותו, ואז הקש על יעד כדי לשחק.',
    illustration: 'hand',
  },
  {
    title: 'גרירת קלפים',
    body: 'אפשר גם לגרור קלף ישירות מהיד לערימה מרכזית או לאחסון.',
    illustration: 'drag',
  },
  {
    title: 'ערימות מרכזיות',
    body: 'בנה ערימות מ-A עד Q. כשערימה מגיעה ל-Q, היא מתרוקנת והקלפים חוזרים לחפיסה.',
    illustration: 'center',
  },
  {
    title: 'מלך = ג\'וקר',
    body: 'מלך (K) הוא קלף ג\'וקר שמתאים לכל ערימה מרכזית. ניתן להתחיל ערימה עם מלך או לשחק אותו במקום כל קלף.',
    illustration: 'kings',
  },
  {
    title: 'ערימת ה-21',
    body: 'הקלף העליון בערימת ה-21 שלך ניתן לשחק למרכז. רוקן אותה כדי לנצח!',
    illustration: 'pile21',
  },
  {
    title: 'אחסון',
    body: 'ניתן לאחסן קלפים מהיד ב-5 מקומות אחסון. אחסון קלף מסיים את התור.',
    illustration: 'storage',
  },
  {
    title: 'סיום תור',
    body: 'עליך לשחק לפחות קלף אחד בכל תור. לא ניתן לסיים עם 5 קלפים ביד.',
    illustration: 'endTurn',
  },
];

const STEPS_EN: TutorialStep[] = [
  {
    title: 'Welcome!',
    body: 'In the 21 Card Game, your goal is to empty your 21-card pile before your opponents.',
    illustration: 'welcome',
  },
  {
    title: 'Your Hand',
    body: 'You hold up to 5 cards. Tap a card to select it, then tap a destination to play.',
    illustration: 'hand',
  },
  {
    title: 'Drag & Drop',
    body: 'You can also drag a card directly from your hand to a center pile or storage slot.',
    illustration: 'drag',
  },
  {
    title: 'Center Piles',
    body: 'Build piles from Ace to Queen. When a pile reaches Queen, it clears and cards return to the stock.',
    illustration: 'center',
  },
  {
    title: 'Kings = Wild',
    body: 'Kings (K) are wild cards that fit on any center pile. You can start a pile with a King or play it in place of any card.',
    illustration: 'kings',
  },
  {
    title: 'Your 21-Pile',
    body: 'The top card of your 21-pile can be played to center. Empty it to win!',
    illustration: 'pile21',
  },
  {
    title: 'Storage',
    body: 'Store hand cards in 5 storage slots. Playing to storage ends your turn.',
    illustration: 'storage',
  },
  {
    title: 'Ending a Turn',
    body: 'You must play at least one card each turn. You cannot end with 5 cards in hand.',
    illustration: 'endTurn',
  },
];

function MiniCard({ rank, suit, highlight, small }: { rank: string; suit: string; highlight?: boolean; small?: boolean }) {
  const isRed = suit === '♥' || suit === '♦';
  const w = small ? 32 : 42;
  const h = small ? 48 : 62;
  return (
    <View style={[miniStyles.card, { width: w, height: h }, highlight && miniStyles.cardHighlight]}>
      <Text style={[miniStyles.rank, { color: isRed ? '#c0392b' : '#2c3e50', fontSize: small ? 11 : 13 }]}>{rank}</Text>
      <Text style={[miniStyles.suit, { color: isRed ? '#c0392b' : '#2c3e50', fontSize: small ? 12 : 16 }]}>{suit}</Text>
    </View>
  );
}

function FaceDownCard({ count, small }: { count?: number; small?: boolean }) {
  const w = small ? 32 : 42;
  const h = small ? 48 : 62;
  return (
    <View style={[miniStyles.faceDown, { width: w, height: h }]}>
      <Text style={miniStyles.faceDownStar}>✦</Text>
      {count != null && <Text style={miniStyles.faceDownCount}>{count}</Text>}
    </View>
  );
}

function EmptySlot({ label, small }: { label?: string; small?: boolean }) {
  const w = small ? 32 : 42;
  const h = small ? 48 : 62;
  return (
    <View style={[miniStyles.emptySlot, { width: w, height: h }]}>
      {label && <Text style={miniStyles.emptyLabel}>{label}</Text>}
    </View>
  );
}

function ArrowDown() {
  return <Text style={miniStyles.arrow}>↓</Text>;
}

function Illustration({ type, language }: { type: TutorialStep['illustration']; language: Language }) {
  const isHe = language === 'he';
  switch (type) {
    case 'welcome':
      return (
        <View style={miniStyles.illustrationRow}>
          <FaceDownCard count={21} />
          <Text style={miniStyles.vs}>{isHe ? 'נגד' : 'vs'}</Text>
          <FaceDownCard count={21} />
        </View>
      );
    case 'hand':
      return (
        <View style={miniStyles.illustrationCol}>
          <View style={miniStyles.illustrationRow}>
            <MiniCard rank="3" suit="♥" />
            <MiniCard rank="7" suit="♠" highlight />
            <MiniCard rank="Q" suit="♦" />
            <MiniCard rank="5" suit="♣" />
            <MiniCard rank="K" suit="♥" />
          </View>
          <ArrowDown />
          <Text style={miniStyles.hint}>{isHe ? 'הקש לבחירה, ואז הקש על יעד' : 'Tap to select, then tap target'}</Text>
        </View>
      );
    case 'drag':
      return (
        <View style={miniStyles.illustrationCol}>
          <View style={miniStyles.illustrationRow}>
            <MiniCard rank="7" suit="♠" highlight />
            <Text style={miniStyles.dragArrow}>⟹</Text>
            <MiniCard rank="6" suit="♥" small />
          </View>
          <Text style={miniStyles.hint}>{isHe ? 'גרור קלף ישירות ליעד' : 'Drag card directly to target'}</Text>
        </View>
      );
    case 'center':
      return (
        <View style={miniStyles.illustrationCol}>
          <View style={miniStyles.illustrationRow}>
            <MiniCard rank="A" suit="♠" />
            <MiniCard rank="3" suit="♥" />
            <EmptySlot label={isHe ? 'A?' : 'A?'} />
            <MiniCard rank="K" suit="♣" highlight />
          </View>
          <Text style={miniStyles.hint}>{isHe ? "A ← 2 ← 3 ← ... ← Q (K = ג'וקר)" : 'A → 2 → 3 → ... → Q (K = wild)'}</Text>
        </View>
      );
    case 'kings':
      return (
        <View style={miniStyles.illustrationCol}>
          <View style={miniStyles.illustrationRow}>
            <MiniCard rank="K" suit="♠" highlight />
            <Text style={miniStyles.dragArrow}>→</Text>
            <MiniCard rank="5" suit="♥" small />
          </View>
          <View style={[miniStyles.illustrationRow, { marginTop: 4 }]}>
            <MiniCard rank="K" suit="♦" highlight />
            <Text style={miniStyles.dragArrow}>→</Text>
            <EmptySlot small label="?" />
          </View>
          <Text style={miniStyles.hint}>{isHe ? 'K מתאים לכל ערימה ולכל מיקום' : 'K fits any pile at any position'}</Text>
        </View>
      );
    case 'pile21':
      return (
        <View style={miniStyles.illustrationCol}>
          <View style={miniStyles.illustrationRow}>
            <View style={miniStyles.stackedPile}>
              <FaceDownCard count={20} small />
              <View style={miniStyles.stackedTop}>
                <MiniCard rank="4" suit="♦" highlight small />
              </View>
            </View>
            <ArrowDown />
            <MiniCard rank="3" suit="♥" small />
          </View>
          <Text style={miniStyles.hint}>{isHe ? 'שחק את הקלף העליון לערימות המרכזיות' : 'Play top card to center piles'}</Text>
        </View>
      );
    case 'storage':
      return (
        <View style={miniStyles.illustrationCol}>
          <View style={miniStyles.illustrationRow}>
            <MiniCard rank="9" suit="♠" small />
            <EmptySlot small />
            <MiniCard rank="2" suit="♥" small />
            <EmptySlot small />
            <EmptySlot small />
          </View>
          <Text style={miniStyles.hint}>{isHe ? '5 מקומות אחסון (מסיים תור)' : '5 storage slots (ends your turn)'}</Text>
        </View>
      );
    case 'endTurn':
      return (
        <View style={miniStyles.illustrationCol}>
          <View style={miniStyles.illustrationRow}>
            <View style={miniStyles.ruleBox}>
              <Text style={miniStyles.ruleIcon}>1+</Text>
              <Text style={miniStyles.ruleLabel}>{isHe ? 'קלפים' : 'card(s)'}</Text>
            </View>
            <View style={miniStyles.ruleBox}>
              <Text style={miniStyles.ruleIcon}>≠5</Text>
              <Text style={miniStyles.ruleLabel}>{isHe ? 'ביד' : 'in hand'}</Text>
            </View>
          </View>
        </View>
      );
    default:
      return null;
  }
}

interface TutorialProps {
  visible: boolean;
  onClose: () => void;
  language: Language;
  onDontShowAgain?: (dismissed: boolean) => void;
  showDontShowAgain?: boolean;
}

export function Tutorial({ visible, onClose, language, onDontShowAgain, showDontShowAgain = true }: TutorialProps) {
  const { width: screenWidth } = useWindowDimensions();
  const [step, setStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setStep(0);
      fadeAnim.setValue(0);
      slideAnim.setValue(0);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 60, friction: 8 }),
      ]).start();
    }
  }, [visible, fadeAnim, slideAnim]);

  const steps = language === 'he' ? STEPS_HE : STEPS_EN;
  const current = steps[step];
  const isLast = step === steps.length - 1;
  const isFirst = step === 0;

  const animateTransition = (newStep: number, direction: 'next' | 'prev') => {
    if (isAnimating) return;
    setIsAnimating(true);
    const slideOut = direction === 'next' ? -30 : 30;
    const slideIn = direction === 'next' ? 30 : -30;

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: slideOut, duration: 120, useNativeDriver: true }),
    ]).start(() => {
      setStep(newStep);
      slideAnim.setValue(slideIn);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      ]).start(() => setIsAnimating(false));
    });
  };

  const handleClose = () => {
    if (dontShowAgain && onDontShowAgain) {
      onDontShowAgain(true);
    }
    onClose();
  };

  const handleNext = () => {
    if (isAnimating) return;
    if (isLast) {
      handleClose();
    } else {
      animateTransition(step + 1, 'next');
    }
  };

  const handlePrev = () => {
    if (isAnimating) return;
    if (!isFirst) {
      animateTransition(step - 1, 'prev');
    }
  };

  if (!visible || !current) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={tutStyles.overlay}>
        <View style={[tutStyles.card, { width: Math.min(380, screenWidth - 48) }]}>
          {/* Progress dots */}
          <View style={tutStyles.progressDots}>
            {steps.map((_, i) => (
              <View
                key={i}
                style={[tutStyles.dot, i === step && tutStyles.dotActive, i < step && tutStyles.dotCompleted]}
              />
            ))}
          </View>

          <Animated.View style={[tutStyles.stepContent, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}>
            <Text style={tutStyles.title}>{current.title}</Text>
            <View style={tutStyles.illustrationContainer}>
              <Illustration type={current.illustration} language={language} />
            </View>
            <Text style={tutStyles.body}>{current.body}</Text>
          </Animated.View>

          <View style={[tutStyles.buttons, language === 'he' && tutStyles.buttonsRTL]}>
            <Pressable
              style={[tutStyles.btn, tutStyles.btnSecondary, isFirst && tutStyles.btnHidden]}
              onPress={handlePrev}
              disabled={isFirst || isAnimating}
              accessibilityRole="button"
              accessibilityLabel={language === 'he' ? 'הקודם' : 'Previous'}
            >
              <Text style={tutStyles.btnSecondaryText}>
                {language === 'he' ? 'הקודם' : 'Back'}
              </Text>
            </Pressable>

            <Pressable
              style={[tutStyles.btn, tutStyles.btnPrimary]}
              onPress={handleNext}
              disabled={isAnimating}
              accessibilityRole="button"
              accessibilityLabel={isLast ? (language === 'he' ? 'סיום' : 'Done') : (language === 'he' ? 'הבא' : 'Next')}
            >
              <Text style={tutStyles.btnPrimaryText}>
                {isLast
                  ? (language === 'he' ? 'בואו נשחק!' : "Let's Play!")
                  : (language === 'he' ? 'הבא' : 'Next')}
              </Text>
            </Pressable>
          </View>

          {/* Don't show again + Skip */}
          <View style={tutStyles.bottomRow}>
            {showDontShowAgain && (
              <View style={tutStyles.dontShowRow}>
                <Switch
                  value={dontShowAgain}
                  onValueChange={setDontShowAgain}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#ffffff"
                  style={{ transform: [{ scale: 0.8 }] }}
                  accessibilityLabel={language === 'he' ? 'אל תציג שוב' : "Don't show again"}
                />
                <Text style={tutStyles.dontShowText}>
                  {language === 'he' ? 'אל תציג שוב' : "Don't show again"}
                </Text>
              </View>
            )}

            <Pressable
              style={tutStyles.skipBtn}
              onPress={handleClose}
              accessibilityRole="button"
              accessibilityLabel={language === 'he' ? 'דלג' : 'Skip tutorial'}
            >
              <Text style={tutStyles.skipText}>{language === 'he' ? 'דלג' : 'Skip'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const miniStyles = StyleSheet.create({
  card: {
    backgroundColor: '#f5f0e8',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#d0c8b8',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHighlight: {
    borderColor: colors.gold,
    borderWidth: 2,
    shadowColor: colors.gold,
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  rank: {
    fontWeight: 'bold',
  },
  suit: {},
  faceDown: {
    backgroundColor: colors.secondary,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceDownStar: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
  faceDownCount: {
    fontSize: 10,
    color: colors.gold,
    fontWeight: 'bold',
    position: 'absolute',
    bottom: 2,
  },
  emptySlot: {
    borderRadius: 5,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: `${colors.mutedForeground}66`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyLabel: {
    fontSize: 10,
    color: colors.mutedForeground,
  },
  illustrationRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationCol: {
    alignItems: 'center',
    gap: 6,
  },
  arrow: {
    fontSize: 20,
    color: colors.gold,
    fontWeight: 'bold',
  },
  dragArrow: {
    fontSize: 20,
    color: colors.gold,
    fontWeight: 'bold',
  },
  vs: {
    fontSize: 16,
    color: colors.mutedForeground,
    fontWeight: 'bold',
    marginHorizontal: 8,
  },
  hint: {
    fontSize: 11,
    color: colors.mutedForeground,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  stackedPile: {
    position: 'relative',
    width: 40,
    height: 58,
  },
  stackedTop: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  ruleBox: {
    backgroundColor: colors.secondary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  ruleIcon: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.gold,
  },
  ruleLabel: {
    fontSize: 11,
    color: colors.mutedForeground,
    marginTop: 2,
  },
});

const tutStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: 28,
    maxWidth: 380,
    borderWidth: 2,
    borderColor: colors.gold,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 20,
    alignItems: 'center',
  },
  progressDots: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.gold,
    width: 24,
    borderRadius: 4,
  },
  dotCompleted: {
    backgroundColor: colors.primary,
  },
  stepContent: {
    alignItems: 'center',
    minHeight: 100,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.gold,
    marginBottom: 16,
    textAlign: 'center',
  },
  illustrationContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: `${colors.secondary}88`,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 220,
    alignItems: 'center',
  },
  body: {
    fontSize: 16,
    color: colors.foreground,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  buttonsRTL: {
    flexDirection: 'row-reverse',
  },
  btnHidden: {
    opacity: 0,
  },
  btn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    minWidth: 100,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  } as any,
  btnPrimary: {
    backgroundColor: colors.gold,
  },
  btnPrimaryText: {
    color: colors.background,
    fontWeight: 'bold',
    fontSize: 16,
  },
  btnSecondary: {
    backgroundColor: colors.secondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnSecondaryText: {
    color: colors.foreground,
    fontWeight: '600',
    fontSize: 16,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 16,
  },
  dontShowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dontShowText: {
    color: colors.mutedForeground,
    fontSize: 12,
  },
  skipBtn: {
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  } as any,
  skipText: {
    color: colors.mutedForeground,
    fontSize: 14,
  },
});
