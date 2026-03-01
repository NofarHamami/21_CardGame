import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CardView } from '../CardView';
import { createCard } from '../../models/Card';
import { Suit, Rank } from '../../models/types';

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children, ...props }: any) =>
    React.createElement('View', props, children),
}));

describe('CardView', () => {
  const card = createCard(Suit.HEARTS, Rank.ACE);

  it('renders a face-up card with rank and suit', () => {
    const { getByLabelText } = render(<CardView card={card} />);
    expect(getByLabelText(/A of/)).toBeTruthy();
  });

  it('renders an empty slot when card is null', () => {
    const { getByLabelText } = render(<CardView card={null} />);
    expect(getByLabelText('Empty card slot')).toBeTruthy();
  });

  it('renders a face-down card', () => {
    const { getByLabelText } = render(<CardView card={card} faceDown />);
    expect(getByLabelText('Face down card')).toBeTruthy();
  });

  it('renders face-down card with count badge', () => {
    const { getByLabelText, getByText } = render(
      <CardView card={card} faceDown showCount={5} />
    );
    expect(getByLabelText('5 face down cards')).toBeTruthy();
    expect(getByText('5')).toBeTruthy();
  });

  it('applies selected style and accessibility state', () => {
    const { getByLabelText } = render(<CardView card={card} selected />);
    const element = getByLabelText(/A of/);
    expect(element.props.accessibilityState.selected).toBe(true);
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(<CardView card={card} onPress={onPress} />);
    fireEvent.press(getByLabelText(/A of/));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(<CardView card={card} onPress={onPress} disabled />);
    const element = getByLabelText(/A of/);
    expect(element.props.accessibilityState.disabled).toBe(true);
  });

  it('has correct accessibility role when interactive', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(<CardView card={card} onPress={onPress} />);
    const element = getByLabelText(/A of/);
    expect(element.props.accessibilityRole).toBe('button');
  });

  it('renders compact card with smaller dimensions', () => {
    const { getByLabelText } = render(<CardView card={card} compact />);
    expect(getByLabelText(/A of/)).toBeTruthy();
  });
});
