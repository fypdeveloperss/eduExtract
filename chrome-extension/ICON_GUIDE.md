# Quick Icon Generation Guide

## Option 1: Using Canva (Easiest - Free)

1. Go to https://www.canva.com/
2. Create custom size: 128x128px
3. Add blue gradient background (#3B82F6 to #2563EB)
4. Add white "EE" text (bold, centered)
5. Download as PNG
6. Use online tool to resize to 48x48 and 16x16:
   - https://www.iloveimg.com/resize-image

## Option 2: Using HTML Canvas (Quickest)

Save this as `generate-icons.html` and open in browser:

```html
<!DOCTYPE html>
<html>
<head>
  <title>EduExtract Icon Generator</title>
</head>
<body>
  <h2>EduExtract Icon Generator</h2>
  <canvas id="canvas128" width="128" height="128"></canvas>
  <canvas id="canvas48" width="48" height="48"></canvas>
  <canvas id="canvas16" width="16" height="16"></canvas>
  <br><br>
  <button onclick="downloadIcons()">Download Icons</button>

  <script>
    function drawIcon(canvas, size) {
      const ctx = canvas.getContext('2d');
      
      // Gradient background
      const gradient = ctx.createLinearGradient(0, 0, size, size);
      gradient.addColorStop(0, '#3B82F6');
      gradient.addColorStop(1, '#2563EB');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);
      
      // White text "EE"
      ctx.fillStyle = 'white';
      ctx.font = `bold ${size * 0.4}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('EE', size / 2, size / 2);
    }
    
    // Draw all icons
    drawIcon(document.getElementById('canvas128'), 128);
    drawIcon(document.getElementById('canvas48'), 48);
    drawIcon(document.getElementById('canvas16'), 16);
    
    function downloadIcons() {
      const sizes = [128, 48, 16];
      sizes.forEach(size => {
        const canvas = document.getElementById(`canvas${size}`);
        const link = document.createElement('a');
        link.download = `icon${size}.png`;
        link.href = canvas.toDataURL();
        link.click();
      });
      alert('Icons downloaded! Move them to the icons/ folder');
    }
  </script>
</body>
</html>
```

## Option 3: Use AI Image Generator

1. Go to https://www.bing.com/images/create
2. Prompt: "A simple, modern app icon with blue gradient background, white letters 'EE' centered, flat design, minimalist"
3. Download and resize as needed

## Option 4: Professional Design (Best Quality)

Use this Figma template:
1. Go to Figma.com
2. Create 128x128 frame
3. Add rectangle with blue gradient (#3B82F6 → #2563EB)
4. Add "EE" text (white, 60pt, bold, centered)
5. Export as PNG at 1x, 0.375x (48px), and 0.125x (16px)

## Quick Placeholder (Temporary)

If you need to test immediately, use colored squares:
1. Create any blue 128x128 image
2. Save as icon128.png
3. Resize to 48x48 → icon48.png
4. Resize to 16x16 → icon16.png

Online tool: https://www.iloveimg.com/resize-image
