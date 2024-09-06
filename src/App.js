import React, { useEffect, useRef, useState } from 'react';

const StringArtGenerator = () => {
  const canvasRef = useRef(null);
  const imageCanvasRef = useRef(null);
  const [numPegs, setNumPegs] = useState(200);
  const [numLines, setNumLines] = useState(1000);
  const [canvasSize, setCanvasSize] = useState(600);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [isApproximating, setIsApproximating] = useState(false);

  class StringArt {
    constructor(numPegs, canvasSize) {
      this.numPegs = numPegs;
      this.canvasSize = canvasSize;
      this.radius = canvasSize / 2;
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

    drawLine(ctx, startPeg, endPeg) {
      const startPos = this.pegPositions[startPeg];
      const endPos = this.pegPositions[endPeg];

      const dx = endPos.x - startPos.x;
      const dy = endPos.y - startPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      const numStrands = 5; // Total number of strands (adjust as needed)
      const strandWidth = 0.5; // Width of each strand
      const totalWidth = strandWidth * numStrands;

      const perpX = -dy / distance;
      const perpY = dx / distance;

      for (let i = 0; i < numStrands; i++) {
        const offset = (i - (numStrands - 1) / 2) * strandWidth;
        const x1 = startPos.x + offset * perpX;
        const y1 = startPos.y + offset * perpY;
        const x2 = endPos.x + offset * perpX;
        const y2 = endPos.y + offset * perpY;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);

        // Calculate opacity based on distance from center strand
        const centerDistance = Math.abs(i - (numStrands - 1) / 2);
        const opacity = 1 - (centerDistance / (numStrands - 1)) * 0.8; // 0.8 is the max reduction in opacity

        ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.lineWidth = strandWidth;
        ctx.stroke();
      }
    }

    generateRandomArt(ctx, numLines) {
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, this.canvasSize, this.canvasSize);

      for (let i = 0; i < numLines; i++) {
        const startPeg = Math.floor(Math.random() * this.numPegs);
        const endPeg = Math.floor(Math.random() * this.numPegs);
        this.drawLine(ctx, startPeg, endPeg);
      }
    }

    async approximateImage(ctx, targetImageData, numLines, setProgress) {
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, this.canvasSize, this.canvasSize);

      let currentPeg = 0;
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = this.canvasSize;
      tempCanvas.height = this.canvasSize;
      const tempCtx = tempCanvas.getContext('2d');

      for (let i = 0; i < numLines; i++) {
        let bestError = Infinity;
        let bestPeg = -1;

        for (let nextPeg = 0; nextPeg < this.numPegs; nextPeg++) {
          if (nextPeg === currentPeg) continue;

          tempCtx.drawImage(ctx.canvas, 0, 0);
          this.drawLine(tempCtx, currentPeg, nextPeg);

          const error = this.calculateError(tempCtx, targetImageData);
          if (error < bestError) {
            bestError = error;
            bestPeg = nextPeg;
          }
        }

        this.drawLine(ctx, currentPeg, bestPeg);
        currentPeg = bestPeg;

        // Update progress
        setProgress((i + 1) / numLines * 100);

        // Delay to allow the canvas to update visually
        await new Promise(resolve => setTimeout(resolve, 0.01));
      }
    }

    calculateError(ctx, targetImageData) {
      const currentImageData = ctx.getImageData(0, 0, this.canvasSize, this.canvasSize).data;
      let error = 0;

      for (let i = 0; i < currentImageData.length; i += 4) {
        const currentPixel = (currentImageData[i] + currentImageData[i + 1] + currentImageData[i + 2]) / 3;
        const targetPixel = (targetImageData[i] + targetImageData[i + 1] + targetImageData[i + 2]) / 3;
        error += Math.abs(currentPixel - targetPixel);
      }

      return error;
    }
  }

  useEffect(() => {
    if (!isApproximating) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const stringArt = new StringArt(numPegs, canvasSize);

      stringArt.generateRandomArt(ctx, numLines);
    }
  }, [isApproximating, numPegs, numLines, canvasSize]);

  useEffect(() => {
    if (uploadedImage) {
      const canvas = imageCanvasRef.current;
      const ctx = canvas.getContext('2d');

      const img = new Image();
      img.onload = () => {
        // Calculate dimensions for center crop
        const size = Math.min(img.width, img.height);
        const sourceX = (img.width - size) / 2;
        const sourceY = (img.height - size) / 2;

        // Draw and scale image
        ctx.drawImage(img, sourceX, sourceY, size, size, 0, 0, canvasSize, canvasSize);

        // Convert to grayscale
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

  const handleImageUpload = (event) => {
    if (event.target.files && event.target.files[0]) {
      setUploadedImage(event.target.files[0]);
    }
  };

  const startApproximation = async () => {
    if (uploadedImage) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const imageCanvas = imageCanvasRef.current;
      const imageCtx = imageCanvas.getContext('2d');
      const targetImageData = imageCtx.getImageData(0, 0, canvasSize, canvasSize).data;

      const stringArt = new StringArt(numPegs, canvasSize);

      setIsApproximating(true);
      await stringArt.approximateImage(ctx, targetImageData, numLines, (progress) => {
        console.log(`Approximation progress: ${progress.toFixed(2)}%`);
      });
      setIsApproximating(false);
    }
  };

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
      <div className="space-y-2">
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
          <label htmlFor="numLines" className="mr-2">Number of Lines:</label>
          <input
            type="number"
            id="numLines"
            value={numLines}
            onChange={(e) => setNumLines(parseInt(e.target.value))}
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
          <label htmlFor="imageUpload" className="mr-2">Upload Image:</label>
          <input
            type="file"
            id="imageUpload"
            accept="image/*"
            onChange={handleImageUpload}
            className="border border-gray-300 px-2 py-1"
          />
        </div>
        <div>
          <button
            onClick={() => setIsApproximating(false)}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-2"
          >
            Generate Random Art
          </button>
          <button
            onClick={startApproximation}
            disabled={!uploadedImage || isApproximating}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            {isApproximating ? "Approximating..." : "Approximate Image"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StringArtGenerator;