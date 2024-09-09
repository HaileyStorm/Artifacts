import React, { useEffect, useRef, useState, useCallback } from 'react';

const StringArtGenerator = () => {
  const canvasRef = useRef(null);
  const imageCanvasRef = useRef(null);
  const [numPegs, setNumPegs] = useState(1500);
  const [numWindings, setNumWindings] = useState(5000);
  const [canvasSize, setCanvasSize] = useState(1200);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [isApproximating, setIsApproximating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(100);

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

      const numStrands = 1;
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

          // Blend new color with existing color
          data[index] = Math.min(255, (data[index] + r) / 2);
          data[index + 1] = Math.min(255, (data[index + 1] + g) / 2);
          data[index + 2] = Math.min(255, (data[index + 2] + b) / 2);
          data[index + 3] = 255;
        }
      }

      ctx.putImageData(imageData, 0, 0);
    }

    generateRandomArt(ctx, numWindings) {
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, this.canvasSize, this.canvasSize);

      let colorOffset = 0;
      for (let i = 0; i < numWindings; i++) {
        const startPeg = Math.floor(Math.random() * this.numPegs);
        const endPeg = Math.floor(Math.random() * this.numPegs);
        this.drawLine(ctx, startPeg, endPeg, colorOffset);
        colorOffset = (colorOffset + 0.1) % 1;
      }
    }

    async approximateImage(ctx, targetImageData, numWindings, setProgress, speed, cancelFlag) {
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, this.canvasSize, this.canvasSize);

      let currentPeg = 0;
      let colorOffset = 0;
      const tempCanvas = new OffscreenCanvas(this.canvasSize, this.canvasSize);
      const tempCtx = tempCanvas.getContext('2d');

      const calculateError = (imageData) => {
        let error = 0;
        for (let i = 0; i < imageData.data.length; i += 4) {
          const currentPixel = (imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2]) / 3;
          const targetPixel = (targetImageData[i] + targetImageData[i + 1] + targetImageData[i + 2]) / 3;
          error += Math.abs(currentPixel - targetPixel);
        }
        return error;
      };

      for (let i = 0; i < numWindings; i++) {
        if (cancelFlag.current) break;

        let bestError = Infinity;
        let bestPeg = -1;

        const sampleSize = Math.min(20, this.numPegs);
        const sampledPegs = new Set();
        while (sampledPegs.size < sampleSize) {
          sampledPegs.add(Math.floor(Math.random() * this.numPegs));
        }

        for (let nextPeg of sampledPegs) {
          if (nextPeg === currentPeg) continue;

          tempCtx.drawImage(ctx.canvas, 0, 0);
          this.drawLine(tempCtx, currentPeg, nextPeg, colorOffset);

          const error = calculateError(tempCtx.getImageData(0, 0, this.canvasSize, this.canvasSize));
          if (error < bestError) {
            bestError = error;
            bestPeg = nextPeg;
          }
        }

        if (bestPeg !== -1) {
          this.drawLine(ctx, currentPeg, bestPeg, colorOffset);
          currentPeg = bestPeg;
          colorOffset = (colorOffset + 0.1) % 1;
        } else {
          currentPeg = Math.floor(Math.random() * this.numPegs);
        }

        if (i % 10 === 0) {
          setProgress((i + 1) / numWindings * 100);
          if (speed < 100) {
            await new Promise(resolve => setTimeout(resolve, Math.max(0, 100 - speed)));
          } else {
            await new Promise(resolve => setTimeout(resolve, 0));
          }
        }
      }
    }
  }

  const handleImageUpload = (event) => {
    if (event.target.files && event.target.files[0]) {
      setUploadedImage(event.target.files[0]);
    }
  };

  const cancelFlag = useRef(false);

  const startApproximation = useCallback(async () => {
    if (uploadedImage) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const imageCanvas = imageCanvasRef.current;
      const imageCtx = imageCanvas.getContext('2d');
      const targetImageData = imageCtx.getImageData(0, 0, canvasSize, canvasSize).data;

      const stringArt = new StringArt(numPegs, canvasSize);

      setIsApproximating(true);
      setProgress(0);
      cancelFlag.current = false;
      await stringArt.approximateImage(ctx, targetImageData, numWindings, setProgress, speed, cancelFlag);
      //setIsApproximating(false);
    }
  }, [uploadedImage, numPegs, canvasSize, numWindings, speed]);

  useEffect(() => {
    if (!isApproximating) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const stringArt = new StringArt(numPegs, canvasSize);

      stringArt.generateRandomArt(ctx, numWindings);
    }
  }, [isApproximating, numPegs, numWindings, canvasSize]);

  useEffect(() => {
    if (uploadedImage) {
      const canvas = imageCanvasRef.current;
      const ctx = canvas.getContext('2d');

      const img = new Image();
      img.onload = () => {
        const size = Math.min(img.width, img.height);
        const sourceX = (img.width - size) / 2;
        const sourceY = (img.height - size) / 2;

        ctx.drawImage(img, sourceX, sourceY, size, size, 0, 0, canvasSize, canvasSize);

        const imageData = ctx.getImageData(0, 0, canvasSize, canvasSize);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
          data[i] = data[i + 1] = data[i + 2] = avg;
        }
        ctx.putImageData(imageData, 0, 0);
      };
      img.src = URL.createObjectURL(uploadedImage);
    }
  }, [uploadedImage, canvasSize]);

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="flex space-x-4">
        <canvas
          ref={canvasRef}
          width={canvasSize}
          height={canvasSize}
          className="border border-gray-300"
        />
        <canvas
          ref={imageCanvasRef}
          width={canvasSize}
          height={canvasSize}
          className="border border-gray-300"
        />
      </div>
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
        <div>
          <label htmlFor="imageUpload" className="mr-2">Upload Image:</label>
          <input
            type="file"
            id="imageUpload"
            accept="image/*"
            onChange={handleImageUpload}
            className="border border-gray-300 px-2 py-1"
          />
        </div>
        <div className="flex justify-between items-center">
          <div>
            <button
              onClick={() => {
                cancelFlag.current = true;
                setIsApproximating(false);
              }}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-2"
            >
              {isApproximating ? "Stop" : "Generate Random Art"}
            </button>
            <button
              onClick={startApproximation}
              disabled={!uploadedImage || isApproximating}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              {isApproximating ? "Approximating..." : "Approximate Image"}
            </button>
          </div>
          <div className="w-1/3">
            <div className="bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
              <div
                className="bg-blue-600 h-2.5 rounded-full"
                style={{width: `${progress}%`}}
              ></div>
            </div>
            <div className="text-center mt-1">{progress.toFixed(1)}%</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StringArtGenerator;