import type { DetailedHTMLProps, HTMLAttributes } from 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'phantom-ui': DetailedHTMLProps<
        HTMLAttributes<HTMLElement> & {
          loading?: boolean | string;
          animation?: string;
          reveal?: number | string;
          duration?: number | string;
          'fallback-radius'?: number | string;
          'background-color'?: string;
          'shimmer-color'?: string;
          'shimmer-direction'?: string;
          stagger?: number | string;
          count?: number | string;
          'count-gap'?: number | string;
          debug?: boolean | string;
        },
        HTMLElement
      >;
    }
  }
}
