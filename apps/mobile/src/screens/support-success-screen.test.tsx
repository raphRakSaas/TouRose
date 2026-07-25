import { render } from '@testing-library/react-native';

import SupportSuccessScreen from '../../app/support/success';

jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
}));

describe('SupportSuccessScreen', () => {
  it('renders the toulouse thank-you animation', () => {
    const { getByTestId, getByText } = render(<SupportSuccessScreen />);

    expect(getByTestId('support-success-screen')).toBeTruthy();
    expect(getByTestId('support-thank-you-animation')).toBeTruthy();
    expect(getByText('Ta brique rose rejoint le mur de Toulouse.')).toBeTruthy();
  });
});
