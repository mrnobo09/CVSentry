import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface AnimationWrapperProps {
    children: ReactNode;
    className?: string;
    delay?: number;
}

export const PageTransition = ({ children, className }: AnimationWrapperProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className={className}
        >
            {children}
        </motion.div>
    );
};

export const FadeIn = ({ children, className, delay = 0 }: AnimationWrapperProps) => {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay }}
            className={className}
        >
            {children}
        </motion.div>
    );
};

export const SlideUp = ({ children, className, delay = 0 }: AnimationWrapperProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay, ease: "easeOut" }}
            className={className}
        >
            {children}
        </motion.div>
    );
};
