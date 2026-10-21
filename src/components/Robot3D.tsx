import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

interface Robot3DProps {
  isHovered: boolean;
  size?: number;
  className?: string;
  onClick?: () => void;
}

export const Robot3D: React.FC<Robot3DProps> = ({
  isHovered,
  size = 80,
  className = '',
  onClick,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const isHoveredRef = useRef(isHovered);
  const mousePosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    isHoveredRef.current = isHovered;
  }, [isHovered]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0.16, 4.3);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    // 2. Studio Lighting matching the user reference image
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    // Key light (soft white from top-front-right)
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
    keyLight.position.set(3, 4, 3.5);
    scene.add(keyLight);

    // Fill light (cool tone from left)
    const fillLight = new THREE.DirectionalLight(0xd9f99d, 1.2);
    fillLight.position.set(-3.5, 2, 2.5);
    scene.add(fillLight);

    // Rim / Back light for glossy specular highlights
    const rimLight = new THREE.DirectionalLight(0xffffff, 1.8);
    rimLight.position.set(0, 4, -3);
    scene.add(rimLight);

    // Soft bounce light from ground
    const bounceLight = new THREE.DirectionalLight(0xbef264, 0.8);
    bounceLight.position.set(0, -3, 2);
    scene.add(bounceLight);

    // 3. Materials - Ultra-glossy chartreuse/lime vinyl toy materials
    const glossyLimeMat = new THREE.MeshPhysicalMaterial({
      color: 0x9ef00b, // Exact vibrant lime from reference
      roughness: 0.12,
      metalness: 0.05,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      reflectivity: 0.9,
    });

    const glossyDarkJointMat = new THREE.MeshPhysicalMaterial({
      color: 0x7ecc04,
      roughness: 0.2,
      metalness: 0.1,
      clearcoat: 0.8,
    });

    // Deep glossy black oval eyes with crystal reflection
    const glossyBlackEyeMat = new THREE.MeshPhysicalMaterial({
      color: 0x050505,
      roughness: 0.05,
      metalness: 0.2,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
    });

    // 4. Robot Hierarchy
    const robotRoot = new THREE.Group();
    scene.add(robotRoot);

    // --- Soft Ground Shadow ---
    const shadowGeo = new THREE.RingGeometry(0.05, 0.8, 32);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.22,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.position.y = -1.02;
    shadowMesh.scale.set(0.82, 0.82, 0.82);
    scene.add(shadowMesh);

    // --- Body / Torso (ajustado para proporção estilizada com cabeça proeminente) ---
    const bodyGroup = new THREE.Group();
    bodyGroup.position.set(0, -0.07, 0);
    bodyGroup.scale.set(0.82, 0.82, 0.82); // Corpo um pouco menor em relação à cabeça
    robotRoot.add(bodyGroup);

    // Chubby torso egg
    const torsoGeo = new THREE.SphereGeometry(0.52, 32, 24);
    torsoGeo.scale(1.0, 1.12, 0.92);
    const torsoMesh = new THREE.Mesh(torsoGeo, glossyLimeMat);
    bodyGroup.add(torsoMesh);

    // --- Head ---
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.62, 0);
    robotRoot.add(headGroup);

    // Neck joint ring
    const neckGeo = new THREE.CylinderGeometry(0.24, 0.26, 0.14, 24);
    const neckMesh = new THREE.Mesh(neckGeo, glossyDarkJointMat);
    neckMesh.position.set(0, -0.58, 0);
    headGroup.add(neckMesh);

    // Rounded TV monitor head ("um pouquinho mais quadrada", com cantos bem suaves e fofos)
    const headCasingGeo = new RoundedBoxGeometry(1.40, 1.20, 1.05, 8, 0.38);
    const headMesh = new THREE.Mesh(headCasingGeo, glossyLimeMat);
    headGroup.add(headMesh);

    // Face screen ridge / bevel accent (moldura de tela arredondada que harmoniza com a cabeça)
    const bezelPts: THREE.Vector3[] = [];
    const bw = 0.94, bh = 0.72, br = 0.20;
    const hbw = bw / 2, hbh = bh / 2;
    for (let i = 0; i <= 6; i++) {
      const a = (i / 6) * (Math.PI / 2);
      bezelPts.push(new THREE.Vector3(hbw - br + Math.cos(a) * br, hbh - br + Math.sin(a) * br, 0));
    }
    for (let i = 0; i <= 6; i++) {
      const a = Math.PI / 2 + (i / 6) * (Math.PI / 2);
      bezelPts.push(new THREE.Vector3(-hbw + br + Math.cos(a) * br, hbh - br + Math.sin(a) * br, 0));
    }
    for (let i = 0; i <= 6; i++) {
      const a = Math.PI + (i / 6) * (Math.PI / 2);
      bezelPts.push(new THREE.Vector3(-hbw + br + Math.cos(a) * br, -hbh + br + Math.sin(a) * br, 0));
    }
    for (let i = 0; i <= 6; i++) {
      const a = 3 * Math.PI / 2 + (i / 6) * (Math.PI / 2);
      bezelPts.push(new THREE.Vector3(hbw - br + Math.cos(a) * br, -hbh + br + Math.sin(a) * br, 0));
    }
    const bezelCurve = new THREE.CatmullRomCurve3(bezelPts, true);
    const faceRidgeGeo = new THREE.TubeGeometry(bezelCurve, 36, 0.026, 10, true);
    const faceRidge = new THREE.Mesh(faceRidgeGeo, glossyDarkJointMat);
    faceRidge.position.set(0, 0.02, 0.53);
    headGroup.add(faceRidge);

    // Left Eye (glossy black oval)
    const eyeGeo = new THREE.SphereGeometry(0.125, 24, 20);
    eyeGeo.scale(0.85, 1.48, 0.35);

    const leftEye = new THREE.Mesh(eyeGeo, glossyBlackEyeMat);
    leftEye.position.set(-0.21, 0.05, 0.54);
    leftEye.rotation.z = -0.05;
    headGroup.add(leftEye);

    // Right Eye (glossy black oval)
    const rightEye = new THREE.Mesh(eyeGeo, glossyBlackEyeMat);
    rightEye.position.set(0.21, 0.05, 0.54);
    rightEye.rotation.z = 0.05;
    headGroup.add(rightEye);

    // Eye specular highlights for cute expressive look
    const glintGeo = new THREE.SphereGeometry(0.028, 12, 12);
    const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const leftGlint = new THREE.Mesh(glintGeo, glintMat);
    leftGlint.position.set(-0.18, 0.12, 0.61);
    headGroup.add(leftGlint);

    const rightGlint = new THREE.Mesh(glintGeo, glintMat);
    rightGlint.position.set(0.24, 0.12, 0.61);
    headGroup.add(rightGlint);

    // Antenna (curved stalk with sphere on top, exactly like the image)
    const antennaGroup = new THREE.Group();
    antennaGroup.position.set(-0.24, 0.60, 0);
    headGroup.add(antennaGroup);

    // Curved stalk using CatmullRomCurve3
    const curvePoints = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(-0.06, 0.14, 0),
      new THREE.Vector3(-0.14, 0.28, 0),
    ];
    const curve = new THREE.CatmullRomCurve3(curvePoints);
    const stalkGeo = new THREE.TubeGeometry(curve, 20, 0.038, 12, false);
    const stalkMesh = new THREE.Mesh(stalkGeo, glossyLimeMat);
    antennaGroup.add(stalkMesh);

    // Sphere tip
    const antennaBallGeo = new THREE.SphereGeometry(0.11, 20, 20);
    const antennaBall = new THREE.Mesh(antennaBallGeo, glossyLimeMat);
    antennaBall.position.set(-0.16, 0.32, 0);
    antennaGroup.add(antennaBall);

    // --- Left Arm (Viewer's Left - resting down) ---
    const leftArmPivot = new THREE.Group();
    leftArmPivot.position.set(-0.54, -0.05, 0);
    bodyGroup.add(leftArmPivot);

    const shoulderJointGeo = new THREE.SphereGeometry(0.13, 16, 16);
    const leftShoulder = new THREE.Mesh(shoulderJointGeo, glossyDarkJointMat);
    leftArmPivot.add(leftShoulder);

    // Upper arm
    const upperArmGeo = new THREE.CylinderGeometry(0.11, 0.12, 0.32, 16);
    upperArmGeo.translate(0, -0.16, 0);
    const leftUpperArm = new THREE.Mesh(upperArmGeo, glossyLimeMat);
    leftArmPivot.add(leftUpperArm);

    // Elbow
    const leftElbow = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 14), glossyDarkJointMat);
    leftElbow.position.set(0, -0.34, 0);
    leftArmPivot.add(leftElbow);

    // Forearm
    const leftForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.11, 0.28, 16), glossyLimeMat);
    leftForearm.position.set(0, -0.48, 0);
    leftArmPivot.add(leftForearm);

    // Hand (cute mitten paw resting down)
    const mittenGeo = new THREE.SphereGeometry(0.12, 16, 16);
    mittenGeo.scale(1.1, 1.25, 0.9);
    const leftHand = new THREE.Mesh(mittenGeo, glossyLimeMat);
    leftHand.position.set(0, -0.66, 0.02);
    leftArmPivot.add(leftHand);

    // Resting rotation for left arm (away from body towards -X)
    leftArmPivot.rotation.z = -0.22;
    leftArmPivot.rotation.x = 0.08;

    // --- Right Arm (Viewer's Right - Waving Arm!) ---
    // When NOT hovered: arm is lowered down (braço abaixado)
    // When hovered: arm raises up into greeting wave (levanta o braço para fora e acena!)
    const rightArmPivot = new THREE.Group();
    rightArmPivot.position.set(0.54, -0.05, 0);
    bodyGroup.add(rightArmPivot);

    const rightShoulder = new THREE.Mesh(shoulderJointGeo, glossyDarkJointMat);
    rightArmPivot.add(rightShoulder);

    const rightUpperArmGroup = new THREE.Group();
    rightArmPivot.add(rightUpperArmGroup);

    const rightUpperArm = new THREE.Mesh(upperArmGeo, glossyLimeMat);
    rightUpperArmGroup.add(rightUpperArm);

    // Forearm & Hand pivot for waving
    const rightForearmPivot = new THREE.Group();
    rightForearmPivot.position.set(0, -0.34, 0);
    rightUpperArmGroup.add(rightForearmPivot);

    const rightElbow = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 14), glossyDarkJointMat);
    rightForearmPivot.add(rightElbow);

    const rightForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.11, 0.28, 16), glossyLimeMat);
    rightForearm.position.set(0, -0.14, 0);
    rightForearmPivot.add(rightForearm);

    // Cute 2-lobed mitten hand exactly like the user's reference image
    const rightHandGroup = new THREE.Group();
    rightHandGroup.position.set(0, -0.32, 0.02);
    rightForearmPivot.add(rightHandGroup);

    // Palm base
    const palmMesh = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 16), glossyLimeMat);
    palmMesh.scale.set(1.1, 1.1, 0.85);
    rightHandGroup.add(palmMesh);

    // Finger 1 (left lobe)
    const finger1Geo = new THREE.CapsuleGeometry(0.045, 0.11, 8, 12);
    const finger1 = new THREE.Mesh(finger1Geo, glossyLimeMat);
    finger1.position.set(-0.045, -0.08, 0);
    finger1.rotation.z = -0.15;
    rightHandGroup.add(finger1);

    // Finger 2 (right lobe)
    const finger2 = new THREE.Mesh(finger1Geo, glossyLimeMat);
    finger2.position.set(0.045, -0.08, 0);
    finger2.rotation.z = 0.15;
    rightHandGroup.add(finger2);

    // --- Legs (chunky cute stance matching the image) ---
    const legGeo = new THREE.CylinderGeometry(0.13, 0.15, 0.32, 16);
    const kneeJointGeo = new THREE.SphereGeometry(0.14, 14, 14);
    const footGeo = new THREE.SphereGeometry(0.16, 20, 16);
    footGeo.scale(1.1, 0.6, 1.4);

    // Left leg (viewer's left)
    const leftLegGroup = new THREE.Group();
    leftLegGroup.position.set(-0.25, -0.45, 0);
    bodyGroup.add(leftLegGroup);

    const leftThigh = new THREE.Mesh(legGeo, glossyLimeMat);
    leftThigh.position.set(0, -0.15, 0);
    leftLegGroup.add(leftThigh);

    const leftKnee = new THREE.Mesh(kneeJointGeo, glossyDarkJointMat);
    leftKnee.position.set(0, -0.32, 0);
    leftLegGroup.add(leftKnee);

    const leftShin = new THREE.Mesh(legGeo, glossyLimeMat);
    leftShin.position.set(0, -0.48, 0);
    leftLegGroup.add(leftShin);

    const leftFoot = new THREE.Mesh(footGeo, glossyLimeMat);
    leftFoot.position.set(0, -0.66, 0.06);
    leftLegGroup.add(leftFoot);

    // Right leg (viewer's right)
    const rightLegGroup = new THREE.Group();
    rightLegGroup.position.set(0.25, -0.45, 0);
    bodyGroup.add(rightLegGroup);

    const rightThigh = new THREE.Mesh(legGeo, glossyLimeMat);
    rightThigh.position.set(0, -0.15, 0);
    rightLegGroup.add(rightThigh);

    const rightKnee = new THREE.Mesh(kneeJointGeo, glossyDarkJointMat);
    rightKnee.position.set(0, -0.32, 0);
    rightLegGroup.add(rightKnee);

    const rightShin = new THREE.Mesh(legGeo, glossyLimeMat);
    rightShin.position.set(0, -0.48, 0);
    rightLegGroup.add(rightShin);

    const rightFoot = new THREE.Mesh(footGeo, glossyLimeMat);
    rightFoot.position.set(0, -0.66, 0.06);
    rightLegGroup.add(rightFoot);

    // Stance adjustments (subtle outward stance like reference photo)
    leftLegGroup.rotation.z = 0.08;
    rightLegGroup.rotation.z = -0.08;

    // 5. Mouse tracking
    const handlePointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mousePosRef.current = { x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) };
    };

    container.addEventListener('mousemove', handlePointerMove);

    // 6. Animation Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    // Arm animation state: starts lowered down naturally outside the body
    let currentShoulderZ = 0.22;
    let currentShoulderX = 0.06;
    let currentForearmZ = 0.0;
    let currentForearmX = 0.0;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();

      // Gentle cute floating / breathing
      const bob = Math.sin(time * 2.6) * 0.04;
      robotRoot.position.y = bob;

      // Antenna slight natural jiggle
      antennaGroup.rotation.z = Math.sin(time * 2.8) * 0.05;

      // Head smoothly looks towards cursor
      const targetHeadY = mousePosRef.current.x * 0.32;
      const targetHeadX = -mousePosRef.current.y * 0.22;
      headGroup.rotation.y += (targetHeadY - headGroup.rotation.y) * 0.08;
      headGroup.rotation.x += (targetHeadX - headGroup.rotation.x) * 0.08;

      // --- Interactive Arm (Baixo quando normal, Levanta pelo lado de FORA quando mouse passa por cima) ---
      const hovered = isHoveredRef.current;

      if (hovered) {
        // LEVANTA O BRAÇO PARA FORA (rotaciona pelo lado externo, nunca por dentro do tronco)
        // Ângulo positivo de rotação no eixo Z eleva o braço passando por +X (fora do corpo)
        const targetShoulderZ = 2.18; // Elevado para cima e para fora
        const targetShoulderX = -0.26; // Levemente inclinado para frente em direção ao usuário
        currentShoulderZ += (targetShoulderZ - currentShoulderZ) * 0.14;
        currentShoulderX += (targetShoulderX - currentShoulderX) * 0.14;

        // Movimento de aceno feliz com o antebraço e a mãozinha (dobrado para dentro + oscilação)
        const wave = Math.sin(time * 9.5) * 0.24;
        const targetForearmZ = 0.40 + wave; // Leve dobra natural de cotovelo com aceno
        currentForearmZ += (targetForearmZ - currentForearmZ) * 0.22;
        currentForearmX += (-0.18 - currentForearmX) * 0.15;

        // Cabeça inclina de forma simpática ao acenar
        headGroup.rotation.z += (Math.sin(time * 3.5) * 0.08 - headGroup.rotation.z) * 0.1;
      } else {
        // BRAÇO BAIXADO (Repouso natural ao lado do corpo, afastado do tronco)
        const restShoulderZ = 0.22;
        const restShoulderX = 0.06;
        currentShoulderZ += (restShoulderZ - currentShoulderZ) * 0.12;
        currentShoulderX += (restShoulderX - currentShoulderX) * 0.12;
        currentForearmZ += (0.0 - currentForearmZ) * 0.14;
        currentForearmX += (0.0 - currentForearmX) * 0.14;

        headGroup.rotation.z += (0.0 - headGroup.rotation.z) * 0.1;
      }

      rightArmPivot.rotation.z = currentShoulderZ;
      rightArmPivot.rotation.x = currentShoulderX;
      rightForearmPivot.rotation.z = currentForearmZ;
      rightForearmPivot.rotation.x = currentForearmX;

      renderer.render(scene, camera);
    };

    animate();

    // 7. Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      container.removeEventListener('mousemove', handlePointerMove);

      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else if (obj.material) {
            obj.material.dispose();
          }
        }
      });

      renderer.dispose();
    };
  }, [size]);

  return (
    <div
      ref={mountRef}
      onClick={onClick}
      className={`relative select-none pointer-events-auto cursor-pointer ${className}`}
      style={{ width: size, height: size }}
      title="FinBot AI"
    />
  );
};
