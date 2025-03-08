import React, { useState, useEffect, useRef } from 'react';
import { Trophy, TowerControl as GameController, Rocket } from 'lucide-react';

interface PlayerScore {
  name: string;
  score: number;
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [topScores, setTopScores] = useState<PlayerScore[]>(() => {
    const saved = localStorage.getItem('towerBlocksTopScores');
    return saved ? JSON.parse(saved) : [];
  });

  const gameStateRef = useRef({
    blocks: [] as any[],
    currentBlock: {
      x: 0,
      width: 100,
      direction: 1,
      speed: 2,
    },
    canvasWidth: 0,
    blockHeight: 40,
    animationFrame: 0,
    scrollOffset: 0,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateCanvasSize = () => {
      canvas.width = Math.min(window.innerWidth * 0.9, 600);
      canvas.height = Math.min(window.innerHeight * 0.6, 800);
      gameStateRef.current.canvasWidth = canvas.width;
      gameStateRef.current.currentBlock.width = Math.min(100, canvas.width * 0.3);
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  useEffect(() => {
    if (gameStarted && !gameOver) {
      const canvas = canvasRef.current;
      if (!canvas) return;

      let animationFrameId: number;
      const animate = () => {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { currentBlock, blocks, canvasWidth, scrollOffset } = gameStateRef.current;

        // Update scroll offset if tower is getting too high
        const totalHeight = (blocks.length + 1) * gameStateRef.current.blockHeight;
        const visibleHeight = canvas.height;
        if (totalHeight > visibleHeight * 0.7) {
          gameStateRef.current.scrollOffset = totalHeight - visibleHeight * 0.7;
        }

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Add background grid effect with parallax
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        const gridOffset = scrollOffset * 0.1;
        for (let i = -gridOffset % 30; i < canvas.width; i += 30) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i, canvas.height);
          ctx.stroke();
        }
        for (let i = -gridOffset % 30; i < canvas.height; i += 30) {
          ctx.beginPath();
          ctx.moveTo(0, i);
          ctx.lineTo(canvas.width, i);
          ctx.stroke();
        }

        // Draw existing blocks
        blocks.forEach((block, index) => {
          const y = canvas.height - (index + 1) * gameStateRef.current.blockHeight + scrollOffset;
          drawBlock(ctx, block.x, y, block.width, gameStateRef.current.blockHeight - 2, false, index);
        });

        // Draw current block
        const currentY = canvas.height - (blocks.length + 1) * gameStateRef.current.blockHeight + scrollOffset;
        drawBlock(ctx, currentBlock.x, currentY, currentBlock.width, gameStateRef.current.blockHeight - 2, true, blocks.length);

        // Move current block
        currentBlock.x += currentBlock.direction * currentBlock.speed;
        if (currentBlock.x + currentBlock.width > canvasWidth || currentBlock.x < 0) {
          currentBlock.direction *= -1;
        }

        animationFrameId = requestAnimationFrame(animate);
      };

      animate();
      return () => {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
      };
    }
  }, [gameStarted, gameOver]);

  const drawBlock = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, isMoving: boolean, index: number) => {
    // Create rainbow-like effect based on block index
    const hue = (index * 20) % 360;
    const mainColor = `hsl(${hue}, 70%, 50%)`;
    const darkColor = `hsl(${hue}, 70%, 40%)`;
    
    // Block body with gradient
    const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
    gradient.addColorStop(0, isMoving ? mainColor : darkColor);
    gradient.addColorStop(1, isMoving ? `hsl(${hue}, 70%, 60%)` : mainColor);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, height);

    // Glass effect
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(x, y, width, height / 2);

    // Bottom shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(x, y + height - 5, width, 5);

