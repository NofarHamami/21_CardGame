import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { colors } from '../theme/colors';

type Language = 'he' | 'en';

const STEPS_HE = [
  {
    title: 'ברוכים הבאים! 🎴',
    body: 'במשחק 21, המטרה שלך היא לסיים את ערימת ה-21 קלפים שלך לפני היריבים.',
  },
  {
    title: 'היד שלך ✋',
    body: 'יש לך עד 5 קלפים ביד. הקש על קלף כדי לבחור אותו, ואז הקש על יעד כדי לשחק.',
  },
  {
    title: 'ערימות מרכזיות 🃏',
    body: 'בנה ערימות מ-A עד Q. מלך הוא ג\'וקר ומתאים לכל ערימה.',
  },
  {
    title: 'ערימת ה-21 ⭐',
    body: 'הקלף העליון בערימת ה-21 שלך ניתן לשחק למרכז. רוקן אותה כדי לנצח!',
  },
  {
    title: 'אחסון 📦',
    body: 'ניתן לאחסן קלפים מהיד ב-5 מקומות אחסון. אחסון קלף מסיים את התור.',
  },
  {
    title: 'סיום תור ✅',
    body: 'עליך לשחק לפחות קלף אחד בכל תור. לא ניתן לסיים עם 5 קלפים ביד.',
  },
];

const STEPS_EN = [
  {
    title: 'Welcome! 🎴',
    body: 'In the 21 Card Game, your goal is to empty your 21-card pile before your opponents.',
  },
  {
    title: 'Your Hand ✋',
    body: 'You hold up to 5 cards. Tap a card to select it, then tap a destination to play.',
  },
  {
    title: 'Center Piles 🃏',
    body: 'Build piles from Ace to Queen. Kings are wild and fit on any pile.',
  },
  {
    title: 'Your 21-Pile ⭐',
    body: 'The top card of your 21-pile can be played to center. Empty it to win!',
  },
  {
    title: 'Storage 📦',
    body: 'Store hand cards in 5 storage slots. Playing to storage ends your turn.',
  },
  {
    title: 'Ending a Turn ✅',
    body: 'You must play at least one card each turn. You cannot end with 5 cards in hand.',
  },
];

interface TutorialProps {
  visible: boolean;
  onClose: () => void;
  language: Language;
}

export function Tutorial({ visible, onClose, language }: TutorialProps) {
  const [step, setStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
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
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: slideOut, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setStep(newStep);
      slideAnim.setValue(slideIn);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
      ]).start(() => setIsAnimating(false));
    });
  };

  const handleNext = () => {
    if (isAnimating) return;
    if (isLast) {
      onClose();
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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Progress dots */}
          <View style={styles.progressDots}>
            {steps.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === step && styles.dotActive, i < step && styles.dotCompleted]}
              />
            ))}
          </View>

          <Animated.View style={[styles.stepContent, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}>
            <Text style={styles.title}>{current.title}</Text>
            <Text style={styles.body}>{current.body}</Text>
          </Animated.View>

          <View style={[styles.buttons, language === 'he' && styles.buttonsRTL]}>
            <Pressable
              style={[styles.btn, styles.btnSecondary, isFirst && styles.btnHidden]}
              onPress={handlePrev}
              disabled={isFirst || isAnimating}
              accessibilityRole="button"
              accessibilityLabel={language === 'he' ? 'הקודם' : 'Previous'}
            >
              <Text style={styles.btnSecondaryText}>
                {language === 'he' ? 'הקודם' : 'Back'}
              </Text>
            </Pressable>

            <Pressable
              style={[styles.btn, styles.btnPrimary]}
              onPress={handleNext}
              disabled={isAnimating}
              accessibilityRole="button"
              accessibilityLabel={isLast ? (language === 'he' ? 'סיום' : 'Done') : (language === 'he' ? 'הבא' : 'Next')}
            >
              <Text style={styles.btnPrimaryText}>
                {isLast
                  ? (language === 'he' ? 'בואו נשחק!' : "Let's Play!")
                  : (language === 'he' ? 'הבא' : 'Next')}
              </Text>
            </Pressable>
          </View>

          <Pressable
            style={styles.skipBtn}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={language === 'he' ? 'דלג' : 'Skip tutorial'}
          >
            <Text style={styles.skipText}>{language === 'he' ? 'דלג' : 'Skip'}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const styles = StyleSheet.create({
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
    width: Math.min(380, SCREEN_WIDTH - 48),
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
  skipBtn: {
    marginTop: 16,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  } as any,
  skipText: {
    color: colors.mutedForeground,
    fontSize: 14,
  },
});
