import { motion } from 'framer-motion';

export type MarkStatus = 'idle' | 'live' | 'alarm';

const GLOW: Record<MarkStatus, string> = {
  idle:  'rgba(58,160,216,0)',
  live:  'rgba(58,160,216,0.55)',
  alarm: 'rgba(227,6,19,0.75)',
};

const COLOR: Record<MarkStatus, string> = {
  idle:  '#3aa0d8',
  live:  '#3aa0d8',
  alarm: '#ff5560',
};

interface PegelBoardMarkProps {
  status?: MarkStatus;
  size?: number;
  className?: string;
}

export function PegelBoardMark({ status = 'live', size = 32, className }: PegelBoardMarkProps) {
  const duration = status === 'alarm' ? 1.2 : 2.4;
  const scaleMax = status === 'alarm' ? 1.05 : 1.04;
  const color    = COLOR[status];
  const glow     = GLOW[status];

  return (
    <motion.svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      style={{ color, transformOrigin: 'center', flexShrink: 0 }}
      animate={
        status === 'idle'
          ? { scale: 1, filter: 'drop-shadow(0 0 0 rgba(0,0,0,0))' }
          : {
              scale: [1, scaleMax, 1],
              filter: [
                `drop-shadow(0 0 0 ${glow})`,
                `drop-shadow(0 0 14px ${glow})`,
                `drop-shadow(0 0 0 ${glow})`,
              ],
            }
      }
      transition={{ duration, ease: 'easeInOut', repeat: Infinity }}
    >
      <path
        d="M4 22 Q 14 12 24 22 T 44 22 T 64 22"
        fill="none"
        stroke="currentColor"
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <g fill="currentColor">
        <rect x={10}   y={42} width={9} height={14} rx={2} />
        <rect x={27.5} y={36} width={9} height={20} rx={2} />
        <rect x={45}   y={30} width={9} height={26} rx={2} />
      </g>
    </motion.svg>
  );
}
