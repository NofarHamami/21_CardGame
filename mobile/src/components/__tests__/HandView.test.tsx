import React from 'react';
import { render } from '@testing-library/react-native';
import { HandView } from '../HandView';
import { createCard } from '../../models/Card';
import { Suit, Rank, CardSource } from '../../models/types';

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children, ...props }: any) =>
    React.createElement('View', props, children),
}));

jest.mock('../../utils/logger', () => ({
  logger: { debug: jest.fn(), error: jest.fn() },
}));

describe('HandView', () => {
  const cards = [
    createCard(Suit.HEARTS, Rank.ACE),
    createCard(Suit.SPADES, Rank.KING),
    createCard(Suit.DIAMONDS, Rank.QUEEN),
  ];

  const defaultProps = {
    cards,
    selectedCard: null,
    onSelectCard: jest.fn(),
    isCurrentPlayer: true,
    showHandCards: true,
    isCardSelected: () => false,
    playerName: 'Player 1',
  };

  it('renders all cards when current player', () => {
    const { getAllByLabelText } = render(<HandView {...defaultProps} />);
    const cardElements = getAllByLabelText(/.* of .*/);
    expect(cardElements.length).toBe(3);
  });

  it('renders face-down card with count for non-current player', () => {
    const { getByLabelText } = render(
      <HandView {...defaultProps} isCurrentPlayer={false} />
    );
    expect(getByLabelText('3 face down cards')).toBeTruthy();
  });

  it('renders empty when cards array is empty', () => {
    const { queryAllByLabelText } = render(
      <HandView {...defaultProps} cards={[]} isCurrentPlayer={false} />
    );
    expect(queryAllByLabelText(/.* of .*/).length).toBe(0);
  });
});
