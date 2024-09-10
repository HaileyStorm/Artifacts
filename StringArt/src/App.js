import React, { useEffect, useRef, useState, useCallback } from 'react';

const StringArtGenerator = () => {
  const canvasRef = useRef(null);
  const [numPegs, setNumPegs] = useState(1500);
  const [numWindings, setNumWindings] = useState(5000);
  const [canvasSize, setCanvasSize] = useState(1200);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(100);
  const [status, setStatus] = useState('');

  const generatePastelColor = (t) => {
    const r = Math.sin(t) * 64 + 191;
    const g = Math.sin(t + 2 * Math.PI / 3) * 64 + 191;
    const b = Math.sin(t + 4 * Math.PI / 3) * 64 + 191;
    return [r, g, b];
  };

  class StringArt {
    constructor(numPegs, canvasSize) {
      this.numPegs = numPegs;
      this.canvasSize = canvasSize;
      this.radius = canvasSize / 2 - 1;
      this.pegPositions = [];
      this.generatePegPositions();
    }

    generatePegPositions() {
      for (let i = 0; i < this.numPegs; i++) {
        const angle = (i / this.numPegs) * 2 * Math.PI;
        const x = this.radius + this.radius * Math.cos(angle);
        const y = this.radius + this.radius * Math.sin(angle);
        this.pegPositions.push({ x, y });
      }
    }

    drawLine(ctx, startPeg, endPeg, colorOffset) {
      const startPos = this.pegPositions[startPeg];
      const endPos = this.pegPositions[endPeg];

      const dx = endPos.x - startPos.x;
      const dy = endPos.y - startPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const steps = Math.max(100, Math.floor(distance));

      const imageData = ctx.getImageData(0, 0, this.canvasSize, this.canvasSize);
      const data = imageData.data;

      const numStrands = 5;
      const strandWidth = 0.035;

      for (let s = 0; s < numStrands; s++) {
        const strandOffset = (s - (numStrands - 1) / 2) * strandWidth;
        const perpX = -dy / distance * strandOffset;
        const perpY = dx / distance * strandOffset;

        for (let i = 0; i < steps; i++) {
          const t = i / (steps - 1);
          const x = Math.round(startPos.x + dx * t + perpX);
          const y = Math.round(startPos.y + dy * t + perpY);
          const colorT = (colorOffset + t * 2) % 1;

          const [r, g, b] = generatePastelColor(colorT * Math.PI * 2);
          const index = (y * this.canvasSize + x) * 4;

          data[index] = Math.min(255, (data[index] + r*3) / 4);
          data[index + 1] = Math.min(255, (data[index + 1] + g*3) / 4);
          data[index + 2] = Math.min(255, (data[index + 2] + b*3) / 4);
          data[index + 3] = 255;
        }
      }

      ctx.putImageData(imageData, 0, 0);
    }

    async generateRandomArt(ctx, numWindings, setProgress, getSpeed, cancelFlag) {
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, this.canvasSize, this.canvasSize);

      let colorOffset = 0;
      let currentPeg = Math.floor(Math.random() * this.numPegs);

      for (let i = 0; i < numWindings; i++) {
        if (cancelFlag.current) break;

        const nextPeg = Math.floor(Math.random() * this.numPegs);
        this.drawLine(ctx, currentPeg, nextPeg, colorOffset);
        colorOffset = (colorOffset + 0.1) % 1;

        currentPeg = nextPeg;

        setProgress((i + 1) / numWindings * 100);

        const currentSpeed = getSpeed();
        if (currentSpeed === 0) {
          while (getSpeed() === 0 && !cancelFlag.current) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } else {
          await new Promise(resolve => setTimeout(resolve, Math.max(1, 500 - currentSpeed * 5)));
        }
      }
    }
  }

  const cancelFlag = useRef(false);
  const speedRef = useRef(speed);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  const startRandomArt = useCallback(async () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const stringArt = new StringArt(numPegs, canvasSize);

    setIsGenerating(true);
    setProgress(0);
    setStatus('Generating...');
    cancelFlag.current = false;
    await stringArt.generateRandomArt(ctx, numWindings, setProgress, () => speedRef.current, cancelFlag);
    setIsGenerating(false);
    setStatus(cancelFlag.current ? 'Canceled' : 'Completed');
  }, [numPegs, numWindings, canvasSize]);

  return (
    <div className="flex flex-col items-center space-y-4">
      <canvas
        ref={canvasRef}
        width={canvasSize}
        height={canvasSize}
        className="border border-gray-300"
      />
      <div className="space-y-2 w-full max-w-xl">
        <div>
          <label htmlFor="numPegs" className="mr-2">Number of Pegs:</label>
          <input
            type="number"
            id="numPegs"
            value={numPegs}
            onChange={(e) => setNumPegs(parseInt(e.target.value))}
            className="border border-gray-300 px-2 py-1"
          />
        </div>
        <div>
          <label htmlFor="numWindings" className="mr-2">Number of Windings:</label>
          <input
            type="number"
            id="numWindings"
            value={numWindings}
            onChange={(e) => setNumWindings(parseInt(e.target.value))}
            className="border border-gray-300 px-2 py-1"
          />
        </div>
        <div>
          <label htmlFor="canvasSize" className="mr-2">Canvas Size:</label>
          <input
            type="number"
            id="canvasSize"
            value={canvasSize}
            onChange={(e) => setCanvasSize(parseInt(e.target.value))}
            className="border border-gray-300 px-2 py-1"
          />
        </div>
        <div>
          <label htmlFor="speed" className="mr-2">Speed:</label>
          <input
            type="range"
            id="speed"
            min="0"
            max="100"
            value={speed}
            onChange={(e) => setSpeed(parseInt(e.target.value))}
            className="w-full"
          />
          <span className="ml-2">{speed === 0 ? 'Paused' : speed === 100 ? 'Max Speed' : `${speed}%`}</span>
        </div>
        <div className="flex justify-between items-center">
          <button
            onClick={() => {
              if (isGenerating) {
                cancelFlag.current = true;
              } else {
                startRandomArt();
              }
            }}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-2"
          >
            {isGenerating ? "Stop" : "Generate Random Art"}
          </button>
          <div className="w-1/3">
            <div className="bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
              <div
                className="bg-blue-600 h-2.5 rounded-full"
                style={{width: `${progress}%`}}
              ></div>
            </div>
            <div className="text-center mt-1">{status} {progress.toFixed(1)}%</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StringArtGenerator;