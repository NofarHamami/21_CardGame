import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';
import { colors } from '../theme/colors';
import { loadLanguagePreference } from '../utils/storage';

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
}

export function Tutorial({ visible, onClose }: TutorialProps) {
  const [step, setStep] = useState(0);
  const [language, setLanguage] = useState<Language>('he');
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadLanguagePreference().then(setLanguage);
  }, []);

  useEffect(() => {
    if (visible) {
      setStep(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, fadeAnim]);

  const steps = language === 'he' ? STEPS_HE : STEPS_EN;
  const current = steps[step];
  const isLast = step === steps.length - 1;

  const handleNext = () => {
    if (isLast) {
      onClose();
    } else {
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
      setStep(s => s + 1);
    }
  };

  const handlePrev = () => {
    if (step > 0) {
      setStep(s => s - 1);
    }
  };

  if (!visible || !current) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
          <Text style={styles.stepIndicator}>
            {step + 1} / {steps.length}
          </Text>
          <Text style={styles.title}>{current.title}</Text>
          <Text style={styles.body}>{current.body}</Text>

          <View style={styles.buttons}>
            {step > 0 && (
              <TouchableOpacity
                style={[styles.btn, styles.btnSecondary]}
                onPress={handlePrev}
                accessibilityRole="button"
                accessibilityLabel={language === 'he' ? 'הקודם' : 'Previous'}
              >
                <Text style={styles.btnSecondaryText}>
                  {language === 'he' ? 'הקודם' : 'Back'}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary]}
              onPress={handleNext}
              accessibilityRole="button"
              accessibilityLabel={isLast ? (language === 'he' ? 'סיום' : 'Done') : (language === 'he' ? 'הבא' : 'Next')}
            >
              <Text style={styles.btnPrimaryText}>
                {isLast
                  ? (language === 'he' ? 'בואו נשחק!' : "Let's Play!")
                  : (language === 'he' ? 'הבא' : 'Next')}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.skipBtn}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={language === 'he' ? 'דלג' : 'Skip tutorial'}
          >
            <Text style={styles.skipText}>{language === 'he' ? 'דלג' : 'Skip'}</Text>
          </TouchableOpacity>
        </Animated.View>
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
  stepIndicator: {
    color: colors.mutedForeground,
    fontSize: 12,
    marginBottom: 8,
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
  },
  btn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    minWidth: 100,
    alignItems: 'center',
  },
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
  },
  skipText: {
    color: colors.mutedForeground,
    fontSize: 14,
  },
});
