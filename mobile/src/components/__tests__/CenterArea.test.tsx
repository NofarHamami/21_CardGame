import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CenterArea from '../CenterArea';
import { createCenterPile, placeOnPile } from '../../models/CenterPile';
import { createCard } from '../../models/Card';
import { Suit, Rank, CardSource } from '../../models/types';

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children, ...props }: any) =>
    React.createElement('View', props, children),
}));

describe('CenterArea', () => {
  const emptyPiles = [
    createCenterPile(),
    createCenterPile(),
    createCenterPile(),
    createCenterPile(),
  ];

  const defaultProps = {
    centerPiles: emptyPiles,
    stockPileSize: 20,
    selectedCard: null,
    onPlayToCenter: jest.fn(),
    currentPlayerName: 'Player 1',
    cardsPlayedThisTurn: 0,
    isAITurn: false,
  };

  it('renders all four center piles', () => {
    const { getAllByLabelText } = render(<CenterArea {...defaultProps} />);
    const piles = getAllByLabelText(/Pile \d/);
    expect(piles.length).toBe(4);
  });

  it('renders stock pile with count', () => {
    const { getByText } = render(<CenterArea {...defaultProps} />);
    expect(getByText('20')).toBeTruthy();
  });

  it('calls onPlayToCenter when a pile is tapped', () => {
    const onPlayToCenter = jest.fn();
    const card = createCard(Suit.HEARTS, Rank.ACE);
    const { getAllByLabelText } = render(
      <CenterArea
        {...defaultProps}
        onPlayToCenter={onPlayToCenter}
        selectedCard={{ card, source: CardSource.HAND, sourceIndex: 0 }}
      />
    );
    const piles = getAllByLabelText(/Pile \d/);
    fireEvent.press(piles[0]);
    expect(onPlayToCenter).toHaveBeenCalledWith(0);
  });

  it('shows expected rank for empty pile (Ace)', () => {
    const { getAllByText } = render(<CenterArea {...defaultProps} />);
    const aceLabels = getAllByText('A');
    expect(aceLabels.length).toBeGreaterThan(0);
  });
});
