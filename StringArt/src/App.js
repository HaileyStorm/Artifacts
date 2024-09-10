import React, { useEffect, useRef, useState, useCallback } from 'react';

const StringArtGenerator = () => {
  const canvasRef = useRef(null);
  const imageCanvasRef = useRef(null);
  const [numPegs, setNumPegs] = useState(1500);
  const [numWindings, setNumWindings] = useState(5000);
  const [canvasSize, setCanvasSize] = useState(1200);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [isApproximating, setIsApproximating] = useState(false);
  const [isGeneratingRandom, setIsGeneratingRandom] = useState(false);
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

    async generateRandomArt(ctx, numWindings, setProgress, speed, cancelFlag) {
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, this.canvasSize, this.canvasSize);

      let colorOffset = 0;
      let currentPeg = Math.floor(Math.random() * this.numPegs); // Start with a random peg

      for (let i = 0; i < numWindings; i++) {
        if (cancelFlag.current) break;

        const nextPeg = Math.floor(Math.random() * this.numPegs);
        this.drawLine(ctx, currentPeg, nextPeg, colorOffset);
        colorOffset = (colorOffset + 0.1) % 1;

        currentPeg = nextPeg; // The end peg becomes the start peg for the next iteration

        setProgress((i + 1) / numWindings * 100);
        await new Promise(resolve => setTimeout(resolve, Math.max(0, 500 - speed*5)));
      }
    }

    async approximateImage(ctx, targetImageData, numWindings, setProgress, speed, cancelFlag) {
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, this.canvasSize, this.canvasSize);

      let currentPeg = 0;
      let colorOffset = 0;
      const tempCanvas = new OffscreenCanvas(this.canvasSize, this.canvasSize);
      const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });

      const calculateLocalError = (imageData, targetImageData, x, y, width, height) => {
        let error = 0;
        let pixelCount = 0;

        for (let j = 0; j < height; j++) {
          for (let i = 0; i < width; i++) {
            const localIndex = (j * width + i) * 4;
            const globalIndex = ((y + j) * this.canvasSize + (x + i)) * 4;

            const currentPixel = (imageData.data[localIndex] + imageData.data[localIndex + 1] + imageData.data[localIndex + 2]) / 3;
            const targetPixel = (targetImageData[globalIndex] + targetImageData[globalIndex + 1] + targetImageData[globalIndex + 2]) / 3;

            error += Math.abs(currentPixel - targetPixel);
            pixelCount++;
          }
        }

        return error / pixelCount;
      };

      const sampleUniformly = (count, exclude = null) => {
        const samples = new Set();
        while (samples.size < count) {
          const pegIndex = Math.floor(Math.random() * this.numPegs);
          if (pegIndex !== exclude && !samples.has(pegIndex) && this.pegPositions[pegIndex]) {
            samples.add(pegIndex);
          }
        }
        return Array.from(samples);
      };

      const checkPeg = (nextPeg) => {
          if (nextPeg === currentPeg) return Infinity;

          const startPos = this.pegPositions[currentPeg];
          const endPos = this.pegPositions[nextPeg];

          //console.log(`Checking peg: current=${currentPeg}, next=${nextPeg}`);
          //console.log(`Start position:`, startPos);
          //console.log(`End position:`, endPos);

          if (!startPos || !endPos) {
            console.error(`Invalid peg position: currentPeg=${currentPeg}, nextPeg=${nextPeg}`);
            return Infinity;
          }

          const minX = Math.max(0, Math.floor(Math.min(startPos.x, endPos.x)) - 1);
          const minY = Math.max(0, Math.floor(Math.min(startPos.y, endPos.y)) - 1);
          const maxX = Math.min(this.canvasSize - 1, Math.ceil(Math.max(startPos.x, endPos.x)) + 1);
          const maxY = Math.min(this.canvasSize - 1, Math.ceil(Math.max(startPos.y, endPos.y)) + 1);
          const width = maxX - minX + 1;
          const height = maxY - minY + 1;

          //console.log(`Bounding box: (${minX}, ${minY}) to (${maxX}, ${maxY})`);

          tempCtx.drawImage(ctx.canvas, 0, 0);
          this.drawLine(tempCtx, currentPeg, nextPeg, colorOffset);

          const imageData = tempCtx.getImageData(minX, minY, width, height);
          const error = calculateLocalError(imageData, targetImageData, minX, minY, width, height);

          //console.log(`Error for peg ${nextPeg}: ${error}`);

          return error;
        };

      const initialSampleSize = Math.max(15, Math.round(this.numPegs * 0.035));
      const refinedSampleSize = Math.max(4, Math.round(initialSampleSize * 0.1));
      const neighborRange = Math.max(1, Math.round(this.numPegs * 0.002));

      for (let i = 0; i < numWindings; i++) {
        if (cancelFlag.current) break;

        let bestError = Infinity;
        let bestPeg = -1;

        // Step 1: Initial uniform sample
        const initialSample = sampleUniformly(initialSampleSize, currentPeg);
        for (const peg of initialSample) {
          const error = checkPeg(peg);
          if (error < bestError) {
            bestError = error;
            bestPeg = peg;
          }
        }

        if (bestPeg !== -1) {
          // Step 2: Refined sample around the best peg
          const refinedRange = Math.floor(this.numPegs / 20); // 5% of total pegs
          const refinedSample = sampleUniformly(refinedSampleSize).map(offset =>
            (bestPeg + offset - refinedRange / 2 + this.numPegs) % this.numPegs
          ).filter(peg => this.pegPositions[peg]); // Ensure valid peg positions
          for (const peg of refinedSample) {
            const error = checkPeg(peg);
            if (error < bestError) {
              bestError = error;
              bestPeg = peg;
            }
          }

          // Step 3: Check immediate neighbors
          for (let j = -neighborRange; j <= neighborRange; j++) {
            const neighborPeg = (bestPeg + j + this.numPegs) % this.numPegs;
            if (this.pegPositions[neighborPeg]) {
              const error = checkPeg(neighborPeg);
              if (error < bestError) {
                bestError = error;
                bestPeg = neighborPeg;
              }
            }
          }
        }

        if (bestPeg !== -1 && this.pegPositions[bestPeg]) {
          this.drawLine(ctx, currentPeg, bestPeg, colorOffset);
          currentPeg = bestPeg;
          colorOffset = (colorOffset + 0.1) % 1;
        } else {
          console.error(`Invalid best peg: ${bestPeg}`);
          currentPeg = sampleUniformly(1)[0]; // Choose a random valid peg
        }

        setProgress((i + 1) / numWindings * 100);
        await new Promise(resolve => setTimeout(resolve, Math.max(0, 500 - speed*5)));
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
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      const imageCanvas = imageCanvasRef.current;
      const imageCtx = imageCanvas.getContext('2d');
      const targetImageData = imageCtx.getImageData(0, 0, canvasSize, canvasSize).data;

      const stringArt = new StringArt(numPegs, canvasSize);

      setIsApproximating(true);
      setProgress(0);
      setStatus('Approximating...');
      cancelFlag.current = false;
      await stringArt.approximateImage(ctx, targetImageData, numWindings, setProgress, speed, cancelFlag);
      setIsApproximating(false);
      setStatus(cancelFlag.current ? 'Canceled' : 'Completed');
    }
  }, [uploadedImage, numPegs, canvasSize, numWindings, speed]);

  const startRandomArt = useCallback(async () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const stringArt = new StringArt(numPegs, canvasSize);

    setIsGeneratingRandom(true);
    setProgress(0);
    setStatus('Generating...');
    cancelFlag.current = false;
    await stringArt.generateRandomArt(ctx, numWindings, setProgress, speed, cancelFlag);
    setIsGeneratingRandom(false);
    setStatus(cancelFlag.current ? 'Canceled' : 'Completed');
  }, [numPegs, numWindings, canvasSize, speed]);

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
                if (isApproximating || isGeneratingRandom) {
                  cancelFlag.current = true;
                } else {
                  startRandomArt();
                }
              }}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-2"
            >
              {isApproximating || isGeneratingRandom ? "Stop" : "Generate Random Art"}
            </button>
            <button
              onClick={startApproximation}
              disabled={!uploadedImage || isApproximating || isGeneratingRandom}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Approximate Image
            </button>
          </div>
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