interface ButtonProps {
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  background?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  onClick,
  style,
  children,
  type = 'button',
  background = 'black',
}) => (
  <button
    type={type}
    style={{
      padding: 5,
      paddingBottom: 10,
      width: '100%',
      borderRadius: 0,
      background,
      color: 'white',
      border: 'none',
      cursor: 'pointer',
      fontSize: 20,
      fontFamily: 'monospace',
      ...style,
    }}
    onClick={onClick}
  >
    {children}
  </button>
);
export default Button;
