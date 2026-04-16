import { useEffect, useState } from "react";

export default function TypingText({ text, speed = 70, startDelay = 0 }) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    let i = 0;
    let timer;

    const start = () => {
      timer = setInterval(() => {
        i += 1;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) clearInterval(timer);
      }, speed);
    };

    const delayTimer = setTimeout(start, startDelay);

    return () => {
      clearTimeout(delayTimer);
      clearInterval(timer);
    };
  }, [text, speed, startDelay]);

  return <span>{displayed}</span>;
}
