'use client';

import { useEffect } from 'react';

export function PhantomUiProvider() {
  useEffect(() => {
    void import('@aejkatappaja/phantom-ui');
  }, []);

  return null;
}
