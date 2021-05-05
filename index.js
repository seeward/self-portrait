
import * as facemesh from '@tensorflow-models/facemesh';
import * as tf from '@tensorflow/tfjs-core';
import * as ml5 from 'ml5';
import * as tfjsWasm from '@tensorflow/tfjs-backend-wasm';
import { TRIANGULATION } from './triangulation';

let model, model2, ctx, ctx2, ctx3, ctx4, videoWidth, videoHeight, video, canvas,
  scatterGLHasInitialized = false, scatterGL, t, addMesh = false

const VIDEO_SIZE = 250;
const mobile = isMobile();
const renderPointcloud = mobile === false;

const state = {
  backend: 'wasm',
  maxFaces: 1,
  triangulateMesh: true
};
// console.log('ml5 version:', ml5.version);
if (renderPointcloud) {
  state.renderPointcloud = true;
}

jQuery(document).ready(function () {
  jQuery('#init').on('click', () => {
    main();
  })

})


tfjsWasm.setWasmPath(`https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@2.8.6/dist/tfjs-backend-wasm.wasm`);

function isMobile() {
  const isAndroid = /Android/i.test(navigator.userAgent);
  const isiOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  return isAndroid || isiOS;
}
function drawPath(ctx, points, closePath) {
  const region = new Path2D();
  region.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    const point = points[i];
    region.lineTo(point[0], point[1]);
  }

  if (closePath) {
    region.closePath();
  }
  ctx.stroke(region);
}
async function setupCamera() {
  video = document.getElementById('video');

  const stream = await navigator.mediaDevices.getUserMedia({
    'audio': false,
    'video': {
      facingMode: 'user',
      // Only setting the video to a specified size in order to accommodate a
      // point cloud, so on mobile devices accept the default size.
      width: mobile ? undefined : VIDEO_SIZE,
      height: mobile ? undefined : VIDEO_SIZE
    },
  });
  video.srcObject = stream;

  return new Promise((resolve) => {
    video.onloadedmetadata = () => {
      resolve(video);
    };
  });
}
async function renderPrediction() {

  const predictions = await model.estimateFaces(video);
  ctx2.clearRect(0, 0, canvas.width, canvas.height);
  ctx3.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(video, 0, 0, videoWidth, videoHeight, 0, 0, canvas.width, canvas.height);

  if (predictions.length > 0 && addMesh) {

    predictions.forEach(prediction => {
      // console.log(prediction)
      const keypoints = prediction.scaledMesh;
      if (state.triangulateMesh) {
        for (let i = 0; i < TRIANGULATION.length / 3; i++) {
          const points = [
            TRIANGULATION[i * 3], TRIANGULATION[i * 3 + 1],
            TRIANGULATION[i * 3 + 2]
          ].map(index => keypoints[index]);

          drawPath(ctx, points, true);
          drawPath(ctx3, points, true);

        }
      } else {

        for (let i = 0; i < keypoints.length; i++) {
          const x = keypoints[i][0];
          const y = keypoints[i][1];

          ctx.beginPath();
          ctx.arc(x, y, 1.5 /* radius */, 0, 2 * Math.PI);
          ctx.fill();
        }
      }

      for (let i = 0; i < keypoints.length; i++) {
        const x = keypoints[i][0];
        const y = keypoints[i][1];

        ctx2.beginPath();
        ctx2.arc(x, y, 1 /* radius */, 0, 2 * Math.PI);
        ctx2.fill();
      }

    });
  }

  if (renderPointcloud && state.renderPointcloud && scatterGL != null) {
    const pointsData = predictions.map((prediction) => {
      let scaledMesh = prediction.scaledMesh;
      t = JSON.stringify(scaledMesh)
      localStorage.setItem('meshData', t)
      return scaledMesh.map(point => ([-point[0], -point[1], -point[2]]));
    });


    let flattenedPointsData = [];
    for (let i = 0; i < pointsData.length; i++) {
      flattenedPointsData = flattenedPointsData.concat(pointsData[i]);
    }
    //console.log(flattenedPointsData)
    const dataset = new ScatterGL.Dataset(flattenedPointsData);

    if (!scatterGLHasInitialized) {
      scatterGL.render(dataset);
    } else {
      scatterGL.updateDataset(dataset);
    }
    scatterGLHasInitialized = true;
  }


  requestAnimationFrame(renderPrediction);
};
async function renderLocalPrediction(img) {
  let y = document.querySelector("#localoutput")
  y.style.display = 'inline';

  ctx4 = y.getContext('2d');
  ctx4.width = 500
  ctx4.height = 500
  ctx4.translate(y.width, 0);
  ctx4.scale(-1, 1);

  ctx4.fillStyle = '#32EEDB';
  ctx4.strokeStyle = '#32EEDB';
  ctx4.lineWidth = 0.5;

  const predictions = await model.estimateFaces(img);
  // console.log(predictions)
  ctx4.clearRect(0, 0, img.width, img.height);
  //ctx4.drawImage(img, 0, 0, img.width, img.height, 0, 0, 1000, 1000);

  if (predictions.length > 0) {

    predictions.forEach(prediction => {

      const keypoints = prediction.scaledMesh;

      for (let i = 0; i < keypoints.length; i++) {
        const x = keypoints[i][0];
        const y = keypoints[i][1];

        ctx4.beginPath();
        ctx4.arc(x, y, 1.5 /* radius */, 0, 2 * Math.PI);
        ctx4.fill();
      }

    });
  }
};
async function setupVideo() {
  video.play();
  videoWidth = video.videoWidth;
  videoHeight = video.videoHeight;
  video.width = videoWidth;
  video.height = videoHeight;

  canvas = document.getElementById('output');
  canvas.width = videoWidth;
  canvas.height = videoHeight;

  const canvasContainer = document.querySelector('.canvas-wrapper');
  canvasContainer.style = `width: ${videoWidth}px; height: ${videoHeight}px`;

  const shawdowMesh = document.querySelector('#shadowmesh');
  ctx2 = shawdowMesh.getContext('2d');
  ctx2.translate(shawdowMesh.width, 0);
  ctx2.scale(-1, 1);
  ctx2.fillStyle = '#32EEDB';
  ctx2.strokeStyle = '#32EEDB';
  ctx2.lineWidth = 0.5;

  const shawdowPoints = document.querySelector('#shadowpoints');
  ctx3 = shawdowPoints.getContext('2d');
  ctx3.translate(shawdowPoints.width, 0);
  ctx3.scale(-1, 1);
  ctx3.fillStyle = '#32EEDB';
  ctx3.strokeStyle = '#32EEDB';
  ctx3.lineWidth = 0.5;


  ctx = canvas.getContext('2d');
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.fillStyle = '#32EEDB';
  ctx.strokeStyle = '#32EEDB';
  ctx.lineWidth = 0.5;

  model = await facemesh.load({ maxFaces: state.maxFaces });

  renderPrediction();
}
async function transferStyle() {
  const contentImg = document.getElementById('result');
  const contentImg2 = document.getElementById('resultmesh');
  const contentImg3 = document.getElementById('resultpoints');

  const selectedStyle = document.querySelector('#styles').value;
  const styleImg = document.getElementById('style' + selectedStyle);

  const canvas1 = document.getElementById('stylized1');
  const ctx = canvas1.getContext('2d');
  model2.stylize(contentImg, styleImg).then((imageData) => {
    ctx.putImageData(imageData, 0, 0);
  });

  const canvas2 = document.getElementById('stylized2');
  const ctx2 = canvas2.getContext('2d');
  model2.stylize(contentImg2, styleImg).then((imageData) => {
    ctx2.putImageData(imageData, 0, 0);
  });

  const canvas3 = document.getElementById('stylized3');
  const ctx3 = canvas3.getContext('2d');
  model2.stylize(contentImg3, styleImg).then((imageData) => {
    ctx3.putImageData(imageData, 0, 0);
  });

}
function setUpButtons() {
  let mlButton = document.querySelector('#ml');
  let captureButton = document.querySelector('#capture');
  let transferButton = document.querySelector('#transfer');

  let processButtom = document.querySelector('#localfileprocess');
  processButtom.addEventListener('click', async () => {

    await renderLocalPrediction(document.querySelector('#result'));
  })

  let meshButtom = document.querySelector('#addmesh');
  meshButtom.addEventListener('click', async () => {

    addMesh = !addMesh
  })



  mlButton.addEventListener('click', async () => {
    model2 = new mi.ArbitraryStyleTransferNetwork();
    await model2.initialize()
    console.log('into');
    await transferStyle()
  })

  transferButton.addEventListener('click', () => {
    // let scatter = document.querySelector('#scatter-gl-container')
    // scatter.style.display = 'none'
    let holder = document.querySelector('#world');
    // holder.src = '3d/src/index.html'// + encodeURI(snapShot);
    holder.src = '/ph/index.html'// + encodeURI(snapShot);

    holder.style.display = 'inline'
  })
  captureButton.addEventListener('click', () => {
    // let img = document.querySelector('#scatter-gl-container canvas').toDataURL("img/png");
    let tests = document.querySelectorAll('canvas')
    // console.log(tests)
    var canvas = tests[0]
    let shdwMesh = document.querySelector("#shadowmesh")
    let shdwPts = document.querySelector("#shadowpoints")

    setTimeout(() => {
      var url = canvas.toDataURL();
      document.querySelector('#result').style.display = 'inline'
      document.querySelector('#result').style.borderRadius = '25px'
      document.querySelector('#result').style.margin = '20px'
      document.querySelector('#result').src = url

      var url2 = shdwMesh.toDataURL();
      document.querySelector('#resultmesh').style.display = 'inline'
      document.querySelector('#resultmesh').style.borderRadius = '25px'
      document.querySelector('#resultmesh').style.margin = '20px'
      document.querySelector('#resultmesh').src = url2

      var url2 = shdwPts.toDataURL();
      document.querySelector('#resultpoints').style.display = 'inline'
      document.querySelector('#resultpoints').style.borderRadius = '25px'
      document.querySelector('#resultpoints').style.margin = '20px'
      document.querySelector('#resultpoints').src = url2

    }, 400)
    console.log('here')
  })
}
async function main() {
  await tf.setBackend(state.backend);
  await setupCamera();
  await setupVideo();
  setUpButtons();
if (renderPointcloud) {
    document.querySelector('#scatter-gl-container').style =
      `width: 250px; height: 250px;`;

    scatterGL = new ScatterGL(
      document.querySelector('#scatter-gl-container'),
      {
        'rotateOnStart': false, 'selectEnabled': true,
        'styles': {
          backgroundColor: '#9e9e9e', axesVisible: false,
          point: {
            scaleDefault: .5,
            scaleHover: 1,
            scaleSelected: 1.5,
            colorNoSelection: "rgba(1, 1, 1, 1.0)",
            colorSelected: "rgba(255, 0, 63, 1.0)",
            colorHover: "rgba(255, 0, 63, 1.0)"
          }
        }
      });
  }
  
};



