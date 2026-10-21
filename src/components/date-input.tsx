"use client";

// A date field that opens the browser's calendar when you click anywhere on it,
// not only on the small calendar icon. You can still type a date with the keyboard.
export function DateInput(props: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">) {
  return (
    <input
      {...props}
      type="date"
      onClick={(e) => {
        try {
          e.currentTarget.showPicker();
        } catch {
          // Some browsers or embedded contexts disallow it; the field still works by typing.
        }
      }}
    />
  );
}
