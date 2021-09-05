
import * as facemesh from '@tensorflow-models/facemesh';
import * as tf from '@tensorflow/tfjs-core';
import * as tfjsWasm from '@tensorflow/tfjs-backend-wasm';
import { TRIANGULATION } from './triangulation';

let model, model2, ctx, ctx2, ctx3, ctx4, videoWidth, videoHeight, video, canvas,
  scatterGLHasInitialized = false, scatterGL, t, videoStarted = false, loader

const VIDEO_SIZE = 250;
const mobile = isMobile();
const renderPointcloud = mobile === false;

function saveStyledImage(ImageElement){
  var c = document.createElement('canvas');
  var img = document.getElementById('styledResult');
  c.height = img.naturalHeight;
  c.width = img.naturalWidth;
  var ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0, c.width, c.height);
  var _imageString = c.toDataURL();
  localStorage.setItem('styledResult', _imageString);


}
function stepHandler(e, c, n) {
  console.log(c, n)
  if (n == 2 && !videoStarted) {

    document.querySelector("#userMessage").innerHTML = "First Start the Video..."
    return false
  }
  if (n == 3) {
    let stls = document.querySelector("#styles")
    stls.addEventListener('change', () => {
      console.log(document.querySelector('#styles').value)
      if (document.querySelector('#styles').value == '#') {
        return
      }
      document.querySelector('#sourceStyle').style.display = 'inline'
      const index = document.querySelector('#styles').value
      console.log(document.querySelector(`#style${index}`).src)
      document.querySelector('#sourceStyle').src = document.querySelector(`#style${index}`).src

      console.log(document.querySelector('#sourceStyle').src )
    })
  }
  if(n == 4){
    console.log("into last step")
    saveStyledImage();
    let s = document.querySelector("#styledResult");
    let d = document.querySelector("#nftCandidate");
    console.log(s.src, location.origin + '/')
    if(s.src == location.origin+ '/'){
      document.querySelector("#userMessage").innerHTML = "You Must First Generate an Image..."
      return false
    }
    d.src = s.src

  }
  return true
}
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

  var toastElList = [].slice.call(document.querySelectorAll('.toast'))
  var toastList = toastElList.map(function (toastEl) {
    return new bootstrap.Toast(toastEl, option)
  })

  jQuery("#example-basic").steps({
    headerTag: "h3",
    bodyTag: "section",
    autoFocus: true,
    onStepChanging: stepHandler
  });
  var popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'))
  var popoverList = popoverTriggerList.map(function (popoverTriggerEl) {
    return new bootstrap.Popover(popoverTriggerEl)
  })
  jQuery("#localfile").on('change', function () {
    handleLocalImage()
  });

  jQuery('#init').on('click', () => {
    document.querySelector('#loader').style.display = 'inline'
    document.querySelector("#userMessage").innerHTML = "Starting Video Stream..."
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

  if (predictions.length) {

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
  document.querySelector('#into').style.display = 'none'
  canvas.style.display = 'inline'
  renderPrediction();
}
async function transferStyle() {
  const contentImg = document.getElementById('result');
  const selectedStyle = document.querySelector('#styles').value;
  const styleImg = document.getElementById('style' + selectedStyle);
  const canvas1 = document.querySelector('#stylized1');
  const ctx_ = canvas1.getContext('2d');
  document.querySelector('#loader').style.display = 'inline'
  document.querySelector("#userMessage").innerHTML = "Generating Image..."

  model2.stylize(contentImg, styleImg).then((imageData) => {

    ctx_.putImageData(imageData, 0, 0);
    console.log(ctx_)
    setTimeout(() => {

      let d = canvas1.toDataURL();
      document.querySelector('#summary').style.display = 'none';
      document.querySelector('#styledResult').src = d
      document.querySelector('#styledResult').style.display = 'inline'
      document.querySelector('#loader').style.display = 'none'
      document.querySelector("#userMessage").innerHTML = "Image Generated"
    }, 5000)

  }, this);

}
function setUpButtons() {
  let mlButton = document.querySelector('#ml');
  let captureButton = document.querySelector('#capture');
  let transferButton = document.querySelector('#transfer');

  mlButton.addEventListener('click', async () => {
    if (document.querySelector('#styles').value == "#") {
      alert("Please select a style.")
      return
    }
    document.querySelector('#loader').style.display = 'inline'
    document.querySelector("#userMessage").innerHTML = "Loading ML Model..."
    model2 = new mi.ArbitraryStyleTransferNetwork();
    await model2.initialize()
    document.querySelector('#loader').style.display = 'none'
    document.querySelector("#userMessage").innerHTML = "Model Loaded..."

    await transferStyle()
  })
  transferButton.addEventListener('click', () => {
    document.querySelector('#loader').style.display = 'inline'
    document.querySelector("#userMessage").innerHTML = "Generating 3D model..."
    // let scatter = document.querySelector('#scatter-gl-container')
    // scatter.style.display = 'none'
    let holder = document.querySelector('#world');
    // holder.src = '3d/src/index.html'// + encodeURI(snapShot);
    holder.src = '/ph/index.html'// + encodeURI(snapShot);
    holder.onload = () => {
      document.querySelector('#loader').style.display = 'none'
      document.querySelector("#userMessage").innerHTML = ""
    }
    holder.style.display = 'inline'
  })
  captureButton.addEventListener('click', () => {
    document.querySelector("#userMessage").innerHTML = ''
    if(document.querySelector("#captureType").value === "#"){
      document.querySelector("#userMessage").innerHTML = 'Please choose a capture type to make a portrait.'
      // alert('Please choose a capture type.')
      return 
    }

    document.querySelector('#summaryPart2').style.display = 'inline'

    // let img = document.querySelector('#scatter-gl-container canvas').toDataURL("img/png");
    let tests = document.querySelectorAll('canvas')
    // console.log(tests)
    var canvas = tests[0];
    let shdwMesh = document.querySelector("#shadowmesh")
    let shdwPts = document.querySelector("#shadowpoints")
    let selectedType = document.querySelector("#captureType").value

    let c = canvas
    switch (selectedType) {
      case '1':
        c = canvas
        break
      case '3':
        c = shdwPts
        break
      case '2':
        c = shdwMesh
        break
      case '#':
        alert('Please choose a capture type.')
        return
        break
    }
    setTimeout(() => {
      var url = c.toDataURL();

      document.querySelector('#result').style.display = 'inline'
      document.querySelector('#result').style.borderRadius = '25px'
      document.querySelector('#result').style.margin = '20px'
      document.querySelector('#result').src = url
      document.querySelector('#ml').style.display = 'inline'
      document.querySelector('#styles').style.display = 'inline'

    }, 400, this)

  })
}
async function main() {

  await tf.setBackend(state.backend);
  await setupCamera();
  await setupVideo();
  videoStarted = true
  document.querySelector('#loader').style.display = 'none'
  document.querySelector("#userMessage").innerHTML = ''
  setUpButtons();

  if (renderPointcloud) {
    document.querySelector('#scatter-gl-container').style =
      `width: 225px; height: 225px;`;

    scatterGL = new ScatterGL(
      document.querySelector('#scatter-gl-container'),
      {
        'rotateOnStart': true, 'selectEnabled': true,
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



