'use client';

import React from 'react';
import { motion } from 'framer-motion';

export type MascotExpression = 'happy' | 'thinking' | 'celebrating' | 'chewing' | 'doctor';

interface MascotProps {
  expression?: MascotExpression;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  animate?: boolean;
}

const sizeMap = {
  sm: 'w-10 h-10',
  md: 'w-16 h-16',
  lg: 'w-24 h-24',
  xl: 'w-36 h-36',
};

export function Mascot({
  expression = 'happy',
  size = 'md',
  className = '',
  animate = true,
}: MascotProps) {
  const sizeClasses = sizeMap[size];

  const floatingVariants: import('framer-motion').Variants = {
    animate: {
      y: [0, -4, 0],
      rotate: [0, 1.5, -1.5, 0],
      transition: {
        duration: 3.5,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  };

  return (
    <motion.div
      variants={animate ? floatingVariants : undefined}
      animate={animate ? 'animate' : undefined}
      className={`relative inline-flex items-center justify-center select-none ${sizeClasses} ${className}`}
    >
      <svg
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-sm"
      >
        {/* Soft Drop Shadow for plate base */}
        <ellipse cx="60" cy="112" rx="42" ry="5" fill="#E7E5E4" opacity="0.6" />

        {/* Plate Outer Rim with cute thick border */}
        <circle
          cx="60"
          cy="58"
          r="52"
          fill="#FFFDF9"
          stroke="#38BDF8"
          strokeWidth="4"
        />

        {/* Plate Inner Basin */}
        <circle
          cx="60"
          cy="58"
          r="40"
          fill="#FFFFFF"
          stroke="#BAE6FD"
          strokeWidth="3"
          strokeDasharray="4 4"
        />

        {/* Doctor Hat / Stethoscope accessory */}
        {expression === 'doctor' && (
          <g>
            <circle cx="60" cy="12" r="10" fill="#38BDF8" stroke="#0284C7" strokeWidth="2.5" />
            <circle cx="60" cy="12" r="4" fill="#FFFFFF" />
            <path
              d="M48 20 C48 30, 72 30, 72 20"
              stroke="#0284C7"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </g>
        )}

        {/* Cute Rosy Cheeks */}
        <ellipse cx="40" cy="65" rx="6.5" ry="4" fill="#FED7AA" opacity="0.9" />
        <ellipse cx="80" cy="65" rx="6.5" ry="4" fill="#FED7AA" opacity="0.9" />

        {/* Expressions Logic */}
        {expression === 'happy' && (
          <g>
            {/* Sparkly Eyes */}
            <circle cx="45" cy="52" r="4.5" fill="#292524" />
            <circle cx="47" cy="50" r="1.5" fill="#FFFFFF" />
            <circle cx="75" cy="52" r="4.5" fill="#292524" />
            <circle cx="77" cy="50" r="1.5" fill="#FFFFFF" />
            {/* Sweet Smile */}
            <path
              d="M51 64 C55 71, 65 71, 69 64"
              stroke="#292524"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          </g>
        )}

        {expression === 'thinking' && (
          <g>
            {/* Curious Eyes looking up */}
            <circle cx="45" cy="49" r="4.5" fill="#292524" />
            <circle cx="46" cy="47" r="1.5" fill="#FFFFFF" />
            <circle cx="75" cy="49" r="4.5" fill="#292524" />
            <circle cx="76" cy="47" r="1.5" fill="#FFFFFF" />
            {/* Quirky Mouth */}
            <path
              d="M54 66 Q60 62 66 66"
              stroke="#292524"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            {/* Thinking Hand/Spark */}
            <circle cx="85" cy="38" r="3" fill="#FACC15" />
            <circle cx="92" cy="30" r="4.5" fill="#FACC15" />
          </g>
        )}

        {expression === 'celebrating' && (
          <g>
            {/* Happy Closed Arc Eyes ^ ^ */}
            <path
              d="M40 54 Q45 47 50 54"
              stroke="#292524"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <path
              d="M70 54 Q75 47 80 54"
              stroke="#292524"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            {/* Open Happy Mouth with Tongue */}
            <path
              d="M51 63 Q60 76 69 63 Z"
              fill="#FB923C"
              stroke="#292524"
              strokeWidth="3"
            />
            {/* Confetti Star Accents */}
            <path d="M22 28 L24 34 L30 35 L25 39 L27 45 L22 41 L17 45 L19 39 L14 35 L20 34 Z" fill="#FACC15" />
            <path d="M98 28 L100 34 L106 35 L101 39 L103 45 L98 41 L93 45 L95 39 L90 35 L96 34 Z" fill="#4ADE80" />
          </g>
        )}

        {expression === 'chewing' && (
          <g>
            {/* Content Closed Eyes */}
            <path
              d="M41 53 Q45 57 49 53"
              stroke="#292524"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <path
              d="M71 53 Q75 57 79 53"
              stroke="#292524"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            {/* Puffed Cheeks Mouth with Crumb */}
            <ellipse cx="60" cy="65" rx="5" ry="3.5" fill="#292524" />
            <circle cx="70" cy="69" r="1.5" fill="#F59E0B" />
          </g>
        )}

        {expression === 'doctor' && (
          <g>
            {/* Kind Professional Eyes */}
            <circle cx="45" cy="52" r="4.5" fill="#292524" />
            <circle cx="47" cy="50" r="1.5" fill="#FFFFFF" />
            <circle cx="75" cy="52" r="4.5" fill="#292524" />
            <circle cx="77" cy="50" r="1.5" fill="#FFFFFF" />
            {/* Warm Reassuring Smile */}
            <path
              d="M52 64 C56 70, 64 70, 68 64"
              stroke="#292524"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </g>
        )}

        {/* Tiny Cutlery Handles on Sides */}
        <path
          d="M12 44 C10 44 9 47 9 58 C9 69 10 72 12 72"
          stroke="#4ADE80"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M108 44 C110 44 111 47 111 58 C111 69 110 72 108 72"
          stroke="#FB923C"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </motion.div>
  );
}
