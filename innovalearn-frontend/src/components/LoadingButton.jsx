export default function LoadingButton({
  isLoading,
  disabled,
  children,
  loadingText = 'Loading...',
  ...props
}) {
  return (
    <button {...props} disabled={disabled || isLoading}>
      {isLoading ? loadingText : children}
    </button>
  );
}
