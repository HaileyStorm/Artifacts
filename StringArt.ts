import React, { useEffect, useRef, useState } from 'react';

const StringArtGenerator = () => {
  const canvasRef = useRef(null);
  const imageCanvasRef = useRef(null);
  const [numPegs, setNumPegs] = useState(200);
  const [numLines, setNumLines] = useState(1000);
  const [canvasSize, setCanvasSize] = useState(600);
  const [uploadedImage, setUploadedImage] = useState(null);

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

      // Calculate the number of sub-lines based on the distance
      const distance = Math.sqrt(
        Math.pow(endPos.x - startPos.x, 2) + Math.pow(endPos.y - startPos.y, 2)
      );
      const numSubLines = Math.ceil(distance / 5); // Adjust this value to change the density of sub-lines

      // Draw multiple sub-lines with varying opacity
      for (let i = 0; i < numSubLines; i++) {
        const t = i / (numSubLines - 1);
        const x1 = startPos.x + (endPos.x - startPos.x) * t;
        const y1 = startPos.y + (endPos.y - startPos.y) * t;
        const x2 = startPos.x + (endPos.x - startPos.x) * (t + 1 / (numSubLines - 1));
        const y2 = startPos.y + (endPos.y - startPos.y) * (t + 1 / (numSubLines - 1));

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 + 0.4 * Math.random()})`; // Vary opacity
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }

    generateRandomArt(ctx, numLines) {
      for (let i = 0; i < numLines; i++) {
        const startPeg = Math.floor(Math.random() * this.numPegs);
        const endPeg = Math.floor(Math.random() * this.numPegs);
        this.drawLine(ctx, startPeg, endPeg);
      }
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Clear canvas
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    const stringArt = new StringArt(numPegs, canvasSize);
    stringArt.generateRandomArt(ctx, numLines);

  }, [numPegs, numLines, canvasSize]);

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
      </div>
    </div>
  );
};

export default StringArtGenerator;