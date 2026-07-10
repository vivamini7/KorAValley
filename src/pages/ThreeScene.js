import { useEffect, useRef } from "react";
import * as THREE from "three";
import "./ThreeScene.css";

const FIELDS = [
  { label: "AI / ML",        emoji: "🔮", color: "#7B8FFF" },
  { label: "Medical AI",     emoji: "🧬", color: "#FF6B9D" },
  { label: "Finance",        emoji: "📈", color: "#4ECDC4" },
  { label: "Developer",      emoji: "💻", color: "#64B5F6" },
  { label: "Research",       emoji: "🔬", color: "#81C784" },
  { label: "Robotics",       emoji: "🤖", color: "#80DEEA" },
  { label: "Economics",      emoji: "💹", color: "#FFD54F" },
  { label: "HCI + AI",       emoji: "🖥️", color: "#CE93D8" },
  { label: "Physical AI",    emoji: "🦿", color: "#4FC3F7" },
  { label: "Drug Discovery", emoji: "💊", color: "#F48FB1" },
  { label: "Neuroscience",   emoji: "🧠", color: "#B39DDB" },
  { label: "Accounting",     emoji: "📊", color: "#A5D6A7" },
  { label: "iOS",            emoji: "📱", color: "#4DB6AC" },
  { label: "Business",       emoji: "🏢", color: "#FFB74D" },
  { label: "Power Eng.",     emoji: "⚡", color: "#FFF176" },
  { label: "Accessibility",  emoji: "🫂", color: "#81D4FA" },
];

const RADIUS = 3.2;

function fibonacciSphere(n) {
  const golden = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: n }, (_, i) => {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    return { x: Math.cos(theta) * r, y, z: Math.sin(theta) * r };
  });
}

function drawRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function createCardTexture(field) {
  const W = 256, H = 160;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  // Background
  drawRoundRect(ctx, 0, 0, W, H, 16);
  ctx.fillStyle = "rgba(12, 14, 38, 0.92)";
  ctx.fill();

  // Color glow
  const glow = ctx.createRadialGradient(W / 2, H / 2 - 10, 0, W / 2, H / 2, 120);
  glow.addColorStop(0, field.color + "44");
  glow.addColorStop(1, field.color + "00");
  ctx.fillStyle = glow;
  drawRoundRect(ctx, 0, 0, W, H, 16);
  ctx.fill();

  // Border
  ctx.strokeStyle = field.color + "90";
  ctx.lineWidth = 1.5;
  drawRoundRect(ctx, 1, 1, W - 2, H - 2, 15);
  ctx.stroke();

  // Emoji
  ctx.font = "54px serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(field.emoji, W / 2, H / 2 - 10);

  // Label
  ctx.font = "bold 16px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.93)";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(field.label, W / 2, H - 20);

  return new THREE.CanvasTexture(canvas);
}

export default function ThreeScene() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const W = mount.clientWidth;
    const H = mount.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(65, W / H, 0.1, 100);
    camera.position.z = 6.8;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (e) {
      console.warn("WebGL not available, skipping 3D scene:", e);
      return;
    }
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    // Background stars (desktop only)
    let starGeo, starMat;
    if (W >= 900) {
      starGeo = new THREE.BufferGeometry();
      const starPos = new Float32Array(300 * 3);
      for (let i = 0; i < 300 * 3; i++) starPos[i] = (Math.random() - 0.5) * 28;
      starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
      starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.035, transparent: true, opacity: 0.55 });
      scene.add(new THREE.Points(starGeo, starMat));
    }

    // Cards
    const positions = fibonacciSphere(FIELDS.length);
    const textures = [];
    const cards = FIELDS.map((field, i) => {
      const tex = createCardTexture(field);
      textures.push(tex);
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
      const geo = new THREE.PlaneGeometry(1.72, 1.08);
      const mesh = new THREE.Mesh(geo, mat);
      scene.add(mesh);
      return { mesh, base: positions[i], geo, mat };
    });

    // Interaction state
    let rotY = 0, rotX = 0.22;
    let isDragging = false, lastX = 0, lastY = 0;
    let autoRotate = true;

    const startDrag = (x, y) => { isDragging = true; lastX = x; lastY = y; autoRotate = false; };
    const moveDrag  = (x, y) => {
      if (!isDragging) return;
      rotY -= (x - lastX) * 0.005;
      rotX += (y - lastY) * 0.003;
      rotX = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, rotX));
      lastX = x; lastY = y;
    };
    const endDrag = () => { isDragging = false; setTimeout(() => { autoRotate = true; }, 1800); };

    const onMD = (e) => startDrag(e.clientX, e.clientY);
    const onMM = (e) => moveDrag(e.clientX, e.clientY);
    const onMU = endDrag;
    const onTS = (e) => startDrag(e.touches[0].clientX, e.touches[0].clientY);
    const onTM = (e) => moveDrag(e.touches[0].clientX, e.touches[0].clientY);

    mount.addEventListener("mousedown", onMD);
    window.addEventListener("mousemove", onMM);
    window.addEventListener("mouseup", onMU);
    mount.addEventListener("touchstart", onTS, { passive: true });
    mount.addEventListener("touchmove", onTM, { passive: true });
    mount.addEventListener("touchend", endDrag);

    const onResize = () => {
      const nw = mount.clientWidth, nh = mount.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener("resize", onResize);

    // Animate
    let animId;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (autoRotate) rotY += 0.004;

      const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX), sinX = Math.sin(rotX);

      cards.forEach(({ mesh, base }) => {
        const x1 = base.x * cosY - base.z * sinY;
        const z1 = base.x * sinY + base.z * cosY;
        const y2 = base.y * cosX - z1 * sinX;
        const z2 = base.y * sinX + z1 * cosX;
        mesh.position.set(x1 * RADIUS, y2 * RADIUS, z2 * RADIUS);
        mesh.lookAt(camera.position);
      });

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      mount.removeEventListener("mousedown", onMD);
      window.removeEventListener("mousemove", onMM);
      window.removeEventListener("mouseup", onMU);
      mount.removeEventListener("touchstart", onTS);
      mount.removeEventListener("touchmove", onTM);
      mount.removeEventListener("touchend", endDrag);
      window.removeEventListener("resize", onResize);
      cards.forEach(({ geo, mat }) => { geo.dispose(); mat.dispose(); });
      textures.forEach((t) => t.dispose());
      if (starGeo) starGeo.dispose();
      if (starMat) starMat.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="threeScene" />;
}
