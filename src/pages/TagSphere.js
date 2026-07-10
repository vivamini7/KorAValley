import { useEffect, useRef } from "react";
import "./TagSphere.css";

const FIELDS = [
  { label: "AI / ML" },
  { label: "Medical AI" },
  { label: "Finance" },
  { label: "Developer" },
  { label: "Research" },
  { label: "Robotics" },
  { label: "Economics" },
  { label: "HCI + AI" },
  { label: "Physical AI" },
  { label: "Drug Discovery" },
  { label: "Neuroscience" },
  { label: "Accounting" },
  { label: "iOS" },
  { label: "Business" },
  { label: "Power Eng." },
  { label: "Accessibility" },
];

function fibonacciSphere(n) {
  const golden = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: n }, (_, i) => {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = golden * i;
    return { x: Math.cos(theta) * r, y, z: Math.sin(theta) * r };
  });
}

const BASE_POSITIONS = fibonacciSphere(FIELDS.length);
const RADIUS = 148;

export default function TagSphere() {
  const containerRef = useRef(null);
  const animRef = useRef(null);
  const rotRef = useRef({ x: 0.3, y: 0 });
  const mouseRef = useRef({ dx: 0, dy: 0 });
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onMouseDown = (e) => {
      isDragging.current = true;
      lastMouse.current = { x: e.clientX, y: e.clientY };
    };
    const onMouseMove = (e) => {
      if (!isDragging.current) return;
      mouseRef.current.dx = (e.clientX - lastMouse.current.x) * 0.006;
      mouseRef.current.dy = (e.clientY - lastMouse.current.y) * 0.006;
      lastMouse.current = { x: e.clientX, y: e.clientY };
    };
    const onMouseUp = () => {
      isDragging.current = false;
      mouseRef.current = { dx: 0, dy: 0 };
    };

    el.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    const animate = () => {
      if (isDragging.current) {
        rotRef.current.y += mouseRef.current.dx;
        rotRef.current.x += mouseRef.current.dy;
      } else {
        rotRef.current.y += 0.004;
        rotRef.current.x += 0.0008;
      }

      const cosY = Math.cos(rotRef.current.y);
      const sinY = Math.sin(rotRef.current.y);
      const cosX = Math.cos(rotRef.current.x);
      const sinX = Math.sin(rotRef.current.x);

      const items = el.querySelectorAll(".tsTag");
      items.forEach((tag, i) => {
        const p = BASE_POSITIONS[i];
        const x1 = p.x * cosY - p.z * sinY;
        const z1 = p.x * sinY + p.z * cosY;
        const y2 = p.y * cosX - z1 * sinX;
        const z2 = p.y * sinX + z1 * cosX;

        const px = x1 * RADIUS;
        const py = y2 * RADIUS;
        const depth = (z2 + 1) / 2; // 0 (뒤) ~ 1 (앞)

        const scale = 0.55 + depth * 0.65;
        const opacity = 0.18 + depth * 0.82;

        tag.style.transform = `translate(-50%, -50%) translate(${px}px, ${py}px) scale(${scale})`;
        tag.style.opacity = opacity;
        tag.style.zIndex = Math.round(depth * 100);
      });

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(animRef.current);
      el.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  return (
    <div className="tagSphereWrap">
      <div className="tagSphereContainer" ref={containerRef}>
        {FIELDS.map((f, i) => (
          <span key={i} className="tsTag">{f.label}</span>
        ))}
      </div>
    </div>
  );
}
