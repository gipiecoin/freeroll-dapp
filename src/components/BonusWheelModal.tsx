"use client";

import React, { useState, useEffect } from 'react';
import { Wheel } from 'react-custom-roulette';
import { motion, AnimatePresence } from 'framer-motion';

const wheelData = [
    { option: '0.01 GIPIE', style: { backgroundColor: '#393E46', textColor: '#EEEEEE' } },
    { option: '$0.1 USDC', style: { backgroundColor: '#20A4F3', textColor: '#FFFFFF' } },
    { option: '0.5 GIPIE', style: { backgroundColor: '#393E46', textColor: '#EEEEEE' } },
    { option: '$0.25 USDC', style: { backgroundColor: '#20A4F3', textColor: '#FFFFFF' } },
    { option: '1 GIPIE', style: { backgroundColor: '#393E46', textColor: '#EEEEEE' } },
    { option: '$5 USDC', style: { backgroundColor: '#8A2BE2', textColor: '#FFFFFF' } },
    { option: 'NOT LUCKY', style: { backgroundColor: '#232931', textColor: '#6B7280' } },
    { option: '0.05 GIPIE', style: { backgroundColor: '#393E46', textColor: '#EEEEEE' } },
    { option: '$1 USDC', style: { backgroundColor: '#20A4F3', textColor: '#FFFFFF' } },
    { option: '0.1 GIPIE', style: { backgroundColor: '#393E46', textColor: '#EEEEEE' } },
    { option: 'NOT LUCKY', style: { backgroundColor: '#232931', textColor: '#6B7280' } },
    { option: '$10 USDC', style: { backgroundColor: '#FFD700', textColor: '#232931', fontWeight: 'bold' } },
];

interface BonusWheelModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSpin: () => Promise<number | null>;
    isProcessing: boolean;
    prizeIndex: number | null;
    onClaim: () => Promise<void>;
}

export default function BonusWheelModal({ isOpen, onClose, onSpin, isProcessing, prizeIndex, onClaim }: BonusWheelModalProps) {
    const [mustSpin, setMustSpin] = useState(false);
    const [prizeNumber, setPrizeNumber] = useState<number | null>(null);

    useEffect(() => {
        if (prizeIndex !== null && !mustSpin) {
            setPrizeNumber(prizeIndex);
        }
    }, [prizeIndex, mustSpin]);

    if (typeof window === 'undefined') {
        return null;
    }

    const handleSpinClick = async () => {
        if (isProcessing || mustSpin) return;
        const resultPrizeIndex = await onSpin();
        if (resultPrizeIndex !== null) {
            setPrizeNumber(resultPrizeIndex);
            setMustSpin(true);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
                        onClick={(e) => e.stopPropagation()}
                        className="relative w-full max-w-lg"
                    >
                        <div className="flex flex-col items-center justify-center gap-y-8">
                             <div className="relative w-full text-center">
                                <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>
                                    BONUS SPIN
                                </h2>
                                <button onClick={onClose} className="absolute -top-2 -right-2 text-gray-300 hover:text-white transition-colors z-20 bg-gray-900/50 rounded-full p-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                             </div>

                            <div className="relative w-[350px] h-[350px] md:w-[420px] md:h-[420px] flex items-center justify-center">
                                <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-3xl"></div>

                                <div id="roulette-wrapper" className="w-full h-full">
                                    <Wheel
                                        mustStartSpinning={mustSpin}
                                        prizeNumber={prizeNumber ?? 0}
                                        data={wheelData}
                                        spinDuration={0.3}
                                        onStopSpinning={() => {
                                            setMustSpin(false);
                                            setTimeout(() => {
                                                if (prizeNumber !== null && wheelData[prizeNumber].option !== "NOT LUCKY") {
                                                    onClaim();
                                                }
                                            }, 2000);
                                        }}
                                        // FIXED: By removing the 'pointerProps' completely,
                                        // the library will render its default orange/red pointer at the top-right.
                                        textDistance={65}
                                        fontSize={12}
                                        backgroundColors={['#2D3748', '#1A202C']}
                                        textColors={['#EEEEEE']}
                                        outerBorderColor={'#4A5568'}
                                        outerBorderWidth={10}
                                        innerRadius={20}
                                        innerBorderColor={'#4A5568'}
                                        innerBorderWidth={15}
                                        radiusLineColor={'#4A5568'}
                                        radiusLineWidth={1}
                                    />
                                </div>
                            </div>
                            
                            <button 
                                onClick={handleSpinClick}
                                disabled={isProcessing || mustSpin}
                                className="w-full max-w-xs px-8 py-3 rounded-full font-bold text-xl md:text-2xl text-white bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-500 hover:from-emerald-600 hover:via-teal-700 hover:to-cyan-600 focus:outline-none focus:ring-4 focus:ring-cyan-300/50 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300 ease-in-out transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl shadow-cyan-500/30 relative overflow-hidden group"
                            >
                                <span className="relative z-10 flex items-center justify-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm0 3a1 1 0 011 1v1a1 1 0 11-2 0V6a1 1 0 011-1zm0 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm0 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5 3a1 1 0 100 2h1a1 1 0 100-2H5zm0 4a1 1 0 100 2h1a1 1 0 100-2H5zm0 4a1 1 0 100 2h1a1 1 0 100-2H5zm10 0a1 1 0 100 2h1a1 1 0 100-2h-1zm0-4a1 1 0 100 2h1a1 1 0 100-2h-1zm0-4a1 1 0 100 2h1a1 1 0 100-2h-1z" clipRule="evenodd" />
                                    </svg>
                                    <span>{isProcessing ? "Confirming..." : mustSpin ? "Spinning..." : "SPIN NOW"}</span>
                                </span>
                                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                                <span className="absolute bottom-0 left-1/2 w-0 h-1 bg-cyan-300 group-hover:w-1/2 group-hover:left-0 transition-all duration-300 ease-in-out"></span>
                                <span className="absolute bottom-0 right-1/2 w-0 h-1 bg-cyan-300 group-hover:w-1/2 group-hover:right-0 transition-all duration-300 ease-in-out"></span>
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}