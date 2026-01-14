import { useState, useEffect } from 'react';

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890!@#$%^&*()_+";

export default function TextEffect({ text, className }: { text: string, className?: string }) {
  const [iteration, setIteration] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setIteration(prev => {
        if (prev >= text.length) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1 / 3; // Speed of decoding
      });
    }, 30);

    return () => clearInterval(interval);
  }, [text]);

  return (
    <h1 className={className}>
      {text.split("").map((char, index) => {
        if (index < iteration) return char;
        return LETTERS[Math.floor(Math.random() * 26)];
      }).join("")}
    </h1>
  );
}