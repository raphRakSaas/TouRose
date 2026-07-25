import { render } from '@testing-library/react-native';

import { BrandIcon } from '@/components/ui/BrandIcon';
import { BrandLockup } from '@/components/ui/BrandLockup';
import { BrandWordmark } from '@/components/ui/BrandWordmark';

describe('BrandWordmark', () => {
  it('renders the TouRose wordmark image', () => {
    const { getByTestId } = render(<BrandWordmark />);
    expect(getByTestId('brand-wordmark')).toBeTruthy();
  });
});

describe('BrandIcon', () => {
  it('renders the TouRose icon image', () => {
    const { getByTestId } = render(<BrandIcon />);
    expect(getByTestId('brand-icon')).toBeTruthy();
  });
});

describe('BrandLockup', () => {
  it('renders icon and wordmark together', () => {
    const { getByTestId } = render(<BrandLockup />);
    expect(getByTestId('brand-lockup-icon')).toBeTruthy();
    expect(getByTestId('brand-lockup-wordmark')).toBeTruthy();
  });
});
