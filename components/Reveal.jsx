import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
export default function Reveal({ children, delay = 0, className }) {
  return <motion.div className={cn(className)} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.05 }} transition={{ duration: 0.45, delay }}>{children}</motion.div>;
}
