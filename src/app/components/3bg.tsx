"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";

function Stars() {
    const ref = useRef<THREE.Points>(null!);
    const count = 2000;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 20;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    useFrame(() => {
        if (ref.current) {
            ref.current.rotation.y += 0.0005;
            ref.current.rotation.x += 0.0002;
        }
    });
    return (
        <Points ref={ref} positions={positions}>
            <PointMaterial
                transparent
                color="#3B82F6"
                size={0.02}
                sizeAttenuation
                depthWrite={false}
            />
        </Points>
    );
}
export default function Web3Background() {
    return (
        <div className="absolute inset-0 -z-10">
            <Canvas
                camera={{ position: [0, 0, 5] }}
                gl={{ alpha: true }}
                style={{ background: 'transparent' }}
            >
                <Stars />
            </Canvas>
        </div>
    );
}