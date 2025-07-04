// src/app/game/page.tsx
"use client";

import React from "react";
import { useRouter } from 'next/navigation';

const GamePage = () => {
  const router = useRouter();

  const game = [
    {
      id: "gipiedig_freeroll",
      name: "GipieDig",
      color: "from-teal-400 to-emerald-500",
      path: "../gipiedig",
    },
    {
      id: "general_freeroll",
      name: "Freeroll",
      color: "from-blue-500 to-cyan-500",
      path: "../freeroll",
    },
  ];

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!e.currentTarget.querySelector(".glint")) {
      const glint = document.createElement("div");
      glint.className = "glint";
      e.currentTarget.appendChild(glint);
      setTimeout(() => glint.remove(), 2000);
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>, gameId: string) => {
    const targetGame = game.find(game => game.id === gameId);

    if (targetGame) {
      const targetElement = e.currentTarget;
      targetElement.classList.add("click-scale");

      router.push(targetGame.path);

      setTimeout(() => {
        if (targetElement && targetElement.classList) {
          targetElement.classList.remove("click-scale");
        }
      }, 300);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-gray-900 via-slate-900 to-black text-white flex flex-col items-center justify-start py-12 px-4 font-sans">
      {/* Component's CSS styles for a good and interactive look */}
      <style jsx>{`
        /* stylelint-disable */

        /* Floating animation for game cards (vertical movement only) */
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        /* Pulsating glow animation for the circular cards */
        @keyframes pulse-glow {
          0% { box-shadow: 0 0 10px rgba(45, 212, 191, 0.5); }
          50% { box-shadow: 0 0 25px rgba(45, 212, 191, 0.8); }
          100% { box-shadow: 0 0 10px rgba(45, 212, 191, 0.5); }
        }

        /* Background particle animation for visual depth */
        @keyframes particleAnimation {
          0% {
            transform: translate(0, 0) scale(0.5);
            opacity: 0.3;
          }
          50% {
            opacity: 0.7;
          }
          100% {
            transform: translate(-50vw, 50vh) scale(1.5);
            opacity: 0;
          }
        }
        .particle {
          position: absolute;
          border-radius: 50%;
          background: radial-gradient(
            circle,
            rgba(255, 255, 255, 0.1) 0%,
            rgba(255, 255, 255, 0) 70%
          );
          animation: particleAnimation 15s linear infinite;
          z-index: 0;
        }

        /* Glint effect on hover for interactive feedback */
        @keyframes glint {
          0% {
            transform: skewX(0) translateX(0);
            opacity: 0.7;
          }
          20% {
            opacity: 0.9;
          }
          100% {
            transform: skewX(45deg) translateX(100%);
            opacity: 0;
          }
        }
        .glint {
          position: absolute;
          top: -10%;
          left: -10%;
          width: 120%;
          height: 120%;
          background: linear-gradient(
            45deg,
            rgba(255, 255, 255, 0.1),
            rgba(255, 255, 255, 0.3),
            rgba(255, 255, 255, 0.1)
          );
          animation: glint 2s infinite;
          z-index: 20;
          overflow: hidden;
          border-radius: 50%;
        }

        /* Hover glow effect for cards */
        @keyframes hoverGlow {
          0% {
            box-shadow: 0 0 10px rgba(45, 212, 191, 0.2);
          }
          50% {
            box-shadow: 0 0 20px rgba(45, 212, 191, 0.5);
          }
          100% {
            box-shadow: 0 0 10px rgba(45, 212, 191, 0.2);
          }
        }
        .hover-glow:hover {
          animation: hoverGlow 1.5s infinite;
        }

        /* Click scale effect for immediate feedback */
        @keyframes clickScale {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
          100% {
            transform: scale(1);
          }
        }
        .click-scale {
          animation: clickScale 0.3s ease-out;
        }

        /* Fade-in animation for game content */
        @keyframes tabFade {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .tab-fade {
          animation: tabFade 0.5s ease-out forwards;
        }

        /* Individual particle positioning and sizing */
        .particle-1 {
          width: 20px;
          height: 20px;
          left: 10%;
          top: 20%;
          animation-delay: 0s;
        }
        .particle-2 {
          width: 15px;
          height: 15px;
          left: 70%;
          top: 10%;
          animation-delay: 2s;
          animation-duration: 18s;
        }
        .particle-3 {
          width: 25px;
          height: 25px;
          left: 30%;
          top: 70%;
          animation-delay: 4s;
          animation-duration: 12s;
        }
        .particle-4 {
          width: 18px;
          height: 18px;
          left: 90%;
          top: 50%;
          animation-delay: 6s;
          animation-duration: 16s;
        }
        .particle-5 {
          width: 22px;
          height: 22px;
          left: 5%;
          top: 90%;
          animation-delay: 8s;
          animation-duration: 14s;
        }

        /* ----- Styles for Circular Game Cards ----- */
        .game-card-circle {
          width: 160px;
          height: 160px;
          border-radius: 50%;
          position: relative;
          overflow: hidden;
          box-shadow: 0 0 10px rgba(45, 212, 191, 0.5); /* Default box-shadow for pulse start */
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease-in-out;
          
          animation: float 4s ease-in-out infinite, pulse-glow 2s ease-in-out infinite;

          border: 3px solid transparent;
          border-image: linear-gradient(
              to bottom right,
              var(--game-color-from, #4ade80),
              var(--game-color-to, #2dd4bf)
            )
            1;
        }

        .game-card-circle .inner-bg {
          position: absolute;
          top: 3px;
          left: 3px;
          right: 3px;
          bottom: 3px;
          background-color: black;
          border-radius: 50%;
          z-index: 1;
        }

        /* Content wrapper for all cards */
        .game-card-circle .content-wrapper { 
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          height: 100%;
          width: 100%;
          padding: 10px;
        }

        /* Responsive adjustments for circular cards */
        @media (max-width: 639px) {
          .game-card-circle {
            width: 120px;
            height: 120px;
          }
          .game-card-circle .content-wrapper h2 {
            font-size: 1rem;
          }
          .game-card-circle .content-wrapper span {
            font-size: 2rem;
          }
        }
        @media (min-width: 768px) {
          .game-card-circle {
            width: 180px;
            height: 180px;
          }
        }
        @media (min-width: 1024px) {
          .game-card-circle {
            width: 200px;
            height: 200px;
          }
        }
      `}</style>

      {/* Animated background particles */}
      <div className="particle particle-1"></div>
      <div className="particle particle-2"></div>
      <div className="particle particle-3"></div>
      <div className="particle particle-4"></div>
      <div className="particle particle-5"></div>

      {/* Main Page Title */}
      <h1 className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-500 mb-4 drop-shadow-[0_0_15px_rgba(45,212,191,0.7)] relative z-10 text-center">
        Play to Earn Crypto
      </h1>
      {/* Subtitle to introduce the Gipie token */}
      <p className="text-xl text-center text-gray-300 mb-12 drop-shadow-[0_0_5px_rgba(255,255,255,0.2)] relative z-10">
        Earn valuable Gipie tokens by playing exciting game!
      </p>

      {/* Game selection grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-6 max-w-7xl w-full relative z-10 p-4 justify-items-center">
        {game.map((game) => (
          <div
            key={game.id}
            onClick={(e) => handleClick(e, game.id)}
            onMouseEnter={handleMouseEnter}
            className={`cursor-pointer float-animation hover:scale-105 hover-glow focus:outline-none focus:ring-4 focus:ring-teal-300 focus:ring-opacity-75 game-card-circle`}
            style={
              {
                "--game-color-from": game.color.split(" ")[0].replace("from-", "#"),
                "--game-color-to": game.color.split(" ")[1].replace("to-", "#"),
              } as React.CSSProperties
            }
            tabIndex={0}
            role="button"
            aria-label={`Select ${game.name} game`}
          >
            {/* Inner black background for the glowing border effect */}
            <div className="inner-bg"></div>

            {/* Content wrapper */}
            <div className="content-wrapper">
              <h2 className="font-extrabold text-white mb-1 drop-shadow-[0_0_5px_rgba(255,255,255,0.7)] text-center break-words">
                {game.name}
              </h2>
              <span className="text-3xl" role="img" aria-label="Game controller emoji">
                🎮
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GamePage;