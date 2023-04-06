import { css } from './utils';

export const styles = css`
  main {
    font-family: 'Circular Std', 'Roboto', sans-serif;
    font-weight: 300;
    font-size: 10px;
    container-type: inline-size;
    --font-circular: 'Circular Std', 'Roboto', sans-serif;
    --font-mono: 'Vremena Grotesk', 'Roboto Mono', monospace;
    --header-height: 3.8rem;
    --pad-sm: 10px;
    --pad-md: 15px;
    --pad-lg: 20px;
    --font-sm: clamp(10px, 1.4cqw, 0.85rem);
    --font-md: clamp(14px, 1.4cqw, 1.4rem);
    --font-lg: clamp(18px, 1.4cqw, 2.4rem);
    --light-bg: #f6f6f7;
    --white: #f9f9f9;
    --lightest: #ebf0fa;
    --lighter: #eaeaea;
    --light: #e5e5e5;
    --medium: #c3c3c4;
    --dark: #818284;
    --darker: #545454;
    --darkest: #292a2e;
    --error: #b82121;
  }

  #app {
    display: flex;
    flex-direction: column;
    contain: content;
    width: 100cqw;
    height: 100cqh;
    font-size: var(--font-md);
  }

  #container {
    display: flex;
    flex-direction: column;
    height: calc(100cqh - var(--header-height));
  }

  #main-content {
    flex: 1;
    overflow: auto;
  }

  #header {
    height: var(--header-height);
    width: 100%;
    text-align: center;
    font-size: var(--font-md);
    line-height: var(--header-height);
    color: var(--darkest);
    border-bottom: 1px solid var(--dark);
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    justify-content: center;
    align-items: center;
  }

  #reset-button {
    display: flex;
    margin-left: auto;
    width: fit-content;
    padding: 0.4rem;
    border: 1px solid black;
    font-size: var(--font-sm);
    line-height: 1.5rem;
  }

  #title-card {
    padding: 3.2rem 1.8rem 0;
    font-size: var(--font-md);
  }

  #title {
    font-size: 3.4rem;
    letter-spacing: 0.1rem;
  }

  #methods {
    font-family: 'Vremena Grotesk', 'Roboto Mono', monospace;
    padding: 0;
    margin: 0;
  }

  #methods li {
    display: flex;
    flex-direction: column;
    list-style: none;
    padding: var(--pad-md);
    margin-top: var(--pad-lg);
    border: 1px solid var(--dark);
  }

  .signature {
    font-weight: lighter;
    margin-bottom: var(--pad-md);
  }
  .signature b {
    font-weight: bold;
  }

  .composite {
    margin-bottom: var(--pad-md);
  }

  input,
  select {
    font-size: var(--font-md);
    font-family: 'Circular Std', 'Roboto', sans-serif;
    margin-bottom: var(--pad-lg);
  }
  input:not([type='checkbox']),
  select {
    width: 100%;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    border: 1px solid var(--dark);
  }
  select {
    height: 4.8rem;
  }
  input:not([type='checkbox']) {
    height: 2.4rem;
  }
  input[type='number']::-webkit-inner-spin-button {
    width: 3rem;
    height: 3rem;
  }
  label {
    font-family: 'Circular Std', 'Roboto', sans-serif;
    margin-right: var(--pad-sm);
  }
  label.small {
    font-size: 1rem;
  }
  .popup-form {
    padding-left: var(--pad-md);
    width: 100%;
  }

  .popup-form input {
    margin-right: 1rem;
  }

  input[type='checkbox'] ~ .popup-form {
    padding-left: var(--pad-md);
    margin-right: 0.75rem;
  }
  .input-container > span > .popup-form,
  .ui-result > span > .popup-form {
    padding-left: 0;
  }
  .input-container span:not(.status),
  .ui-result span:not(.status) {
    position: relative;
    overflow-clip: none;
    overflow-y: visible;
  }

  .reject {
    border-color: var(--error) !important;
    box-shadow: 0 0 1px var(--error);
  }
  .result {
    display: none;
    position: relative;
    width: 100%;
    margin-top: var(--pad-lg);
    padding-top: 1.5rem;
    border-top: 1px solid var(--light);
  }
  .error {
    color: var(--error);
  }
  .status {
    display: none;
    position: absolute;
    top: 3.1rem;
    left: 0.2rem;
    font-size: 1.2rem;
    color: var(--error);
    white-space: pre;
  }
  .left {
    flex: 1;
    overflow-wrap: anywhere;
  }
  .right {
    color: var(--dark);
    align-self: stretch;
    margin-left: var(--pad-md);
  }
  .clear {
    clear: both;
  }

  .button-container {
    display: flex;
    margin-top: 0.8rem;
  }

  .btn {
    font-family: 'Roboto', sans-serif;
    letter-spacing: 0.05rem;
    background-color: var(--darkest);
    color: var(--lightest);
    font-size: var(--font-md);
    padding: var(--pad-md);
    border: none;
    text-transform: uppercase;
    flex: 1;
  }
  .btn:not(:last-child) {
    margin-right: var(--pad-md);
  }
  button {
    padding: 0;
    border: none;
    background-color: inherit;
    color: inherit;
  }
  button:focus,
  input:focus,
  select:focus,
  textarea:focus {
    outline: 2px transparent solid;
    box-shadow: 0 0 0 2px #f9f9d1, 0 0 0 4px #396196, 0 0 4px 8px #f9f9d1;
  }
  .random {
    background-color: var(--lighter);
    color: var(--darkest);
  }

  .result-buttons {
    display: none;
    position: absolute;
    top: -0.1rem;
    right: 0;
  }
  .result:not(.error):hover .result-buttons {
    display: block;
  }
  .result-buttons .btn {
    color: var(--darkest);
    background-color: var(--white);
    border: 1px solid var(--darkest);
    font-size: 1.1rem;
    padding: 0.2rem 0.8rem;
  }
  .result-buttons .btn:not(:last-child) {
    margin-right: 0.5rem;
  }
  .result-buttons .btn:focus,
  .result-buttons .btn:hover {
    background-color: var(--light);
  }
  .result-buttons .btn:active {
    background-color: var(--lightest);
  }
  .result-buttons .btn.active {
    color: var(--white);
    background-color: var(--darkest);
  }

  #console {
    overflow: hidden;
    height: var(--header-height);
    background-color: var(--light-bg);
    color: var(--darkest);
    transition: height 0.2s ease-in-out;
  }
  #console.open {
    height: cqmax;
    height: 40cqh;
  }

  #console-bar {
    display: flex;
    height: var(--header-height);
    background-color: var(--white);
    padding: 0;
    border-bottom: 1px solid var(--light);
  }
  #console-bar svg {
    max-width: 100%;
  }
  .console-header {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: var(--header-height);
    background-color: var(--light-bg);
    font-size: 2rem;
    font-family: var(--font-circular);
    text-align: center;
    text-transform: uppercase;
  }
  #output-button,
  #methods-button {
    flex: 1;
    cursor: pointer;
    font-size: var(--font-lg);
    border-bottom: 1px solid var(--medium);
  }
  #output-button:hover,
  #methods-button:hover,
  #output-button:focus,
  #methods-button:focus {
    background-color: var(--light);
  }
  .active-tab {
    background-color: var(--lighter);
  }

  #output-pane,
  #methods-pane {
    max-width: 100%;
    font-family: var(--font-mono);
    height: 0;
    padding: 0 0 3rem;
    margin-right: calc(-1 * var(--pad-md));
  }

  #output-list,
  #methods-list {
    list-style: none;
    padding: 0 0 var(--pad-lg);
    height: calc(40cqh - (var(--header-height) * 2));
    overflow-y: auto;
  }

  .output-line {
    width: 100%;
    padding: 0.4rem 0.8rem;
    overflow-wrap: break-word;
  }
  .output-line:nth-child(2n-1) {
    background-color: var(--lighter);
  }

  #methods-list {
    padding-top: 0.2rem;
  }
  #methods-list a {
    display: block;
    padding: 0.7rem 1.5rem;
    color: var(--darkest);
  }
  #methods-list a:focus,
  #methods-list a:hover {
    background-color: var(--darker);
    color: var(--white);
    text-decoration: none;
  }
  #methods-list a:active {
    background-color: var(--darkest);
  }

  @container (inline-size >= 880px) {
    .container {
      --header-height: 5.6rem;
    }

    #header {
      text-align: left;
      padding-left: 3rem;
    }

    #container {
      --console-width: clamp(300px, 30cqw, 34rem);
      flex-direction: row;
      overflow: auto;
    }

    #title-card {
      padding-left: 0;
    }

    #main-content {
      flex: 1;
      padding: 0 3rem 5rem;
    }

    .btn {
      width: auto;
      flex: 0;
      padding: var(--pad-sm) var(--pad-md);
    }

    .input-container span:not(:first-child):not(.status),
    .ui-result span:not(:first-child):not(.status) {
      margin-left: var(--pad-md);
    }

    /* span with an input */
    span::has(input) {
      margin-left: 0;
    }
    input:not([type='checkbox']),
    select {
      width: 23.2rem;
      max-width: 100%;
      height: 4rem;
      padding: 1rem var(--pad-md);
    }

    #console {
      display: flex;
      flex-direction: row-reverse;
      width: var(--header-height);
      height: calc(100cqh - var(--header-height));
      padding: 0;
      transition: width 0.2s ease-in-out;
    }
    #console.open {
      width: calc(var(--header-height) + var(--console-width));
      height: calc(100cqh - var(--header-height));
    }

    #console-bar {
      display: flex;
      flex-direction: column;
      justify-self: end;
      width: var(--header-height);
      height: 100%;
      padding: 0;
      border-bottom: none;
      border-left: 1px solid var(--light);
    }
    #console-bar button {
      flex: 0;
      font-size: 4rem;
      padding: 0.8rem;
    }

    .console-header {
      display: none;
      width: 0;
      border-bottom: none;
      transition: width 0.2s ease-in-out;
    }
    #console.open .console-header {
      display: flex;
      width: 100%;
    }

    #output-pane,
    #methods-pane {
      width: 100%;
      margin: 0;
    }

    #methods-pane,
    #output-pane {
      height: 100% !important;
      width: 0;
      transition: width 0.2s ease-in-out;
    }
    #console.open #methods-pane,
    #console.open #output-pane {
      width: var(--console-width);
    }

    #output-list,
    #methods-list {
      height: calc(100cqh - (var(--header-height) * 2));
    }
  }
`;