    // Side highlights
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(x, y, 3, height);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(x + width - 3, y, 3, height);
  };

  const startGame = () => {
    if (!canvasRef.current || !playerName.trim()) return;
    
    const canvas = canvasRef.current;
    const initialBlockWidth = Math.min(100, canvas.width * 0.3);
    
    // Reset game state
    gameStateRef.current = {
      blocks: [],
      currentBlock: {
        x: 0,
        width: initialBlockWidth,
        direction: 1,
        speed: 2,
      },
      canvasWidth: canvas.width,
      blockHeight: 40,
      scrollOffset: 0,
      animationFrame: 0,
    };

    // Update state to start game
    setGameOver(false);
    setScore(0);
    setGameStarted(true);
  };

  const handleClick = () => {
    if (gameOver || !gameStarted) return;

    const { currentBlock, blocks, blockHeight } = gameStateRef.current;
    const newBlock = { ...currentBlock };

    if (blocks.length > 0) {
      const prevBlock = blocks[blocks.length - 1];
      const overlap = Math.min(
        prevBlock.x + prevBlock.width - newBlock.x,
        newBlock.x + newBlock.width - prevBlock.x
      );

      if (overlap <= 0) {
        setGameOver(true);
        const newScore = { name: playerName, score };
        const newTopScores = [...topScores, newScore]
          .sort((a, b) => b.score - a.score)
          .slice(0, 5);
        setTopScores(newTopScores);
        localStorage.setItem('towerBlocksTopScores', JSON.stringify(newTopScores));
        return;
      }

      newBlock.width = overlap;
      newBlock.x = Math.max(prevBlock.x, newBlock.x);
    }

    gameStateRef.current.blocks.push({ x: newBlock.x, width: newBlock.width });
    gameStateRef.current.currentBlock.width = newBlock.width;
    gameStateRef.current.currentBlock.x = 0;
    gameStateRef.current.currentBlock.speed = Math.min(gameStateRef.current.currentBlock.speed + 0.2, 8);
    setScore(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl mx-auto text-center mb-8">
        <h1 className="game-title text-6xl md:text-7xl font-bold text-gray-900 mb-6 animate-pulse">
          Tower Blocks
        </h1>
        <p className="text-purple-200 text-xl md:text-2xl font-light tracking-wide mb-8">
          Designed and Developed by{" "}
          <span className="font-semibold text-purple-300">Aniruddh Joshi</span>
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-start justify-center w-full max-w-6xl mx-auto px-4">
        <div className="w-full md:w-1/3">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-[0_0_50px_rgba(168,85,247,0.2)] border border-purple-500/20">
            <input
              type="text"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              disabled={gameStarted}
              className="w-full px-6 py-4 bg-purple-900/50 text-white placeholder-purple-300 rounded-lg mb-6 text-center text-xl focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
            />
            
            {!gameStarted ? (
              <button
                onClick={startGame}
                disabled={!playerName.trim()}
                className="group w-full px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg font-semibold shadow-[0_0_20px_rgba(168,85,247,0.3)] transform hover:scale-105 transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50"
              >
                <Rocket className="w-6 h-6 group-hover:animate-bounce" />
                Start Game
              </button>
            ) : (
              <div className="flex items-center gap-12 bg-purple-900/30 px-8 py-4 rounded-lg backdrop-blur-sm border border-purple-500/20">
                <div className="text-center">
                  <p className="text-purple-200 text-sm font-medium uppercase tracking-wider">Score</p>
                  <p className="text-3xl font-bold text-white">{score}</p>
                </div>
                <div className="text-center flex items-center gap-3">
                  <Trophy className="text-yellow-400 w-6 h-6" />
                  <div>
                    <p className="text-purple-200 text-sm font-medium uppercase tracking-wider">Best</p>
                    <p className="text-3xl font-bold text-white">
                      {Math.max(...topScores.map(s => s.score), 0)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {topScores.length > 0 && (
              <div className="mt-8 pt-8 border-t border-purple-500/20">
                <h2 className="text-2xl font-bold text-white mb-4">Top Scores</h2>
                <div className="space-y-2">
                  {topScores.map((score, index) => (
                    <div key={index} className="flex items-center justify-between text-purple-200">
                      <span>{score.name}</span>
                      <span className="font-bold">{score.score}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="w-full md:w-2/3">
          <div className="relative">
            <canvas
              ref={canvasRef}
              onClick={handleClick}
              className="bg-purple-950/50 rounded-xl backdrop-blur-lg shadow-[0_0_30px_rgba(168,85,247,0.2)] border border-purple-500/20 w-full"
            />
            
            {gameOver && (
              <div className="absolute inset-0 flex items-center justify-center bg-purple-950/80 rounded-xl backdrop-blur-md">
                <div className="text-center p-8 bg-purple-900/50 rounded-2xl border border-purple-500/30 shadow-xl">
                  <h2 className="text-3xl font-bold text-white mb-4">Game Over!</h2>
                  <p className="text-purple-200 mb-6">Final Score: {score}</p>
                  <button
                    onClick={() => {
                      setGameStarted(false);
                      setGameOver(false);
                      setScore(0);
                      setPlayerName('');
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg font-semibold shadow-lg transform hover:scale-105 transition-all duration-300"
                  >
                    New Game
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;