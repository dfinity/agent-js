import { css } from '@emotion/css';
import React from 'react';

interface Props {}

function ProgressBlobs(props: Props) {
  const {} = props;

  return (
    <div className={spacerStyles}>
      <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 41 8' width='41' height='8'>
        <defs>
          <style>{`.a{fill:#d9d9da;}.b{fill:#292a2e;}`}</style>
        </defs>
        <circle className='a' cx='25' cy='4' r='4' />
        <circle className='a' cx='37' cy='4' r='4' />
        <path
          className='b'
          d='M4,0h8a4,4,0,0,1,4,4h0a4,4,0,0,1-4,4H4A4,4,0,0,1,0,4H0A4,4,0,0,1,4,0Z'
        />
      </svg>
    </div>
  );
}

const spacerStyles = css`
  display: flex;
  margin: 40px auto 0;
`;

export default ProgressBlobs;
