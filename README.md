# SDS2 - Hand Gesture Controlled 3D Christmas Tree

An interactive desktop-first 3D Christmas tree experience built with TypeScript, React, Three.js, and MediaPipe Tasks Vision.

SDS2 uses browser camera input to detect hand landmarks and gestures in real time. Different gestures control the form and behavior of the 3D Christmas tree, creating a touch-free interaction experience. The project also allows users to upload personal photos and display them as part of the tree decoration.

## Live Demo

[Open SDS2](https://kyoani55555.github.io/SDS2/)

## Highlights

- Real-time hand landmark and gesture interaction through browser camera input
- Gesture-controlled 3D Christmas tree transformation
- Photo upload and photo wall display
- User-uploaded images integrated into the Christmas tree decoration
- Desktop-first experience with mobile browser support
- GitHub Pages deployment

## Gesture Controls

| Gesture | Interaction |
| --- | --- |
| Closed fist | Collapse the Christmas tree |
| Open palm | Expand the Christmas tree |
| V sign | Start a slow tree rotation |
| Pinch gesture | Open the photo wall |

The browser will request camera permission before hand tracking can be used.

## Photo Upload

Users can upload images and place them within the Christmas tree decoration. The uploaded photos can also be viewed through the photo wall interaction.

## Tech Stack

- TypeScript
- React
- Vite
- Three.js
- React Three Fiber
- MediaPipe Tasks Vision
- Zustand
- GitHub Pages

## Run Locally

```bash
git clone https://github.com/Kyoani55555/SDS2.git
cd SDS2
npm install
npm run dev
```

Open the local address shown in the terminal, usually:

```text
http://localhost:5173
```

To use hand gesture interaction locally, allow the browser to access the camera when prompted.

## Build

```bash
npm run build
```

The production build is generated in the `dist` directory.

## Development Notes

This project was completed through an AI-assisted development workflow using Google AI Studio over two evening development sessions.

My work focused on understanding and adapting the code, refining gesture-to-interaction mapping, testing camera-based interaction, troubleshooting runtime issues, improving responsive behavior, integrating photo upload and display flow, and verifying the GitHub Pages deployment.

MediaPipe Tasks Vision is used as an existing browser-side hand landmark and gesture capability. This project does not claim to implement a hand-recognition algorithm from scratch.

## Privacy

Camera access is only requested when hand gesture interaction is enabled. Uploaded images are intended for the local interactive experience and portfolio demonstration.

## License

This project is for personal learning and portfolio demonstration.
