// Motion constants with optimized easing functions
// Generated using professional motion tools for better UX

export const MOTION_CONFIG = {
  // Spring animations for interactive elements
  springs: {
    // Quick, snappy spring for buttons and small interactions
    quick: '450ms linear(0, 0.2348, 0.6075, 0.8763, 1.0076, 1.0451, 1.0389, 1.0217, 1.0079, 1.0006, 0.9981, 0.9981, 0.9988, 0.9995, 1)',
    
    // Standard spring for cards and medium interactions
    standard: '900ms linear(0, 0.0697, 0.2323, 0.4311, 0.6265, 0.7946, 0.9243, 1.0138, 1.0669, 1.0909, 1.094, 1.0837, 1.0666, 1.0476, 1.0297, 1.0149, 1.0039, 0.9967, 0.9926, 0.9911, 0.9913, 0.9926, 0.9943, 0.9961, 0.9977, 0.999, 0.9999, 1.0005, 1, 1)',
  },
  
  // Bounce animation for special effects
  bounce: {
    // Subtle bounce for upload drop zones and success states
    subtle: '0.6s linear(0, 0.0022, 0.0087, 0.0196, 0.0348, 0.0543, 0.0782, 0.1065, 0.139, 0.176, 0.2173, 0.2629, 0.3128, 0.3672, 0.4258, 0.4888, 0.5562, 0.6279, 0.7039, 0.7843, 0.869, 0.9581, 0.9752, 0.9332, 0.8954, 0.8621, 0.833, 0.8083, 0.788, 0.772, 0.7603, 0.753, 0.7501, 0.7515, 0.7572, 0.7673, 0.7817, 0.8004, 0.8235, 0.851, 0.8828, 0.9189, 0.9594, 0.9979, 0.9772, 0.9608, 0.9487, 0.941, 0.9377, 0.9386, 0.944, 0.9537, 0.9677, 0.986, 0.996, 0.9881, 0.9846, 0.9854, 0.9905, 1)',
  },
  
  // Standard durations for consistency
  durations: {
    fast: '100ms',
    quick: '200ms',
    standard: '300ms',
    slow: '500ms',
  },
  
  // Timing function utilities
  timing: {
    // For opacity and color transitions
    easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
    
    // For scale and transform transitions
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    
    // For bounce-like effects without full bounce
    anticipate: 'cubic-bezier(0.68, -0.6, 0.32, 1.6)',
  }
} as const;

// CSS custom properties for easier usage
export const MOTION_CSS_VARS = `
  :root {
    --motion-spring-quick: ${MOTION_CONFIG.springs.quick};
    --motion-spring-standard: ${MOTION_CONFIG.springs.standard};
    --motion-bounce-subtle: ${MOTION_CONFIG.bounce.subtle};
    --motion-duration-fast: ${MOTION_CONFIG.durations.fast};
    --motion-duration-quick: ${MOTION_CONFIG.durations.quick};
    --motion-duration-standard: ${MOTION_CONFIG.durations.standard};
    --motion-duration-slow: ${MOTION_CONFIG.durations.slow};
    --motion-ease-out: ${MOTION_CONFIG.timing.easeOut};
    --motion-ease-in-out: ${MOTION_CONFIG.timing.easeInOut};
    --motion-ease-anticipate: ${MOTION_CONFIG.timing.anticipate};
  }
`;

// React Motion variants for Framer Motion
export const MOTION_VARIANTS = {
  // Page transitions
  page: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
  },
  
  // Card animations
  card: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    hover: { scale: 1.02 },
    tap: { scale: 0.98 },
  },
  
  // Image animations
  image: {
    initial: { opacity: 0, scale: 1.1 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 },
  },
  
  // List item animations
  listItem: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
  },
  
  // Upload zone animations
  uploadZone: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    dragOver: { scale: 1.05, borderColor: 'hsl(var(--primary))' },
    dragLeave: { scale: 1, borderColor: 'hsl(var(--border))' },
  },
} as const;

// Motion transitions
export const MOTION_TRANSITIONS = {
  // Spring-based transitions
  spring: {
    quick: {
      type: 'spring',
      stiffness: 300,
      damping: 25,
      mass: 0.5,
    },
    standard: {
      type: 'spring',
      stiffness: 200,
      damping: 20,
      mass: 0.8,
    },
    gentle: {
      type: 'spring',
      stiffness: 100,
      damping: 15,
      mass: 1,
    },
  },
  
  // Tween-based transitions
  tween: {
    fast: {
      duration: 0.1,
      ease: [0.16, 1, 0.3, 1],
    },
    quick: {
      duration: 0.2,
      ease: [0.16, 1, 0.3, 1],
    },
    standard: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1],
    },
    slow: {
      duration: 0.5,
      ease: [0.4, 0, 0.2, 1],
    },
  },
  
  // Stagger for lists
  stagger: {
    children: 0.1,
    delayChildren: 0.1,
  },
} as const;
